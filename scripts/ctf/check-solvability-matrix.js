const fs = require('fs');
const path = require('path');

const MATRIX_PATH = path.join('docs', 'ctf', 'ctf-solvability-matrix.csv');
const CHALLENGE_SEED_DIR = path.join('backend', 'api-gateway', 'src', 'data', 'ctf');
const CHALLENGE_CODE_PATTERN = /\bcode\s*:\s*['"]([A-Z0-9-]+)['"]/g;
const ALLOWED_STATUS = new Set(['UNVERIFIED', 'E2E_OK', 'PENDING_E2E', 'BROKEN']);
const CRITICAL_CODES = ['CRYPTO-001', 'REPLAY-001', 'REPLAY-002'];

function parseCsvLine(line) {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else if (ch === ',') {
            cells.push(current);
            current = '';
        } else if (ch === '"') {
            inQuotes = true;
        } else {
            current += ch;
        }
    }

    cells.push(current);
    return cells;
}

function parseCsv(content) {
    const lines = content
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
        throw new Error('Matrix CSV has no data rows');
    }

    const header = parseCsvLine(lines[0]);
    if (header.length > 0) {
        header[0] = header[0].replace(/^\uFEFF/, '');
    }
    const rows = lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        const row = {};
        header.forEach((key, idx) => {
            row[key] = values[idx] ?? '';
        });
        return row;
    });

    return { header, rows };
}

function failIf(condition, message, errors) {
    if (condition) errors.push(message);
}

function loadChallengeCodes() {
    if (!fs.existsSync(CHALLENGE_SEED_DIR)) {
        throw new Error(`Missing challenge seed directory: ${CHALLENGE_SEED_DIR}`);
    }

    const files = fs.readdirSync(CHALLENGE_SEED_DIR)
        .filter((fileName) => fileName.endsWith('Challenges.ts'))
        .sort();

    if (files.length === 0) {
        throw new Error(`No challenge seed files found in ${CHALLENGE_SEED_DIR}`);
    }

    const codes = new Set();
    const duplicateCodes = new Set();

    for (const fileName of files) {
        const fullPath = path.join(CHALLENGE_SEED_DIR, fileName);
        const content = fs.readFileSync(fullPath, 'utf8');

        for (const match of content.matchAll(CHALLENGE_CODE_PATTERN)) {
            const code = String(match[1] || '').trim();
            if (!code) continue;

            if (codes.has(code)) {
                duplicateCodes.add(code);
            }
            codes.add(code);
        }
    }

    if (codes.size === 0) {
        throw new Error(`No challenge codes parsed from seed files in ${CHALLENGE_SEED_DIR}`);
    }

    return { codes, duplicateCodes, files };
}

function main() {
    if (!fs.existsSync(MATRIX_PATH)) {
        throw new Error(`Missing matrix file: ${MATRIX_PATH}`);
    }

    const content = fs.readFileSync(MATRIX_PATH, 'utf8');
    const { header, rows } = parseCsv(content);
    const seedCatalog = loadChallengeCodes();
    const errors = [];

    const requiredColumns = [
        'code',
        'title',
        'category',
        'difficulty',
        'target_service',
        'target_endpoint',
        'vulnerability_type',
        'attack_vector',
        'prerequisite',
        'first_command',
        'exploit_path_summary',
        'flag_source',
        'preconditions_audit',
        'precondition_status',
        'audit_method',
        'audited_on',
        'solvability_status',
        'evidence_path',
        'validation_notes',
    ];

    for (const col of requiredColumns) {
        failIf(!header.includes(col), `Missing required column: ${col}`, errors);
    }

    const uniqueCodes = new Set(rows.map((row) => row.code));
    failIf(uniqueCodes.size !== rows.length, 'Duplicate challenge code found in matrix', errors);
    failIf(seedCatalog.duplicateCodes.size > 0, `Duplicate challenge code found in seed catalog: ${[...seedCatalog.duplicateCodes].sort().join(', ')}`, errors);
    failIf(rows.length !== seedCatalog.codes.size, `Expected ${seedCatalog.codes.size} rows (from challenge seeds), got ${rows.length}`, errors);

    const missingCodes = [...seedCatalog.codes].filter((code) => !uniqueCodes.has(code)).sort();
    const staleCodes = [...uniqueCodes].filter((code) => !seedCatalog.codes.has(code)).sort();
    failIf(missingCodes.length > 0, `Matrix is missing challenge codes: ${missingCodes.join(', ')}`, errors);
    failIf(staleCodes.length > 0, `Matrix contains unknown challenge codes: ${staleCodes.join(', ')}`, errors);

    const mustBeNonEmpty = [
        'code',
        'title',
        'category',
        'difficulty',
        'target_service',
        'target_endpoint',
        'vulnerability_type',
        'attack_vector',
        'prerequisite',
        'first_command',
        'exploit_path_summary',
        'flag_source',
        'preconditions_audit',
        'precondition_status',
        'audit_method',
        'audited_on',
        'solvability_status',
        'evidence_path',
    ];

    rows.forEach((row, idx) => {
        for (const col of mustBeNonEmpty) {
            failIf(!String(row[col] || '').trim(), `Row ${idx + 2} has empty required field: ${col}`, errors);
        }

        failIf(!ALLOWED_STATUS.has(row.solvability_status), `Row ${idx + 2} has invalid status: ${row.solvability_status}`, errors);
        failIf(String(row.flag_source).startsWith('unknown:'), `Row ${idx + 2} has unresolved flag source`, errors);

        if (row.solvability_status === 'E2E_OK') {
            failIf(!String(row.validation_notes || '').trim(), `Row ${idx + 2} is E2E_OK but validation_notes is empty`, errors);
        }

        const evidencePath = path.resolve(row.evidence_path);
        failIf(!fs.existsSync(evidencePath), `Row ${idx + 2} evidence_path does not exist: ${row.evidence_path}`, errors);
    });

    for (const code of CRITICAL_CODES) {
        const row = rows.find((entry) => entry.code === code);
        failIf(!row, `Missing critical challenge in matrix: ${code}`, errors);
        if (row) {
            failIf(row.solvability_status !== 'E2E_OK', `Critical challenge ${code} must be E2E_OK`, errors);
        }
    }

    if (errors.length > 0) {
        console.error('CTF solvability gate failed:');
        errors.forEach((error) => console.error(`- ${error}`));
        process.exit(1);
    }

    const e2eCount = rows.filter((row) => row.solvability_status === 'E2E_OK').length;
    console.log(`PASS ctf-solvability matrix gate (${rows.length} rows, ${e2eCount} E2E_OK, ${seedCatalog.files.length} seed files)`);
}

try {
    main();
} catch (error) {
    console.error(error.message || error);
    process.exit(1);
}
