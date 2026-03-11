'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, ArrowRight, Check, Clipboard, Info, Lightbulb, ShieldAlert } from 'lucide-react';
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

type DiagramEdgeDirection = 'forward' | 'both';

type DiagramEdge = {
    from: string;
    to: string;
    direction: DiagramEdgeDirection;
    label?: string;
};

type ParsedDiagram = {
    nodes: string[];
    edges: DiagramEdge[];
    linearPath: string[] | null;
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

const DIAGRAM_LANGUAGES = new Set(['', 'text', 'txt', 'ascii', 'diagram', 'flow', 'mermaid']);

function cleanDiagramText(raw: string): string {
    return raw
        .replace(/^\d+[.)]\s*/, '')
        .replace(/^[-*]\s+/, '')
        .replace(/^[|]+|[|]+$/g, '')
        .replace(/^\[([^\]]+)\]$/, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeFlowLine(rawLine: string): string {
    return rawLine
        .replace(/←→|↔/g, '<->')
        .replace(/--?>/g, '->')
        .replace(/=>/g, '->')
        .replace(/<--?/g, '<-')
        .replace(/→/g, '->')
        .replace(/←/g, '<-')
        .replace(/\s+/g, ' ')
        .trim();
}

function splitNodeAndLabel(raw: string): { node: string; label?: string } {
    const separator = raw.indexOf(':');
    if (separator <= 0 || separator >= raw.length - 1) {
        return { node: cleanDiagramText(raw) };
    }

    const node = cleanDiagramText(raw.slice(0, separator));
    const label = raw.slice(separator + 1).trim();
    if (!node || !label) {
        return { node: cleanDiagramText(raw) };
    }

    return { node, label };
}

function extractBracketNodes(rawLine: string): string[] {
    const matches = [...rawLine.matchAll(/\[([^\]]+)\]/g)];
    return matches
        .map((match) => cleanDiagramText(match[1] || ''))
        .filter(Boolean);
}

function inferLaneActors(rawLine: string): [string, string] | null {
    if (/[|<>→←]/.test(rawLine)) {
        return null;
    }

    const parts = rawLine
        .split(/\s{2,}/)
        .map((part) => cleanDiagramText(part))
        .filter(Boolean);

    if (parts.length !== 2) {
        return null;
    }

    return [parts[0], parts[1]];
}

function extractLaneEdge(rawLine: string, actors: [string, string]): DiagramEdge | null {
    if (!/^\|.*\|$/.test(rawLine.trim())) {
        return null;
    }

    const normalized = normalizeFlowLine(rawLine);
    const rightIndex = normalized.indexOf('->');
    const leftIndex = normalized.indexOf('<-');
    if (rightIndex === -1 && leftIndex === -1) {
        return null;
    }

    const direction = leftIndex !== -1 && (rightIndex === -1 || leftIndex < rightIndex) ? '<-' : '->';
    const label = cleanDiagramText(
        normalized
            .replace(/<->|->|<-/g, ' ')
            .replace(/-+/g, ' ')
    );

    if (!label) {
        return null;
    }

    if (direction === '<-') {
        return {
            from: actors[1],
            to: actors[0],
            direction: 'forward',
            label,
        };
    }

    return {
        from: actors[0],
        to: actors[1],
        direction: 'forward',
        label,
    };
}

function extractInlineEdges(rawLine: string): DiagramEdge[] {
    const normalized = normalizeFlowLine(rawLine);
    if (!/(<->|->|<-)/.test(normalized)) {
        return [];
    }

    const parts = normalized
        .split(/(<->|->|<-)/g)
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length < 3) {
        return [];
    }

    const edges: DiagramEdge[] = [];
    let current = cleanDiagramText(parts[0]);
    if (!current) {
        return [];
    }

    for (let index = 1; index < parts.length - 1; index += 2) {
        const arrow = parts[index];
        const targetRaw = parts[index + 1];
        const { node: nextNode, label } = splitNodeAndLabel(targetRaw);
        if (!nextNode) {
            continue;
        }

        if (arrow === '<-') {
            edges.push({
                from: nextNode,
                to: current,
                direction: 'forward',
                label,
            });
        } else {
            edges.push({
                from: current,
                to: nextNode,
                direction: arrow === '<->' ? 'both' : 'forward',
                label,
            });
        }

        current = nextNode;
    }

    return edges.filter((edge) => edge.from && edge.to && edge.from !== edge.to);
}

function inferLinearPath(nodes: string[], edges: DiagramEdge[]): string[] | null {
    if (nodes.length < 3 || edges.length !== nodes.length - 1) {
        return null;
    }

    const adjacency = new Map<string, Set<string>>();
    for (const node of nodes) {
        adjacency.set(node, new Set<string>());
    }
    for (const edge of edges) {
        adjacency.get(edge.from)?.add(edge.to);
        adjacency.get(edge.to)?.add(edge.from);
    }

    const invalidDegree = nodes.some((node) => {
        const degree = adjacency.get(node)?.size || 0;
        return degree === 0 || degree > 2;
    });
    if (invalidDegree) {
        return null;
    }

    const endpoints = nodes.filter((node) => (adjacency.get(node)?.size || 0) === 1);
    if (endpoints.length !== 2) {
        return null;
    }

    const path = [endpoints[0]];
    const visited = new Set(path);
    let cursor = endpoints[0];

    while (path.length < nodes.length) {
        const next = [...(adjacency.get(cursor) || [])].find((candidate) => !visited.has(candidate));
        if (!next) {
            return null;
        }
        path.push(next);
        visited.add(next);
        cursor = next;
    }

    return path;
}

