/**
 * Main Dashboard - Real-time monitoring view
 */

import { useMemo } from 'react';
import { Transaction, Metrics } from '../../hooks/useWebSocket';
import ResponseCodeStats from './ResponseCodeStats';
import ServiceLatency from './ServiceLatency';
import SuccessRateGauge from './SuccessRateGauge';

interface DashboardProps {
    transactions: Transaction[];
    metrics: Metrics | null;
}

export default function Dashboard({ transactions, metrics }: DashboardProps) {
    // Calculate stats from transactions
    const stats = useMemo(() => {
        const total = transactions.length;
        const successful = transactions.filter(t => t.responseCode === '00').length;
        const avgLatency = total > 0
            ? transactions.reduce((sum, t) => sum + t.latency, 0) / total
            : 0;
        const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

        return {
            total,
            successful,
            successRate: total > 0 ? (successful / total) * 100 : 0,
            avgLatency,
            totalAmount
        };
    }, [transactions]);

    // Response code distribution
    const responseCodeStats = useMemo(() => {
        const distribution: Record<string, { count: number; color: string; label: string }> = {
            '00': { count: 0, color: '#22c55e', label: 'Approved' },
            '05': { count: 0, color: '#ef4444', label: 'Do Not Honor' },
            '51': { count: 0, color: '#f59e0b', label: 'Insufficient Funds' },
            '14': { count: 0, color: '#ef4444', label: 'Invalid Card' },
            '54': { count: 0, color: '#f59e0b', label: 'Expired Card' },
            'other': { count: 0, color: '#6b7280', label: 'Other' }
        };

        for (const txn of transactions) {
            if (distribution[txn.responseCode]) {
                distribution[txn.responseCode].count++;
            } else {
                distribution['other'].count++;
            }
        }

        return distribution;
    }, [transactions]);

    // Format currency
    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount / 100);
    };

    return (
        <div>
            {/* Stats Row */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Transactions (1 min)</div>
                    <div className="stat-change positive">
                        ↑ {metrics?.requestsPerSecond?.toFixed(0) || 0}/s
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{stats.successRate.toFixed(1)}%</div>
                    <div className="stat-label">Taux de Succès</div>
                    <div className={`stat-change ${stats.successRate > 95 ? 'positive' : 'negative'}`}>
                        {stats.successRate > 95 ? '✓ Normal' : '⚠ Attention'}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{stats.avgLatency.toFixed(0)}ms</div>
                    <div className="stat-label">Latence Moyenne</div>
                    <div className={`stat-change ${stats.avgLatency < 200 ? 'positive' : 'negative'}`}>
                        P95: {metrics?.p95Latency?.toFixed(0) || 0}ms
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{formatAmount(stats.totalAmount)}</div>
                    <div className="stat-label">Volume Total</div>
                    <div className="stat-change positive">
                        {transactions.length} transactions
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="dashboard-grid">
                {/* Success Rate Gauge */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="card-title-icon">📊</span>
                            Taux de Succès
                        </h3>
                    </div>
                    <div className="card-body">
                        <SuccessRateGauge rate={stats.successRate} />
                    </div>
                </div>

                {/* Response Code Distribution */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="card-title-icon">📈</span>
                            Codes Réponse
                        </h3>
                    </div>
                    <div className="card-body">
                        <ResponseCodeStats distribution={responseCodeStats} />
                    </div>
                </div>

                {/* Service Latency */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="card-title-icon">⏱️</span>
                            Latence par Service
                        </h3>
                    </div>
                    <div className="card-body">
                        <ServiceLatency services={metrics?.services} />
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="card-title-icon">💳</span>
                            Transactions Récentes
                        </h3>
                    </div>
                    <div className="card-body" style={{ maxHeight: '300px', overflow: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Heure</th>
                                    <th>PAN</th>
                                    <th>Montant</th>
                                    <th>Code</th>
                                    <th>Latence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.slice(0, 10).map(txn => (
                                    <tr key={txn.id}>
                                        <td>{new Date(txn.timestamp).toLocaleTimeString('fr-FR')}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{txn.pan}</td>
                                        <td>{formatAmount(txn.amount)}</td>
                                        <td>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                background: txn.responseCode === '00' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                color: txn.responseCode === '00' ? '#22c55e' : '#ef4444'
                                            }}>
                                                {txn.responseCode}
                                            </span>
                                        </td>
                                        <td>{txn.latency}ms</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
