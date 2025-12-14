/**
 * TwinBrain - Encrypted local twin storage
 * 
 * All twin data stays on-device with AES-GCM encryption.
 * Key derived from user passphrase via PBKDF2.
 * Zero server storage - true privacy-first.
 */

import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { Twin, PublicProfile } from '@/domain/entities/Twin';
import { Match } from '@/domain/entities/Match';

// ============================================================================
// Types
// ============================================================================

interface TwinBrainDB extends DBSchema {
    twin: {
        key: 'current';
        value: EncryptedTwin;
    };
    matches: {
        key: string;
        value: StoredMatch;
        indexes: {
            'by-date': Date;
            'by-score': number;
        };
    };
    candidates: {
        key: string;
        value: StoredCandidate;
        indexes: {
            'by-event': string;
        };
    };
    sync_queue: {
        key: string;
        value: SyncOperation;
    };
    config: {
        key: string;
        value: unknown;
    };
}

interface EncryptedTwin {
    encrypted: string;  // Base64 encrypted JSON
    iv: string;         // Initialization vector
    salt: string;       // Salt for key derivation
}

interface StoredMatch extends Match {
    localOnly: boolean;
    syncedAt?: Date;
}

interface StoredCandidate {
    id: string;
    eventId: string;
    publicProfile: PublicProfile;
    lastSeen: Date;
}

interface SyncOperation {
    id: string;
    type: 'match' | 'connect' | 'update';
    payload: unknown;
    createdAt: Date;
    retries: number;
}

interface TwinBrainState {
    twin: Twin | null;
    isEncrypted: boolean;
    lastSync: Date | null;
    matchCount: number;
    isActive: boolean;
}

// ============================================================================
// Encryption Utilities
// ============================================================================

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt.buffer as ArrayBuffer,
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encrypt(data: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        key,
        encoder.encode(data)
    );

    return {
        encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv)),
    };
}

async function decrypt(encrypted: string, iv: string, key: CryptoKey): Promise<string> {
    const decoder = new TextDecoder();
    const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv: ivBytes },
        key,
        encryptedBytes
    );

    return decoder.decode(decrypted);
}

// ============================================================================
// TwinBrain Class
// ============================================================================

const DB_NAME = 'twin-brain';
const DB_VERSION = 1;

export class TwinBrain {
    private dbPromise: Promise<IDBPDatabase<TwinBrainDB>>;
    private cryptoKey: CryptoKey | null = null;
    private passphrase: string | null = null;

    constructor() {
        this.dbPromise = this.initDB();
    }

