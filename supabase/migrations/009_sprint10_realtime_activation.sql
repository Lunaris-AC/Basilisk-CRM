-- ============================================================================
-- SPRINT 10 : ACTIVATION DU TEMPS RÉEL (SUPABASE REALTIME)
-- ============================================================================

-- On ajoute les tables 'tickets' et 'ticket_comments' à la publication realtime par défaut
-- Cela permet à Supabase d'envoyer les changements (INSERT, UPDATE, DELETE) via WebSocket.

-- Note : Par défaut, Supabase a une publication nommée 'supabase_realtime'.
-- Si elle n'existe pas, on peut la créer. Habituellement elle est présente.

BEGIN;

-- On s'assure que la publication existe (certaines configs vident le slot par défaut)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Ajout des tables stratégiques
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_comments;

COMMIT;
