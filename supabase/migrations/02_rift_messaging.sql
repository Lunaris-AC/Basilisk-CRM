-- ==========================================
-- SPRINT 50.1 - BASILISK RIFT
-- Messagerie interne temps réel (interdit aux clients)
-- ==========================================

-- ==========================================
-- ÉTAPE 0 : ENUM & HELPER
-- ==========================================

CREATE TYPE rift_channel_type AS ENUM ('PUBLIC', 'PRIVATE_GROUP', 'DM');

-- Fonction utilitaire : vérifie que l'utilisateur est interne (pas CLIENT)
CREATE OR REPLACE FUNCTION public.is_internal_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = TRUE
      AND role <> 'CLIENT'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Fonction utilitaire : vérifie l'appartenance à un channel (bypass RLS pour éviter la récursion infinie)
CREATE OR REPLACE FUNCTION public.is_rift_member(p_channel_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rift_channel_members
    WHERE channel_id = p_channel_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==========================================
-- ÉTAPE 1 : TABLES DE BASE (Channels & Membres)
-- ==========================================

-- 1a. Channels
CREATE TABLE public.rift_channels (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT,                           -- nullable pour les DMs
    type        rift_channel_type NOT NULL,
    created_by  UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rift_channels_type       ON public.rift_channels(type);
CREATE INDEX idx_rift_channels_created_by ON public.rift_channels(created_by);

-- 1b. Membres des channels
CREATE TABLE public.rift_channel_members (
    channel_id  UUID        NOT NULL REFERENCES public.rift_channels(id)  ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX idx_rift_channel_members_user ON public.rift_channel_members(user_id);

-- ==========================================
-- ÉTAPE 2 : MESSAGES, AUDIT & ACCUSÉS DE LECTURE
-- ==========================================

-- 2a. Messages
CREATE TABLE public.rift_messages (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id  UUID            NOT NULL REFERENCES public.rift_channels(id) ON DELETE CASCADE,
    user_id     UUID            NOT NULL REFERENCES public.profiles(id)      ON DELETE RESTRICT,
    content     TEXT            NOT NULL,
    reply_to_id UUID            REFERENCES public.rift_messages(id)          ON DELETE SET NULL,
    is_edited   BOOLEAN         NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMPTZ,                    -- soft delete
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rift_messages_channel    ON public.rift_messages(channel_id, created_at DESC);
CREATE INDEX idx_rift_messages_user       ON public.rift_messages(user_id);
CREATE INDEX idx_rift_messages_reply      ON public.rift_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX idx_rift_messages_deleted    ON public.rift_messages(deleted_at) WHERE deleted_at IS NOT NULL;

-- 2b. Historique des éditions (audit permanent)
CREATE TABLE public.rift_message_edits (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id  UUID            NOT NULL REFERENCES public.rift_messages(id) ON DELETE CASCADE,
    old_content TEXT            NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rift_message_edits_msg ON public.rift_message_edits(message_id, created_at DESC);

-- 2c. Accusés de lecture
CREATE TABLE public.rift_read_receipts (
    message_id  UUID        NOT NULL REFERENCES public.rift_messages(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
    read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

CREATE INDEX idx_rift_read_receipts_user ON public.rift_read_receipts(user_id);

-- ==========================================
-- ÉTAPE 2-BIS : TRIGGER D'ÉDITION (Fantômes)
-- ==========================================

-- Fonction trigger : archive l'ancien contenu dans rift_message_edits
-- et passe is_edited à true lors d'un UPDATE du content.
CREATE OR REPLACE FUNCTION public.rift_audit_message_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Ne déclencher que si le content a réellement changé
    IF OLD.content IS DISTINCT FROM NEW.content THEN
        -- Archiver l'ancien contenu
        INSERT INTO public.rift_message_edits (message_id, old_content)
        VALUES (OLD.id, OLD.content);

        -- Forcer is_edited à true
        NEW.is_edited := TRUE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_rift_message_edit_audit
    BEFORE UPDATE ON public.rift_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.rift_audit_message_edit();

-- ==========================================
-- ÉTAPE 3 : ROW LEVEL SECURITY (SÉCURITÉ PARANOÏAQUE)
-- ==========================================

-- Activer RLS sur toutes les tables Rift
ALTER TABLE public.rift_channels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rift_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rift_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rift_message_edits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rift_read_receipts   ENABLE ROW LEVEL SECURITY;

-- Forcer RLS même pour les propriétaires des tables
ALTER TABLE public.rift_channels        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rift_channel_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rift_messages        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rift_message_edits   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rift_read_receipts   FORCE ROW LEVEL SECURITY;

-- ------------------------------------------
-- 3a. rift_channels
-- ------------------------------------------

-- SELECT : membre du channel, OU créateur, OU tout interne pour les PUBLIC
CREATE POLICY "rift_channels_select_member"
    ON public.rift_channels FOR SELECT
    TO authenticated
    USING (
        public.is_internal_user()
        AND (
            public.is_rift_member(id)
            OR created_by = auth.uid()
            OR type = 'PUBLIC'
        )
    );

-- INSERT : ADMIN pour PUBLIC, tout interne pour PRIVATE_GROUP/DM
CREATE POLICY "rift_channels_insert"
    ON public.rift_channels FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_internal_user()
        AND created_by = auth.uid()
        AND (
            -- PUBLIC : réservé aux ADMIN
            (type = 'PUBLIC'        AND public.get_my_role() = 'ADMIN')
            -- PRIVATE_GROUP / DM : tout utilisateur interne
            OR type IN ('PRIVATE_GROUP', 'DM')
        )
    );

-- UPDATE : seul l'admin peut modifier un channel (renommer, etc.)
CREATE POLICY "rift_channels_update_admin"
    ON public.rift_channels FOR UPDATE
    TO authenticated
    USING (public.get_my_role() = 'ADMIN')
    WITH CHECK (public.get_my_role() = 'ADMIN');

-- DELETE : seul l'admin peut supprimer un channel
CREATE POLICY "rift_channels_delete_admin"
    ON public.rift_channels FOR DELETE
    TO authenticated
    USING (public.get_my_role() = 'ADMIN');

-- ------------------------------------------
-- 3b. rift_channel_members
-- ------------------------------------------

-- SELECT : visible par les membres du même channel (interne uniquement)
-- Utilise is_rift_member() SECURITY DEFINER pour éviter la récursion infinie
CREATE POLICY "rift_members_select"
    ON public.rift_channel_members FOR SELECT
    TO authenticated
    USING (
        public.is_internal_user()
        AND public.is_rift_member(channel_id)
    );

-- INSERT : un interne peut ajouter des membres (doit être lui-même membre ou créateur du channel)
-- Utilise is_rift_member() SECURITY DEFINER pour éviter la récursion infinie
CREATE POLICY "rift_members_insert"
    ON public.rift_channel_members FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_internal_user()
        AND (
            -- S'ajouter soi-même
            user_id = auth.uid()
            -- OU être déjà membre du channel
            OR public.is_rift_member(channel_id)
            -- OU être le créateur du channel
            OR EXISTS (
                SELECT 1 FROM public.rift_channels c
                WHERE c.id = channel_id
                  AND c.created_by = auth.uid()
            )
            -- OU être ADMIN
            OR public.get_my_role() = 'ADMIN'
        )
    );

-- DELETE : un membre peut se retirer, un admin peut retirer n'importe qui
CREATE POLICY "rift_members_delete"
    ON public.rift_channel_members FOR DELETE
    TO authenticated
    USING (
        public.is_internal_user()
        AND (
            user_id = auth.uid()
            OR public.get_my_role() = 'ADMIN'
        )
    );

-- ------------------------------------------
-- 3c. rift_messages
-- ------------------------------------------

-- SELECT : lecture autorisée si membre du channel
CREATE POLICY "rift_messages_select"
    ON public.rift_messages FOR SELECT
    TO authenticated
    USING (
        public.is_internal_user()
        AND public.is_rift_member(channel_id)
    );

-- INSERT : autorisé si membre du channel
CREATE POLICY "rift_messages_insert"
    ON public.rift_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_internal_user()
        AND user_id = auth.uid()
        AND public.is_rift_member(channel_id)
    );

-- UPDATE : édition / soft-delete UNIQUEMENT par l'auteur
CREATE POLICY "rift_messages_update_author"
    ON public.rift_messages FOR UPDATE
    TO authenticated
    USING (
        public.is_internal_user()
        AND user_id = auth.uid()
    )
    WITH CHECK (
        user_id = auth.uid()
    );

-- ------------------------------------------
-- 3d. rift_message_edits (lecture seule pour les internes membres)
-- ------------------------------------------

-- SELECT : visible par les membres du channel du message parent
CREATE POLICY "rift_edits_select"
    ON public.rift_message_edits FOR SELECT
    TO authenticated
    USING (
        public.is_internal_user()
        AND EXISTS (
            SELECT 1 FROM public.rift_messages msg
            WHERE msg.id = rift_message_edits.message_id
              AND public.is_rift_member(msg.channel_id)
        )
    );

-- INSERT : uniquement via le trigger (SECURITY DEFINER), jamais directement
-- Aucune policy INSERT pour les utilisateurs normaux.
-- Le trigger rift_audit_message_edit() est SECURITY DEFINER, il bypass RLS.

-- ------------------------------------------
-- 3e. rift_read_receipts
-- ------------------------------------------

-- SELECT : visible par les membres du channel
CREATE POLICY "rift_receipts_select"
    ON public.rift_read_receipts FOR SELECT
    TO authenticated
    USING (
        public.is_internal_user()
        AND EXISTS (
            SELECT 1 FROM public.rift_messages msg
            WHERE msg.id = rift_read_receipts.message_id
              AND public.is_rift_member(msg.channel_id)
        )
    );

-- INSERT : un utilisateur ne peut marquer que ses propres lectures
CREATE POLICY "rift_receipts_insert"
    ON public.rift_read_receipts FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_internal_user()
        AND user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.rift_messages msg
            WHERE msg.id = rift_read_receipts.message_id
              AND public.is_rift_member(msg.channel_id)
        )
    );

-- UPDATE : mettre à jour le read_at de son propre accusé
CREATE POLICY "rift_receipts_update"
    ON public.rift_read_receipts FOR UPDATE
    TO authenticated
    USING (
        public.is_internal_user()
        AND user_id = auth.uid()
    )
    WITH CHECK (user_id = auth.uid());

-- ==========================================
-- ÉTAPE 4 : STORAGE (Pièces jointes Rift)
-- ==========================================

-- 4a. Créer le bucket rift-attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'rift-attachments',
    'rift-attachments',
    false,
    20971520,  -- 20 MB
    ARRAY[
        'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
        'application/pdf',
        'text/plain','text/csv',
        'application/zip','application/x-7z-compressed','application/x-rar-compressed',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'audio/mpeg','audio/ogg','audio/wav',
        'video/mp4','video/webm'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- 4b. Storage RLS : Insert/Select limités aux utilisateurs internes

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
          AND policyname = 'rift_attachments_select'
    ) THEN
        CREATE POLICY "rift_attachments_select"
            ON storage.objects FOR SELECT
            TO authenticated
            USING (
                bucket_id = 'rift-attachments'
                AND public.is_internal_user()
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
          AND policyname = 'rift_attachments_insert'
    ) THEN
        CREATE POLICY "rift_attachments_insert"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK (
                bucket_id = 'rift-attachments'
                AND public.is_internal_user()
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
          AND policyname = 'rift_attachments_delete'
    ) THEN
        CREATE POLICY "rift_attachments_delete"
            ON storage.objects FOR DELETE
            TO authenticated
            USING (
                bucket_id = 'rift-attachments'
                AND public.is_internal_user()
                AND (
                    -- Le propriétaire du fichier (premier segment du path = user_id)
                    auth.uid()::text = (storage.foldername(name))[1]
                    OR public.get_my_role() = 'ADMIN'
                )
            );
    END IF;
END $$;

-- ==========================================
-- ÉTAPE 5 : REALTIME (pour les messages en temps réel)
-- ==========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.rift_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rift_read_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rift_channel_members;
