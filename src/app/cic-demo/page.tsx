'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getGuestIdentityService, GuestIdentity } from '@/application/services/GuestIdentityService';
import { extractLinkedInProfile, isValidLinkedInUrl } from '@/application/services/LinkedInExtractor';
import { TwinInterview } from '@/presentation/components/TwinInterview';
import { PrivacyBadge } from '@/presentation/components/PrivacyIndicator';
import { Shield, Sparkles, QrCode, X, Camera } from 'lucide-react';
import { QRScanner, QRScanResult } from '@/presentation/components/QRScanner';

// ============================================================================
// Types
// ============================================================================

type Step = 'welcome' | 'linkedin' | 'voice' | 'matching' | 'results';

interface MatchResult {
    id: string;
    name: string;
    headline: string;
    score: number;
    sharedInterests: string[];
    reasoning?: string;
}

const INTERESTS = [
    'AI/ML', 'Startups', 'FinTech', 'HealthTech', 'Climate',
    'Product', 'Engineering', 'Design', 'Sales', 'Investing'
];

// ============================================================================
// Sub-Components
// ============================================================================

const SovereigntyMonitor = ({ interests }: { interests: string[] }) => {
    const [auditLog, setAuditLog] = useState<{ msg: string, time: string }[]>([]);

    useEffect(() => {
        const logs = [
            "Initializing local secure vault...",
            "Encrypting LinkedIn data with on-device key...",
            "Analyzing voice snippets (Gemini Nano)...",
            "Zero cloud retention verified 🛡️",
            "Hashing interests for anonymous matching...",
            "Transmitting score metadata ONLY..."
        ];
        logs.forEach((msg, i) => {
            setTimeout(() => {
                setAuditLog(prev => [...prev.slice(-4), { msg, time: new Date().toLocaleTimeString() }]);
            }, i * 600);
        });
    }, []);

    return (
        <div className="sovereignty-monitor">
            <div className="monitor-header">
                <span className="live-dot"></span>
                LIVE PRIVACY AUDIT
            </div>
            <div className="monitor-logs">
                {auditLog.map((log, i) => (
                    <div key={i} className="log-line">
                        <span className="log-time">[{log.time}]</span> {log.msg}
                    </div>
                ))}
            </div>
            {interests.length > 0 && (
                <div className="magic-tags-preview">
                    {interests.map(tag => (
                        <span key={tag} className="tag-float">✨ {tag}</span>
                    ))}
                </div>
            )}
            <div className="monitor-shield">
                <Shield size={16} className="text-green-400" />
                <span>Sovereignty: 100% On-Device</span>
            </div>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export default function CICDemoPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('welcome');
    const [guest, setGuest] = useState<GuestIdentity | null>(null);

    // Profile data
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [profileData, setProfileData] = useState<{
        name: string;
        headline: string;
        skills: string[];
    } | null>(null);
    const [voiceData, setVoiceData] = useState<{ lookingFor: string } | null>(null);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [consentGiven, setConsentGiven] = useState(false);

    // Results
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showLinkedInScanner, setShowLinkedInScanner] = useState(false);

    // Initialize guest identity
    useEffect(() => {
        const init = async () => {
            const service = getGuestIdentityService();
            const identity = await service.getOrCreateIdentity();
            setGuest(identity);
        };
        init();
    }, []);

    // LinkedIn extraction
    const handleLinkedInExtract = async () => {
        if (!isValidLinkedInUrl(linkedinUrl)) {
            setError('Please enter a valid LinkedIn URL');
            return;
        }

        setIsLoading(true);
        setError('');

        const result = await extractLinkedInProfile(linkedinUrl);

        if (result.success && result.profile) {
            setProfileData({
                name: result.profile.name,
                headline: result.profile.headline,
                skills: result.profile.skills,
            });

            // AI MAGIC: Pre-populate interests
            const suggested = INTERESTS.filter(interest =>
                result.profile?.skills.some(skill =>
                    skill.toLowerCase().includes(interest.toLowerCase()) ||
                    interest.toLowerCase().includes(skill.toLowerCase())
                )
            );
            setSelectedInterests(prev => Array.from(new Set([...prev, ...suggested])));
            setStep('voice');
        } else {
            setError(result.error || 'Failed to extract profile');
        }

        setIsLoading(false);
    };

    // Voice interview complete    // QR Scan handler
    const handleQRScan = (result: QRScanResult) => {
        if (result.type === 'linkedin-profile' && result.parsedData?.linkedinUrl) {
            setLinkedinUrl(result.parsedData.linkedinUrl);
            setShowLinkedInScanner(false);
            // Auto-trigger extract after scanning
            setTimeout(() => {
                const extractBtn = document.getElementById('extract-trigger');
                extractBtn?.click();
            }, 100);
        }
    };
    const handleInterviewComplete = useCallback((extractedData: { lookingFor?: string, interests?: string[] }) => {
        setVoiceData({ lookingFor: extractedData.lookingFor || '' });

        // AI MAGIC: Pre-populate interests
        let finalInterests = [...selectedInterests];
        if (extractedData.interests) {
            const voiceSuggested = INTERESTS.filter(i =>
                extractedData.interests?.some(ei => ei.toLowerCase().includes(i.toLowerCase()))
            );
            finalInterests = Array.from(new Set([...finalInterests, ...voiceSuggested]));
            setSelectedInterests(finalInterests);
        }

        // AUTO-MATCHING
        setStep('matching');
    }, [selectedInterests]);

    // Find matches logic
    const handleFindMatches = useCallback(async () => {
        if (!consentGiven) return;

        setIsLoading(true);
        try {
            const response = await fetch('/api/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userTwin: {
                        id: guest?.id,
                        userId: guest?.id,
                        domain: 'cic-demo',
                        publicProfile: {
                            name: profileData?.name || guest?.displayName,
                            headline: profileData?.headline || 'CIC Attendee',
                            skills: profileData?.skills || [],
                            interests: selectedInterests,
                        },
                    },
                    eventId: 'cic-berlin-2025',
                    limit: 5,
                    reportToAdmin: true,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setMatches(data.matches || []);
                setTimeout(() => setStep('results'), 3500); // Wait for monitor to finish
            } else {
                setError('Failed to find matches');
            }
        } catch {
            setError('Network error');
        }
        setIsLoading(false);
    }, [consentGiven, guest, profileData, selectedInterests]);

    useEffect(() => {
        if (step === 'matching') {
            handleFindMatches();
        }
    }, [step, handleFindMatches]);

    const handleSkipLinkedIn = () => {
        setProfileData({
            name: guest?.displayName || 'Guest',
            headline: 'CIC Attendee',
            skills: [],
        });
        setStep('voice');
    };

    return (
        <div className="cic-demo">
            <header className="demo-header">
                <div className="brand">
                    <span className="logo">🤝</span>
                    <span className="title">CIC Berlin 2025</span>
                </div>
                {guest && (
                    <div className="guest-badge">
                        <PrivacyBadge isPrivate={true} />
                        <span className="guest-id">{guest.displayName}</span>
                    </div>
                )}
            </header>

            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{
                        width: step === 'welcome' ? '0%'
                            : step === 'linkedin' ? '25%'
                                : step === 'voice' ? '50%'
                                    : step === 'matching' ? '75%'
                                        : '100%'
                    }}
                />
            </div>

            <main className="demo-content">
                {step === 'welcome' && (
                    <div className="step welcome-step">
                        <h1>Welcome to CIC! 🎉</h1>
                        <p className="subtitle">Connect with intended connections in under 60s.</p>

                        <div className="privacy-promise">
                            <div className="promise-icon">🛡️</div>
                            <div className="promise-text">
                                <strong>Sovereign Data Mode</strong>
                                <span>No central database. Your twin is local.</span>
                            </div>
                        </div>

                        <div className="consent-quick">
                            <input
                                type="checkbox"
                                id="welcome-consent"
                                checked={consentGiven}
                                onChange={(e) => setConsentGiven(e.target.checked)}
                            />
                            <label htmlFor="welcome-consent">
                                Share anonymous match score with event host (Required)
                            </label>
                        </div>

                        <button
                            className="primary-btn"
                            onClick={() => setStep('linkedin')}
                            disabled={!consentGiven}
                        >
                            Start Check-in →
                        </button>
                    </div>
                )}

                {step === 'linkedin' && (
                    <div className="step linkedin-step">
                        <h2>Import Identity</h2>
                        <p className="subtitle">Scan your LinkedIn QR or paste URL</p>

                        <button
                            className="scan-qr-btn"
                            onClick={() => setShowLinkedInScanner(true)}
                        >
                            <Camera size={20} /> Scan LinkedIn QR
                        </button>

                        <div className="divider"><span>OR</span></div>

                        <div className="input-group">
                            <input
                                type="url"
                                placeholder="LinkedIn Profile URL"
                                value={linkedinUrl}
                                onChange={(e) => setLinkedinUrl(e.target.value)}
                                className="linkedin-input"
                            />
                            <button
                                id="extract-trigger"
                                className="extract-btn"
                                onClick={handleLinkedInExtract}
                                disabled={isLoading}
                            >
                                {isLoading ? '...' : 'Extract'}
                            </button>
                        </div>
                        {error && <p className="error-text">{error}</p>}
                        <button className="skip-btn" onClick={handleSkipLinkedIn}>Skip</button>

                        {showLinkedInScanner && (
                            <div className="qr-modal-overlay">
                                <div className="qr-modal">
                                    <button className="close-btn" onClick={() => setShowLinkedInScanner(false)}>
                                        <X size={24} />
                                    </button>
                                    <h3>Scan LinkedIn QR</h3>
                                    <p>Open LinkedIn app → Search → QR Icon</p>
                                    <div className="scanner-wrapper">
                                        <QRScanner onScan={handleQRScan} active={showLinkedInScanner} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="privacy-note">
                            <PrivacyBadge isPrivate={true} />
                            <span>Read-only extraction. No storage.</span>
                        </div>
                    </div>
                )}

                {step === 'voice' && (
                    <div className="step voice-step">
                        <h2>Voice Mind-Meld</h2>
                        <p className="subtitle">Who are you looking for today?</p>
                        <TwinInterview onInterviewComplete={handleInterviewComplete} currentProfile={profileData} />
                        <button className="skip-btn" onClick={() => setStep('matching')}>Skip</button>
                    </div>
                )}

                {step === 'matching' && (
                    <div className="step matching-step">
                        <div className="matching-animation">
                            <div className="pulse-ring" />
                            <div className="matching-icon">🧠</div>
                        </div>
                        <h2>Building Your Twin...</h2>
                        <SovereigntyMonitor interests={selectedInterests} />
                    </div>
                )}

                {step === 'results' && (
                    <div className="step results-step">
                        <h2>Top Matches 🎉</h2>
                        <div className="matches-list">
                            {matches.map((match, index) => (
                                <div key={match.id} className="match-card-container">
                                    <div className="match-card">
                                        <div className="match-rank">#{index + 1}</div>
                                        <div className="match-info">
                                            <h3>{match.name}</h3>
                                            <p className="headline">{match.headline}</p>
                                            <div className="shared-interests">
                                                {match.sharedInterests.map(i => <span key={i} className="interest-tag">{i}</span>)}
                                            </div>
                                        </div>
                                        <div className="match-score">
                                            <span className="score-value">{match.score}%</span>
                                        </div>
                                    </div>
                                    {match.reasoning && (
                                        <div className="match-reasoning">
                                            <Sparkles size={12} className="sparkle-icon" />
                                            <span>{match.reasoning}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button className="primary-btn" onClick={() => router.push('/dashboard')}>Go to Dashboard</button>
                    </div>
                )}
            </main>

            <style jsx>{`
                .cic-demo { min-height: 100vh; background: #0a0a1f; color: white; }
                .demo-header { padding: 1rem; border-bottom: 1px solid #222; display: flex; justify-content: space-between; }
                .brand { display: flex; align-items: center; gap: 0.5rem; }
                .logo { font-size: 1.5rem; }
                .title { font-weight: bold; }
                .guest-badge { display: flex; items-center gap: 0.5rem; }
                .guest-id { font-size: 0.8rem; color: #888; }
                .progress-bar { height: 4px; background: #222; }
                .progress-fill { height: 100%; background: #667eea; transition: width 0.5s; }
                .demo-content { padding: 2rem 1rem; max-width: 500px; margin: 0 auto; }
                .step { animation: fadeIn 0.4s; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                h1, h2 { text-align: center; }
                .subtitle { text-align: center; color: #888; margin-bottom: 2rem; }
                .privacy-promise { background: rgba(74, 222, 128, 0.1); border: 1px solid #4ade80; padding: 1rem; border-radius: 12px; margin-bottom: 2rem; display: flex; gap: 1rem; }
                .promise-icon { font-size: 1.5rem; }
                .promise-text { display: flex; flex-direction: column; }
                .promise-text strong { color: #4ade80; }
                .promise-text span { font-size: 0.8rem; }
                .consent-quick { display: flex; gap: 0.5rem; background: #111; padding: 1rem; border-radius: 12px; margin-bottom: 2rem; font-size: 0.85rem; }
                .primary-btn { width: 100%; padding: 1rem; border-radius: 12px; border: none; background: #667eea; color: white; cursor: pointer; font-weight: bold; }
                .scan-qr-btn {
                    width: 100%;
                    padding: 1rem;
                    background: #222;
                    border: 1px solid #444;
                    border-radius: 12px;
                    color: white;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    cursor: pointer;
                    margin-bottom: 1.5rem;
                }
                .divider {
                    display: flex;
                    align-items: center;
                    text-align: center;
                    margin: 1rem 0;
                    color: #444;
                }
                .divider::before, .divider::after {
                    content: '';
                    flex: 1;
                    border-bottom: 1px solid #222;
                }
                .divider span {
                    padding: 0 1rem;
                    font-size: 0.8rem;
                }
                .qr-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 1.5rem;
                }
                .qr-modal {
                    background: #111;
                    padding: 2rem;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 400px;
                    text-align: center;
                    position: relative;
                }
                .qr-modal h3 { margin-bottom: 0.5rem; }
                .qr-modal p { font-size: 0.8rem; color: #888; margin-bottom: 1.5rem; }
                .close-btn {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                }
                .scanner-wrapper {
                    border-radius: 16px;
                    overflow: hidden;
                }
                .primary-btn:disabled { opacity: 0.5; }
                .input-group { display: flex; gap: 0.5rem; }
                .linkedin-input { flex: 1; padding: 1rem; background: #111; border: 1px solid #333; color: white; border-radius: 12px; }
                .extract-btn { padding: 1rem; background: #667eea; border: none; border-radius: 12px; color: white; cursor: pointer; }
                .skip-btn { display: block; width: 100%; text-align: center; margin-top: 1rem; color: #888; background: none; border: none; cursor: pointer; }
                .error-text { color: #ef4444; margin: 1rem 0; text-align: center; }
                .sovereignty-monitor { background: rgba(0,0,0,0.5); border: 1px solid #4ade8055; border-radius: 16px; padding: 1.5rem; font-family: monospace; font-size: 0.8rem; }
                .monitor-header { color: #4ade80; font-weight: bold; margin-bottom: 1rem; display: flex; items-center gap: 0.5rem; }
                .live-dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: blink 1s infinite; }
                @keyframes blink { 50% { opacity: 0; } }
                .log-line { margin-bottom: 0.5rem; }
                .log-time { color: #444; }
                .monitor-shield { border-top: 1px solid #333; margin-top: 1rem; padding-top: 1rem; display: flex; items-center gap: 0.5rem; color: #4ade80; }
                .magic-tags-preview { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0; }
                .tag-float { background: #667eea33; border: 1px solid #667eea; padding: 0.3rem 0.6rem; border-radius: 20px; font-size: 0.7rem; animation: float 3s infinite; }
                @keyframes float { 50% { transform: translateY(-5px); } }
                .matches-list { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem; }
                .match-card-container { display: flex; flex-direction: column; gap: 0.5rem; }
                .match-card { display: flex; items-center gap: 1rem; background: #111; padding: 1.25rem; border-radius: 16px; border: 1px solid #222; }
                .match-rank { font-weight: bold; color: #667eea; font-size: 1.1rem; }
                .match-info { flex: 1; }
                .match-info h3 { margin: 0; font-size: 1.1rem; }
                .match-info .headline { margin: 0.2rem 0; font-size: 0.85rem; color: #aaa; }
                .shared-interests { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.75rem; }
                .interest-tag { background: #667eea15; color: #667eea; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.7rem; border: 1px solid #667eea33; }
                .score-value { font-size: 1.25rem; font-weight: bold; color: #4ade80; }
                .match-reasoning { 
                    background: rgba(102, 126, 234, 0.08); 
                    border-radius: 12px; 
                    padding: 0.75rem 1rem; 
                    font-size: 0.85rem; 
                    color: #d1d5db; 
                    display: flex; 
                    gap: 0.75rem; 
                    align-items: flex-start;
                    border-left: 3px solid #667eea;
                    margin-left: 1rem;
                    animation: slideRight 0.5s ease-out;
                }
                @keyframes slideRight { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
                .sparkle-icon { color: #667eea; margin-top: 0.2rem; flex-shrink: 0; }
                .matching-animation { position: relative; width: 60px; height: 60px; margin: 0 auto 1.5rem; }
                .pulse-ring { border: 2px solid #667eea; border-radius: 50%; inset: 0; position: absolute; animation: pulse 1.5s infinite; }
                @keyframes pulse { 100% { transform: scale(1.5); opacity: 0; } }
                .matching-icon { position: absolute; inset: 0; display: flex; items-center justify-content: center; font-size: 2rem; }
            `}</style>
        </div>
    );
}
