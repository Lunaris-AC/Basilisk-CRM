-- ============================================================================
-- HOTFIX 29.4 — CORRECTION RLS: Les clients voient leurs tickets
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "tickets_select_client" ON tickets;

-- Nouvelle politique basée sur profile.store_id (suite logique du SPRINT 24.1 et Hotfix 29.3)
CREATE POLICY tickets_select_client
  ON tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'CLIENT'
        AND p.is_active = TRUE
        AND tickets.store_id = p.store_id
    )
  );

COMMIT;
