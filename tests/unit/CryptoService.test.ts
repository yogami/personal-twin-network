/**
 * CryptoService Unit Tests
 *
 * Tests Web Crypto API operations for privacy-preserving twin exchange
 */

import { CryptoService, getCryptoService } from '@/infrastructure/crypto/CryptoService';

// Mock Web Crypto API for Node.js environment
const mockCrypto = {
    subtle: {
        generateKey: jest.fn(),
        exportKey: jest.fn(),
        importKey: jest.fn(),
        sign: jest.fn(),
        verify: jest.fn(),
        digest: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn(),
    },
    getRandomValues: jest.fn((arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
    }),
};

// Set up global crypto mock
Object.defineProperty(global, 'crypto', {
    value: mockCrypto,
    writable: true,
});

describe('CryptoService', () => {
    let service: CryptoService;

    beforeEach(() => {
        service = new CryptoService();
        jest.clearAllMocks();
    });

    describe('generateKeyPair', () => {
        it('should generate ECDSA P-256 key pair', async () => {
            const mockKeyPair = {
                publicKey: { type: 'public' },
                privateKey: { type: 'private' },
            };
            mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);

            const keyPair = await service.generateKeyPair();

            expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
                {
                    name: 'ECDSA',
                    namedCurve: 'P-256',
                },
                true,
                ['sign', 'verify']
            );
            expect(keyPair).toBe(mockKeyPair);
        });
    });

    describe('sign and verify', () => {
        it('should sign data with private key', async () => {
            const mockSignature = new ArrayBuffer(64);
            mockCrypto.subtle.sign.mockResolvedValue(mockSignature);
            const mockPrivateKey = { type: 'private' } as CryptoKey;

            const signature = await service.sign('test data', mockPrivateKey);

            expect(mockCrypto.subtle.sign).toHaveBeenCalled();
            // Verify first arg is the algorithm config
            const callArgs = mockCrypto.subtle.sign.mock.calls[0];
            expect(callArgs[0]).toEqual({ name: 'ECDSA', hash: 'SHA-256' });
            expect(callArgs[1]).toBe(mockPrivateKey);
            expect(typeof signature).toBe('string');
        });

        it('should verify signature with public key', async () => {
            mockCrypto.subtle.verify.mockResolvedValue(true);
            const mockPublicKey = { type: 'public' } as CryptoKey;

            const isValid = await service.verify('test data', 'c2lnbmF0dXJl', mockPublicKey);

            expect(mockCrypto.subtle.verify).toHaveBeenCalled();
            const callArgs = mockCrypto.subtle.verify.mock.calls[0];
            expect(callArgs[0]).toEqual({ name: 'ECDSA', hash: 'SHA-256' });
            expect(callArgs[1]).toBe(mockPublicKey);
            expect(isValid).toBe(true);
        });
    });

    describe('hash', () => {
        it('should generate SHA-256 hash', async () => {
            const mockHash = new ArrayBuffer(32);
            mockCrypto.subtle.digest.mockResolvedValue(mockHash);

            const hash = await service.hash('test data');

            expect(mockCrypto.subtle.digest).toHaveBeenCalled();
            const callArgs = mockCrypto.subtle.digest.mock.calls[0];
            expect(callArgs[0]).toBe('SHA-256');
            expect(typeof hash).toBe('string');
        });

        it('should hash embedding vectors', async () => {
            const mockHash = new ArrayBuffer(32);
            mockCrypto.subtle.digest.mockResolvedValue(mockHash);
            const embedding = [0.1, 0.2, 0.3];

            const hash = await service.hashEmbedding(embedding);

            expect(mockCrypto.subtle.digest).toHaveBeenCalled();
            expect(typeof hash).toBe('string');
        });
    });

    describe('encrypt and decrypt', () => {
        it('should encrypt data with AES-GCM', async () => {
            const mockCiphertext = new ArrayBuffer(32);
            mockCrypto.subtle.encrypt.mockResolvedValue(mockCiphertext);
            const mockKey = { type: 'secret' } as CryptoKey;

            const result = await service.encrypt('secret data', mockKey);

            expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
            const callArgs = mockCrypto.subtle.encrypt.mock.calls[0];
            expect(callArgs[0].name).toBe('AES-GCM');
            expect(callArgs[0].iv).toBeDefined();
            expect(callArgs[1]).toBe(mockKey);
            expect(result.ciphertext).toBeDefined();
            expect(result.iv).toBeDefined();
        });

        it('should decrypt data with AES-GCM', async () => {
            // Create mock decrypted data
            const mockDecrypted = new Uint8Array([100, 101, 99, 114, 121, 112, 116, 101, 100]); // "decrypted"
            mockCrypto.subtle.decrypt.mockResolvedValue(mockDecrypted.buffer);
            const mockKey = { type: 'secret' } as CryptoKey;

            const result = await service.decrypt('Y2lwaGVydGV4dA==', 'aXY=', mockKey);

            expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
            const callArgs = mockCrypto.subtle.decrypt.mock.calls[0];
            expect(callArgs[0].name).toBe('AES-GCM');
            expect(callArgs[1]).toBe(mockKey);
            expect(typeof result).toBe('string');
        });
    });

    describe('generateRoomId', () => {
        it('should generate 32-character hex room ID', () => {
            const roomId = service.generateRoomId();

            expect(roomId).toMatch(/^[0-9a-f]{32}$/);
        });

        it('should generate unique room IDs', () => {
            const ids = new Set<string>();
            for (let i = 0; i < 100; i++) {
                ids.add(service.generateRoomId());
            }
            expect(ids.size).toBe(100);
        });
    });

    describe('exportPublicKey and importPublicKey', () => {
        it('should export public key to base64', async () => {
            const mockExported = new ArrayBuffer(32);
            mockCrypto.subtle.exportKey.mockResolvedValue(mockExported);
            const mockPublicKey = { type: 'public' } as CryptoKey;

            const exported = await service.exportPublicKey(mockPublicKey);

            expect(mockCrypto.subtle.exportKey).toHaveBeenCalledWith('spki', mockPublicKey);
            expect(typeof exported).toBe('string');
        });

        it('should import public key from base64', async () => {
            const mockPublicKey = { type: 'public' } as CryptoKey;
            mockCrypto.subtle.importKey.mockResolvedValue(mockPublicKey);

            const imported = await service.importPublicKey('c29tZWtleQ==');

            expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
            expect(imported).toBe(mockPublicKey);
        });
    });

    describe('singleton', () => {
        it('should return same instance from getCryptoService', () => {
            const instance1 = getCryptoService();
            const instance2 = getCryptoService();
            expect(instance1).toBe(instance2);
        });
    });
});
