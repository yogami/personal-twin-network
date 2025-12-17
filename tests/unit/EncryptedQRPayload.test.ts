/**
 * EncryptedQRPayload Unit Tests
 *
 * Tests domain entity for P2P twin discovery
 */

import {
    createEncryptedQRPayload,
    validateQRPayload,
    isPayloadExpired,
    serializePayload,
    deserializePayload,
    EncryptedQRPayload,
} from '@/domain/entities/EncryptedQRPayload';

describe('EncryptedQRPayload', () => {
    const mockPayloadData = {
        embeddingHash: 'abc123hash',
        signature: 'signature123',
        publicKey: 'publicKey123',
        roomId: 'room-abc-123',
    };

    describe('createEncryptedQRPayload', () => {
        it('should create payload with all required fields', () => {
            const payload = createEncryptedQRPayload(mockPayloadData);

            expect(payload.id).toBeDefined();
            expect(payload.version).toBe('1.0');
            expect(payload.encryptedEmbeddingHash).toBe('abc123hash');
            expect(payload.signature).toBe('signature123');
            expect(payload.publicKey).toBe('publicKey123');
            expect(payload.peerInfo.roomId).toBe('room-abc-123');
            expect(payload.createdAt).toBeDefined();
        });

        it('should set default 30 minute expiration', () => {
            const beforeCreate = Date.now();
            const payload = createEncryptedQRPayload(mockPayloadData);
            const afterCreate = Date.now();

            const expectedMin = beforeCreate + 30 * 60 * 1000;
            const expectedMax = afterCreate + 30 * 60 * 1000;

            expect(payload.peerInfo.expiresAt).toBeGreaterThanOrEqual(expectedMin);
            expect(payload.peerInfo.expiresAt).toBeLessThanOrEqual(expectedMax);
        });

        it('should allow custom expiration time', () => {
            const payload = createEncryptedQRPayload({
                ...mockPayloadData,
                expirationMinutes: 60,
            });

            const expectedExpiry = payload.createdAt + 60 * 60 * 1000;
            expect(payload.peerInfo.expiresAt).toBe(expectedExpiry);
        });
    });

    describe('validateQRPayload', () => {
        it('should return true for valid payload', () => {
            const payload = createEncryptedQRPayload(mockPayloadData);
            expect(validateQRPayload(payload)).toBe(true);
        });

        it('should return false for missing id', () => {
            const payload = createEncryptedQRPayload(mockPayloadData);
            const invalid = { ...payload, id: '' };
            expect(validateQRPayload(invalid)).toBe(false);
        });

        it('should return false for missing embedding hash', () => {
            const payload = createEncryptedQRPayload(mockPayloadData);
            const invalid = { ...payload, encryptedEmbeddingHash: '' };
            expect(validateQRPayload(invalid)).toBe(false);
        });

        it('should return false for missing peer info', () => {
            const payload = createEncryptedQRPayload(mockPayloadData);
            const invalid = { ...payload, peerInfo: { roomId: '', expiresAt: 0 } };
            expect(validateQRPayload(invalid)).toBe(false);
        });
    });

    describe('isPayloadExpired', () => {
        it('should return false for unexpired payload', () => {
            const payload = createEncryptedQRPayload(mockPayloadData);
            expect(isPayloadExpired(payload)).toBe(false);
        });

        it('should return true for expired payload', () => {
            const payload = createEncryptedQRPayload({
                ...mockPayloadData,
                expirationMinutes: -1, // Already expired
            });
            expect(isPayloadExpired(payload)).toBe(true);
        });
    });

    describe('serialization', () => {
        it('should serialize and deserialize payload correctly', () => {
            const original = createEncryptedQRPayload(mockPayloadData);
            const serialized = serializePayload(original);
            const deserialized = deserializePayload(serialized);

            expect(deserialized).toEqual(original);
        });

        it('should return null for invalid JSON', () => {
            const result = deserializePayload('not-valid-base64!!!');
            expect(result).toBeNull();
        });

        it('should return null for valid JSON but invalid payload structure', () => {
            const invalidPayload = btoa(JSON.stringify({ foo: 'bar' }));
            const result = deserializePayload(invalidPayload);
            expect(result).toBeNull();
        });
    });
});
