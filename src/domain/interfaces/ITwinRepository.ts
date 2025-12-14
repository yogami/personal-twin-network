/**
 * ITwinRepository - Repository interface for Twin persistence
 * 
 * Following Dependency Inversion Principle (DIP):
 * - Use cases depend on this abstraction, not concrete implementations
 * - Allows swapping IndexedDB for other storage (testing, cloud, etc.)
 */

import { Twin } from '../entities/Twin';

export interface ITwinRepository {
    /**
     * Save a twin to storage
     */
    save(twin: Twin): Promise<void>;

    /**
     * Find a twin by its ID
     */
    findById(id: string): Promise<Twin | null>;

    /**
     * Find a twin by user ID
     */
    findByUserId(userId: string): Promise<Twin | null>;

    /**
     * Get all twins for an event (for matching)
     */
    findByEventId(eventId: string): Promise<Twin[]>;

    /**
     * Update an existing twin
     */
    update(twin: Twin): Promise<void>;

    /**
     * Delete a twin (GDPR compliance)
     */
    delete(id: string): Promise<void>;
}
