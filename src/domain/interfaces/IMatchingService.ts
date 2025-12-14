/**
 * IMatchingService - Interface for AI matching service
 * 
 * Following Interface Segregation Principle (ISP):
 * - Small, focused interface for matching only
 * - Allows swapping Gemini for other AI providers
 */

import { Twin } from '../entities/Twin';
import { Match } from '../entities/Match';

export interface MatchRequest {
    userTwin: Twin;
    candidateTwins: Twin[];
    eventContext?: {
        theme: string;
        description: string;
    };
}

export interface IMatchingService {
    /**
     * Find matches for a twin from a pool of candidates
     * Returns sorted matches by compatibility score
     */
    findMatches(request: MatchRequest): Promise<Match[]>;

    /**
     * Calculate compatibility score between two twins
     */
    calculateScore(twin1: Twin, twin2: Twin): Promise<number>;
}
