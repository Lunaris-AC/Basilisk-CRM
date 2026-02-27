BEGIN;

DROP POLICY IF EXISTS "catalogue_select" ON public.commercial_catalogue;
CREATE POLICY "Allow read access to authenticated users" ON public.commercial_catalogue FOR SELECT TO authenticated USING (true);

COMMIT;
