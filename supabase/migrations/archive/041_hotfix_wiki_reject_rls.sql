-- ============================================================================
-- HOTFIX — Correction RLS : rejet / approbation d'un document wiki par un reviewer
--
-- Problème : la policy "wiki_docs_update_pending" n'avait pas de WITH CHECK (true)
-- explicite en base, PostgreSQL utilisait donc la clause USING comme WITH CHECK.
-- Résultat : quand un reviewer passe un doc de PENDING → DRAFT (rejet), la nouvelle
-- ligne échoue le check "status = 'PENDING'" → erreur RLS.
--
-- Même fix appliqué à wiki_docs_update_published par précaution.
-- ============================================================================

-- 1. Recréer wiki_docs_update_pending avec WITH CHECK (true) explicite
DROP POLICY IF EXISTS "wiki_docs_update_pending" ON public.wiki_documents;

CREATE POLICY "wiki_docs_update_pending"
  ON public.wiki_documents FOR UPDATE
  TO authenticated
  USING (
    status = 'PENDING'
    AND public.get_my_role() IN ('N3', 'N4', 'ADMIN')
  )
  WITH CHECK (true);

-- 2. Recréer wiki_docs_update_published avec WITH CHECK (true) explicite
DROP POLICY IF EXISTS "wiki_docs_update_published" ON public.wiki_documents;

CREATE POLICY "wiki_docs_update_published"
  ON public.wiki_documents FOR UPDATE
  TO authenticated
  USING (
    status = 'PUBLISHED'
    AND public.get_my_role() IN ('N3', 'N4', 'ADMIN')
  )
  WITH CHECK (true);

-- 3. Recréer wiki_docs_update_draft avec WITH CHECK (true) explicite (par précaution)
DROP POLICY IF EXISTS "wiki_docs_update_draft" ON public.wiki_documents;

CREATE POLICY "wiki_docs_update_draft"
  ON public.wiki_documents FOR UPDATE
  TO authenticated
  USING (
    status = 'DRAFT'
    AND author_id = auth.uid()
  )
  WITH CHECK (true);
