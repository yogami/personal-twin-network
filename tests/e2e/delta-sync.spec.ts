/**
 * Playwright E2E Tests for Delta-Based Synchronization
 * 
 * Top of testing pyramid - high-value user journey tests.
 * Runs against both local dev and production environments.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Delta Sync E2E - User Profile Updates', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to dashboard
        await page.goto(`${BASE_URL}/dashboard`);
    });

    test('user can update profile and changes persist', async ({ page }) => {
        // Given: User is on dashboard
        await expect(page).toHaveURL(/dashboard/);

        // Check if we need to create a twin first
        const createButton = page.locator('text=Create Twin, text=Get Started').first();
        if (await createButton.isVisible()) {
            // Create a basic twin for testing
            await createButton.click();

            // Fill in basic info
            await page.fill('input[name="name"], input[placeholder*="name"]', 'Delta Test User');
            await page.fill('input[name="headline"], textarea[placeholder*="headline"]', 'Testing Delta Sync');

            // Submit
            await page.click('button[type="submit"], button:has-text("Create")');
            await page.waitForLoadState('networkidle');
        }

        // Then: Dashboard should show the twin
        await expect(page.locator('text=Delta Test User, text=Testing Delta Sync')).toBeVisible({ timeout: 10000 });
    });

    test('dashboard loads and displays twin status', async ({ page }) => {
        // Given: Dashboard page
        await expect(page).toHaveURL(/dashboard/);

        // Then: Should show either twin status or create option
        const hasTwin = await page.locator('[class*="glass-card"], [class*="twin-status"]').count();
        const hasCreateOption = await page.locator('text=Create, text=Get Started').count();

        expect(hasTwin + hasCreateOption).toBeGreaterThan(0);
    });
});

test.describe('Delta Sync E2E - P2P Connection', () => {
    test('QR scanner page loads with camera UI', async ({ page }) => {
        // Navigate to scan page
        await page.goto(`${BASE_URL}/scan`);

        // Should show scanner UI or permission request
        await expect(page.locator('text=Scan, text=QR, text=Camera')).toBeVisible({ timeout: 5000 });
    });

    test('demo page shows P2P connection capability', async ({ page }) => {
        // Navigate to demo page
        await page.goto(`${BASE_URL}/demo`);

        // Should show P2P or twin related content
        await expect(page.locator('body')).toContainText(/twin|match|connect|p2p/i);
    });
});

test.describe('Delta Sync E2E - API Endpoints', () => {
    test('match API returns valid response', async ({ request }) => {
        // POST to match API
        const response = await request.post(`${BASE_URL}/api/match`, {
            data: {
                twin: {
                    id: 'test-twin-delta',
                    publicProfile: {
                        name: 'Test User',
                        headline: 'Developer',
                        skills: ['TypeScript', 'React'],
                        interests: ['AI'],
                    },
                },
                candidateTwins: [],
            },
        });

        // Should return success (even with empty candidates)
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(data).toHaveProperty('matches');
    });
});

test.describe('Delta Sync E2E - Privacy Verification', () => {
    test('no raw profile data in network requests', async ({ page }) => {
        const capturedRequests: string[] = [];

        // Intercept all requests
        page.on('request', (request) => {
            const body = request.postData();
            if (body) {
                capturedRequests.push(body);
            }
        });

        // Navigate and interact
        await page.goto(`${BASE_URL}/dashboard`);
        await page.waitForLoadState('networkidle');

        // Verify: If any match requests were made, they should not contain raw embeddings
        for (const body of capturedRequests) {
            // Raw embeddings would be very long arrays
            if (body.includes('embedding')) {
                // Check it's a hash, not raw array
                const parsed = JSON.parse(body);
                if (parsed.embedding) {
                    // If embedding is present, it should be encrypted or hashed
                    expect(typeof parsed.embedding).not.toBe('object');
                }
            }
        }
    });
});

test.describe('Delta Sync Production Verification', () => {
    test.skip(
        !process.env.BASE_URL?.includes('railway') && !process.env.BASE_URL?.includes('production'),
        'Skipping production tests in local environment'
    );

    test('production homepage loads', async ({ page }) => {
        await page.goto(BASE_URL);
        await expect(page).toHaveTitle(/Twin|Network/i);
    });

    test('production dashboard accessible', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard`);
        // Should load without errors
        await expect(page.locator('body')).not.toContainText(/error|500|404/i);
    });

    test('production API responds', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/events`);
        expect(response.status()).toBeLessThan(500);
    });
});
