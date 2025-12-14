/**
 * Match Value Object - represents a compatibility match between two twins
 * 
 * This is a value object (immutable) following Domain-Driven Design principles.
 * It represents the result of twin negotiation/matching.
 */

/**
 * Minimal profile info for display in match results
 */
export interface MatchedProfile {
    name: string;
    headline: string;
}

/**
 * Match value object - result of twin-to-twin comparison
 */
export interface Match {
    twinId: string;
    matchedTwinId: string;
    score: number; // 0-100 compatibility score
    sharedInterests: string[];
    matchedProfile: MatchedProfile;
    createdAt: Date;
}

/**
 * Data required to create a new Match
 */
export interface CreateMatchData {
    twinId: string;
    matchedTwinId: string;
    score: number;
    sharedInterests: string[];
    matchedProfile: MatchedProfile;
}

/**
 * Factory function to create a Match value object
 * Clamps score between 0 and 100
 */
export function createMatch(data: CreateMatchData): Match {
    return {
        twinId: data.twinId,
        matchedTwinId: data.matchedTwinId,
        score: Math.max(0, Math.min(100, data.score)),
        sharedInterests: data.sharedInterests,
        matchedProfile: data.matchedProfile,
        createdAt: new Date(),
    };
}

/**
 * Determines if a match is high quality (score >= 80)
 * Used to filter top matches for push notifications
 */
export function isHighQualityMatch(match: Match): boolean {
    return match.score >= 80;
}

/**
 * Sorts matches by score (descending)
 * Pure function - returns new array
 */
export function sortMatchesByScore(matches: Match[]): Match[] {
    return [...matches].sort((a, b) => b.score - a.score);
}

/**
 * Gets top N matches from a list
 */
export function getTopMatches(matches: Match[], count: number): Match[] {
    return sortMatchesByScore(matches).slice(0, count);
}

/**
 * Filters matches above a minimum score threshold
 */
export function filterMatchesByScore(matches: Match[], minScore: number): Match[] {
    return matches.filter((match) => match.score >= minScore);
}
