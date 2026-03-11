-- ============================================================================
-- HOTFIX 43.1 : Autorisation Realtime Presence & Broadcast
-- ============================================================================
-- Depuis @supabase/supabase-js v2.x récent, les canaux Presence et Broadcast
-- nécessitent des politiques RLS sur la table interne `realtime.messages`.
-- Sans cela, le serveur Realtime rejette la souscription avec un 400.
--
-- Cette migration autorise tout utilisateur authentifié à utiliser
-- Presence et Broadcast (lecture + écriture).
-- ============================================================================

BEGIN;

-- Activer RLS sur la table realtime.messages (idempotent)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs authentifiés peuvent envoyer / recevoir 
-- des messages Broadcast et Presence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'realtime' 
      AND tablename = 'messages' 
      AND policyname = 'Allow authenticated presence and broadcast'
  ) THEN
    CREATE POLICY "Allow authenticated presence and broadcast"
      ON realtime.messages
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;
