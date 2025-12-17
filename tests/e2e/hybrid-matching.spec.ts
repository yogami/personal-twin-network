/**
 * Hybrid Matching E2E Tests
 * 
 * Tests the hybrid matching functionality across local and cloud modes.
 */

import { test, expect } from '@playwright/test';

test.describe('Hybrid Matching Flow', () => {
    test('dashboard shows matching mode indicator', async ({ page }) => {
        await page.goto('/dashboard');

        // Wait for matches to load
        await page.waitForTimeout(1000);

        // Should have some form of privacy/matching mode indicator
        const modeIndicator = page.locator('text=On-device').or(
            page.locator('text=Local').or(
                page.locator('text=Privacy First')
            )
        );
        await expect(modeIndicator.first()).toBeVisible();
    });

    test('API supports hybrid matching configuration', async ({ request }) => {
        // Test with small candidate count (should use local)
        const smallResponse = await request.post('/api/match', {
            data: {
                userTwin: {
                    id: 'test-twin-hybrid',
                    userId: 'test-user',
                    domain: 'networking',
                    publicProfile: {
                        name: 'Hybrid Tester',
                        headline: 'Engineer',
                        skills: ['Python', 'ML'],
                        interests: ['Privacy', 'Security'],
                    },
                },
                eventId: 'berlin-ai-2025',
                limit: 3,
            },
        });

        expect(smallResponse.status()).toBe(200);
        const data = await smallResponse.json();
        expect(data.success).toBe(true);
    });

    test('matches display privacy badge', async ({ page }) => {
        await page.goto('/dashboard');

        // Wait for matches section
        await page.waitForSelector('.match-card, [class*="match"]', { timeout: 5000 }).catch(() => { });

        // Check for privacy indicators on the page
        const privacyBadge = page.locator('[data-testid="privacy-badge"]').or(
            page.locator('text=encrypted').or(
                page.locator('text=On-device').or(
                    page.locator('text=Privacy')
                )
            )
        );

        await expect(privacyBadge.first()).toBeVisible();
    });

    test('match API returns structured response', async ({ request }) => {
        const response = await request.post('/api/match', {
            data: {
                userTwin: {
                    id: 'structure-test',
                    userId: 'user-123',
                    domain: 'events',
                    publicProfile: {
                        name: 'Test User',
                        headline: 'Product Manager',
                        skills: ['Strategy'],
                        interests: ['Innovation'],
                    },
                },
                eventId: 'test-event',
                limit: 5,
            },
        });

        expect(response.status()).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('matches');

        if (data.matches.length > 0) {
            const match = data.matches[0];
            expect(match).toHaveProperty('score');
            expect(match).toHaveProperty('matchedProfile');
            expect(typeof match.score).toBe('number');
        }
    });
});

test.describe('Berlin AI Conference Scenario', () => {
    test('can create twin for networking domain', async ({ page }) => {
        await page.goto('/');

        // Click create twin button
        await page.getByRole('button', { name: /Create Your Twin/i }).click();

        // Select networking domain
        await page.getByRole('button', { name: /Networking/i }).click();

        // Verify domain is selected
        await expect(page.getByRole('button', { name: /Networking/i })).toHaveClass(/active/);
    });

    test('matching works for AI conference attendee profile', async ({ request }) => {
        const response = await request.post('/api/match', {
            data: {
                userTwin: {
                    id: 'berlin-ai-attendee',
                    userId: 'attendee-001',
                    domain: 'networking',
                    publicProfile: {
                        name: 'AI Researcher',
                        headline: 'Machine Learning Engineer at TechCorp',
                        skills: ['Machine Learning', 'Python', 'TensorFlow', 'Privacy-Preserving AI'],
                        interests: ['Federated Learning', 'Digital Twins', 'Edge AI'],
                    },
                },
                eventId: 'berlin-ai-conference-2025',
                limit: 3,
            },
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
    });

    test('demo page targets Berlin AI Conference', async ({ page }) => {
        await page.goto('/demo');

        // Demo page should load correctly
        await expect(page.locator('h1')).toContainText('Digital Twin').or(
            expect(page.locator('h1')).toContainText('Activate')
        );

        // Should have the QR section
        await expect(page.locator('.qr-card, [class*="qr"]').first()).toBeVisible();
    });
});
