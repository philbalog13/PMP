/**
 * PMP Monitoring Dashboard - Main App Component
 */

import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useWebSocket } from './hooks/useWebSocket';

// Pages
import Dashboard from './components/realtime/Dashboard';
import Analytics from './components/analytics/AnalyticsDashboard';
import DebugTools from './components/debug/DebugTools';

// Icons (using inline SVG for simplicity)
const Icons = {
    Dashboard: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    ),
    Analytics: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
        </svg>
    ),
    Debug: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 12h.01M16 16c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4z" />
            <path d="M12 8V4M12 20v-4M8 12H4M20 12h-4M7.05 7.05 4.22 4.22M19.78 4.22l-2.83 2.83M7.05 16.95l-2.83 2.83M19.78 19.78l-2.83-2.83" strokeLinecap="round" />
        </svg>
    ),
    Transactions: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5l-5-3-5 3M7 19l5 3 5-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    Security: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    ),
    Users: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    Terminal: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
    ),
    Globe: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    )
};

interface NavItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
        </NavLink>
    );
}

function App() {
    const location = useLocation();
    const { connected, metrics, transactions } = useWebSocket();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Get page title based on route
    const getPageTitle = useCallback(() => {
        switch (location.pathname) {
            case '/': return 'Vue Globale du Système';
            case '/analytics': return 'Analytics Pédagogiques';
            case '/debug': return 'Outils de Débogage';
            default: return 'Dashboard';
        }
    }, [location.pathname]);

    return (
        <div className="app">
            <div className="main-layout">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <span className="sidebar-logo">📊 PMP Monitor</span>
                    </div>

                    <nav className="sidebar-nav">
                        <div className="nav-section">
                            <div className="nav-section-title">Vue Globale</div>
                            <NavItem to="/" icon={<Icons.Dashboard />} label="Dashboard" />
                            <NavItem to="/transactions" icon={<Icons.Transactions />} label="Transactions" />
                            <NavItem to="/map" icon={<Icons.Globe />} label="Carte 3D" />
                        </div>

                        <div className="nav-section">
                            <div className="nav-section-title">Analytics</div>
                            <NavItem to="/analytics" icon={<Icons.Analytics />} label="Vue Générale" />
                            <NavItem to="/fraud" icon={<Icons.Security />} label="Détection Fraudes" />
                            <NavItem to="/students" icon={<Icons.Users />} label="Progression" />
                        </div>

                        <div className="nav-section">
                            <div className="nav-section-title">Debug</div>
                            <NavItem to="/debug" icon={<Icons.Debug />} label="Outils Debug" />
                            <NavItem to="/trace" icon={<Icons.Terminal />} label="Tracer" />
                        </div>
                    </nav>

                    {/* Connection Status */}
                    <div style={{ padding: 'var(--spacing-md)', borderTop: '1px solid var(--border-color)' }}>
                        <div className="status-indicator">
                            <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
                            <span>{connected ? 'Connecté' : 'Déconnecté'}</span>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="content-wrapper">
                    <header className="header">
                        <h1 className="header-title">{getPageTitle()}</h1>
                        <div className="header-status">
                            <span style={{ color: 'var(--text-secondary)' }}>
                                {currentTime.toLocaleTimeString('fr-FR')}
                            </span>
                            {metrics && (
                                <span className="status-indicator">
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                        {metrics.requestsPerSecond?.toFixed(0) || 0} req/s
                                    </span>
                                </span>
                            )}
                        </div>
                    </header>

                    <main className="main-content">
                        <Routes>
                            <Route path="/" element={<Dashboard transactions={transactions} metrics={metrics} />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/debug" element={<DebugTools />} />
                            <Route path="*" element={<Dashboard transactions={transactions} metrics={metrics} />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </div>
    );
}

export default App;
