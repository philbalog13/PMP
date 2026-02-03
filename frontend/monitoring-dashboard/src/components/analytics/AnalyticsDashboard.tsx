/**
 * Analytics Dashboard
 * Pedagogical analytics with student progress, fraud heatmap, and error analysis
 */

import { useState, useEffect } from 'react';
import FraudHeatmap from './FraudHeatmap';
import StudentProgress from './StudentProgress';
import ErrorAnalysis from './ErrorAnalysis';
import Suggestions from './Suggestions';

interface AnalyticsData {
    students: any[];
    workshops: any[];
    errors: any[];
    suggestions: any[];
    fraud: {
        metrics: any[];
        heatmap: any;
    };
}

type AnalyticsTab = 'overview' | 'fraud' | 'students' | 'errors';

interface AnalyticsDashboardProps {
    initialTab?: AnalyticsTab;
}

const tabs: Array<{ id: AnalyticsTab; label: string }> = [
    { id: 'overview', label: 'Vue generale' },
    { id: 'fraud', label: 'Fraudes' },
    { id: 'students', label: 'Etudiants' },
    { id: 'errors', label: 'Erreurs' }
];

export default function AnalyticsDashboard({ initialTab = 'overview' }: AnalyticsDashboardProps) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);

    useEffect(() => {
        loadAnalyticsData();
    }, []);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const loadAnalyticsData = async () => {
        try {
            const [studentsRes, workshopsRes, errorsRes, suggestionsRes, fraudRes] = await Promise.all([
                fetch('/api/analytics/students').then((r) => r.json()),
                fetch('/api/analytics/workshops').then((r) => r.json()),
                fetch('/api/analytics/errors').then((r) => r.json()),
                fetch('/api/analytics/suggestions').then((r) => r.json()),
                fetch('/api/analytics/fraud').then((r) => r.json())
            ]);

            setData({
                students: studentsRes.data?.students || generateMockStudents(),
                workshops: workshopsRes.data?.workshops || generateMockWorkshops(),
                errors: errorsRes.data?.errors || generateMockErrors(),
                suggestions: suggestionsRes.data || generateMockSuggestions(),
                fraud: fraudRes.data || { metrics: [], heatmap: {} }
            });
        } catch {
            setData({
                students: generateMockStudents(),
                workshops: generateMockWorkshops(),
                errors: generateMockErrors(),
                suggestions: generateMockSuggestions(),
                fraud: { metrics: generateMockFraudMetrics(), heatmap: {} }
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '24px',
                    padding: '4px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    width: 'fit-content'
                }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="dashboard-grid">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <span className="card-title-icon">OV</span>
                                Resume
                            </h3>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                <div className="stat-card">
                                    <div className="stat-value">{data?.students.length || 0}</div>
                                    <div className="stat-label">Etudiants actifs</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{data?.workshops.length || 0}</div>
                                    <div className="stat-label">Ateliers</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">
                                        {data?.workshops.reduce((sum, workshop) => sum + workshop.completion, 0) / (data?.workshops.length || 1) || 0}%
                                    </div>
                                    <div className="stat-label">Completion moyenne</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">
                                        {data?.errors.reduce((sum, errorItem) => sum + errorItem.count, 0) || 0}
                                    </div>
                                    <div className="stat-label">Erreurs totales</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <span className="card-title-icon">SG</span>
                                Suggestions d'amelioration
                            </h3>
                        </div>
                        <div className="card-body">
                            <Suggestions suggestions={data?.suggestions || []} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'fraud' && (
                <div className="card card-full">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="card-title-icon">FR</span>
                            Heatmap des fraudes detectees
                        </h3>
                    </div>
                    <div className="card-body">
                        <FraudHeatmap data={data?.fraud || null} />
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div className="card card-full">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="card-title-icon">ST</span>
                            Progression des etudiants
                        </h3>
                    </div>
                    <div className="card-body">
                        <StudentProgress
                            students={data?.students || []}
                            workshops={data?.workshops || []}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'errors' && (
                <div className="card card-full">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="card-title-icon">ER</span>
                            Analyse des erreurs courantes
                        </h3>
                    </div>
                    <div className="card-body">
                        <ErrorAnalysis errors={data?.errors || []} />
                    </div>
                </div>
            )}
        </div>
    );
}

function generateMockStudents() {
    return [
        { studentId: 'STU001', name: 'Alice Martin', completedWorkshops: 12, score: 85, lastActive: '2026-01-28' },
        { studentId: 'STU002', name: 'Bob Dupont', completedWorkshops: 10, score: 78, lastActive: '2026-01-27' },
        { studentId: 'STU003', name: 'Claire Bernard', completedWorkshops: 14, score: 92, lastActive: '2026-01-28' },
        { studentId: 'STU004', name: 'David Leroy', completedWorkshops: 8, score: 65, lastActive: '2026-01-26' },
        { studentId: 'STU005', name: 'Emma Petit', completedWorkshops: 11, score: 88, lastActive: '2026-01-28' }
    ];
}

function generateMockWorkshops() {
    return [
        { workshop: 'Atelier 01', completion: 95, avgScore: 82 },
        { workshop: 'Atelier 02', completion: 88, avgScore: 75 },
        { workshop: 'Atelier 03', completion: 82, avgScore: 70 },
        { workshop: 'Atelier 04', completion: 78, avgScore: 72 },
        { workshop: 'Atelier 05', completion: 65, avgScore: 68 },
        { workshop: 'Atelier 06', completion: 72, avgScore: 74 },
        { workshop: 'Atelier 07', completion: 68, avgScore: 71 },
        { workshop: 'Atelier 08', completion: 85, avgScore: 80 }
    ];
}

function generateMockErrors() {
    return [
        { error: 'MAC calculation incorrect', count: 45, workshop: 'Atelier 07', severity: 'high' },
        { error: 'PIN Block format error', count: 38, workshop: 'Atelier 02', severity: 'medium' },
        { error: 'Key rotation not implemented', count: 32, workshop: 'Atelier 05', severity: 'high' },
        { error: 'ISO 8583 parsing failure', count: 28, workshop: 'Atelier 06', severity: 'medium' },
        { error: 'Missing response code validation', count: 25, workshop: 'Atelier 08', severity: 'low' }
    ];
}

function generateMockSuggestions() {
    return [
        { id: 1, priority: 'high', title: 'Renforcer la validation MAC', description: '45 erreurs detectees' },
        { id: 2, priority: 'medium', title: 'Simplifier Atelier 05', description: 'Taux completion 65%' },
        { id: 3, priority: 'high', title: 'Insister sur PAN masking', description: '15 violations PCI-DSS' }
    ];
}

function generateMockFraudMetrics() {
    return [
        { type: 'mitm', count: 45, severity: 'critical' },
        { type: 'replay', count: 32, severity: 'high' },
        { type: 'dos', count: 28, severity: 'high' },
        { type: 'pan_harvest', count: 15, severity: 'critical' },
        { type: 'brute_force', count: 12, severity: 'medium' }
    ];
}
