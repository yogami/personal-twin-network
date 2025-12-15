'use client';

import { useState, useEffect, useCallback } from 'react';
import { TwinStatusCard, PrivacyDashboard } from '@/presentation/components/TwinDashboard';
import { MatchList } from '@/presentation/components/MatchCard';
import { QRScanner, QRCodeGenerator } from '@/presentation/components/QRCode';
import { PWAInstallBanner, OfflineBanner } from '@/presentation/components/PWABanners';
import { TwinPersonality, TwinActivityCounter } from '@/presentation/components/TwinPersonality';
import { PrivacyIndicator } from '@/presentation/components/PrivacyIndicator';
import { usePWA } from '@/presentation/hooks/usePWA';
import { Twin } from '@/domain/entities/Twin';
import { Match } from '@/domain/entities/Match';
import { getTwinBrain } from '@/lib/twin-brain';
import { getEdgeMatchingService, initializeEdgeMatching } from '@/lib/edge-matching';
import Link from 'next/link';

// Demo data for MVP demonstration
const demoTwin: Twin = {
  id: 'twin-demo',
  userId: 'user-demo',
  domain: 'networking',
  publicProfile: {
    name: 'Demo User',
    headline: 'Software Engineer & AI Enthusiast',
    skills: ['TypeScript', 'React', 'AI/ML', 'Node.js'],
    interests: ['Startups', 'Tech', 'Innovation'],
  },
  active: true,
  createdAt: new Date(),
};

// Demo candidates for local matching
const demoCandidates = [
  {
    name: 'Anna Kowalski',
    headline: 'AI Research Lead at TechLab Berlin',
    skills: ['Machine Learning', 'Python', 'TensorFlow', 'NLP'],
    interests: ['AI Ethics', 'Startups', 'Climate Tech'],
  },
  {
    name: 'Max Richter',
    headline: 'Founder & CEO @ InnoScale',
    skills: ['Leadership', 'Strategy', 'Fundraising', 'Product'],
    interests: ['Startups', 'SaaS', 'Venture Capital'],
  },
  {
    name: 'Lisa Chen',
    headline: 'Senior Product Manager at Stripe',
    skills: ['Product Management', 'Agile', 'Fintech', 'UX'],
    interests: ['Fintech', 'B2B SaaS', 'Design'],
  },
  {
    name: 'David Mueller',
    headline: 'Full Stack Engineer at Vercel',
    skills: ['TypeScript', 'React', 'Node.js', 'Next.js'],
    interests: ['Open Source', 'DevTools', 'Web3'],
  },
  {
    name: 'Sophia Wagner',
    headline: 'UX Director at Figma',
    skills: ['Design Systems', 'User Research', 'Prototyping'],
    interests: ['Design', 'Accessibility', 'Creative Tech'],
  },
];

