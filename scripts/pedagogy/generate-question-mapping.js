#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SEEDS_DIR = path.join(ROOT, 'backend', 'api-gateway', 'src', 'database', 'seeds');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'pedagogy');
const OUTPUT_CSV_PATH = path.join(OUTPUT_DIR, 'question-mapping.csv');
const OUTPUT_SUMMARY_PATH = path.join(OUTPUT_DIR, 'question-mapping-summary.md');

const STRUCTURED_QUESTION_FILES = [
    '015_cursus_bloc1_quizzes_exercises.sql',
    '040_advanced_quiz_formats.sql',
];

const JSON_QUESTION_FILES = [
    '020_cursus_bloc2_quizzes_exercises.sql',
    '024_cursus_bloc3_quizzes_exercises.sql',
    '028_cursus_bloc4_quizzes_exercises.sql',
    '032_cursus_bloc5_quizzes_exercises.sql',
];

const EXERCISE_FILES = [
    '015_cursus_bloc1_quizzes_exercises.sql',
    '020_cursus_bloc2_quizzes_exercises.sql',
    '024_cursus_bloc3_quizzes_exercises.sql',
    '028_cursus_bloc4_quizzes_exercises.sql',
    '032_cursus_bloc5_quizzes_exercises.sql',
];

function normalize(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function toAsciiLower(value) {
    return normalize(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function readSeedFile(fileName) {
    const filePath = path.join(SEEDS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing seed file: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
}

function unescapeSqlString(value) {
    return normalize(String(value || '').replace(/''/g, '\''));
}

function csvEscape(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function parseStructuredQuizQuestions(fileName) {
    const text = readSeedFile(fileName);
    const regex = /\('([^']+)'\s*,\s*'([^']+)'\s*,\s*'((?:''|[^'])*)'\s*,/g;
    const questions = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        const itemId = match[1];
        const quizId = match[2];
        const questionText = unescapeSqlString(match[3]);

        if (!itemId.startsWith('qq-')) {
            continue;
        }

        questions.push({
            item_id: itemId,
            item_type: 'quiz_question',
            source: fileName,
            quiz_or_module: quizId,
            prompt: questionText,
        });
    }

    return questions;
}

function parseJsonQuizQuestions(fileName) {
    const text = readSeedFile(fileName);
    const regex = /VALUES\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'((?:''|[^'])*)'\s*,\s*'(\[[\s\S]*?\])''?::jsonb\s*,\s*\d+\s*\)\s*ON CONFLICT/g;
    const questions = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        const quizId = match[1];
        const moduleId = match[2];
        const payload = match[4].replace(/''/g, '\'');
        let parsedQuestions = [];

        try {
            parsedQuestions = JSON.parse(payload);
        } catch (error) {
            throw new Error(`Invalid embedded JSON in ${fileName} for ${quizId}: ${error.message}`);
        }

        for (const question of parsedQuestions) {
            questions.push({
                item_id: `${quizId}.${question.id || 'unknown'}`,
                item_type: 'quiz_question',
                source: fileName,
                quiz_or_module: `${quizId}|${moduleId}`,
                prompt: normalize(question.question || ''),
            });
        }
    }

    return questions;
}

function parseExercises(fileName) {
    const text = readSeedFile(fileName);
    const regex = /\('((?:ex-[^']+))'\s*,\s*'([^']+)'\s*,\s*'((?:''|[^'])*)'/g;
    const exercises = [];
    const seen = new Set();
    let match;

    while ((match = regex.exec(text)) !== null) {
        const itemId = match[1];
        const moduleId = match[2];
        const title = unescapeSqlString(match[3]);
        const uniqueKey = `${fileName}:${itemId}`;

        if (seen.has(uniqueKey)) {
            continue;
        }
        seen.add(uniqueKey);

        exercises.push({
            item_id: itemId,
            item_type: 'exercise',
            source: fileName,
            quiz_or_module: moduleId,
            prompt: title,
        });
    }

    return exercises;
}

