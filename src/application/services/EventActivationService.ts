/**
 * EventActivationService - Orchestrates the event activation flow
 * 
 * Handles:
 * - Parsing CIC attendee data from URL params
 * - Creating/updating twin with pre-filled data
 * - Joining event P2P room
 */

import { Twin, createTwin } from '@/domain/entities/Twin';
import { getTwinBrain } from '@/lib/twin-brain';
import { getP2PTwinExchange } from '@/infrastructure/p2p/P2PTwinExchange';

export interface ActivationParams {
    eventId?: string;
    attendeeName?: string;
    attendeeRole?: string;
    interests?: string[];
}

export interface ActivationResult {
    success: boolean;
    twin?: Twin;
    roomId?: string;
    error?: string;
}

/**
 * Parse activation parameters from URL
 */
export function parseActivationParams(searchParams: URLSearchParams): ActivationParams {
    return {
        eventId: searchParams.get('event') || undefined,
        attendeeName: searchParams.get('name') || undefined,
        attendeeRole: searchParams.get('role') || undefined,
    };
}

/**
 * Generate a deterministic room ID for an event
 */
export function getEventRoomId(eventId: string): string {
    // Simple deterministic hash for room ID
    let hash = 0;
    for (let i = 0; i < eventId.length; i++) {
        const char = eventId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `event-${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

export class EventActivationService {
    private brain = getTwinBrain();
    private p2p = getP2PTwinExchange();

    /**
     * Activate a twin for an event
     */
    async activate(params: ActivationParams): Promise<ActivationResult> {
        try {
            // 1. Ensure brain is unlocked
            if (!this.brain.isUnlocked()) {
                await this.brain.unlock('demo-privacy-key');
            }

            // 2. Check for existing twin
            let twin = await this.brain.getTwin();

            // 3. Create or update twin
            if (!twin) {
                twin = createTwin({
                    userId: `cic-${Date.now()}`,
                    domain: 'networking',
                    publicProfile: {
                        name: params.attendeeName || 'Anonymous',
                        headline: params.attendeeRole || 'Event Attendee',
                        skills: [],
                        interests: params.interests || [],
                    },
                });
                await this.brain.saveTwin(twin);
            } else if (params.attendeeName || params.attendeeRole) {
                // Update existing twin with CIC data
                const updatedTwin = {
                    ...twin,
                    publicProfile: {
                        ...twin.publicProfile,
                        name: params.attendeeName || twin.publicProfile.name,
                        headline: params.attendeeRole || twin.publicProfile.headline,
                    },
                };
                await this.brain.saveTwin(updatedTwin);
                twin = updatedTwin;
            }

            // 4. Join event P2P room
            let roomId: string | undefined;
            if (params.eventId) {
                roomId = getEventRoomId(params.eventId);
                try {
                    await this.p2p.host(twin);
                } catch (e) {
                    console.warn('P2P hosting failed, continuing without:', e);
                }
            }

            return {
                success: true,
                twin,
                roomId,
            };
        } catch (error) {
            console.error('Activation failed:', error);
            return {
                success: false,
                error: String(error),
            };
        }
    }

    /**
     * Update twin interests
     */
    async updateInterests(interests: string[]): Promise<boolean> {
        try {
            const twin = await this.brain.getTwin();
            if (!twin) return false;

            const updatedTwin = {
                ...twin,
                publicProfile: {
                    ...twin.publicProfile,
                    interests,
                },
            };
            await this.brain.saveTwin(updatedTwin);
            return true;
        } catch {
            return false;
        }
    }
}

// Singleton
let activationService: EventActivationService | null = null;

export function getEventActivationService(): EventActivationService {
    if (!activationService) {
        activationService = new EventActivationService();
    }
    return activationService;
}
