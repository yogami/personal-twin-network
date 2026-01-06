/**
 * CryptoService Characterization Tests
 * 
 * These tests lock the current behavior of CryptoService BEFORE refactoring.
 * If any of these tests fail after refactoring, the behavior has changed.
 * 
 * NOTE: CryptoService uses Web Crypto API which requires browser environment.
 * These tests are skipped in Node.js but will run in browser/JSDOM with crypto.
 * 
 * @group characterization
 */

import { CryptoService, getCryptoService } from '@/infrastructure/crypto/CryptoService';

// Check if Web Crypto API is available
const hasWebCrypto = typeof crypto !== 'undefined' && crypto.subtle;
const describeIfCrypto = hasWebCrypto ? describe : describe.skip;

describeIfCrypto('CryptoService Characterization', () => {
    let cryptoService: CryptoService;

    beforeEach(() => {
        cryptoService = new CryptoService();
    });

    describe('Key Generation', () => {
        it('should generate an ECDSA P-256 key pair', async () => {
            const keyPair = await cryptoService.generateKeyPair();

            expect(keyPair.publicKey).toBeDefined();
            expect(keyPair.privateKey).toBeDefined();
            expect(keyPair.publicKey.algorithm.name).toBe('ECDSA');
            expect(keyPair.privateKey.algorithm.name).toBe('ECDSA');
        });

        it('should return same key pair on subsequent getKeyPair calls', async () => {
            const keyPair1 = await cryptoService.getKeyPair();
            const keyPair2 = await cryptoService.getKeyPair();

            expect(keyPair1).toBe(keyPair2);
        });

        it('should export public key to base64 string', async () => {
            const keyPair = await cryptoService.generateKeyPair();
            const exported = await cryptoService.exportPublicKey(keyPair.publicKey);

            expect(typeof exported).toBe('string');
            expect(exported.length).toBeGreaterThan(50); // Base64 encoded SPKI
        });

        it('should import public key from base64 string', async () => {
            const keyPair = await cryptoService.generateKeyPair();
            const exported = await cryptoService.exportPublicKey(keyPair.publicKey);
            const imported = await cryptoService.importPublicKey(exported);

            expect(imported.algorithm.name).toBe('ECDSA');
            expect(imported.usages).toContain('verify');
        });
    });

    describe('Signing and Verification', () => {
        it('should sign data and produce base64 signature', async () => {
            const keyPair = await cryptoService.generateKeyPair();
            const data = 'Hello, World!';
            const signature = await cryptoService.sign(data, keyPair.privateKey);

            expect(typeof signature).toBe('string');
            expect(signature.length).toBeGreaterThan(60); // ECDSA signature
        });

        it('should verify valid signature', async () => {
            const keyPair = await cryptoService.generateKeyPair();
            const data = 'Test data for signing';
            const signature = await cryptoService.sign(data, keyPair.privateKey);

            const isValid = await cryptoService.verify(data, signature, keyPair.publicKey);
            expect(isValid).toBe(true);
        });

        it('should reject invalid signature', async () => {
            const keyPair = await cryptoService.generateKeyPair();
            const data = 'Original data';
            const signature = await cryptoService.sign(data, keyPair.privateKey);

            const isValid = await cryptoService.verify('Tampered data', signature, keyPair.publicKey);
            expect(isValid).toBe(false);
        });
    });

    describe('Hashing', () => {
        it('should produce consistent SHA-256 hash for same input', async () => {
            const data = 'Consistent hash test';
            const hash1 = await cryptoService.hash(data);
            const hash2 = await cryptoService.hash(data);

            expect(hash1).toBe(hash2);
        });

        it('should produce different hashes for different inputs', async () => {
            const hash1 = await cryptoService.hash('Input 1');
            const hash2 = await cryptoService.hash('Input 2');

            expect(hash1).not.toBe(hash2);
        });

        it('should hash embedding vector to base64 string', async () => {
            const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
            const hash = await cryptoService.hashEmbedding(embedding);

            expect(typeof hash).toBe('string');
            expect(hash.length).toBe(44); // Base64 encoded SHA-256
        });
    });

    describe('AES Encryption', () => {
        it('should generate AES-256-GCM key', async () => {
            const key = await cryptoService.generateAESKey();

            expect(key.algorithm.name).toBe('AES-GCM');
            expect((key.algorithm as AesKeyAlgorithm).length).toBe(256);
        });

        it('should encrypt and decrypt data round-trip', async () => {
            const key = await cryptoService.generateAESKey();
            const plaintext = 'Secret message to encrypt';

            const { ciphertext, iv } = await cryptoService.encrypt(plaintext, key);
            const decrypted = await cryptoService.decrypt(ciphertext, iv, key);

            expect(decrypted).toBe(plaintext);
        });

        it('should produce different ciphertext for same plaintext (random IV)', async () => {
            const key = await cryptoService.generateAESKey();
            const plaintext = 'Same message';

            const result1 = await cryptoService.encrypt(plaintext, key);
            const result2 = await cryptoService.encrypt(plaintext, key);

            expect(result1.ciphertext).not.toBe(result2.ciphertext);
            expect(result1.iv).not.toBe(result2.iv);
        });
    });

    describe('Room ID Generation', () => {
        it('should generate 32-character hex room ID', () => {
            const roomId = cryptoService.generateRoomId();

            expect(roomId.length).toBe(32);
            expect(/^[0-9a-f]+$/.test(roomId)).toBe(true);
        });

        it('should generate unique room IDs', () => {
            const roomId1 = cryptoService.generateRoomId();
            const roomId2 = cryptoService.generateRoomId();

            expect(roomId1).not.toBe(roomId2);
        });
    });

    describe('Singleton', () => {
        it('should return same instance from getCryptoService', () => {
            const instance1 = getCryptoService();
            const instance2 = getCryptoService();

            expect(instance1).toBe(instance2);
        });
    });
});