function inferCompetency(prompt, context) {
    const value = `${toAsciiLower(prompt)} ${toAsciiLower(context)}`;

    if (/(pci|saq|qsa|rgpd|dsp2|dora|tracfin|conformite|compliance)/.test(value)) {
        return 'COMPLIANCE_REGULATION';
    }
    if (/(3ds|acs|otp|cavv|eci|sca)/.test(value)) {
        return 'THREEDS_SCA';
    }
    if (/(iso 8583|mti|de ?[0-9]+|bitmap|stan|reversal|iso8583)/.test(value)) {
        return 'ISO8583_MESSAGING';
    }
    if (/(hsm|lmk|zpk|zmk|dukpt|kcv|key ceremony|key management|cle|cles)/.test(value)) {
        return 'HSM_KEY_MANAGEMENT';
    }
    if (/(emv|apdu|iso 7816|nfc|arqc|tvr|javacard|pc\/sc|kernel)/.test(value)) {
        return 'CARD_TECH_EMBEDDED';
    }
    if (/(fraud|score|velocity|anomal|card testing|chargeback|risk)/.test(value)) {
        return 'FRAUD_RISK_ANALYTICS';
    }
    if (/(token|tokenisation|tokenization|vault|p2pe|pan|cvv)/.test(value)) {
        return 'TOKENISATION_DATA_PROTECTION';
    }
    if (/(incident|forensic|audit|soc|magecart|ioc)/.test(value)) {
        return 'SECURITY_OPERATIONS_IR';
    }
    if (/(architecture|switch|routage|microservice|rpo|rto|spo?f|broker)/.test(value)) {
        return 'PAYMENT_ARCHITECTURE';
    }

    return 'PAYMENTS_FUNDAMENTALS';
}

function inferDifficulty(itemType, context, prompt) {
    const value = `${toAsciiLower(context)} ${toAsciiLower(prompt)}`;

    if (itemType === 'exercise') {
        if (/(mod-5|ex-5)/.test(value)) {
            return 'EXPERT';
        }
        if (/(mod-4|ex-4)/.test(value)) {
            return 'ADVANCED';
        }
        if (/(mod-3|ex-3|mod-2|ex-2)/.test(value)) {
            return 'INTERMEDIATE';
        }
        return 'BEGINNER';
    }

    if (/(qq-adv|quiz-final|quiz-5|quiz-4)/.test(value)) {
        return 'ADVANCED';
    }
    if (/(analysez|scenario|code|construisez|developpez|concevez|diagramme)/.test(value)) {
        return 'ADVANCED';
    }
    if (/(quiz-3|quiz-2|difference|pourquoi|comment)/.test(value)) {
        return 'INTERMEDIATE';
    }
    return 'BEGINNER';
}

function inferBloom(prompt) {
    const value = toAsciiLower(prompt);

    if (/(concevez|construisez|developpez|dessinez|creez)/.test(value)) {
        return 'CREATE';
    }
    if (/(analysez|analyser|scenario|comparer|diagnostiquer|reconstituez)/.test(value)) {
        return 'ANALYZE';
    }
    if (/(implementer|simuler|appliquer|calculer|configurer|executer)/.test(value)) {
        return 'APPLY';
    }
    if (/(pourquoi|diff(er|e)rence|que signifie|quel|quelle|vrai|faux)/.test(value)) {
        return 'UNDERSTAND';
    }
    return 'UNDERSTAND';
}

function inferAmbiguity(itemType, prompt) {
    const text = normalize(prompt);
    if (text.length < 5) {
        return { status: 'critical-ambiguous', note: 'Prompt too short to evaluate.' };
    }

    const lowerText = text.toLowerCase();
    const isScopedTrueFalse = lowerText.startsWith('vrai/faux')
        || lowerText.startsWith('vrai ou faux')
        || lowerText.startsWith('true/false');
    const isScopedScenario = lowerText.startsWith('scenario')
        || lowerText.startsWith('sc');

    if (
        itemType === 'quiz_question'
        && !text.includes('?')
        && !isScopedScenario
        && !isScopedTrueFalse
        && text.length < 30
    ) {
        return { status: 'medium-ambiguous', note: 'Question style should be explicit interrogative or scoped scenario.' };
    }

    return { status: 'clear', note: '' };
}

