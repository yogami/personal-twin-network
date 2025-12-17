/**
 * LocalMatchingService Unit Tests
 * 
 * TDD: Tests written before implementation
 * Tests on-device matching using cosine similarity of embeddings
 */

import { Twin, createTwin } from '@/domain/entities/Twin';
import { Match } from '@/domain/entities/Match';
import { LocalMatchingService } from '@/infrastructure/matching/LocalMatchingService';

// Test fixtures: Mock twins with embeddings
const createMockTwin = (overrides: Partial<{
    id: string;
    name: string;
    headline: string;
    skills: string[];
    interests: string[];
    embedding: number[];
}>): Twin => {
    const base = createTwin({
        userId: overrides.id || 'user-1',
        domain: 'networking',
        publicProfile: {
            name: overrides.name || 'Test User',
            headline: overrides.headline || 'Professional',
            skills: overrides.skills || ['TypeScript', 'React'],
            interests: overrides.interests || ['AI', 'Networking'],
            embedding: overrides.embedding || [0.1, 0.2, 0.3, 0.4, 0.5],
        },
    });
    return { ...base, id: overrides.id || base.id };
};

describe('LocalMatchingService', () => {
    let service: LocalMatchingService;

    beforeEach(() => {
        service = new LocalMatchingService();
    });

    describe('calculateScore', () => {
        it('should return 100 for identical embeddings', async () => {
            const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
            const twin1 = createMockTwin({ id: 'twin-1', embedding });
            const twin2 = createMockTwin({ id: 'twin-2', embedding });

            const score = await service.calculateScore(twin1, twin2);

            expect(score).toBe(100);
        });

        it('should return lower score for dissimilar embeddings', async () => {
            // Opposite direction vectors have negative cosine similarity
            const twin1 = createMockTwin({
                id: 'twin-1',
                embedding: [1, 0, 0, 0, 0],
            });
            const twin2 = createMockTwin({
                id: 'twin-2',
                embedding: [-0.8, 0.6, 0, 0, 0], // Mostly opposite direction
            });

            const score = await service.calculateScore(twin1, twin2);

            // Negative cosine similarity maps below 50
            expect(score).toBeLessThan(50);
        });

        it('should return 50 for orthogonal embeddings (neutral match)', async () => {
            // Orthogonal vectors have 0 cosine similarity
            // On our [0,100] scale, this maps to 50 (neutral)
            const twin1 = createMockTwin({
                id: 'twin-1',
                embedding: [1, 0, 0],
            });
            const twin2 = createMockTwin({
                id: 'twin-2',
                embedding: [0, 1, 0],
            });

            const score = await service.calculateScore(twin1, twin2);

            // Cosine similarity of 0 -> (0+1)/2*100 = 50
            expect(score).toBe(50);
        });

        it('should handle missing embeddings with fallback scoring', async () => {
            const twin1 = createMockTwin({
                id: 'twin-1',
                skills: ['AI', 'Machine Learning'],
                embedding: undefined,
            });
            const twin2 = createMockTwin({
                id: 'twin-2',
                skills: ['AI', 'Data Science'],
                embedding: undefined,
            });

            const score = await service.calculateScore(twin1, twin2);

            // Should use skill/interest overlap fallback
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(100);
        });
    });

    describe('findMatches', () => {
        it('should return empty array when no candidates', async () => {
            const userTwin = createMockTwin({ id: 'user-twin' });

            const matches = await service.findMatches({
                userTwin,
                candidateTwins: [],
            });

            expect(matches).toEqual([]);
        });

        it('should return matches sorted by score descending', async () => {
            const userTwin = createMockTwin({
                id: 'user-twin',
                embedding: [1, 0, 0, 0, 0],
            });

            const highMatchTwin = createMockTwin({
                id: 'high-match',
                name: 'High Match',
                embedding: [0.9, 0.1, 0, 0, 0], // Very similar
            });

            const lowMatchTwin = createMockTwin({
                id: 'low-match',
                name: 'Low Match',
                embedding: [0, 1, 0, 0, 0], // Orthogonal
            });

            const mediumMatchTwin = createMockTwin({
                id: 'medium-match',
                name: 'Medium Match',
                embedding: [0.5, 0.5, 0, 0, 0], // Partial match
            });

            const matches = await service.findMatches({
                userTwin,
                candidateTwins: [lowMatchTwin, highMatchTwin, mediumMatchTwin],
            });

            expect(matches).toHaveLength(3);
            expect(matches[0].matchedProfile.name).toBe('High Match');
            expect(matches[1].matchedProfile.name).toBe('Medium Match');
            expect(matches[2].matchedProfile.name).toBe('Low Match');
        });

        it('should calculate shared interests correctly', async () => {
            const userTwin = createMockTwin({
                id: 'user-twin',
                skills: ['TypeScript', 'React', 'AI'],
                interests: ['Machine Learning', 'Networking'],
            });

            const candidateTwin = createMockTwin({
                id: 'candidate',
                name: 'Candidate',
                skills: ['TypeScript', 'Python', 'AI'],
                interests: ['Machine Learning', 'Startups'],
            });

            const matches = await service.findMatches({
                userTwin,
                candidateTwins: [candidateTwin],
            });

            expect(matches).toHaveLength(1);
            // Shared: TypeScript, AI, Machine Learning
            expect(matches[0].sharedInterests).toContain('TypeScript');
            expect(matches[0].sharedInterests).toContain('AI');
        });

        it('should include correct match metadata', async () => {
            const userTwin = createMockTwin({ id: 'user-twin' });
            const candidateTwin = createMockTwin({
                id: 'candidate-id',
                name: 'Jane Developer',
                headline: 'Senior Engineer',
            });

            const matches = await service.findMatches({
                userTwin,
                candidateTwins: [candidateTwin],
            });

            expect(matches).toHaveLength(1);
            const match = matches[0];
            expect(match.twinId).toBe(userTwin.id);
            expect(match.matchedTwinId).toBe('candidate-id');
            expect(match.matchedProfile.name).toBe('Jane Developer');
            expect(match.matchedProfile.headline).toBe('Senior Engineer');
            expect(match.score).toBeGreaterThanOrEqual(0);
            expect(match.score).toBeLessThanOrEqual(100);
        });
    });

    describe('privacy guarantees', () => {
        it('should not make any external API calls', async () => {
            // Mock fetch to detect any network calls
            const originalFetch = global.fetch;
            const fetchSpy = jest.fn();
            global.fetch = fetchSpy;

            try {
                const userTwin = createMockTwin({ id: 'user' });
                const candidate = createMockTwin({ id: 'candidate' });

                await service.findMatches({
                    userTwin,
                    candidateTwins: [candidate],
                });

                expect(fetchSpy).not.toHaveBeenCalled();
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('should work completely offline', async () => {
            // Service should function without any network dependency
            const userTwin = createMockTwin({
                id: 'user',
                embedding: [0.5, 0.5, 0.5],
            });
            const candidates = [
                createMockTwin({ id: 'c1', embedding: [0.4, 0.6, 0.5] }),
                createMockTwin({ id: 'c2', embedding: [0.3, 0.3, 0.9] }),
            ];

            const matches = await service.findMatches({
                userTwin,
                candidateTwins: candidates,
            });

            expect(matches).toHaveLength(2);
            // Each match should have valid scores
            matches.forEach(match => {
                expect(typeof match.score).toBe('number');
                expect(match.score).toBeGreaterThanOrEqual(0);
            });
        });
    });
});
