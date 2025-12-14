/**
 * FindMatchesUseCase Unit Tests (TDD - Red Phase)
 */

import { FindMatchesUseCase, FindMatchesInput } from '@/application/use-cases/FindMatchesUseCase';
import { ITwinRepository } from '@/domain/interfaces/ITwinRepository';
import { IMatchingService } from '@/domain/interfaces/IMatchingService';
import { Twin } from '@/domain/entities/Twin';
import { Match } from '@/domain/entities/Match';

describe('FindMatchesUseCase', () => {
    let mockTwinRepository: jest.Mocked<ITwinRepository>;
    let mockMatchingService: jest.Mocked<IMatchingService>;
    let useCase: FindMatchesUseCase;

    const userTwin: Twin = {
        id: 'twin-user',
        userId: 'user-123',
        domain: 'networking',
        publicProfile: {
            name: 'John Doe',
            headline: 'Software Engineer',
            skills: ['TypeScript', 'AI'],
            interests: ['ML', 'Startups'],
        },
        active: true,
        createdAt: new Date(),
    };

    const candidateTwins: Twin[] = [
        {
            id: 'twin-1',
            userId: 'user-456',
            domain: 'networking',
            publicProfile: {
                name: 'Anna',
                headline: 'AI Researcher',
                skills: ['Python', 'ML'],
                interests: ['AI', 'Startups'],
            },
            active: true,
            createdAt: new Date(),
        },
        {
            id: 'twin-2',
            userId: 'user-789',
            domain: 'networking',
            publicProfile: {
                name: 'Max',
                headline: 'Product Manager',
                skills: ['Agile'],
                interests: ['Tech'],
            },
            active: true,
            createdAt: new Date(),
        },
    ];

    beforeEach(() => {
        mockTwinRepository = {
            save: jest.fn(),
            findById: jest.fn(),
            findByUserId: jest.fn(),
            findByEventId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };

        mockMatchingService = {
            findMatches: jest.fn(),
            calculateScore: jest.fn(),
        };

        useCase = new FindMatchesUseCase(mockTwinRepository, mockMatchingService);
    });

    it('should return top 3 matches sorted by score', async () => {
        const matches: Match[] = [
            {
                twinId: 'twin-user',
                matchedTwinId: 'twin-1',
                score: 92,
                sharedInterests: ['AI', 'Startups'],
                matchedProfile: { name: 'Anna', headline: 'AI Researcher' },
                createdAt: new Date(),
            },
            {
                twinId: 'twin-user',
                matchedTwinId: 'twin-2',
                score: 75,
                sharedInterests: ['Tech'],
                matchedProfile: { name: 'Max', headline: 'PM' },
                createdAt: new Date(),
            },
        ];

        mockTwinRepository.findByUserId.mockResolvedValue(userTwin);
        mockTwinRepository.findByEventId.mockResolvedValue(candidateTwins);
        mockMatchingService.findMatches.mockResolvedValue(matches);

        const input: FindMatchesInput = {
            userId: 'user-123',
            eventId: 'event-berlin',
            limit: 3,
        };

        const result = await useCase.execute(input);

        expect(result.success).toBe(true);
        expect(result.matches).toHaveLength(2);
        expect(result.matches![0].score).toBe(92);
        expect(result.matches![0].matchedProfile.name).toBe('Anna');
    });

    it('should fail if user has no twin', async () => {
        mockTwinRepository.findByUserId.mockResolvedValue(null);

        const input: FindMatchesInput = {
            userId: 'user-123',
            eventId: 'event-berlin',
            limit: 3,
        };

        const result = await useCase.execute(input);

        expect(result.success).toBe(false);
        expect(result.error).toBe('User has no active twin');
    });

    it('should return empty matches if no candidates in event', async () => {
        mockTwinRepository.findByUserId.mockResolvedValue(userTwin);
        mockTwinRepository.findByEventId.mockResolvedValue([]);
        mockMatchingService.findMatches.mockResolvedValue([]);

        const input: FindMatchesInput = {
            userId: 'user-123',
            eventId: 'event-empty',
            limit: 3,
        };

        const result = await useCase.execute(input);

        expect(result.success).toBe(true);
        expect(result.matches).toHaveLength(0);
    });
});
