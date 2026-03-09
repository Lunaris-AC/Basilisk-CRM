-- ============================================================================
-- SPRINT 26.1 — RÉFORME DES NIVEAUX DE SUPPORT (DYNAMIC LEVELS)
-- ============================================================================

BEGIN;

-- 1. Création de la table support_levels
CREATE TABLE IF NOT EXISTS support_levels (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT        NOT NULL,
    rank        INTEGER     NOT NULL,
    color       TEXT        NOT NULL, -- Code hexadécimal
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  support_levels IS 'Hiérarchie dynamique des niveaux de support technique (N1, N2, etc.)';
COMMENT ON COLUMN support_levels.rank IS 'Ordre de hiérarchie (1 étant le plus bas). Utilisé pour le routage et l''escalade.';

-- 2. Insertion des données par défaut (N1 à N4)
-- On utilise des UUIDs fixes pour faciliter la migration si besoin, ou on laisse faire le défaut.
-- Ici on laisse faire le défaut et on se base sur le nom pour la migration.
INSERT INTO support_levels (name, rank, color) VALUES
('N1 - Helpdesk',  1, '#7dd3fc'), -- Sky 300
('N2 - Technicien', 2, '#60a5fa'), -- Blue 400
('N3 - Expert',     3, '#818cf8'), -- Indigo 400
('N4 - Ingénieur',  4, '#a78bfa'); -- Purple 400

-- 3. Modification des tables profiles et tickets
-- Ajout des colonnes de clés étrangères
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS support_level_id UUID REFERENCES support_levels(id) ON DELETE SET NULL;
ALTER TABLE tickets  ADD COLUMN IF NOT EXISTS support_level_id UUID REFERENCES support_levels(id) ON DELETE SET NULL;

-- 4. Migration des données existantes
-- Migration pour la table profiles (basée sur la colonne role actuelle)
UPDATE profiles p
SET support_level_id = sl.id
FROM support_levels sl
WHERE (p.role::TEXT = 'N1' AND sl.name = 'N1 - Helpdesk')
   OR (p.role::TEXT = 'N2' AND sl.name = 'N2 - Technicien')
   OR (p.role::TEXT = 'N3' AND sl.name = 'N3 - Expert')
   OR (p.role::TEXT = 'N4' AND sl.name = 'N4 - Ingénieur');

-- Migration pour la table tickets (basée sur escalation_level actuel)
UPDATE tickets t
SET support_level_id = sl.id
FROM support_levels sl
WHERE (t.escalation_level = 1 AND sl.name = 'N1 - Helpdesk')
   OR (t.escalation_level = 2 AND sl.name = 'N2 - Technicien')
   OR (t.escalation_level = 3 AND sl.name = 'N3 - Expert')
   OR (t.escalation_level = 4 AND sl.name = 'N4 - Ingénieur');

-- 5. Trigger updated_at
CREATE TRIGGER trg_support_levels_updated_at
  BEFORE UPDATE ON support_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Index pour optimiser les jointures
CREATE INDEX IF NOT EXISTS idx_profiles_support_level_id ON profiles(support_level_id);
CREATE INDEX IF NOT EXISTS idx_tickets_support_level_id ON tickets(support_level_id);

COMMIT;
