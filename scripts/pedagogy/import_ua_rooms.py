#!/usr/bin/env python3
"""
Import UA PDF files into PMP cursus/module/UA-room schema.

Supported inputs:
- A single PDF file (`UA_*.pdf`)
- A module directory containing multiple `UA_*.pdf`
- A cursus directory containing module subdirectories (each with `UA_*.pdf`)

This script writes into:
- learning.cursus
- learning.cursus_modules
- learning.cursus_units
- learning.cursus_unit_tasks

Execution backend:
- Uses `docker exec -i <container> psql ...` so no local psql/psycopg is required.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

from pypdf import PdfReader


SECTION_PATTERNS: Sequence[Tuple[str, re.Pattern[str]]] = (
    ("amorce", re.compile(r"(?im)^\s*Amorce\s*$")),
    ("objectifs", re.compile(r"(?im)^\s*Objectifs d[’']apprentissage\s*$")),
    ("cours", re.compile(r"(?im)^\s*Cours\s*:")),
    ("objectifs_verifies", re.compile(r"(?im)^\s*Objectifs v[ée]rifi[ée]s\s*$")),
    ("ressources", re.compile(r"(?im)^\s*Ressources documentaires")),
    ("evaluation", re.compile(r"(?im)^\s*[ÉE]valuation de l[’']UA\s*$")),
)


@dataclass
class UaParsed:
    source_path: Path
    unit_code: str
    title: str
    module_label: str
    duration_minutes: Optional[int]
    source_pages: Optional[int]
    structure_label: str
    summary: str
    full_markdown: str
    objectives: List[str]
    resources: List[str]
    validation_items: List[str]


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^\w\s-]", "", value)
    value = re.sub(r"[\s_-]+", "-", value)
    return value.strip("-")


def humanize_folder_name(name: str) -> str:
    text = re.sub(r"[_-]+", " ", name).strip()
    text = re.sub(r"\s+", " ", text)
    return text.title() if text else name


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def jsonb_literal(value) -> str:
    return sql_literal(json.dumps(value, ensure_ascii=False)) + "::jsonb"


def extract_text_pages(pdf_path: Path) -> List[str]:
    reader = PdfReader(str(pdf_path))
    pages: List[str] = []
    for page in reader.pages:
        pages.append((page.extract_text() or "").replace("\r\n", "\n").replace("\r", "\n"))
    return pages


def extract_first_match(pattern: re.Pattern[str], text: str, default: str = "") -> str:
    match = pattern.search(text)
    if not match:
        return default
    if match.lastindex:
        return (match.group(1) or "").strip()
    return match.group(0).strip()


def extract_sections(full_text: str) -> Dict[str, str]:
    found: List[Tuple[int, str]] = []
    for key, pattern in SECTION_PATTERNS:
        match = pattern.search(full_text)
        if match:
            found.append((match.start(), key))

    if not found:
        return {"cours": full_text.strip()}

    found.sort(key=lambda item: item[0])
    sections: Dict[str, str] = {}
    for index, (start, key) in enumerate(found):
        end = found[index + 1][0] if index + 1 < len(found) else len(full_text)
        chunk = full_text[start:end].strip()
        sections[key] = chunk
    return sections


def extract_objectives(section_text: str) -> List[str]:
    if not section_text:
        return []
    matches = re.findall(r"(?im)^\s*OF\s*[0-9.]+[^\n]*", section_text)
    if matches:
        return [re.sub(r"\s+", " ", m).strip() for m in matches]

    lines = [line.strip() for line in section_text.splitlines() if line.strip()]
    return lines[:10]


def extract_bullets(section_text: str) -> List[str]:
    bullets = re.findall(r"(?im)^\s*[—\-•]\s*(.+?)\s*$", section_text)
    if bullets:
        return [re.sub(r"\s+", " ", b).strip() for b in bullets]
    return []


def to_markdown(parsed: UaParsed, sections: Dict[str, str]) -> str:
    lines: List[str] = []
    lines.append(f"# {parsed.title}")
    lines.append("")
    lines.append(f"- Code UA: `{parsed.unit_code}`")
    if parsed.module_label:
        lines.append(f"- Module: {parsed.module_label}")
    if parsed.duration_minutes:
        lines.append(f"- Duree estimee: {parsed.duration_minutes} min")
    if parsed.source_pages:
        lines.append(f"- Pages source: {parsed.source_pages}")
    if parsed.structure_label:
        lines.append(f"- Structure: {parsed.structure_label}")
    lines.append("")

    ordered_keys = (
        ("amorce", "Amorce"),
        ("objectifs", "Objectifs d'apprentissage"),
        ("cours", "Cours"),
        ("objectifs_verifies", "Objectifs verifies"),
        ("ressources", "Ressources"),
        ("evaluation", "Evaluation"),
    )

    for key, label in ordered_keys:
        chunk = sections.get(key, "").strip()
        if not chunk:
            continue
        lines.append(f"## {label}")
        lines.append("")
        lines.append(chunk)
        lines.append("")

    return "\n".join(lines).strip() + "\n"


def parse_ua_pdf(pdf_path: Path) -> UaParsed:
    pages = extract_text_pages(pdf_path)
    first_page = pages[0] if pages else ""
    full_text = "\n\n".join(pages).strip()

    unit_code = extract_first_match(
        re.compile(r"(?i)Unit[ée]\s*d[’']Apprentissage\s*([0-9]+(?:\.[0-9]+)?)"),
        first_page,
        default=slugify(pdf_path.stem).replace("ua-", "").replace("-", "."),
    )
    title = extract_first_match(
        re.compile(r"(?is)Unit[ée]\s*d[’']Apprentissage[^\n]*\n(.+?)\nModule"),
        first_page,
        default=pdf_path.stem,
    )
    title = re.sub(r"\s+", " ", title).strip()
    if not title:
        title = pdf_path.stem

    module_label = extract_first_match(
        re.compile(r"(?im)^Module\s*[0-9]+[^\n]*$"),
        first_page,
        default="",
    )

    duration_h = extract_first_match(
        re.compile(r"(?i)Dur[ée]e\s*:?\s*([0-9]+)\s*h"),
        first_page,
        default="",
    )
    duration_minutes = int(duration_h) * 60 if duration_h.isdigit() else None

    source_pages_str = extract_first_match(
        re.compile(r"(?i)Pages\s*:?\s*([0-9]+)"),
        first_page,
        default="",
    )
    source_pages = int(source_pages_str) if source_pages_str.isdigit() else len(pages)

    structure_label = extract_first_match(
        re.compile(r"(?i)Structure\s*([A-Z]{2,10})\s*:"),
        first_page,
        default="ACOR",
    )

    sections = extract_sections(full_text)
    objectifs = extract_objectives(sections.get("objectifs", ""))
    resources = extract_bullets(sections.get("ressources", ""))

    validation_items: List[str] = []
    validation_items.extend(extract_bullets(sections.get("evaluation", "")))
    if not validation_items:
        validation_items.extend(extract_bullets(sections.get("objectifs_verifies", "")))
    if not validation_items:
        validation_items = [
            "Avoir complete les sections de l'UA",
            "Avoir valide le quiz/QCM final",
            "Avoir soumis les exercices demandes",
        ]

    summary = sections.get("amorce", "").splitlines()[0].strip() if sections.get("amorce") else title
    markdown = to_markdown(
        UaParsed(
            source_path=pdf_path,
            unit_code=unit_code,
            title=title,
            module_label=module_label,
            duration_minutes=duration_minutes,
            source_pages=source_pages,
            structure_label=structure_label,
            summary=summary,
            full_markdown="",
            objectives=objectifs,
            resources=resources,
            validation_items=validation_items,
        ),
        sections,
    )

    return UaParsed(
        source_path=pdf_path,
        unit_code=unit_code,
        title=title,
        module_label=module_label,
        duration_minutes=duration_minutes,
        source_pages=source_pages,
        structure_label=structure_label,
        summary=summary,
        full_markdown=markdown,
        objectives=objectifs,
        resources=resources,
        validation_items=validation_items,
    )


def parse_unit_order(unit_code: str, fallback: int) -> int:
    if not unit_code:
        return fallback
    chunks = re.findall(r"\d+", unit_code)
    if not chunks:
        return fallback
    if len(chunks) == 1:
        return int(chunks[0])
    # For 1.1 -> 101, 2.3 -> 203 (stable sort)
    return int(chunks[0]) * 100 + int(chunks[1])


def build_upsert_sql_for_cursus(cursus_id: str, cursus_title: str, cursus_description: str, level: str) -> str:
    return f"""
