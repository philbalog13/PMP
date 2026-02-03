/**
 * Main Dashboard - Real-time monitoring view
 */

import { Suspense, lazy, useMemo } from 'react';
import { BarChart3, Clock3, CreditCard, Gauge, Globe2 } from 'lucide-react';
import type { Transaction, Metrics } from '../../hooks/useWebSocket';
import ResponseCodeStats from './ResponseCodeStats';
import ServiceLatency from './ServiceLatency';
import SuccessRateGauge from './SuccessRateGauge';

const TransactionMap = lazy(() => import('./TransactionMap'));

interface DashboardProps {
    transactions: Transaction[];
    metrics: Metrics | null;
}

interface DashboardStats {
    total: number;
    successful: number;
    successRate: number;
    avgLatency: number;
    totalAmount: number;
    responseCodeStats: Record<string, { count: number; color: string; label: string }>;
}

function buildDashboardStats(transactions: Transaction[]): DashboardStats {
    const responseCodeStats: Record<string, { count: number; color: string; label: string }> = {
        '00': { count: 0, color: '#22c55e', label: 'Approved' },
        '05': { count: 0, color: '#ef4444', label: 'Do Not Honor' },
        '51': { count: 0, color: '#f59e0b', label: 'Insufficient Funds' },
        '14': { count: 0, color: '#ef4444', label: 'Invalid Card' },
        '54': { count: 0, color: '#f59e0b', label: 'Expired Card' },
        other: { count: 0, color: '#6b7280', label: 'Other' }
    };

    let successful = 0;
    let totalLatency = 0;
    let totalAmount = 0;

    for (const txn of transactions) {
        if (txn.responseCode === '00') {
            successful += 1;
        }

        totalLatency += txn.latency;
        totalAmount += txn.amount;

        if (responseCodeStats[txn.responseCode]) {
            responseCodeStats[txn.responseCode].count += 1;
        } else {
            responseCodeStats.other.count += 1;
        }
    }

    const total = transactions.length;

    return {
        total,
        successful,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        avgLatency: total > 0 ? totalLatency / total : 0,
        totalAmount,
        responseCodeStats
    };
}

export default function Dashboard({ transactions, metrics }: DashboardProps) {
    const stats = useMemo(() => buildDashboardStats(transactions), [transactions]);
    const recentTransactions = useMemo(() => transactions.slice(0, 10), [transactions]);
    const currencyFormatter = useMemo(
        () =>
            new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR'
            }),
        []
    );

    const formatAmount = (amount: number) => currencyFormatter.format(amount / 100);

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Transactions (1 min)</div>
                    <div className="stat-change positive">+{metrics?.requestsPerSecond?.toFixed(0) || 0}/s</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{stats.successRate.toFixed(1)}%</div>
                    <div className="stat-label">Taux de succes</div>
                    <div className={`stat-change ${stats.successRate > 95 ? 'positive' : 'negative'}`}>
                        {stats.successRate > 95 ? 'Stable' : 'Attention'}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{stats.avgLatency.toFixed(0)}ms</div>
                    <div className="stat-label">Latence moyenne</div>
                    <div className={`stat-change ${stats.avgLatency < 200 ? 'positive' : 'negative'}`}>
                        P95: {metrics?.p95Latency?.toFixed(0) || 0}ms
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{formatAmount(stats.totalAmount)}</div>
                    <div className="stat-label">Volume total</div>
                    <div className="stat-change positive">{stats.successful} approuvees</div>
                </div>
            </div>

            <div className="card card-full" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h3 className="card-title">
                        <span className="card-title-icon">
                            <Globe2 size={14} />
                        </span>
                        Carte temps reel des transactions
                    </h3>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    <Suspense
                        fallback={
                            <div className="loading">
                                <div className="loading-spinner" />
                            </div>
                        }
                    >
                        <TransactionMap transactions={transactions} maxPoints={28} />
                    </Suspense>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="card-title-icon">
                                <Gauge size={14} />
                            </span>
                            Taux de succes
                        </h3>
                    </div>
                    <div className="card-body">
                        <SuccessRateGauge rate={stats.successRate} />
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="card-title-icon">
                                <BarChart3 size={14} />
                            </span>
                            Codes reponse
                        </h3>
                    </div>
                    <div className="card-body">
                        <ResponseCodeStats distribution={stats.responseCodeStats} />
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="card-title-icon">
                                <Clock3 size={14} />
                            </span>
                            Latence par service
                        </h3>
                    </div>
                    <div className="card-body">
                        <ServiceLatency services={metrics?.services} />
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="card-title-icon">
                                <CreditCard size={14} />
                            </span>
                            Transactions recentes
                        </h3>
                    </div>
                    <div className="card-body table-scroll">
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
                                {recentTransactions.map((txn) => (
                                    <tr key={txn.id}>
                                        <td>{new Date(txn.timestamp).toLocaleTimeString('fr-FR')}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{txn.pan}</td>
                                        <td>{formatAmount(txn.amount)}</td>
                                        <td>
                                            <span className={`code-pill ${txn.responseCode === '00' ? 'success' : 'error'}`}>
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
