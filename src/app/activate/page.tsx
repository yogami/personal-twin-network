/**
 * /activate - Event Activation Page
 * 
 * Quick onboarding flow when scanning CIC Berlin check-in QR:
 * 1. Pre-fill name/role from CIC data
 * 2. Select 3 interests
 * 3. Create/update twin
 * 4. Auto-join event P2P room
 * 5. Redirect to dashboard
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    parseActivationParams,
    getEventActivationService,
    ActivationParams
} from '@/application/services/EventActivationService';

const INTEREST_OPTIONS = [
    'AI/ML', 'Startups', 'Product', 'Engineering', 'Design',
    'Web3', 'Climate Tech', 'Fintech', 'Health Tech', 'EdTech',
    'Open Source', 'DevTools', 'Leadership', 'Investing', 'Research'
];

function ActivateContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [params, setParams] = useState<ActivationParams>({});
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [isActivating, setIsActivating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const parsed = parseActivationParams(searchParams);
        setParams(parsed);
        if (parsed.attendeeName) setName(parsed.attendeeName);
        if (parsed.attendeeRole) setRole(parsed.attendeeRole);
    }, [searchParams]);

    const toggleInterest = (interest: string) => {
        setSelectedInterests(prev => {
            if (prev.includes(interest)) {
                return prev.filter(i => i !== interest);
            }
            if (prev.length >= 5) return prev; // Max 5 interests
            return [...prev, interest];
        });
    };

    const handleActivate = async () => {
        if (selectedInterests.length < 1) {
            setError('Please select at least 1 interest');
            return;
        }

        setIsActivating(true);
        setError(null);

        try {
            const service = getEventActivationService();
            const result = await service.activate({
                ...params,
                attendeeName: name || params.attendeeName,
                attendeeRole: role || params.attendeeRole,
                interests: selectedInterests,
            });

            if (result.success) {
                // Redirect to dashboard
                router.push('/dashboard?activated=true');
            } else {
                setError(result.error || 'Activation failed');
            }
        } catch (e) {
            setError('Something went wrong. Please try again.');
            console.error(e);
        } finally {
            setIsActivating(false);
        }
    };

    return (
        <main className="activate-page">
            <div className="container">
                <header>
                    <div className="event-badge">
                        {params.eventId || 'CIC Berlin Event'}
                    </div>
                    <h1>Activate Your Digital Twin</h1>
                    <p className="subtitle">30 seconds to unlock AI-powered networking</p>
                </header>

                <form onSubmit={(e) => { e.preventDefault(); handleActivate(); }}>
                    <div className="form-section">
                        <label>Your Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your name"
                            required
                        />
                    </div>

                    <div className="form-section">
                        <label>Your Role</label>
                        <input
                            type="text"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="e.g., Product Manager at TechCorp"
                        />
                    </div>

                    <div className="form-section">
                        <label>
                            Your Interests <span className="hint">({selectedInterests.length}/5)</span>
                        </label>
                        <div className="interests-grid">
                            {INTEREST_OPTIONS.map((interest) => (
                                <button
                                    key={interest}
                                    type="button"
                                    className={`interest-tag ${selectedInterests.includes(interest) ? 'selected' : ''}`}
                                    onClick={() => toggleInterest(interest)}
                                >
                                    {interest}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button
                        type="submit"
                        className="activate-button"
                        disabled={isActivating || selectedInterests.length < 1}
                    >
                        {isActivating ? 'Activating...' : '🚀 Activate & Find Matches'}
                    </button>
                </form>

                <div className="privacy-note">
                    <span className="lock-icon">🔒</span>
                    <p>Your data stays on your device. Only encrypted matches are shared.</p>
                </div>
            </div>

            <style jsx>{`
                .activate-page {
                    min-height: 100vh;
                    background: linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%);
                    color: white;
                    padding: 1rem;
                }
                .container {
                    max-width: 500px;
                    margin: 0 auto;
                }
                header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                .event-badge {
                    display: inline-block;
                    padding: 0.5rem 1rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 20px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                }
                h1 {
                    font-size: 1.75rem;
                    margin-bottom: 0.5rem;
                }
                .subtitle {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.9rem;
                }
                .form-section {
                    margin-bottom: 1.5rem;
                }
                label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                }
                .hint {
                    color: rgba(255, 255, 255, 0.5);
                    font-weight: normal;
                }
                input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    color: white;
                    font-size: 1rem;
                }
                input::placeholder {
                    color: rgba(255, 255, 255, 0.4);
                }
                input:focus {
                    outline: none;
                    border-color: #667eea;
                }
                .interests-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                .interest-tag {
                    padding: 0.5rem 1rem;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    color: white;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .interest-tag:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
                .interest-tag.selected {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-color: transparent;
                }
                .error-message {
                    padding: 0.75rem;
                    background: rgba(248, 113, 113, 0.2);
                    border-radius: 8px;
                    color: #f87171;
                    margin-bottom: 1rem;
                    text-align: center;
                }
                .activate-button {
                    width: 100%;
                    padding: 1rem;
                    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-size: 1.125rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .activate-button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(74, 222, 128, 0.3);
                }
                .activate-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .privacy-note {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-top: 2rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    text-align: center;
                }
                .privacy-note p {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.8rem;
                    margin: 0;
                }
                .lock-icon {
                    font-size: 1.25rem;
                }
            `}</style>
        </main>
    );
}

export default function ActivatePage() {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)',
                color: 'white'
            }}>
                Loading...
            </div>
        }>
            <ActivateContent />
        </Suspense>
    );
}
