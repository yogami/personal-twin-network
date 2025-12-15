import { test, expect } from '@playwright/test';

test.describe('Personal Twin Network E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('landing page loads successfully', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Perfect People');
        await expect(page.getByRole('button', { name: /Create Your Twin/i })).toBeVisible();
    });

    test('can navigate to dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.locator('text=Your Top Matches')).toBeVisible();
    });

    test('twin creation form opens on click', async ({ page }) => {
        await page.getByRole('button', { name: /Create Your Twin/i }).click();
        await expect(page.locator('text=Create Your Digital Twin')).toBeVisible();
    });

    test('domain selector works', async ({ page }) => {
        await page.getByRole('button', { name: /Create Your Twin/i }).click();

        // Click on Events domain
        await page.getByRole('button', { name: /Events/i }).click();
        await expect(page.getByRole('button', { name: /Events/i })).toHaveClass(/active/);
    });

    test('dashboard shows match cards', async ({ page }) => {
        await page.goto('/dashboard');
        console.log('Testing URL:', page.url());

        // Wait for matches to load (increase timeout for prod)
        await page.waitForSelector('.match-card, [class*="match"]', { timeout: 10000 }).catch(() => {
            console.log('Timed out waiting for matches');
        });

        // Check for demo matches
        await expect(page.locator('text=Anna').or(page.locator('text=Max')).first()).toBeVisible();
    });

    test('QR scanner tab switches', async ({ page }) => {
        await page.goto('/dashboard');
        await page.getByRole('button', { name: /Scan QR/i }).click();
        await expect(page.getByRole('heading', { name: 'Join Event' })).toBeVisible();
    });

    test('privacy dashboard shows stats', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.locator('text=Privacy First')).toBeVisible();
        await expect(page.locator('text=On-device storage')).toBeVisible();
    });

    test('API /api/match responds', async ({ request }) => {
        const response = await request.post('/api/match', {
            data: {
                userTwin: {
                    id: 'test-twin',
                    userId: 'test-user',
                    domain: 'networking',
                    publicProfile: {
                        name: 'Test User',
                        headline: 'Tester',
                        skills: ['Testing'],
                        interests: ['QA'],
                    },
                },
                eventId: 'test-event',
                limit: 3,
            },
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.matches).toBeDefined();
    });
});
