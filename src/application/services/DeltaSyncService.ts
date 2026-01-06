/**
 * DeltaSyncService - Computes and applies deltas between twin states
 * 
 * Application service following Clean Architecture.
 * Pure business logic, no infrastructure dependencies.
 * 
 * Implements CRDT-style operations:
 * - Additive/monotonic changes (idempotent)
 * - Set-based skill/interest operations
 * - Last-writer-wins for scalar fields (using timestamps)
 */

import { v4 as uuidv4 } from 'uuid';
import {
    TwinState,
    TwinDelta,
    DeltaChange,
    incrementVersion,
} from '@/domain/entities/TwinState';

/**
 * Create a new delta with the given changes
 */
export function createDelta(
    twinId: string,
    baseVersion: number,
    changes: DeltaChange[]
): TwinDelta {
    return {
        id: uuidv4(),
        twinId,
        baseVersion,
        changes,
        timestamp: Date.now(),
    };
}

/**
 * Compute the delta between two states
 * Returns null if states are identical
 */
export function computeDelta(
    previousState: TwinState,
    newState: TwinState
): TwinDelta | null {
    const changes: DeltaChange[] = [];

    const prev = previousState.profile;
    const next = newState.profile;

    // Detect skill changes (set-based)
    const prevSkills = new Set(prev.skills || []);
    const nextSkills = new Set(next.skills || []);

    const addedSkills = [...nextSkills].filter(s => !prevSkills.has(s));
    const removedSkills = [...prevSkills].filter(s => !nextSkills.has(s));

    if (addedSkills.length > 0) {
        changes.push({ type: 'SkillsAdded', skills: addedSkills });
    }
    if (removedSkills.length > 0) {
        changes.push({ type: 'SkillsRemoved', skills: removedSkills });
    }

    // Detect interest changes (set-based)
    const prevInterests = new Set(prev.interests || []);
    const nextInterests = new Set(next.interests || []);

    const addedInterests = [...nextInterests].filter(i => !prevInterests.has(i));
    const removedInterests = [...prevInterests].filter(i => !nextInterests.has(i));

    if (addedInterests.length > 0) {
        changes.push({ type: 'InterestsAdded', interests: addedInterests });
    }
    if (removedInterests.length > 0) {
        changes.push({ type: 'InterestsRemoved', interests: removedInterests });
    }

    // Detect headline change
    if (prev.headline !== next.headline) {
        changes.push({ type: 'HeadlineChanged', headline: next.headline });
    }

    // Detect name change
    if (prev.name !== next.name) {
        changes.push({ type: 'NameChanged', name: next.name });
    }

    // Detect embedding change
    if (!arraysEqual(prev.embedding, next.embedding) && next.embedding) {
        changes.push({ type: 'EmbeddingUpdated', embedding: next.embedding });
    }

    // Return null if no changes
    if (changes.length === 0) {
        return null;
    }

    return createDelta(previousState.twinId, previousState.version, changes);
}

/**
 * Apply a delta to a state, producing a new state
 * Operations are idempotent (applying same delta twice is safe)
 */
export function applyDelta(state: TwinState, delta: TwinDelta): TwinState {
    let newProfile = { ...state.profile };

    for (const change of delta.changes) {
        switch (change.type) {
            case 'SkillsAdded': {
                const currentSkills = new Set(newProfile.skills || []);
                for (const skill of change.skills) {
                    currentSkills.add(skill);
                }
                newProfile.skills = [...currentSkills];
                break;
            }
            case 'SkillsRemoved': {
                const skillsToRemove = new Set(change.skills);
                newProfile.skills = (newProfile.skills || []).filter(
                    s => !skillsToRemove.has(s)
                );
                break;
            }
            case 'InterestsAdded': {
                const currentInterests = new Set(newProfile.interests || []);
                for (const interest of change.interests) {
                    currentInterests.add(interest);
                }
                newProfile.interests = [...currentInterests];
                break;
            }
            case 'InterestsRemoved': {
                const interestsToRemove = new Set(change.interests);
                newProfile.interests = (newProfile.interests || []).filter(
                    i => !interestsToRemove.has(i)
                );
                break;
            }
            case 'HeadlineChanged': {
                newProfile.headline = change.headline;
                break;
            }
            case 'NameChanged': {
                newProfile.name = change.name;
                break;
            }
            case 'EmbeddingUpdated': {
                newProfile.embedding = [...change.embedding];
                break;
            }
        }
    }

    return {
        ...state,
        profile: newProfile,
        version: state.version + 1,
        lastModified: Date.now(),
    };
}

