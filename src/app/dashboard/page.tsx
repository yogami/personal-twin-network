'use client';

import { useState, useEffect } from 'react';
import { TwinStatusCard, PrivacyDashboard } from '@/presentation/components/TwinDashboard';
import { MatchList } from '@/presentation/components/MatchCard';
import { QRScanner, QRCodeGenerator } from '@/presentation/components/QRCode';
import { PWAInstallBanner, OfflineBanner } from '@/presentation/components/PWABanners';
import { Twin } from '@/domain/entities/Twin';
import { Match } from '@/domain/entities/Match';
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

const demoMatches: Match[] = [
  {
    twinId: 'twin-demo',
    matchedTwinId: 'twin-1',
    score: 92,
    sharedInterests: ['AI', 'Startups', 'TypeScript'],
    matchedProfile: { name: 'Anna K.', headline: 'AI Researcher at TechLab' },
    createdAt: new Date(),
  },
  {
    twinId: 'twin-demo',
    matchedTwinId: 'twin-2',
    score: 87,
    sharedInterests: ['React', 'Innovation'],
    matchedProfile: { name: 'Max S.', headline: 'Founder @ StartupXYZ' },
    createdAt: new Date(),
  },
  {
    twinId: 'twin-demo',
    matchedTwinId: 'twin-3',
    score: 83,
    sharedInterests: ['Tech', 'Node.js'],
    matchedProfile: { name: 'Lisa M.', headline: 'Product Manager' },
    createdAt: new Date(),
  },
];

export default function DashboardPage() {
  const [twin, setTwin] = useState<Twin | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'matches' | 'scan' | 'create'>('matches');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading twin from IndexedDB
    const loadTwin = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      // For demo, use demo data
      setTwin(demoTwin);
      setMatches(demoMatches);
      setLoading(false);
    };
    loadTwin();
  }, []);

  const handleEventJoin = async (eventId: string) => {
    console.log('Joining event:', eventId);
    setLoading(true);

    try {
      // Call the real matching API
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userTwin: twin,
          eventId,
          limit: 3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.matches) {
          // Convert API response to Match objects with proper Date
          const apiMatches = data.matches.map((m: Match) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          }));
          setMatches(apiMatches);
        }
      } else {
        console.error('Matching failed:', await response.text());
        // Fallback to demo matches
        setMatches(demoMatches);
      }
    } catch (error) {
      console.error('API error:', error);
      setMatches(demoMatches);
    }

    setLoading(false);
    setActiveTab('matches');
  };

  const handleConnect = (matchedTwinId: string) => {
    console.log('Connecting with:', matchedTwinId);
    // In production: open chat or save connection
    alert('Connection request sent! 💬');
  };

  if (loading && !twin) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading your twin...</p>
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
          <button className="notification-btn">
            🔔
            <span className="badge">3</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* PWA Install and Offline Banners */}
        <OfflineBanner />
        <PWAInstallBanner />

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
              <h2>Your Top Matches</h2>
              <MatchList
                matches={matches}
                onConnect={handleConnect}
                loading={loading}
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

        .notification-btn {
          position: relative;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          font-size: 1.25rem;
          cursor: pointer;
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

        .matches-section h2,
        .create-section h2 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
          color: white;
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
