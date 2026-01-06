/**
 * ICryptoService - Port interface for cryptographic operations
 * 
 * Abstracts encryption, signing, and hashing operations.
 * Implementations can use Web Crypto API, Node.js crypto, or external services.
 */

/**
 * Key pair for signing and verification
 */
export interface KeyPair {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}

/**
 * Encrypted payload with ciphertext and IV
 */
export interface EncryptedPayload {
    ciphertext: string;
    iv: string;
}

/**
 * Cryptographic service interface
 */
export interface ICryptoService {
    /**
     * Generate a new signing key pair
     */
    generateKeyPair(): Promise<CryptoKeyPair>;

    /**
     * Sign data with private key
     */
    sign(data: string, privateKey: CryptoKey): Promise<string>;

    /**
     * Verify signature with public key
     */
    verify(data: string, signature: string, publicKey: CryptoKey): Promise<boolean>;

    /**
     * Hash data using SHA-256
     */
    hash(data: string): Promise<string>;

    /**
     * Encrypt data with AES-256-GCM
     */
    encrypt(data: string, key: CryptoKey): Promise<EncryptedPayload>;

    /**
     * Decrypt data with AES-256-GCM
     */
    decrypt(ciphertext: string, iv: string, key: CryptoKey): Promise<string>;
}
