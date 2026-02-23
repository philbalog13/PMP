'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Check, Clipboard, Info, Lightbulb, ShieldAlert } from 'lucide-react';
import { GLOSSARY, GLOSSARY_REGEX } from '../../lib/glossary';

type HeadingLevel = 1 | 2 | 3 | 4;

type MarkdownHeading = {
    id: string;
    level: HeadingLevel;
    text: string;
};

type MarkdownBlock =
    | { type: 'heading'; id: string; level: HeadingLevel; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'blockquote'; text: string }
    | { type: 'list'; ordered: boolean; items: string[] }
    | { type: 'code'; language: string; code: string }
    | { type: 'table'; headers: string[]; rows: string[][] }
    | { type: 'divider' };

type ParsedMarkdown = {
    blocks: MarkdownBlock[];
    headings: MarkdownHeading[];
};

interface CourseRichRendererProps {
    content: string;
    className?: string;
    showToc?: boolean;
}

const SPECIAL_BLOCK_START = /^(#{1,4}\s+|```|> |\||---+$|[-*]\s+|\d+\.\s+)/;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/** Apply glossary tooltips to text nodes in an HTML string (skips HTML tags). */
function applyGlossaryToHtml(html: string): string {
    return html.split(/(<[^>]+>)/).map((part, index) => {
        if (index % 2 === 1) return part; // HTML tag — leave untouched
        GLOSSARY_REGEX.lastIndex = 0; // reset global regex
        return part.replace(GLOSSARY_REGEX, (term) => {
            const def = GLOSSARY[term] || '';
            if (!def) return term;
            const escaped = def.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            return `<abbr title="${escaped}" class="cursor-help border-b border-dotted border-cyan-400/40 text-cyan-200 no-underline">${term}</abbr>`;
        });
    }).join('');
}

function toInlineHtml(text: string): string {
    let safe = escapeHtml(text);
    safe = safe.replace(/`([^`]+)`/g, '<code class="rounded bg-slate-800/70 px-1.5 py-0.5 text-emerald-300">$1</code>');
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-100">$1</strong>');
    safe = safe.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
    safe = safe.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-300 underline decoration-cyan-400/50 hover:text-cyan-200">$1</a>'
    );
    safe = applyGlossaryToHtml(safe);
    return safe;
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'section';
}

function splitTableRow(line: string): string[] {
    return line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
    return /^[:\-\s|]+$/.test(line.trim().replace(/^\|/, '').replace(/\|$/, ''));
}

function parseMarkdown(content: string): ParsedMarkdown {
    const normalized = (content || '').replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const blocks: MarkdownBlock[] = [];
    const headings: MarkdownHeading[] = [];
    const slugCounter = new Map<string, number>();

    let index = 0;
    while (index < lines.length) {
        const current = lines[index] ?? '';
        const trimmed = current.trim();

        if (!trimmed) {
            index += 1;
            continue;
        }

        if (trimmed.startsWith('```')) {
            const language = trimmed.slice(3).trim().toLowerCase();
            const chunk: string[] = [];
            index += 1;
            while (index < lines.length && !lines[index].trim().startsWith('```')) {
                chunk.push(lines[index]);
                index += 1;
            }
            if (index < lines.length && lines[index].trim().startsWith('```')) {
                index += 1;
            }
            blocks.push({
                type: 'code',
                language,
                code: chunk.join('\n')
            });
            continue;
        }

        const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
            const level = headingMatch[1].length as HeadingLevel;
            const text = headingMatch[2].trim();
            const baseSlug = slugify(text);
            const occurrences = (slugCounter.get(baseSlug) || 0) + 1;
            slugCounter.set(baseSlug, occurrences);
            const headingId = occurrences === 1 ? baseSlug : `${baseSlug}-${occurrences}`;

            blocks.push({ type: 'heading', id: headingId, level, text });
            headings.push({ id: headingId, level, text });
            index += 1;
            continue;
        }

        if (/^---+$/.test(trimmed)) {
            blocks.push({ type: 'divider' });
            index += 1;
            continue;
        }

        if (trimmed.startsWith('> ')) {
            const quoteLines: string[] = [];
            while (index < lines.length && lines[index].trim().startsWith('> ')) {
                quoteLines.push(lines[index].trim().slice(2));
                index += 1;
            }
            blocks.push({ type: 'blockquote', text: quoteLines.join('\n') });
            continue;
        }

        if (/^\|.*\|$/.test(trimmed)) {
            const tableLines: string[] = [];
            while (index < lines.length && /^\|.*\|$/.test(lines[index].trim())) {
                tableLines.push(lines[index].trim());
                index += 1;
            }

            if (tableLines.length === 1) {
                blocks.push({ type: 'paragraph', text: tableLines[0] });
                continue;
            }

            let headers = splitTableRow(tableLines[0]);
            let rowStart = 1;

            if (tableLines.length > 1 && isSeparatorRow(tableLines[1])) {
                rowStart = 2;
            } else {
                headers = [];
                rowStart = 0;
            }

            const rows = tableLines.slice(rowStart).map(splitTableRow);
            if (rows.length > 0 || headers.length > 0) {
                blocks.push({ type: 'table', headers, rows });
            }
            continue;
        }

        if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
            const ordered = /^\d+\.\s+/.test(trimmed);
            const items: string[] = [];

            while (index < lines.length) {
                const line = lines[index].trim();
                if (!line) break;
                if (ordered) {
                    const match = line.match(/^\d+\.\s+(.+)$/);
                    if (!match) break;
                    items.push(match[1]);
                } else {
                    const match = line.match(/^[-*]\s+(.+)$/);
                    if (!match) break;
                    items.push(match[1]);
                }
                index += 1;
            }

            if (items.length > 0) {
                blocks.push({ type: 'list', ordered, items });
                continue;
            }
        }

        const paragraphLines: string[] = [];
        while (
            index < lines.length &&
            lines[index].trim() &&
            !SPECIAL_BLOCK_START.test(lines[index].trim())
        ) {
            paragraphLines.push(lines[index].trim());
            index += 1;
        }

        if (paragraphLines.length > 0) {
            blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
            continue;
        }

        index += 1;
    }

    return { blocks, headings };
}

