-- Migration: Rift Reactions
CREATE TABLE IF NOT EXISTS public.rift_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.rift_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.rift_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rift_reactions_all" 
ON public.rift_reactions 
FOR ALL TO authenticated 
USING (public.is_internal_user()) 
WITH CHECK (public.is_internal_user());

-- Assurez-vous d'avoir créé la publication realtime avant ou ajoutez-la si elle n'y est pas :
ALTER PUBLICATION supabase_realtime ADD TABLE public.rift_reactions;