-- 20260408000000_hotfix_support_level_filter.sql

-- STEP 2: FIX RLS FOR TICKETS SELECT
-- Technicians should only see tickets that match their support_level, escalating logic implies N1 sees N1, N2 sees N2, etc, or null.
-- We must drop the existing select policy which just checks is_active_user().  

-- Assuming we need a function to get the current user's support_level_id
CREATE OR REPLACE FUNCTION public.get_my_support_level_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT support_level_id FROM public.profiles WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "tickets_select" ON public.tickets;

CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT USING (
    public.is_active_user() AND (
      public.get_my_role() = 'ADMIN' OR
      (public.get_my_role() = 'TECHNICIEN' AND (
        support_level_id IS NULL OR 
        support_level_id = public.get_my_support_level_id()
      )) OR
      (public.get_my_role() = 'CLIENT' AND (
        creator_id = auth.uid() OR
        store_id IN (
          SELECT s.id FROM public.stores s
          JOIN public.profiles p ON p.store_id = s.id
          WHERE p.id = auth.uid()
        )
      ))
    )
  );

-- Drop original `tickets_select_client` if it exists because we merged it into  `tickets_select`.
DROP POLICY IF EXISTS "tickets_select_client" ON public.tickets;

