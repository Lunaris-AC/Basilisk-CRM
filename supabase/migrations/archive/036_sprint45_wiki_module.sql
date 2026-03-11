-- ============================================================================
-- SPRINT 45 : MODULE WIKI "NOTION-LIKE"
-- ============================================================================
-- Base de connaissances interne avec arborescence infinie, éditeur par blocs,
-- et workflow de validation (DRAFT -> PENDING -> PUBLISHED).
-- Les clients n'y ont PAS accès.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. BUCKET STORAGE : wiki-images
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wiki-images',
  'wiki-images',
  true,                             -- Public read
  5242880,                          -- 5 MB limit
  ARRAY['image/jpeg','image/png','image/gif','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Policy : les authentifiés peuvent uploader
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'wiki_images_insert'
  ) THEN
    CREATE POLICY "wiki_images_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'wiki-images');
  END IF;
END $$;

-- Policy : lecture publique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'wiki_images_select'
  ) THEN
    CREATE POLICY "wiki_images_select"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'wiki-images');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. ENUM : wiki_document_status
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wiki_document_status') THEN
    CREATE TYPE public.wiki_document_status AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. TABLE : wiki_documents
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.wiki_documents (
    id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id        UUID            REFERENCES public.wiki_documents(id) ON DELETE SET NULL,
    base_document_id UUID            REFERENCES public.wiki_documents(id) ON DELETE SET NULL,
    title            TEXT            NOT NULL DEFAULT 'Sans titre',
    icon             TEXT            DEFAULT '📄',
    content          JSONB           DEFAULT '[]'::jsonb,
    status           wiki_document_status NOT NULL DEFAULT 'DRAFT',
    author_id        UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rejection_reason TEXT,
    position         INTEGER         NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Index pour l'arborescence (lookup rapide par parent)
CREATE INDEX IF NOT EXISTS idx_wiki_documents_parent ON public.wiki_documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_wiki_documents_status ON public.wiki_documents(status);
CREATE INDEX IF NOT EXISTS idx_wiki_documents_author ON public.wiki_documents(author_id);
CREATE INDEX IF NOT EXISTS idx_wiki_documents_base   ON public.wiki_documents(base_document_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.wiki_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wiki_documents_updated_at ON public.wiki_documents;
CREATE TRIGGER trg_wiki_documents_updated_at
  BEFORE UPDATE ON public.wiki_documents
  FOR EACH ROW EXECUTE FUNCTION public.wiki_documents_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 4. TABLE : wiki_revisions (Historique)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.wiki_revisions (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID         NOT NULL REFERENCES public.wiki_documents(id) ON DELETE CASCADE,
    title         TEXT         NOT NULL,
    content       JSONB        NOT NULL DEFAULT '[]'::jsonb,
    author_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wiki_revisions_document ON public.wiki_revisions(document_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 5. FONCTION : Snapshot + Purge à la publication
-- ═══════════════════════════════════════════════════════════════

-- À chaque passage en PUBLISHED, on insère l'état actuel dans wiki_revisions
-- et on garde uniquement les 10 dernières révisions par document.

CREATE OR REPLACE FUNCTION public.wiki_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Seulement quand status passe à PUBLISHED
  IF NEW.status = 'PUBLISHED' AND (OLD.status IS NULL OR OLD.status <> 'PUBLISHED') THEN

    -- 1. Insérer la révision
    INSERT INTO public.wiki_revisions (document_id, title, content, author_id)
    VALUES (NEW.id, NEW.title, NEW.content, NEW.author_id);

    -- 2. Purger au-delà de 10 révisions
    DELETE FROM public.wiki_revisions
    WHERE document_id = NEW.id
      AND id NOT IN (
        SELECT id FROM public.wiki_revisions
        WHERE document_id = NEW.id
        ORDER BY created_at DESC
        LIMIT 10
      );

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_wiki_on_publish ON public.wiki_documents;
CREATE TRIGGER trg_wiki_on_publish
  AFTER UPDATE ON public.wiki_documents
  FOR EACH ROW EXECUTE FUNCTION public.wiki_on_publish();

-- ═══════════════════════════════════════════════════════════════
-- 6. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.wiki_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_revisions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 6a. wiki_documents : SELECT
-- ---------------------------------------------------------------

-- DRAFT → auteur uniquement
CREATE POLICY "wiki_docs_select_draft"
  ON public.wiki_documents FOR SELECT
  TO authenticated
  USING (
    status = 'DRAFT'
    AND author_id = auth.uid()
  );

-- PENDING → auteur OU rôles >= N3
CREATE POLICY "wiki_docs_select_pending"
  ON public.wiki_documents FOR SELECT
  TO authenticated
  USING (
    status = 'PENDING'
    AND (
      author_id = auth.uid()
      OR get_my_role() IN ('N3', 'N4', 'ADMIN')
    )
  );

-- PUBLISHED → tous SAUF CLIENT
CREATE POLICY "wiki_docs_select_published"
  ON public.wiki_documents FOR SELECT
  TO authenticated
  USING (
    status = 'PUBLISHED'
    AND get_my_role() <> 'CLIENT'
  );

-- ---------------------------------------------------------------
-- 6b. wiki_documents : INSERT
-- ---------------------------------------------------------------

-- Tout authentifié non-CLIENT peut créer un brouillon
CREATE POLICY "wiki_docs_insert"
  ON public.wiki_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() <> 'CLIENT'
    AND author_id = auth.uid()
    AND status = 'DRAFT'
  );

-- ---------------------------------------------------------------
-- 6c. wiki_documents : UPDATE
-- ---------------------------------------------------------------

-- DRAFT → auteur uniquement
CREATE POLICY "wiki_docs_update_draft"
  ON public.wiki_documents FOR UPDATE
  TO authenticated
  USING (
    status = 'DRAFT'
    AND author_id = auth.uid()
  )
  WITH CHECK (true);

-- PENDING → N3/N4/ADMIN (pour approuver/rejeter)
CREATE POLICY "wiki_docs_update_pending"
  ON public.wiki_documents FOR UPDATE
  TO authenticated
  USING (
    status = 'PENDING'
    AND get_my_role() IN ('N3', 'N4', 'ADMIN')
  )
  WITH CHECK (true);

-- PUBLISHED → N3/N4/ADMIN uniquement
CREATE POLICY "wiki_docs_update_published"
  ON public.wiki_documents FOR UPDATE
  TO authenticated
  USING (
    status = 'PUBLISHED'
    AND get_my_role() IN ('N3', 'N4', 'ADMIN')
  )
  WITH CHECK (true);

-- ---------------------------------------------------------------
-- 6d. wiki_documents : DELETE
-- ---------------------------------------------------------------

-- Seul l'auteur peut supprimer un DRAFT, N3+ peut supprimer PUBLISHED
CREATE POLICY "wiki_docs_delete_draft"
  ON public.wiki_documents FOR DELETE
  TO authenticated
  USING (
    status = 'DRAFT'
    AND author_id = auth.uid()
  );

CREATE POLICY "wiki_docs_delete_published"
  ON public.wiki_documents FOR DELETE
  TO authenticated
  USING (
    status = 'PUBLISHED'
    AND get_my_role() IN ('N3', 'N4', 'ADMIN')
  );

-- ---------------------------------------------------------------
-- 6e. wiki_revisions : SELECT / INSERT
-- ---------------------------------------------------------------

-- Lecture pour non-CLIENT
CREATE POLICY "wiki_revisions_select"
  ON public.wiki_revisions FOR SELECT
  TO authenticated
  USING (
    get_my_role() <> 'CLIENT'
  );

-- Insert géré par le trigger (SECURITY DEFINER), mais on ouvre au cas où
CREATE POLICY "wiki_revisions_insert"
  ON public.wiki_revisions FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() IN ('N3', 'N4', 'ADMIN')
  );

COMMIT;
