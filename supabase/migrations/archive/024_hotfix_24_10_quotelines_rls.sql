BEGIN;

DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.quote_lines;
CREATE POLICY "Allow read access to authenticated users" ON public.quote_lines FOR SELECT TO authenticated USING (true);

COMMIT;
