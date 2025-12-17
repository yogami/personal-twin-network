/**
 * EncryptedQRPayload - Domain entity for P2P twin discovery
 * 
 * Contains encrypted twin metadata for QR-based peer exchange.
 * Raw twin data never leaves device - only encrypted hashes and signatures.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * The encrypted payload embedded in QR codes for P2P discovery
 */
export interface EncryptedQRPayload {
    /** Unique identifier for this payload */
    id: string;

    /** Version for future compatibility */
    version: '1.0';

    /** Encrypted embedding hash (not the raw embedding) */
    encryptedEmbeddingHash: string;

    /** ECDSA signature for authenticity verification */
    signature: string;

    /** Public key for verifying signature */
    publicKey: string;

    /** WebRTC signaling info for P2P connection */
    peerInfo: {
        /** WebRTC room ID for y-webrtc signaling */
        roomId: string;
        /** Timestamp for payload expiration */
        expiresAt: number;
    };

    /** Timestamp of creation */
    createdAt: number;
}

/**
 * Data required to create an encrypted QR payload
 */
export interface CreateQRPayloadData {
    embeddingHash: string;
    signature: string;
    publicKey: string;
    roomId: string;
    expirationMinutes?: number;
}

/**
 * Factory function to create an encrypted QR payload
 */
export function createEncryptedQRPayload(data: CreateQRPayloadData): EncryptedQRPayload {
    const now = Date.now();
    const expirationMs = (data.expirationMinutes ?? 30) * 60 * 1000;

    return {
        id: uuidv4(),
        version: '1.0',
        encryptedEmbeddingHash: data.embeddingHash,
        signature: data.signature,
        publicKey: data.publicKey,
        peerInfo: {
            roomId: data.roomId,
            expiresAt: now + expirationMs,
        },
        createdAt: now,
    };
}

/**
 * Validates that a QR payload is properly structured
 */
export function validateQRPayload(payload: EncryptedQRPayload): boolean {
    if (!payload.id || !payload.version) return false;
    if (!payload.encryptedEmbeddingHash) return false;
    if (!payload.signature || !payload.publicKey) return false;
    if (!payload.peerInfo?.roomId) return false;
    if (!payload.peerInfo?.expiresAt) return false;
    return true;
}

/**
 * Checks if a QR payload has expired
 */
export function isPayloadExpired(payload: EncryptedQRPayload): boolean {
    return Date.now() > payload.peerInfo.expiresAt;
}

/**
 * Serializes payload for QR code embedding
 */
export function serializePayload(payload: EncryptedQRPayload): string {
    return btoa(JSON.stringify(payload));
}

/**
 * Deserializes payload from QR code
 */
export function deserializePayload(encoded: string): EncryptedQRPayload | null {
    try {
        const json = atob(encoded);
        const payload = JSON.parse(json) as EncryptedQRPayload;
        if (!validateQRPayload(payload)) return null;
        return payload;
    } catch {
        return null;
    }
}
