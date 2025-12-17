/**
 * EventActivationService Unit Tests
 */

import {
    parseActivationParams,
    getEventRoomId
} from '@/application/services/EventActivationService';

describe('EventActivationService', () => {
    describe('parseActivationParams', () => {
        it('should parse all URL parameters', () => {
            const params = new URLSearchParams({
                event: 'cic-berlin-2025',
                name: 'Max Mustermann',
                role: 'Developer',
            });

            const result = parseActivationParams(params);

            expect(result.eventId).toBe('cic-berlin-2025');
            expect(result.attendeeName).toBe('Max Mustermann');
            expect(result.attendeeRole).toBe('Developer');
        });

        it('should handle missing parameters', () => {
            const params = new URLSearchParams();

            const result = parseActivationParams(params);

            expect(result.eventId).toBeUndefined();
            expect(result.attendeeName).toBeUndefined();
            expect(result.attendeeRole).toBeUndefined();
        });

        it('should handle partial parameters', () => {
            const params = new URLSearchParams({ event: 'test-event' });

            const result = parseActivationParams(params);

            expect(result.eventId).toBe('test-event');
            expect(result.attendeeName).toBeUndefined();
        });
    });

    describe('getEventRoomId', () => {
        it('should generate deterministic room ID', () => {
            const roomId1 = getEventRoomId('cic-berlin-2025');
            const roomId2 = getEventRoomId('cic-berlin-2025');

            expect(roomId1).toBe(roomId2);
            expect(roomId1).toMatch(/^event-[0-9a-f]{8}$/);
        });

        it('should generate different IDs for different events', () => {
            const roomId1 = getEventRoomId('event-a');
            const roomId2 = getEventRoomId('event-b');

            expect(roomId1).not.toBe(roomId2);
        });
    });
});
