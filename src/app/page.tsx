'use client';

import { useState } from 'react';
import { TwinCreationForm } from '@/presentation/components/TwinCreationForm';
import { TwinDomain } from '@/domain/entities/Twin';
import Link from 'next/link';

interface TwinProfile {
  name: string;
  headline: string;
  skills: string[];
  interests: string[];
  domain: TwinDomain;
}

export default function Home() {
  const [twin, setTwin] = useState<TwinProfile | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleTwinCreated = (profile: TwinProfile) => {
    setTwin(profile);
    setShowForm(false);
    // In production, this would save to IndexedDB and navigate to dashboard
  };

  return (
    <main className="landing">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="badge">🚀 Privacy-First AI Networking</div>
          <h1>
            Your Twin Finds <span className="gradient-text">Perfect People</span>
          </h1>
          <p className="tagline">Skip the small talk. Get matched with the right people at events in 30 seconds.</p>

          {twin ? (
            <div className="twin-active-banner">
              <div className="status-pulse" />
              <span>Twin Active: <strong>{twin.name}</strong></span>
              <Link href="/dashboard" className="btn-primary">
                Go to Dashboard →
              </Link>
            </div>
          ) : (
            <div className="cta-buttons">
              <button
                className="btn-primary"
                onClick={() => setShowForm(true)}
              >
                🚀 Create Your Twin
              </button>
              <button className="btn-secondary">
                How It Works
              </button>
            </div>
          )}
        </div>

        <div className="hero-visual">
          {showForm ? (
            <TwinCreationForm onTwinCreated={handleTwinCreated} />
          ) : twin ? (
            <div className="twin-preview card">
              <div className="avatar">{twin.name.charAt(0)}</div>
              <h3>{twin.name}</h3>
              <p>{twin.headline}</p>
              <div className="skills">
                {twin.skills.slice(0, 4).map((skill, i) => (
                  <span key={i} className="skill-tag">{skill}</span>
                ))}
              </div>
              <div className="domain-badge">
                {getDomainIcon(twin.domain)} {twin.domain}
              </div>
            </div>
          ) : (
            <div className="demo-visual">
              <div className="floating-card card-1">
                <span className="match-score">92%</span>
                <span className="match-name">Anna K.</span>
              </div>
              <div className="floating-card card-2">
                <span className="match-score">87%</span>
                <span className="match-name">Max S.</span>
              </div>
              <div className="floating-card card-3">
                <span className="match-score">83%</span>
                <span className="match-name">Lisa M.</span>
              </div>
              <div className="center-icon">🤖</div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>How It <span className="gradient-text">Works</span></h2>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔗</div>
            <h3>Paste LinkedIn</h3>
            <p>30-second onboard. Your public profile becomes your digital twin.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Scan QR</h3>
            <p>Join event mesh instantly. 50 attendees, one scan.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI Matches</h3>
            <p>Gemini-powered scoring. Top 3 perfect matches, instantly.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Privacy First</h3>
            <p>All data on-device. Zero cloud profiles. GDPR dream.</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stat-item">
          <span className="stat-number">30s</span>
          <span className="stat-label">Onboard Time</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">10x</span>
          <span className="stat-label">Time Saved</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">0</span>
          <span className="stat-label">Server Data</span>
        </div>
      </section>

      <style jsx>{`
        .landing {
          min-height: 100vh;
        }

        /* Hero */
        .hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          padding: 6rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
          align-items: center;
        }

        @media (max-width: 900px) {
          .hero {
            grid-template-columns: 1fr;
            text-align: center;
            padding: 4rem 1.5rem;
          }
        }

        .badge {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: rgba(102, 126, 234, 0.2);
          border-radius: 20px;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }

        h1 {
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 600px) {
          h1 {
            font-size: 2.5rem;
          }
        }

        .tagline {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 2rem;
          max-width: 500px;
        }

        .cta-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        @media (max-width: 900px) {
          .cta-buttons {
            justify-content: center;
          }
        }

        .twin-active-banner {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: rgba(74, 222, 128, 0.1);
          border: 1px solid rgba(74, 222, 128, 0.3);
          border-radius: 12px;
          flex-wrap: wrap;
        }

        .status-pulse {
          width: 10px;
          height: 10px;
          background: #4ade80;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        /* Demo Visual */
        .demo-visual {
          position: relative;
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .center-icon {
          font-size: 5rem;
          animation: pulse 3s infinite;
        }

        .floating-card {
          position: absolute;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
          animation: float 6s ease-in-out infinite;
        }

        .card-1 { top: 10%; right: 10%; animation-delay: 0s; }
        .card-2 { bottom: 20%; left: 5%; animation-delay: 2s; }
        .card-3 { bottom: 10%; right: 20%; animation-delay: 4s; }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        .match-score {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .match-name {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        /* Twin Preview */
        .twin-preview {
          text-align: center;
          padding: 2rem;
        }

        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 700;
          margin: 0 auto 1rem;
        }

        .twin-preview h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .twin-preview p {
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 1rem;
        }

        .skills {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .skill-tag {
          padding: 0.25rem 0.75rem;
          background: rgba(102, 126, 234, 0.3);
          border-radius: 20px;
          font-size: 0.75rem;
        }

        .domain-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          font-size: 0.875rem;
          text-transform: capitalize;
        }

        /* Features */
        .features {
          padding: 6rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .features h2 {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 3rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
        }

        .feature-card {
          padding: 2rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          text-align: center;
          transition: transform 0.2s, border-color 0.2s;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(102, 126, 234, 0.5);
        }

        .feature-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .feature-card h3 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .feature-card p {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
        }

        /* Stats */
        .stats {
          display: flex;
          justify-content: center;
          gap: 6rem;
          padding: 4rem 2rem;
          background: rgba(255, 255, 255, 0.02);
          flex-wrap: wrap;
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-label {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </main>
  );
}

function getDomainIcon(domain: TwinDomain): string {
  switch (domain) {
    case 'networking': return '🤝';
    case 'events': return '🎉';
    case 'dating': return '💕';
    default: return '👤';
  }
}
