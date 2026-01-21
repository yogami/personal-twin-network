/**
 * CIC Demo Flow E2E Tests
 * 
 * Full end-to-end tests for the CIC Berlin demo:
 * - Guest identity creation
 * - Onboarding wizard steps
 * - Privacy indicators
 * - Admin dashboard
 * 
 * Run: BASE_URL=https://personal-twin-network-production.up.railway.app npx playwright test tests/e2e/cic-demo-flow.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('CIC Demo Flow', () => {
    test.describe('Guest Identity', () => {
        test('creates guest identity on first visit', async ({ page }) => {
            await page.goto('/cic-demo');

            // Should see welcome step
            await expect(page.locator('h1')).toContainText('Welcome to CIC');

            // Should have guest badge in header
            await expect(page.locator('.guest-id')).toBeVisible();
            await expect(page.locator('.guest-id')).toContainText('Guest-');
        });

        test('shows privacy promise on welcome', async ({ page }) => {
            await page.goto('/cic-demo');

            await expect(page.locator('.privacy-promise')).toBeVisible();
            await expect(page.locator('text=Privacy First')).toBeVisible();
            await expect(page.locator('text=Your data stays on your phone')).toBeVisible();
        });
    });

    test.describe('Onboarding Wizard', () => {
        test('progresses through steps', async ({ page }) => {
            await page.goto('/cic-demo');

            // Step 1: Welcome - click Get Started
            await page.click('text=Get Started');

            // Step 2: LinkedIn - skip it
            await expect(page.locator('h2')).toContainText('Import Your Profile');
            await page.click('text=Skip');

            // Step 3: Voice - skip it
            await expect(page.locator('h2')).toContainText('Quick Voice');
            await page.click('text=Skip voice');

            // Step 4: Interests
            await expect(page.locator('h2')).toContainText('What are you into');

            // Select interests
            await page.click('button:has-text("AI/ML")');
            await page.click('button:has-text("Startups")');

            // Should have selected class
            await expect(page.locator('button:has-text("AI/ML")')).toHaveClass(/selected/);

            // Continue to consent
            await page.click('text=Continue');

            // Step 5: Consent
            await expect(page.locator('h2')).toContainText('Almost there');
        });

        test('linkedin input validation', async ({ page }) => {
            await page.goto('/cic-demo');
            await page.click('text=Get Started');

            // Try invalid URL
            await page.fill('input[placeholder*="linkedin"]', 'not-a-url');
            await page.click('text=Extract');

            // Should show error
            await expect(page.locator('.error-text')).toContainText('valid LinkedIn URL');
        });

        test('interests required for continue', async ({ page }) => {
            await page.goto('/cic-demo');
            await page.click('text=Get Started');
            await page.click('text=Skip');
            await page.click('text=Skip voice');

            // Continue button should be disabled without interests
            await expect(page.locator('button:has-text("Continue")')).toBeDisabled();

            // Select an interest
            await page.click('button:has-text("FinTech")');

            // Now button should be enabled
            await expect(page.locator('button:has-text("Continue")')).toBeEnabled();
        });
    });

    test.describe('Privacy Indicators', () => {
        test('shows privacy badge on all pages', async ({ page }) => {
            await page.goto('/cic-demo');

            // Privacy badge should be visible
            await expect(page.locator('text=On-Device')).toBeVisible();
        });

        test('shows privacy cockpit on consent step', async ({ page }) => {
            await page.goto('/cic-demo');
            await page.click('text=Get Started');
            await page.click('text=Skip');
            await page.click('text=Skip voice');
            await page.click('button:has-text("AI/ML")');
            await page.click('text=Continue');

            // Privacy cockpit should show
            await expect(page.locator('text=Your Data, Your Control')).toBeVisible();
            await expect(page.locator('text=On Your Phone')).toBeVisible();
            await expect(page.locator('text=GDPR Compliant')).toBeVisible();
        });

        test('consent checkbox controls find matches button', async ({ page }) => {
            await page.goto('/cic-demo');
            await page.click('text=Get Started');
            await page.click('text=Skip');
            await page.click('text=Skip voice');
            await page.click('button:has-text("AI/ML")');
            await page.click('text=Continue');

            // Find Matches button should be disabled initially
            await expect(page.locator('button:has-text("Find My Matches")')).toBeDisabled();

            // Check consent
            await page.click('#consent');

            // Now button should be enabled
            await expect(page.locator('button:has-text("Find My Matches")')).toBeEnabled();
        });
    });

    test.describe('Matching Flow', () => {
        test('shows matches after consent and search', async ({ page }) => {
            await page.goto('/cic-demo');
            await page.click('text=Get Started');
            await page.click('text=Skip');
            await page.click('text=Skip voice');
            await page.click('button:has-text("AI/ML")');
            await page.click('button:has-text("Engineering")');
            await page.click('text=Continue');

            // Give consent and search
            await page.click('#consent');
            await page.click('button:has-text("Find My Matches")');

            // Should show matching animation
            await expect(page.locator('text=Finding your perfect matches')).toBeVisible();

            // Wait for results
            await page.waitForSelector('text=Your Top Matches', { timeout: 10000 });

            // Should show match results
            await expect(page.locator('.match-card').first()).toBeVisible();
        });
    });
});

test.describe('STT Simulation & AI Magic', () => {
    test('simulates voice input and verifies AI-generated interests', async ({ page }) => {
        // 1. Mock the Interview API to return 'interests'
        await page.route('**/api/twin/interview', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    isComplete: true,
                    nextQuestion: "That's great!",
                    extractedProfile: {
                        interests: ['AI/ML', 'Startups']
                    }
                })
            });
        });

        // 2. Inject robust mocks for Speech Recognition AND Synthesis
        await page.addInitScript(() => {
            // Mock Synthesis
            (window as any).speechSynthesis = {
                speak: (utterance: any) => {
                    setTimeout(() => {
                        if (utterance.onstart) utterance.onstart();
                        setTimeout(() => {
                            if (utterance.onend) utterance.onend();
                        }, 100);
                    }, 10);
                },
                cancel: () => { },
                getVoices: () => []
            };

            class MockRecognition {
                onresult: any = null;
                onend: any = null;
                continuous = false;
                interimResults = false;
                lang = 'en-US';

                start() {
                    setTimeout(() => {
                        if (this.onresult) {
                            this.onresult({
                                results: {
                                    0: {
                                        0: { transcript: "I love building AI startups", confidence: 1 },
                                        length: 1,
                                        isFinal: true
                                    },
                                    length: 1
                                },
                                resultIndex: 0
                            });
                        }
                        // Small delay to ensure transcriptRef updates
                        setTimeout(() => {
                            if (this.onend) this.onend();
                        }, 100);
                    }, 1000);
                }
                stop() { }
                abort() { }
            }
            (window as any).webkitSpeechRecognition = MockRecognition;
            (window as any).SpeechRecognition = MockRecognition;
        });

        await page.goto('/cic-demo');
        await page.click('text=Get Started');
        await page.click('text=Skip'); // LinkedIn

        // Trigger microphone
        await page.click('.mic-btn:has-text("Speak")');

        // Wait for simulated transcript
        await expect(page.locator('.user-transcript')).toContainText('AI startups', { timeout: 10000 });

        // Wait for step transition to interests (AI should mark it complete)
        await expect(page.locator('h2')).toContainText('Confirm Your Interests', { timeout: 15000 });

        // Check for MAGIC ✨ badges on pre-selected interests
        await expect(page.locator('button:has-text("AI/ML") .ai-badge')).toBeVisible();
        await expect(page.locator('button:has-text("Startups") .ai-badge')).toBeVisible();

        // Other tags should NOT have sparkles
        await expect(page.locator('button:has-text("FinTech") .ai-badge')).not.toBeVisible();
    });
});

