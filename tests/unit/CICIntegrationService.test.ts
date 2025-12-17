/**
 * CICIntegrationService Unit Tests
 */

import {
    CICIntegrationService,
    validateCICPayload,
    CICWebhookPayload
} from '@/infrastructure/integrations/CICIntegrationService';

// Mock crypto service
jest.mock('@/infrastructure/crypto/CryptoService', () => ({
    getCryptoService: () => ({
        getKeyPair: jest.fn().mockResolvedValue({
            publicKey: { type: 'public' },
            privateKey: { type: 'private' },
        }),
        sign: jest.fn().mockResolvedValue('mock-signature'),
        verify: jest.fn().mockResolvedValue(true),
        exportPublicKey: jest.fn().mockResolvedValue('mock-public-key'),
        importPublicKey: jest.fn().mockResolvedValue({ type: 'public' }),
    }),
}));

describe('CICIntegrationService', () => {
    let service: CICIntegrationService;

    beforeEach(() => {
        service = new CICIntegrationService('https://test.example.com');
    });

    describe('validateCICPayload', () => {
        it('should return true for valid payload', () => {
            const payload: CICWebhookPayload = {
                eventId: 'cic-berlin-2025',
                eventName: 'CIC Berlin AI Conference',
                attendeeId: 'att-123',
                attendeeName: 'Max Mustermann',
                attendeeRole: 'Developer',
                timestamp: new Date().toISOString(),
            };

            expect(validateCICPayload(payload)).toBe(true);
        });

        it('should return false for missing required fields', () => {
            expect(validateCICPayload({})).toBe(false);
            expect(validateCICPayload({ eventId: 'test' })).toBe(false);
            expect(validateCICPayload(null)).toBe(false);
            expect(validateCICPayload(undefined)).toBe(false);
        });

        it('should return false for non-object', () => {
            expect(validateCICPayload('string')).toBe(false);
            expect(validateCICPayload(123)).toBe(false);
        });
    });

    describe('generateActivationURL', () => {
        it('should generate URL with all parameters', async () => {
            const payload: CICWebhookPayload = {
                eventId: 'cic-berlin-2025',
                eventName: 'CIC Berlin',
                attendeeId: 'att-123',
                attendeeName: 'Anna Schmidt',
                attendeeRole: 'Product Manager',
                timestamp: new Date().toISOString(),
            };

            const result = await service.generateActivationURL(payload);

            expect(result.success).toBe(true);
            expect(result.activationUrl).toBeDefined();
            expect(result.activationUrl).toContain('https://test.example.com/activate');
            expect(result.activationUrl).toContain('event=cic-berlin-2025');
            expect(result.activationUrl).toContain('name=Anna');
        });

        it('should include signature in URL', async () => {
            const payload: CICWebhookPayload = {
                eventId: 'test-event',
                eventName: 'Test',
                attendeeId: 'att-1',
                attendeeName: 'Test User',
                timestamp: new Date().toISOString(),
            };

            const result = await service.generateActivationURL(payload);

            expect(result.activationUrl).toContain('sig=');
        });
    });

    describe('parseActivationToken', () => {
        it('should parse valid token', () => {
            const tokenData = {
                eventId: 'test',
                attendeeId: 'att-1',
                exp: Date.now() + 3600000,
            };
            const token = Buffer.from(JSON.stringify(tokenData)).toString('base64url');

            const result = service.parseActivationToken(token);

            expect(result.valid).toBe(true);
            expect(result.data?.eventId).toBe('test');
        });

        it('should reject expired token', () => {
            const tokenData = {
                eventId: 'test',
                exp: Date.now() - 1000, // Expired
            };
            const token = Buffer.from(JSON.stringify(tokenData)).toString('base64url');

            const result = service.parseActivationToken(token);

            expect(result.valid).toBe(false);
        });

        it('should reject invalid token', () => {
            expect(service.parseActivationToken('invalid').valid).toBe(false);
            expect(service.parseActivationToken('').valid).toBe(false);
        });
    });
});
