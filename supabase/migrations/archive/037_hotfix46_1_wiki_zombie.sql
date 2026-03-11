-- ============================================================================
-- HOTFIX 46.1 — Correction du bug "zombies" de double validation wiki
-- Le DELETE sur les documents PENDING était silencieusement ignoré car
-- aucune RLS policy n'autorisait le DELETE sur status = 'PENDING'.
-- ============================================================================

-- 1. Ajout de la policy DELETE pour les documents PENDING (reviewers)
CREATE POLICY "wiki_docs_delete_pending"
  ON public.wiki_documents FOR DELETE
  TO authenticated
  USING (status = 'PENDING' AND public.get_my_role() IN ('N3', 'N4', 'ADMIN'));

-- 2. Élargir le droit d'INSERT sur wiki_revisions (pour les fusions)
-- L'ancien filtre N3/N4/ADMIN empêchait l'insert car le author_id
-- de la révision est celui de l'auteur original, pas celui du reviewer.
DROP POLICY IF EXISTS "wiki_revisions_insert" ON public.wiki_revisions;

CREATE POLICY "wiki_revisions_insert"
  ON public.wiki_revisions FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() NOT IN ('CLIENT'));
