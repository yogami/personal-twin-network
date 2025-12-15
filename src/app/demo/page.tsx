'use client';

import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

export default function DemoPage() {
  const productionUrl = 'https://personal-twin-network-production.up.railway.app';

  return (
    <div className="demo-page">
      <main className="content">
        <div className="header">
          <Link href="/" className="logo">
            ✨ Twin Network
          </Link>
          <div className="badge">Hybrid Phone Twin</div>
        </div>

        <div className="hero">
          <h1>Activate Your Digital Twin</h1>
          <p className="subtitle">
            An AI processing node that lives on your phone.<br />
            Finds perfect professional matches. Zero server data.
          </p>
        </div>

        <div className="qr-section">
          <div className="qr-card">
            <div className="qr-wrapper">
              <QRCodeSVG
                value={productionUrl}
                size={250}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#1a1a2e"
              />
            </div>
            <p className="scan-instruction">Scan with your phone camera</p>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature">
            <span className="icon">🔒</span>
            <h3>On-Device Brain</h3>
            <p>Your data is encrypted and stored locally. No cloud profile database.</p>
          </div>
          <div className="feature">
            <span className="icon">⚡</span>
            <h3>Edge Matching</h3>
            <p>AI matching runs on your phone&apos;s processor using Gemini Nano/Flash.</p>
          </div>
          <div className="feature">
            <span className="icon">🤝</span>
            <h3>P2P Negotiation</h3>
            <p>Twins talk directly to each other to negotiate introductions.</p>
          </div>
        </div>

        <div className="footer-link">
          <a href={productionUrl} target="_blank" rel="noopener noreferrer">
            Open in Browser
          </a>
        </div>
      </main>

      <style jsx>{`
        .demo-page {
          min-height: 100vh;
          background: #0a0a0f;
          color: white;
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
        }

        .content {
          max-width: 800px;
          width: 100%;
          text-align: center;
        }

        .header {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-bottom: 3rem;
        }

        .logo {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          text-decoration: none;
        }

        .badge {
          background: rgba(102, 126, 234, 0.2);
          color: #667eea;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid rgba(102, 126, 234, 0.3);
        }

        .hero {
          margin-bottom: 3rem;
        }

        h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
        }

        .qr-section {
          margin-bottom: 4rem;
          display: flex;
          justify-content: center;
        }

        .qr-card {
          background: rgba(255, 255, 255, 0.05);
          padding: 2rem;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .qr-wrapper {
          background: white;
          padding: 1rem;
          border-radius: 16px;
          margin-bottom: 1rem;
          box-shadow: 0 0 40px rgba(102, 126, 234, 0.2);
        }

        .scan-instruction {
          font-weight: 600;
          color: #a5b4fc;
          margin: 0;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
          text-align: left;
          margin-bottom: 3rem;
        }

        .feature {
          background: rgba(255, 255, 255, 0.03);
          padding: 1.5rem;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 1rem;
        }

        .feature h3 {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: white;
        }

        .feature p {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.5;
          margin: 0;
        }

        .footer-link a {
            color: #667eea;
            text-decoration: underline;
            font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
