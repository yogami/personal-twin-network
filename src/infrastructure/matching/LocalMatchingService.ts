/**
 * LocalMatchingService - On-device privacy-preserving matching
 * 
 * Implements IMatchingService interface for local matching using
 * cosine similarity of embeddings. No external API calls.
 * 
 * Following Interface Segregation Principle (ISP):
 * - Implements same interface as GeminiService for interchangeability
 * - Allows switching between local and cloud matching via DI
 */

import { Twin } from '@/domain/entities/Twin';
import { Match, createMatch } from '@/domain/entities/Match';
import { IMatchingService, MatchRequest } from '@/domain/interfaces/IMatchingService';

/**
 * LocalMatchingService - Pure on-device matching
 * 
 * Uses cosine similarity of embeddings stored on twins.
 * Falls back to skill/interest overlap if embeddings not available.
 */
export class LocalMatchingService implements IMatchingService {

    /**
     * Find matches for a twin from a pool of candidates
     * All computation happens on-device - no network calls
     */
    async findMatches(request: MatchRequest): Promise<Match[]> {
        const { userTwin, candidateTwins } = request;
        const matches: Match[] = [];

        for (const candidate of candidateTwins) {
            const score = await this.calculateScore(userTwin, candidate);
            const sharedInterests = this.findSharedInterests(userTwin, candidate);
            const reasoning = this.generateLocalReasoning(userTwin, candidate, score, sharedInterests);

            matches.push(
                createMatch({
                    twinId: userTwin.id,
                    matchedTwinId: candidate.id,
                    score,
                    sharedInterests,
                    reasoning,
                    matchedProfile: {
                        name: candidate.publicProfile.name,
                        headline: candidate.publicProfile.headline,
                    },
                })
            );
        }

        // Sort by score descending
        return matches.sort((a, b) => b.score - a.score);
    }

    /**
     * Generate simple reasoning for local matches
     */
    private generateLocalReasoning(twin1: Twin, twin2: Twin, score: number, shared: string[]): string {
        if (score > 85) {
            return `Strong alignment in ${shared.slice(0, 2).join(' and ')}. Both focus on similar high-level domains.`;
        }
        if (shared.length > 0) {
            return `You share interests in ${shared.slice(0, 2).join(', ')}. Worth chatting about potential overlaps.`;
        }
        return `Compatible professional profiles with complementary skill sets.`;
    }

    /**
     * Calculate compatibility score between two twins
     * Uses cosine similarity of embeddings, or fallback to skill/interest matching
     */
    async calculateScore(twin1: Twin, twin2: Twin): Promise<number> {
        const embedding1 = twin1.publicProfile.embedding;
        const embedding2 = twin2.publicProfile.embedding;

        // If both have embeddings, use cosine similarity
        if (embedding1 && embedding2 && embedding1.length === embedding2.length) {
            const similarity = this.cosineSimilarity(embedding1, embedding2);
            // Convert from [-1, 1] to [0, 100] scale
            return Math.round(((similarity + 1) / 2) * 100);
        }

        // Fallback to basic skill/interest matching
        return this.calculateBasicScore(twin1, twin2);
    }

    /**
     * Calculate cosine similarity between two vectors
     * Returns value between -1 and 1
     */
    private cosineSimilarity(vec1: number[], vec2: number[]): number {
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
     * Fallback scoring using skill and interest overlap
     * Used when embeddings are not available
     */
    private calculateBasicScore(twin1: Twin, twin2: Twin): number {
        const sharedSkills = this.findSharedItems(
            twin1.publicProfile.skills,
            twin2.publicProfile.skills
        );
        const sharedInterests = this.findSharedItems(
            twin1.publicProfile.interests,
            twin2.publicProfile.interests
        );

        // Weighted scoring: skills count more
        const skillScore = sharedSkills.length * 15;
        const interestScore = sharedInterests.length * 10;
        const baseScore = 30; // Base compatibility

        return Math.min(100, baseScore + skillScore + interestScore);
    }

    /**
     * Find shared interests and skills between two twins
     */
    private findSharedInterests(twin1: Twin, twin2: Twin): string[] {
        return this.findSharedItems(
            [...twin1.publicProfile.interests, ...twin1.publicProfile.skills],
            [...twin2.publicProfile.interests, ...twin2.publicProfile.skills]
        );
    }

    /**
     * Find items that appear in both arrays (case-insensitive)
     */
    private findSharedItems(arr1: string[], arr2: string[]): string[] {
        const set1 = new Set(arr1.map((s) => s.toLowerCase()));
        // Return original case from arr2
        return arr2.filter((item) => set1.has(item.toLowerCase()));
    }
}
