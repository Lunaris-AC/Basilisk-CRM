-- ==========================================
-- ALLOW ALL ROLES TO MIGRATE SERVICE
-- ==========================================

-- On élargit la politique d'update des tickets pour permettre à tous les rôles
-- d'effectuer des modifications (notamment la migration de service).

DROP POLICY IF EXISTS "tickets_update_admin_n4" ON public.tickets;

CREATE POLICY "tickets_update_all_roles" ON public.tickets
  FOR UPDATE USING (
    public.is_active_user()
  )
  WITH CHECK (TRUE);
