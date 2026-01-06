/**
 * Crypto Utils Microservice
 * 
 * Domain-agnostic library for privacy-preserving cryptographic operations.
 * Uses Web Crypto API for secure, browser-native encryption.
 * 
 * REUSE POTENTIAL:
 * - End-to-end encrypted messaging
 * - Digital signatures for document verification
 * - Privacy-preserving data sharing
 * - Zero-knowledge proof preparation (hash commitments)
 * 
 * @module lib/crypto-utils
 */

// Domain Services
export { CryptoService } from './domain/services/CryptoService';
import { CryptoService } from './domain/services/CryptoService';

// Ports (Interfaces)
export type { ICryptoService, KeyPair, EncryptedPayload } from './ports/ICryptoService';

// Factory
export function createCryptoService(): CryptoService {
    return new CryptoService();
}
