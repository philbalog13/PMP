import { useState } from 'react';

export default function App() {
    const [activeTab, setActiveTab] = useState<'wallet' | 'pay' | 'receive'>('wallet');

    return (
        <div className="app" style={styles.app}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.logo}>
                    <div style={styles.logoIcon}>💳</div>
                    <span style={styles.logoText}>PMP Wallet</span>
                </div>
                <div style={styles.headerRight}>
                    <span style={styles.balance}>€ 1,234.56</span>
                </div>
            </header>

            {/* Main Content */}
            <main style={styles.main}>
                {activeTab === 'wallet' && (
                    <div style={styles.content}>
                        {/* Virtual Card Display */}
                        <div style={styles.cardContainer}>
                            <div style={styles.virtualCard}>
                                <div style={styles.cardHeader}>
                                    <span style={styles.cardLabel}>Virtual Card</span>
                                    <span style={styles.cardNetwork}>VISA</span>
                                </div>
                                <div style={styles.cardNumber}>
                                    •••• •••• •••• 4242
                                </div>
                                <div style={styles.cardFooter}>
                                    <div>
                                        <span style={styles.cardMeta}>VALID THRU</span>
                                        <span style={styles.cardValue}>12/28</span>
                                    </div>
                                    <div>
                                        <span style={styles.cardMeta}>HOLDER</span>
                                        <span style={styles.cardValue}>G. BALOG</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div style={styles.actionsGrid}>
                            <button style={styles.actionBtn} onClick={() => setActiveTab('pay')}>
                                <span style={styles.actionIcon}>📤</span>
                                <span>Payer</span>
                            </button>
                            <button style={styles.actionBtn} onClick={() => setActiveTab('receive')}>
                                <span style={styles.actionIcon}>📥</span>
                                <span>Recevoir</span>
                            </button>
                            <button style={styles.actionBtn}>
                                <span style={styles.actionIcon}>📊</span>
                                <span>Historique</span>
                            </button>
                            <button style={styles.actionBtn}>
                                <span style={styles.actionIcon}>⚙️</span>
                                <span>Réglages</span>
                            </button>
                        </div>

                        {/* Recent Transactions */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Transactions Récentes</h3>
                            {[
                                { name: 'Amazon', amount: -49.99, date: 'Aujourd\'hui' },
                                { name: 'Virement reçu', amount: 250.00, date: 'Hier' },
                                { name: 'Uber Eats', amount: -23.50, date: '25 Jan' },
                            ].map((tx, i) => (
                                <div key={i} style={styles.txItem}>
                                    <div style={styles.txLeft}>
                                        <div style={styles.txIcon}>{tx.amount > 0 ? '📥' : '📤'}</div>
                                        <div>
                                            <div style={styles.txName}>{tx.name}</div>
                                            <div style={styles.txDate}>{tx.date}</div>
                                        </div>
                                    </div>
                                    <div style={{
                                        ...styles.txAmount,
                                        color: tx.amount > 0 ? '#22c55e' : '#f8fafc'
                                    }}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} €
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'pay' && (
                    <div style={styles.content}>
                        <button style={styles.backBtn} onClick={() => setActiveTab('wallet')}>← Retour</button>
                        <h2 style={styles.pageTitle}>Scanner pour Payer</h2>
                        <div style={styles.qrPlaceholder}>
                            <span style={{ fontSize: '4rem' }}>📷</span>
                            <p>Scannez un QR code pour payer</p>
                        </div>
                    </div>
                )}

                {activeTab === 'receive' && (
                    <div style={styles.content}>
                        <button style={styles.backBtn} onClick={() => setActiveTab('wallet')}>← Retour</button>
                        <h2 style={styles.pageTitle}>Recevoir un Paiement</h2>
                        <div style={styles.qrPlaceholder}>
                            <div style={styles.qrCode}>📱</div>
                            <p style={{ marginTop: '1rem' }}>Partagez ce QR code pour recevoir</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Nav */}
            <nav style={styles.bottomNav}>
                {[
                    { id: 'wallet', icon: '🏠', label: 'Accueil' },
                    { id: 'pay', icon: '📤', label: 'Payer' },
                    { id: 'receive', icon: '📥', label: 'Recevoir' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        style={{
                            ...styles.navItem,
                            color: activeTab === item.id ? '#3b82f6' : '#64748b'
                        }}
                    >
                        <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                        <span style={{ fontSize: '0.7rem' }}>{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    app: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '480px',
        margin: '0 auto',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 1.5rem',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    logoIcon: {
        fontSize: '1.5rem',
    },
    logoText: {
        fontFamily: 'Outfit, sans-serif',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    headerRight: {},
    balance: {
        fontSize: '1.1rem',
        fontWeight: 600,
        color: '#22c55e',
    },
    main: {
        flex: 1,
        padding: '1.5rem',
        overflowY: 'auto',
        paddingBottom: '100px',
    },
    content: {},
    cardContainer: {
        marginBottom: '1.5rem',
    },
    virtualCard: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)',
        borderRadius: '16px',
        padding: '1.5rem',
        color: 'white',
        boxShadow: '0 20px 50px rgba(59, 130, 246, 0.3)',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '2rem',
    },
    cardLabel: {
        fontSize: '0.75rem',
        opacity: 0.8,
        textTransform: 'uppercase',
        letterSpacing: '1px',
    },
    cardNetwork: {
        fontWeight: 700,
        fontSize: '1.1rem',
    },
    cardNumber: {
        fontSize: '1.4rem',
        fontFamily: 'monospace',
        letterSpacing: '3px',
        marginBottom: '1.5rem',
    },
    cardFooter: {
        display: 'flex',
        gap: '2rem',
    },
    cardMeta: {
        display: 'block',
        fontSize: '0.6rem',
        opacity: 0.7,
        marginBottom: '0.25rem',
    },
    cardValue: {
        fontSize: '0.875rem',
        fontWeight: 600,
    },
    actionsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.75rem',
        marginBottom: '2rem',
    },
    actionBtn: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '1rem 0.5rem',
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: '#f8fafc',
        fontSize: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    actionIcon: {
        fontSize: '1.5rem',
    },
    section: {
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '16px',
        padding: '1rem',
        border: '1px solid rgba(255,255,255,0.05)',
    },
    sectionTitle: {
        fontSize: '0.875rem',
        fontWeight: 600,
        color: '#94a3b8',
        marginBottom: '1rem',
    },
    txItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
    },
    txLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    txIcon: {
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: 'rgba(59, 130, 246, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    txName: {
        fontWeight: 500,
    },
    txDate: {
        fontSize: '0.75rem',
        color: '#64748b',
    },
    txAmount: {
        fontWeight: 600,
        fontFamily: 'monospace',
    },
    bottomNav: {
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0.75rem 0',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
    },
    navItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        transition: 'color 0.2s',
    },
    backBtn: {
        background: 'none',
        border: 'none',
        color: '#3b82f6',
        fontSize: '0.875rem',
        cursor: 'pointer',
        marginBottom: '1rem',
    },
    pageTitle: {
        fontSize: '1.5rem',
        fontWeight: 600,
        marginBottom: '1.5rem',
        fontFamily: 'Outfit, sans-serif',
    },
    qrPlaceholder: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '300px',
        background: 'rgba(30, 41, 59, 0.6)',
        borderRadius: '16px',
        border: '2px dashed rgba(255,255,255,0.1)',
        color: '#64748b',
    },
    qrCode: {
        fontSize: '6rem',
    },
};
