'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
  eventId: string;
  eventName: string;
  size?: number;
}

/**
 * QRCodeGenerator - Creates scannable QR codes for event joining
 */
export function QRCodeGenerator({ eventId, eventName, size = 200 }: QRCodeGeneratorProps) {
  const qrValue = `${typeof window !== 'undefined' ? window.location.origin : ''}/event/${eventId}/join`;

  return (
    <div className="qr-generator">
      <div className="qr-container">
        <QRCodeSVG
          value={qrValue}
          size={size}
          level="H"
          includeMargin
          bgColor="#ffffff"
          fgColor="#1a1a2e"
        />
      </div>
      <p className="qr-label">{eventName}</p>
      <p className="qr-subtitle">Scan to join event</p>

      <style jsx>{`
        .qr-generator {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
        }
        .qr-container {
          padding: 1rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .qr-label {
          margin-top: 1rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: white;
        }
        .qr-subtitle {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.8);
        }
      `}</style>
    </div>
  );
}

interface QRScannerProps {
  onScan: (eventId: string) => void;
  onError?: (error: string) => void;
}

/**
 * QRScanner - Manual QR code input for demo (camera scanning in future)
 */
export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [eventCode, setEventCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventCode.trim()) return;

    setIsScanning(true);
    try {
      // Extract event ID from URL or code
      const eventId = extractEventIdFromCode(eventCode);
      if (eventId) {
        onScan(eventId);
      } else {
        onError?.('Invalid event code');
      }
    } catch {
      onError?.('Failed to process code');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="qr-scanner">
      <div className="scanner-icon">📸</div>
      <h3>Join Event</h3>
      <p>Enter event code or paste QR link</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={eventCode}
          onChange={(e) => setEventCode(e.target.value)}
          placeholder="Event code or URL..."
          className="code-input"
        />
        <button type="submit" disabled={isScanning} className="scan-button">
          {isScanning ? 'Joining...' : 'Join Event'}
        </button>
      </form>

      <style jsx>{`
        .qr-scanner {
          padding: 2rem;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          text-align: center;
          color: white;
        }
        .scanner-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        p {
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 1.5rem;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .code-input {
          padding: 1rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          text-align: center;
        }
        .code-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
        .scan-button {
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .scan-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        }
        .scan-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

/**
 * Extracts event ID from QR code URL or direct code
 */
function extractEventIdFromCode(code: string): string | null {
  // If it's a URL, extract the event ID
  const urlMatch = code.match(/\/event\/([a-zA-Z0-9-]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // If it's a UUID format, use directly
  const uuidMatch = code.match(/^[a-f0-9-]{36}$/i);
  if (uuidMatch) {
    return code;
  }

  // If it's a short code format (event:id:timestamp)
  const shortMatch = code.match(/^event:([a-f0-9-]+):/i);
  if (shortMatch) {
    return shortMatch[1];
  }

  return null;
}
