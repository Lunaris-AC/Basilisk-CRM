-- CORRECTION DE LA FONCTION RPC pick_ticket
-- Problème : Si le profil technicien n'a pas de support_level_id mais a un role (N1, N2, N3),
-- il est incapable de piocher des tickets alors qu'il devrait.

CREATE OR REPLACE FUNCTION public.pick_ticket(
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_support_level_id UUID;
  v_user_role TEXT;
  v_assigned_ticket_id    UUID;
BEGIN
  -- 1. Récupérer le support_level_id et le role du technicien
  SELECT support_level_id, role::text INTO v_user_support_level_id, v_user_role
  FROM profiles
  WHERE id = p_user_id;

  -- 1.5. Si pas de niveau explicitement paramétré, on essaye de le déduire d'après le nom de niveau équivalent au role
  IF v_user_support_level_id IS NULL AND v_user_role IN ('N1', 'N2', 'N3') THEN
      SELECT id INTO v_user_support_level_id
      FROM support_levels
      WHERE name = v_user_role
      LIMIT 1;
  END IF;

  -- 2. Tentative de pioche
  --    Règle de filtrage par niveau :
  --      - Si le technicien a un niveau (explicite ou déduit) : ticket doit avoir ce niveau OU aucun niveau
  --      - Si le technicien n'a PAS de niveau du tout : on prend tous les tickets sans niveau assigné
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

  -- 4. Rien de disponible
  RETURN NULL;
END;
$$;