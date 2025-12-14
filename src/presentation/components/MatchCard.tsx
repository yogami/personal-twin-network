'use client';

import { Match } from '@/domain/entities/Match';

interface MatchCardProps {
    match: Match;
    rank: number;
    onConnect: (matchedTwinId: string) => void;
}

/**
 * MatchCard - Displays a single match result with score and shared interests
 */
export function MatchCard({ match, rank, onConnect }: MatchCardProps) {
    const scoreColor = getScoreColor(match.score);

    return (
        <div className="match-card">
            <div className="rank-badge">#{rank}</div>

            <div className="match-content">
                <div className="avatar">
                    {match.matchedProfile.name.charAt(0)}
                </div>

                <div className="match-info">
                    <h3>{match.matchedProfile.name}</h3>
                    <p className="headline">{match.matchedProfile.headline}</p>

                    {match.sharedInterests.length > 0 && (
                        <div className="shared-interests">
                            {match.sharedInterests.slice(0, 3).map((interest, i) => (
                                <span key={i} className="interest-tag">{interest}</span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="score-section">
                    <div className="score-circle" style={{ borderColor: scoreColor }}>
                        <span className="score-value">{match.score}%</span>
                    </div>
                    <span className="score-label">Match</span>
                </div>
            </div>

            <button
                className="connect-button"
                onClick={() => onConnect(match.matchedTwinId)}
            >
                Connect 💬
            </button>

            <style jsx>{`
        .match-card {
          position: relative;
          padding: 1.5rem;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          color: white;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .match-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
        }
        .rank-badge {
          position: absolute;
          top: -0.5rem;
          left: -0.5rem;
          padding: 0.25rem 0.75rem;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 700;
        }
        .match-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .match-info {
          flex: 1;
          min-width: 0;
        }
        .match-info h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .headline {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 0.5rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .shared-interests {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .interest-tag {
          padding: 0.125rem 0.5rem;
          background: rgba(102, 126, 234, 0.3);
          border-radius: 12px;
          font-size: 0.75rem;
        }
        .score-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }
        .score-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 3px solid;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .score-value {
          font-size: 0.875rem;
          font-weight: 700;
        }
        .score-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .connect-button {
          width: 100%;
          padding: 0.75rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .connect-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
      `}</style>
        </div>
    );
}

interface MatchListProps {
    matches: Match[];
    onConnect: (matchedTwinId: string) => void;
    loading?: boolean;
}

/**
 * MatchList - Displays multiple match cards
 */
export function MatchList({ matches, onConnect, loading }: MatchListProps) {
    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                <p>Finding your perfect matches...</p>
                <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 3rem;
            color: white;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          p {
            margin-top: 1rem;
            color: rgba(255, 255, 255, 0.7);
          }
        `}</style>
            </div>
        );
    }

    if (matches.length === 0) {
        return (
            <div className="empty-state">
                <span className="emoji">🔍</span>
                <p>No matches yet. Join an event to meet people!</p>
                <style jsx>{`
          .empty-state {
            text-align: center;
            padding: 3rem;
            color: rgba(255, 255, 255, 0.7);
          }
          .emoji {
            font-size: 3rem;
          }
          p {
            margin-top: 1rem;
          }
        `}</style>
            </div>
        );
    }

    return (
        <div className="match-list">
            {matches.map((match, index) => (
                <MatchCard
                    key={match.matchedTwinId}
                    match={match}
                    rank={index + 1}
                    onConnect={onConnect}
                />
            ))}
            <style jsx>{`
        .match-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
      `}</style>
        </div>
    );
}

/**
 * Returns color based on match score
 */
function getScoreColor(score: number): string {
    if (score >= 80) return '#4ade80'; // Green
    if (score >= 60) return '#facc15'; // Yellow
    return '#f87171'; // Red
}