function inferFlowSteps(rawCode: string): string[] | null {
    const lines = rawCode.split('\n').map((line) => line.trim()).filter(Boolean);
    const arrowCandidates = lines.filter((line) => /--?>|=>|\u2192/.test(line));
    if (arrowCandidates.length === 0) {
        return null;
    }

    const line = arrowCandidates.sort((a, b) => b.length - a.length)[0]
        .replace(/[|]/g, ' ')
        .replace(/-{2,}>/g, '->')
        .replace(/=>/g, '->')
        .replace(/\u2192/g, '->');

    const steps = line
        .split(/->/)
        .map((part) => part.trim())
        .map((part) => part.replace(/^[^\p{L}0-9(]+/gu, '').replace(/[^\p{L}0-9)\]]+$/gu, ''))
        .filter(Boolean)
        .filter((part) => !/^(graph|flowchart|td|lr|bt|rl)$/i.test(part));

    if (steps.length < 3) {
        return null;
    }

    return steps;
}

function calloutTone(text: string): {
    icon: React.ComponentType<{ className?: string; size?: number }>;
    title: string;
    container: string;
    iconClass: string;
} {
    const lowered = text.toLowerCase();

    if (/(attention|risque|danger|critique|warning|ne jamais|faille)/i.test(lowered)) {
        return {
            icon: ShieldAlert,
            title: 'Point de vigilance',
            container: 'border-amber-500/30 bg-amber-500/10',
            iconClass: 'text-amber-300'
        };
    }

    if (/(astuce|conseil|bonne pratique|tip)/i.test(lowered)) {
        return {
            icon: Lightbulb,
            title: 'Conseil pratique',
            container: 'border-emerald-500/30 bg-emerald-500/10',
            iconClass: 'text-emerald-300'
        };
    }

    return {
        icon: Info,
        title: '\u00c0 retenir',
        container: 'border-cyan-500/30 bg-cyan-500/10',
        iconClass: 'text-cyan-300'
    };
}

