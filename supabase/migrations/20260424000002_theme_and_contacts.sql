-- Add theme_config to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT '{}'::jsonb;

-- Ensure anyone can create contacts (Update RLS)
-- Current contacts_insert is already public.is_active_user()
-- But let's make sure it's explicit
DROP POLICY IF EXISTS "contacts_insert" ON public.contacts;
CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT WITH CHECK (public.is_active_user());

-- Ensure updates/selects are also fine
DROP POLICY IF EXISTS "contacts_update" ON public.contacts;
CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE USING (public.is_active_user());
