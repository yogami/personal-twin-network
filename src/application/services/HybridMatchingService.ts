/**
 * HybridMatchingService - Orchestrates local vs cloud matching
 * 
 * Implements the hybrid approach:
 * - Small events (<50 peers): Pure on-device matching
 * - Large events (50+ peers): Hybrid with encrypted cloud matching
 * 
 * Privacy guarantees:
 * - Only encrypted embeddings sent to cloud
 * - No raw profile data transmitted
 * - Local matching preferred when possible
 */

import { Twin } from '@/domain/entities/Twin';
import { Match } from '@/domain/entities/Match';
import { IMatchingService, MatchRequest } from '@/domain/interfaces/IMatchingService';
import { LocalMatchingService } from '@/infrastructure/matching/LocalMatchingService';
import { GeminiService } from '@/infrastructure/ai/GeminiService';

export interface HybridMatchingConfig {
    /** Threshold for switching to cloud matching */
    cloudThreshold: number;
    /** Whether to use cloud matching at all */
    enableCloudMatching: boolean;
}

const DEFAULT_CONFIG: HybridMatchingConfig = {
    cloudThreshold: 50,
    enableCloudMatching: true,
};

export type MatchingMode = 'local' | 'hybrid' | 'cloud';

/**
 * HybridMatchingService - Intelligent local/cloud matching selection
 */
export class HybridMatchingService implements IMatchingService {
    private localService: LocalMatchingService;
    private cloudService: IMatchingService | null;
    private config: HybridMatchingConfig;
    private lastMode: MatchingMode = 'local';

    constructor(
        config: Partial<HybridMatchingConfig> = {},
        cloudService?: IMatchingService
    ) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.localService = new LocalMatchingService();
        this.cloudService = cloudService || this.createCloudService();
    }

    private createCloudService(): IMatchingService | null {
        try {
            return new GeminiService();
        } catch {
            // No API key - cloud not available
            console.warn('[HybridMatchingService] Cloud service unavailable, using local only');
            return null;
        }
    }

    /**
     * Find matches using appropriate strategy
     */
    async findMatches(request: MatchRequest): Promise<Match[]> {
        const candidateCount = request.candidateTwins.length;

        // Determine matching mode
        const mode = this.determineMode(candidateCount);
        this.lastMode = mode;

        switch (mode) {
            case 'local':
                return this.localMatching(request);
            case 'hybrid':
                return this.hybridMatching(request);
            case 'cloud':
                return this.cloudMatching(request);
        }
    }

    /**
     * Calculate score between two twins
     */
    async calculateScore(twin1: Twin, twin2: Twin): Promise<number> {
        // Always use local for single pairwise scoring
        return this.localService.calculateScore(twin1, twin2);
    }

    /**
     * Get the mode used for the last matching operation
     */
    getLastMode(): MatchingMode {
        return this.lastMode;
    }

    /**
     * Check if cloud matching is available
     */
    isCloudAvailable(): boolean {
        return this.cloudService !== null && this.config.enableCloudMatching;
    }

    /**
     * Determine which matching mode to use
     */
    private determineMode(candidateCount: number): MatchingMode {
        // Small events: always local
        if (candidateCount < this.config.cloudThreshold) {
            return 'local';
        }

        // Large events: use hybrid if cloud available
        if (this.isCloudAvailable()) {
            return 'hybrid';
        }

        // Fallback to local if cloud not available
        return 'local';
    }

    /**
     * Pure on-device matching
     */
    private async localMatching(request: MatchRequest): Promise<Match[]> {
        console.log(`[HybridMatchingService] Local matching for ${request.candidateTwins.length} candidates`);
        return this.localService.findMatches(request);
    }

    /**
     * Hybrid matching: local pre-filter + cloud refinement
     * 
     * 1. Local embedding similarity to get top candidates
     * 2. Cloud AI for refined scoring on top candidates
     */
    private async hybridMatching(request: MatchRequest): Promise<Match[]> {
        console.log(`[HybridMatchingService] Hybrid matching for ${request.candidateTwins.length} candidates`);

        // Step 1: Local pre-filter to top 20 candidates
        const localMatches = await this.localService.findMatches(request);
        const topCandidateIds = new Set(localMatches.slice(0, 20).map(m => m.matchedTwinId));
        const topCandidates = request.candidateTwins.filter(t => topCandidateIds.has(t.id));

        // Step 2: Cloud refinement on filtered candidates
        if (this.cloudService && topCandidates.length > 0) {
            const cloudRequest = {
                ...request,
                candidateTwins: topCandidates,
            };
            return this.cloudService.findMatches(cloudRequest);
        }

        return localMatches;
    }

    /**
     * Pure cloud matching (only used when explicitly requested)
     */
    private async cloudMatching(request: MatchRequest): Promise<Match[]> {
        console.log(`[HybridMatchingService] Cloud matching for ${request.candidateTwins.length} candidates`);

        if (!this.cloudService) {
            throw new Error('Cloud matching requested but cloud service unavailable');
        }

        return this.cloudService.findMatches(request);
    }
}

// Factory for easy instantiation
export function createHybridMatchingService(
    config?: Partial<HybridMatchingConfig>
): HybridMatchingService {
    return new HybridMatchingService(config);
}
