-- ============================================================================
-- HOTFIX 43.1b : Ajout de la colonne avatar_url à profiles
-- ============================================================================
-- La colonne avatar_url est présente dans le schéma consolidé (00_init_schema)
-- mais n'a jamais été ajoutée via une migration exécutée sur la base live.
-- PostgREST retourne 400 quand on SELECT une colonne inexistante,
-- ce qui bloque la query 'my-profile-detail' et donc tout le système Presence.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.profiles.avatar_url IS 'URL de l''avatar de l''utilisateur (optionnel).';
