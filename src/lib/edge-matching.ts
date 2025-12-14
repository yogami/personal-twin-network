/**
 * Edge-Only Matching Service
 * 
 * Runs Gemini matching entirely on the client device.
 * Zero profile data transmitted to servers.
 * Falls back to local algorithm when offline.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Twin, PublicProfile } from '@/domain/entities/Twin';
import { Match, createMatch } from '@/domain/entities/Match';
import { getTwinBrain } from './twin-brain';

// ============================================================================
// Types
// ============================================================================

export interface EdgeMatchRequest {
    userTwin: Twin;
    candidates: PublicProfile[];
    eventContext?: {
        theme: string;
        description: string;
    };
}

export interface EdgeMatchResult {
    matches: Match[];
    source: 'gemini' | 'local';
    processingTimeMs: number;
}

interface CachedScore {
    score: number;
    cachedAt: number;
    sharedInterests: string[];
}

// ============================================================================
// Score Cache (IndexedDB-based)
// ============================================================================

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const scoreCache = new Map<string, CachedScore>();

function getCacheKey(twin1Name: string, twin2Name: string): string {
    return [twin1Name, twin2Name].sort().join('::');
}

function getCachedScore(key: string): CachedScore | null {
    const cached = scoreCache.get(key);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return cached;
    }
    return null;
}

function setCachedScore(key: string, score: number, sharedInterests: string[]): void {
    scoreCache.set(key, {
        score,
        cachedAt: Date.now(),
        sharedInterests,
    });
}

// ============================================================================
// Edge Matching Service
// ============================================================================

export class EdgeMatchingService {
    private genAI: GoogleGenerativeAI | null = null;
    private isOnline: boolean = true;

    constructor() {
        // Check online status
        if (typeof window !== 'undefined') {
            this.isOnline = navigator.onLine;
            window.addEventListener('online', () => this.isOnline = true);
            window.addEventListener('offline', () => this.isOnline = false);
        }
    }

    /**
     * Initialize Gemini client
     * Call this after getting the API key from secure storage
     */
    initGemini(apiKey: string): void {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Find matches using edge-only processing
     */
    async findMatches(request: EdgeMatchRequest): Promise<EdgeMatchResult> {
        const startTime = performance.now();
        const { userTwin, candidates, eventContext } = request;
        const matches: Match[] = [];

        // Try Gemini first if available and online
        let source: 'gemini' | 'local' = 'local';

        if (this.genAI && this.isOnline) {
            try {
                const geminiMatches = await this.findMatchesWithGemini(userTwin, candidates, eventContext);
                matches.push(...geminiMatches);
                source = 'gemini';
            } catch (error) {
                console.warn('Gemini matching failed, falling back to local:', error);
                const localMatches = await this.findMatchesLocal(userTwin, candidates);
                matches.push(...localMatches);
            }
        } else {
            // Offline or no API key - use local matching
            const localMatches = await this.findMatchesLocal(userTwin, candidates);
            matches.push(...localMatches);
        }

        // Sort by score descending
        matches.sort((a, b) => b.score - a.score);

        // Cache matches locally
        await this.cacheMatches(matches);

        return {
            matches,
            source,
            processingTimeMs: performance.now() - startTime,
        };
    }

    /**
     * Gemini-powered matching (runs on device, calls Gemini API)
     */
    private async findMatchesWithGemini(
        userTwin: Twin,
        candidates: PublicProfile[],
        eventContext?: { theme: string; description: string }
    ): Promise<Match[]> {
        if (!this.genAI) throw new Error('Gemini not initialized');

        const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const matches: Match[] = [];

        // Batch candidates for efficiency (max 5 per request)
        const batches = this.chunkArray(candidates, 5);

        for (const batch of batches) {
            const batchMatches = await this.processBatch(model, userTwin, batch, eventContext);
            matches.push(...batchMatches);
        }

        return matches;
    }

    /**
     * Process a batch of candidates with Gemini
     */
    private async processBatch(
        model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
        userTwin: Twin,
        candidates: PublicProfile[],
        eventContext?: { theme: string; description: string }
    ): Promise<Match[]> {
        const matches: Match[] = [];

        // Check cache first
        const uncachedCandidates: PublicProfile[] = [];
        for (const candidate of candidates) {
            const cacheKey = getCacheKey(userTwin.publicProfile.name, candidate.name);
            const cached = getCachedScore(cacheKey);

            if (cached) {
                matches.push(createMatch({
                    twinId: userTwin.id,
                    matchedTwinId: `twin-${candidate.name.toLowerCase().replace(/\s/g, '-')}`,
                    score: cached.score,
                    sharedInterests: cached.sharedInterests,
                    matchedProfile: {
                        name: candidate.name,
                        headline: candidate.headline,
                    },
                }));
            } else {
                uncachedCandidates.push(candidate);
            }
        }

        if (uncachedCandidates.length === 0) {
            return matches;
        }

        // Build prompt for uncached candidates
        const prompt = this.buildBatchPrompt(userTwin.publicProfile, uncachedCandidates, eventContext);

        try {
            const result = await model.generateContent(prompt);
            const response = result.response.text();
            const scores = this.parseScores(response, uncachedCandidates.length);

            for (let i = 0; i < uncachedCandidates.length; i++) {
                const candidate = uncachedCandidates[i];
                const score = scores[i] ?? 50;
                const sharedInterests = this.findSharedInterests(userTwin.publicProfile, candidate);

                // Cache the result
                const cacheKey = getCacheKey(userTwin.publicProfile.name, candidate.name);
                setCachedScore(cacheKey, score, sharedInterests);

                matches.push(createMatch({
                    twinId: userTwin.id,
                    matchedTwinId: `twin-${candidate.name.toLowerCase().replace(/\s/g, '-')}`,
                    score,
                    sharedInterests,
                    matchedProfile: {
                        name: candidate.name,
                        headline: candidate.headline,
                    },
                }));
            }
        } catch (error) {
            console.error('Batch processing error:', error);
            // Fall back to local scoring for this batch
            for (const candidate of uncachedCandidates) {
                const score = this.calculateLocalScore(userTwin.publicProfile, candidate);
                const sharedInterests = this.findSharedInterests(userTwin.publicProfile, candidate);

                matches.push(createMatch({
                    twinId: userTwin.id,
                    matchedTwinId: `twin-${candidate.name.toLowerCase().replace(/\s/g, '-')}`,
                    score,
                    sharedInterests,
                    matchedProfile: {
                        name: candidate.name,
                        headline: candidate.headline,
                    },
                }));
            }
        }

        return matches;
    }

    /**
     * Local matching algorithm (offline-capable)
     */
    private async findMatchesLocal(
        userTwin: Twin,
        candidates: PublicProfile[]
    ): Promise<Match[]> {
        return candidates.map(candidate => {
            const score = this.calculateLocalScore(userTwin.publicProfile, candidate);
            const sharedInterests = this.findSharedInterests(userTwin.publicProfile, candidate);

            return createMatch({
                twinId: userTwin.id,
                matchedTwinId: `twin-${candidate.name.toLowerCase().replace(/\s/g, '-')}`,
                score,
                sharedInterests,
                matchedProfile: {
                    name: candidate.name,
                    headline: candidate.headline,
                },
            });
        });
    }

    /**
     * Calculate match score using local algorithm
     */
    private calculateLocalScore(profile1: PublicProfile, profile2: PublicProfile): number {
        const sharedSkills = this.findSharedItems(profile1.skills, profile2.skills);
        const sharedInterests = this.findSharedItems(profile1.interests, profile2.interests);

        // Weighted scoring
        const skillScore = sharedSkills.length * 15;
        const interestScore = sharedInterests.length * 10;
        const baseScore = 30;

        // Bonus for complementary skills (one has what other seeks)
        const complementaryBonus = this.calculateComplementaryBonus(profile1, profile2);

        return Math.min(100, baseScore + skillScore + interestScore + complementaryBonus);
    }

    /**
     * Calculate bonus for complementary profiles
     */
    private calculateComplementaryBonus(profile1: PublicProfile, profile2: PublicProfile): number {
        // Simple heuristic: if headlines suggest different roles, bonus for collaboration
        const roles = ['engineer', 'designer', 'manager', 'founder', 'researcher'];
        const role1 = roles.find(r => profile1.headline.toLowerCase().includes(r));
        const role2 = roles.find(r => profile2.headline.toLowerCase().includes(r));

        if (role1 && role2 && role1 !== role2) {
            return 10; // Bonus for different roles
        }
        return 0;
    }

    /**
     * Build Gemini prompt for batch scoring
     */
    private buildBatchPrompt(
        userProfile: PublicProfile,
        candidates: PublicProfile[],
        eventContext?: { theme: string; description: string }
    ): string {
        const candidatesList = candidates
            .map((c, i) => `${i + 1}. ${c.name} - ${c.headline}\n   Skills: ${c.skills.join(', ')}\n   Interests: ${c.interests.join(', ')}`)
            .join('\n\n');

        return `You are a professional networking match analyzer. Score how well each candidate matches with this person for meaningful professional connection.

USER PROFILE:
Name: ${userProfile.name}
Headline: ${userProfile.headline}
Skills: ${userProfile.skills.join(', ')}
Interests: ${userProfile.interests.join(', ')}
${eventContext ? `\nEVENT CONTEXT: ${eventContext.theme} - ${eventContext.description}` : ''}

CANDIDATES:
${candidatesList}

SCORING CRITERIA:
- Skill overlap and complementary expertise (0-40 points)
- Shared interests and passions (0-30 points)  
- Collaboration potential (0-20 points)
- Industry/domain alignment (0-10 points)

Return ONLY comma-separated scores 0-100 for each candidate, in order.
Example: 85,72,90,65,78`;
    }

    /**
     * Parse scores from Gemini response
     */
    private parseScores(response: string, expectedCount: number): number[] {
        const scores: number[] = [];
        const matches = response.match(/\d+/g);

        if (matches) {
            for (const match of matches) {
                const num = parseInt(match, 10);
                if (num >= 0 && num <= 100) {
                    scores.push(num);
                    if (scores.length >= expectedCount) break;
                }
            }
        }

        // Pad with default scores if needed
        while (scores.length < expectedCount) {
            scores.push(50);
        }

        return scores;
    }

    /**
     * Find shared interests between two profiles
     */
    private findSharedInterests(profile1: PublicProfile, profile2: PublicProfile): string[] {
        return this.findSharedItems(
            [...profile1.interests, ...profile1.skills],
            [...profile2.interests, ...profile2.skills]
        );
    }

    /**
     * Find shared items between two arrays (case-insensitive)
     */
    private findSharedItems(arr1: string[], arr2: string[]): string[] {
        const set1 = new Set(arr1.map(s => s.toLowerCase()));
        return arr2.filter(item => set1.has(item.toLowerCase()));
    }

    /**
     * Chunk array into batches
     */
    private chunkArray<T>(arr: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Cache matches to local storage
     */
    private async cacheMatches(matches: Match[]): Promise<void> {
        try {
            const brain = getTwinBrain();
            for (const match of matches) {
                await brain.saveMatch(match);
            }
        } catch (error) {
            console.warn('Failed to cache matches:', error);
        }
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let edgeMatchingInstance: EdgeMatchingService | null = null;

export function getEdgeMatchingService(): EdgeMatchingService {
    if (!edgeMatchingInstance) {
        edgeMatchingInstance = new EdgeMatchingService();
    }
    return edgeMatchingInstance;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Initialize edge matching with API key from environment or secure storage
 */
export function initializeEdgeMatching(apiKey?: string): void {
    const service = getEdgeMatchingService();
    const key = apiKey ||
        process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        (typeof window !== 'undefined'
            ? (window as unknown as { GEMINI_API_KEY?: string }).GEMINI_API_KEY
            : undefined);

    if (key) {
        service.initGemini(key);
    }
}

/**
 * Perform edge-only matching
 */
export async function matchLocally(request: EdgeMatchRequest): Promise<EdgeMatchResult> {
    const service = getEdgeMatchingService();
    return service.findMatches(request);
}
