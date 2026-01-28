/**
 * Student Progress Component
 * Shows student progress and workshop completion rates
 */

interface Student {
    studentId: string;
    name: string;
    completedWorkshops: number;
    score: number;
    lastActive: string;
}

interface Workshop {
    workshop: string;
    completion: number;
    avgScore: number;
}

interface StudentProgressProps {
    students: Student[];
    workshops: Workshop[];
}

export default function StudentProgress({ students, workshops }: StudentProgressProps) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Student Leaderboard */}
            <div>
                <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                    🏆 Classement des Étudiants
                </h4>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nom</th>
                            <th>Ateliers</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students
                            .sort((a, b) => b.score - a.score)
                            .map((student, index) => (
                                <tr key={student.studentId}>
                                    <td>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: index < 3 ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
                                            fontSize: '12px',
                                            fontWeight: 600
                                        }}>
                                            {index + 1}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{student.name}</td>
                                    <td>
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            {student.completedWorkshops}/15
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            color: student.score >= 80 ? '#22c55e' : student.score >= 60 ? '#f59e0b' : '#ef4444',
                                            fontWeight: 600
                                        }}>
                                            {student.score}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {/* Workshop Progress */}
            <div>
                <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                    📚 Progression par Atelier
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {workshops.map(workshop => (
                        <div key={workshop.workshop}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '4px',
                                fontSize: '13px'
                            }}>
                                <span>{workshop.workshop}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    {workshop.completion}% • Score: {workshop.avgScore}
                                </span>
                            </div>
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${workshop.completion}%`,
                                        background: workshop.completion >= 80
                                            ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                            : workshop.completion >= 50
                                                ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                                : 'linear-gradient(90deg, #ef4444, #dc2626)'
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
