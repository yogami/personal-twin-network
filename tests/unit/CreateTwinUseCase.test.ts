/**
 * CreateTwinUseCase Unit Tests (TDD - Red Phase)
 */

import { CreateTwinUseCase, CreateTwinInput } from '@/application/use-cases/CreateTwinUseCase';
import { ITwinRepository } from '@/domain/interfaces/ITwinRepository';
import { Twin, TwinDomain } from '@/domain/entities/Twin';

describe('CreateTwinUseCase', () => {
    let mockTwinRepository: jest.Mocked<ITwinRepository>;
    let useCase: CreateTwinUseCase;

    beforeEach(() => {
        mockTwinRepository = {
            save: jest.fn(),
            findById: jest.fn(),
            findByUserId: jest.fn(),
            findByEventId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        useCase = new CreateTwinUseCase(mockTwinRepository);
    });

    it('should create a twin with valid input', async () => {
        const input: CreateTwinInput = {
            userId: 'user-123',
            domain: 'networking',
            publicProfile: {
                name: 'John Doe',
                headline: 'Software Engineer',
                skills: ['TypeScript', 'React'],
                interests: ['AI', 'ML'],
            },
        };

        mockTwinRepository.findByUserId.mockResolvedValue(null);
        mockTwinRepository.save.mockResolvedValue();

        const result = await useCase.execute(input);

        expect(result.success).toBe(true);
        expect(result.twin).toBeDefined();
        expect(result.twin?.publicProfile.name).toBe('John Doe');
        expect(mockTwinRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should fail if user already has a twin', async () => {
        const existingTwin: Twin = {
            id: 'twin-existing',
            userId: 'user-123',
            domain: 'networking',
            publicProfile: {
                name: 'Existing',
                headline: 'Engineer',
                skills: [],
                interests: [],
            },
            active: true,
            createdAt: new Date(),
        };

        mockTwinRepository.findByUserId.mockResolvedValue(existingTwin);

        const input: CreateTwinInput = {
            userId: 'user-123',
            domain: 'networking',
            publicProfile: {
                name: 'John Doe',
                headline: 'Engineer',
                skills: [],
                interests: [],
            },
        };

        const result = await useCase.execute(input);

        expect(result.success).toBe(false);
        expect(result.error).toBe('User already has a twin');
        expect(mockTwinRepository.save).not.toHaveBeenCalled();
    });

    it('should fail with invalid profile data', async () => {
        const input: CreateTwinInput = {
            userId: 'user-123',
            domain: 'networking',
            publicProfile: {
                name: '', // Invalid - empty name
                headline: 'Engineer',
                skills: [],
                interests: [],
            },
        };

        mockTwinRepository.findByUserId.mockResolvedValue(null);

        const result = await useCase.execute(input);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid twin profile');
    });
});
