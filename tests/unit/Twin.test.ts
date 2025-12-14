/**
 * Twin Entity Unit Tests (TDD - Red Phase)
 * Following Uncle Bob's TDD principles: Write failing tests first
 */

import { Twin, TwinDomain, createTwin, validateTwin } from '@/domain/entities/Twin';

describe('Twin Entity', () => {
    describe('createTwin', () => {
        it('should create a valid twin with required fields', () => {
            const twinData = {
                userId: 'user-123',
                domain: 'networking' as TwinDomain,
                publicProfile: {
                    name: 'John Doe',
                    headline: 'Software Engineer at TechCorp',
                    skills: ['TypeScript', 'React', 'Node.js'],
                    interests: ['AI', 'Machine Learning'],
                },
            };

            const twin = createTwin(twinData);

            expect(twin.id).toBeDefined();
            expect(twin.userId).toBe('user-123');
            expect(twin.domain).toBe('networking');
            expect(twin.publicProfile.name).toBe('John Doe');
            expect(twin.active).toBe(true);
            expect(twin.createdAt).toBeInstanceOf(Date);
        });

        it('should generate a unique UUID for each twin', () => {
            const twinData = {
                userId: 'user-123',
                domain: 'networking' as TwinDomain,
                publicProfile: {
                    name: 'John Doe',
                    headline: 'Engineer',
                    skills: [],
                    interests: [],
                },
            };

            const twin1 = createTwin(twinData);
            const twin2 = createTwin(twinData);

            expect(twin1.id).not.toBe(twin2.id);
        });

        it('should set default active status to true', () => {
            const twinData = {
                userId: 'user-123',
                domain: 'events' as TwinDomain,
                publicProfile: {
                    name: 'Jane Doe',
                    headline: 'Product Manager',
                    skills: ['Agile', 'Scrum'],
                    interests: ['Startups'],
                },
            };

            const twin = createTwin(twinData);

            expect(twin.active).toBe(true);
        });
    });

    describe('validateTwin', () => {
        it('should return true for a valid twin', () => {
            const validTwin: Twin = {
                id: 'twin-123',
                userId: 'user-123',
                domain: 'networking',
                publicProfile: {
                    name: 'John Doe',
                    headline: 'Engineer',
                    skills: ['TypeScript'],
                    interests: ['AI'],
                },
                active: true,
                createdAt: new Date(),
            };

            expect(validateTwin(validTwin)).toBe(true);
        });

        it('should return false if name is empty', () => {
            const invalidTwin: Twin = {
                id: 'twin-123',
                userId: 'user-123',
                domain: 'networking',
                publicProfile: {
                    name: '',
                    headline: 'Engineer',
                    skills: [],
                    interests: [],
                },
                active: true,
                createdAt: new Date(),
            };

            expect(validateTwin(invalidTwin)).toBe(false);
        });

        it('should return false if userId is missing', () => {
            const invalidTwin: Twin = {
                id: 'twin-123',
                userId: '',
                domain: 'networking',
                publicProfile: {
                    name: 'John',
                    headline: 'Engineer',
                    skills: [],
                    interests: [],
                },
                active: true,
                createdAt: new Date(),
            };

            expect(validateTwin(invalidTwin)).toBe(false);
        });

        it('should accept all valid domain types', () => {
            const domains: TwinDomain[] = ['networking', 'events', 'dating'];

            domains.forEach((domain) => {
                const twin: Twin = {
                    id: 'twin-123',
                    userId: 'user-123',
                    domain,
                    publicProfile: {
                        name: 'John',
                        headline: 'Engineer',
                        skills: [],
                        interests: [],
                    },
                    active: true,
                    createdAt: new Date(),
                };

                expect(validateTwin(twin)).toBe(true);
            });
        });
    });
});