function CodeBlock({ language, code }: { language: string; code: string }) {
    const [copied, setCopied] = useState(false);
    const lines = code.replace(/\n$/, '').split('\n');
    const languageLabel = language || 'text';
    const flowSteps = inferFlowSteps(code);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-950/80 shadow-[0_20px_45px_rgba(2,6,23,0.5)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-2.5 bg-slate-900/80">
                <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-slate-400">
                    {languageLabel}
                </span>
                <button
                    type="button"
                    onClick={copy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800 transition-colors"
                >
                    {copied ? <Check size={12} className="text-emerald-300" /> : <Clipboard size={12} />}
                    {copied ? 'Copi\u00e9' : 'Copier'}
                </button>
            </div>

            {flowSteps && (
                <div className="border-b border-slate-800/80 bg-cyan-500/5 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300 mb-2">
                        Diagramme de flux
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        {flowSteps.map((step, index) => (
                            <div key={`${step}-${index}`} className="inline-flex items-center gap-2">
                                <span className="rounded-lg border border-cyan-500/20 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200">
                                    {step}
                                </span>
                                {index < flowSteps.length - 1 && (
                                    <ArrowRight size={14} className="text-cyan-300" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="overflow-x-auto p-4">
                <code className="block font-mono text-[13px] md:text-sm text-slate-200 leading-6 md:leading-7 min-w-full">
                    {lines.map((line, lineNumber) => (
                        <div key={`line-${lineNumber}`} className="grid grid-cols-[3rem_1fr] gap-3">
                            <span className="select-none text-right text-slate-600">{lineNumber + 1}</span>
                            <span className="whitespace-pre">{line || ' '}</span>
                        </div>
                    ))}
                </code>
            </div>
        </div>
    );
}

export function CourseRichRenderer({
    content,
    className = '',
    showToc = true
}: CourseRichRendererProps) {
    const { blocks, headings } = useMemo(() => parseMarkdown(content), [content]);

    return (
        <div className={`space-y-6 ${className}`.trim()}>
            {showToc && headings.length > 1 && (
                <section className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 mb-2.5">
                        Plan du chapitre
                    </p>
                    <div className="space-y-1.5">
                        {headings.map((heading) => (
                            <a
                                key={heading.id}
                                href={`#${heading.id}`}
                                className={`block text-sm text-slate-300 hover:text-emerald-300 transition-colors ${
                                    heading.level >= 3 ? 'pl-4 text-slate-400' : ''
                                }`}
                            >
                                {heading.text}
                            </a>
                        ))}
                    </div>
                </section>
            )}

            <article className="space-y-5">
                {blocks.map((block, blockIndex) => {
                    if (block.type === 'heading') {
                        if (block.level === 1 || block.level === 2) {
                            return (
                                <h2
                                    id={block.id}
                                    key={`${block.type}-${block.id}-${blockIndex}`}
                                    className="scroll-mt-32 text-2xl md:text-3xl font-black tracking-tight text-slate-100 pb-3 border-b border-white/10 leading-tight"
                                >
                                    <span dangerouslySetInnerHTML={{ __html: toInlineHtml(block.text) }} />
                                </h2>
                            );
                        }

                        if (block.level === 3) {
                            return (
                                <h3
                                    id={block.id}
                                    key={`${block.type}-${block.id}-${blockIndex}`}
                                    className="scroll-mt-32 text-xl md:text-2xl font-bold text-slate-100 leading-tight"
                                >
                                    <span dangerouslySetInnerHTML={{ __html: toInlineHtml(block.text) }} />
                                </h3>
                            );
                        }

                        return (
                            <h4
                                id={block.id}
                                key={`${block.type}-${block.id}-${blockIndex}`}
                                className="scroll-mt-32 text-lg md:text-xl font-semibold text-slate-200 leading-tight"
                            >
                                <span dangerouslySetInnerHTML={{ __html: toInlineHtml(block.text) }} />
                            </h4>
                        );
                    }

                    if (block.type === 'paragraph') {
                        return (
                            <p
                                key={`${block.type}-${blockIndex}`}
                                className="text-base md:text-lg leading-8 md:leading-9 text-slate-300"
                                dangerouslySetInnerHTML={{ __html: toInlineHtml(block.text) }}
                            />
                        );
                    }

                    if (block.type === 'blockquote') {
                        const tone = calloutTone(block.text);
                        const Icon = tone.icon;

                        return (
                            <div
                                key={`${block.type}-${blockIndex}`}
                                className={`rounded-2xl border px-4 py-3.5 ${tone.container}`}
                            >
                                <div className="flex items-start gap-3">
                                    <Icon size={16} className={`mt-1 flex-shrink-0 ${tone.iconClass}`} />
                                    <div>
                                        <p className={`text-sm font-semibold mb-1 ${tone.iconClass}`}>{tone.title}</p>
                                        <p
                                            className="text-base md:text-lg leading-7 md:leading-8 text-slate-200"
                                            dangerouslySetInnerHTML={{ __html: toInlineHtml(block.text) }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    if (block.type === 'list') {
                        if (block.ordered) {
                            return (
                                <ol key={`${block.type}-${blockIndex}`} className="space-y-2 list-decimal ml-6 text-slate-300">
                                    {block.items.map((item, itemIndex) => (
                                        <li
                                            key={`ordered-item-${blockIndex}-${itemIndex}`}
                                            className="pl-1 text-base md:text-lg leading-7 md:leading-8"
                                            dangerouslySetInnerHTML={{ __html: toInlineHtml(item) }}
                                        />
                                    ))}
                                </ol>
                            );
                        }

                        return (
                            <ul key={`${block.type}-${blockIndex}`} className="space-y-2">
                                {block.items.map((item, itemIndex) => (
                                    <li key={`unordered-item-${blockIndex}-${itemIndex}`} className="flex items-start gap-2.5">
                                        <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                        <span
                                            className="text-base md:text-lg leading-7 md:leading-8 text-slate-300"
                                            dangerouslySetInnerHTML={{ __html: toInlineHtml(item) }}
                                        />
                                    </li>
                                ))}
                            </ul>
                        );
                    }

                    if (block.type === 'code') {
                        return (
                            <CodeBlock
                                key={`${block.type}-${blockIndex}`}
                                language={block.language}
                                code={block.code}
                            />
                        );
                    }

                    if (block.type === 'table') {
                        const headers = block.headers.length > 0
                            ? block.headers
                            : (block.rows[0] || []).map((_, index) => `Colonne ${index + 1}`);
                        const rows = block.headers.length > 0 ? block.rows : block.rows.slice(1);

                        return (
                            <div
                                key={`${block.type}-${blockIndex}`}
                                className="rounded-2xl border border-slate-700/80 bg-slate-900/50 overflow-hidden"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[15px] md:text-base">
                                        <thead className="bg-slate-800/70">
                                            <tr>
                                                {headers.map((header, headerIndex) => (
                                                    <th
                                                        key={`header-${blockIndex}-${headerIndex}`}
                                                        className="px-4 py-3 text-left font-semibold text-slate-200 border-b border-slate-700/80"
                                                        dangerouslySetInnerHTML={{ __html: toInlineHtml(header) }}
                                                    />
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row, rowIndex) => (
                                                <tr
                                                    key={`row-${blockIndex}-${rowIndex}`}
                                                    className={rowIndex % 2 === 0 ? 'bg-slate-900/20' : 'bg-slate-900/55'}
                                                >
                                                    {row.map((cell, cellIndex) => (
                                                        <td
                                                            key={`cell-${blockIndex}-${rowIndex}-${cellIndex}`}
                                                            className="px-4 py-3 align-top text-slate-300 border-t border-slate-800/80"
                                                            dangerouslySetInnerHTML={{ __html: toInlineHtml(cell) }}
                                                        />
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    }

                    if (block.type === 'divider') {
                        return <hr key={`${block.type}-${blockIndex}`} className="border-white/10" />;
                    }

                    return null;
                })}
            </article>
        </div>
    );
}
