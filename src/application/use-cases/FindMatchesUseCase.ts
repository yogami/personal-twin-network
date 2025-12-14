/**
 * FindMatchesUseCase - Application layer use case
 * 
 * Orchestrates the twin matching process:
 * 1. Get user's twin
 * 2. Get event attendees' twins
 * 3. Use AI matching service
 * 4. Return ranked matches
 */

import { Match, getTopMatches } from '@/domain/entities/Match';
import { ITwinRepository } from '@/domain/interfaces/ITwinRepository';
import { IMatchingService } from '@/domain/interfaces/IMatchingService';

export interface FindMatchesInput {
    userId: string;
    eventId: string;
    limit?: number;
}

export interface FindMatchesOutput {
    success: boolean;
    matches?: Match[];
    error?: string;
}

export class FindMatchesUseCase {
    private readonly DEFAULT_LIMIT = 3;

    constructor(
        private readonly twinRepository: ITwinRepository,
        private readonly matchingService: IMatchingService
    ) { }

    async execute(input: FindMatchesInput): Promise<FindMatchesOutput> {
        // 1. Get user's twin
        const userTwin = await this.twinRepository.findByUserId(input.userId);
        if (!userTwin) {
            return {
                success: false,
                error: 'User has no active twin',
            };
        }

        // 2. Get all twins in the event (excluding user's twin)
        const eventTwins = await this.twinRepository.findByEventId(input.eventId);
        const candidateTwins = eventTwins.filter((t) => t.userId !== input.userId);

        // 3. If no candidates, return empty matches
        if (candidateTwins.length === 0) {
            return {
                success: true,
                matches: [],
            };
        }

        // 4. Use AI matching service to find matches
        const allMatches = await this.matchingService.findMatches({
            userTwin,
            candidateTwins,
        });

        // 5. Return top N matches
        const limit = input.limit ?? this.DEFAULT_LIMIT;
        const topMatches = getTopMatches(allMatches, limit);

        return {
            success: true,
            matches: topMatches,
        };
    }
}
