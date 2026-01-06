/**
 * LocalMatchingService Characterization Tests
 * 
 * These tests lock the current behavior of LocalMatchingService BEFORE refactoring.
 * If any of these tests fail after refactoring, the behavior has changed.
 * 
 * @group characterization
 */

import { LocalMatchingService } from '@/infrastructure/matching/LocalMatchingService';
import { Twin, createTwin } from '@/domain/entities/Twin';

describe('LocalMatchingService Characterization', () => {
    let matchingService: LocalMatchingService;

    beforeEach(() => {
        matchingService = new LocalMatchingService();
    });

    // Helper to create mock twins with correct structure
    function createMockTwin(overrides: Partial<{
        id: string;
        name: string;
        headline: string;
        skills: string[];
        interests: string[];
        embedding: number[];
    }> = {}): Twin {
        return createTwin({
            userId: 'test-user-' + Math.random().toString(36).substr(2, 9),
            domain: 'networking',
            publicProfile: {
                name: overrides.name || 'Test User',
                headline: overrides.headline || 'Software Engineer',
                skills: overrides.skills || ['TypeScript', 'React'],
                interests: overrides.interests || ['AI', 'Privacy'],
                embedding: overrides.embedding,
            },
        });
    }

    describe('Cosine Similarity Matching', () => {
        it('should return 100% for identical embeddings', async () => {
            const embedding = [1, 0, 0, 0];
            const twin1 = createMockTwin({ embedding });
            const twin2 = createMockTwin({ embedding, name: 'Other' });

            const score = await matchingService.calculateScore(twin1, twin2);

            expect(score).toBe(100);
        });

        it('should return 50% for orthogonal embeddings', async () => {
            const twin1 = createMockTwin({ embedding: [1, 0] });
            const twin2 = createMockTwin({ embedding: [0, 1], name: 'Other' });

            const score = await matchingService.calculateScore(twin1, twin2);

            // Cosine of 90° = 0, normalized to [0,100] = 50
            expect(score).toBe(50);
        });

        it('should return 0% for opposite embeddings', async () => {
            const twin1 = createMockTwin({ embedding: [1, 0] });
            const twin2 = createMockTwin({ embedding: [-1, 0], name: 'Other' });

            const score = await matchingService.calculateScore(twin1, twin2);

            expect(score).toBe(0);
        });
    });

    describe('Fallback Skill/Interest Matching', () => {
        it('should use basic scoring when no embeddings', async () => {
            const twin1 = createMockTwin({
                skills: ['TypeScript', 'Python', 'AI'],
                interests: ['Privacy', 'Blockchain'],
            });
            const twin2 = createMockTwin({
                skills: ['TypeScript', 'Python'],
                interests: ['Privacy'],
                name: 'Other',
            });

            const score = await matchingService.calculateScore(twin1, twin2);

            // Base 30 + 2 shared skills (30) + 1 shared interest (10) = 70
            expect(score).toBe(70);
        });

        it('should return base score of 30 when no overlap', async () => {
            const twin1 = createMockTwin({
                skills: ['TypeScript'],
                interests: ['AI'],
                embedding: undefined,
            });
            const twin2 = createMockTwin({
                skills: ['Python'],
                interests: ['Blockchain'],
                name: 'Other',
                embedding: undefined,
            });

            const score = await matchingService.calculateScore(twin1, twin2);

            expect(score).toBe(30);
        });

        it('should cap score at 100', async () => {
            const twin1 = createMockTwin({
                skills: ['A', 'B', 'C', 'D', 'E', 'F'],
                interests: ['1', '2', '3', '4', '5'],
            });
            const twin2 = createMockTwin({
                skills: ['A', 'B', 'C', 'D', 'E', 'F'],
                interests: ['1', '2', '3', '4', '5'],
                name: 'Other',
            });

            const score = await matchingService.calculateScore(twin1, twin2);

            expect(score).toBe(100);
        });
    });

    describe('findMatches', () => {
        it('should return matches sorted by score descending', async () => {
            const userTwin = createMockTwin({ embedding: [1, 0, 0] });
            const candidate1 = createMockTwin({ embedding: [0, 1, 0], name: 'Low' });
            const candidate2 = createMockTwin({ embedding: [0.9, 0.1, 0], name: 'High' });
            const candidate3 = createMockTwin({ embedding: [0.5, 0.5, 0], name: 'Mid' });

            const matches = await matchingService.findMatches({
                userTwin,
                candidateTwins: [candidate1, candidate2, candidate3],
            });

            expect(matches.length).toBe(3);
            expect(matches[0].matchedProfile.name).toBe('High');
            expect(matches[1].matchedProfile.name).toBe('Mid');
            expect(matches[2].matchedProfile.name).toBe('Low');
        });

        it('should include shared interests in match result', async () => {
            const userTwin = createMockTwin({
                skills: ['TypeScript'],
                interests: ['AI', 'Privacy'],
            });
            const candidate = createMockTwin({
                skills: ['Python'],
                interests: ['AI', 'Blockchain'],
                name: 'Candidate',
            });

            const matches = await matchingService.findMatches({
                userTwin,
                candidateTwins: [candidate],
            });

            expect(matches[0].sharedInterests).toContain('AI');
        });
    });
});
