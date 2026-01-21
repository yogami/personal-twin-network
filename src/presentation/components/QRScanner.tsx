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
import { Camera, CheckCircle, RotateCcw, XCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export interface QRScanResult {
    type: 'cic-activation' | 'peer-payload' | 'linkedin-profile' | 'unknown';
    rawData: string;
    parsedData?: {
        eventId?: string;
        attendeeName?: string;
        attendeeRole?: string;
        roomId?: string;
        publicKey?: string;
        linkedinUrl?: string;
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

    // Check for LinkedIn profile URL
    if (content.includes('linkedin.com/in/')) {
        return {
            type: 'linkedin-profile',
            rawData: content,
            parsedData: {
                linkedinUrl: content
            }
        };
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
            <div className="glass-card p-8 rounded-2xl border border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-4">
                    <XCircle size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Camera Access Denied</h3>
                <p className="text-sm text-slate-400 mb-6">Please enable camera permissions to scan QR codes</p>
                <button
                    onClick={resetScanner}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium transition-colors border border-red-500/20"
                >
                    <RotateCcw size={16} /> Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-3xl bg-black border-4 border-slate-800 shadow-2xl">
            {/* Scanner Viewport */}
            <div
                id="qr-scanner-container"
                ref={containerRef}
                className={clsx(
                    "w-full aspect-square bg-[#1a1a2e]",
                    hasScanned && "opacity-50 blur-sm transition-all duration-500"
                )}
            />

            {/* Overlays */}
            {!isScanning && !hasScanned && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center">
                    <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
                    <p className="text-slate-300 font-medium animate-pulse">Initializing Camera...</p>
                </div>
            )}

            {hasScanned && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-900/40 backdrop-blur-md p-6 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-500/50">
                        <CheckCircle size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Scanned!</h3>
                    <p className="text-emerald-200/80 mb-6">QR code successfully processed</p>
                    <button
                        onClick={resetScanner}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-900 font-bold hover:bg-emerald-50 transition-colors shadow-lg"
                    >
                        <RotateCcw size={18} /> Scan Another
                    </button>
                </div>
            )}

            {/* Guide Frame (Only visible when scanning) */}
            {isScanning && !hasScanned && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-cyan-400/50 rounded-2xl">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />
                    </div>
                    <div className="absolute bottom-6 left-0 w-full text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs text-white/80">
                            <Camera size={14} /> Point at a QR Code
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
