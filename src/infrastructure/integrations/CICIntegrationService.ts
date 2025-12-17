/**
 * CICIntegrationService - Handle CIC Berlin webhook integration
 * 
 * Enables CIC to call our API when attendee scans their check-in QR.
 * Generates signed activation URL for seamless redirect.
 */

import { getCryptoService } from '@/infrastructure/crypto/CryptoService';

export interface CICWebhookPayload {
    eventId: string;
    eventName: string;
    attendeeId: string;
    attendeeName: string;
    attendeeEmail?: string;
    attendeeRole?: string;
    visitCount?: number;
    timestamp: string;
    signature?: string;
}

export interface ActivationURLResult {
    success: boolean;
    activationUrl?: string;
    error?: string;
}

/**
 * Validate CIC webhook payload
 */
export function validateCICPayload(payload: unknown): payload is CICWebhookPayload {
    if (typeof payload !== 'object' || payload === null) return false;

    const p = payload as Record<string, unknown>;

    return (
        typeof p.eventId === 'string' &&
        typeof p.attendeeId === 'string' &&
        typeof p.attendeeName === 'string' &&
        typeof p.timestamp === 'string'
    );
}

export class CICIntegrationService {
    private cryptoService = getCryptoService();
    private baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://personal-twin-network.up.railway.app';
    }

    /**
     * Generate a signed activation URL for CIC redirect
     */
    async generateActivationURL(payload: CICWebhookPayload): Promise<ActivationURLResult> {
        try {
            // Create activation token with payload data
            const tokenData = {
                eventId: payload.eventId,
                attendeeId: payload.attendeeId,
                name: payload.attendeeName,
                role: payload.attendeeRole || 'Attendee',
                exp: Date.now() + (24 * 60 * 60 * 1000), // 24h expiry
            };

            // Encode token as base64
            const token = Buffer.from(JSON.stringify(tokenData)).toString('base64url');

            // Sign the token for verification
            const keyPair = await this.cryptoService.getKeyPair();
            const signature = await this.cryptoService.sign(token, keyPair.privateKey);

            // Build activation URL
            const params = new URLSearchParams({
                event: payload.eventId,
                name: payload.attendeeName,
                role: payload.attendeeRole || 'Attendee',
                token,
                sig: signature,
            });

            const activationUrl = `${this.baseUrl}/activate?${params.toString()}`;

            return {
                success: true,
                activationUrl,
            };
        } catch (error) {
            console.error('CIC activation URL generation failed:', error);
            return {
                success: false,
                error: 'Failed to generate activation URL',
            };
        }
    }

    /**
     * Verify an activation token signature
     */
    async verifyActivationToken(token: string, signature: string): Promise<boolean> {
        try {
            const keyPair = await this.cryptoService.getKeyPair();
            const publicKeyExported = await this.cryptoService.exportPublicKey(keyPair.publicKey);
            const publicKey = await this.cryptoService.importPublicKey(publicKeyExported);
            return this.cryptoService.verify(token, signature, publicKey);
        } catch {
            return false;
        }
    }

    /**
     * Parse and validate activation token
     */
    parseActivationToken(token: string): { valid: boolean; data?: { eventId?: string; attendeeId?: string; name?: string; role?: string; exp?: number } } {
        try {
            const decoded = Buffer.from(token, 'base64url').toString('utf-8');
            const tokenData = JSON.parse(decoded);

            // Check expiry
            if (tokenData.exp && tokenData.exp < Date.now()) {
                return { valid: false };
            }

            return { valid: true, data: tokenData };
        } catch {
            return { valid: false };
        }
    }
}

// Singleton
let cicService: CICIntegrationService | null = null;

export function getCICIntegrationService(): CICIntegrationService {
    if (!cicService) {
        cicService = new CICIntegrationService();
    }
    return cicService;
}
