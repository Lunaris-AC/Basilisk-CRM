-- Update pick_ticket logic to handle SAV1 and SAV2 split
CREATE OR REPLACE FUNCTION public.pick_ticket(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_role user_role;
    v_level_rank INT;
    v_ticket_id UUID;
BEGIN
    -- Get user role and level rank
    SELECT p.role, sl.rank INTO v_role, v_level_rank
    FROM public.profiles p
    LEFT JOIN public.support_levels sl ON p.support_level_id = sl.id
    WHERE p.id = p_user_id;

    -- Update logic based on split categories SAV1 and SAV2
    UPDATE public.tickets
    SET 
        assignee_id = p_user_id,
        status = 'assigne',
        updated_at = NOW()
    WHERE id = (
        SELECT id FROM public.tickets
        WHERE assignee_id IS NULL
          AND status = 'nouveau'
          AND category != 'DEV' -- DEV has separate flow
          AND (
              -- Business logic per role
              CASE 
                  WHEN v_role = 'ADMIN' THEN TRUE
                  WHEN v_role = 'STANDARD' THEN TRUE
                  WHEN v_role = 'SAV1' THEN category = 'SAV1'
                  WHEN v_role = 'SAV2' THEN category = 'SAV2'
                  WHEN v_role = 'FORMATEUR' THEN category = 'FORMATION'
                  WHEN v_role = 'COM' THEN category = 'COMMERCE'
                  WHEN v_role = 'TECHNICIEN' THEN (escalation_level = v_level_rank OR escalation_level IS NULL)
                  ELSE FALSE
              END
          )
        ORDER BY 
            CASE WHEN priority = 'critique' THEN 1 WHEN priority = 'haute' THEN 2 ELSE 3 END,
            created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING id INTO v_ticket_id;

    RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
