-- SPRINT 50.3 - Basilisk Rift : Système d'appel (Signalisation et États)

-- TYPE pour le statut de l'appel
CREATE TYPE rift_call_status AS ENUM ('ACTIVE', 'ENDED');

-- TYPE pour le statut du participant
CREATE TYPE rift_call_participant_status AS ENUM ('RINGING', 'IN_CALL', 'DECLINED', 'LEFT');

-- TABLE des appels
CREATE TABLE public.rift_calls (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id  UUID REFERENCES public.rift_channels(id) ON DELETE CASCADE,
    created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status      rift_call_status DEFAULT 'ACTIVE',
    type        TEXT DEFAULT 'AUDIO', -- 'AUDIO' or 'VIDEO'
    started_at  TIMESTAMPTZ DEFAULT NOW(),
    ended_at    TIMESTAMPTZ,
    
    CONSTRAINT rift_calls_channel_id_check CHECK (channel_id IS NOT NULL)
);

-- TABLE des participants
CREATE TABLE public.rift_call_participants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id         UUID REFERENCES public.rift_calls(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ DEFAULT NOW(),
    left_at         TIMESTAMPTZ,
    status          rift_call_participant_status DEFAULT 'RINGING',
    is_muted        BOOLEAN DEFAULT FALSE,
    is_camera_on    BOOLEAN DEFAULT FALSE,
    is_screen_sharing BOOLEAN DEFAULT FALSE,
    
    UNIQUE(call_id, user_id)
);

-- RLS
ALTER TABLE public.rift_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rift_call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see calls in their channels"
ON public.rift_calls FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.rift_channel_members
        WHERE channel_id = rift_calls.channel_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can start calls"
ON public.rift_calls FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.rift_channel_members
        WHERE channel_id = rift_calls.channel_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update calls they started or in their channels"
ON public.rift_calls FOR UPDATE
USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.rift_channel_members
        WHERE channel_id = rift_calls.channel_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Participants visibility"
ON public.rift_call_participants FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.rift_calls
        WHERE id = rift_call_participants.call_id
        AND (
            EXISTS (
                SELECT 1 FROM public.rift_channel_members
                WHERE channel_id = rift_calls.channel_id
                AND user_id = auth.uid()
            )
        )
    )
);

CREATE POLICY "Participants can join/update status"
ON public.rift_call_participants FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rift_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rift_call_participants;
