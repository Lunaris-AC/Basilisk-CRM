-- ============================================================================
-- SPRINT 32 (HOTFIX 32.1) — CORRECTION DE LA FONCTION RPC pick_ticket
-- Problème : Si le profil technicien n'a pas de support_level_id, la condition
-- "support_level_id = NULL" (SQL) ne matche jamais → retour silencieux de NULL.
-- Correction :
--   1. Si le technicien n'a pas de support_level_id, on ne filtre pas par niveau
--      (il peut piocher dans tous les tickets sans niveau assigné).
--   2. On supprime le filtre is_active qui bloquait les nouveaux tickets
--      car le INSERT de createTicket ne passe pas is_active explicitement → TRUE par défaut ✓
--   3. On catégorie le ticket : exclude les tickets DEV de la file HL.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.pick_ticket(
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_support_level_id UUID;
  v_assigned_ticket_id    UUID;
BEGIN
  -- 1. Récupérer le support_level_id du technicien (peut être NULL)
  SELECT support_level_id INTO v_user_support_level_id
  FROM profiles
  WHERE id = p_user_id;

  -- 2. Tentative de pioche
  --    Règle de filtrage par niveau :
  --      - Si le technicien a un niveau : ticket doit avoir ce niveau OU aucun niveau
  --      - Si le technicien n'a PAS de niveau : on prend tous les tickets sans niveau assigné
  SELECT id INTO v_assigned_ticket_id
  FROM tickets
  WHERE assignee_id IS NULL
    AND status     = 'nouveau'
    AND is_active  = TRUE
    AND category  != 'DEV'  -- La file HL ne contient pas les SD
    AND (
      CASE
        WHEN v_user_support_level_id IS NOT NULL THEN
          (support_level_id = v_user_support_level_id OR support_level_id IS NULL)
        ELSE
          support_level_id IS NULL
      END
    )
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
  FOR UPDATE SKIP LOCKED;

  -- 3. Si on a trouvé un ticket, on l'assigne
  IF v_assigned_ticket_id IS NOT NULL THEN
    UPDATE tickets
    SET
      assignee_id = p_user_id,
      status      = 'en_cours',
      updated_at  = NOW()
    WHERE id = v_assigned_ticket_id;

    RETURN v_assigned_ticket_id;
  END IF;

  -- 4. Rien de disponible → NULL (géré côté app avec un message explicite)
  RETURN NULL;
END;
$$;
