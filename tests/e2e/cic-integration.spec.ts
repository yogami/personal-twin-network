/**
 * CIC Berlin Integration E2E Tests
 * 
 * Tests the full flow of CIC QR check-in integration.
 */

import { test, expect } from '@playwright/test';

test.describe('CIC Berlin Integration', () => {
    test.describe('Scan Page', () => {
        test('scan page loads correctly', async ({ page }) => {
            await page.goto('/scan');

            await expect(page.locator('h1')).toContainText('Scan QR Code');
            await expect(page.locator('text=Event Check-In QR')).toBeVisible();
            await expect(page.locator('text=Peer QR Code')).toBeVisible();
        });

        test('has back link to home', async ({ page }) => {
            await page.goto('/scan');

            await expect(page.locator('a[href="/"]')).toBeVisible();
        });

        test('shows instructions for both QR types', async ({ page }) => {
            await page.goto('/scan');

            await expect(page.locator('text=CIC Berlin entrance')).toBeVisible();
            await expect(page.locator('text=connect directly P2P')).toBeVisible();
        });
    });

    test.describe('Activate Page', () => {
        test('activate page loads with empty params', async ({ page }) => {
            await page.goto('/activate');

            await expect(page.locator('h1')).toContainText('Activate Your Digital Twin');
            await expect(page.locator('text=30 seconds')).toBeVisible();
        });

        test('pre-fills name from URL params', async ({ page }) => {
            await page.goto('/activate?name=Max%20Mustermann&event=cic-berlin-2025');

            const nameInput = page.locator('input[placeholder*="name"]');
            await expect(nameInput).toHaveValue('Max Mustermann');
        });

        test('pre-fills role from URL params', async ({ page }) => {
            await page.goto('/activate?role=Developer&event=test');

            const roleInput = page.locator('input[placeholder*="role"]');
            await expect(roleInput).toHaveValue('Developer');
        });

        test('shows interest selection', async ({ page }) => {
            await page.goto('/activate');

            await expect(page.locator('text=AI/ML')).toBeVisible();
            await expect(page.locator('text=Startups')).toBeVisible();
            await expect(page.locator('text=Product')).toBeVisible();
        });

        test('can select interests', async ({ page }) => {
            await page.goto('/activate');

            // Click on an interest
            await page.locator('button:has-text("AI/ML")').click();

            // Should be selected (has different styling)
            await expect(page.locator('button:has-text("AI/ML")')).toHaveClass(/selected/);
        });

        test('shows privacy note', async ({ page }) => {
            await page.goto('/activate');

            await expect(page.locator('text=Your data stays on your device')).toBeVisible();
        });

        test('activate button requires interests', async ({ page }) => {
            await page.goto('/activate');

            // Button should be disabled without interests
            await expect(page.locator('button:has-text("Activate")')).toBeDisabled();

            // Select an interest
            await page.locator('button:has-text("AI/ML")').click();

            // Button should be enabled
            await expect(page.locator('button:has-text("Activate")')).toBeEnabled();
        });
    });

    test.describe('CIC API Endpoint', () => {
        test('GET returns service info', async ({ request }) => {
            const response = await request.get('/api/events/cic/register');

            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(data.service).toBe('CIC Berlin Integration');
            expect(data.status).toBe('healthy');
        });

        test('POST with valid payload returns activation URL', async ({ request }) => {
            const response = await request.post('/api/events/cic/register', {
                data: {
                    eventId: 'cic-berlin-2025',
                    eventName: 'CIC Berlin AI Conference',
                    attendeeId: 'att-test-123',
                    attendeeName: 'Test User',
                    attendeeRole: 'Developer',
                    timestamp: new Date().toISOString(),
                },
            });

            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.activationUrl).toContain('/activate');
            expect(data.activationUrl).toContain('event=cic-berlin-2025');
        });

        test('POST with missing fields returns 400', async ({ request }) => {
            const response = await request.post('/api/events/cic/register', {
                data: {
                    eventId: 'test',
                    // Missing required fields
                },
            });

            expect(response.status()).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Invalid payload');
        });
    });
});

test.describe('Multi-User P2P Flow', () => {
    test('demo page generates QR for P2P', async ({ page }) => {
        await page.goto('/demo');

        // QR code should be present
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('scan page can route to dashboard after peer scan', async ({ page }) => {
        // Simulate a peer payload in session storage
        await page.goto('/scan');

        await page.evaluate(() => {
            sessionStorage.setItem('peerRoomId', 'test-room-123');
            sessionStorage.setItem('peerPublicKey', 'test-key');
        });

        // Navigate to dashboard with joined flag
        await page.goto('/dashboard?joined=true');

        // Should load dashboard
        await expect(page.locator('text=Matches').or(page.locator('text=Top'))).toBeVisible();
    });
});
