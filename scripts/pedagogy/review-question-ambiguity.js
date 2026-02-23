#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const INPUT_PATH = path.join(ROOT, 'docs', 'pedagogy', 'question-mapping.csv');
const OUTPUT_PATH = path.join(ROOT, 'docs', 'pedagogy', 'question-ambiguity-report.md');

function parseCsv(csvText) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i += 1) {
        const char = csvText[i];
        const next = csvText[i + 1];

        if (inQuotes) {
            if (char === '"' && next === '"') {
                field += '"';
                i += 1;
                continue;
            }

            if (char === '"') {
                inQuotes = false;
                continue;
            }

            field += char;
            continue;
        }

        if (char === '"') {
            inQuotes = true;
            continue;
        }

        if (char === ',') {
            row.push(field);
            field = '';
            continue;
        }

        if (char === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
            continue;
        }

        if (char === '\r') {
            continue;
        }

        field += char;
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows;
}

function normalize(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function toRecordList(rows) {
    const headers = rows[0];
    return rows.slice(1).map((row) => {
        const record = {};
        headers.forEach((header, index) => {
            record[header] = row[index] || '';
        });
        return record;
    });
}

function main() {
    if (!fs.existsSync(INPUT_PATH)) {
        throw new Error(`Missing input file: ${INPUT_PATH}`);
    }

    const csvText = fs.readFileSync(INPUT_PATH, 'utf8').trim();
    const records = toRecordList(parseCsv(csvText));
    const total = records.length;
    const critical = records.filter((entry) => entry.ambiguity_status === 'critical-ambiguous');
    const medium = records.filter((entry) => entry.ambiguity_status === 'medium-ambiguous');
    const low = records.filter((entry) => entry.ambiguity_status === 'low-ambiguous');
    const clear = records.filter((entry) => entry.ambiguity_status === 'clear');

    const mediumOrLow = [...medium, ...low].slice(0, 25);

    const lines = [
        '# Question ambiguity review (P2-07)',
        '',
        `- Generated: ${new Date().toISOString()}`,
        '- Source: `docs/pedagogy/question-mapping.csv`',
        `- Total reviewed items: ${total}`,
        `- Clear: ${clear.length}`,
        `- Critical ambiguous: ${critical.length}`,
        `- Medium ambiguous: ${medium.length}`,
        `- Low ambiguous: ${low.length}`,
        '',
        '## Decision',
        critical.length === 0
            ? '- No critical-ambiguous question detected. P2-07 critical target is met.'
            : '- Critical-ambiguous questions found. Correction required before gate closure.',
        '',
        '## Corrective policy applied',
        '- Every quiz item must be explicit and scoped (question or scenario format).',
        '- Every exercise item must state expected outcome and evaluation axis.',
        '- Ambiguous wording without measurable criteria is rewritten before publication.',
        '',
        '## Non-critical items monitored',
    ];

    if (mediumOrLow.length === 0) {
        lines.push('- None.');
    } else {
        for (const entry of mediumOrLow) {
            const prompt = normalize(entry.prompt);
            lines.push(`- ${entry.item_id} (${entry.ambiguity_status}): ${prompt}`);
        }
    }

    lines.push(
        '',
        '## Closure criteria',
        `- critical-ambiguous = ${critical.length} (target: 0)`,
        '- Editorial pass integrated in Phase 2 quality gate.',
        ''
    );

    fs.writeFileSync(OUTPUT_PATH, `${lines.join('\n')}\n`, 'utf8');
    process.stdout.write(`Generated ${OUTPUT_PATH}\n`);
}

main();
