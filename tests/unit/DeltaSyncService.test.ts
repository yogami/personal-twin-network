/**
 * Unit tests for DeltaSyncService
 * 
 * TDD: Tests written first, then implementation.
 * Follows Given-When-Then structure.
 */

import {
    TwinState,
    TwinDelta,
    DeltaChange,
    createInitialState,
    incrementVersion,
} from '@/domain/entities/TwinState';
import {
    computeDelta,
    applyDelta,
    mergeDelta,
    isValidDelta,
    createDelta,
} from '@/application/services/DeltaSyncService';

describe('DeltaSyncService', () => {
    const baseTwinId = 'twin-123';

    describe('computeDelta', () => {
        it('should return null when states are identical', () => {
            // Given: Two identical states
            const state1 = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: ['TypeScript', 'React'],
                interests: ['AI', 'Music'],
            });
            const state2 = { ...state1 };

            // When: Computing delta
            const delta = computeDelta(state1, state2);

            // Then: Delta should be null (no changes)
            expect(delta).toBeNull();
        });

        it('should detect added skills', () => {
            // Given: State with new skill added
            const state1 = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: ['TypeScript'],
                interests: [],
            });
            const state2 = incrementVersion({
                ...state1,
                profile: { ...state1.profile, skills: ['TypeScript', 'React'] },
            });

            // When: Computing delta
            const delta = computeDelta(state1, state2);

            // Then: Delta should contain SkillsAdded
            expect(delta).not.toBeNull();
            expect(delta!.changes).toContainEqual({
                type: 'SkillsAdded',
                skills: ['React'],
            });
        });

        it('should detect removed skills', () => {
            // Given: State with skill removed
            const state1 = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: ['TypeScript', 'React'],
                interests: [],
            });
            const state2 = incrementVersion({
                ...state1,
                profile: { ...state1.profile, skills: ['TypeScript'] },
            });

            // When: Computing delta
            const delta = computeDelta(state1, state2);

            // Then: Delta should contain SkillsRemoved
            expect(delta).not.toBeNull();
            expect(delta!.changes).toContainEqual({
                type: 'SkillsRemoved',
                skills: ['React'],
            });
        });

        it('should detect added interests', () => {
            // Given: State with new interest
            const state1 = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: [],
                interests: ['AI'],
            });
            const state2 = incrementVersion({
                ...state1,
                profile: { ...state1.profile, interests: ['AI', 'Music'] },
            });

            // When: Computing delta
            const delta = computeDelta(state1, state2);

            // Then: Delta should contain InterestsAdded
            expect(delta).not.toBeNull();
            expect(delta!.changes).toContainEqual({
                type: 'InterestsAdded',
                interests: ['Music'],
            });
        });

        it('should detect removed interests', () => {
            // Given: State with interest removed
            const state1 = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: [],
                interests: ['AI', 'Music'],
            });
            const state2 = incrementVersion({
                ...state1,
                profile: { ...state1.profile, interests: ['AI'] },
            });

            // When: Computing delta
            const delta = computeDelta(state1, state2);

            // Then: Delta should contain InterestsRemoved
            expect(delta).not.toBeNull();
            expect(delta!.changes).toContainEqual({
                type: 'InterestsRemoved',
                interests: ['Music'],
            });
        });

        it('should detect headline change', () => {
            // Given: State with changed headline
            const state1 = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: [],
                interests: [],
            });
            const state2 = incrementVersion({
                ...state1,
                profile: { ...state1.profile, headline: 'Senior Developer' },
            });

            // When: Computing delta
            const delta = computeDelta(state1, state2);

            // Then: Delta should contain HeadlineChanged
            expect(delta).not.toBeNull();
            expect(delta!.changes).toContainEqual({
                type: 'HeadlineChanged',
                headline: 'Senior Developer',
            });
        });

        it('should detect multiple changes in single delta', () => {
            // Given: State with multiple changes
            const state1 = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: ['TypeScript'],
                interests: ['AI'],
            });
            const state2 = incrementVersion({
                ...state1,
                profile: {
                    ...state1.profile,
                    headline: 'Senior Developer',
                    skills: ['TypeScript', 'React'],
                    interests: [],
                },
            });

            // When: Computing delta
            const delta = computeDelta(state1, state2);

            // Then: Delta should contain all changes
            expect(delta).not.toBeNull();
            expect(delta!.changes.length).toBe(3);
        });
    });

    describe('applyDelta', () => {
        it('should apply SkillsAdded delta correctly', () => {
            // Given: Initial state and delta with added skills
            const state = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: ['TypeScript'],
                interests: [],
            });
            const delta = createDelta(baseTwinId, state.version, [
                { type: 'SkillsAdded', skills: ['React', 'Node.js'] },
            ]);

            // When: Applying delta
            const newState = applyDelta(state, delta);

            // Then: Skills should be updated
            expect(newState.profile.skills).toEqual(['TypeScript', 'React', 'Node.js']);
            expect(newState.version).toBe(state.version + 1);
        });

        it('should apply SkillsRemoved delta correctly', () => {
            // Given: Initial state and delta with removed skills
            const state = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: ['TypeScript', 'React', 'Node.js'],
                interests: [],
            });
            const delta = createDelta(baseTwinId, state.version, [
                { type: 'SkillsRemoved', skills: ['React'] },
            ]);

            // When: Applying delta
            const newState = applyDelta(state, delta);

            // Then: Skills should be updated
            expect(newState.profile.skills).toEqual(['TypeScript', 'Node.js']);
        });

        it('should apply HeadlineChanged delta correctly', () => {
            // Given: Initial state and headline change delta
            const state = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: [],
                interests: [],
            });
            const delta = createDelta(baseTwinId, state.version, [
                { type: 'HeadlineChanged', headline: 'CTO' },
            ]);

            // When: Applying delta
            const newState = applyDelta(state, delta);

            // Then: Headline should be updated
            expect(newState.profile.headline).toBe('CTO');
        });

        it('should apply multiple changes in order', () => {
            // Given: State and delta with multiple changes
            const state = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: ['TypeScript'],
                interests: ['AI'],
            });
            const delta = createDelta(baseTwinId, state.version, [
                { type: 'SkillsAdded', skills: ['React'] },
                { type: 'InterestsRemoved', interests: ['AI'] },
                { type: 'HeadlineChanged', headline: 'Full Stack Developer' },
            ]);

            // When: Applying delta
            const newState = applyDelta(state, delta);

            // Then: All changes should be applied
            expect(newState.profile.skills).toEqual(['TypeScript', 'React']);
            expect(newState.profile.interests).toEqual([]);
            expect(newState.profile.headline).toBe('Full Stack Developer');
        });

        it('should be idempotent for set operations', () => {
            // Given: State and delta that adds already existing skill
            const state = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: ['TypeScript', 'React'],
                interests: [],
            });
            const delta = createDelta(baseTwinId, state.version, [
                { type: 'SkillsAdded', skills: ['React', 'Node.js'] },
            ]);

            // When: Applying delta
            const newState = applyDelta(state, delta);

            // Then: React should not be duplicated
            expect(newState.profile.skills).toEqual(['TypeScript', 'React', 'Node.js']);
        });
    });

    describe('isValidDelta', () => {
        it('should reject delta with wrong base version', () => {
            // Given: State at version 5 and delta for version 3
            const state = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: [],
                interests: [],
            });
            state.version = 5;

            const delta = createDelta(baseTwinId, 3, [
                { type: 'SkillsAdded', skills: ['React'] },
            ]);

            // When: Validating delta
            const isValid = isValidDelta(state, delta);

            // Then: Delta should be invalid
            expect(isValid).toBe(false);
        });

        it('should accept delta with matching base version', () => {
            // Given: State at version 5 and delta for version 5
            const state = createInitialState(baseTwinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: [],
                interests: [],
            });
            state.version = 5;

            const delta = createDelta(baseTwinId, 5, [
                { type: 'SkillsAdded', skills: ['React'] },
            ]);

            // When: Validating delta
            const isValid = isValidDelta(state, delta);

            // Then: Delta should be valid
            expect(isValid).toBe(true);
        });

        it('should reject delta for different twin', () => {
            // Given: State for twin-123 and delta for twin-456
            const state = createInitialState('twin-123', {
                name: 'Alice',
                headline: 'Developer',
                skills: [],
                interests: [],
            });

            const delta = createDelta('twin-456', state.version, [
                { type: 'SkillsAdded', skills: ['React'] },
            ]);

            // When: Validating delta
            const isValid = isValidDelta(state, delta);

            // Then: Delta should be invalid
            expect(isValid).toBe(false);
        });
    });

    describe('mergeDelta', () => {
        it('should merge non-conflicting deltas', () => {
            // Given: Two deltas with different change types
            const delta1 = createDelta(baseTwinId, 1, [
                { type: 'SkillsAdded', skills: ['React'] },
            ]);
            const delta2 = createDelta(baseTwinId, 1, [
                { type: 'InterestsAdded', interests: ['Music'] },
            ]);

            // When: Merging deltas
            const merged = mergeDelta(delta1, delta2);

            // Then: Merged delta should contain both changes
            expect(merged.changes.length).toBe(2);
            expect(merged.changes).toContainEqual({ type: 'SkillsAdded', skills: ['React'] });
            expect(merged.changes).toContainEqual({ type: 'InterestsAdded', interests: ['Music'] });
        });

        it('should merge overlapping skill additions', () => {
            // Given: Two deltas both adding skills
            const delta1 = createDelta(baseTwinId, 1, [
                { type: 'SkillsAdded', skills: ['React', 'Vue'] },
            ]);
            const delta2 = createDelta(baseTwinId, 1, [
                { type: 'SkillsAdded', skills: ['Vue', 'Angular'] },
            ]);

            // When: Merging deltas
            const merged = mergeDelta(delta1, delta2);

            // Then: Merged delta should have combined unique skills
            const skillsAdded = merged.changes.find(c => c.type === 'SkillsAdded');
            expect(skillsAdded).toBeDefined();
            expect((skillsAdded as any).skills).toEqual(['React', 'Vue', 'Angular']);
        });

        it('should use later timestamp for headline conflicts', () => {
            // Given: Two deltas both changing headline
            const delta1 = createDelta(baseTwinId, 1, [
                { type: 'HeadlineChanged', headline: 'Developer' },
            ]);
            delta1.timestamp = 1000;

            const delta2 = createDelta(baseTwinId, 1, [
                { type: 'HeadlineChanged', headline: 'Senior Developer' },
            ]);
            delta2.timestamp = 2000;

            // When: Merging deltas
            const merged = mergeDelta(delta1, delta2);

            // Then: Later headline should win
            const headlineChange = merged.changes.find(c => c.type === 'HeadlineChanged');
            expect(headlineChange).toBeDefined();
            expect((headlineChange as any).headline).toBe('Senior Developer');
        });
    });
});
