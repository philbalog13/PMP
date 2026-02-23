#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const INPUT_PATH = path.join(ROOT, 'docs', 'ctf', 'ctf-solvability-matrix.csv');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'pedagogy');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'ctf-statements-pack.md');

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

function mapRole(category) {
    const value = normalize(category).toUpperCase();
    if (value.includes('FRAUD')) {
        return 'fraud analyst';
    }
    if (value.includes('HSM') || value.includes('KEY') || value.includes('CRYPTO')) {
        return 'payment security engineer';
    }
    if (value.includes('3DS') || value.includes('TOKEN')) {
        return 'application security engineer';
    }
    if (value.includes('NETWORK') || value.includes('MITM') || value.includes('ISO')) {
        return 'red team operator';
    }
    return 'incident responder';
}

function buildStatement(entry) {
    const code = normalize(entry.code);
    const title = normalize(entry.title);
    const targetService = normalize(entry.target_service) || 'see challenge data';
    const targetEndpoint = normalize(entry.target_endpoint) || 'see challenge data';
    const vulnerabilityType = normalize(entry.vulnerability_type) || 'security weakness';
    const attackVector = normalize(entry.attack_vector) || 'controlled exploitation';
    const prerequisite = normalize(entry.prerequisite) && normalize(entry.prerequisite) !== 'none'
        ? normalize(entry.prerequisite)
        : 'none';
    const flagSource = normalize(entry.flag_source) || 'challenge proof source';
    const firstCommand = normalize(entry.first_command) || 'guided-analysis';
    const difficulty = normalize(entry.difficulty) || 'INTERMEDIATE';
    const role = mapRole(entry.category);

    return [
        `## [${code}] - ${title}`,
        '',
        '### 1) Mission brief (contexte realiste)',
        `- Role etudiant: ${role}`,
        `- Contexte metier: payment platform service \`${targetService}\``,
        `- Incident de depart: suspicion de ${vulnerabilityType.toLowerCase()}`,
        '- Impact potentiel: fraude, fuite de donnees sensibles, indisponibilite, non-conformite PCI',
        '',
        '### 2) Objectif exploitation (mesurable)',
        `- Ce qui doit etre obtenu: preuve d exploitation via ${attackVector}`,
        `- Condition de succes: demonstration technique + recuperation de flag depuis ${flagSource}`,
        '- Condition d echec: exploitation non reproductible ou preuve insuffisante',
        '',
        '### 3) Contraintes',
        '- Mode: blackbox terminal',
        '- Outils autorises: AttackBox (curl, jq, openssl, nc, python3)',
        '- Interdits: modification infra hors perimetre du challenge',
        `- Limites: difficulte ${difficulty}, cibles hors scope interdites`,
        `- Prerequis: ${prerequisite}`,
        '',
        '### 4) Surface d attaque et ressources',
        `- Cibles reseau: ${targetEndpoint}`,
        `- Donnees initiales: commande de depart \`${firstCommand}\``,
        '- Artefacts disponibles: logs applicatifs, sorties HTTP, traces de terminal',
        '',
        '### 5) Livrables obligatoires',
        '1. Preuve d exploitation: commandes + sorties reproductibles.',
        `2. Flag: valeur PMP{...} et source exacte (${flagSource}).`,
        '3. Analyse d impact: cause racine + impact business + impact securite.',
        '4. Remediation: patch defensif priorise et justifie.',
        '5. Verification post-patch: test avant/apres confirmant la correction.',
        '',
        '### 6) Workflow Problem Based Learning',
        '1. Formuler une hypothese d attaque.',
        '2. Concevoir un test minimal.',
        '3. Executer, observer, ajuster.',
        '4. Stabiliser l exploitation et capturer les preuves.',
        '5. Construire un correctif defensif.',
        '6. Verifier le correctif en non-regression.',
        '',
        '### 7) Critere d evaluation (sur 100)',
        '- Comprendre le probleme et le contexte: 20',
        '- Execution technique de l exploitation: 25',
        '- Qualite des preuves collectees: 20',
        '- Pertinence de la remediation: 20',
        '- Verification post-patch et communication: 15',
        '',
        '### 8) Hints (structure imposee)',
        '- Hint L1 (orientation): sans commande complete.',
        '- Hint L2 (technique): piste actionnable a adapter.',
        '- Hint L3 (quasi-solution): sequence presque complete sans flag.',
        '',
        '### 9) Debrief final',
        '- Ce qui a ete compromis:',
        '- Pourquoi le controle a echoue:',
        '- Correctifs immediats:',
        '- Correctifs structurels:',
        '- Lecon transferable:',
        '',
    ].join('\n');
}

function main() {
    if (!fs.existsSync(INPUT_PATH)) {
        throw new Error(`Missing input file: ${INPUT_PATH}`);
    }

    const csvText = fs.readFileSync(INPUT_PATH, 'utf8').trim();
    const rows = parseCsv(csvText);
    const headers = rows[0];
    const items = rows
        .slice(1)
        .map((row) => {
            const data = {};
            headers.forEach((header, index) => {
                data[header] = row[index] || '';
            });
            return data;
        })
        .sort((a, b) => normalize(a.code).localeCompare(normalize(b.code)));

    const now = new Date().toISOString();
    const sections = items.map(buildStatement).join('\n');
    const output = [
        '# Pack enonces CTF normalises (P2-02)',
        '',
        `- Generation: ${now}`,
        '- Source: `docs/ctf/ctf-solvability-matrix.csv`',
        `- Couverture: ${items.length}/50`,
        '- Statut: template canonique applique sur 100% des challenges CTF',
        '',
        sections,
    ].join('\n');

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
    process.stdout.write(`Generated ${OUTPUT_PATH} with ${items.length} statements.\n`);
}

main();
