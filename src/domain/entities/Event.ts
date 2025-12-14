/**
 * Event Entity - represents a networking event
 * 
 * Events are stored in Supabase, minimal data, no personal info.
 * QR codes allow users to join event mesh for twin matching.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Event context - theme and description for matching relevance
 */
export interface EventContext {
    theme: string;
    description: string;
}

/**
 * Event entity - networking event with QR join capability
 */
export interface Event {
    id: string;
    qrCode: string;
    name: string;
    context: EventContext;
    attendeeCount: number;
    maxAttendees: number;
    createdAt: Date;
}

/**
 * Data required to create a new Event
 */
export interface CreateEventData {
    name: string;
    theme: string;
    description: string;
    maxAttendees: number;
}

/**
 * Factory function to create a new Event
 * Generates unique QR code for event joining
 */
export function createEvent(data: CreateEventData): Event {
    const eventId = uuidv4();

    return {
        id: eventId,
        qrCode: `event:${eventId}:${Date.now()}`, // Unique QR identifier
        name: data.name,
        context: {
            theme: data.theme,
            description: data.description,
        },
        attendeeCount: 0,
        maxAttendees: data.maxAttendees,
        createdAt: new Date(),
    };
}

/**
 * Validates an Event entity for business rule compliance
 */
export function validateEvent(event: Event): boolean {
    // Name is required
    if (!event.name || event.name.trim() === '') {
        return false;
    }

    // Max attendees must be positive
    if (event.maxAttendees <= 0) {
        return false;
    }

    // Attendee count cannot exceed max
    if (event.attendeeCount > event.maxAttendees) {
        return false;
    }

    return true;
}

/**
 * Checks if an event can accept more attendees
 */
export function canJoinEvent(event: Event): boolean {
    return event.attendeeCount < event.maxAttendees;
}

/**
 * Increments attendee count (immutable update)
 */
export function addAttendee(event: Event): Event {
    if (!canJoinEvent(event)) {
        throw new Error('Event is at capacity');
    }

    return {
        ...event,
        attendeeCount: event.attendeeCount + 1,
    };
}

/**
 * Decrements attendee count (immutable update)
 */
export function removeAttendee(event: Event): Event {
    if (event.attendeeCount <= 0) {
        throw new Error('No attendees to remove');
    }

    return {
        ...event,
        attendeeCount: event.attendeeCount - 1,
    };
}
