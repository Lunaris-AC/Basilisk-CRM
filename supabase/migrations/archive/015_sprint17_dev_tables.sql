-- ==============================================================================
-- SPRINT 17b — PORTAIL SD : TABLES, TRIGGERS, RLS
-- Les valeurs 'DEV' ont été committées dans la migration 014.
-- ==============================================================================

-- 1. ENUMS SD
DO $$ BEGIN
    CREATE TYPE sd_type AS ENUM ('BUG', 'EVOLUTION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sd_complexity AS ENUM ('HOTFIX', 'S', 'M', 'L', 'XL', 'MAJEUR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLE D'EXTENSION DEV (1-to-1 avec tickets)
CREATE TABLE IF NOT EXISTS ticket_dev_details (
    ticket_id          UUID PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
    type               sd_type       NOT NULL,
    reproduction_steps TEXT,
    impact             TEXT,
    need_description   TEXT,
    expected_process   TEXT,
    complexity         sd_complexity,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ticket_dev_details IS 'Table d''extension 1-to-1 pour les tickets de catégorie DEV (SD Bugs & Évolutions).';

-- 3. TRIGGER UPDATED_AT
DROP TRIGGER IF EXISTS update_ticket_dev_details_updated_at ON ticket_dev_details;
CREATE TRIGGER update_ticket_dev_details_updated_at
    BEFORE UPDATE ON ticket_dev_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS
ALTER TABLE ticket_dev_details ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Lecture publique des détails dev" ON ticket_dev_details
    FOR SELECT TO authenticated USING (true);

-- Écriture pour N4, COM, DEV, ADMIN + créateur du ticket
CREATE POLICY "Ecriture des détails dev" ON ticket_dev_details
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('ADMIN', 'DEV', 'COM', 'N4')
        ) OR EXISTS (
            SELECT 1 FROM tickets
            WHERE id = ticket_id AND creator_id = auth.uid()
        )
    );

-- ==============================================================================
-- FIN SPRINT 17b — SQL
-- ==============================================================================
