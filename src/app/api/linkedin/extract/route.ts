import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json(
                { message: 'URL is required' },
                { status: 400 }
            );
        }

        // Simulate network delay to make it feel real
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Basic validation
        if (!url.includes('linkedin.com/in/') && !url.includes('linkedin.com/pub/')) {
            return NextResponse.json(
                { message: 'Invalid LinkedIn URL' },
                { status: 400 }
            );
        }

        // Check for RapidAPI Key
        const apiKey = process.env.RAPIDAPI_KEY;
        const apiHost = process.env.RAPIDAPI_HOST || 'fresh-linkedin-profile-data.p.rapidapi.com';

        // If no API key, falling back to mock
        if (!apiKey) {
            console.warn('RAPIDAPI_KEY not found, using mock data');
            return NextResponse.json(getMockProfile(url));
        }

        // Call RapidAPI (Generic structure, tailored for Fresh LinkedIn Profile Data)
        const apiUrl = `https://${apiHost}/get-linkedin-profile?linkedin_url=${encodeURIComponent(url)}&include_skills=true`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': apiHost
            }
        });

        if (!response.ok) {
            console.error(`RapidAPI error: ${response.status} ${response.statusText}`);
            return NextResponse.json(getMockProfile(url));
        }

        const result = await response.json();
        const data = result.data || result; // Handle different wrapper styles

        // Map Response to our Profile format
        const profile = {
            name: data.full_name || data.name || "Unknown User",
            headline: data.headline || data.job_title || "",
            // Handle skills: could be array of strings or objects
            skills: Array.isArray(data.skills)
                ? data.skills.slice(0, 10).map((s: any) => typeof s === 'string' ? s : s.name || "")
                : [],
            interests: data.interests || [],
            bio: data.summary || data.about || data.occupation || "",
            avatar: data.profile_pic_url || data.profile_image_url || null
        };

        return NextResponse.json(profile);

    } catch (error) {
        console.error('LinkedIn extraction error:', error);
        // Fallback to mock on error to keep demo working
        return NextResponse.json(getMockProfile(url));
    }
}

// ------------------------------------------------------------------
// Mock Data Generator (Fallback)
// ------------------------------------------------------------------
function getMockProfile(url: string) {
    // Extract username/id from URL
    const parts = url.split(/\/+/);
    const inIndex = parts.indexOf('in') !== -1 ? parts.indexOf('in') : parts.indexOf('pub');
    const id = inIndex !== -1 && parts[inIndex + 1] ? parts[inIndex + 1] : 'user';

    // Format name
    const name = id
        .split('-')
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

    return {
        name: name,
        headline: "Digital Innovator | Tech Enthusiast | Building the Future",
        skills: ["Artificial Intelligence", "React", "TypeScript", "Product Management", "Web3", "System Design"],
        interests: ["Startups", "Networking", "Technology", "Innovation"],
        bio: `Hi, I'm ${name}. I'm passionate about technology and connecting with like-minded individuals. I specialize in building digital experiences and exploring new tech frontiers. (Note: Using mock profile because live scraping failed or is not configured.)`
    };
}
