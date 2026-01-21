'use client';

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface AdminMatch {
    id: string;
    timestamp: Date;
    user1: { id: string; name: string; headline: string };
    user2: { id: string; name: string; headline: string };
    score: number;
    sharedInterests: string[];
}

interface AdminStats {
    totalUsers: number;
    totalMatches: number;
    matches: AdminMatch[];
}

// ============================================================================
// Admin Dashboard
// ============================================================================

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showJoinQR, setShowJoinQR] = useState(false);

    const ADMIN_PIN = 'CIC2025';

    // Authenticate
    const handleLogin = () => {
        if (pin === ADMIN_PIN) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Invalid PIN');
        }
    };

    // Fetch matches
    const fetchMatches = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/matches');
            const data = await response.json();
            if (data.success) {
                setStats(data);
            }
        } catch {
            console.error('Failed to fetch matches');
        }
        setIsLoading(false);
    }, []);

    // Auto-refresh
    useEffect(() => {
        if (isAuthenticated) {
            fetchMatches();
            const interval = setInterval(fetchMatches, 5000); // Refresh every 5s
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, fetchMatches]);

    // Seed demo data
    const handleSeed = async () => {
        await fetch('/api/admin/seed', { method: 'POST' });
        await fetchMatches();
    };

    // Format time
    const formatTime = (timestamp: Date | string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // ========================================================================
    // Render
    // ========================================================================

    if (!isAuthenticated) {
        return (
            <div className="admin-login">
                <div className="login-card">
                    <h1>🔐 CIC Admin Dashboard</h1>
                    <p>Enter PIN to access match analytics</p>

                    <input
                        type="password"
                        placeholder="Enter PIN"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        className="pin-input"
                    />

                    {error && <p className="error">{error}</p>}

                    <button onClick={handleLogin} className="login-btn">
                        Access Dashboard
                    </button>
                </div>

                <style jsx>{`
                    .admin-login {
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(135deg, #0a0a1f 0%, #1a1a3e 100%);
                    }

                    .login-card {
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 24px;
                        padding: 3rem;
                        text-align: center;
                        color: white;
                        max-width: 400px;
                    }

                    h1 {
                        margin-bottom: 0.5rem;
                    }

                    p {
                        color: rgba(255, 255, 255, 0.6);
                        margin-bottom: 2rem;
                    }

                    .pin-input {
                        width: 100%;
                        padding: 1rem;
                        border-radius: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        background: rgba(255, 255, 255, 0.05);
                        color: white;
                        font-size: 1.5rem;
                        text-align: center;
                        letter-spacing: 0.5rem;
                        margin-bottom: 1rem;
                    }

                    .error {
                        color: #ef4444;
                        margin-bottom: 1rem;
                    }

                    .login-btn {
                        width: 100%;
                        padding: 1rem;
                        border-radius: 12px;
                        border: none;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            {/* Header */}
            <header className="admin-header">
                <div className="header-left">
                    <h1>🤝 CIC Berlin 2025</h1>
                    <span className="live-badge">● LIVE</span>
                </div>
                <div className="header-right">
                    <button onClick={() => setShowJoinQR(true)} className="qr-btn">
                        <QrCode size={18} /> Presentation QR
                    </button>
                    <button onClick={handleSeed} className="seed-btn">
                        🌱 Seed Demo Data
                    </button>
                    <button onClick={fetchMatches} className="refresh-btn">
                        🔄 Refresh
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card users">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                        <p className="stat-value">{stats?.totalUsers || 0}</p>
                        <p className="stat-label">Active Users</p>
                    </div>
                </div>
                <div className="stat-card matches">
                    <div className="stat-icon">🔗</div>
                    <div className="stat-info">
                        <p className="stat-value">{stats?.totalMatches || 0}</p>
                        <p className="stat-label">Matches Made</p>
                    </div>
                </div>
                <div className="stat-card privacy">
                    <div className="stat-icon">🔒</div>
                    <div className="stat-info">
                        <p className="stat-value">100%</p>
                        <p className="stat-label">Privacy Compliant</p>
                    </div>
                </div>
            </div>

            {/* Match Feed */}
            <div className="match-feed">
                <h2>Live Match Feed</h2>

                {isLoading && <p className="loading">Loading...</p>}

                {stats?.matches.length === 0 && (
                    <div className="empty-state">
                        <p>No matches yet. Waiting for users to connect...</p>
                    </div>
                )}

                <div className="matches-list">
                    {stats?.matches.slice().reverse().map((match) => (
                        <div key={match.id} className="match-row">
                            <div className="match-time">
                                {formatTime(match.timestamp)}
                            </div>
                            <div className="match-users">
                                <span className="user-name">{match.user1.name}</span>
                                <span className="match-connector">↔</span>
                                <span className="user-name">{match.user2.name}</span>
                            </div>
                            <div className="match-score">
                                <span className="score-badge">{match.score}%</span>
                            </div>
                            <div className="match-interests">
                                {match.sharedInterests.map((interest) => (
                                    <span key={interest} className="interest-chip">
                                        {interest}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Privacy Notice */}
            <div className="privacy-notice">
                <span>🇪🇺</span>
                <p>
                    <strong>GDPR Compliant</strong> — Only anonymized match data shown.
                    Full profiles remain on user devices.
                </p>
            </div>

            {/* Join QR Modal */}
            {showJoinQR && (
                <div className="qr-modal-overlay" onClick={() => setShowJoinQR(false)}>
                    <div className="qr-modal" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setShowJoinQR(false)}>
                            <X size={24} />
                        </button>
                        <h2>Scan to Join CIC Demo</h2>
                        <div className="qr-container">
                            <QRCodeSVG
                                value="https://personal-twin-network-production.up.railway.app/cic-demo"
                                size={400}
                                level="H"
                                includeMargin={true}
                                imageSettings={{
                                    src: "https://cic-berlin.de/wp-content/uploads/2021/03/CIC_Logo_Square_RGB.png",
                                    x: undefined,
                                    y: undefined,
                                    height: 40,
                                    width: 40,
                                    excavate: true,
                                }}
                            />
                        </div>
                        <p className="qr-url">personal-twin-network-production.up.railway.app/cic-demo</p>
                    </div>
                </div>
            )}

            <style jsx>{`
                .qr-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-blur: 10px;
                }
                .qr-modal {
                    background: white;
                    padding: 3rem;
                    border-radius: 32px;
                    text-align: center;
                    color: #0a0a1f;
                    position: relative;
                }
                .close-btn {
                    position: absolute;
                    top: 1rem;
                    right: 1.5rem;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #0a0a1f;
                }
                .qr-container {
                    margin: 2rem 0;
                    padding: 1rem;
                    background: white;
                    border-radius: 12px;
                }
                .qr-url {
                    font-family: monospace;
                    font-weight: bold;
                    color: #667eea;
                }
                .qr-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .admin-dashboard {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #0a0a1f 0%, #1a1a3e 100%);
                    color: white;
                    padding: 2rem;
                }

                .admin-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                h1 {
                    margin: 0;
                    font-size: 1.75rem;
                }

                .live-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.25rem 0.75rem;
                    background: rgba(74, 222, 128, 0.2);
                    color: #4ade80;
                    border-radius: 50px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }

                .header-right {
                    display: flex;
                    gap: 1rem;
                }

                .seed-btn, .refresh-btn {
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    background: transparent;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .seed-btn:hover, .refresh-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1.5rem;
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .stat-card.users {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(102, 126, 234, 0.05));
                }

                .stat-card.matches {
                    background: linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(74, 222, 128, 0.05));
                }

                .stat-card.privacy {
                    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.05));
                }

                .stat-icon {
                    font-size: 2.5rem;
                }

                .stat-value {
                    font-size: 2rem;
                    font-weight: 700;
                    margin: 0;
                }

                .stat-label {
                    margin: 0;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.9rem;
                }

                .match-feed {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 1.5rem;
                    margin-bottom: 2rem;
                }

                .match-feed h2 {
                    margin: 0 0 1rem;
                    font-size: 1.25rem;
                }

                .loading {
                    text-align: center;
                    color: rgba(255, 255, 255, 0.5);
                }

                .empty-state {
                    text-align: center;
                    padding: 3rem;
                    color: rgba(255, 255, 255, 0.5);
                }

                .matches-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .match-row {
                    display: grid;
                    grid-template-columns: 100px 1fr 80px 200px;
                    gap: 1rem;
                    align-items: center;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 8px;
                    animation: slideIn 0.3s ease;
                }

                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(-10px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                .match-time {
                    font-family: monospace;
                    color: rgba(255, 255, 255, 0.5);
                }

                .match-users {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .user-name {
                    font-weight: 500;
                }

                .match-connector {
                    color: #667eea;
                    font-weight: bold;
                }

                .score-badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    background: rgba(74, 222, 128, 0.2);
                    color: #4ade80;
                    border-radius: 50px;
                    font-weight: 600;
                }

                .match-interests {
                    display: flex;
                    gap: 0.25rem;
                }

                .interest-chip {
                    padding: 0.125rem 0.5rem;
                    background: rgba(102, 126, 234, 0.2);
                    color: #667eea;
                    border-radius: 4px;
                    font-size: 0.75rem;
                }

                .privacy-notice {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .privacy-notice span {
                    font-size: 1.5rem;
                }

                .privacy-notice p {
                    margin: 0;
                    font-size: 0.85rem;
                    color: rgba(255, 255, 255, 0.7);
                }
            `}</style>
        </div>
    );
}
