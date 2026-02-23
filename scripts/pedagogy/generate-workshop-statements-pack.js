#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKSHOPS_DIR = path.join(ROOT, 'docs', 'workshops');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'pedagogy');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'workshop-statements-pack.md');

function normalize(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getWorkshopReadmePath(workshopDir) {
    const readmePath = path.join(WORKSHOPS_DIR, workshopDir, 'README.md');
    return fs.existsSync(readmePath) ? readmePath : null;
}

function extractTitle(readmeText, fallback) {
    const match = readmeText.match(/^#\s+(.+)$/m);
    return normalize(match ? match[1] : fallback);
}

function extractObjective(readmeText) {
    const match = readmeText.match(/##\s+.*Objectif[\s\S]*?\n([\s\S]*?)(\n##\s+|$)/i);
    if (!match) {
        return '';
    }

    return normalize(match[1]
        .replace(/[*_`>#-]/g, ' ')
        .replace(/\|/g, ' ')
        .replace(/\s+/g, ' '));
}

function inferDifficulty(workshopDir) {
    const match = workshopDir.match(/atelier-(\d+)/i);
    const rank = Number(match ? match[1] : 0);
    if (rank >= 11) {
        return 'ADVANCED';
    }
    if (rank >= 7) {
        return 'INTERMEDIATE';
    }
    return 'BEGINNER';
}

function inferRole(workshopDir) {
    const text = workshopDir.toLowerCase();
    if (text.includes('fraud')) {
        return 'fraud analyst';
    }
    if (text.includes('key') || text.includes('pin') || text.includes('mac')) {
        return 'payment security engineer';
    }
    if (text.includes('3d') || text.includes('token') || text.includes('pci')) {
        return 'application security engineer';
    }
    if (text.includes('security-attacks')) {
        return 'red team and blue team operator';
    }
    return 'payment platform engineer';
}

function buildStatement(workshop) {
    const code = workshop.code;
    const title = workshop.title;
    const objective = workshop.objective || 'Atteindre les objectifs pedagogiques de l atelier via une demarche PBL executable.';
    const difficulty = workshop.difficulty;
    const role = workshop.role;
    const workshopPath = `docs/workshops/${workshop.dir}/README.md`;

    return [
        `## [${code}] - ${title}`,
        '',
        '### 1) Mission brief (contexte realiste)',
        `- Role etudiant: ${role}`,
        '- Contexte metier: environnement monétique avec contraintes de securite et de conformite',
        `- Incident de depart: ${objective}`,
        '- Impact potentiel: fraude, perte de confiance client, non-conformite, interruption de service',
        '',
        '### 2) Objectif exploitation / resolution (mesurable)',
        '- Ce qui doit etre obtenu: preuve de comprehension + execution technique reproductible',
        '- Condition de succes: exercices valides avec evidence technique et justification',
        '- Condition d echec: absence de preuve exploitable ou raisonnement incomplet',
        '',
        '### 3) Contraintes',
        '- Mode: pratique guidee + problem based learning',
        '- Outils autorises: terminal d attaque, scripts atelier, outils standards',
        '- Interdits: modification du perimetre hors atelier',
        `- Limites: niveau ${difficulty}, perimetre borne a l atelier`,
        '- Prerequis: progression ateliers precedente selon la sequence pedagogique',
        '',
        '### 4) Surface d attaque et ressources',
        `- Source de reference: \`${workshopPath}\``,
        '- Donnees initiales: exercices, scripts, jeux de donnees et cas d usage de l atelier',
        '- Artefacts disponibles: sorties terminal, logs, code d exercice, reponses attendues',
        '',
        '### 5) Livrables obligatoires',
        '1. Preuve d execution: commandes/scripts + sorties valides.',
        '2. Analyse: explication de la cause racine et de l impact.',
        '3. Correction: contre-mesure defensive realiste.',
        '4. Verification: test avant/apres montrant l efficacite de la correction.',
        '5. Debrief: lecons transferables vers un contexte reel.',
        '',
        '### 6) Workflow Problem Based Learning',
        '1. Comprendre le probleme et le contexte.',
        '2. Emettre une hypothese technique.',
        '3. Experimenter sur un cas minimal.',
        '4. Ajuster la solution a partir des observations.',
        '5. Documenter la correction et sa validation.',
        '',
        '### 7) Critere d evaluation (sur 100)',
        '- Comprendre le probleme et le contexte: 20',
        '- Execution technique: 25',
        '- Qualite des preuves: 20',
        '- Qualite de la remediation: 20',
        '- Communication et verification: 15',
        '',
        '### 8) Hints (structure imposee)',
        '- Hint L1: orientation sans spoiler',
        '- Hint L2: piste technique actionnable',
        '- Hint L3: quasi-solution sans livrer la reponse finale',
        '',
        '### 9) Debrief final',
        '- Ce qui a ete compris:',
        '- Ce qui a ete difficile:',
        '- Correctifs prioritaires:',
        '- Transfert vers incidents reels:',
        '',
    ].join('\n');
}

function main() {
    const workshopDirs = fs.readdirSync(WORKSHOPS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^atelier-\d+/i.test(entry.name))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));

    const workshops = workshopDirs.map((dirName) => {
        const readmePath = getWorkshopReadmePath(dirName);
        const readmeText = readmePath ? fs.readFileSync(readmePath, 'utf8') : '';
        const rankMatch = dirName.match(/atelier-(\d+)/i);
        const code = rankMatch ? `ATELIER-${rankMatch[1].padStart(2, '0')}` : dirName.toUpperCase();

        return {
            code,
            dir: dirName,
            title: extractTitle(readmeText, dirName),
            objective: extractObjective(readmeText),
            difficulty: inferDifficulty(dirName),
            role: inferRole(dirName),
        };
    });

    const now = new Date().toISOString();
    const body = workshops.map(buildStatement).join('\n');
    const output = [
        '# Pack enonces ateliers et labs normalises (P2-03)',
        '',
        `- Generation: ${now}`,
        '- Source: `docs/workshops/atelier-*/README.md`',
        `- Couverture: ${workshops.length}/15`,
        '- Statut: structure canonique appliquee a 100% des ateliers/labs',
        '',
        body,
    ].join('\n');

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
    process.stdout.write(`Generated ${OUTPUT_PATH} with ${workshops.length} workshop statements.\n`);
}

main();
