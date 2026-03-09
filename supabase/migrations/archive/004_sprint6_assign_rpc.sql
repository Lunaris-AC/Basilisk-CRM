-- ============================================================================
-- SPRINT 6 — FONCTION RPC POUR PIOCHER UN TICKET (TRANSACTIONNELLE)
-- SaaS Ticketing / Support Interne
-- ============================================================================

-- Cette fonction permet à un technicien de piocher le ticket le plus ancien
-- correspondant à son niveau, de façon totalement concurrente (SKIP LOCKED).

CREATE OR REPLACE FUNCTION pick_ticket(
  p_user_id TEXT,    -- On passe l'ID de l'utilisateur (depuis l'API Next.js)
  p_user_role TEXT   -- Le rôle global (N1, N2, etc.)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- La fonction s'exécute avec les droits du créateur (pour bypasser RLS en interne)
AS $$
DECLARE
  v_base_level SMALLINT;
  v_assigned_ticket_id UUID;
BEGIN
  -- 1. Déterminer le niveau de base (escalation_level) selon le rôle
  CASE p_user_role
    WHEN 'N1' THEN v_base_level := 1;
    WHEN 'N2' THEN v_base_level := 2;
    WHEN 'N3' THEN v_base_level := 3;
    WHEN 'N4' THEN v_base_level := 4;
    WHEN 'ADMIN' THEN v_base_level := 4; -- Un admin peut taper au plus haut et redescendre
    ELSE v_base_level := 1; -- Par défaut (SAV ou autre)
  END CASE;

  -- 2. Tentative 1 : Chercher un ticket sur le niveau EXACT
  -- FOR UPDATE SKIP LOCKED verrouille la ligne pour cette transaction uniquement,
  -- si un autre collègue clique en même temps, il "sautera" ce ticket et prendra le suivant.
  SELECT id INTO v_assigned_ticket_id
  FROM tickets
  WHERE assignee_id IS NULL
    AND status IN ('nouveau', 'escalade')
    AND is_active = TRUE
    AND escalation_level = v_base_level
    AND (escalated_by_id IS NULL OR escalated_by_id != p_user_id::UUID) -- Anti ping-pong
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- 3. Tentative 2 : S'il n'y a rien à ce niveau, on cherche au niveau inférieur (ou supérieur selon la logique voulue)
  -- Pour ce MVP, on cherche un ticket d'un niveau inférieur si on est N2/N3/N4.
  IF v_assigned_ticket_id IS NULL AND v_base_level > 1 THEN
    SELECT id INTO v_assigned_ticket_id
    FROM tickets
    WHERE assignee_id IS NULL
      AND status IN ('nouveau', 'escalade')
      AND is_active = TRUE
      AND escalation_level < v_base_level
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  END IF;

  -- 4. Si on a trouvé un ticket (v_assigned_ticket_id n'est pas NULL), on l'assigne massivement
  IF v_assigned_ticket_id IS NOT NULL THEN
    UPDATE tickets
    SET 
      assignee_id = p_user_id::UUID,
      status = 'assigne',
      updated_at = NOW()
    WHERE id = v_assigned_ticket_id;
    
    RETURN v_assigned_ticket_id;
  END IF;

  -- 5. Aucun ticket trouvé
  RETURN NULL;
END;
$$;