INSERT INTO learning.cursus (
    id, title, description, level, estimated_hours, is_published, module_count
)
VALUES (
    {sql_literal(cursus_id)},
    {sql_literal(cursus_title)},
    {sql_literal(cursus_description)},
    {sql_literal(level)},
    1,
    true,
    0
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    level = EXCLUDED.level,
    is_published = true,
    updated_at = NOW();
""".strip()


def build_upsert_sql_for_module(
    cursus_id: str,
    module_id: str,
    module_title: str,
    module_order: int,
    estimated_minutes: int,
) -> str:
    return f"""
INSERT INTO learning.cursus_modules (
    id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count
)
VALUES (
    {sql_literal(module_id)},
    {sql_literal(cursus_id)},
    {sql_literal(module_title)},
    {sql_literal("Module compose d'un ensemble d'UA (rooms pedagogiques).")},
    {module_order},
    {estimated_minutes},
    '1',
    0
)
ON CONFLICT (id) DO UPDATE SET
    cursus_id = EXCLUDED.cursus_id,
    title = EXCLUDED.title,
    module_order = EXCLUDED.module_order,
    estimated_minutes = EXCLUDED.estimated_minutes,
    updated_at = NOW();
""".strip()


def build_upsert_sql_for_unit(module_id: str, unit_id: str, unit_order: int, parsed: UaParsed) -> str:
    return f"""
INSERT INTO learning.cursus_units (
    id, module_id, unit_code, title, summary, room_style,
    duration_minutes, source_pages, structure_label, content_markdown,
    learning_objectives, validation_checklist, resources, unit_order, is_published
)
VALUES (
    {sql_literal(unit_id)},
    {sql_literal(module_id)},
    {sql_literal(parsed.unit_code)},
    {sql_literal(parsed.title)},
    {sql_literal(parsed.summary)},
    'THM',
    {parsed.duration_minutes or 'NULL'},
    {parsed.source_pages or 'NULL'},
    {sql_literal(parsed.structure_label or 'ACOR')},
    {sql_literal(parsed.full_markdown)},
    {jsonb_literal(parsed.objectives)},
    {jsonb_literal(parsed.validation_items)},
    {jsonb_literal(parsed.resources)},
    {unit_order},
    true
)
ON CONFLICT (id) DO UPDATE SET
    module_id = EXCLUDED.module_id,
    unit_code = EXCLUDED.unit_code,
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    duration_minutes = EXCLUDED.duration_minutes,
    source_pages = EXCLUDED.source_pages,
    structure_label = EXCLUDED.structure_label,
    content_markdown = EXCLUDED.content_markdown,
    learning_objectives = EXCLUDED.learning_objectives,
    validation_checklist = EXCLUDED.validation_checklist,
    resources = EXCLUDED.resources,
    unit_order = EXCLUDED.unit_order,
    is_published = true,
    updated_at = NOW();
""".strip()


def build_sql_for_tasks(unit_id: str, parsed: UaParsed) -> str:
    tasks = [
        ("AMORCE", "Amorce et mise en situation", "READING", "Lire l'amorce et identifier le contexte metier."),
        ("OBJECTIFS", "Objectifs d'apprentissage", "CHECKLIST", "Verifier les objectifs attendus pour cette UA."),
        ("COURS", "Cours principal", "READING", "Etudier le contenu theorique de l'UA."),
        ("EXERCICES", "Objectifs verifies / exercices", "EXERCISE", "Realiser les exercices de validation intermediaire."),
        ("QCM", "QCM / quiz de validation", "QUIZ", "Completer l'evaluation de l'UA."),
        ("RESSOURCES", "Ressources complementaires", "RESOURCE", "Consulter les ressources proposees."),
        ("EVALUATION", "Validation finale UA", "VALIDATION", "Confirmer les criteres de validation finale."),
    ]

    lines: List[str] = [f"DELETE FROM learning.cursus_unit_tasks WHERE unit_id = {sql_literal(unit_id)};"]
    for index, (task_code, title, task_type, prompt) in enumerate(tasks, start=1):
        lines.append(
            f"""INSERT INTO learning.cursus_unit_tasks (
    unit_id, task_code, task_order, title, prompt, task_type, options, hints, points, is_required
)
VALUES (
    {sql_literal(unit_id)},
    {sql_literal(task_code)},
    {index},
    {sql_literal(title)},
    {sql_literal(prompt)},
    {sql_literal(task_type)},
    '[]'::jsonb,
    '[]'::jsonb,
    10,
    true
);"""
        )
    return "\n".join(lines)


def collect_pdf_files(input_path: Path) -> List[Path]:
    return sorted([p for p in input_path.iterdir() if p.is_file() and p.suffix.lower() == ".pdf"])


def run_sql(sql: str, container: str, db_user: str, db_name: str, dry_run: bool) -> None:
    if dry_run:
        print(sql)
        return

    cmd = [
        "docker",
        "exec",
        "-i",
        container,
        "psql",
        "-U",
        db_user,
        "-d",
        db_name,
        "-v",
        "ON_ERROR_STOP=1",
    ]
    subprocess.run(cmd, input=sql.encode("utf-8"), check=True)


def import_module_dir(
    module_dir: Path,
    cursus_id: str,
    module_id: str,
    module_title: str,
    module_order: int,
    sql_chunks: List[str],
) -> int:
    pdf_files = collect_pdf_files(module_dir)
    if not pdf_files:
        return 0

    sql_chunks.append(
        build_upsert_sql_for_module(
            cursus_id=cursus_id,
            module_id=module_id,
            module_title=module_title,
            module_order=module_order,
            estimated_minutes=120,
        )
    )

    imported = 0
    for index, pdf in enumerate(pdf_files, start=1):
        parsed = parse_ua_pdf(pdf)
        unit_order = parse_unit_order(parsed.unit_code, fallback=index)
        unit_id = f"{module_id}-ua-{slugify(parsed.unit_code or pdf.stem)}"

        sql_chunks.append(build_upsert_sql_for_unit(module_id, unit_id, unit_order, parsed))
        sql_chunks.append(build_sql_for_tasks(unit_id, parsed))
        imported += 1
        print(f"[UA] {pdf.name} -> {unit_id} (order={unit_order})")

    return imported


def main() -> int:
    parser = argparse.ArgumentParser(description="Import UA PDF rooms into PMP database.")
    parser.add_argument("input", help="Path to UA PDF, module directory, or cursus directory.")
    parser.add_argument("--cursus-id", required=True, help="Target cursus ID (slug).")
    parser.add_argument("--cursus-title", required=True, help="Target cursus title.")
    parser.add_argument("--cursus-description", default="Cursus importe depuis des UA room-style.", help="Cursus description.")
    parser.add_argument("--level", default="DEBUTANT", choices=["DEBUTANT", "INTERMEDIAIRE", "AVANCE", "EXPERT"])
    parser.add_argument("--module-id", help="Target module ID (required for single PDF import).")
    parser.add_argument("--module-title", help="Target module title (required for single PDF import).")
    parser.add_argument("--module-order", type=int, default=1)
    parser.add_argument("--db-container", default="pmp-postgres")
    parser.add_argument("--db-user", default="pmp_user")
    parser.add_argument("--db-name", default="pmp_db")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Input path not found: {input_path}")

    sql_chunks: List[str] = ["BEGIN;"]
    sql_chunks.append(
        build_upsert_sql_for_cursus(
            cursus_id=args.cursus_id,
            cursus_title=args.cursus_title,
            cursus_description=args.cursus_description,
            level=args.level,
        )
    )

    total_units = 0

    if input_path.is_file():
        if input_path.suffix.lower() != ".pdf":
            raise ValueError("Single file import expects a PDF.")
        if not args.module_id or not args.module_title:
            raise ValueError("--module-id and --module-title are required for single PDF import.")

        tmp_dir = input_path.parent
        # Import only the provided PDF in a controlled flow.
        parsed = parse_ua_pdf(input_path)
        sql_chunks.append(
            build_upsert_sql_for_module(
                cursus_id=args.cursus_id,
                module_id=args.module_id,
                module_title=args.module_title,
                module_order=args.module_order,
                estimated_minutes=120,
            )
        )
        unit_order = parse_unit_order(parsed.unit_code, fallback=1)
        unit_id = f"{args.module_id}-ua-{slugify(parsed.unit_code or input_path.stem)}"
        sql_chunks.append(build_upsert_sql_for_unit(args.module_id, unit_id, unit_order, parsed))
        sql_chunks.append(build_sql_for_tasks(unit_id, parsed))
        print(f"[UA] {input_path.name} -> {unit_id} (order={unit_order})")
        total_units = 1
    elif input_path.is_dir():
        direct_pdfs = collect_pdf_files(input_path)
        if direct_pdfs:
            # Module directory mode.
            module_id = args.module_id or f"{args.cursus_id}-module-{args.module_order}"
            module_title = args.module_title or humanize_folder_name(input_path.name)
            total_units = import_module_dir(
                module_dir=input_path,
                cursus_id=args.cursus_id,
                module_id=module_id,
                module_title=module_title,
                module_order=args.module_order,
                sql_chunks=sql_chunks,
            )
        else:
            # Cursus directory mode (each first-level directory = module).
            module_dirs = sorted([p for p in input_path.iterdir() if p.is_dir()])
            module_count = 0
            for module_order, module_dir in enumerate(module_dirs, start=1):
                pdfs = collect_pdf_files(module_dir)
                if not pdfs:
                    continue
                module_id = f"{args.cursus_id}-mod-{module_order}"
                module_title = humanize_folder_name(module_dir.name)
                total_units += import_module_dir(
                    module_dir=module_dir,
                    cursus_id=args.cursus_id,
                    module_id=module_id,
                    module_title=module_title,
                    module_order=module_order,
                    sql_chunks=sql_chunks,
                )
                module_count += 1
            if module_count == 0:
                raise ValueError("No module directories with PDF files were found.")
    else:
        raise ValueError("Unsupported input path type.")

    sql_chunks.append(
        f"""UPDATE learning.cursus
SET module_count = COALESCE((
    SELECT COUNT(*)::int FROM learning.cursus_modules WHERE cursus_id = {sql_literal(args.cursus_id)}
), 0),
    updated_at = NOW()
WHERE id = {sql_literal(args.cursus_id)};"""
    )
    sql_chunks.append("COMMIT;")

    sql = "\n\n".join(sql_chunks) + "\n"
    run_sql(
        sql=sql,
        container=args.db_container,
        db_user=args.db_user,
        db_name=args.db_name,
        dry_run=args.dry_run,
    )

    print(f"[DONE] Imported {total_units} UA unit(s) into cursus '{args.cursus_id}'.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        print(f"[ERROR] SQL execution failed (exit={exc.returncode}).", file=sys.stderr)
        raise
    except Exception as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        raise SystemExit(1)
