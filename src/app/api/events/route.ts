/**
 * POST /api/events - Create a new event
 * GET /api/events - List all events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createEvent, getAllEvents } from '@/infrastructure/database/NeonClient';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const events = await getAllEvents();
        return NextResponse.json(events);
    } catch (error) {
        console.error('Failed to fetch events:', error);
        return NextResponse.json(
            { error: 'Failed to fetch events' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, theme, description, maxAttendees = 50 } = body;

        if (!name || !theme) {
            return NextResponse.json(
                { error: 'Name and theme are required' },
                { status: 400 }
            );
        }

        const qrCode = `event:${uuidv4()}:${Date.now()}`;

        const event = await createEvent({
            qr_code: qrCode,
            name,
            context_json: { theme, description: description || '' },
            max_attendees: maxAttendees,
        });

        return NextResponse.json(event, { status: 201 });
    } catch (error) {
        console.error('Failed to create event:', error);
        return NextResponse.json(
            { error: 'Failed to create event' },
            { status: 500 }
        );
    }
}
