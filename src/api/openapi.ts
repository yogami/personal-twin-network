/**
 * OpenAPI Schema Definitions for Personal Twin Network
 * 
 * Uses Zod schemas for type-safe API contracts.
 * Source of truth for /api/openapi.json manifest.
 * 
 * @module api/openapi
 */

import { z } from 'zod';

// ============================================================================
// Twin Schemas
// ============================================================================

export const TwinProfileSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    headline: z.string().optional(),
    summary: z.string().optional(),
    skills: z.array(z.string()),
    interests: z.array(z.string()),
    embedding: z.array(z.number()).optional().describe('Vector embedding for matching')
});

export const InterviewRequestSchema = z.object({
    question: z.string().min(1).describe('Interview question to ask the twin'),
    context: z.string().optional().describe('Additional context for the response')
});

export const InterviewResponseSchema = z.object({
    answer: z.string(),
    confidence: z.number().min(0).max(1),
    sources: z.array(z.string()).optional()
});

// ============================================================================
// Match Schemas
// ============================================================================

export const MatchRequestSchema = z.object({
    twinId: z.string().uuid().describe('ID of the twin to match against'),
    eventId: z.string().optional().describe('Optional event context'),
    limit: z.number().min(1).max(10).default(3).describe('Max matches to return')
});

export const MatchResultSchema = z.object({
    matchedTwinId: z.string().uuid(),
    name: z.string(),
    headline: z.string().optional(),
    similarity: z.number().min(0).max(1),
    commonInterests: z.array(z.string())
});

export const MatchResponseSchema = z.object({
    matches: z.array(MatchResultSchema),
    processedAt: z.string().datetime()
});

// ============================================================================
// Common Schemas
// ============================================================================

export const ErrorResponseSchema = z.object({
    error: z.string()
});

export const HealthResponseSchema = z.object({
    status: z.enum(['ok', 'degraded', 'error']),
    version: z.string(),
    timestamp: z.string().datetime()
});

// ============================================================================
// OpenAPI Spec Generator
// ============================================================================

export function generateOpenAPISpec(): Record<string, unknown> {
    return {
        openapi: '3.0.3',
        info: {
            title: 'Personal Twin Network API',
            version: '1.0.0',
            description: 'Privacy-preserving professional networking with AI-powered twin matching.'
        },
        servers: [
            { url: 'http://localhost:3000', description: 'Local development' },
            { url: 'https://personal-twin.railway.app', description: 'Production' }
        ],
        paths: {
            '/api/twin/interview': {
                post: {
                    summary: 'Interview a twin',
                    description: 'Ask a question to the AI twin and receive a personalized response.',
                    operationId: 'interviewTwin',
                    tags: ['Twin'],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/InterviewRequest' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Interview response',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/InterviewResponse' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/match': {
                post: {
                    summary: 'Find matching twins',
                    description: 'Find the most compatible twins based on interests and skills.',
                    operationId: 'matchTwins',
                    tags: ['Match'],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MatchRequest' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Match results',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/MatchResponse' }
                                }
                            }
                        }
                    }
                }
            }
        },
        components: {
            schemas: {
                TwinProfile: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
                InterviewRequest: { type: 'object', properties: { question: { type: 'string' }, context: { type: 'string' } }, required: ['question'] },
                InterviewResponse: { type: 'object', properties: { answer: { type: 'string' }, confidence: { type: 'number' } } },
                MatchRequest: { type: 'object', properties: { twinId: { type: 'string' }, limit: { type: 'number' } }, required: ['twinId'] },
                MatchResult: { type: 'object', properties: { matchedTwinId: { type: 'string' }, similarity: { type: 'number' } } },
                MatchResponse: { type: 'object', properties: { matches: { type: 'array', items: { $ref: '#/components/schemas/MatchResult' } } } },
                ErrorResponse: { type: 'object', properties: { error: { type: 'string' } } },
                HealthResponse: { type: 'object', properties: { status: { type: 'string' }, version: { type: 'string' } } }
            }
        }
    };
}
