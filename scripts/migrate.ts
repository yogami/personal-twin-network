/**
 * Database Migration Script
 * Run: npx tsx scripts/migrate.ts
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
    console.log('Running database migration...');

    try {
        // Create users table
        await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        twin_active BOOLEAN DEFAULT FALSE,
        events_joined JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
        console.log('✓ Created users table');

        // Create events table
        await sql`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        qr_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        attendee_count INTEGER DEFAULT 0,
        max_attendees INTEGER NOT NULL DEFAULT 50,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
        console.log('✓ Created events table');

        // Create indexes
        await sql`CREATE INDEX IF NOT EXISTS idx_events_qr_code ON events(qr_code)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_users_twin_active ON users(twin_active)`;
        console.log('✓ Created indexes');

        // Insert demo event
        await sql`
      INSERT INTO events (qr_code, name, context_json, max_attendees)
      VALUES (
        'event:berlin-ai-2024:demo',
        'Berlin AI Meetup',
        '{"theme": "AI & Tech", "description": "Monthly AI networking event in Berlin"}'::jsonb,
        50
      )
      ON CONFLICT (qr_code) DO NOTHING
    `;
        console.log('✓ Created demo event');

        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
