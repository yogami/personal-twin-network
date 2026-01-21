/**
 * GuestIdentityService - Device-based anonymous login
 * 
 * Creates a simple UUID-based guest identity stored in IndexedDB.
 * No email/password required. Persists across sessions.
 */

import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { v4 as uuidv4 } from 'uuid';

interface GuestDB extends DBSchema {
    identity: {
        key: 'current';
        value: GuestIdentity;
    };
}

export interface GuestIdentity {
    id: string;
    displayName: string;
    createdAt: Date;
}

const DB_NAME = 'ptn-guest-identity';
const DB_VERSION = 1;

export class GuestIdentityService {
    private dbPromise: Promise<IDBPDatabase<GuestDB>> | null = null;

    private async getDB(): Promise<IDBPDatabase<GuestDB>> {
        if (typeof window === 'undefined') {
            throw new Error('GuestIdentityService requires browser environment');
        }

        if (!this.dbPromise) {
            this.dbPromise = openDB<GuestDB>(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    db.createObjectStore('identity');
                },
            });
        }
        return this.dbPromise;
    }

    /**
     * Generate human-readable display name from UUID
     */
    private generateDisplayName(uuid: string): string {
        const suffix = uuid.substring(0, 4).toUpperCase();
        return `Guest-${suffix}`;
    }

    /**
     * Get or create guest identity
     */
    async getOrCreateIdentity(): Promise<GuestIdentity> {
        const db = await this.getDB();
        const existing = await db.get('identity', 'current');

        if (existing) {
            return existing;
        }

        const id = uuidv4();
        const identity: GuestIdentity = {
            id,
            displayName: this.generateDisplayName(id),
            createdAt: new Date(),
        };

        await db.put('identity', identity, 'current');
        return identity;
    }

    /**
     * Get current identity if exists
     */
    async getIdentity(): Promise<GuestIdentity | null> {
        const db = await this.getDB();
        return (await db.get('identity', 'current')) || null;
    }

    /**
     * Check if guest identity exists
     */
    async hasIdentity(): Promise<boolean> {
        const identity = await this.getIdentity();
        return identity !== null;
    }

    /**
     * Clear identity (for testing/logout)
     */
    async clearIdentity(): Promise<void> {
        const db = await this.getDB();
        await db.delete('identity', 'current');
    }
}

// Singleton instance
let guestService: GuestIdentityService | null = null;

export function getGuestIdentityService(): GuestIdentityService {
    if (!guestService) {
        guestService = new GuestIdentityService();
    }
    return guestService;
}
