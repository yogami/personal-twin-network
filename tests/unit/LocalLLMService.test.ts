/**
 * LocalLLMService Unit Tests
 * 
 * Tests the wrapper for Chrome's experimental window.ai
 */

import { LocalLLMService } from '@/infrastructure/ai/LocalLLMService';
import { createTwin } from '@/domain/entities/Twin';

describe('LocalLLMService', () => {
    let service: LocalLLMService;
    let mockSession: any;

    beforeEach(() => {
        service = new LocalLLMService();
        jest.clearAllMocks();

        mockSession = {
            prompt: jest.fn().mockResolvedValue('Mocked response'),
            promptStreaming: jest.fn(),
            destroy: jest.fn(),
        };

        // Mock window.ai on the existing window object
        // @ts-ignore
        global.window.ai = undefined;
    });

    afterEach(() => {
        // @ts-ignore
        delete global.window.ai;
    });

    describe('checkAvailability', () => {
        it('should return false if window is undefined', async () => {
            // Cannot easily mock window being undefined in jsdom, but can mock ai missing
            // @ts-ignore
            delete global.window.ai;
            expect(await service.checkAvailability()).toBe(false);
        });

        it('should return false if window.ai is missing', async () => {
            // @ts-ignore
            global.window.ai = undefined;
            expect(await service.checkAvailability()).toBe(false);
        });

        it('should return true if window.ai.canCreateTextSession returns "readily"', async () => {
            // @ts-ignore
            global.window.ai = {
                canCreateTextSession: jest.fn().mockResolvedValue('readily'),
            };
            expect(await service.checkAvailability()).toBe(true);
        });
    });

    describe('generateIcebreaker', () => {
        const twin1 = createTwin({
            userId: 'u1',
            publicProfile: { name: 'A', headline: 'Dev', skills: [], interests: ['AI'] }
        } as any);

        const twin2 = createTwin({
            userId: 'u2',
            publicProfile: { name: 'B', headline: 'Designer', skills: [], interests: ['Art'] }
        } as any);

        it('should return fallback if service unavailable', async () => {
            // @ts-ignore
            global.window.ai = undefined;

            const response = await service.generateIcebreaker(twin1, twin2);
            expect(response).toContain('fallback');
        });

        it('should use session.prompt if available', async () => {
            // @ts-ignore
            global.window.ai = {
                canCreateTextSession: jest.fn().mockResolvedValue('readily'),
                createTextSession: jest.fn().mockResolvedValue(mockSession),
            };

            const response = await service.generateIcebreaker(twin1, twin2);

            expect(mockSession.prompt).toHaveBeenCalled();
            expect(response).toBe('Mocked response');
        });
    });
});
