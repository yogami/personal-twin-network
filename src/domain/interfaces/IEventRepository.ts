/**
 * IEventRepository - Repository interface for Event persistence
 * 
 * Following Dependency Inversion Principle (DIP):
 * - Use cases depend on this abstraction, not Supabase directly
 */

import { Event } from '../entities/Event';

export interface IEventRepository {
    /**
     * Create a new event
     */
    create(event: Event): Promise<void>;

    /**
     * Find an event by ID
     */
    findById(id: string): Promise<Event | null>;

    /**
     * Find an event by QR code
     */
    findByQrCode(qrCode: string): Promise<Event | null>;

    /**
     * Get all active events
     */
    findAll(): Promise<Event[]>;

    /**
     * Update an event (e.g., attendee count)
     */
    update(event: Event): Promise<void>;

    /**
     * Delete an event
     */
    delete(id: string): Promise<void>;

    /**
     * Add attendee to event and return updated event
     */
    addAttendee(eventId: string): Promise<Event>;

    /**
     * Remove attendee from event
     */
    removeAttendee(eventId: string): Promise<Event>;
}
