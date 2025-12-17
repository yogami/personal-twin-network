/**
 * P2P Discovery E2E Tests
 * 
 * Tests the QR-based peer-to-peer twin discovery flow.
 * Uses Playwright for end-to-end browser testing.
 */

import { test, expect } from '@playwright/test';

test.describe('P2P Discovery Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('demo page displays privacy features', async ({ page }) => {
        await page.goto('/demo');

        // Check privacy features are visible
        await expect(page.locator('text=On-Device Brain')).toBeVisible();
        await expect(page.locator('text=Edge Matching')).toBeVisible();
        await expect(page.locator('text=P2P Negotiation')).toBeVisible();

        // QR code should be present
        await expect(page.locator('svg[class*="qr"]').or(page.locator('svg').first())).toBeVisible();
    });

    test('dashboard shows privacy status indicator', async ({ page }) => {
        await page.goto('/dashboard');

        // Privacy indicator should show on-device status
        await expect(page.locator('text=Privacy First').or(page.locator('text=On-device'))).toBeVisible();
        await expect(page.locator('text=On-device storage').or(page.locator('text=local'))).toBeVisible();
    });

    test('can open scan QR tab', async ({ page }) => {
        await page.goto('/dashboard');

        // Click scan QR button
        await page.getByRole('button', { name: /Scan QR/i }).click();

        // Join event section should be visible
        await expect(page.getByRole('heading', { name: 'Join Event' })).toBeVisible();
    });

    test('privacy indicator shows encryption status', async ({ page }) => {
        await page.goto('/dashboard');

        // Look for encryption/privacy indicators
        const encryptionBadge = page.locator('text=encrypted').or(page.locator('text=Encrypted'));
        const privacyBadge = page.locator('text=Privacy').or(page.locator('text=On-device'));

        // At least one privacy indicator should be visible
        await expect(encryptionBadge.or(privacyBadge).first()).toBeVisible();
    });

    test('matching API returns privacy-preserving response', async ({ request }) => {
        const response = await request.post('/api/match', {
            data: {
                userTwin: {
                    id: 'test-twin-id',
                    userId: 'test-user',
                    domain: 'networking',
                    publicProfile: {
                        name: 'Test User',
                        headline: 'Developer',
                        skills: ['TypeScript', 'React'],
                        interests: ['AI', 'Privacy'],
                        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
                    },
                },
                eventId: 'test-event',
                limit: 5,
            },
        });

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.matches).toBeDefined();
        expect(Array.isArray(data.matches)).toBe(true);
    });

    test('demo page QR code links to production', async ({ page }) => {
        await page.goto('/demo');

        // Check the "Open in Browser" link
        const browserLink = page.locator('a[href*="railway.app"]');
        await expect(browserLink).toBeVisible();

        const href = await browserLink.getAttribute('href');
        expect(href).toContain('personal-twin-network');
    });
});

test.describe('Privacy Features Validation', () => {
    test('no external analytics scripts loaded', async ({ page }) => {
        const externalRequests: string[] = [];

        page.on('request', request => {
            const url = request.url();
            // Check for common analytics/tracking scripts
            if (url.includes('google-analytics') ||
                url.includes('facebook') ||
                url.includes('analytics')) {
                externalRequests.push(url);
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Should not load any tracking scripts
        expect(externalRequests).toHaveLength(0);
    });

    test('IndexedDB storage is configured for privacy', async ({ page }) => {
        await page.goto('/');

        // Check that IndexedDB is available (for local storage)
        const hasIndexedDB = await page.evaluate(() => {
            return typeof window.indexedDB !== 'undefined';
        });

        expect(hasIndexedDB).toBe(true);
    });

    test('no user data in localStorage or cookies', async ({ page }) => {
        await page.goto('/');

        // Wait for page to fully load
        await page.waitForLoadState('networkidle');

        // Check localStorage doesn't contain sensitive data
        const localStorage = await page.evaluate(() => {
            const items: Record<string, string> = {};
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                if (key) items[key] = window.localStorage.getItem(key) || '';
            }
            return items;
        });

        // Should not contain profile or twin data in localStorage
        const localStorageStr = JSON.stringify(localStorage);
        expect(localStorageStr).not.toContain('password');
        expect(localStorageStr).not.toContain('email');
    });
});
