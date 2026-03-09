-- ============================================================================
-- SPRINT 7 — VUE DÉTAILLÉE : SYSTÈME DE COMMENTAIRES
-- SaaS Ticketing / Support Interne
-- ============================================================================

-- Table pour stocker les échanges (publics) et notes privées (internes)
CREATE TABLE ticket_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  content     TEXT        NOT NULL,
  is_internal BOOLEAN     NOT NULL DEFAULT FALSE, -- Si true = note visible uniquement par les techniciens/commerciaux
  
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ticket_comments IS 'Fil de discussion et notes internes d''un ticket.';
COMMENT ON COLUMN ticket_comments.is_internal IS 'Distingue un message public d''une note interne (inter-techniciens).';

-- Index pour charger le fil rapidement
CREATE INDEX idx_comments_ticket_id ON ticket_comments (ticket_id, created_at ASC);

-- Trigger updated_at
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- 1. Lecture : Tout utilisateur authentifié et actif peut lire les commentaires
-- (Note MVP : on part du principe que tous les utilisateurs internes peuvent tout lire.
-- Plus tard, on restreindra `is_internal` aux rôles TECH/ADMIN).
CREATE POLICY "Les utilisateurs actifs peuvent lire les commentaires"
  ON ticket_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_active = TRUE
    )
  );

-- 2. Insertion : Tout utilisateur authentifié peut ajouter un commentaire
CREATE POLICY "Les utilisateurs actifs peuvent commenter"
  ON ticket_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_active = TRUE
    )
  );

-- 3. Mise à jour / Suppression : STRICTEMENT INTERDIT (Traçabilité)
-- Pas de policy d'UPDATE ou DELETE -> Deny by default.
