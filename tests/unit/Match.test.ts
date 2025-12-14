/**
 * Match Value Object Unit Tests (TDD - Red Phase)
 */

import { Match, createMatch, isHighQualityMatch } from '@/domain/entities/Match';

describe('Match Value Object', () => {
    describe('createMatch', () => {
        it('should create a match with score and shared interests', () => {
            const match = createMatch({
                twinId: 'twin-1',
                matchedTwinId: 'twin-2',
                score: 92,
                sharedInterests: ['AI', 'Machine Learning', 'TypeScript'],
                matchedProfile: {
                    name: 'Anna',
                    headline: 'AI Researcher',
                },
            });

            expect(match.twinId).toBe('twin-1');
            expect(match.matchedTwinId).toBe('twin-2');
            expect(match.score).toBe(92);
            expect(match.sharedInterests).toContain('AI');
            expect(match.matchedProfile.name).toBe('Anna');
        });

        it('should clamp score between 0 and 100', () => {
            const matchOver = createMatch({
                twinId: 'twin-1',
                matchedTwinId: 'twin-2',
                score: 150,
                sharedInterests: [],
                matchedProfile: { name: 'Test', headline: '' },
            });

            const matchUnder = createMatch({
                twinId: 'twin-1',
                matchedTwinId: 'twin-2',
                score: -20,
                sharedInterests: [],
                matchedProfile: { name: 'Test', headline: '' },
            });

            expect(matchOver.score).toBe(100);
            expect(matchUnder.score).toBe(0);
        });
    });

    describe('isHighQualityMatch', () => {
        it('should return true for matches with score >= 80', () => {
            const match: Match = {
                twinId: 'twin-1',
                matchedTwinId: 'twin-2',
                score: 85,
                sharedInterests: ['AI'],
                matchedProfile: { name: 'Anna', headline: 'Engineer' },
                createdAt: new Date(),
            };

            expect(isHighQualityMatch(match)).toBe(true);
        });

        it('should return false for matches with score < 80', () => {
            const match: Match = {
                twinId: 'twin-1',
                matchedTwinId: 'twin-2',
                score: 65,
                sharedInterests: ['AI'],
                matchedProfile: { name: 'Bob', headline: 'Designer' },
                createdAt: new Date(),
            };

            expect(isHighQualityMatch(match)).toBe(false);
        });

        it('should return true for exactly 80 score', () => {
            const match: Match = {
                twinId: 'twin-1',
                matchedTwinId: 'twin-2',
                score: 80,
                sharedInterests: [],
                matchedProfile: { name: 'Max', headline: 'PM' },
                createdAt: new Date(),
            };

            expect(isHighQualityMatch(match)).toBe(true);
        });
    });
});
