-- Fix RLS policy for profiles to allow avatar updates
-- The previous policy had a circular dependency in WITH CHECK

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (public.is_active_user() AND id = auth.uid())
  WITH CHECK (
    id = auth.uid() 
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );
