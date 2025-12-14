'use client';

import { Twin } from '@/domain/entities/Twin';

interface TwinStatusCardProps {
    twin: Twin | null;
    onDeactivate?: () => void;
}

/**
 * TwinStatusCard - Shows current twin status on dashboard
 */
export function TwinStatusCard({ twin, onDeactivate }: TwinStatusCardProps) {
    if (!twin) {
        return (
            <div className="twin-status-card inactive">
                <div className="status-icon">👤</div>
                <div className="status-content">
                    <h3>No Twin Active</h3>
                    <p>Create your digital twin to start matching</p>
                </div>
                <style jsx>{cardStyles}</style>
            </div>
        );
    }

    return (
        <div className="twin-status-card active">
            <div className="status-indicator">
                <span className="pulse" />
                <span>Active</span>
            </div>

            <div className="twin-avatar">
                {twin.publicProfile.name.charAt(0)}
            </div>

            <div className="twin-info">
                <h3>{twin.publicProfile.name}</h3>
                <p className="headline">{twin.publicProfile.headline}</p>

                {twin.publicProfile.skills.length > 0 && (
                    <div className="skills">
                        {twin.publicProfile.skills.slice(0, 4).map((skill, i) => (
                            <span key={i} className="skill-tag">{skill}</span>
                        ))}
                    </div>
                )}
            </div>

            <div className="twin-domain">
                {getDomainBadge(twin.domain)}
            </div>

            {onDeactivate && (
                <button onClick={onDeactivate} className="deactivate-btn">
                    Deactivate Twin
                </button>
            )}

            <style jsx>{cardStyles}</style>
        </div>
    );
}

const cardStyles = `
  .twin-status-card {
    position: relative;
    padding: 1.5rem;
    border-radius: 16px;
    color: white;
  }
  .twin-status-card.inactive {
    background: rgba(255, 255, 255, 0.05);
    border: 2px dashed rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .twin-status-card.active {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }
  .status-icon {
    font-size: 2.5rem;
    opacity: 0.5;
  }
  .status-content h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
  }
  .status-content p {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
  }
  .status-indicator {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #4ade80;
  }
  .pulse {
    width: 8px;
    height: 8px;
    background: #4ade80;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .twin-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }
  .twin-info h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }
  .headline {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
  }
  .skills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .skill-tag {
    padding: 0.25rem 0.75rem;
    background: rgba(102, 126, 234, 0.3);
    border-radius: 20px;
    font-size: 0.75rem;
  }
  .twin-domain {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    padding: 0.25rem 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    font-size: 0.75rem;
  }
  .deactivate-btn {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid rgba(239, 68, 68, 0.5);
    border-radius: 8px;
    color: #f87171;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .deactivate-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: #f87171;
  }
`;

function getDomainBadge(domain: string): string {
    switch (domain) {
        case 'networking': return '🤝 Networking';
        case 'events': return '🎉 Events';
        case 'dating': return '💕 Dating';
        default: return '👤 General';
    }
}

interface PrivacyDashboardProps {
    dataPoints: number;
    eventsJoined: number;
    matchesMade: number;
}

/**
 * PrivacyDashboard - Shows privacy status and data summary
 */
export function PrivacyDashboard({ dataPoints, eventsJoined, matchesMade }: PrivacyDashboardProps) {
    return (
        <div className="privacy-dashboard">
            <div className="privacy-header">
                <span className="shield">🛡️</span>
                <div>
                    <h3>Privacy First</h3>
                    <p>All data stays on your device</p>
                </div>
            </div>

            <div className="stats-row">
                <div className="stat">
                    <span className="stat-value">{dataPoints}</span>
                    <span className="stat-label">Profile Points</span>
                </div>
                <div className="stat">
                    <span className="stat-value">{eventsJoined}</span>
                    <span className="stat-label">Events</span>
                </div>
                <div className="stat">
                    <span className="stat-value">{matchesMade}</span>
                    <span className="stat-label">Matches</span>
                </div>
            </div>

            <div className="privacy-badges">
                <span className="badge">✓ On-device storage</span>
                <span className="badge">✓ No cloud profiles</span>
                <span className="badge">✓ GDPR compliant</span>
            </div>

            <style jsx>{`
        .privacy-dashboard {
          padding: 1.5rem;
          background: linear-gradient(135deg, #0f4c3a 0%, #134e4a 100%);
          border-radius: 16px;
          color: white;
        }
        .privacy-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .shield {
          font-size: 2rem;
        }
        .privacy-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
        }
        .privacy-header p {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .stats-row {
          display: flex;
          justify-content: space-around;
          margin-bottom: 1.5rem;
        }
        .stat {
          text-align: center;
        }
        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: #4ade80;
        }
        .stat-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .privacy-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .badge {
          padding: 0.25rem 0.75rem;
          background: rgba(74, 222, 128, 0.2);
          border-radius: 20px;
          font-size: 0.75rem;
          color: #4ade80;
        }
      `}</style>
        </div>
    );
}
