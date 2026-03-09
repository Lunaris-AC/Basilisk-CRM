-- ==========================================
-- SPRINT 8.1: Métadonnées des pièces jointes
-- ==========================================

-- Création de la table pour stocker les métadonnées des pièces jointes
CREATE TABLE ticket_attachments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_type   TEXT NOT NULL,         -- ex: 'image/jpeg', 'application/pdf'
  file_size   BIGINT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ticket_attachments IS 'Métadonnées des pièces jointes liées aux tickets.';

-- Polices RLS pour limiter l'accès si nécessaire
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les authentifiés (simplification pour le moment, comme le bucket)
CREATE POLICY "Lecture des métadonnées pjs pour utilisateurs authentifiés"
ON ticket_attachments FOR SELECT
TO authenticated
USING (true);

-- Insertion pour les authentifiés
CREATE POLICY "Insertion des métadonnées pjs pour utilisateurs authentifiés"
ON ticket_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

-- Suppression pour le propriétaire ou un admin
CREATE POLICY "Suppression des métadonnées pjs"
ON ticket_attachments FOR DELETE
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('N4')
  )
);
