/**
 * PMP Monitoring Dashboard - Main App Component
 */

import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    PieChart,
    ShieldAlert,
    Terminal,
    Globe,
    Users,
    Server,
    FileText,
    Zap,
    Menu,
    X,
    type LucideIcon
} from 'lucide-react';
import Dashboard from './components/realtime/Dashboard';
import { useWebSocket } from './hooks/useWebSocket';

const Analytics = lazy(() => import('./components/analytics/AnalyticsDashboard'));
const DebugTools = lazy(() => import('./components/debug/DebugTools'));
const Terminals = lazy(() => import('./components/monitoring/Terminals'));
const SecurityLogs = lazy(() => import('./components/security/SecurityLogs'));
const HSMManager = lazy(() => import('./components/hsm/HSMManager'));
const FraudDetection = lazy(() => import('./components/fraud/FraudDetection'));

type NavIcon = LucideIcon;

interface NavItemConfig {
    to: string;
    icon: NavIcon;
    label: string;
}

interface NavSectionConfig {
    title: string;
    items: NavItemConfig[];
}

const navSections: NavSectionConfig[] = [
    {
        title: 'Vue globale',
        items: [
            { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/terminals', icon: Terminal, label: 'Terminaux' },
            { to: '/map', icon: Globe, label: 'Carte 3D' }
        ]
    },
    {
        title: 'Sécurité et infra',
        items: [
            { to: '/logs', icon: ShieldAlert, label: 'Logs sécurité' },
            { to: '/hsm', icon: Server, label: 'HSM master' },
            { to: '/fraud', icon: Zap, label: 'Anti-fraude' }
        ]
    },
    {
        title: 'Analytics',
        items: [
            { to: '/analytics', icon: PieChart, label: 'Performance' },
            { to: '/students', icon: Users, label: 'Utilisateurs' }
        ]
    },
    {
        title: 'Technique',
        items: [
            { to: '/debug', icon: FileText, label: 'Outils debug' }
        ]
    }
];

const routeTitles: Record<string, string> = {
    '/': 'Vue globale du système',
    '/map': 'Carte 3D des transactions',
    '/terminals': 'Monitoring des terminaux',
    '/analytics': 'Analytics pédagogiques',
    '/students': 'Suivi des utilisateurs',
    '/logs': 'Logs de sécurité',
    '/hsm': 'Gestion HSM',
    '/debug': 'Outils de débogage',
    '/fraud': 'Détection de fraude'
};

interface NavItemProps extends NavItemConfig {
    onNavigate?: () => void;
}

function NavItem({ to, icon: Icon, label, onNavigate }: NavItemProps) {
    return (
        <NavLink
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
            <span className="nav-icon">
                <Icon size={18} />
            </span>
            <span>{label}</span>
        </NavLink>
    );
}

function HeaderClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    return <span className="header-clock">{now.toLocaleTimeString('fr-FR')}</span>;
}

function App() {
    const location = useLocation();
    const { connected, reconnecting, dataSource, metrics, transactions } = useWebSocket();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    const pageTitle = useMemo(
        () => routeTitles[location.pathname] ?? 'Dashboard monitoring',
        [location.pathname]
    );

    const connectionState = useMemo(() => {
        if (dataSource === 'simulated') {
            return { label: 'Mode simulation', className: 'simulated' };
        }
        if (connected) {
            return { label: 'Connecté', className: 'live' };
        }
        if (reconnecting) {
            return { label: 'Reconnexion...', className: 'reconnecting' };
        }
        return { label: 'Déconnecté', className: 'offline' };
    }, [connected, reconnecting, dataSource]);

    return (
        <div className="app">
            <div
                className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            <div className="main-layout">
                <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                    <div className="sidebar-header">
                        <span className="sidebar-logo">
                            <img src="/monetic-logo.svg" alt="MoneTIC" style={{width: 22, height: 22}} />
                            MoneTIC
                        </span>
                    </div>

                    <nav className="sidebar-nav">
                        {navSections.map((section) => (
                            <div className="nav-section" key={section.title}>
                                <div className="nav-section-title">{section.title}</div>
                                {section.items.map((item) => (
                                    <NavItem
                                        key={item.to}
                                        to={item.to}
                                        icon={item.icon}
                                        label={item.label}
                                        onNavigate={() => setSidebarOpen(false)}
                                    />
                                ))}
                            </div>
                        ))}
                    </nav>

                    <div className="sidebar-footer">
                        <a href={import.meta.env.VITE_PORTAL_URL || 'http://localhost:3000'} className="portal-link">
                            <LayoutDashboard size={16} />
                            <span>Retour portail</span>
                        </a>

                        <div className={`status-indicator connection-badge ${connectionState.className}`}>
                            <span className={`status-dot ${connectionState.className}`} />
                            <span>{connectionState.label}</span>
                        </div>

                        {metrics && (
                            <div className="sidebar-meta">
                                <span>Ping: {metrics.avgLatency?.toFixed(0) || 0}ms</span>
                                <span>Conns: {metrics.activeConnections || 0}</span>
                            </div>
                        )}
                    </div>
                </aside>

                <div className="content-wrapper">
                    <header className="header">
                        <div className="header-left">
                            <button
                                type="button"
                                className="menu-button"
                                onClick={() => setSidebarOpen((prev) => !prev)}
                                aria-label={sidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                            >
                                {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                            </button>
                            <h1 className="header-title">{pageTitle}</h1>
                        </div>

                        <div className="header-status">
                            <HeaderClock />
                            {metrics && (
                                <span className="header-chip">
                                    {metrics.requestsPerSecond?.toFixed(0) || 0} req/s
                                </span>
                            )}
                        </div>
                    </header>

                    <main className="main-content">
                        <Suspense
                            fallback={
                                <div className="loading">
                                    <div className="loading-spinner" />
                                </div>
                            }
                        >
                            <Routes>
                                <Route path="/" element={<Dashboard transactions={transactions} metrics={metrics} />} />
                                <Route path="/map" element={<Dashboard transactions={transactions} metrics={metrics} />} />
                                <Route path="/terminals" element={<Terminals />} />
                                <Route path="/logs" element={<SecurityLogs />} />
                                <Route path="/hsm" element={<HSMManager />} />
                                <Route path="/analytics" element={<Analytics />} />
                                <Route path="/students" element={<Analytics initialTab="students" />} />
                                <Route path="/debug" element={<DebugTools />} />
                                <Route path="/fraud" element={<FraudDetection />} />
                                <Route path="*" element={<Dashboard transactions={transactions} metrics={metrics} />} />
                            </Routes>
                        </Suspense>
                    </main>
                </div>
            </div>
        </div>
    );
}

export default App;
