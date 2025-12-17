'use client';

import { useState } from 'react';
import { Match } from '@/domain/entities/Match';

interface MatchCardProps {
  match: Match;
  rank: number;
  onConnect: (matchedTwinId: string) => void;
}

/**
 * MatchCard - Displays a single match result with AI explanation
 */
export function MatchCard({ match, rank, onConnect }: MatchCardProps) {
  const scoreColor = getScoreColor(match.score);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const handleExplain = async () => {
    setLoadingAI(true);
    try {
      // Lazy load the service to keep initial bundle small
      const { localLLM } = await import('@/infrastructure/ai/LocalLLMService');

      // Reconstruct minimal twin objects for the prompt
      const myTwinMock = { publicProfile: match.matchedProfile } as any; // In real app, we'd pass full twin
      const theirTwinMock = { publicProfile: match.matchedProfile } as any;

      // Note: In a real app we'd pass the actual user's twin from context
      // Here we just demontrate the UI
      const result = await localLLM.explainMatch(theirTwinMock, theirTwinMock, match.score);
      setExplanation(result);
    } catch (e) {
      console.error(e);
      setExplanation("Could not generate explanation locally.");
    } finally {
      setLoadingAI(false);
    }
  };

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

      {explanation && (
        <div className="ai-explanation">
          <span className="ai-icon">✨</span>
          <p>{explanation}</p>
        </div>
      )}

      <div className="actions">
        <button
          className="ai-button"
          onClick={handleExplain}
          disabled={loadingAI || explanation !== null}
        >
          {loadingAI ? 'Thinking...' : '✨ Explain Match'}
        </button>
        <button
          className="connect-button"
          onClick={() => onConnect(match.matchedTwinId)}
        >
          Connect 💬
        </button>
      </div>

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
        .actions {
            display: flex;
            gap: 0.5rem;
        }
        .ai-button {
            flex: 1;
            padding: 0.75rem;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #e2e8f0;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .ai-button:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.3);
        }
        .ai-button:disabled {
            opacity: 0.7;
            cursor: default;
        }
        .connect-button {
          flex: 1;
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
        .ai-explanation {
            margin-bottom: 1rem;
            padding: 1rem;
            background: rgba(102, 126, 234, 0.1);
            border-radius: 8px;
            border-left: 3px solid #667eea;
            display: flex;
            gap: 0.75rem;
            font-size: 0.9rem;
            line-height: 1.4;
        }
        .ai-icon {
            font-size: 1.2rem;
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
