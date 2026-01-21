/**
 * CIC Demo Flow E2E Tests
 * 
 * Full end-to-end tests for the CIC Berlin demo:
 * - Guest identity creation
 * - Zero-friction onboarding (LinkedIn -> Voice -> Auto-Match)
 * - Privacy Sovereignty Monitor
 * - Admin dashboard
 */

import { test, expect } from '@playwright/test';

test.describe('CIC Demo Flow', () => {
    test.describe('Guest Identity', () => {
        test('creates guest identity on first visit', async ({ page }) => {
            await page.goto('/cic-demo');
            await expect(page.locator('h1')).toContainText('Welcome to CIC');
            await expect(page.locator('.guest-id')).toContainText('Guest-');
        });

        test('shows privacy promise on welcome', async ({ page }) => {
            await page.goto('/cic-demo');
            await expect(page.locator('.privacy-promise')).toBeVisible();
            await expect(page.locator('text=Sovereign Data Mode')).toBeVisible();
        });
    });

    test.describe('Zero Friction Onboarding', () => {
        test('progresses through steps with consensus on welcome', async ({ page }) => {
            await page.goto('/cic-demo');

            // Must check consent
            await expect(page.locator('button:has-text("Start Check-in")')).toBeDisabled();
            await page.click('#welcome-consent');
            await page.click('text=Start Check-in');

            // Step: LinkedIn
            await expect(page.locator('h2')).toContainText('Import Identity');
            await page.click('text=Skip');

            // Step: Voice
            await expect(page.locator('h2')).toContainText('Voice Mind-Meld');
            await page.click('text=Skip');

            // Step: Matching (Auto-transition)
            await expect(page.locator('h2')).toContainText('Building Your Twin');

            // Should see Sovereignty Monitor
            await expect(page.locator('.sovereignty-monitor')).toBeVisible();
            await expect(page.locator('text=LIVE PRIVACY AUDIT')).toBeVisible();
        });
    });

    test.describe('Matching Flow', () => {
        test('shows matches automatically after entry', async ({ page }) => {
            await page.goto('/cic-demo');
            await page.click('#welcome-consent');
            await page.click('text=Start Check-in');
            await page.click('text=Skip');
            await page.click('text=Skip');

            // Wait for results (increased timeout for monitor theater)
            await page.waitForSelector('text=Top Matches', { timeout: 15000 });
            await expect(page.locator('.match-card').first()).toBeVisible();
        });
    });

    test.describe('STT Simulation & AI Magic', () => {
        test('simulates voice and verifies auto-match transition', async ({ page }) => {
            // Mock Interview API
            await page.route('**/api/twin/interview', async route => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        isComplete: true,
                        nextQuestion: "Done!",
                        extractedProfile: { interests: ['AI/ML'] }
                    })
                });
            });

            // Mock Hardware
            await page.addInitScript(() => {
                (window as any).speechSynthesis = {
                    speak: (u: any) => { u.onstart?.(); setTimeout(() => u.onend?.(), 100); },
                    cancel: () => { },
                    getVoices: () => []
                };
                class MockRecognition {
                    onresult: any; onend: any; onstart: any;
                    start() {
                        this.onstart?.();
                        setTimeout(() => {
                            this.onresult?.({ results: { 0: { 0: { transcript: "AI builder" }, isFinal: true }, length: 1 }, resultIndex: 0 });
                            setTimeout(() => this.onend?.(), 100);
                        }, 500);
                    }
                    stop() { }
                    abort() { }
                }
                (window as any).SpeechRecognition = MockRecognition;
                (window as any).webkitSpeechRecognition = MockRecognition;
            });

            await page.goto('/cic-demo');
            await page.click('#welcome-consent');
            await page.click('text=Start Check-in');
            await page.click('text=Skip'); // LinkedIn

            // Speak
            await page.click('.mic-btn');

            // Wait for Auto-transition to matching
            await expect(page.locator('h2')).toContainText('Building Your Twin', { timeout: 10000 });

            // Check magic tags in monitor
            await expect(page.locator('.tag-float')).toContainText('AI/ML');
        });
    });

    test.describe('Admin Dashboard', () => {
        test('requires PIN and shows live feed', async ({ page }) => {
            await page.goto('/admin');
            await page.fill('input[type="password"]', 'CIC2025');
            await page.click('text=Access Dashboard');
            await expect(page.locator('text=● LIVE')).toBeVisible();
        });
    });
});
