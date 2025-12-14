/**
 * POST /api/match - Find matches for a user at an event
 */

import { NextRequest, NextResponse } from 'next/server';
import { OpenAIService } from '@/infrastructure/ai/OpenAIService';
import { Twin } from '@/domain/entities/Twin';

// Demo twin profiles for event attendees
const demoAttendees: Twin[] = [
    {
        id: 'twin-anna',
        userId: 'user-anna',
        domain: 'networking',
        publicProfile: {
            name: 'Anna Kowalski',
            headline: 'AI Research Lead at TechLab Berlin',
            skills: ['Machine Learning', 'Python', 'TensorFlow', 'NLP'],
            interests: ['AI Ethics', 'Startups', 'Climate Tech'],
        },
        active: true,
        createdAt: new Date(),
    },
    {
        id: 'twin-max',
        userId: 'user-max',
        domain: 'networking',
        publicProfile: {
            name: 'Max Richter',
            headline: 'Founder & CEO @ InnoScale',
            skills: ['Leadership', 'Strategy', 'Fundraising', 'Product'],
            interests: ['Startups', 'SaaS', 'Venture Capital'],
        },
        active: true,
        createdAt: new Date(),
    },
    {
        id: 'twin-lisa',
        userId: 'user-lisa',
        domain: 'networking',
        publicProfile: {
            name: 'Lisa Chen',
            headline: 'Senior Product Manager at Stripe',
            skills: ['Product Management', 'Agile', 'Fintech', 'UX'],
            interests: ['Fintech', 'B2B SaaS', 'Design'],
        },
        active: true,
        createdAt: new Date(),
    },
    {
        id: 'twin-david',
        userId: 'user-david',
        domain: 'networking',
        publicProfile: {
            name: 'David Mueller',
            headline: 'Full Stack Engineer at Vercel',
            skills: ['TypeScript', 'React', 'Node.js', 'Next.js'],
            interests: ['Open Source', 'DevTools', 'Web3'],
        },
        active: true,
        createdAt: new Date(),
    },
    {
        id: 'twin-sophia',
        userId: 'user-sophia',
        domain: 'networking',
        publicProfile: {
            name: 'Sophia Wagner',
            headline: 'UX Director at Figma',
            skills: ['Design Systems', 'User Research', 'Prototyping'],
            interests: ['Design', 'Accessibility', 'Creative Tech'],
        },
        active: true,
        createdAt: new Date(),
    },
];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userTwin, eventId, limit = 3 } = body;

        if (!userTwin || !userTwin.publicProfile) {
            return NextResponse.json(
                { error: 'User twin profile is required' },
                { status: 400 }
            );
        }

        // Initialize OpenAI service
        const matchingService = new OpenAIService();

        // In production, get real attendees from event
        // For now, use demo attendees
        const candidates = demoAttendees.filter(
            (a) => a.id !== userTwin.id
        );

        // Find matches using AI
        const matches = await matchingService.findMatches({
            userTwin,
            candidateTwins: candidates,
            eventContext: { theme: 'Berlin Tech Meetup', description: 'Networking event' },
        });

        // Return top N matches
        const topMatches = matches.slice(0, limit);

        return NextResponse.json({
            success: true,
            matches: topMatches,
            eventId,
            totalCandidates: candidates.length,
        });
    } catch (error) {
        console.error('Matching error:', error);
        return NextResponse.json(
            { error: 'Failed to find matches', details: String(error) },
            { status: 500 }
        );
    }
}
