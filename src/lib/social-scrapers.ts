
interface ApifyResult {
    [key: string]: any;
}

/**
 * Generic helper to run an Apify Actor and wait for results.
 * We use the REST API to avoid adding heavy npm dependencies.
 */
async function runApifyActor(actorId: string, input: any, token: string): Promise<ApifyResult | null> {
    try {
        // 1. Start the Actor
        const startRes = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });

        if (!startRes.ok) {
            console.error(`Apify start failed: ${startRes.status} ${startRes.statusText}`);
            return null;
        }

        const startData = await startRes.json();
        const runId = startData.data.id;

        // 2. Poll for completion (Simple polling for MVP)
        // In prod, use webhooks. Here we wait explicitly.
        let isFinished = false;
        let attempts = 0;
        while (!isFinished && attempts < 20) { // Max 40 seconds wait
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
            const statusData = await statusRes.json();
            const status = statusData.data.status;

            if (status === 'SUCCEEDED') isFinished = true;
            else if (status === 'FAILED' || status === 'ABORTED') {
                console.error('Apify run failed/aborted');
                return null;
            }
            attempts++;
        }

        if (!isFinished) return null; // Timed out

        // 3. Fetch Results
        const datasetId = startData.data.defaultDatasetId;
        const resultRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
        const resultData = await resultRes.json();

        return resultData.length > 0 ? resultData[0] : null;

    } catch (e) {
        console.error("Apify Execution Error", e);
        return null;
    }
}

export async function scrapeInstagram(username: string, token: string) {
    // Actor: apify/instagram-profile-scraper
    // Free usage is reasonable.
    const input = { usernames: [username] };
    const raw = await runApifyActor('apify/instagram-profile-scraper', input, token);
    if (!raw) return null;

    return {
        name: raw.fullName || raw.username,
        headline: raw.biography,
        bio: raw.biography,
        interests: ['Visual Arts', 'Lifestyle'], // Cannot easily infer from specialized profile data without posts
        skills: []
    };
}

export async function scrapeTwitter(handle: string, token: string) {
    // Actor: apify/twitter-scraper
    // Note: Twitter scraping is volatile.
    const input = { handles: [handle], tweetsDesired: 5 };
    const raw = await runApifyActor('apify/twitter-scraper', input, token);

    // Twitter scraper often returns tweets. We need profile.
    // This calls for a specific profile scraper or analyzing tweets.
    // For MVP, we assume we get some user object or first tweet.

    // NOTE: Many free twitter scrapers are broken. 
    // We will attempt best effort mapping if data exists.
    return raw ? {
        name: raw.user?.name || raw.name,
        headline: raw.user?.description || raw.description, // Twitter bio
        bio: raw.user?.description || raw.description,
        interests: ['Trends', 'News'],
        skills: []
    } : null;
}

export async function scrapeLinkedIn(url: string, token: string) {
    // Actor: apify/linkedin-profile-scraper
    const input = { urls: [url] };
    const raw = await runApifyActor('apify~linkedin-profile-scraper', input, token);

    // Map their complex schema to ours
    if (!raw) return null;

    return {
        name: raw.fullName || `${raw.firstName} ${raw.lastName}`,
        headline: raw.headline,
        bio: raw.summary,
        skills: raw.skills?.map((s: any) => s.name) || [],
        interests: []
    };
}