test.describe('Admin Dashboard', () => {
    test('requires PIN to access', async ({ page }) => {
        await page.goto('/admin');

        await expect(page.locator('h1')).toContainText('CIC Admin Dashboard');
        await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('rejects invalid PIN', async ({ page }) => {
        await page.goto('/admin');

        await page.fill('input[type="password"]', 'wrong');
        await page.click('text=Access Dashboard');

        await expect(page.locator('.error')).toContainText('Invalid PIN');
    });

    test('accepts correct PIN and shows dashboard', async ({ page }) => {
        await page.goto('/admin');

        await page.fill('input[type="password"]', 'CIC2025');
        await page.click('text=Access Dashboard');

        // Should show dashboard
        await expect(page.locator('text=● LIVE')).toBeVisible();
        await expect(page.locator('text=Active Users')).toBeVisible();
        await expect(page.locator('text=Matches Made')).toBeVisible();
        await expect(page.locator('text=Live Match Feed')).toBeVisible();
    });

    test('shows privacy compliance badge', async ({ page }) => {
        await page.goto('/admin');
        await page.fill('input[type="password"]', 'CIC2025');
        await page.click('text=Access Dashboard');

        await expect(page.locator('text=Privacy Compliant')).toBeVisible();
        await expect(page.locator('text=GDPR Compliant')).toBeVisible();
    });

    test('can seed demo data', async ({ page }) => {
        await page.goto('/admin');
        await page.fill('input[type="password"]', 'CIC2025');
        await page.click('text=Access Dashboard');

        // Click seed button
        await page.click('text=Seed Demo Data');

        // Should not error
        await expect(page.locator('text=Live Match Feed')).toBeVisible();
    });
});

test.describe('API Endpoints', () => {
    test('GET /api/admin/seed returns attendees', async ({ request }) => {
        const response = await request.get('/api/admin/seed');

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.attendees).toBeDefined();
        expect(data.count).toBeGreaterThan(0);
    });

    test('GET /api/admin/matches returns stats', async ({ request }) => {
        const response = await request.get('/api/admin/matches');

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.matches).toBeDefined();
        expect(data.totalUsers).toBeDefined();
        expect(data.totalMatches).toBeDefined();
    });

    test('POST /api/admin/matches records match', async ({ request }) => {
        const response = await request.post('/api/admin/matches', {
            data: {
                user: {
                    id: 'test-user',
                    name: 'Test User',
                    headline: 'Tester',
                },
                matches: [
                    {
                        id: 'matched-user',
                        name: 'Matched User',
                        headline: 'Developer',
                        score: 85,
                        sharedInterests: ['AI/ML'],
                    },
                ],
            },
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.recorded).toBe(1);
    });
});
