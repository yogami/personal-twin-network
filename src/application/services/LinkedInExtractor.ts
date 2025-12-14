/**
 * LinkedInExtractor - Extracts public profile data from LinkedIn URL
 * 
 * Uses server-side API to safely scrape public profile data.
 * Falls back to manual input if extraction fails.
 */

export interface ExtractedProfile {
    name: string;
    headline: string;
    skills: string[];
    interests: string[];
    linkedinUrl: string;
}

export interface ExtractionResult {
    success: boolean;
    profile?: ExtractedProfile;
    error?: string;
}

/**
 * Validates LinkedIn URL format
 */
export function isValidLinkedInUrl(url: string): boolean {
    const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[\w-]+\/?$/i;
    return linkedinPattern.test(url);
}

/**
 * Cleans and normalizes LinkedIn URL
 */
export function normalizeLinkedInUrl(url: string): string {
    // Remove trailing slash and query parameters
    return url.split('?')[0].replace(/\/$/, '');
}

/**
 * Extracts profile from LinkedIn URL via API
 * Server-side only - called from API route
 */
export async function extractLinkedInProfile(url: string): Promise<ExtractionResult> {
    if (!isValidLinkedInUrl(url)) {
        return {
            success: false,
            error: 'Invalid LinkedIn URL format',
        };
    }

    const normalizedUrl = normalizeLinkedInUrl(url);

    try {
        // Call our API route for extraction
        const response = await fetch('/api/linkedin/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: normalizedUrl }),
        });

        if (!response.ok) {
            const error = await response.json();
            return {
                success: false,
                error: error.message || 'Failed to extract profile',
            };
        }

        const profile = await response.json();
        return {
            success: true,
            profile: {
                ...profile,
                linkedinUrl: normalizedUrl,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: 'Network error - try pasting your bio manually',
        };
    }
}

/**
 * Parses manually entered bio into profile structure
 */
export function parseManualProfile(name: string, headline: string, bio: string): ExtractedProfile {
    // Extract skills from bio (look for common patterns)
    const skills = extractSkillsFromText(bio);
    const interests = extractInterestsFromText(bio);

    return {
        name: name.trim(),
        headline: headline.trim(),
        skills,
        interests,
        linkedinUrl: '',
    };
}

/**
 * Extracts skills from bio text using keyword matching
 */
function extractSkillsFromText(text: string): string[] {
    const commonSkills = [
        'JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'AI', 'ML',
        'Machine Learning', 'Data Science', 'Product Management', 'Agile',
        'Scrum', 'AWS', 'Cloud', 'DevOps', 'Docker', 'Kubernetes', 'Design',
        'UX', 'UI', 'Marketing', 'Sales', 'Business Development', 'Strategy',
        'Leadership', 'Management', 'Engineering', 'Architecture', 'Blockchain',
        'Web3', 'Mobile', 'iOS', 'Android', 'Flutter', 'Next.js', 'GraphQL',
    ];

    const foundSkills: string[] = [];
    const lowerText = text.toLowerCase();

    for (const skill of commonSkills) {
        if (lowerText.includes(skill.toLowerCase())) {
            foundSkills.push(skill);
        }
    }

    return [...new Set(foundSkills)].slice(0, 10); // Max 10 skills
}

/**
 * Extracts interests from bio text
 */
function extractInterestsFromText(text: string): string[] {
    const commonInterests = [
        'AI', 'Startups', 'Innovation', 'Tech', 'Entrepreneurship',
        'Sustainability', 'Climate', 'Health', 'Fintech', 'EdTech',
        'Gaming', 'Music', 'Art', 'Travel', 'Sports', 'Fitness',
        'Investing', 'Venture Capital', 'Open Source', 'Community',
    ];

    const foundInterests: string[] = [];
    const lowerText = text.toLowerCase();

    for (const interest of commonInterests) {
        if (lowerText.includes(interest.toLowerCase())) {
            foundInterests.push(interest);
        }
    }

    return [...new Set(foundInterests)].slice(0, 5);
}
