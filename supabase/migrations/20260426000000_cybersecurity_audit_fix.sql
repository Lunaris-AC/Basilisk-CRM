-- ==========================================
-- CYBERSECURITY AUDIT PATCH 2026-04-26
-- ==========================================

-- 1. FIX TICKETS RLS (Leak of all tickets to CLIENTS)
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
CREATE POLICY "tickets_select_internal" ON public.tickets
  FOR SELECT USING (
    public.is_active_user() 
    AND public.get_my_role() <> 'CLIENT'
  );
-- Keep the existing tickets_select_client as it is already restrictive

-- 2. FIX TICKET COMMENTS RLS (Leak of internal comments)
DROP POLICY IF EXISTS "ticket_comments_select" ON public.ticket_comments;
CREATE POLICY "ticket_comments_select" ON public.ticket_comments
  FOR SELECT USING (
    public.is_active_user()
    AND (
      -- Interne : voit tout
      public.get_my_role() <> 'CLIENT'
      OR 
      -- Client : voit ses propres tickets et uniquement les non-internes
      (
        public.get_my_role() = 'CLIENT'
        AND is_internal = FALSE
        AND EXISTS (
          SELECT 1 FROM public.tickets t
          WHERE t.id = ticket_comments.ticket_id
          AND (
            t.creator_id = auth.uid()
            OR t.store_id IN (
              SELECT s.id FROM stores s
              JOIN profiles p ON p.store_id = s.id
              WHERE p.id = auth.uid()
            )
          )
        )
      )
    )
  );

-- 3. FIX TICKET ATTACHMENTS RLS (Leak of files)
DROP POLICY IF EXISTS "ticket_attachments_select" ON public.ticket_attachments;
CREATE POLICY "ticket_attachments_select" ON public.ticket_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
    )
    -- Note: This still relies on the tickets policy being checked via subquery
    -- But since tickets RLS is enabled, the subquery will only return rows the user can see.
  );

-- 4. FIX RIFT MEMBERSHIP (Unauthorized joining)
DROP POLICY IF EXISTS "rift_members_insert" ON public.rift_channel_members;
CREATE POLICY "rift_members_insert" ON public.rift_channel_members
  FOR INSERT WITH CHECK (
    public.is_internal_user()
    AND (
      -- S'ajouter soi-même SEULEMENT si le channel est PUBLIC
      (user_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.rift_channels c 
        WHERE c.id = channel_id AND c.type = 'PUBLIC'
      ))
      -- OU être invité par un membre existant (doit déjà être dans la table via createRiftChannel ou invite)
      -- Note: L'action serveur handle cet aspect, mais au niveau SQL on restreint
      OR public.is_rift_member(channel_id)
      -- OU être ADMIN
      OR public.get_my_role() = 'ADMIN'
    )
  );

-- 5. FIX RIFT ATTACHMENTS (Storage Data Leak)
DROP POLICY IF EXISTS "rift_attachments_select" ON storage.objects;
CREATE POLICY "rift_attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'rift-attachments'
    AND public.is_internal_user()
    AND (
      -- Doit être membre d'un channel où ce fichier a été posté
      -- On utilise une convention de path ou une table de liaison si possible, 
      -- mais ici on va restreindre à ADMIN ou proprio si path commence par user_id
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.get_my_role() = 'ADMIN'
      -- Note: Pour une sécurité parfaite, il faudrait une table rift_message_attachments
      -- et vérifier l'appartenance au channel du message.
    )
  );

-- 6. FIX TICKET ATTACHMENTS STORAGE
DROP POLICY IF EXISTS "ticket_attachments_select" ON storage.objects;
CREATE POLICY "ticket_attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ticket_attachments'
    AND (
       public.get_my_role() <> 'CLIENT'
       OR EXISTS (
         -- Vérifie si l'utilisateur a accès au ticket lié (le path contient l'id du ticket généralement)
         -- Si le path est /ticket_id/file_name
         SELECT 1 FROM public.tickets t
         WHERE t.id::text = (storage.foldername(name))[1]
       )
    )
  );

-- 7. FIX PROFILES PRIVACY
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select_internal" ON public.profiles
  FOR SELECT USING (
    public.get_my_role() <> 'CLIENT'
    AND public.is_active_user()
  );
CREATE POLICY "profiles_select_client_own" ON public.profiles
  FOR SELECT USING (
    public.get_my_role() = 'CLIENT'
    AND id = auth.uid()
  );
CREATE POLICY "profiles_select_client_staff" ON public.profiles
  FOR SELECT USING (
    public.get_my_role() = 'CLIENT'
    AND role <> 'CLIENT'
    -- Un client peut voir les profils du staff (intervenants sur ses tickets)
    -- On autorise la vue de base pour tout le staff pour que le client sache à qui il parle
  );
