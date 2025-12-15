'use client';

import { useState, useEffect } from 'react';
import { Match } from '@/domain/entities/Match';

// ============================================================================
// Types
// ============================================================================

interface TwinPersonalityProps {
    twinName: string;
    isActive: boolean;
    latestMatch?: Match | null;
    matchCount?: number;
    isProcessing?: boolean;
}

type TwinMood = 'idle' | 'thinking' | 'excited' | 'success';

// ============================================================================
// Twin Personality Component
// ============================================================================

export function TwinPersonality({
    twinName,
    isActive,
    latestMatch,
    matchCount = 0,
    isProcessing = false,
}: TwinPersonalityProps) {
    const [message, setMessage] = useState<string>('');
    const [mood, setMood] = useState<TwinMood>('idle');
    const [isAnimating, setIsAnimating] = useState(false);

    // Generate dynamic messages based on state
    useEffect(() => {
        if (!isActive) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMessage("I'm resting. Activate me to start finding matches!");
            setMood('idle');
            return;
        }

        if (isProcessing) {
            setMessage('Analyzing profiles... Finding your perfect matches...');
            setMood('thinking');
            setIsAnimating(true);
            return;
        }

        if (latestMatch && latestMatch.score >= 80) {
            const matchName = latestMatch.matchedProfile?.name || 'someone great';
            const interests = latestMatch.sharedInterests?.slice(0, 2).join(' and ') || 'common interests';
            setMessage(`🎯 I found ${matchName} - ${latestMatch.score}% match on ${interests}!`);
            setMood('excited');
            setIsAnimating(true);

            // Reset animation after a bit
            const timer = setTimeout(() => setIsAnimating(false), 3000);
            return () => clearTimeout(timer);
        }

        if (matchCount > 0) {
            setMessage(`I've negotiated ${matchCount} potential matches for you today.`);
            setMood('success');
        } else {
            setMessage("I'm scanning for great matches. Stay tuned!");
            setMood('idle');
        }
    }, [isActive, isProcessing, latestMatch, matchCount]);

    const getMoodEmoji = () => {
        switch (mood) {
            case 'thinking': return '🤔';
            case 'excited': return '✨';
            case 'success': return '😊';
            default: return '💤';
        }
    };

    return (
        <div className={`twin-personality ${mood} ${isAnimating ? 'animating' : ''}`}>
            <div className="twin-avatar">
                <div className="avatar-circle">
                    {twinName.charAt(0).toUpperCase()}
                </div>
                <div className="status-indicator" />
                <span className="mood-emoji">{getMoodEmoji()}</span>
            </div>

            <div className="speech-bubble">
                <div className="bubble-content">
                    {isProcessing && <span className="typing-dots">...</span>}
                    <p>{message}</p>
                </div>
                <div className="bubble-tail" />
            </div>

            <style jsx>{`
                .twin-personality {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    margin-bottom: 1rem;
                }

                .twin-personality.animating {
                    animation: pulse-glow 1.5s ease-in-out;
                }

                @keyframes pulse-glow {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(102, 126, 234, 0);
                    }
                    50% {
                        box-shadow: 0 0 20px 5px rgba(102, 126, 234, 0.3);
                    }
                }

                .twin-avatar {
                    position: relative;
                    flex-shrink: 0;
                }

                .avatar-circle {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: white;
                }

                .status-indicator {
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    border: 2px solid #0a0a0f;
                }

                .twin-personality.idle .status-indicator {
                    background: #6b7280;
                }

                .twin-personality.thinking .status-indicator {
                    background: #fbbf24;
                    animation: blink 1s infinite;
                }

                .twin-personality.excited .status-indicator,
                .twin-personality.success .status-indicator {
                    background: #4ade80;
                }

                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .mood-emoji {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    font-size: 1rem;
                }

                .speech-bubble {
                    position: relative;
                    flex: 1;
                }

                .bubble-content {
                    background: rgba(102, 126, 234, 0.15);
                    border: 1px solid rgba(102, 126, 234, 0.3);
                    border-radius: 12px;
                    padding: 0.75rem 1rem;
                    color: white;
                }

                .bubble-content p {
                    margin: 0;
                    font-size: 0.9rem;
                    line-height: 1.4;
                }

                .bubble-tail {
                    position: absolute;
                    left: -6px;
                    top: 12px;
                    width: 12px;
                    height: 12px;
                    background: rgba(102, 126, 234, 0.15);
                    border-left: 1px solid rgba(102, 126, 234, 0.3);
                    border-bottom: 1px solid rgba(102, 126, 234, 0.3);
                    transform: rotate(45deg);
                }

                .typing-dots {
                    display: inline-block;
                    animation: typing 1.4s infinite;
                    font-weight: bold;
                    margin-right: 0.25rem;
                }

                @keyframes typing {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }

                .twin-personality.excited .bubble-content {
                    background: rgba(74, 222, 128, 0.15);
                    border-color: rgba(74, 222, 128, 0.3);
                }

                .twin-personality.excited .bubble-tail {
                    background: rgba(74, 222, 128, 0.15);
                    border-left-color: rgba(74, 222, 128, 0.3);
                    border-bottom-color: rgba(74, 222, 128, 0.3);
                }
            `}</style>
        </div>
    );
}

// ============================================================================
// Activity Counter Component
// ============================================================================

interface ActivityCounterProps {
    matchesToday: number;
    negotiationsToday: number;
    connectionsTotal: number;
}

export function TwinActivityCounter({
    matchesToday,
    negotiationsToday,
    connectionsTotal,
}: ActivityCounterProps) {
    return (
        <div className="activity-counter">
            <div className="activity-item">
                <span className="count">{matchesToday}</span>
                <span className="label">Matches Today</span>
            </div>
            <div className="divider" />
            <div className="activity-item">
                <span className="count">{negotiationsToday}</span>
                <span className="label">Negotiations</span>
            </div>
            <div className="divider" />
            <div className="activity-item">
                <span className="count">{connectionsTotal}</span>
                <span className="label">Connections</span>
            </div>

            <style jsx>{`
                .activity-counter {
                    display: flex;
                    justify-content: space-around;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    margin-bottom: 1rem;
                }

                .activity-item {
                    text-align: center;
                }

                .count {
                    display: block;
                    font-size: 1.5rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .label {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.6);
                }

                .divider {
                    width: 1px;
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}
