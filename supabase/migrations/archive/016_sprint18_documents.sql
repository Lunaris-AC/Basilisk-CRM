-- ============================================================
-- SPRINT 18 : Hub Documentaire (Documents & Patch Notes)
-- ============================================================

-- 1. Table documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('DOC', 'PATCH_NOTE')),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS : Lecture pour tous les authentifiés
CREATE POLICY "documents_select_all" ON public.documents
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS : Insert pour ADMIN et DEV uniquement
CREATE POLICY "documents_insert_admin_dev" ON public.documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DEV'))
  );

-- RLS : Delete pour ADMIN et DEV uniquement
CREATE POLICY "documents_delete_admin_dev" ON public.documents
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DEV'))
  );

-- 2. Bucket Storage pour les documents publics
INSERT INTO storage.buckets (id, name, public)
VALUES ('public_documents', 'public_documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS : Lecture publique
CREATE POLICY "public_documents_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'public_documents');

-- Storage RLS : Upload pour ADMIN et DEV
CREATE POLICY "public_documents_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'public_documents'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DEV'))
  );

-- Storage RLS : Delete pour ADMIN et DEV
CREATE POLICY "public_documents_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'public_documents'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DEV'))
  );
