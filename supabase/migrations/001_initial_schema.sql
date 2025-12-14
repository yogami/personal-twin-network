-- Personal Twin Network - Initial Schema
-- Following privacy-first principle: ZERO personal data stored

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

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Events are publicly readable (for QR discovery)
CREATE POLICY "Events are publicly readable" ON events
  FOR SELECT TO authenticated, anon USING (true);

-- Only authenticated users can join events
CREATE POLICY "Authenticated users can update events" ON events
  FOR UPDATE TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_qr_code ON events(qr_code);
CREATE INDEX IF NOT EXISTS idx_users_twin_active ON users(twin_active);

-- Function to increment attendee count atomically
CREATE OR REPLACE FUNCTION increment_attendee_count(event_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE events 
  SET attendee_count = attendee_count + 1 
  WHERE id = event_id AND attendee_count < max_attendees
  RETURNING attendee_count INTO new_count;
  
  IF new_count IS NULL THEN
    RAISE EXCEPTION 'Event is at capacity or not found';
  END IF;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement attendee count atomically
CREATE OR REPLACE FUNCTION decrement_attendee_count(event_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE events 
  SET attendee_count = attendee_count - 1 
  WHERE id = event_id AND attendee_count > 0
  RETURNING attendee_count INTO new_count;
  
  IF new_count IS NULL THEN
    RAISE EXCEPTION 'Event not found or no attendees';
  END IF;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
