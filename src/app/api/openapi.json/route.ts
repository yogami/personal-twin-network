/**
 * OpenAPI JSON Endpoint
 * GET /api/openapi.json
 * 
 * Returns the OpenAPI 3.0 specification for Agent Manager discovery.
 */

import { NextResponse } from 'next/server';
import { generateOpenAPISpec } from '@/api/openapi';

export async function GET() {
    const spec = generateOpenAPISpec();

    return NextResponse.json(spec, {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}