    private async initDB(): Promise<IDBPDatabase<TwinBrainDB>> {
        return openDB<TwinBrainDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Twin store (single encrypted twin)
                if (!db.objectStoreNames.contains('twin')) {
                    db.createObjectStore('twin');
                }

                // Matches store
                if (!db.objectStoreNames.contains('matches')) {
                    const matchStore = db.createObjectStore('matches', { keyPath: 'matchedTwinId' });
                    matchStore.createIndex('by-date', 'createdAt');
                    matchStore.createIndex('by-score', 'score');
                }

                // Candidates store (event attendees)
                if (!db.objectStoreNames.contains('candidates')) {
                    const candidateStore = db.createObjectStore('candidates', { keyPath: 'id' });
                    candidateStore.createIndex('by-event', 'eventId');
                }

                // Sync queue for offline operations
                if (!db.objectStoreNames.contains('sync_queue')) {
                    db.createObjectStore('sync_queue', { keyPath: 'id' });
                }

                // Config store
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config');
                }
            },
        });
    }

    // ========================================================================
    // Authentication & Encryption
    // ========================================================================

    /**
     * Unlock the twin brain with a passphrase
     * Creates encryption key from passphrase
     */
    async unlock(passphrase: string): Promise<boolean> {
        try {
            const db = await this.dbPromise;
            const existing = await db.get('twin', 'current');

            if (existing) {
                // Existing twin - try to decrypt with passphrase
                const salt = Uint8Array.from(atob(existing.salt), c => c.charCodeAt(0));
                this.cryptoKey = await deriveKey(passphrase, salt);

                // Verify by attempting decryption
                await decrypt(existing.encrypted, existing.iv, this.cryptoKey);
            } else {
                // New twin - generate salt and derive key
                const salt = crypto.getRandomValues(new Uint8Array(16));
                this.cryptoKey = await deriveKey(passphrase, salt);

                // Store salt for future unlocks
                await db.put('config', btoa(String.fromCharCode(...salt)), 'salt');
            }

            this.passphrase = passphrase;
            return true;
        } catch (error) {
            console.error('Failed to unlock twin brain:', error);
            this.cryptoKey = null;
            this.passphrase = null;
            return false;
        }
    }

    /**
     * Lock the twin brain - clears encryption key from memory
     */
    lock(): void {
        this.cryptoKey = null;
        this.passphrase = null;
    }

    /**
     * Check if brain is unlocked
     */
    isUnlocked(): boolean {
        return this.cryptoKey !== null;
    }

    // ========================================================================
    // Twin CRUD Operations
    // ========================================================================

    /**
     * Save twin (encrypted)
     */
    async saveTwin(twin: Twin): Promise<void> {
        if (!this.cryptoKey || !this.passphrase) {
            throw new Error('Twin brain is locked');
        }

        const db = await this.dbPromise;
        const saltStr = await db.get('config', 'salt') as string | undefined;

        let salt: Uint8Array;
        if (saltStr) {
            salt = Uint8Array.from(atob(saltStr), c => c.charCodeAt(0));
        } else {
            salt = crypto.getRandomValues(new Uint8Array(16));
            await db.put('config', btoa(String.fromCharCode(...salt)), 'salt');
        }

        const { encrypted, iv } = await encrypt(JSON.stringify(twin), this.cryptoKey);

        await db.put('twin', {
            encrypted,
            iv,
            salt: btoa(String.fromCharCode(...salt)),
        }, 'current');
    }

    /**
     * Get current twin (decrypted)
     */
    async getTwin(): Promise<Twin | null> {
        if (!this.cryptoKey) {
            throw new Error('Twin brain is locked');
        }

        const db = await this.dbPromise;
        const stored = await db.get('twin', 'current');

        if (!stored) return null;

        const decrypted = await decrypt(stored.encrypted, stored.iv, this.cryptoKey);
        const twin = JSON.parse(decrypted) as Twin;

        // Restore Date objects
        twin.createdAt = new Date(twin.createdAt);
        return twin;
    }

    /**
     * Delete twin and all associated data
     */
    async deleteTwin(): Promise<void> {
        const db = await this.dbPromise;
        await db.delete('twin', 'current');
        await db.clear('matches');
        await db.clear('sync_queue');
        this.lock();
    }

    // ========================================================================
    // Match Operations
    // ========================================================================

    /**
     * Save a match locally
     */
    async saveMatch(match: Match): Promise<void> {
        const db = await this.dbPromise;
        await db.put('matches', {
            ...match,
            localOnly: true,
            createdAt: new Date(),
        });
    }

    /**
     * Get all matches sorted by score
     */
    async getMatches(): Promise<StoredMatch[]> {
        const db = await this.dbPromise;
        const matches = await db.getAllFromIndex('matches', 'by-score');
        return matches.reverse(); // Highest score first
    }

    /**
     * Get top N matches
     */
    async getTopMatches(limit: number = 3): Promise<StoredMatch[]> {
        const matches = await this.getMatches();
        return matches.slice(0, limit);
    }

    /**
     * Clear old matches
     */
    async clearMatches(): Promise<void> {
        const db = await this.dbPromise;
        await db.clear('matches');
    }

    // ========================================================================
    // Candidate Operations (Event Attendees)
    // ========================================================================

    /**
     * Save candidates for an event
     */
    async saveCandidates(eventId: string, candidates: PublicProfile[]): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction('candidates', 'readwrite');

        for (const profile of candidates) {
            await tx.store.put({
                id: `${eventId}-${profile.name}`,
                eventId,
                publicProfile: profile,
                lastSeen: new Date(),
            });
        }

        await tx.done;
    }

    /**
     * Get candidates for an event
     */
    async getCandidates(eventId: string): Promise<StoredCandidate[]> {
        const db = await this.dbPromise;
        return db.getAllFromIndex('candidates', 'by-event', eventId);
    }

    // ========================================================================
    // Sync Queue Operations
    // ========================================================================

    /**
     * Add operation to sync queue
     */
    async queueSync(type: SyncOperation['type'], payload: unknown): Promise<void> {
        const db = await this.dbPromise;
        await db.put('sync_queue', {
            id: crypto.randomUUID(),
            type,
            payload,
            createdAt: new Date(),
            retries: 0,
        });
    }

    /**
     * Get pending sync operations
     */
    async getPendingSyncs(): Promise<SyncOperation[]> {
        const db = await this.dbPromise;
        return db.getAll('sync_queue');
    }

    /**
     * Remove completed sync operation
     */
    async removeSyncOp(id: string): Promise<void> {
        const db = await this.dbPromise;
        await db.delete('sync_queue', id);
    }

    // ========================================================================
    // State & Status
    // ========================================================================

    /**
     * Get current brain state
     */
    async getState(): Promise<TwinBrainState> {
        const db = await this.dbPromise;
        const hasTwin = await db.get('twin', 'current');
        const matchCount = await db.count('matches');
        const lastSyncStr = await db.get('config', 'lastSync') as string | undefined;

        let twin: Twin | null = null;
        if (hasTwin && this.isUnlocked()) {
            try {
                twin = await this.getTwin();
            } catch {
                // Ignore decryption errors for state check
            }
        }

        return {
            twin,
            isEncrypted: !!hasTwin,
            lastSync: lastSyncStr ? new Date(lastSyncStr) : null,
            matchCount,
            isActive: !!hasTwin && twin?.active === true,
        };
    }

    /**
     * Update last sync timestamp
     */
    async updateLastSync(): Promise<void> {
        const db = await this.dbPromise;
        await db.put('config', new Date().toISOString(), 'lastSync');
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let twinBrainInstance: TwinBrain | null = null;

export function getTwinBrain(): TwinBrain {
    if (!twinBrainInstance) {
        twinBrainInstance = new TwinBrain();
    }
    return twinBrainInstance;
}

// ============================================================================
// Service Worker Communication
// ============================================================================

/**
 * Send message to service worker
 */
export async function sendToTwinBrain(type: string, payload?: unknown): Promise<unknown> {
    if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
    }

    const registration = await navigator.serviceWorker.ready;

    return new Promise((resolve, reject) => {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (event) => {
            if (event.data.error) {
                reject(new Error(event.data.error));
            } else {
                resolve(event.data.result);
            }
        };

        registration.active?.postMessage(
            { type, payload },
            [messageChannel.port2]
        );

        // Timeout after 30 seconds
        setTimeout(() => reject(new Error('SW message timeout')), 30000);
    });
}

/**
 * Activate twin in service worker for background operation
 */
export async function activateTwinInBackground(twin: Twin): Promise<void> {
    await sendToTwinBrain('ACTIVATE_TWIN', {
        id: twin.id,
        profile: twin.publicProfile,
    });
}

/**
 * Request background matching
 */
export async function requestBackgroundMatching(eventId: string): Promise<void> {
    await sendToTwinBrain('REQUEST_MATCHES', { eventId });
}
