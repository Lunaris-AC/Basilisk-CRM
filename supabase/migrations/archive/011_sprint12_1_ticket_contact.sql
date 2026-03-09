-- ============================================================================
-- SPRINT 12.1 — LIAISON TICKET / CONTACT
-- Permet de savoir quel interlocuteur a déclaré l'incident
-- ============================================================================

BEGIN;

-- 1. Ajout de la colonne contact_id à la table tickets
ALTER TABLE tickets 
ADD COLUMN contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- 2. Commentaire pour la documentation
COMMENT ON COLUMN tickets.contact_id IS 'Interlocuteur (contact physique) qui a déclaré l''incident.';

-- 3. Index pour optimiser les jointures
CREATE INDEX idx_tickets_contact_id ON tickets (contact_id);

COMMIT;
