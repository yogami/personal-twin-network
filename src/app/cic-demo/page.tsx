'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getGuestIdentityService, GuestIdentity } from '@/application/services/GuestIdentityService';
import { extractLinkedInProfile, isValidLinkedInUrl } from '@/application/services/LinkedInExtractor';
import { TwinInterview } from '@/presentation/components/TwinInterview';
import { PrivacyBadge, PrivacyCockpit } from '@/presentation/components/PrivacyIndicator';

// ============================================================================
// Types
// ============================================================================

type Step = 'welcome' | 'linkedin' | 'voice' | 'interests' | 'consent' | 'matching' | 'results';

interface MatchResult {
    id: string;
    name: string;
    headline: string;
    score: number;
    sharedInterests: string[];
}

const INTERESTS = [
    'AI/ML', 'Startups', 'FinTech', 'HealthTech', 'Climate',
    'Product', 'Engineering', 'Design', 'Sales', 'Investing'
];

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
            setStep('voice');
        } else {
            setError(result.error || 'Failed to extract profile');
        }

        setIsLoading(false);
    };

    // Voice interview complete
    const handleInterviewComplete = useCallback((extractedData: { lookingFor?: string }) => {
        setVoiceData({ lookingFor: extractedData.lookingFor || '' });
        setStep('interests');
    }, []);

    // Interest toggle
    const toggleInterest = (interest: string) => {
        setSelectedInterests(prev =>
            prev.includes(interest)
                ? prev.filter(i => i !== interest)
                : [...prev, interest]
        );
    };

    // Find matches
    const handleFindMatches = async () => {
        if (!consentGiven) return;

        setStep('matching');
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
                    reportToAdmin: consentGiven,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setMatches(data.matches || []);
                // Artificial delay for matching animation "theater"
                setTimeout(() => {
                    setStep('results');
                }, 1500);
            } else {
                setError('Failed to find matches');
                setStep('consent');
            }
        } catch {
            setError('Network error');
            setStep('consent');
        }

        setIsLoading(false);
    };

    // Skip LinkedIn
    const handleSkipLinkedIn = () => {
        setProfileData({
            name: guest?.displayName || 'Guest',
            headline: 'CIC Attendee',
            skills: [],
        });
        setStep('voice');
    };

    // ========================================================================
    // Render
    // ========================================================================

    return (
        <div className="cic-demo">
            {/* Header */}
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

            {/* Progress */}
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{
                        width: step === 'welcome' ? '0%'
                            : step === 'linkedin' ? '16%'
                                : step === 'voice' ? '33%'
                                    : step === 'interests' ? '50%'
                                        : step === 'consent' ? '66%'
                                            : step === 'matching' ? '83%'
                                                : '100%'
                    }}
                />
            </div>

            {/* Content */}
            <main className="demo-content">
                {/* Welcome Step */}
                {step === 'welcome' && (
                    <div className="step welcome-step">
                        <h1>Welcome to CIC! 🎉</h1>
                        <p className="subtitle">
                            Let&apos;s find you the perfect connections in under 60 seconds.
                        </p>

                        <div className="privacy-promise">
                            <div className="promise-icon">🔒</div>
                            <div className="promise-text">
                                <strong>Privacy First</strong>
                                <span>Your data stays on your phone. Always.</span>
                            </div>
                        </div>

                        <button
                            className="primary-btn"
                            onClick={() => setStep('linkedin')}
                        >
                            Get Started →
                        </button>
                    </div>
                )}

                {/* LinkedIn Step */}
                {step === 'linkedin' && (
                    <div className="step linkedin-step">
                        <h2>Import Your Profile</h2>
                        <p className="subtitle">
                            Paste your LinkedIn URL to auto-fill your expertise
                        </p>

                        <div className="input-group">
                            <input
                                type="url"
                                placeholder="https://linkedin.com/in/your-profile"
                                value={linkedinUrl}
                                onChange={(e) => setLinkedinUrl(e.target.value)}
                                className="linkedin-input"
                            />
                            <button
                                className="extract-btn"
                                onClick={handleLinkedInExtract}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Extracting...' : 'Extract'}
                            </button>
                        </div>

                        {error && <p className="error-text">{error}</p>}

                        <button
                            className="skip-btn"
                            onClick={handleSkipLinkedIn}
                        >
                            Skip, I&apos;ll fill in manually
                        </button>

                        <div className="privacy-note">
                            <PrivacyBadge isPrivate={true} />
                            <span>Extracted data is stored only on your device</span>
                        </div>
                    </div>
                )}

                {/* Voice Step */}
                {step === 'voice' && (
                    <div className="step voice-step">
                        <h2>Quick Voice Check-in</h2>
                        <p className="subtitle">
                            Tell us what you&apos;re looking for at CIC today
                        </p>

                        <TwinInterview
                            onInterviewComplete={handleInterviewComplete}
                            currentProfile={profileData}
                        />

                        <button
                            className="skip-btn"
                            onClick={() => {
                                setVoiceData({ lookingFor: 'Networking' });
                                setStep('interests');
                            }}
                        >
                            Skip voice, continue →
                        </button>
                    </div>
                )}

                {/* Interests Step */}
                {step === 'interests' && (
                    <div className="step interests-step">
                        <h2>What are you into?</h2>
                        <p className="subtitle">
                            Select topics you want to connect over
                        </p>

                        <div className="interests-grid">
                            {INTERESTS.map((interest) => (
                                <button
                                    key={interest}
                                    className={`interest-chip ${selectedInterests.includes(interest) ? 'selected' : ''}`}
                                    onClick={() => toggleInterest(interest)}
                                >
                                    {interest}
                                </button>
                            ))}
                        </div>

                        <button
                            className="primary-btn"
                            onClick={() => setStep('consent')}
                            disabled={selectedInterests.length === 0}
                        >
                            Continue →
                        </button>
                    </div>
                )}

                {/* Consent Step */}
                {step === 'consent' && (
                    <div className="step consent-step">
                        <h2>Almost there! 🎯</h2>

                        <PrivacyCockpit
                            localItemsCount={3}
                            sharedItemsCount={consentGiven ? 1 : 0}
                        />

                        <div className="consent-checkbox">
                            <input
                                type="checkbox"
                                id="consent"
                                checked={consentGiven}
                                onChange={(e) => setConsentGiven(e.target.checked)}
                            />
                            <label htmlFor="consent">
                                I agree to share my match results with CIC event organizers
                                <span className="consent-detail">
                                    (Only your name, headline, and match score — not your full profile)
                                </span>
                            </label>
                        </div>

                        {error && <p className="error-text">{error}</p>}

                        <button
                            className="primary-btn find-matches"
                            onClick={handleFindMatches}
                            disabled={!consentGiven}
                        >
                            🔍 Find My Matches
                        </button>
                    </div>
                )}

                {/* Matching Step */}
                {step === 'matching' && (
                    <div className="step matching-step">
                        <div className="matching-animation">
                            <div className="pulse-ring" />
                            <div className="matching-icon">🔮</div>
                        </div>
                        <h2>Finding your perfect matches...</h2>
                        <p className="subtitle">Analyzing profiles with AI</p>
                    </div>
                )}

                {/* Results Step */}
                {step === 'results' && (
                    <div className="step results-step">
                        <h2>Your Top Matches 🎉</h2>
                        <p className="subtitle">
                            {matches.length} people you should meet at CIC
                        </p>

                        <div className="matches-list">
                            {matches.map((match, index) => (
                                <div key={match.id} className="match-card">
                                    <div className="match-rank">#{index + 1}</div>
                                    <div className="match-info">
                                        <h3>{match.name}</h3>
                                        <p>{match.headline}</p>
                                        <div className="shared-interests">
                                            {match.sharedInterests.map((interest) => (
                                                <span key={interest} className="interest-tag">
                                                    {interest}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="match-score">
                                        <span className="score-value">{match.score}%</span>
                                        <span className="score-label">Match</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            className="primary-btn"
                            onClick={() => router.push('/dashboard')}
                        >
                            View Full Dashboard →
                        </button>
                    </div>
                )}
            </main>

            {/* Styles */}
            <style jsx>{`
                .cic-demo {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #0a0a1f 0%, #1a1a3e 50%, #0f0f2a 100%);
                    color: white;
                }

                .demo-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .brand {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .logo {
                    font-size: 1.5rem;
                }

                .title {
                    font-weight: 700;
                    font-size: 1.1rem;
                }

                .guest-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .guest-id {
                    font-size: 0.85rem;
                    color: rgba(255, 255, 255, 0.7);
                }

                .progress-bar {
                    height: 4px;
                    background: rgba(255, 255, 255, 0.1);
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #667eea, #764ba2);
                    transition: width 0.3s ease;
                }

                .demo-content {
                    padding: 2rem 1.5rem;
                    max-width: 500px;
                    margin: 0 auto;
                }

                .step {
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                h1, h2 {
                    text-align: center;
                    margin-bottom: 0.5rem;
                }

                h1 { font-size: 2rem; }
                h2 { font-size: 1.5rem; }

                .subtitle {
                    text-align: center;
                    color: rgba(255, 255, 255, 0.6);
                    margin-bottom: 2rem;
                }

                .privacy-promise {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    background: rgba(74, 222, 128, 0.1);
                    border: 1px solid rgba(74, 222, 128, 0.2);
                    border-radius: 12px;
                    padding: 1rem;
                    margin-bottom: 2rem;
                }

                .promise-icon {
                    font-size: 2rem;
                }

                .promise-text {
                    display: flex;
                    flex-direction: column;
                }

                .promise-text strong {
                    color: #4ade80;
                }

                .promise-text span {
                    font-size: 0.85rem;
                    color: rgba(255, 255, 255, 0.6);
                }

                .primary-btn {
                    width: 100%;
                    padding: 1rem;
                    border-radius: 12px;
                    border: none;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    font-size: 1.1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .primary-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
                }

                .primary-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .input-group {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }

                .linkedin-input {
                    flex: 1;
                    padding: 1rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    background: rgba(255, 255, 255, 0.05);
                    color: white;
                    font-size: 1rem;
                }

                .extract-btn {
                    padding: 1rem 1.5rem;
                    border-radius: 12px;
                    border: none;
                    background: #667eea;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                }

                .skip-btn {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.5);
                    text-decoration: underline;
                    cursor: pointer;
                    margin-top: 1rem;
                    display: block;
                    width: 100%;
                    text-align: center;
                }

                .privacy-note {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-top: 2rem;
                    font-size: 0.8rem;
                    color: rgba(255, 255, 255, 0.5);
                }

                .error-text {
                    color: #ef4444;
                    text-align: center;
                    margin: 1rem 0;
                }

                .interests-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    justify-content: center;
                    margin-bottom: 2rem;
                }

                .interest-chip {
                    padding: 0.75rem 1.25rem;
                    border-radius: 50px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    background: transparent;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .interest-chip.selected {
                    background: #667eea;
                    border-color: #667eea;
                }

                .consent-checkbox {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    margin: 1.5rem 0;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 12px;
                }

                .consent-checkbox input {
                    width: 20px;
                    height: 20px;
                    margin-top: 2px;
                }

                .consent-checkbox label {
                    font-size: 0.9rem;
                    line-height: 1.4;
                }

                .consent-detail {
                    display: block;
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.5);
                    margin-top: 0.25rem;
                }

                .find-matches {
                    margin-top: 1rem;
                }

                .matching-step {
                    text-align: center;
                    padding-top: 4rem;
                }

                .matching-animation {
                    position: relative;
                    width: 100px;
                    height: 100px;
                    margin: 0 auto 2rem;
                }

                .pulse-ring {
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    border: 2px solid #667eea;
                    animation: pulse 1.5s infinite;
                }

                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(1.5); opacity: 0; }
                }

                .matching-icon {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 3rem;
                }

                .matches-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .match-card {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .match-rank {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #667eea;
                }

                .match-info {
                    flex: 1;
                }

                .match-info h3 {
                    text-align: left;
                    margin: 0;
                    font-size: 1rem;
                }

                .match-info p {
                    margin: 0.25rem 0;
                    font-size: 0.8rem;
                    color: rgba(255, 255, 255, 0.6);
                }

                .shared-interests {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.25rem;
                    margin-top: 0.5rem;
                }

                .interest-tag {
                    padding: 0.125rem 0.5rem;
                    background: rgba(102, 126, 234, 0.2);
                    color: #667eea;
                    border-radius: 4px;
                    font-size: 0.7rem;
                }

                .match-score {
                    text-align: center;
                }

                .score-value {
                    display: block;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #4ade80;
                }

                .score-label {
                    font-size: 0.7rem;
                    color: rgba(255, 255, 255, 0.5);
                }
            `}</style>
        </div>
    );
}
