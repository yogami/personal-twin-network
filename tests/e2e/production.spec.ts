/**
 * Production E2E Tests
 * 
 * Post-deployment tests for production environment.
 * Run with: BASE_URL=https://personal-twin-network-production.up.railway.app npx playwright test tests/e2e/production.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Production Verification', () => {
    test('landing page loads correctly', async ({ page }) => {
        const response = await page.goto('/');
        expect(response?.status()).toBe(200);

        // Main heading should be visible
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('demo page is accessible', async ({ page }) => {
        const response = await page.goto('/demo');
        expect(response?.status()).toBe(200);

        // QR code section should be present
        await expect(page.locator('.qr-card, [class*="qr"], svg').first()).toBeVisible();
    });

    test('dashboard page loads', async ({ page }) => {
        const response = await page.goto('/dashboard');
        expect(response?.status()).toBe(200);

        // Should show matches section
        await expect(page.locator('text=Matches').or(page.locator('text=Top')).first()).toBeVisible();
    });

    test('privacy indicators visible', async ({ page }) => {
        await page.goto('/dashboard');

        // Privacy-related text should be visible
        const privacyText = page.locator('text=Privacy').or(
            page.locator('text=On-device').or(
                page.locator('text=Local')
            )
        );
        await expect(privacyText.first()).toBeVisible();
    });

    test('API endpoints respond', async ({ request }) => {
        // Test match API
        const matchResponse = await request.post('/api/match', {
            data: {
                userTwin: {
                    id: 'prod-test-twin',
                    userId: 'prod-test-user',
                    domain: 'networking',
                    publicProfile: {
                        name: 'Production Tester',
                        headline: 'QA Engineer',
                        skills: ['Testing', 'Automation'],
                        interests: ['Quality'],
                    },
                },
                eventId: 'prod-test-event',
                limit: 3,
            },
        });

        expect(matchResponse.status()).toBe(200);
        const data = await matchResponse.json();
        expect(data.success).toBe(true);
    });

    test('no server errors on navigation', async ({ page }) => {
        const errors: string[] = [];

        page.on('pageerror', error => {
            errors.push(error.message);
        });

        // Navigate through main pages
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await page.goto('/demo');
        await page.waitForLoadState('networkidle');

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Should have no critical errors
        const criticalErrors = errors.filter(
            e => !e.includes('ResizeObserver') && !e.includes('hydration')
        );
        expect(criticalErrors).toHaveLength(0);
    });

    test('mobile viewport renders correctly', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        await page.goto('/');

        // Main content should still be visible
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('twin creation flow accessible', async ({ page }) => {
        await page.goto('/');

        // Create twin button should be clickable
        const createButton = page.getByRole('button', { name: /Create/i });
        await expect(createButton.first()).toBeVisible();
    });
});

test.describe('Production Privacy Validation', () => {
    test('HTTPS is enforced', async ({ page }) => {
        const response = await page.goto('/');
        const url = page.url();

        // Production should use HTTPS (or localhost for local testing)
        expect(url.startsWith('https://') || url.startsWith('http://localhost')).toBe(true);
    });

    test('no sensitive data in network responses', async ({ page }) => {
        const responseData: string[] = [];

        page.on('response', async response => {
            if (response.url().includes('/api/')) {
                try {
                    const text = await response.text();
                    responseData.push(text);
                } catch {
                    // Ignore non-text responses
                }
            }
        });

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Check responses don't contain obviously sensitive fields
        const allData = responseData.join('');
        expect(allData).not.toContain('password');
        expect(allData).not.toContain('apiKey');
    });
});
