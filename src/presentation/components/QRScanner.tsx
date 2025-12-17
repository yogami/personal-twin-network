/**
 * QRScanner - Reusable camera-based QR code scanner component
 * 
 * Supports:
 * - CIC Berlin redirect URLs
 * - Peer-to-peer encrypted payloads
 * - Graceful permission handling
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeResult } from 'html5-qrcode';

export interface QRScanResult {
    type: 'cic-activation' | 'peer-payload' | 'unknown';
    rawData: string;
    parsedData?: {
        eventId?: string;
        attendeeName?: string;
        attendeeRole?: string;
        roomId?: string;
        publicKey?: string;
    };
}

interface QRScannerProps {
    onScan: (result: QRScanResult) => void;
    onError?: (error: string) => void;
    active?: boolean;
}

/**
 * Parse QR content and determine type
 */
export function parseQRContent(content: string): QRScanResult {
    // Check for CIC activation URL
    if (content.includes('/activate') || content.includes('cic-berlin')) {
        try {
            const url = new URL(content);
            return {
                type: 'cic-activation',
                rawData: content,
                parsedData: {
                    eventId: url.searchParams.get('event') || undefined,
                    attendeeName: url.searchParams.get('name') || undefined,
                    attendeeRole: url.searchParams.get('role') || undefined,
                },
            };
        } catch {
            return { type: 'cic-activation', rawData: content };
        }
    }

    // Check for peer payload (base64 encoded JSON)
    try {
        const decoded = atob(content);
        const parsed = JSON.parse(decoded);
        if (parsed.roomId && parsed.publicKey) {
            return {
                type: 'peer-payload',
                rawData: content,
                parsedData: {
                    roomId: parsed.roomId,
                    publicKey: parsed.publicKey,
                },
            };
        }
    } catch {
        // Not a peer payload
    }

    return { type: 'unknown', rawData: content };
}

export function QRScanner({ onScan, onError, active = true }: QRScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [hasScanned, setHasScanned] = useState(false);

    const handleScanSuccess = useCallback((decodedText: string, _result: Html5QrcodeResult) => {
        if (hasScanned) return; // Prevent duplicate scans
        setHasScanned(true);

        const parsed = parseQRContent(decodedText);
        onScan(parsed);

        // Stop scanning after successful scan
        if (scannerRef.current) {
            scannerRef.current.stop().catch(() => { });
        }
    }, [onScan, hasScanned]);

    const startScanning = useCallback(async () => {
        if (!containerRef.current || scannerRef.current) return;

        const scannerId = 'qr-scanner-container';

        try {
            const scanner = new Html5Qrcode(scannerId);
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                handleScanSuccess,
                () => { } // Ignore scan failures
            );

            setIsScanning(true);
        } catch (err) {
            console.error('QR Scanner error:', err);
            setPermissionDenied(true);
            onError?.('Camera access denied or not available');
        }
    }, [handleScanSuccess, onError]);

    const stopScanning = useCallback(async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
            } catch {
                // Ignore stop errors
            }
            scannerRef.current = null;
            setIsScanning(false);
        }
    }, []);

    useEffect(() => {
        if (active && !hasScanned) {
            startScanning();
        } else {
            stopScanning();
        }

        return () => {
            stopScanning();
        };
    }, [active, hasScanned, startScanning, stopScanning]);

    const resetScanner = () => {
        setHasScanned(false);
        setPermissionDenied(false);
        startScanning();
    };

    if (permissionDenied) {
        return (
            <div className="scanner-error">
                <div className="error-icon">📷</div>
                <p>Camera access denied</p>
                <p className="error-detail">Please enable camera permissions to scan QR codes</p>
                <button onClick={resetScanner} className="retry-button">
                    Try Again
                </button>
                <style jsx>{`
                    .scanner-error {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 2rem;
                        background: rgba(248, 113, 113, 0.1);
                        border-radius: 16px;
                        text-align: center;
                        color: white;
                    }
                    .error-icon {
                        font-size: 3rem;
                        margin-bottom: 1rem;
                    }
                    .error-detail {
                        color: rgba(255, 255, 255, 0.6);
                        font-size: 0.875rem;
                        margin-top: 0.5rem;
                    }
                    .retry-button {
                        margin-top: 1rem;
                        padding: 0.75rem 1.5rem;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        font-weight: 600;
                        cursor: pointer;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="scanner-container">
            <div
                id="qr-scanner-container"
                ref={containerRef}
                className="scanner-viewport"
            />
            {!isScanning && !hasScanned && (
                <div className="scanner-loading">
                    <div className="spinner" />
                    <p>Starting camera...</p>
                </div>
            )}
            {hasScanned && (
                <div className="scanner-success">
                    <div className="success-icon">✓</div>
                    <p>QR Code Scanned!</p>
                    <button onClick={resetScanner} className="scan-again-button">
                        Scan Another
                    </button>
                </div>
            )}
            <style jsx>{`
                .scanner-container {
                    position: relative;
                    width: 100%;
                    max-width: 400px;
                    margin: 0 auto;
                }
                .scanner-viewport {
                    width: 100%;
                    border-radius: 16px;
                    overflow: hidden;
                    background: #1a1a2e;
                }
                .scanner-loading, .scanner-success {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: rgba(26, 26, 46, 0.9);
                    border-radius: 16px;
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
                .success-icon {
                    width: 60px;
                    height: 60px;
                    background: #4ade80;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    margin-bottom: 1rem;
                }
                .scan-again-button {
                    margin-top: 1rem;
                    padding: 0.5rem 1rem;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
}
