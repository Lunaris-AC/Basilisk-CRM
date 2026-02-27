-- ============================================================================
-- SPRINT 28 (HOTFIX 28.1) — REFACTORING DE LA FONCTION RPC DE PIOCHE
-- SaaS Ticketing / Support Interne
-- ============================================================================

-- Suppression de l'ancienne version
DROP FUNCTION IF EXISTS pick_ticket(TEXT, TEXT);

-- Nouvelle version basée sur l'UUID uniquement
CREATE OR REPLACE FUNCTION public.pick_ticket(
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_support_level_id UUID;
  v_assigned_ticket_id UUID;
BEGIN
  -- 1. Déterminer le support_level_id de l'utilisateur
  SELECT support_level_id INTO v_user_support_level_id
  FROM profiles
  WHERE id = p_user_id;

  -- 2. Tentative de pioche
  -- Le ticket doit être non assigné et actif
  -- Son statut doit être 'nouveau' uniquement
  SELECT id INTO v_assigned_ticket_id
  FROM tickets
  WHERE assignee_id IS NULL
    AND status = 'nouveau'
    AND is_active = TRUE
    AND (support_level_id = v_user_support_level_id OR support_level_id IS NULL)
    AND (escalated_by_id IS NULL OR escalated_by_id != p_user_id) -- Anti ping-pong
  ORDER BY 
    CASE priority 
      WHEN 'critique' THEN 4 
      WHEN 'haute'    THEN 3 
      WHEN 'normale'  THEN 2 
      WHEN 'basse'    THEN 1 
      ELSE 0
    END DESC,
    created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- Résolution concurrente parfaite

  -- 3. Si on a trouvé un ticket, on l'assigne et son statut passe 'en_cours'
  IF v_assigned_ticket_id IS NOT NULL THEN
    UPDATE tickets
    SET 
      assignee_id = p_user_id,
      status = 'en_cours',
      updated_at = NOW()
    WHERE id = v_assigned_ticket_id;
    
    RETURN v_assigned_ticket_id;
  END IF;

  RETURN NULL;
END;
$$;
