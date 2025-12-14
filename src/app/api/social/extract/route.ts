import { NextResponse } from 'next/server';
import { scrapeInstagram, scrapeLinkedIn, scrapeTwitter } from '@/lib/social-scrapers';

/**
 * Social Media Extractor API
 * Handles parsing/extraction from LinkedIn, Twitter, Instagram, etc.
 * Uses Apify for real extraction if API key is present.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const url = body.url as string;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Environment Token
        const apifyToken = process.env.APIFY_API_TOKEN;

        let data = {
            name: '',
            headline: '',
            skills: [] as string[],
            interests: [] as string[],
            bio: '',
            source: 'simulation'
        };

        const lowerUrl = url.toLowerCase();
        let realData = null;

        // ---------------------------------------------------------
        // REAL SCRAPING STRATEGY (via Apify)
        // ---------------------------------------------------------
        if (apifyToken) {
            if (lowerUrl.includes('linkedin.com')) {
                realData = await scrapeLinkedIn(url, apifyToken);
            }
            else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
                const handle = url.split('/').pop()?.split('?')[0] || '';
                if (handle) realData = await scrapeTwitter(handle, apifyToken);
            }
            else if (lowerUrl.includes('instagram.com')) {
                // Extract username: instagram.com/username/ or instagram.com/username
                const parts = url.split('/').filter(p => p.length > 0);
                const username = parts[parts.length - 1] === 'instagram.com' ? '' : parts[parts.length - 1]; // basic parsing
                if (username) realData = await scrapeInstagram(username, apifyToken);
            }
        }

        if (realData) {
            data = { ...data, ...realData, source: 'apify-real-time' };
        } else {
            // ---------------------------------------------------------
            // FALLBACK / SIMULATION (If no key or scrape failed)
            // ---------------------------------------------------------
            // Emulate processing delay
            await new Promise(r => setTimeout(r, 800));

            if (lowerUrl.includes('linkedin.com')) {
                data.name = "LinkedIn User (Simulated)";
                data.headline = "Professional";
                data.skills = ["Networking", "Business"];
                data.interests = ["Career Growth"];
                data.bio = "Extracted from LinkedIn (Mock)";
            }
            else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
                data.name = "Twitter User (Simulated)";
                data.headline = "Opinionated Tweeter";
                data.interests = ["News", "Politics", "Tech", "Memes"];
                data.skills = ["Communication", "Short-form Writing"];
                data.bio = "Extracted from Twitter (Mock)";
            }
            else if (lowerUrl.includes('instagram.com')) {
                data.name = "Instagram User (Simulated)";
                data.headline = "Visual Storyteller";
                data.interests = ["Photography", "Travel", "Lifestyle", "Fashion"];
                data.skills = ["Creativity", "Social Media"];
                data.bio = "Extracted from Instagram (Mock)";
            }
            else if (lowerUrl.includes('github.com')) {
                // We didn't implement real GitHub fetching yet, sticking to mock
                data.name = "GitHub Dev";
                data.headline = "Open Source Contributor";
                data.skills = ["Coding", "Git", "Software Engineering"];
                data.interests = ["Open Source", "Hackathons"];
                data.bio = "Extracted from GitHub (Mock)";
            }
            else {
                data.name = "Web User";
                data.interests = ["Web Surfing"];
                data.bio = "Extracted from generic URL";
            }
        }

        return NextResponse.json(data);

    } catch (e) {
        console.error('Social extraction error', e);
        return NextResponse.json({ error: 'Failed to extract' }, { status: 500 });
    }
}
