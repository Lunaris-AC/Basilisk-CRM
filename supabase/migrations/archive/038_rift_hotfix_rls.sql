-- ==========================================
-- MIGRATION 038 - HOTFIX RIFT RLS
-- Correctifs appliqués sur 02_rift_messaging.sql :
--   1. Ajout de is_rift_member() SECURITY DEFINER (anti-récursion infinie)
--   2. Réécriture des policies pour utiliser is_rift_member()
--   3. Les channels PUBLIC sont visibles par tous les internes
-- ==========================================

-- ==========================================
-- ÉTAPE 1 : Nouvelle fonction helper (bypass RLS)
-- ==========================================

-- Vérifie l'appartenance à un channel sans passer par RLS
-- → élimine l'erreur "infinite recursion detected in policy for relation rift_channel_members"
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
-- ÉTAPE 2 : DROP des anciennes policies affectées
-- ==========================================

DROP POLICY IF EXISTS "rift_channels_select_member" ON public.rift_channels;
DROP POLICY IF EXISTS "rift_members_select"          ON public.rift_channel_members;
DROP POLICY IF EXISTS "rift_members_insert"          ON public.rift_channel_members;
DROP POLICY IF EXISTS "rift_messages_select"          ON public.rift_messages;
DROP POLICY IF EXISTS "rift_messages_insert"          ON public.rift_messages;
DROP POLICY IF EXISTS "rift_edits_select"             ON public.rift_message_edits;
DROP POLICY IF EXISTS "rift_receipts_select"          ON public.rift_read_receipts;
DROP POLICY IF EXISTS "rift_receipts_insert"          ON public.rift_read_receipts;

-- ==========================================
-- ÉTAPE 3 : Recréation des policies corrigées
-- ==========================================

-- ------------------------------------------
-- 3a. rift_channels
-- ------------------------------------------

-- SELECT : membre du channel, OU tout interne pour les PUBLIC
CREATE POLICY "rift_channels_select_member"
    ON public.rift_channels FOR SELECT
    TO authenticated
    USING (
        public.is_internal_user()
        AND (
            public.is_rift_member(id)
            OR type = 'PUBLIC'
        )
    );

-- ------------------------------------------
-- 3b. rift_channel_members
-- ------------------------------------------

-- SELECT : visible par les membres du même channel (interne uniquement)
CREATE POLICY "rift_members_select"
    ON public.rift_channel_members FOR SELECT
    TO authenticated
    USING (
        public.is_internal_user()
        AND public.is_rift_member(channel_id)
    );

-- INSERT : un interne peut ajouter des membres (doit être lui-même membre ou créateur du channel)
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

-- ------------------------------------------
-- 3d. rift_message_edits
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
