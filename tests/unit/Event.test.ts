/**
 * Event Entity Unit Tests (TDD - Red Phase)
 */

import { Event, createEvent, validateEvent, canJoinEvent } from '@/domain/entities/Event';

describe('Event Entity', () => {
    describe('createEvent', () => {
        it('should create an event with required fields', () => {
            const eventData = {
                name: 'Berlin AI Meetup',
                theme: 'AI Ethics',
                description: 'Monthly AI networking event',
                maxAttendees: 50,
            };

            const event = createEvent(eventData);

            expect(event.id).toBeDefined();
            expect(event.qrCode).toBeDefined();
            expect(event.name).toBe('Berlin AI Meetup');
            expect(event.context.theme).toBe('AI Ethics');
            expect(event.attendeeCount).toBe(0);
        });

        it('should generate a unique QR code for each event', () => {
            const eventData = {
                name: 'Test Event',
                theme: 'Tech',
                description: 'Test',
                maxAttendees: 100,
            };

            const event1 = createEvent(eventData);
            const event2 = createEvent(eventData);

            expect(event1.qrCode).not.toBe(event2.qrCode);
        });
    });

    describe('validateEvent', () => {
        it('should return true for valid event', () => {
            const event: Event = {
                id: 'event-123',
                qrCode: 'qr-abc',
                name: 'Berlin AI Meetup',
                context: {
                    theme: 'AI Ethics',
                    description: 'Networking event',
                },
                attendeeCount: 25,
                maxAttendees: 50,
                createdAt: new Date(),
            };

            expect(validateEvent(event)).toBe(true);
        });

        it('should return false if name is empty', () => {
            const event: Event = {
                id: 'event-123',
                qrCode: 'qr-abc',
                name: '',
                context: { theme: 'Tech', description: '' },
                attendeeCount: 0,
                maxAttendees: 50,
                createdAt: new Date(),
            };

            expect(validateEvent(event)).toBe(false);
        });
    });

    describe('canJoinEvent', () => {
        it('should return true if attendee count is below max', () => {
            const event: Event = {
                id: 'event-123',
                qrCode: 'qr-abc',
                name: 'Test Event',
                context: { theme: 'Tech', description: '' },
                attendeeCount: 25,
                maxAttendees: 50,
                createdAt: new Date(),
            };

            expect(canJoinEvent(event)).toBe(true);
        });

        it('should return false if event is at capacity', () => {
            const event: Event = {
                id: 'event-123',
                qrCode: 'qr-abc',
                name: 'Full Event',
                context: { theme: 'Tech', description: '' },
                attendeeCount: 50,
                maxAttendees: 50,
                createdAt: new Date(),
            };

            expect(canJoinEvent(event)).toBe(false);
        });
    });
});
