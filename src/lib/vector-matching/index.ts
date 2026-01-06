/**
 * Vector Matching Microservice
 * 
 * Domain-agnostic library for privacy-preserving vector similarity matching.
 * Uses cosine similarity for embedding comparison, with fallback to skill/interest overlap.
 * 
 * REUSE POTENTIAL:
 * - Professional networking (LinkedIn matching)
 * - Dating apps (compatibility scoring)
 * - Content recommendation (embedding similarity)
 * - Semantic search (document matching)
 * 
 * @module lib/vector-matching
 */

// Domain Services
export { VectorMatchingService } from './domain/services/VectorMatchingService';
import { VectorMatchingService } from './domain/services/VectorMatchingService';

// Ports (Interfaces)
export type { IMatchingService, MatchRequest, MatchResult } from './ports/IMatchingService';

// Factory
export function createVectorMatchingService(): VectorMatchingService {
    return new VectorMatchingService();
}
