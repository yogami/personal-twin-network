'use client';

/**
 * EmbeddingService - Browser-side vector embedding generation
 * 
 * Uses Transformers.js to run MiniLM model entirely in the browser.
 * No data is sent to any server - all processing happens on-device.
 */

import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';

// Singleton instance
let embeddingPipeline: FeatureExtractionPipeline | null = null;
let isLoading = false;
let loadPromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Initialize the embedding model (lazy load)
 * Model: all-MiniLM-L6-v2 (~22MB, 384-dimensional vectors)
 */
async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
    if (embeddingPipeline) {
        return embeddingPipeline;
    }

    if (loadPromise) {
        return loadPromise;
    }

    isLoading = true;

    // Try to load the model
    loadPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
        .then((pipe) => {
            embeddingPipeline = pipe as FeatureExtractionPipeline;
            isLoading = false;
            return embeddingPipeline;
        })
        .catch((error) => {
            console.error('[EmbeddingService] Model load failed:', error);
            isLoading = false;
            throw error;
        });

    return loadPromise;
}

/**
 * Generate embedding vector for text
 * @param text - The text to embed (bio, skills, interests combined)
 * @returns 384-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const pipe = await getEmbeddingPipeline();

    // Generate embedding
    const output = await pipe(text, {
        pooling: 'mean',
        normalize: true,
    });

    // Convert to plain array
    return Array.from(output.data as Float32Array);
}

/**
 * Calculate cosine similarity between two vectors
 * @returns Similarity score between 0 and 1
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
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
 * Generate embedding from a profile
 * Combines name, headline, skills, interests, and bio into a single text
 */
export async function generateProfileEmbedding(profile: {
    name: string;
    headline?: string;
    skills?: string[];
    interests?: string[];
    bio?: string;
}): Promise<number[]> {
    const parts = [
        profile.name,
        profile.headline || '',
        (profile.skills || []).join(', '),
        (profile.interests || []).join(', '),
        profile.bio || '',
    ];

    const text = parts.filter(Boolean).join('. ');
    return generateEmbedding(text);
}

/**
 * Check if embedding model is ready
 */
export function isEmbeddingModelReady(): boolean {
    return embeddingPipeline !== null;
}

/**
 * Check if embedding model is loading
 */
export function isEmbeddingModelLoading(): boolean {
    return isLoading;
}

/**
 * Preload the embedding model (call early to improve UX)
 */
export async function preloadEmbeddingModel(): Promise<void> {
    await getEmbeddingPipeline();
}
