-- ============================================================================
-- SPRINT 12 — TABLE CONTACTS (Mini-CRM)
-- Interlocuteurs physiques rattachés à un client et optionnellement un magasin
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CRÉATION DE LA TABLE CONTACTS
-- ============================================================================

CREATE TABLE contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  store_id    UUID        REFERENCES stores(id) ON DELETE SET NULL,   -- NULL = contact au niveau de l'enseigne
  first_name  TEXT        NOT NULL DEFAULT '',
  last_name   TEXT        NOT NULL DEFAULT '',
  email       TEXT,
  phone       TEXT,
  job_title   TEXT,                                  -- "Manager", "DSI", "Responsable Caisse", etc.
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,     -- Soft delete
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  contacts            IS 'Interlocuteurs physiques rattachés à un client (et optionnellement à un magasin).';
COMMENT ON COLUMN contacts.client_id  IS 'Référence vers l''entreprise cliente.';
COMMENT ON COLUMN contacts.store_id   IS 'Si défini, contact spécifique à ce magasin. NULL = contact au niveau de l''enseigne.';
COMMENT ON COLUMN contacts.job_title  IS 'Fonction / poste du contact (ex: Manager, DSI).';
COMMENT ON COLUMN contacts.is_active  IS 'Soft delete — false = contact désactivé.';

-- Index
CREATE INDEX idx_contacts_client_id ON contacts (client_id);
CREATE INDEX idx_contacts_store_id  ON contacts (store_id);

-- Trigger updated_at
CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 2. RLS POLICIES SUR CONTACTS
-- ============================================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Lecture pour tout utilisateur authentifié
CREATE POLICY "contacts_select_all" ON contacts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert pour COM, N4, ADMIN uniquement
CREATE POLICY "contacts_insert_privileged" ON contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('COM', 'N4', 'ADMIN')
    )
  );

-- Update pour COM, N4, ADMIN uniquement (soft-delete via is_active)
CREATE POLICY "contacts_update_privileged" ON contacts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('COM', 'N4', 'ADMIN')
    )
  );

-- DELETE interdit — on utilise le soft delete via is_active = false


-- ============================================================================
-- 3. MIGRATION DES DONNÉES EXISTANTES
-- Copier les champs first_name/last_name/email/phone des clients vers contacts
-- ============================================================================

INSERT INTO contacts (client_id, first_name, last_name, email, phone, job_title)
SELECT id, first_name, last_name, email, phone, 'Contact Principal'
FROM clients
WHERE first_name IS NOT NULL AND first_name != '';


COMMIT;

-- FIN DU SPRINT 12 MIGRATION
