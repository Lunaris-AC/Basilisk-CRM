-- ==========================================
-- MIGRATION 039 - HOTFIX RIFT : Policies manquantes sur rift_channels
-- Corrige l'erreur : "new row violates row-level security policy for table rift_channels"
--   1. La policy rift_channels_insert n'existait pas en base
--   2. La policy SELECT empêchait le RETURNING après INSERT
--      (le créateur n'est pas encore membre → is_rift_member = false)
-- ==========================================

-- ──────────────────────────────────────────
-- ÉTAPE 1 : DROP sécurisé (idempotent)
-- ──────────────────────────────────────────

DROP POLICY IF EXISTS "rift_channels_select_member" ON public.rift_channels;
DROP POLICY IF EXISTS "rift_channels_insert"        ON public.rift_channels;
DROP POLICY IF EXISTS "rift_channels_update_admin"  ON public.rift_channels;
DROP POLICY IF EXISTS "rift_channels_delete_admin"  ON public.rift_channels;

-- ──────────────────────────────────────────
-- ÉTAPE 2 : (Re)création des policies
-- ──────────────────────────────────────────

-- SELECT : membre du channel, OU créateur, OU tout interne pour les PUBLIC
-- Le "created_by = auth.uid()" permet le RETURNING après INSERT
-- (avant que le créateur soit ajouté comme membre)
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
            (type = 'PUBLIC' AND public.get_my_role() = 'ADMIN')
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
