/**
 * Twin Entity - Core business entity following Clean Architecture
 * 
 * This is a pure domain entity with no dependencies on external frameworks.
 * Follows Single Responsibility Principle - only handles Twin business logic.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Domain types for Twin focus areas
 */
export type TwinDomain = 'networking' | 'events' | 'dating';

/**
 * Public profile data extracted from LinkedIn
 * Only contains publicly available information
 */
export interface PublicProfile {
    name: string;
    headline: string;
    skills: string[];
    interests: string[];
}

/**
 * Twin entity - represents a user's digital twin
 * Stored on-device in IndexedDB for privacy
 */
export interface Twin {
    id: string;
    userId: string;
    domain: TwinDomain;
    publicProfile: PublicProfile;
    active: boolean;
    createdAt: Date;
}

/**
 * Data required to create a new Twin
 */
export interface CreateTwinData {
    userId: string;
    domain: TwinDomain;
    publicProfile: PublicProfile;
}

/**
 * Factory function to create a new Twin entity
 * Follows Open/Closed principle - extend via new factory functions, don't modify
 */
export function createTwin(data: CreateTwinData): Twin {
    return {
        id: uuidv4(),
        userId: data.userId,
        domain: data.domain,
        publicProfile: data.publicProfile,
        active: true,
        createdAt: new Date(),
    };
}

/**
 * Validates a Twin entity for business rule compliance
 * Returns true if the twin is valid, false otherwise
 */
export function validateTwin(twin: Twin): boolean {
    // Name is required
    if (!twin.publicProfile.name || twin.publicProfile.name.trim() === '') {
        return false;
    }

    // UserId is required
    if (!twin.userId || twin.userId.trim() === '') {
        return false;
    }

    // Domain must be one of the allowed values
    const validDomains: TwinDomain[] = ['networking', 'events', 'dating'];
    if (!validDomains.includes(twin.domain)) {
        return false;
    }

    return true;
}

/**
 * Deactivates a twin (for privacy/GDPR compliance)
 */
export function deactivateTwin(twin: Twin): Twin {
    return {
        ...twin,
        active: false,
    };
}

/**
 * Updates twin profile with new data
 * Immutable update following functional principles
 */
export function updateTwinProfile(twin: Twin, profile: Partial<PublicProfile>): Twin {
    return {
        ...twin,
        publicProfile: {
            ...twin.publicProfile,
            ...profile,
        },
    };
}
