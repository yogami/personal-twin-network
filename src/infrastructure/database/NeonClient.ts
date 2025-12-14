/**
 * NeonClient - Neon Serverless Postgres Database Client
 * 
 * Privacy-first: Only stores event metadata and user auth.
 * All twin profile data stays on-device in IndexedDB.
 */

import { neon, NeonQueryFunction } from '@neondatabase/serverless';

// Types for our database schema
export interface UserRow {
    id: string;
    email: string;
    twin_active: boolean;
    events_joined: string[];
    created_at: string;
}

export interface EventRow {
    id: string;
    qr_code: string;
    name: string;
    context_json: {
        theme: string;
        description: string;
    };
    attendee_count: number;
    max_attendees: number;
    created_at: string;
}

let sqlClient: NeonQueryFunction<false, false> | null = null;

export function getNeonClient(): NeonQueryFunction<false, false> {
    if (sqlClient) {
        return sqlClient;
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('Missing DATABASE_URL environment variable');
    }

    sqlClient = neon(connectionString);
    return sqlClient;
}

// For testing - allows injecting a mock client
export function setNeonClient(client: NeonQueryFunction<false, false>): void {
    sqlClient = client;
}

export function resetNeonClient(): void {
    sqlClient = null;
}

// Database helper functions

export async function createUser(email: string): Promise<UserRow> {
    const sql = getNeonClient();
    const result = await sql`
    INSERT INTO users (email, twin_active, events_joined)
    VALUES (${email}, false, '[]'::jsonb)
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING *
  `;
    return result[0] as UserRow;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
    const sql = getNeonClient();
    const result = await sql`
    SELECT * FROM users WHERE email = ${email}
  `;
    return result[0] as UserRow | null;
}

export async function updateUserTwinStatus(userId: string, active: boolean): Promise<void> {
    const sql = getNeonClient();
    await sql`
    UPDATE users SET twin_active = ${active} WHERE id = ${userId}
  `;
}

export async function createEvent(event: Omit<EventRow, 'id' | 'created_at' | 'attendee_count'>): Promise<EventRow> {
    const sql = getNeonClient();
    const result = await sql`
    INSERT INTO events (qr_code, name, context_json, max_attendees)
    VALUES (${event.qr_code}, ${event.name}, ${JSON.stringify(event.context_json)}, ${event.max_attendees})
    RETURNING *
  `;
    return result[0] as EventRow;
}

export async function getEventByQrCode(qrCode: string): Promise<EventRow | null> {
    const sql = getNeonClient();
    const result = await sql`
    SELECT * FROM events WHERE qr_code = ${qrCode}
  `;
    return result[0] as EventRow | null;
}

export async function getEventById(id: string): Promise<EventRow | null> {
    const sql = getNeonClient();
    const result = await sql`
    SELECT * FROM events WHERE id = ${id}
  `;
    return result[0] as EventRow | null;
}

export async function getAllEvents(): Promise<EventRow[]> {
    const sql = getNeonClient();
    const result = await sql`
    SELECT * FROM events ORDER BY created_at DESC
  `;
    return result as EventRow[];
}

export async function incrementAttendeeCount(eventId: string): Promise<number> {
    const sql = getNeonClient();
    const result = await sql`
    UPDATE events 
    SET attendee_count = attendee_count + 1 
    WHERE id = ${eventId} AND attendee_count < max_attendees
    RETURNING attendee_count
  `;
    if (!result[0]) {
        throw new Error('Event is at capacity or not found');
    }
    return (result[0] as { attendee_count: number }).attendee_count;
}

export async function decrementAttendeeCount(eventId: string): Promise<number> {
    const sql = getNeonClient();
    const result = await sql`
    UPDATE events 
    SET attendee_count = attendee_count - 1 
    WHERE id = ${eventId} AND attendee_count > 0
    RETURNING attendee_count
  `;
    if (!result[0]) {
        throw new Error('Event not found or no attendees');
    }
    return (result[0] as { attendee_count: number }).attendee_count;
}

export async function joinEvent(userId: string, eventId: string): Promise<void> {
    const sql = getNeonClient();
    await sql`
    UPDATE users 
    SET events_joined = events_joined || ${JSON.stringify([eventId])}::jsonb 
    WHERE id = ${userId}
  `;
    await incrementAttendeeCount(eventId);
}
