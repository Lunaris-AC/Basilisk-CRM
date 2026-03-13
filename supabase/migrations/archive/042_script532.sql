-- ==========================================
-- SPRINT 53.2 - CREATION DU BUCKET AVATARS
-- ==========================================

-- 1. Création du bucket "avatars" (Public pour pouvoir afficher les images facilement)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true, 
    5242880, -- Limite à 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. RLS sur storage.objects pour le bucket "avatars"

-- Lecture : Tout utilisateur authentifié peut voir les avatars
CREATE POLICY "Avatars visibles par les internes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars' AND public.is_internal_user());

-- Insertion : L'utilisateur ne peut uploader qu'un fichier dans MON_DOSSIER/fichier.ext
CREATE POLICY "Upload de son propre avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND public.is_internal_user()
    -- Vérifie que le premier dossier (avant le slash pos 1) est l'UUID du demandeur
    AND (auth.uid()::text = (string_to_array(name, '/'))[1])
);

-- Mise à jour : Idem
CREATE POLICY "Modification de son propre avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (auth.uid()::text = (string_to_array(name, '/'))[1])
);

-- Suppression : Idem
CREATE POLICY "Suppression de son propre avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (auth.uid()::text = (string_to_array(name, '/'))[1])
);