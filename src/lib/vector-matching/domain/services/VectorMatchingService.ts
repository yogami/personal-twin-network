/**
 * VectorMatchingService - Domain-agnostic vector similarity matching
 * 
 * Pure math operations for comparing embeddings using cosine similarity.
 * No external dependencies - works entirely on-device.
 * 
 * This is the extracted, reusable core from LocalMatchingService.
 */

import { IMatchingService, MatchRequest, MatchResult } from '../ports/IMatchingService';

/**
 * Interface for items that can be matched
 */
export interface MatchableItem {
    id: string;
    embedding?: number[];
    attributes?: string[];
}

/**
 * VectorMatchingService - Pure vector similarity operations
 */
export class VectorMatchingService implements IMatchingService<MatchableItem> {

    /**
     * Find matches for a source item from candidates
     * All computation happens on-device - no network calls
     */
    async findMatches(request: MatchRequest<MatchableItem>): Promise<MatchResult[]> {
        const { sourceItem, candidates, limit } = request;
        const results: MatchResult[] = [];

        for (const candidate of candidates) {
            const score = await this.calculateScore(sourceItem, candidate);
            const sharedAttributes = this.findSharedAttributes(
                sourceItem.attributes || [],
                candidate.attributes || []
            );

            results.push({
                matchedId: candidate.id,
                score,
                sharedAttributes,
            });
        }

        // Sort by score descending
        const sorted = results.sort((a, b) => b.score - a.score);
        return limit ? sorted.slice(0, limit) : sorted;
    }

    /**
     * Calculate similarity score between two items
     * Uses cosine similarity if embeddings available, fallback to attribute overlap
     */
    async calculateScore(item1: MatchableItem, item2: MatchableItem): Promise<number> {
        const embedding1 = item1.embedding;
        const embedding2 = item2.embedding;

        // If both have embeddings, use cosine similarity
        if (embedding1 && embedding2 && embedding1.length === embedding2.length) {
            const similarity = this.cosineSimilarity(embedding1, embedding2);
            // Convert from [-1, 1] to [0, 100] scale
            return Math.round(((similarity + 1) / 2) * 100);
        }

        // Fallback to basic attribute matching
        return this.calculateAttributeScore(
            item1.attributes || [],
            item2.attributes || []
        );
    }

    /**
     * Calculate cosine similarity between two vectors
     * Returns value between -1 and 1
     */
    cosineSimilarity(vec1: number[], vec2: number[]): number {
        if (vec1.length !== vec2.length) {
            throw new Error('Vectors must have same length');
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
        if (magnitude === 0) return 0;

        return dotProduct / magnitude;
    }

    /**
     * Fallback scoring using attribute overlap
     */
    private calculateAttributeScore(attrs1: string[], attrs2: string[]): number {
        const shared = this.findSharedAttributes(attrs1, attrs2);
        const baseScore = 30;
        const sharedScore = shared.length * 10;
        return Math.min(100, baseScore + sharedScore);
    }

    /**
     * Find attributes that appear in both arrays (case-insensitive)
     */
    private findSharedAttributes(arr1: string[], arr2: string[]): string[] {
        const set1 = new Set(arr1.map(s => s.toLowerCase()));
        return arr2.filter(item => set1.has(item.toLowerCase()));
    }
}
