/**
 * IMatchingService - Port interface for vector matching services
 * 
 * Follows Interface Segregation Principle.
 * Allows swapping between local and cloud matching implementations.
 */

/**
 * Input for a matching request
 */
export interface MatchRequest<T> {
    /** The source item to match against */
    sourceItem: T;
    /** Candidate items to compare */
    candidates: T[];
    /** Optional limit on results */
    limit?: number;
}

/**
 * Result of a match operation
 */
export interface MatchResult {
    /** ID of the matched item */
    matchedId: string;
    /** Similarity score (0-100) */
    score: number;
    /** Common attributes found */
    sharedAttributes: string[];
    /** Optional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Generic matching service interface
 */
export interface IMatchingService<T> {
    /**
     * Find matches for a source item from candidates
     */
    findMatches(request: MatchRequest<T>): Promise<MatchResult[]>;

    /**
     * Calculate similarity score between two items
     */
    calculateScore(item1: T, item2: T): Promise<number>;
}
