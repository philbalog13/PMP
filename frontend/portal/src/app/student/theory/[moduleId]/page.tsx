'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    AlertCircle, BookOpen, CheckCircle2,
    ChevronRight, ChevronDown, Play, Clock, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../auth/useAuth';
import { CourseRichRenderer } from '../../../../components/cursus/CourseRichRenderer';
import { NotionSkeleton, NotionEmptyState, NotionProgress, NotionBadge } from '@shared/components/notion';

interface WorkshopSection {
    id: string;
    title: string;
    content: string;
}

interface WorkshopContentPayload {
    workshop: { id: string; title: string; description: string; quizId: string | null };
    content: { workshopId: string; title: string; description: string; sections: WorkshopSection[] };
}

// ── Section Accordion ─────────────────────────────────────────────────────────
function SectionAccordion({
    sectionN, title, content, isOpen, isCompleted, onToggle, onComplete, isLast,
}: {
    sectionN: number; title: string; content: string;
    isOpen: boolean; isCompleted: boolean;
    onToggle: () => void; onComplete: () => void; isLast: boolean;
}) {
    const borderColor = isOpen
        ? 'var(--n-accent-border)'
        : isCompleted
        ? 'var(--n-success-border)'
        : 'var(--n-border)';

    const stripeColor = isOpen
        ? 'var(--n-accent)'
        : isCompleted
        ? 'var(--n-success)'
        : 'var(--n-border-strong)';

    return (
        <div style={{
            background: 'var(--n-bg-primary)',
            border: `1px solid ${borderColor}`,
            borderLeft: `3px solid ${stripeColor}`,
            borderRadius: '8px',
            overflow: 'hidden',
            transition: 'border-color 0.15s',
        }}>
            {/* Header */}
            <button
                onClick={onToggle}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
                {/* Number / check circle */}
                <div style={{
                    flexShrink: 0,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                    border: `2px solid ${isCompleted ? 'var(--n-success)' : isOpen ? 'var(--n-accent)' : 'var(--n-border-strong)'}`,
                    background: isCompleted ? 'var(--n-success-bg)' : isOpen ? 'var(--n-accent-light)' : 'var(--n-bg-elevated)',
                    color: isCompleted ? 'var(--n-success)' : isOpen ? 'var(--n-accent)' : 'var(--n-text-tertiary)',
                    transition: 'all 0.15s',
                }}>
                    {isCompleted ? <CheckCircle2 size={14} /> : sectionN}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: isOpen ? 'var(--n-accent)' : 'var(--n-text-tertiary)',
                        marginBottom: '2px',
                    }}>
                        Section {sectionN}
                        <span style={{
                            marginLeft: '8px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'var(--n-bg-elevated)',
                            color: 'var(--n-text-tertiary)',
                            fontWeight: 600,
                        }}>~8 min</span>
                    </div>
                    <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--n-text-primary)',
                        lineHeight: 1.3,
                    }}>{title}</div>
                </div>

                <ChevronDown
                    size={16}
                    style={{
                        flexShrink: 0,
                        color: 'var(--n-text-tertiary)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.2s',
                    }}
                />
            </button>

            {/* Expanded content */}
            {isOpen && (
                <div style={{ borderTop: '1px solid var(--n-border)' }}>
                    {/* Divider label */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        margin: '16px 20px 12px',
                        color: 'var(--n-text-tertiary)',
                    }}>
                        <div style={{ height: '1px', flex: 1, background: 'var(--n-border)' }} />
                        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Contenu de la section
                        </span>
                        <div style={{ height: '1px', flex: 1, background: 'var(--n-border)' }} />
                    </div>

                    {/* Prose content */}
                    <div style={{ padding: '0 20px 8px' }}>
                        <CourseRichRenderer content={content} showToc={false} />
                    </div>

                    {/* Mark complete */}
                    <div style={{ margin: '16px 20px 20px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '12px',
                            color: 'var(--n-text-tertiary)',
                        }}>
                            <div style={{ height: '1px', flex: 1, background: 'var(--n-border)' }} />
                            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                Marquer comme terminé
                            </span>
                            <div style={{ height: '1px', flex: 1, background: 'var(--n-border)' }} />
                        </div>
                        <button
                            onClick={onComplete}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'var(--n-accent)',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'opacity 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        >
                            <CheckCircle2 size={15} />
                            {isLast ? 'Terminer le cours' : 'Section suivante →'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TheoryPage({ params }: { params: Promise<{ moduleId: string }> }) {
    const { moduleId } = use(params);
    const { isLoading: authLoading } = useAuth(true);

    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);
    const [payload, setPayload]   = useState<WorkshopContentPayload | null>(null);
    const [openSection, setOpenSection]             = useState<number>(0);
    const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
    const [showStickyBar, setShowStickyBar]         = useState(false);
    const heroRef = useRef<HTMLDivElement>(null);

    const fetchContent = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Session expirée.');
            const res = await fetch(`/api/progress/workshops/${moduleId}/content`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Impossible de charger le contenu du cours.');
            }
            const body = await res.json();
            if (!body.success) throw new Error(body.error || 'Erreur inconnue.');
            setPayload(body);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement.');
        } finally {
            setLoading(false);
        }
    }, [moduleId]);

    useEffect(() => {
        if (authLoading) return;
        void fetchContent();
    }, [authLoading, fetchContent]);

    useEffect(() => {
        const handleScroll = () => {
            if (heroRef.current) {
                setShowStickyBar(heroRef.current.getBoundingClientRect().bottom < 0);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleToggle = (index: number) => {
        setOpenSection(prev => prev === index ? -1 : index);
    };

    const handleComplete = (index: number, total: number) => {
        setCompletedSections(prev => new Set([...prev, index]));
        if (index < total - 1) {
            setTimeout(() => setOpenSection(index + 1), 300);
        } else {
            setOpenSection(-1);
        }
    };

    /* ── Loading ── */
    if (authLoading || loading) {
        return (
            <div style={{ padding: '40px 24px', maxWidth: '860px', margin: '0 auto' }}>
                <NotionSkeleton type="line" style={{ width: '200px', marginBottom: '24px' }} />
                <NotionSkeleton type="stat" style={{ height: '80px', marginBottom: '24px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <NotionSkeleton key={i} type="card" style={{ height: '56px' }} />
                    ))}
                </div>
            </div>
        );
    }

    /* ── Error ── */
    if (!payload) {
        return (
            <div style={{ padding: '80px 24px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                    <AlertCircle size={36} style={{ color: 'var(--n-danger)', margin: '0 auto 16px' }} />
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--n-text-primary)', marginBottom: '8px' }}>
                        Cours indisponible
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--n-text-tertiary)', marginBottom: '24px' }}>
                        {error || 'Le contenu demandé est introuvable.'}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button
                            onClick={fetchContent}
                            style={{
                                padding: '8px 18px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'var(--n-accent)',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <RefreshCw size={13} />
                            Réessayer
                        </button>
                        <Link href="/student" style={{
                            padding: '8px 18px',
                            borderRadius: '6px',
                            border: '1px solid var(--n-border)',
                            background: 'var(--n-bg-primary)',
                            color: 'var(--n-text-secondary)',
                            fontSize: '13px',
                            fontWeight: 500,
                            textDecoration: 'none',
                        }}>
                            Retour
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const title         = payload.workshop?.title || payload.content?.title || moduleId;
    const description   = payload.workshop?.description || payload.content?.description || '';
    const sections      = payload.content?.sections || [];
    const quizAvailable = Boolean(payload.workshop?.quizId);
    const estimatedMin  = Math.max(10, sections.length * 8);
    const sectionPct    = sections.length > 0 ? Math.round((completedSections.size / sections.length) * 100) : 0;

    return (
        <div style={{ minHeight: 'calc(100vh - 48px)', background: 'var(--n-bg-primary)' }}>

            {/* ── STICKY PROGRESS BAR ── */}
            <div style={{
                position: 'fixed',
                top: '48px',
                left: 0,
                right: 0,
                zIndex: 40,
                transform: showStickyBar ? 'translateY(0)' : 'translateY(-100%)',
                transition: 'transform 0.25s ease',
            }}>
                <div style={{
                    background: 'var(--n-bg-primary)',
                    borderBottom: '1px solid var(--n-border)',
                    padding: '8px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                }}>
                    <Link href="/student/cursus" style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--n-text-tertiary)',
                        textDecoration: 'none',
                        flexShrink: 0,
                    }}>← Cursus</Link>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {title}
                            </span>
                            <NotionBadge variant="accent" style={{ marginLeft: '8px', flexShrink: 0 }}>
                                {sectionPct}%
                            </NotionBadge>
                        </div>
                        <NotionProgress value={sectionPct} max={100} variant="accent" size="default" />
                    </div>
                    {quizAvailable && (
                        <Link href={`/student/quiz/${moduleId}`} style={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: 'var(--n-accent)',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 600,
                            textDecoration: 'none',
                        }}>
                            <Play size={12} />
                            Quiz
                        </Link>
                    )}
                </div>
            </div>

            {/* ── PAGE HEADER ── */}
            <div ref={heroRef} style={{
                borderBottom: '1px solid var(--n-border)',
                padding: '32px 24px 28px',
                background: 'var(--n-bg-primary)',
            }}>
                <div style={{ maxWidth: '860px', margin: '0 auto' }}>
                    {/* Breadcrumb */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: 'var(--n-text-tertiary)',
                        marginBottom: '16px',
                    }}>
                        <Link href="/student" style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-text-primary)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                            Mon Parcours
                        </Link>
                        <ChevronRight size={12} />
                        <span style={{ color: 'var(--n-text-secondary)' }}>Cours</span>
                    </div>

                    {/* Type label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <BookOpen size={15} style={{ color: 'var(--n-accent)' }} />
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'var(--n-accent)',
                        }}>Cours théorique</span>
                    </div>

                    <h1 style={{
                        fontSize: '26px',
                        fontWeight: 700,
                        color: 'var(--n-text-primary)',
                        marginBottom: '8px',
                        lineHeight: 1.2,
                        letterSpacing: '-0.01em',
                    }}>{title}</h1>

                    {description && (
                        <p style={{
                            fontSize: '14px',
                            color: 'var(--n-text-secondary)',
                            lineHeight: 1.6,
                            maxWidth: '600px',
                            marginBottom: '20px',
                        }}>{description}</p>
                    )}

                    {/* Meta row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--n-text-secondary)' }}>
                            <BookOpen size={13} style={{ color: 'var(--n-text-tertiary)' }} />
                            {sections.length} section{sections.length !== 1 ? 's' : ''}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--n-text-secondary)' }}>
                            <Clock size={13} style={{ color: 'var(--n-text-tertiary)' }} />
                            ~{estimatedMin} min
                        </div>
                        {sectionPct > 0 && (
                            <NotionBadge variant={sectionPct === 100 ? 'success' : 'accent'}>
                                {sectionPct}% complété
                            </NotionBadge>
                        )}
                    </div>

                    {/* Progress bar */}
                    {sections.length > 0 && (
                        <div style={{ maxWidth: '400px' }}>
                            <NotionProgress value={sectionPct} max={100} variant={sectionPct === 100 ? 'success' : 'accent'} size="default" />
                        </div>
                    )}
                </div>
            </div>

            {/* ── CONTENT AREA ── */}
            <div style={{ maxWidth: '860px', margin: '0 auto', padding: '28px 24px 48px' }}>
                <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>

                    {/* Left: Section accordions */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {sections.length > 0 ? sections.map((section, index) => (
                            <SectionAccordion
                                key={section.id || `${index}`}
                                sectionN={index + 1}
                                title={section.title}
                                content={section.content}
                                isOpen={openSection === index}
                                isCompleted={completedSections.has(index)}
                                onToggle={() => handleToggle(index)}
                                onComplete={() => handleComplete(index, sections.length)}
                                isLast={index === sections.length - 1}
                            />
                        )) : (
                            <NotionEmptyState
                                icon={<BookOpen size={28} />}
                                title="Aucune section disponible"
                                description="Ce cours n'a pas encore de contenu."
                            />
                        )}

                        {/* Quiz CTA */}
                        {quizAvailable && sections.length > 0 && (
                            <div style={{
                                marginTop: '12px',
                                padding: '20px',
                                borderRadius: '8px',
                                border: '1px solid var(--n-accent-border)',
                                background: 'var(--n-accent-light)',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
                                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--n-text-primary)', marginBottom: '4px' }}>
                                    Prêt pour le quiz ?
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', marginBottom: '16px' }}>
                                    Testez vos connaissances sur ce cours.
                                </p>
                                <Link href={`/student/quiz/${moduleId}`} style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 20px',
                                    borderRadius: '6px',
                                    background: 'var(--n-accent)',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    transition: 'opacity 0.15s',
                                }}
                                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                                    <Play size={14} />
                                    Passer le quiz
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Right: Sticky ToC sidebar */}
                    <div style={{ width: '200px', flexShrink: 0, display: 'none' }} className="lg:!block">
                        <div style={{ position: 'sticky', top: '80px' }}>
                            <div style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                color: 'var(--n-text-tertiary)',
                                marginBottom: '10px',
                                paddingLeft: '8px',
                            }}>Sections du cours</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {sections.map((section, index) => {
                                    const isActive    = openSection === index;
                                    const isDone      = completedSections.has(index);
                                    return (
                                        <button
                                            key={section.id || `${index}`}
                                            onClick={() => handleToggle(index)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '6px 8px',
                                                borderRadius: '5px',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                border: 'none',
                                                background: isActive ? 'var(--n-accent-light)' : 'transparent',
                                                color: isActive ? 'var(--n-accent)' : isDone ? 'var(--n-text-secondary)' : 'var(--n-text-tertiary)',
                                                transition: 'all 0.1s',
                                            }}
                                            onMouseEnter={e => {
                                                if (!isActive) e.currentTarget.style.background = 'var(--n-bg-hover)';
                                            }}
                                            onMouseLeave={e => {
                                                if (!isActive) e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <span style={{
                                                flexShrink: 0,
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '9px',
                                                fontWeight: 800,
                                                background: isDone ? 'var(--n-success-bg)' : isActive ? 'var(--n-accent-light)' : 'var(--n-bg-elevated)',
                                                color: isDone ? 'var(--n-success)' : isActive ? 'var(--n-accent)' : 'var(--n-text-tertiary)',
                                                border: `1px solid ${isDone ? 'var(--n-success-border)' : isActive ? 'var(--n-accent-border)' : 'var(--n-border)'}`,
                                            }}>
                                                {isDone ? '✓' : index + 1}
                                            </span>
                                            <span style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontSize: '12px',
                                                lineHeight: 1.3,
                                                fontWeight: isActive ? 600 : 400,
                                            }}>
                                                {section.title}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {quizAvailable && (
                                <Link href={`/student/quiz/${moduleId}`} style={{
                                    marginTop: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    background: 'var(--n-accent)',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    transition: 'opacity 0.15s',
                                }}
                                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                                    <Play size={13} />
                                    Passer le quiz
                                </Link>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
