-- SPRINT RIFT ENHANCEMENTS : Presence, Sharing, Forwarding, Reactions & Replies

-- 1. User Presence Status
DO $$ BEGIN
    CREATE TYPE user_presence_status AS ENUM ('ONLINE', 'AWAY', 'BUSY', 'OFFLINE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS presence_status user_presence_status DEFAULT 'OFFLINE',
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Message Sharing & Forwarding
ALTER TABLE public.rift_messages
ADD COLUMN IF NOT EXISTS entity_id UUID,
ADD COLUMN IF NOT EXISTS entity_type TEXT, -- 'TICKET', 'SD', etc.
ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS forwarded_from_id UUID REFERENCES public.rift_messages(id) ON DELETE SET NULL;

-- 3. Trigger for last_seen_at (automatic heartbeat or manual update)
-- (Optionally, we can have a heartbeat function that updates this via Server Actions)

-- 4. Publication update for profiles (to get realtime presence updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
