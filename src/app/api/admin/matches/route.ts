/**
 * Admin Matches API
 * 
 * Handles match result reporting from consenting users.
 * Stores minimal metadata only (name, headline, score).
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory store for demo (would use Supabase in production)
interface AdminMatch {
    id: string;
    timestamp: Date;
    user1: { id: string; name: string; headline: string };
    user2: { id: string; name: string; headline: string };
    score: number;
    sharedInterests: string[];
}

// Global demo store
const demoMatches: AdminMatch[] = [];

export async function GET() {
    // Return all reported matches (for admin dashboard)
    return NextResponse.json({
        success: true,
        matches: demoMatches,
        totalUsers: new Set([
            ...demoMatches.map(m => m.user1.id),
            ...demoMatches.map(m => m.user2.id),
        ]).size,
        totalMatches: demoMatches.length,
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { user, matches } = body;

        if (!user?.id || !user?.name || !Array.isArray(matches)) {
            return NextResponse.json(
                { error: 'Invalid payload' },
                { status: 400 }
            );
        }

        // Store each match
        for (const match of matches) {
            const adminMatch: AdminMatch = {
                id: `${user.id}-${match.id}-${Date.now()}`,
                timestamp: new Date(),
                user1: {
                    id: user.id,
                    name: user.name,
                    headline: user.headline || 'Attendee',
                },
                user2: {
                    id: match.id,
                    name: match.name,
                    headline: match.headline || 'Attendee',
                },
                score: match.score,
                sharedInterests: match.sharedInterests || [],
            };

            demoMatches.push(adminMatch);
        }

        return NextResponse.json({
            success: true,
            recorded: matches.length,
        });
    } catch (error) {
        console.error('Admin match recording error:', error);
        return NextResponse.json(
            { error: 'Failed to record matches' },
            { status: 500 }
        );
    }
}
