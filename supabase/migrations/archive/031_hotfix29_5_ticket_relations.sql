-- ============================================================================
-- HOTFIX 29.5: RECÂBLAGE RELATIONNEL COMPLET (TICKETS FANTÔMES)
-- Correction de la logique relationnelle RLS pour les clients.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "tickets_select_client" ON tickets;

CREATE POLICY tickets_select_client
  ON tickets
  FOR SELECT
  USING (
    creator_id = auth.uid() 
    OR 
    store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
  );

COMMIT;
