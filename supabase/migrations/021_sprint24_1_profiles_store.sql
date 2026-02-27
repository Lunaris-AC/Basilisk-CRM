-- ============================================================================
-- SPRINT 24.1 — LIAISON PROFIL CLIENT ↔ MAGASIN
-- ============================================================================

BEGIN;

-- 1. Ajout de la colonne store_id sur profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

-- 2. Index pour optimiser les jointures
CREATE INDEX IF NOT EXISTS idx_profiles_store_id ON profiles(store_id);

COMMIT;
