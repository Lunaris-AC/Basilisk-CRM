-- ============================================================================
-- SPRINT 21b — PORTAIL CLIENT B2B & LIAISON HL↔SD
-- ⚠️ Exécuter APRÈS 017a (le rôle CLIENT doit déjà exister).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MODIFICATION DE LA TABLE profiles
-- Relier un compte utilisateur à un interlocuteur physique (contact)
-- ============================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_contact_id ON profiles (contact_id);

COMMENT ON COLUMN profiles.contact_id
  IS 'Lien optionnel vers un contact (interlocuteur physique). Obligatoire pour les comptes CLIENT.';

-- ============================================================================
-- 2. MODIFICATION DE LA TABLE tickets
-- Permettre à un ticket HL de pointer vers un ticket SD (DEV)
-- ============================================================================
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS linked_sd_id UUID REFERENCES tickets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_linked_sd_id ON tickets (linked_sd_id);

COMMENT ON COLUMN tickets.linked_sd_id
  IS 'Si défini, lie un ticket HL (incident) à un ticket SD (bug/évolution). NULL = pas de lien.';

-- ============================================================================
-- 3. RLS : TICKETS — Accès CLIENT (lecture par magasin)
-- ============================================================================

CREATE POLICY tickets_select_client
  ON tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN contacts c ON c.id = p.contact_id
      WHERE p.id = auth.uid()
        AND p.role = 'CLIENT'
        AND p.is_active = TRUE
        AND (
          tickets.store_id = c.store_id
          OR (c.store_id IS NULL AND tickets.store_id IN (
            SELECT s.id FROM stores s WHERE s.client_id = c.client_id
          ))
        )
    )
  );

-- ============================================================================
-- 4. RLS : DOCUMENTS — Lecture pour les CLIENTs
-- ============================================================================

CREATE POLICY documents_select_client ON public.documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'CLIENT'
        AND profiles.is_active = TRUE
    )
  );

COMMIT;

-- FIN DU SPRINT 21b
