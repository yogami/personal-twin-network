/**
 * IndexedDBTwinStore - On-device storage for privacy-first twins
 * 
 * Uses idb library for cleaner IndexedDB API.
 * All twin data stays on device - zero server storage.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Twin } from '@/domain/entities/Twin';
import { ITwinRepository } from '@/domain/interfaces/ITwinRepository';

interface TwinDB extends DBSchema {
    twins: {
        key: string;
        value: Twin & { eventIds: string[] };
        indexes: {
            'by-userId': string;
            'by-eventId': string;
        };
    };
}

const DB_NAME = 'personal-twin-network';
const DB_VERSION = 1;

export class IndexedDBTwinStore implements ITwinRepository {
    private dbPromise: Promise<IDBPDatabase<TwinDB>>;

    constructor() {
        this.dbPromise = this.initDB();
    }

    private async initDB(): Promise<IDBPDatabase<TwinDB>> {
        return openDB<TwinDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                const store = db.createObjectStore('twins', { keyPath: 'id' });
                store.createIndex('by-userId', 'userId');
                store.createIndex('by-eventId', 'eventIds', { multiEntry: true });
            },
        });
    }

    async save(twin: Twin): Promise<void> {
        const db = await this.dbPromise;
        await db.put('twins', { ...twin, eventIds: [] });
    }

    async findById(id: string): Promise<Twin | null> {
        const db = await this.dbPromise;
        const result = await db.get('twins', id);
        if (!result) return null;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { eventIds, ...twin } = result;
        return twin;
    }

    async findByUserId(userId: string): Promise<Twin | null> {
        const db = await this.dbPromise;
        const result = await db.getFromIndex('twins', 'by-userId', userId);
        if (!result) return null;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { eventIds, ...twin } = result;
        return twin;
    }

    async findByEventId(eventId: string): Promise<Twin[]> {
        const db = await this.dbPromise;
        const results = await db.getAllFromIndex('twins', 'by-eventId', eventId);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return results.map(({ eventIds, ...twin }) => twin);
    }

    async update(twin: Twin): Promise<void> {
        const db = await this.dbPromise;
        const existing = await db.get('twins', twin.id);
        const eventIds = existing?.eventIds ?? [];
        await db.put('twins', { ...twin, eventIds });
    }

    async delete(id: string): Promise<void> {
        const db = await this.dbPromise;
        await db.delete('twins', id);
    }

    async joinEvent(twinId: string, eventId: string): Promise<void> {
        const db = await this.dbPromise;
        const existing = await db.get('twins', twinId);
        if (!existing) throw new Error('Twin not found');

        const eventIds = [...new Set([...existing.eventIds, eventId])];
        await db.put('twins', { ...existing, eventIds });
    }

    async leaveEvent(twinId: string, eventId: string): Promise<void> {
        const db = await this.dbPromise;
        const existing = await db.get('twins', twinId);
        if (!existing) throw new Error('Twin not found');

        const eventIds = existing.eventIds.filter((id) => id !== eventId);
        await db.put('twins', { ...existing, eventIds });
    }
}
