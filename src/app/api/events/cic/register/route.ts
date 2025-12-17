/**
 * POST /api/events/cic/register - CIC Berlin Webhook Endpoint
 * 
 * Called by CIC when an attendee scans their check-in QR.
 * Returns an activation URL for redirect to our app.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getCICIntegrationService,
    validateCICPayload
} from '@/infrastructure/integrations/CICIntegrationService';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate payload
        if (!validateCICPayload(body)) {
            return NextResponse.json(
                {
                    error: 'Invalid payload',
                    required: ['eventId', 'attendeeId', 'attendeeName', 'timestamp']
                },
                { status: 400 }
            );
        }

        // Generate activation URL
        const service = getCICIntegrationService();
        const result = await service.generateActivationURL(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            activationUrl: result.activationUrl,
            message: 'Redirect attendee to activationUrl to activate their Digital Twin',
        });
    } catch (error) {
        console.error('CIC webhook error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Optional: GET for health check
export async function GET() {
    return NextResponse.json({
        service: 'CIC Berlin Integration',
        status: 'healthy',
        version: '1.0.0',
        documentation: 'POST with { eventId, attendeeId, attendeeName, timestamp } to get activationUrl',
    });
}
