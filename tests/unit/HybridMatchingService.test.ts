/**
 * HybridMatchingService Unit Tests
 *
 * Tests the intelligent local/cloud matching selection
 */

import { HybridMatchingService, HybridMatchingConfig } from '@/application/services/HybridMatchingService';
import { Twin, createTwin } from '@/domain/entities/Twin';
import { Match } from '@/domain/entities/Match';
import { IMatchingService, MatchRequest } from '@/domain/interfaces/IMatchingService';

// Mock the cloud service
class MockCloudService implements IMatchingService {
    findMatchesCalled = false;

    async findMatches(request: MatchRequest): Promise<Match[]> {
        this.findMatchesCalled = true;
        return request.candidateTwins.map((candidate, index) => ({
            id: `cloud-match-${index}`,
            twinId: request.userTwin.id,
            matchedTwinId: candidate.id,
            score: 90 - index * 5,
            sharedInterests: ['Cloud Matched'],
            matchedProfile: {
                name: candidate.publicProfile.name,
                headline: candidate.publicProfile.headline,
            },
            createdAt: new Date(),
        }));
    }

    async calculateScore(): Promise<number> {
        return 85;
    }
}

// Helper to create test twins
const createMockTwin = (id: string, name: string = 'Test User'): Twin => {
    return createTwin({
        userId: id,
        domain: 'networking',
        publicProfile: {
            name,
            headline: 'Professional',
            skills: ['TypeScript'],
            interests: ['AI'],
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        },
    });
};

describe('HybridMatchingService', () => {
    let mockCloudService: MockCloudService;

    beforeEach(() => {
        mockCloudService = new MockCloudService();
    });

    describe('mode selection', () => {
        it('should use local matching for small candidate counts', async () => {
            const config: Partial<HybridMatchingConfig> = {
                cloudThreshold: 50,
                enableCloudMatching: true,
            };
            const service = new HybridMatchingService(config, mockCloudService);

            const userTwin = createMockTwin('user');
            const candidates = Array.from({ length: 10 }, (_, i) =>
                createMockTwin(`candidate-${i}`, `User ${i}`)
            );

            await service.findMatches({ userTwin, candidateTwins: candidates });

            expect(service.getLastMode()).toBe('local');
            expect(mockCloudService.findMatchesCalled).toBe(false);
        });

        it('should use hybrid matching for large candidate counts', async () => {
            const config: Partial<HybridMatchingConfig> = {
                cloudThreshold: 50,
                enableCloudMatching: true,
            };
            const service = new HybridMatchingService(config, mockCloudService);

            const userTwin = createMockTwin('user');
            const candidates = Array.from({ length: 60 }, (_, i) =>
                createMockTwin(`candidate-${i}`, `User ${i}`)
            );

            await service.findMatches({ userTwin, candidateTwins: candidates });

            expect(service.getLastMode()).toBe('hybrid');
            expect(mockCloudService.findMatchesCalled).toBe(true);
        });

        it('should fallback to local when cloud is disabled', async () => {
            const config: Partial<HybridMatchingConfig> = {
                cloudThreshold: 50,
                enableCloudMatching: false,
            };
            const service = new HybridMatchingService(config, mockCloudService);

            const userTwin = createMockTwin('user');
            const candidates = Array.from({ length: 60 }, (_, i) =>
                createMockTwin(`candidate-${i}`, `User ${i}`)
            );

            await service.findMatches({ userTwin, candidateTwins: candidates });

            expect(service.getLastMode()).toBe('local');
            expect(mockCloudService.findMatchesCalled).toBe(false);
        });
    });

    describe('local matching', () => {
        it('should return sorted matches', async () => {
            const service = new HybridMatchingService({}, mockCloudService);
            const userTwin = createMockTwin('user');
            const candidates = [
                createMockTwin('low', 'Low Match'),
                createMockTwin('high', 'High Match'),
            ];

            const matches = await service.findMatches({
                userTwin,
                candidateTwins: candidates,
            });

            expect(matches).toHaveLength(2);
            expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
        });

        it('should handle empty candidates', async () => {
            const service = new HybridMatchingService({}, mockCloudService);
            const userTwin = createMockTwin('user');

            const matches = await service.findMatches({
                userTwin,
                candidateTwins: [],
            });

            expect(matches).toEqual([]);
        });
    });

    describe('isCloudAvailable', () => {
        it('should return true when cloud service provided and enabled', () => {
            const service = new HybridMatchingService(
                { enableCloudMatching: true },
                mockCloudService
            );
            expect(service.isCloudAvailable()).toBe(true);
        });

        it('should return false when cloud matching disabled', () => {
            const service = new HybridMatchingService(
                { enableCloudMatching: false },
                mockCloudService
            );
            expect(service.isCloudAvailable()).toBe(false);
        });
    });

    describe('calculateScore', () => {
        it('should always use local service for pairwise scoring', async () => {
            const service = new HybridMatchingService({}, mockCloudService);
            const twin1 = createMockTwin('twin1');
            const twin2 = createMockTwin('twin2');

            const score = await service.calculateScore(twin1, twin2);

            // Local service would give ~100 for identical embeddings
            expect(score).toBe(100);
        });
    });
});
