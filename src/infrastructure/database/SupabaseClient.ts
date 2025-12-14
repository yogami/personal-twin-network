/**
 * Supabase Client Configuration
 * 
 * Singleton pattern for database connection.
 * Environment variables required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types for our database schema
export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    twin_active: boolean;
                    events_joined: string[];
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    email: string;
                    twin_active?: boolean;
                    events_joined?: string[];
                };
                Update: {
                    twin_active?: boolean;
                    events_joined?: string[];
                };
            };
            events: {
                Row: {
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
                };
                Insert: {
                    id?: string;
                    qr_code: string;
                    name: string;
                    context_json: {
                        theme: string;
                        description: string;
                    };
                    max_attendees: number;
                };
                Update: {
                    attendee_count?: number;
                    context_json?: {
                        theme: string;
                        description: string;
                    };
                };
            };
        };
    };
}

let supabaseInstance: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
    if (supabaseInstance) {
        return supabaseInstance;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
    }

    supabaseInstance = createClient<Database>(supabaseUrl, supabaseKey);
    return supabaseInstance;
}

// For testing - allows injecting a mock client
export function setSupabaseClient(client: SupabaseClient<Database>): void {
    supabaseInstance = client;
}

export function resetSupabaseClient(): void {
    supabaseInstance = null;
}
