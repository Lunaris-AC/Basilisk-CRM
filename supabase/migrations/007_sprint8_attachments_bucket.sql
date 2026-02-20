-- ==========================================
-- SPRINT 8: Création de ticket et pièces jointes
-- ==========================================

-- 1. Création du bucket 'ticket_attachments'
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket_attachments', 'ticket_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Configuration des polices RLS pour storage.objects

-- Autoriser la lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Lecture des pièces jointes pour utilisateurs authentifiés"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'ticket_attachments' );

-- Autoriser l'insertion (upload) pour tous les utilisateurs authentifiés
CREATE POLICY "Upload des pièces jointes pour utilisateurs authentifiés"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'ticket_attachments' );

-- Autoriser la suppression/mise à jour pour le propriétaire ou un admin
CREATE POLICY "Update/Delete des pièces jointes pour propriétaire ou admin"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'ticket_attachments'
  AND (
    auth.uid() = owner
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'N4'
    )
  )
);
