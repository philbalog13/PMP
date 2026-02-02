/**
 * PMP Monitoring Dashboard - Main App Component
 */

import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useWebSocket } from './hooks/useWebSocket';

// Icons
import {
    LayoutDashboard,
    PieChart,
    ShieldAlert,
    Terminal,
    Globe,
    Users,
    Server,
    Activity,
    FileText,
    Zap
} from 'lucide-react';

// Pages
import Dashboard from './components/realtime/Dashboard';
import Analytics from './components/analytics/AnalyticsDashboard';
import DebugTools from './components/debug/DebugTools';
import Terminals from './components/monitoring/Terminals';
import SecurityLogs from './components/security/SecurityLogs';
import HSMManager from './components/hsm/HSMManager';
import FraudDetection from './components/fraud/FraudDetection';

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
            case '/terminals': return 'Monitoring des Terminaux';
            case '/analytics': return 'Analytics Pédagogiques';
            case '/logs': return 'Logs de Sécurité';
            case '/hsm': return 'Gestion HSM';
            case '/debug': return 'Outils de Débogage';
            case '/fraud': return 'AI Fraud Detection';
            default: return 'Dashboard';
        }
    }, [location.pathname]);

    return (
        <div className="app">
            <div className="main-layout">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <span className="sidebar-logo flex items-center gap-2">
                            <Activity className="text-blue-500" />
                            PMP Monitor
                        </span>
                    </div>

                    <nav className="sidebar-nav">
                        <div className="nav-section">
                            <div className="nav-section-title">Vue Globale</div>
                            <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                            <NavItem to="/terminals" icon={<Terminal size={20} />} label="Terminaux" />
                            <NavItem to="/map" icon={<Globe size={20} />} label="Carte 3D" />
                        </div>

                        <div className="nav-section">
                            <div className="nav-section-title">Sécurité & Infra</div>
                            <NavItem to="/logs" icon={<ShieldAlert size={20} />} label="Logs Sécurité" />
                            <NavItem to="/hsm" icon={<Server size={20} />} label="HSM Master" />
                            <NavItem to="/fraud" icon={<Zap size={20} />} label="Anti-Fraude" />
                        </div>

                        <div className="nav-section">
                            <div className="nav-section-title">Analytics</div>
                            <NavItem to="/analytics" icon={<PieChart size={20} />} label="Performance" />
                            <NavItem to="/students" icon={<Users size={20} />} label="Utilisateurs" />
                        </div>

                        <div className="nav-section">
                            <div className="nav-section-title">Technique</div>
                            <NavItem to="/debug" icon={<FileText size={20} />} label="Outils Debug" />
                        </div>
                    </nav>

                    {/* Connection Status */}
                    <div style={{ padding: 'var(--spacing-md)', borderTop: '1px solid var(--border-color)' }}>
                        <a href={import.meta.env.VITE_PORTAL_URL || "http://localhost:3000"} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition">
                            <LayoutDashboard size={16} />
                            <span className="text-sm">Retour Portail</span>
                        </a>
                        <div className="status-indicator">
                            <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
                            <span>{connected ? 'Connecté' : 'Déconnecté'}</span>
                        </div>
                        {metrics && (
                            <div className="text-xs text-slate-500 mt-2 flex justify-between">
                                <span>Ping: {metrics.avgLatency?.toFixed(0) || 0}ms</span>
                                <span>Conns: {metrics.activeConnections || 0}</span>
                            </div>
                        )}
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
                                <span className="status-indicator ml-4 bg-white/5 py-1 px-3 rounded-full border border-white/5">
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
                            <Route path="/terminals" element={<Terminals />} />
                            <Route path="/logs" element={<SecurityLogs />} />
                            <Route path="/hsm" element={<HSMManager />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/debug" element={<DebugTools />} />
                            <Route path="/fraud" element={<FraudDetection />} />
                            <Route path="*" element={<Dashboard transactions={transactions} metrics={metrics} />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </div>
    );
}

export default App;
