/**
 * CreateTwinUseCase - Application layer use case
 * 
 * Following Single Responsibility Principle:
 * - Only responsible for orchestrating twin creation flow
 * 
 * Following Dependency Inversion:
 * - Depends on ITwinRepository abstraction, not concrete implementation
 */

import { Twin, TwinDomain, createTwin, validateTwin, PublicProfile } from '@/domain/entities/Twin';
import { ITwinRepository } from '@/domain/interfaces/ITwinRepository';

export interface CreateTwinInput {
    userId: string;
    domain: TwinDomain;
    publicProfile: PublicProfile;
}

export interface CreateTwinOutput {
    success: boolean;
    twin?: Twin;
    error?: string;
}

export class CreateTwinUseCase {
    constructor(private readonly twinRepository: ITwinRepository) { }

    async execute(input: CreateTwinInput): Promise<CreateTwinOutput> {
        // 1. Check if user already has a twin
        const existingTwin = await this.twinRepository.findByUserId(input.userId);
        if (existingTwin) {
            return {
                success: false,
                error: 'User already has a twin',
            };
        }

        // 2. Create twin entity
        const twin = createTwin({
            userId: input.userId,
            domain: input.domain,
            publicProfile: input.publicProfile,
        });

        // 3. Validate twin
        if (!validateTwin(twin)) {
            return {
                success: false,
                error: 'Invalid twin profile',
            };
        }

        // 4. Persist twin
        await this.twinRepository.save(twin);

        return {
            success: true,
            twin,
        };
    }
}
