/**
 * QRScanner Unit Tests
 */

import { parseQRContent } from '@/presentation/components/QRScanner';

describe('QRScanner', () => {
    describe('parseQRContent', () => {
        it('should detect CIC activation URL', () => {
            const url = 'https://personal-twin-network.app/activate?event=cic-berlin-2025&name=Max';

            const result = parseQRContent(url);

            expect(result.type).toBe('cic-activation');
            expect(result.parsedData?.eventId).toBe('cic-berlin-2025');
            expect(result.parsedData?.attendeeName).toBe('Max');
        });

        it('should detect CIC Berlin URL', () => {
            const url = 'https://cic-berlin.de/checkin?id=123';

            const result = parseQRContent(url);

            expect(result.type).toBe('cic-activation');
        });

        it('should detect peer payload', () => {
            const payload = {
                roomId: 'room-abc123',
                publicKey: 'key-xyz',
            };
            const encoded = btoa(JSON.stringify(payload));

            const result = parseQRContent(encoded);

            expect(result.type).toBe('peer-payload');
            expect(result.parsedData?.roomId).toBe('room-abc123');
            expect(result.parsedData?.publicKey).toBe('key-xyz');
        });

        it('should return unknown for unrecognized content', () => {
            const result = parseQRContent('random-string-123');

            expect(result.type).toBe('unknown');
            expect(result.rawData).toBe('random-string-123');
        });

        it('should handle malformed URLs gracefully', () => {
            const result = parseQRContent('/activate');

            expect(result.type).toBe('cic-activation');
        });

        it('should handle invalid base64 gracefully', () => {
            const result = parseQRContent('not-valid-base64!!!');

            expect(result.type).toBe('unknown');
        });
    });
});
