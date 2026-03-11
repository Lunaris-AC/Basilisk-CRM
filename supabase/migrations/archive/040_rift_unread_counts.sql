-- ==========================================
-- MIGRATION 040 - RIFT : Compteurs de messages non lus
-- Ajoute last_read_at + fonctions RPC pour les badges unread
-- ==========================================

-- ──────────────────────────────────────────
-- ÉTAPE 1 : Colonne last_read_at sur rift_channel_members
-- ──────────────────────────────────────────

ALTER TABLE public.rift_channel_members
    ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Index pour accélérer les requêtes unread
CREATE INDEX IF NOT EXISTS idx_rift_channel_members_last_read
    ON public.rift_channel_members(user_id, channel_id, last_read_at);

-- ──────────────────────────────────────────
-- ÉTAPE 2 : Fonction RPC get_rift_unread_counts()
-- Retourne le nombre de messages non lus par channel
-- ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_rift_unread_counts()
RETURNS TABLE(channel_id UUID, unread_count BIGINT) AS $$
    SELECT
        cm.channel_id,
        COUNT(m.id)::BIGINT AS unread_count
    FROM public.rift_channel_members cm
    INNER JOIN public.rift_messages m
        ON m.channel_id = cm.channel_id
        AND m.created_at > cm.last_read_at
        AND m.user_id != auth.uid()
        AND m.deleted_at IS NULL
    WHERE cm.user_id = auth.uid()
    GROUP BY cm.channel_id
    HAVING COUNT(m.id) > 0;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ──────────────────────────────────────────
-- ÉTAPE 3 : Fonction RPC mark_rift_channel_read()
-- Met à jour last_read_at pour marquer un channel comme lu
-- ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mark_rift_channel_read(p_channel_id UUID)
RETURNS VOID AS $$
    UPDATE public.rift_channel_members
    SET last_read_at = NOW()
    WHERE channel_id = p_channel_id
      AND user_id = auth.uid();
$$ LANGUAGE sql VOLATILE SECURITY DEFINER;
