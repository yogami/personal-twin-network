/**
 * OpenAIService - AI matching using OpenAI GPT-4o-mini
 * 
 * Implements IMatchingService interface (Dependency Inversion)
 * Uses structured prompts for consistent matching scores
 */

import OpenAI from 'openai';
import { Twin } from '@/domain/entities/Twin';
import { Match, createMatch } from '@/domain/entities/Match';
import { IMatchingService, MatchRequest } from '@/domain/interfaces/IMatchingService';

export class OpenAIService implements IMatchingService {
    private client: OpenAI;

    constructor(apiKey?: string) {
        const key = apiKey || process.env.OPENAI_API_KEY;
        if (!key) {
            throw new Error('Missing OPENAI_API_KEY');
        }
        this.client = new OpenAI({ apiKey: key });
    }

    async findMatches(request: MatchRequest): Promise<Match[]> {
        const { userTwin, candidateTwins } = request;
        const matches: Match[] = [];

        // Batch process all candidates for efficiency
        const scores = await this.batchCalculateScores(userTwin, candidateTwins);

        for (let i = 0; i < candidateTwins.length; i++) {
            const candidate = candidateTwins[i];
            const score = scores[i];
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
            const response = await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional networking match analyzer. Return ONLY a number 0-100.',
                    },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 10,
                temperature: 0.3,
            });

            const content = response.choices[0]?.message?.content || '50';
            const score = this.parseScoreFromResponse(content);
            return Math.max(0, Math.min(100, score));
        } catch (error) {
            console.error('OpenAI matching error:', error);
            // Fallback to basic skill/interest matching
            return this.calculateBasicScore(twin1, twin2);
        }
    }

    private async batchCalculateScores(userTwin: Twin, candidates: Twin[]): Promise<number[]> {
        if (candidates.length === 0) return [];

        // For small batches, use parallel individual scoring
        if (candidates.length <= 5) {
            const promises = candidates.map((c) => this.calculateScore(userTwin, c));
            return Promise.all(promises);
        }

        // For larger batches, use a single prompt
        try {
            const candidatesList = candidates
                .map((c, i) => `${i + 1}. ${c.publicProfile.name} - ${c.publicProfile.headline} | Skills: ${c.publicProfile.skills.join(', ')} | Interests: ${c.publicProfile.interests.join(', ')}`)
                .join('\n');

            const response = await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a networking match analyzer. For each candidate, return a match score 0-100. Return ONLY comma-separated numbers.',
                    },
                    {
                        role: 'user',
                        content: `Score how well this person matches each candidate for networking:

User: ${userTwin.publicProfile.name} - ${userTwin.publicProfile.headline}
Skills: ${userTwin.publicProfile.skills.join(', ')}
Interests: ${userTwin.publicProfile.interests.join(', ')}

Candidates:
${candidatesList}

Return ONLY the scores as comma-separated numbers (e.g., 85,72,90,65,78):`,
                    },
                ],
                max_tokens: 100,
                temperature: 0.3,
            });

            const content = response.choices[0]?.message?.content || '';
            const scores = content.split(',').map((s) => {
                const num = parseInt(s.trim(), 10);
                return isNaN(num) ? 50 : Math.max(0, Math.min(100, num));
            });

            // Pad with basic scores if needed
            while (scores.length < candidates.length) {
                scores.push(this.calculateBasicScore(userTwin, candidates[scores.length]));
            }

            return scores;
        } catch (error) {
            console.error('Batch scoring error:', error);
            return candidates.map((c) => this.calculateBasicScore(userTwin, c));
        }
    }

    private buildMatchingPrompt(twin1: Twin, twin2: Twin): string {
        return `Score the networking compatibility between:

Person 1: ${twin1.publicProfile.name} - ${twin1.publicProfile.headline}
Skills: ${twin1.publicProfile.skills.join(', ')}
Interests: ${twin1.publicProfile.interests.join(', ')}

Person 2: ${twin2.publicProfile.name} - ${twin2.publicProfile.headline}
Skills: ${twin2.publicProfile.skills.join(', ')}
Interests: ${twin2.publicProfile.interests.join(', ')}

Return ONLY a number 0-100.`;
    }

    private parseScoreFromResponse(response: string): number {
        const match = response.match(/\d+/);
        if (match) {
            return parseInt(match[0], 10);
        }
        return 50;
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

        const skillScore = sharedSkills.length * 15;
        const interestScore = sharedInterests.length * 10;
        const baseScore = 30;

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