function parseDiagram(rawCode: string, language: string): ParsedDiagram | null {
    const normalizedLanguage = (language || '').trim().toLowerCase();
    if (!DIAGRAM_LANGUAGES.has(normalizedLanguage)) {
        return null;
    }

    const lines = rawCode
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const nodes: string[] = [];
    const nodeSet = new Set<string>();
    const edges: DiagramEdge[] = [];
    const edgeSet = new Set<string>();
    let laneActors: [string, string] | null = null;

    const addNode = (raw: string) => {
        const node = cleanDiagramText(raw);
        if (!node || nodeSet.has(node)) {
            return;
        }
        nodeSet.add(node);
        nodes.push(node);
    };

    const addEdge = (edge: DiagramEdge) => {
        const from = cleanDiagramText(edge.from);
        const to = cleanDiagramText(edge.to);
        if (!from || !to || from === to) {
            return;
        }

        const label = edge.label?.trim() || undefined;
        const key = `${from}|${to}|${edge.direction}|${label || ''}`;
        if (edgeSet.has(key)) {
            return;
        }
        edgeSet.add(key);

        addNode(from);
        addNode(to);
        edges.push({
            from,
            to,
            direction: edge.direction,
            label,
        });
    };

    for (const line of lines) {
        const maybeActors = inferLaneActors(line);
        if (maybeActors) {
            laneActors = maybeActors;
            addNode(maybeActors[0]);
            addNode(maybeActors[1]);
        }

        const bracketNodes = extractBracketNodes(line);
        for (const bracketNode of bracketNodes) {
            addNode(bracketNode);
        }

        if (laneActors) {
            const laneEdge = extractLaneEdge(line, laneActors);
            if (laneEdge) {
                addEdge(laneEdge);
                continue;
            }
        }

        const inlineEdges = extractInlineEdges(line);
        for (const edge of inlineEdges) {
            addEdge(edge);
        }
    }

    if (edges.length === 0) {
        return null;
    }

    return {
        nodes,
        edges,
        linearPath: inferLinearPath(nodes, edges),
    };
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

function DiagramPreview({ diagram }: { diagram: ParsedDiagram }) {
    const edgeLabelRows = diagram.edges.filter((edge) => Boolean(edge.label));
    const isLinear = Boolean(diagram.linearPath);

    return (
        <div className="border-b border-slate-800/80 bg-cyan-500/5 px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300 mb-2.5">
                Schema visuel
            </p>

            {isLinear ? (
                <div className="flex flex-wrap items-center gap-2">
                    {diagram.linearPath!.map((node, index) => {
                        const nextNode = diagram.linearPath![index + 1];
                        const edge = nextNode
                            ? diagram.edges.find((candidate) => (
                                (candidate.from === node && candidate.to === nextNode)
                                || (candidate.direction === 'both' && candidate.from === nextNode && candidate.to === node)
                            ))
                            : null;
                        const arrow = edge?.direction === 'both'
                            ? <ArrowLeftRight size={14} className="text-cyan-300" />
                            : <ArrowRight size={14} className="text-cyan-300" />;

                        return (
                            <div key={`${node}-${index}`} className="inline-flex items-center gap-2">
                                <span className="rounded-lg border border-cyan-500/20 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200">
                                    {node}
                                </span>
                                {nextNode && arrow}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                        {diagram.nodes.map((node) => (
                            <span
                                key={node}
                                className="rounded-lg border border-cyan-500/20 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200"
                            >
                                {node}
                            </span>
                        ))}
                    </div>
                    <div className="space-y-2">
                        {diagram.edges.map((edge, index) => (
                            <div
                                key={`${edge.from}-${edge.to}-${index}`}
                                className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2"
                            >
                                <div className="flex items-center gap-2 text-xs text-slate-200">
                                    <span className="rounded-md border border-white/10 bg-slate-950/70 px-2 py-1">
                                        {edge.from}
                                    </span>
                                    {edge.direction === 'both' ? (
                                        <ArrowLeftRight size={13} className="text-cyan-300" />
                                    ) : (
                                        <ArrowRight size={13} className="text-cyan-300" />
                                    )}
                                    <span className="rounded-md border border-white/10 bg-slate-950/70 px-2 py-1">
                                        {edge.to}
                                    </span>
                                </div>
                                {edge.label && (
                                    <p className="mt-1.5 text-[11px] text-cyan-100/90">{edge.label}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isLinear && edgeLabelRows.length > 0 && (
                <div className="mt-3 space-y-1">
                    {edgeLabelRows.map((edge, index) => (
                        <p key={`${edge.from}-${edge.to}-${index}`} className="text-[11px] text-cyan-100/90">
                            <span className="text-cyan-300">{edge.from}</span> {'->'} <span className="text-cyan-300">{edge.to}</span>
                            {' '} : {edge.label}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
    const [copied, setCopied] = useState(false);
    const lines = code.replace(/\n$/, '').split('\n');
    const languageLabel = language || 'text';
    const diagram = useMemo(() => parseDiagram(code, language), [code, language]);

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

            {diagram && <DiagramPreview diagram={diagram} />}

            {diagram ? (
                <details className="border-t border-slate-800/80">
                    <summary className="cursor-pointer px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300">
                        Version texte
                    </summary>
                    <div className="overflow-x-auto px-4 pb-4">
                        <code className="block font-mono text-[13px] md:text-sm text-slate-200 leading-6 md:leading-7 min-w-full">
                            {lines.map((line, lineNumber) => (
                                <div key={`line-${lineNumber}`} className="grid grid-cols-[3rem_1fr] gap-3">
                                    <span className="select-none text-right text-slate-600">{lineNumber + 1}</span>
                                    <span className="whitespace-pre">{line || ' '}</span>
                                </div>
                            ))}
                        </code>
                    </div>
                </details>
            ) : (
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
            )}
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
