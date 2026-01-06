/**
 * Integration tests for Delta-based P2P Sync
 * 
 * Tests the flow: Twin update → delta generation → P2P broadcast → peer apply
 * Middle layer of testing pyramid.
 */

import {
    TwinState,
    TwinDelta,
    createInitialState,
    incrementVersion,
} from '@/domain/entities/TwinState';
import {
    computeDelta,
    applyDelta,
    createDelta,
    isValidDelta,
} from '@/application/services/DeltaSyncService';
import { PublicProfile } from '@/domain/entities/Twin';

describe('Delta P2P Integration', () => {
    /**
     * Simulates the full delta sync flow between two peers
     */
    describe('Twin Update → Delta → Peer Apply flow', () => {
        const twinId = 'twin-alice-123';

        function createProfile(overrides: Partial<PublicProfile> = {}): PublicProfile {
            return {
                name: 'Alice',
                headline: 'Developer',
                skills: ['TypeScript'],
                interests: ['AI'],
                ...overrides,
            };
        }

        it('should sync skill addition via delta', () => {
            // Given: Peer A and Peer B both have same initial state
            const initialProfile = createProfile();
            const peerAState = createInitialState(twinId, initialProfile);
            const peerBState = createInitialState(twinId, initialProfile);

            // When: Peer A adds a skill
            const peerAUpdated = incrementVersion({
                ...peerAState,
                profile: { ...peerAState.profile, skills: ['TypeScript', 'React'] },
            });

            // And: Peer A computes delta
            const delta = computeDelta(peerAState, peerAUpdated);

            // Then: Delta should contain SkillsAdded
            expect(delta).not.toBeNull();
            expect(delta!.changes).toContainEqual({
                type: 'SkillsAdded',
                skills: ['React'],
            });

            // When: Peer B applies the delta
            const peerBUpdated = applyDelta(peerBState, delta!);

            // Then: Peer B should have same skills as Peer A
            expect(peerBUpdated.profile.skills).toEqual(['TypeScript', 'React']);
        });

        it('should sync multiple changes in single delta', () => {
            // Given: Both peers have same initial state
            const initialProfile = createProfile();
            const peerAState = createInitialState(twinId, initialProfile);
            const peerBState = createInitialState(twinId, initialProfile);

            // When: Peer A makes multiple changes
            const peerAUpdated = incrementVersion({
                ...peerAState,
                profile: {
                    ...peerAState.profile,
                    skills: ['TypeScript', 'React', 'Node.js'],
                    interests: ['AI', 'Music'],
                    headline: 'Senior Developer',
                },
            });

            // And: Computes delta
            const delta = computeDelta(peerAState, peerAUpdated);

            // Then: Delta should have multiple changes
            expect(delta).not.toBeNull();
            expect(delta!.changes.length).toBeGreaterThanOrEqual(3);

            // When: Peer B applies delta
            const peerBUpdated = applyDelta(peerBState, delta!);

            // Then: Peer B should match Peer A
            expect(peerBUpdated.profile.skills).toEqual(['TypeScript', 'React', 'Node.js']);
            expect(peerBUpdated.profile.interests).toEqual(['AI', 'Music']);
            expect(peerBUpdated.profile.headline).toBe('Senior Developer');
        });

        it('should handle sequential delta applications', () => {
            // Given: Initial state
            const initialProfile = createProfile();
            let peerAState = createInitialState(twinId, initialProfile);
            let peerBState = createInitialState(twinId, initialProfile);

            // When: Peer A makes first change
            const peerAAfterChange1 = incrementVersion({
                ...peerAState,
                profile: { ...peerAState.profile, skills: ['TypeScript', 'React'] },
            });
            const delta1 = computeDelta(peerAState, peerAAfterChange1);
            peerAState = peerAAfterChange1;

            // And: Peer B applies first delta
            peerBState = applyDelta(peerBState, delta1!);

            // Then: States should match
            expect(peerBState.profile.skills).toEqual(['TypeScript', 'React']);

            // When: Peer A makes second change
            const peerAAfterChange2 = incrementVersion({
                ...peerAState,
                profile: { ...peerAState.profile, interests: ['AI', 'Blockchain'] },
            });
            const delta2 = computeDelta(peerAState, peerAAfterChange2);
            peerAState = peerAAfterChange2;

            // And: Peer B applies second delta
            peerBState = applyDelta(peerBState, delta2!);

            // Then: Both peers should have same final state
            expect(peerBState.profile.skills).toEqual(['TypeScript', 'React']);
            expect(peerBState.profile.interests).toEqual(['AI', 'Blockchain']);
        });

        it('should detect no-op when states are identical', () => {
            // Given: Identical states
            const profile = createProfile();
            const stateA = createInitialState(twinId, profile);
            const stateB = createInitialState(twinId, profile);

            // When: Computing delta
            const delta = computeDelta(stateA, stateB);

            // Then: Delta should be null (no changes)
            expect(delta).toBeNull();
        });

        it('should reject delta with version mismatch', () => {
            // Given: State at version 5
            const profile = createProfile();
            const state = createInitialState(twinId, profile);
            state.version = 5;

            // And: Delta for version 3
            const delta = createDelta(twinId, 3, [
                { type: 'SkillsAdded', skills: ['React'] },
            ]);

            // When: Validating delta
            const isValid = isValidDelta(state, delta);

            // Then: Should be invalid
            expect(isValid).toBe(false);
        });
    });

    /**
     * Tests recovery scenarios when deltas are missed
     */
    describe('Recovery scenarios', () => {
        it('should handle full-state fallback when delta sequence is broken', () => {
            // Given: Peer B missed several deltas (is at version 1, A is at version 5)
            const twinId = 'twin-recovery-test';
            const peerAState: TwinState = {
                twinId,
                version: 5,
                vectorClock: {},
                profile: {
                    name: 'Alice',
                    headline: 'CTO',
                    skills: ['TypeScript', 'React', 'Node.js', 'AWS'],
                    interests: ['Leadership', 'AI'],
                },
                lastModified: Date.now(),
            };

            const peerBState: TwinState = {
                twinId,
                version: 1,
                vectorClock: {},
                profile: {
                    name: 'Alice',
                    headline: 'Developer',
                    skills: ['TypeScript'],
                    interests: ['AI'],
                },
                lastModified: Date.now() - 100000,
            };

            // When: We compute the delta from B's view to A's current state
            // (This simulates what would happen when B requests sync)
            const catchUpDelta = computeDelta(peerBState, peerAState);

            // Then: Delta should contain all changes needed to catch up
            expect(catchUpDelta).not.toBeNull();
            expect(catchUpDelta!.changes).toBeDefined();

            // When: B applies the catch-up delta
            const peerBUpdated = applyDelta(peerBState, catchUpDelta!);

            // Then: B should now match A's profile
            expect(peerBUpdated.profile.skills).toEqual(peerAState.profile.skills);
            expect(peerBUpdated.profile.headline).toBe(peerAState.profile.headline);
        });
    });

    /**
     * Tests CRDT-style idempotency
     */
    describe('Idempotency guarantees', () => {
        it('should be idempotent when applying same delta twice', () => {
            // Given: Initial state
            const twinId = 'twin-idempotent';
            const state = createInitialState(twinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: ['TypeScript'],
                interests: ['AI'],
            });

            const delta = createDelta(twinId, state.version, [
                { type: 'SkillsAdded', skills: ['React'] },
            ]);

            // When: Applying delta twice
            const stateAfterFirst = applyDelta(state, delta);
            // Adjust version to allow second application
            const deltaForSecond = { ...delta, baseVersion: stateAfterFirst.version };
            const stateAfterSecond = applyDelta(stateAfterFirst, deltaForSecond);

            // Then: Skills should not be duplicated
            expect(stateAfterSecond.profile.skills).toEqual(['TypeScript', 'React']);
        });

        it('should handle add then remove then add again', () => {
            // Given: Initial state
            const twinId = 'twin-add-remove-add';
            let state = createInitialState(twinId, {
                name: 'Alice',
                headline: 'Developer',
                skills: ['TypeScript'],
                interests: ['AI'],
            });

            // When: Add skill
            const addDelta = createDelta(twinId, state.version, [
                { type: 'SkillsAdded', skills: ['React'] },
            ]);
            state = applyDelta(state, addDelta);

            // And: Remove skill
            const removeDelta = createDelta(twinId, state.version, [
                { type: 'SkillsRemoved', skills: ['React'] },
            ]);
            state = applyDelta(state, removeDelta);

            // And: Add skill again
            const addAgainDelta = createDelta(twinId, state.version, [
                { type: 'SkillsAdded', skills: ['React'] },
            ]);
            state = applyDelta(state, addAgainDelta);

            // Then: Skill should be present
            expect(state.profile.skills).toContain('React');
        });
    });
});
