/**
 * TwinState - Versioned twin profile state for delta synchronization
 * 
 * Domain entity following Clean Architecture principles.
 * Pure domain logic, no external dependencies.
 * 
 * Supports:
 * - Monotonic version counter for ordering
 * - Vector clocks for distributed conflict resolution
 * - Immutable state updates
 */

import { PublicProfile } from './Twin';

/**
 * Versioned twin state for delta synchronization
 */
export interface TwinState {
    /** Twin identifier */
    twinId: string;

    /** Monotonic version counter (increments on each change) */
    version: number;

    /** Vector clock for distributed ordering */
    vectorClock: Record<string, number>;

    /** Current profile state */
    profile: PublicProfile;

    /** Last modification timestamp (Unix ms) */
    lastModified: number;
}

/**
 * Types of changes that can occur in a delta
 */
export type DeltaChangeType =
    | 'SkillsAdded'
    | 'SkillsRemoved'
    | 'InterestsAdded'
    | 'InterestsRemoved'
    | 'HeadlineChanged'
    | 'NameChanged'
    | 'EmbeddingUpdated';

/**
 * Individual change within a delta
 */
export type DeltaChange =
    | { type: 'SkillsAdded'; skills: string[] }
    | { type: 'SkillsRemoved'; skills: string[] }
    | { type: 'InterestsAdded'; interests: string[] }
    | { type: 'InterestsRemoved'; interests: string[] }
    | { type: 'HeadlineChanged'; headline: string }
    | { type: 'NameChanged'; name: string }
    | { type: 'EmbeddingUpdated'; embedding: number[] };

/**
 * Delta - represents changes between two twin states
 * 
 * Designed for CRDT-style monotonic, mergeable updates.
 */
export interface TwinDelta {
    /** Unique delta identifier */
    id: string;

    /** Twin this delta belongs to */
    twinId: string;

    /** Version this delta applies to (must match target state version) */
    baseVersion: number;

    /** List of changes in this delta */
    changes: DeltaChange[];

    /** Creation timestamp for conflict resolution */
    timestamp: number;
}

/**
 * Create initial twin state from profile data
 */
export function createInitialState(
    twinId: string,
    profile: PublicProfile
): TwinState {
    return {
        twinId,
        version: 0,
        vectorClock: {},
        profile: { ...profile },
        lastModified: Date.now(),
    };
}

/**
 * Increment state version (immutable update)
 */
export function incrementVersion(state: TwinState): TwinState {
    return {
        ...state,
        version: state.version + 1,
        lastModified: Date.now(),
    };
}

/**
 * Update vector clock for a specific node
 */
export function updateVectorClock(
    state: TwinState,
    nodeId: string
): TwinState {
    return {
        ...state,
        vectorClock: {
            ...state.vectorClock,
            [nodeId]: (state.vectorClock[nodeId] || 0) + 1,
        },
    };
}

/**
 * Compare two vector clocks for ordering
 * Returns:
 * - -1 if clock1 happened before clock2
 * - 1 if clock1 happened after clock2
 * - 0 if concurrent (neither dominates)
 */
export function compareVectorClocks(
    clock1: Record<string, number>,
    clock2: Record<string, number>
): -1 | 0 | 1 {
    const allNodes = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);

    let clock1Greater = false;
    let clock2Greater = false;

    for (const node of allNodes) {
        const v1 = clock1[node] || 0;
        const v2 = clock2[node] || 0;

        if (v1 > v2) clock1Greater = true;
        if (v2 > v1) clock2Greater = true;
    }

    if (clock1Greater && !clock2Greater) return 1;
    if (clock2Greater && !clock1Greater) return -1;
    return 0; // Concurrent
}

/**
 * Merge two vector clocks (take max of each component)
 */
export function mergeVectorClocks(
    clock1: Record<string, number>,
    clock2: Record<string, number>
): Record<string, number> {
    const merged: Record<string, number> = { ...clock1 };

    for (const [node, value] of Object.entries(clock2)) {
        merged[node] = Math.max(merged[node] || 0, value);
    }

    return merged;
}

/**
 * Check if a state can accept a delta
 */
export function canAcceptDelta(state: TwinState, delta: TwinDelta): boolean {
    // Delta must be for the same twin
    if (state.twinId !== delta.twinId) return false;

    // Delta must apply to current version
    if (state.version !== delta.baseVersion) return false;

    return true;
}
