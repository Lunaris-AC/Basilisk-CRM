-- 3. Migration des données existantes (on copie le rôle actuel dans support_level pour ceux concernés)
UPDATE public.profiles 
SET support_level = role::TEXT 
WHERE role::TEXT IN ('N1', 'N2', 'N3', 'N4');

-- 4. Changement du rôle
UPDATE public.profiles 
SET role = 'TECHNICIEN' 
WHERE role::TEXT IN ('N1', 'N2', 'N3', 'N4');

-- 5. Mises à jour des Fonctions DB et des RLS Policies

-- Creation de get_my_support_level
CREATE OR REPLACE FUNCTION public.get_my_support_level()
RETURNS TEXT AS $$
  SELECT support_level
  FROM profiles
  WHERE id = auth.uid()
    AND is_active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- public.clients
DROP POLICY IF EXISTS "clients_update" ON public.clients;
CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE USING (
    public.get_my_role() IN ('COM', 'ADMIN') OR 
    (public.get_my_role() = 'TECHNICIEN' AND public.get_my_support_level() = 'N4')
  )
  WITH CHECK (
    public.get_my_role() IN ('COM', 'ADMIN') OR 
    (public.get_my_role() = 'TECHNICIEN' AND public.get_my_support_level() = 'N4')
  );

-- public.stores
DROP POLICY IF EXISTS "stores_update" ON public.stores;
CREATE POLICY "stores_update" ON public.stores
  FOR UPDATE USING (
    public.get_my_role() IN ('COM', 'ADMIN') OR 
    (public.get_my_role() = 'TECHNICIEN' AND public.get_my_support_level() = 'N4')
  )
  WITH CHECK (
    public.get_my_role() IN ('COM', 'ADMIN') OR 
    (public.get_my_role() = 'TECHNICIEN' AND public.get_my_support_level() = 'N4')
  );

-- public.tickets
DROP POLICY IF EXISTS "tickets_update_admin_n4" ON public.tickets;
CREATE POLICY "tickets_update_admin_n4" ON public.tickets
  FOR UPDATE USING (
    public.get_my_role() = 'ADMIN' OR 
    (public.get_my_role() = 'TECHNICIEN' AND public.get_my_support_level() = 'N4')
  )
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "wiki_docs_select_pending" ON public.wiki_documents;
CREATE POLICY "wiki_docs_select_pending"
  ON public.wiki_documents FOR SELECT
  TO authenticated
  USING (
    status = 'PENDING'
    AND (
      author_id = auth.uid() OR 
      public.get_my_role() = 'ADMIN' OR 
      (public.get_my_role() = 'TECHNICIEN' AND public.get_my_support_level() IN ('N3', 'N4'))
    )
  );

-- public.wiki_documents (UPDATE/DELETE)
DROP POLICY IF EXISTS "wiki_docs_update_draft" ON public.wiki_documents;
CREATE POLICY "wiki_docs_update_draft"
  ON public.wiki_documents FOR UPDATE
  TO authenticated
  USING (
    status = 'DRAFT' 
    AND (
      author_id = auth.uid() OR 
      public.get_my_role() = 'ADMIN' OR 
      (public.get_my_role() = 'TECHNICIEN' AND public.get_my_support_level() IN ('N3', 'N4'))
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "wiki_docs_update_pending" ON public.wiki_documents;
CREATE POLICY "wiki_docs_update_pending"
  ON public.wiki_documents FOR UPDATE
  TO authenticated
  USING (
    status = 'PENDING' AND (
      public.get_my_role() = 'ADMIN' OR 
      (public.get_my_role() = 'TECHNICIEN' AND public.get_my_support_level() IN ('N3', 'N4'))
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "wiki_docs_update_published" ON public.wiki_documents;
CREATE POLICY "wiki_docs_update_published"
  ON public.wiki_documents FOR UPDATE
  TO authenticated
  USING (
    status = 'PUBLISHED' AND (
      public.get_my_role() = 'ADMIN' OR 
      (public.get_my_role() = 'TECHNICIEN' AND public.get_my_support_level() IN ('N3', 'N4'))
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "wiki_docs_delete_pending" ON public.wiki_documents;
CREATE POLICY "wiki_docs_delete_pending"
  ON public.wiki_documents FOR DELETE
  TO authenticated
  USING (
    status = 'PENDING' AND (
      public.get_my_role() = 'ADMIN' OR 
      (public.get_my_role() = 'TECHNICIEN' AND public.get_my_support_level() IN ('N3', 'N4'))
    )
  );

DROP POLICY IF EXISTS "wiki_docs_delete_published" ON public.wiki_documents;
CREATE POLICY "wiki_docs_delete_published"
  ON public.wiki_documents FOR DELETE
  TO authenticated
  USING (
    status = 'PUBLISHED' AND (
      public.get_my_role() = 'ADMIN' OR 
      (public.get_my_role() = 'TECHNICIEN' AND public.get_my_support_level() IN ('N3', 'N4'))
    )
  );

-- Et on met à jour la fonction pick_ticket...
CREATE OR REPLACE FUNCTION public.pick_ticket(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_user_support_level TEXT;
  v_user_support_level_id UUID;
  v_user_role TEXT;
  v_assigned_ticket_id UUID;
BEGIN
  -- 1. Récupérer le support_level_id, le support_level (TEXT) et le role du technicien
  SELECT support_level_id, support_level, role::text
  INTO v_user_support_level_id, v_user_support_level, v_user_role
  FROM profiles
  WHERE id = p_user_id;

  -- 1.5. Si pas de niveau explicitement paramétré via UUID, on essaye de le déduire d'après la colonne texte 'support_level'
  IF v_user_support_level_id IS NULL AND v_user_support_level IN ('N1', 'N2', 'N3', 'N4') THEN
      SELECT id INTO v_user_support_level_id
      FROM support_levels
      WHERE name = v_user_support_level
      LIMIT 1;
  END IF;

  -- Fonctionnement existant...
  SELECT id INTO v_assigned_ticket_id
  FROM tickets
  WHERE assignee_id IS NULL
    AND status     = 'nouveau'
    AND is_active  = TRUE
    AND category  != 'DEV'
    AND (
      CASE
        WHEN v_user_support_level_id IS NOT NULL THEN
          (support_level_id = v_user_support_level_id OR support_level_id IS NULL)
        ELSE
          support_level_id IS NULL
      END
    )
    AND (escalated_by_id IS NULL OR escalated_by_id != p_user_id)
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
$func$;
