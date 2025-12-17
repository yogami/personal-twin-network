/**
 * /scan - QR Code Scanner Page
 * 
 * Enables users to:
 * 1. Scan CIC Berlin check-in QR → Redirect to activation
 * 2. Scan peer QR → Connect P2P for twin exchange
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRScanner, QRScanResult } from '@/presentation/components/QRScanner';
import Link from 'next/link';

export default function ScanPage() {
    const router = useRouter();
    const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleScan = (result: QRScanResult) => {
        setScanResult(result);

        switch (result.type) {
            case 'cic-activation':
                // Redirect to activation page with event data
                const params = new URLSearchParams();
                if (result.parsedData?.eventId) params.set('event', result.parsedData.eventId);
                if (result.parsedData?.attendeeName) params.set('name', result.parsedData.attendeeName);
                if (result.parsedData?.attendeeRole) params.set('role', result.parsedData.attendeeRole);

                setTimeout(() => {
                    router.push(`/activate?${params.toString()}`);
                }, 1000);
                break;

            case 'peer-payload':
                // Store peer info and redirect to dashboard
                if (result.parsedData?.roomId) {
                    sessionStorage.setItem('peerRoomId', result.parsedData.roomId);
                    sessionStorage.setItem('peerPublicKey', result.parsedData.publicKey || '');
                }
                setTimeout(() => {
                    router.push('/dashboard?joined=true');
                }, 1000);
                break;

            default:
                setError('Unknown QR code format. Please scan a valid event or peer QR code.');
        }
    };

    return (
        <main className="scan-page">
            <div className="container">
                <header>
                    <Link href="/" className="back-link">← Back</Link>
                    <h1>Scan QR Code</h1>
                    <p className="subtitle">Scan an event check-in QR or a peer's QR to connect</p>
                </header>

                <div className="scanner-section">
                    <QRScanner
                        onScan={handleScan}
                        onError={setError}
                        active={!scanResult}
                    />
                </div>

                {scanResult && (
                    <div className="result-card">
                        {scanResult.type === 'cic-activation' && (
                            <>
                                <div className="result-icon">🎫</div>
                                <h2>Event Check-In Detected!</h2>
                                {scanResult.parsedData?.eventId && (
                                    <p>Event: {scanResult.parsedData.eventId}</p>
                                )}
                                <p className="redirecting">Redirecting to activation...</p>
                            </>
                        )}
                        {scanResult.type === 'peer-payload' && (
                            <>
                                <div className="result-icon">🤝</div>
                                <h2>Peer Connection Found!</h2>
                                <p className="redirecting">Joining P2P room...</p>
                            </>
                        )}
                    </div>
                )}

                {error && (
                    <div className="error-card">
                        <p>{error}</p>
                    </div>
                )}

                <div className="instructions">
                    <h3>What can I scan?</h3>
                    <ul>
                        <li>
                            <span className="icon">🎫</span>
                            <div>
                                <strong>Event Check-In QR</strong>
                                <p>Scan at CIC Berlin entrance to activate your digital twin</p>
                            </div>
                        </li>
                        <li>
                            <span className="icon">🤝</span>
                            <div>
                                <strong>Peer QR Code</strong>
                                <p>Scan another attendee's QR to connect directly P2P</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            <style jsx>{`
                .scan-page {
                    min-height: 100vh;
                    background: linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%);
                    color: white;
                    padding: 1rem;
                }
                .container {
                    max-width: 500px;
                    margin: 0 auto;
                }
                header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                .back-link {
                    display: inline-block;
                    color: rgba(255, 255, 255, 0.7);
                    text-decoration: none;
                    margin-bottom: 1rem;
                }
                h1 {
                    font-size: 1.75rem;
                    margin-bottom: 0.5rem;
                }
                .subtitle {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.9rem;
                }
                .scanner-section {
                    margin-bottom: 2rem;
                }
                .result-card, .error-card {
                    padding: 1.5rem;
                    border-radius: 16px;
                    text-align: center;
                    margin-bottom: 2rem;
                }
                .result-card {
                    background: rgba(74, 222, 128, 0.1);
                    border: 1px solid rgba(74, 222, 128, 0.3);
                }
                .error-card {
                    background: rgba(248, 113, 113, 0.1);
                    border: 1px solid rgba(248, 113, 113, 0.3);
                }
                .result-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                .redirecting {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.875rem;
                    margin-top: 0.5rem;
                }
                .instructions {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 1.5rem;
                }
                .instructions h3 {
                    font-size: 1rem;
                    margin-bottom: 1rem;
                    color: rgba(255, 255, 255, 0.8);
                }
                .instructions ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .instructions li {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                .instructions li:last-child {
                    margin-bottom: 0;
                }
                .instructions .icon {
                    font-size: 1.5rem;
                }
                .instructions strong {
                    display: block;
                    margin-bottom: 0.25rem;
                }
                .instructions p {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.8rem;
                    margin: 0;
                }
            `}</style>
        </main>
    );
}
