-- Personal Twin Network - Neon Database Schema
-- Privacy-first: ZERO personal profile data stored

-- Users table (minimal - only auth and twin status)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  twin_active BOOLEAN DEFAULT FALSE,
  events_joined JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (networking events with QR codes)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  attendee_count INTEGER DEFAULT 0,
  max_attendees INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_qr_code ON events(qr_code);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_twin_active ON users(twin_active);