export default function DashboardPage() {
  const [twin, setTwin] = useState<Twin | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'matches' | 'scan' | 'create'>('matches');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchSource, setMatchSource] = useState<'edge' | 'server'>('edge');
  const [matchCount, setMatchCount] = useState(0);
  const [negotiationCount, setNegotiationCount] = useState(0);

  // PWA and Twin Brain hooks
  const {
    isInstalled,
    // isOnline, // Removed unused
    swReady,
    twinBrainActive,
    activateTwinBrain,
    lastSyncTime,
  } = usePWA();

  // Perform edge-only matching
  const performEdgeMatching = useCallback(async (userTwin: Twin) => {
    setIsProcessing(true);

    try {
      const edgeService = getEdgeMatchingService();
      const result = await edgeService.findMatches({
        userTwin,
        candidates: demoCandidates,
        eventContext: {
          theme: 'Berlin Tech Meetup',
          description: 'AI and Startups networking event',
        },
      });

      setMatches(result.matches.slice(0, 5));
      setMatchSource(result.source === 'gemini' ? 'edge' : 'edge');
      setMatchCount((prev) => prev + result.matches.length);

      console.log(`[Dashboard] Edge matching complete: ${result.matches.length} matches in ${result.processingTimeMs}ms (${result.source})`);
    } catch (error) {
      console.error('Edge matching failed:', error);
      // Keep existing matches
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Initialize edge matching and load twin
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize edge matching service
        initializeEdgeMatching();

        // Try to load twin from local brain
        getTwinBrain();

        // For demo, we use demo twin (in production, unlock with passphrase)
        setTwin(demoTwin);

        // Activate twin in service worker for background operation
        if (swReady) {
          await activateTwinBrain(demoTwin);
        }

        // Perform initial local matching
        await performEdgeMatching(demoTwin);

      } catch (error) {
        console.error('Failed to initialize:', error);
        // Fallback to demo data
        setTwin(demoTwin);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, [swReady, activateTwinBrain, performEdgeMatching]);



  // Handle event join via QR scan
  const handleEventJoin = useCallback(async (eventId: string) => {
    console.log('Joining event:', eventId);
    if (!twin) return;

    setLoading(true);
    setNegotiationCount((prev) => prev + 1);

    try {
      // Use edge-only matching
      await performEdgeMatching(twin);
      setActiveTab('matches');
    } catch (error) {
      console.error('Event join failed:', error);
    } finally {
      setLoading(false);
    }
  }, [twin, performEdgeMatching]);

  // Handle connect action
  const handleConnect = useCallback((matchedTwinId: string) => {
    console.log('Connecting with:', matchedTwinId);
    setNegotiationCount((prev) => prev + 1);

    // In production: initiate P2P connection via twin-negotiation
    alert('🤝 Connection request sent! Your twin will negotiate.');
  }, []);

  // Refresh matches
  const handleRefresh = useCallback(async () => {
    if (!twin) return;
    await performEdgeMatching(twin);
  }, [twin, performEdgeMatching]);

  if (loading && !twin) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Activating your twin brain...</p>
        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
          }
          .spinner {
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

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <Link href="/" className="logo">
          ✨ Twin Network
        </Link>
        <div className="header-actions">
          <button className="refresh-btn" onClick={handleRefresh} disabled={isProcessing}>
            🔄
          </button>
          <button className="notification-btn">
            🔔
            {matches.length > 0 && <span className="badge">{matches.length}</span>}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* PWA Install and Offline Banners */}
        <OfflineBanner />
        {!isInstalled && <PWAInstallBanner />}

        {/* Twin Personality - The "magic" UX */}
        <TwinPersonality
          twinName={twin?.publicProfile.name || 'Your Twin'}
          isActive={twinBrainActive}
          latestMatch={matches[0]}
          matchCount={matchCount}
          isProcessing={isProcessing}
        />

        {/* Activity Counter */}
        <TwinActivityCounter
          matchesToday={matchCount}
          negotiationsToday={negotiationCount}
          connectionsTotal={0}
        />

        {/* Twin Status */}
        <section className="twin-section">
          <TwinStatusCard twin={twin} />
        </section>

        {/* Tab Navigation */}
        <nav className="tab-nav">
          <button
            className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            🔥 Matches
          </button>
          <button
            className={`tab ${activeTab === 'scan' ? 'active' : ''}`}
            onClick={() => setActiveTab('scan')}
          >
            📱 Scan QR
          </button>
          <button
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            ➕ Create Event
          </button>
        </nav>

        {/* Tab Content */}
        <section className="tab-content">
          {activeTab === 'matches' && (
            <div className="matches-section">
              <div className="section-header">
                <h2>Your Top Matches</h2>
                <span className={`source-badge ${matchSource}`}>
                  {matchSource === 'edge' ? '🔒 On-Device' : '☁️ Server'}
                </span>
              </div>
              <MatchList
                matches={matches}
                onConnect={handleConnect}
                loading={isProcessing}
              />
            </div>
          )}

          {activeTab === 'scan' && (
            <div className="scan-section">
              <QRScanner
                onScan={handleEventJoin}
                onError={(error) => console.error(error)}
              />
            </div>
          )}

          {activeTab === 'create' && (
            <div className="create-section">
              <h2>Your Event QR</h2>
              <p>Share this QR code for others to join your event mesh.</p>
              <QRCodeGenerator
                eventId="demo-event-123"
                eventName="Berlin AI Meetup"
              />
            </div>
          )}
        </section>

        {/* Privacy Indicator - NEW */}
        <PrivacyIndicator
          isEdgeMatching={matchSource === 'edge'}
          isP2PActive={false}
          bytesTransmitted={0}
          isEncrypted={true}
          lastSyncTime={lastSyncTime}
        />

        {/* Privacy Dashboard */}
        <section className="privacy-section">
          <PrivacyDashboard
            dataPoints={twin?.publicProfile.skills.length ?? 0 + (twin?.publicProfile.interests.length ?? 0)}
            eventsJoined={1}
            matchesMade={matches.length}
          />
        </section>
      </main>

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .logo {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
        }

        .refresh-btn,
        .notification-btn {
          position: relative;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          font-size: 1.25rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .refresh-btn:hover,
        .notification-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .notification-btn .badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 18px;
          height: 18px;
          background: #f87171;
          border-radius: 50%;
          font-size: 0.625rem;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dashboard-main {
          max-width: 600px;
          margin: 0 auto;
          padding: 1.5rem;
        }

        .twin-section {
          margin-bottom: 1.5rem;
        }

        .tab-nav {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }

        .tab {
          flex: 1;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .tab.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
          color: white;
        }

        .tab-content {
          margin-bottom: 1.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .matches-section h2,
        .create-section h2 {
          font-size: 1.25rem;
          color: white;
          margin: 0;
        }

        .source-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .source-badge.edge {
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
        }

        .source-badge.server {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }

        .create-section p {
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }

        .privacy-section {
          margin-top: 2rem;
        }
      `}</style>
    </div>
  );
}
