/**
 * GeminiService - AI matching using Google Gemini Flash
 * 
 * Implements IMatchingService interface (Dependency Inversion)
 * Uses structured prompts for consistent matching scores
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Twin } from '@/domain/entities/Twin';
import { Match, createMatch } from '@/domain/entities/Match';
import { IMatchingService, MatchRequest } from '@/domain/interfaces/IMatchingService';

export class GeminiService implements IMatchingService {
    private genAI: GoogleGenerativeAI;
    private model;

    constructor(apiKey?: string) {
        const key = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!key) {
            throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY');
        }
        this.genAI = new GoogleGenerativeAI(key);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    async findMatches(request: MatchRequest): Promise<Match[]> {
        const { userTwin, candidateTwins, eventContext } = request;
        const matches: Match[] = [];

        for (const candidate of candidateTwins) {
            const score = await this.calculateScore(userTwin, candidate);
            const sharedInterests = this.findSharedInterests(userTwin, candidate);

            matches.push(
                createMatch({
                    twinId: userTwin.id,
                    matchedTwinId: candidate.id,
                    score,
                    sharedInterests,
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

    async calculateScore(twin1: Twin, twin2: Twin): Promise<number> {
        const prompt = this.buildMatchingPrompt(twin1, twin2);

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text();
            const score = this.parseScoreFromResponse(response);
            return Math.max(0, Math.min(100, score));
        } catch (error) {
            console.error('Gemini matching error:', error);
            // Fallback to basic skill/interest matching
            return this.calculateBasicScore(twin1, twin2);
        }
    }

    private buildMatchingPrompt(twin1: Twin, twin2: Twin): string {
        return `
You are a professional networking match analyzer. Score the compatibility between these two professionals for a networking event.

Person 1:
- Name: ${twin1.publicProfile.name}
- Headline: ${twin1.publicProfile.headline}
- Skills: ${twin1.publicProfile.skills.join(', ')}
- Interests: ${twin1.publicProfile.interests.join(', ')}

Person 2:
- Name: ${twin2.publicProfile.name}
- Headline: ${twin2.publicProfile.headline}
- Skills: ${twin2.publicProfile.skills.join(', ')}
- Interests: ${twin2.publicProfile.interests.join(', ')}

Consider:
1. Skill overlap and complementary skills
2. Shared interests
3. Potential for collaboration or mutual value
4. Similar industry/domain focus

Return ONLY a number between 0-100 representing the match quality.
Higher = better networking match.
`;
    }

    private parseScoreFromResponse(response: string): number {
        // Extract number from response
        const match = response.match(/\d+/);
        if (match) {
            return parseInt(match[0], 10);
        }
        return 50; // Default middle score
    }

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
        const skillScore = (sharedSkills.length * 15);
        const interestScore = (sharedInterests.length * 10);
        const baseScore = 30; // Base compatibility

        return Math.min(100, baseScore + skillScore + interestScore);
    }

    private findSharedInterests(twin1: Twin, twin2: Twin): string[] {
        return this.findSharedItems(
            [...twin1.publicProfile.interests, ...twin1.publicProfile.skills],
            [...twin2.publicProfile.interests, ...twin2.publicProfile.skills]
        );
    }

    private findSharedItems(arr1: string[], arr2: string[]): string[] {
        const set1 = new Set(arr1.map((s) => s.toLowerCase()));
        return arr2.filter((item) => set1.has(item.toLowerCase()));
    }
}
