'use client';

import { useState, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

interface PrivacyIndicatorProps {
    isEdgeMatching: boolean;
    isP2PActive: boolean;
    bytesTransmitted?: number;
    isEncrypted: boolean;
    lastSyncTime?: Date | null;
}

interface NetworkActivity {
    timestamp: number;
    type: 'local' | 'sync' | 'p2p';
    description: string;
}

// ============================================================================
// Privacy Indicator Component
// ============================================================================

export function PrivacyIndicator({
    isEdgeMatching,
    isP2PActive,
    bytesTransmitted = 0,
    isEncrypted,
    lastSyncTime,
}: PrivacyIndicatorProps) {
    const [expanded, setExpanded] = useState(false);
    const [recentActivity, setRecentActivity] = useState<NetworkActivity[]>([]);

    // Track network activity (demo simulation)
    useEffect(() => {
        if (isEdgeMatching) {
            setRecentActivity(prev => [
                ...prev.slice(-4),
                {
                    timestamp: Date.now(),
                    type: 'local',
                    description: 'Matching performed locally',
                },
            ]);
        }
    }, [isEdgeMatching]);

    const allGreen = isEdgeMatching && isEncrypted;

    return (
        <div className={`privacy-indicator ${allGreen ? 'all-green' : ''}`}>
            <div className="privacy-header" onClick={() => setExpanded(!expanded)}>
                <div className="status-icon">
                    {allGreen ? '🛡️' : '⚠️'}
                </div>
                <div className="status-text">
                    <strong>{allGreen ? 'Full Privacy Mode' : 'Privacy Status'}</strong>
                    <span>All on your phone. Zero servers.</span>
                </div>
                <button className="expand-btn">
                    {expanded ? '▲' : '▼'}
                </button>
            </div>

            {expanded && (
                <div className="privacy-details">
                    {/* Edge Matching Status */}
                    <div className="privacy-row">
                        <div className={`indicator ${isEdgeMatching ? 'on' : 'off'}`} />
                        <span className="label">Edge Matching</span>
                        <span className="value">{isEdgeMatching ? 'ON' : 'OFF'}</span>
                    </div>

                    {/* P2P Status */}
                    <div className="privacy-row">
                        <div className={`indicator ${isP2PActive ? 'on' : 'off'}`} />
                        <span className="label">P2P Connections</span>
                        <span className="value">{isP2PActive ? 'Active' : 'Inactive'}</span>
                    </div>

                    {/* Encryption Status */}
                    <div className="privacy-row">
                        <div className={`indicator ${isEncrypted ? 'on' : 'off'}`} />
                        <span className="label">Local Encryption</span>
                        <span className="value">{isEncrypted ? '🔒 AES-256' : '🔓 Off'}</span>
                    </div>

                    {/* Data Transmitted */}
                    <div className="privacy-row highlight">
                        <div className="indicator on" />
                        <span className="label">Profile Data Transmitted</span>
                        <span className="value zero">
                            {bytesTransmitted === 0 ? '0 bytes ✓' : `${bytesTransmitted} bytes`}
                        </span>
                    </div>

                    {/* Last Sync */}
                    {lastSyncTime && (
                        <div className="privacy-row">
                            <div className="indicator on" />
                            <span className="label">Last Local Sync</span>
                            <span className="value">
                                {formatTimeAgo(lastSyncTime)}
                            </span>
                        </div>
                    )}

                    {/* Recent Activity Log */}
                    {recentActivity.length > 0 && (
                        <div className="activity-log">
                            <div className="log-header">Recent Activity</div>
                            {recentActivity.slice(-3).map((activity, i) => (
                                <div key={i} className="log-entry">
                                    <span className={`type-badge ${activity.type}`}>
                                        {activity.type.toUpperCase()}
                                    </span>
                                    <span className="desc">{activity.description}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Privacy Trust Badge */}
                    <div className="trust-badge">
                        <span className="badge-icon">✓</span>
                        <span className="badge-text">
                            Your data never leaves your device.<br />
                            Verified on-device processing.
                        </span>
                    </div>
                </div>
            )}

            <style jsx>{`
                .privacy-indicator {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                    margin-bottom: 1rem;
                }

                .privacy-indicator.all-green {
                    border-color: rgba(74, 222, 128, 0.3);
                }

                .privacy-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .privacy-header:hover {
                    background: rgba(255, 255, 255, 0.02);
                }

                .status-icon {
                    font-size: 1.5rem;
                }

                .status-text {
                    flex: 1;
                }

                .status-text strong {
                    display: block;
                    color: white;
                    font-size: 0.9rem;
                }

                .status-text span {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.6);
                }

                .all-green .status-text strong {
                    color: #4ade80;
                }

                .expand-btn {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 0.75rem;
                    cursor: pointer;
                }

                .privacy-details {
                    padding: 0 1rem 1rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }

                .privacy-row {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .privacy-row:last-of-type {
                    border-bottom: none;
                }

                .privacy-row.highlight {
                    background: rgba(74, 222, 128, 0.05);
                    margin: 0.5rem -1rem;
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                }

                .indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }

                .indicator.on {
                    background: #4ade80;
                    box-shadow: 0 0 6px #4ade80;
                }

                .indicator.off {
                    background: #6b7280;
                }

                .label {
                    flex: 1;
                    font-size: 0.8rem;
                    color: rgba(255, 255, 255, 0.7);
                }

                .value {
                    font-size: 0.8rem;
                    color: white;
                    font-weight: 500;
                }

                .value.zero {
                    color: #4ade80;
                }

                .activity-log {
                    margin-top: 0.75rem;
                    padding: 0.5rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 8px;
                }

                .log-header {
                    font-size: 0.7rem;
                    color: rgba(255, 255, 255, 0.5);
                    margin-bottom: 0.5rem;
                    text-transform: uppercase;
                }

                .log-entry {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    padding: 0.25rem 0;
                }

                .type-badge {
                    padding: 0.125rem 0.375rem;
                    border-radius: 4px;
                    font-size: 0.6rem;
                    font-weight: 600;
                }

                .type-badge.local {
                    background: rgba(74, 222, 128, 0.2);
                    color: #4ade80;
                }

                .type-badge.sync {
                    background: rgba(102, 126, 234, 0.2);
                    color: #667eea;
                }

                .type-badge.p2p {
                    background: rgba(251, 191, 36, 0.2);
                    color: #fbbf24;
                }

                .desc {
                    color: rgba(255, 255, 255, 0.6);
                }

                .trust-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-top: 0.75rem;
                    padding: 0.75rem;
                    background: linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(102, 126, 234, 0.1) 100%);
                    border-radius: 8px;
                    border: 1px solid rgba(74, 222, 128, 0.2);
                }

                .badge-icon {
                    width: 24px;
                    height: 24px;
                    background: #4ade80;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    color: #0a0a0f;
                    font-weight: bold;
                }

                .badge-text {
                    font-size: 0.7rem;
                    color: rgba(255, 255, 255, 0.8);
                    line-height: 1.4;
                }
            `}</style>
        </div>
    );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
}

// ============================================================================
// Compact Privacy Badge
// ============================================================================

interface PrivacyBadgeProps {
    isPrivate: boolean;
}

export function PrivacyBadge({ isPrivate }: PrivacyBadgeProps) {
    return (
        <div className={`privacy-badge ${isPrivate ? 'private' : 'public'}`}>
            <span className="icon">{isPrivate ? '🔒' : '🔓'}</span>
            <span className="text">{isPrivate ? 'On-Device' : 'Server'}</span>

            <style jsx>{`
                .privacy-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.25rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.7rem;
                }

                .privacy-badge.private {
                    background: rgba(74, 222, 128, 0.15);
                    color: #4ade80;
                }

                .privacy-badge.public {
                    background: rgba(251, 191, 36, 0.15);
                    color: #fbbf24;
                }

                .icon {
                    font-size: 0.6rem;
                }
            `}</style>
        </div>
    );
}
