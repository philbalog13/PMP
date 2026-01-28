/**
 * Suggestions Component
 * AI-generated improvement suggestions
 */

interface Suggestion {
    id: number;
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    workshop?: string;
    impact?: string;
    category?: string;
}

interface SuggestionsProps {
    suggestions: Suggestion[];
}

export default function Suggestions({ suggestions }: SuggestionsProps) {
    const priorityConfig = {
        high: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: '🔴' },
        medium: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: '🟡' },
        low: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', icon: '🟢' }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {suggestions.map(suggestion => {
                const config = priorityConfig[suggestion.priority];

                return (
                    <div
                        key={suggestion.id}
                        style={{
                            background: config.bg,
                            borderLeft: `4px solid ${config.color}`,
                            padding: '16px',
                            borderRadius: '0 8px 8px 0'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px'
                        }}>
                            <span>{config.icon}</span>
                            <span style={{
                                fontWeight: 600,
                                color: 'var(--text-primary)'
                            }}>
                                {suggestion.title}
                            </span>
                            <span style={{
                                marginLeft: 'auto',
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: config.color,
                                color: 'white',
                                textTransform: 'uppercase'
                            }}>
                                {suggestion.priority}
                            </span>
                        </div>

                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '13px',
                            margin: 0,
                            lineHeight: 1.5
                        }}>
                            {suggestion.description}
                        </p>

                        {(suggestion.workshop || suggestion.impact) && (
                            <div style={{
                                marginTop: '8px',
                                display: 'flex',
                                gap: '16px',
                                fontSize: '12px',
                                color: 'var(--text-tertiary)'
                            }}>
                                {suggestion.workshop && (
                                    <span>📚 {suggestion.workshop}</span>
                                )}
                                {suggestion.impact && (
                                    <span>📈 {suggestion.impact}</span>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {suggestions.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: 'var(--text-tertiary)'
                }}>
                    Aucune suggestion pour le moment
                </div>
            )}
        </div>
    );
}