function groupCount(rows, key) {
    const map = new Map();
    for (const row of rows) {
        const value = row[key];
        map.set(value, (map.get(value) || 0) + 1);
    }
    return [...map.entries()]
        .sort((a, b) => {
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }
            return String(a[0]).localeCompare(String(b[0]));
        });
}

function writeSummary(rows) {
    const competencyCounts = groupCount(rows, 'competency');
    const difficultyCounts = groupCount(rows, 'difficulty');
    const ambiguityCounts = groupCount(rows, 'ambiguity_status');

    const now = new Date().toISOString();
    const lines = [
        '# Question mapping summary (P2-06/P2-07)',
        '',
        `- Generated: ${now}`,
        `- Total mapped items: ${rows.length}`,
        `- Quiz questions: ${rows.filter((row) => row.item_type === 'quiz_question').length}`,
        `- Exercises: ${rows.filter((row) => row.item_type === 'exercise').length}`,
        '',
        '## Competency coverage',
    ];

    for (const [key, count] of competencyCounts) {
        lines.push(`- ${key}: ${count}`);
    }

    lines.push('', '## Difficulty coverage');
    for (const [key, count] of difficultyCounts) {
        lines.push(`- ${key}: ${count}`);
    }

    lines.push('', '## Ambiguity status');
    for (const [key, count] of ambiguityCounts) {
        lines.push(`- ${key}: ${count}`);
    }

    fs.writeFileSync(OUTPUT_SUMMARY_PATH, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
    const records = [];

    for (const fileName of STRUCTURED_QUESTION_FILES) {
        records.push(...parseStructuredQuizQuestions(fileName));
    }

    for (const fileName of JSON_QUESTION_FILES) {
        records.push(...parseJsonQuizQuestions(fileName));
    }

    for (const fileName of EXERCISE_FILES) {
        records.push(...parseExercises(fileName));
    }

    const dedupeMap = new Map();
    for (const record of records) {
        const uniqueKey = `${record.item_type}:${record.item_id}`;
        if (!dedupeMap.has(uniqueKey)) {
            dedupeMap.set(uniqueKey, record);
        }
    }

    const mapped = [...dedupeMap.values()].map((record) => {
        const competency = inferCompetency(record.prompt, record.quiz_or_module);
        const difficulty = inferDifficulty(record.item_type, record.quiz_or_module, record.prompt);
        const bloomLevel = inferBloom(record.prompt);
        const ambiguity = inferAmbiguity(record.item_type, record.prompt);

        return {
            ...record,
            competency,
            difficulty,
            bloom_level: bloomLevel,
            ambiguity_status: ambiguity.status,
            ambiguity_note: ambiguity.note,
        };
    }).sort((a, b) => {
        if (a.item_type !== b.item_type) {
            return a.item_type.localeCompare(b.item_type);
        }
        return a.item_id.localeCompare(b.item_id);
    });

    const csvHeader = [
        'item_id',
        'item_type',
        'source',
        'quiz_or_module',
        'prompt',
        'competency',
        'difficulty',
        'bloom_level',
        'ambiguity_status',
        'ambiguity_note',
    ];

    const csvLines = [
        csvHeader.map(csvEscape).join(','),
        ...mapped.map((row) => [
            row.item_id,
            row.item_type,
            row.source,
            row.quiz_or_module,
            row.prompt,
            row.competency,
            row.difficulty,
            row.bloom_level,
            row.ambiguity_status,
            row.ambiguity_note,
        ].map(csvEscape).join(',')),
    ];

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_CSV_PATH, `${csvLines.join('\n')}\n`, 'utf8');
    writeSummary(mapped);

    process.stdout.write([
        `Generated ${OUTPUT_CSV_PATH}`,
        `Generated ${OUTPUT_SUMMARY_PATH}`,
        `Mapped items: ${mapped.length}`,
    ].join('\n') + '\n');
}

main();
