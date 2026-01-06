/**
 * CryptoService - Web Crypto API wrapper for privacy-preserving operations
 * 
 * Provides:
 * - AES-256-GCM encryption for twin payloads
 * - ECDSA signing for twin authenticity
 * - SHA-256 hashing for embedding fingerprints
 * 
 * All operations use the Web Crypto API (browser-native, secure)
 */

/**
 * Key pair for signing and verification
 */
export interface KeyPair {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}

/**
 * Exported key pair in portable format
 */
export interface ExportedKeyPair {
    publicKey: string;
    privateKey: string;
}

/**
 * CryptoService - Privacy-preserving cryptographic operations
 */
export class CryptoService {
    private keyPair: CryptoKeyPair | null = null;

    /**
     * Generate a new ECDSA key pair for signing
     */
    async generateKeyPair(): Promise<CryptoKeyPair> {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'ECDSA',
                namedCurve: 'P-256',
            },
            true, // exportable
            ['sign', 'verify']
        );
        this.keyPair = keyPair;
        return keyPair;
    }

    /**
     * Get current key pair or generate new one
     */
    async getKeyPair(): Promise<CryptoKeyPair> {
        if (!this.keyPair) {
            return this.generateKeyPair();
        }
        return this.keyPair;
    }

    /**
     * Export public key to base64 string
     */
    async exportPublicKey(publicKey: CryptoKey): Promise<string> {
        const exported = await crypto.subtle.exportKey('spki', publicKey);
        return this.arrayBufferToBase64(exported);
    }

    /**
     * Import public key from base64 string
     */
    async importPublicKey(base64Key: string): Promise<CryptoKey> {
        const keyData = this.base64ToArrayBuffer(base64Key);
        return crypto.subtle.importKey(
            'spki',
            keyData,
            {
                name: 'ECDSA',
                namedCurve: 'P-256',
            },
            true,
            ['verify']
        );
    }

    /**
     * Sign data with private key
     */
    async sign(data: string, privateKey: CryptoKey): Promise<string> {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);

        const signature = await crypto.subtle.sign(
            {
                name: 'ECDSA',
                hash: 'SHA-256',
            },
            privateKey,
            dataBuffer
        );

        return this.arrayBufferToBase64(signature);
    }

    /**
     * Verify signature with public key
     */
    async verify(data: string, signature: string, publicKey: CryptoKey): Promise<boolean> {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const signatureBuffer = this.base64ToArrayBuffer(signature);

        return crypto.subtle.verify(
            {
                name: 'ECDSA',
                hash: 'SHA-256',
            },
            publicKey,
            signatureBuffer,
            dataBuffer
        );
    }

    /**
     * Generate SHA-256 hash of data
     */
    async hash(data: string): Promise<string> {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        return this.arrayBufferToBase64(hashBuffer);
    }

    /**
     * Hash an embedding vector (for privacy-preserving comparison)
     */
    async hashEmbedding(embedding: number[]): Promise<string> {
        const embeddingString = JSON.stringify(embedding);
        return this.hash(embeddingString);
    }

    /**
     * Generate AES-256 key for symmetric encryption
     */
    async generateAESKey(): Promise<CryptoKey> {
        return crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256,
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt data with AES-256-GCM
     */
    async encrypt(data: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const ciphertext = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            key,
            dataBuffer
        );

        return {
            ciphertext: this.arrayBufferToBase64(ciphertext),
            iv: this.arrayBufferToBase64(iv.buffer),
        };
    }

    /**
     * Decrypt data with AES-256-GCM
     */
    async decrypt(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
        const ciphertextBuffer = this.base64ToArrayBuffer(ciphertext);
        const ivBuffer = this.base64ToArrayBuffer(iv);

        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: ivBuffer,
            },
            key,
            ciphertextBuffer
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }

    /**
     * Generate a random room ID for WebRTC signaling
     */
    generateRoomId(): string {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Utility methods
    private arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
        const bytes = new Uint8Array(buffer as ArrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

// Singleton instance for convenience
let cryptoServiceInstance: CryptoService | null = null;

export function getCryptoService(): CryptoService {
    if (!cryptoServiceInstance) {
        cryptoServiceInstance = new CryptoService();
    }
    return cryptoServiceInstance;
}