/**
 * Check if a delta is valid for the given state
 */
export function isValidDelta(state: TwinState, delta: TwinDelta): boolean {
    // Must be for the same twin
    if (state.twinId !== delta.twinId) {
        return false;
    }

    // Must apply to current version
    if (state.version !== delta.baseVersion) {
        return false;
    }

    // Must have at least one change
    if (!delta.changes || delta.changes.length === 0) {
        return false;
    }

    return true;
}

/**
 * Merge two concurrent deltas into one
 * Uses CRDT-style merge rules:
 * - Set operations are combined (union for adds, union for removes)
 * - Scalar fields use last-writer-wins (based on timestamp)
 */
export function mergeDelta(delta1: TwinDelta, delta2: TwinDelta): TwinDelta {
    const mergedChanges: DeltaChange[] = [];

    // Group changes by type
    const changesByType = new Map<string, DeltaChange[]>();

    for (const change of [...delta1.changes, ...delta2.changes]) {
        const existing = changesByType.get(change.type) || [];
        existing.push(change);
        changesByType.set(change.type, existing);
    }

    // Merge each type
    for (const [type, changes] of changesByType) {
        switch (type) {
            case 'SkillsAdded': {
                const allSkills = new Set<string>();
                for (const c of changes) {
                    if (c.type === 'SkillsAdded') {
                        for (const skill of c.skills) {
                            allSkills.add(skill);
                        }
                    }
                }
                mergedChanges.push({ type: 'SkillsAdded', skills: [...allSkills] });
                break;
            }
            case 'SkillsRemoved': {
                const allSkills = new Set<string>();
                for (const c of changes) {
                    if (c.type === 'SkillsRemoved') {
                        for (const skill of c.skills) {
                            allSkills.add(skill);
                        }
                    }
                }
                mergedChanges.push({ type: 'SkillsRemoved', skills: [...allSkills] });
                break;
            }
            case 'InterestsAdded': {
                const allInterests = new Set<string>();
                for (const c of changes) {
                    if (c.type === 'InterestsAdded') {
                        for (const interest of c.interests) {
                            allInterests.add(interest);
                        }
                    }
                }
                mergedChanges.push({ type: 'InterestsAdded', interests: [...allInterests] });
                break;
            }
            case 'InterestsRemoved': {
                const allInterests = new Set<string>();
                for (const c of changes) {
                    if (c.type === 'InterestsRemoved') {
                        for (const interest of c.interests) {
                            allInterests.add(interest);
                        }
                    }
                }
                mergedChanges.push({ type: 'InterestsRemoved', interests: [...allInterests] });
                break;
            }
            case 'HeadlineChanged': {
                // Last-writer-wins based on parent delta timestamp
                const winningDelta = delta1.timestamp > delta2.timestamp ? delta1 : delta2;
                const winningChange = winningDelta.changes.find(c => c.type === 'HeadlineChanged');
                if (winningChange && winningChange.type === 'HeadlineChanged') {
                    mergedChanges.push(winningChange);
                }
                break;
            }
            case 'NameChanged': {
                // Last-writer-wins
                const winningDelta = delta1.timestamp > delta2.timestamp ? delta1 : delta2;
                const winningChange = winningDelta.changes.find(c => c.type === 'NameChanged');
                if (winningChange && winningChange.type === 'NameChanged') {
                    mergedChanges.push(winningChange);
                }
                break;
            }
            case 'EmbeddingUpdated': {
                // Last-writer-wins
                const winningDelta = delta1.timestamp > delta2.timestamp ? delta1 : delta2;
                const winningChange = winningDelta.changes.find(c => c.type === 'EmbeddingUpdated');
                if (winningChange && winningChange.type === 'EmbeddingUpdated') {
                    mergedChanges.push(winningChange);
                }
                break;
            }
        }
    }

    return createDelta(
        delta1.twinId,
        delta1.baseVersion,
        mergedChanges
    );
}

/**
 * Helper: Check if two arrays are equal
 */
function arraysEqual(a?: number[], b?: number[]): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    return a.every((val, idx) => val === b[idx]);
}
