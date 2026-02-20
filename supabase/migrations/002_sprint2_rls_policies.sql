-- ============================================================================
-- SPRINT 2 — SÉCURITÉ : ROW LEVEL SECURITY (RLS)
-- SaaS Ticketing / Support Interne
-- À exécuter dans le SQL Editor de Supabase APRÈS le Sprint 1
-- ============================================================================

-- ============================================================================
-- FONCTIONS UTILITAIRES (schéma public — auth interdit la création de fonctions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role
  FROM profiles
  WHERE id = auth.uid()
    AND is_active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_my_role()
  IS 'Retourne le rôle de l''utilisateur connecté (NULL si inactif ou inexistant).';


CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND is_active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_active_user()
  IS 'Retourne TRUE si l''utilisateur connecté existe et est actif.';


-- ============================================================================
-- 1. ACTIVATION DE LA RLS SUR TOUTES LES TABLES
-- ============================================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_audit_logs  ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2. POLITIQUES : profiles
-- ============================================================================

-- -------------------------
-- SELECT : tout employé authentifié et actif peut lire tous les profils
-- -------------------------
CREATE POLICY profiles_select
  ON profiles
  FOR SELECT
  USING (public.is_active_user());

-- -------------------------
-- INSERT : géré par le trigger fn_handle_new_user, pas d'INSERT manuel
-- On autorise quand même le service_role (Supabase interne) via SECURITY DEFINER
-- Aucune policy INSERT ici = interdit par défaut en RLS
-- -------------------------

-- -------------------------
-- UPDATE : un utilisateur ne modifie que son propre profil (sauf le rôle).
-- Les ADMIN peuvent tout modifier sur tous les profils.
-- -------------------------
CREATE POLICY profiles_update_own
  ON profiles
  FOR UPDATE
  USING (
    public.is_active_user()
    AND id = auth.uid()
  )
  WITH CHECK (
    -- L'utilisateur ne peut PAS changer son propre rôle
    role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY profiles_update_admin
  ON profiles
  FOR UPDATE
  USING (
    public.get_my_role() = 'ADMIN'
  )
  WITH CHECK (
    TRUE  -- L'ADMIN peut modifier tous les champs, y compris le rôle
  );

-- -------------------------
-- DELETE : strictement interdit (soft delete uniquement)
-- Aucune policy DELETE = interdit par défaut en RLS
-- -------------------------


-- ============================================================================
-- 3. POLITIQUES : clients
-- ============================================================================

-- -------------------------
-- SELECT : tout employé authentifié et actif
-- -------------------------
CREATE POLICY clients_select
  ON clients
  FOR SELECT
  USING (public.is_active_user());

-- -------------------------
-- INSERT : tout utilisateur authentifié et actif peut créer un client
-- -------------------------
CREATE POLICY clients_insert
  ON clients
  FOR INSERT
  WITH CHECK (public.is_active_user());

-- -------------------------
-- UPDATE : COM, N4, ADMIN uniquement
-- -------------------------
CREATE POLICY clients_update
  ON clients
  FOR UPDATE
  USING (
    public.get_my_role() IN ('COM', 'N4', 'ADMIN')
  )
  WITH CHECK (
    public.get_my_role() IN ('COM', 'N4', 'ADMIN')
  );

-- -------------------------
-- DELETE : interdit (pas de policy = bloqué par RLS)
-- -------------------------


-- ============================================================================
-- 4. POLITIQUES : stores
-- ============================================================================

-- -------------------------
-- SELECT : tout employé authentifié et actif
-- -------------------------
CREATE POLICY stores_select
  ON stores
  FOR SELECT
  USING (public.is_active_user());

-- -------------------------
-- INSERT : tout utilisateur authentifié et actif peut créer un magasin
-- -------------------------
CREATE POLICY stores_insert
  ON stores
  FOR INSERT
  WITH CHECK (public.is_active_user());

-- -------------------------
-- UPDATE : COM, N4, ADMIN uniquement
-- -------------------------
CREATE POLICY stores_update
  ON stores
  FOR UPDATE
  USING (
    public.get_my_role() IN ('COM', 'N4', 'ADMIN')
  )
  WITH CHECK (
    public.get_my_role() IN ('COM', 'N4', 'ADMIN')
  );

-- -------------------------
-- DELETE : interdit (pas de policy = bloqué par RLS)
-- -------------------------


-- ============================================================================
-- 5. POLITIQUES : tickets
-- ============================================================================

-- -------------------------
-- SELECT : tout employé authentifié et actif
-- -------------------------
CREATE POLICY tickets_select
  ON tickets
  FOR SELECT
  USING (public.is_active_user());

-- -------------------------
-- INSERT : tout utilisateur authentifié et actif peut créer un ticket
-- Le creator_id doit correspondre à l'utilisateur connecté
-- -------------------------
CREATE POLICY tickets_insert
  ON tickets
  FOR INSERT
  WITH CHECK (
    public.is_active_user()
    AND creator_id = auth.uid()
  );

-- -------------------------
-- UPDATE : règles multi-niveaux
-- -------------------------

-- 5a. ADMIN et N4 : peuvent tout modifier sur tous les tickets
CREATE POLICY tickets_update_admin_n4
  ON tickets
  FOR UPDATE
  USING (
    public.get_my_role() IN ('ADMIN', 'N4')
  )
  WITH CHECK (
    TRUE
  );

-- 5b. Le créateur du ticket peut le modifier
CREATE POLICY tickets_update_creator
  ON tickets
  FOR UPDATE
  USING (
    public.is_active_user()
    AND creator_id = auth.uid()
  )
  WITH CHECK (
    -- Le créateur ne peut pas changer le creator_id
    creator_id = auth.uid()
  );

-- 5c. L'assigné du ticket peut le modifier
CREATE POLICY tickets_update_assignee
  ON tickets
  FOR UPDATE
  USING (
    public.is_active_user()
    AND assignee_id = auth.uid()
  )
  WITH CHECK (
    TRUE
  );

-- 5d. Un technicien peut s'auto-assigner un ticket NON ASSIGNÉ
-- (passer son propre ID dans assignee_id seulement si le ticket est libre)
CREATE POLICY tickets_update_pick
  ON tickets
  FOR UPDATE
  USING (
    public.is_active_user()
    AND assignee_id IS NULL          -- Le ticket ne doit PAS être déjà assigné
    AND is_active = TRUE             -- Le ticket doit être actif
  )
  WITH CHECK (
    -- Le seul changement autorisé ici : s'assigner soi-même
    assignee_id = auth.uid()
  );

-- -------------------------
-- DELETE : interdit (pas de policy = bloqué par RLS)
-- -------------------------


-- ============================================================================
-- 6. POLITIQUES : ticket_audit_logs
-- ============================================================================

-- -------------------------
-- SELECT : tout employé authentifié et actif peut consulter l'audit trail
-- -------------------------
CREATE POLICY audit_logs_select
  ON ticket_audit_logs
  FOR SELECT
  USING (public.is_active_user());

-- -------------------------
-- INSERT : INTERDIT depuis l'application.
-- Les insertions sont gérées exclusivement par le trigger fn_ticket_audit_log()
-- qui tourne en SECURITY DEFINER (bypass RLS).
-- Aucune policy INSERT = bloqué pour les appels directs.
-- -------------------------

-- -------------------------
-- UPDATE : interdit (l'audit trail est immuable)
-- Aucune policy UPDATE = bloqué par RLS
-- -------------------------

-- -------------------------
-- DELETE : interdit
-- Aucune policy DELETE = bloqué par RLS
-- -------------------------


-- ============================================================================
-- 7. FORCER LA RLS MÊME POUR LE PROPRIÉTAIRE DES TABLES
-- Par défaut, le propriétaire (postgres) bypass la RLS.
-- On force la RLS pour s'assurer que même les appels service_role
-- passent par les policies SAUF si on le veut explicitement.
-- Note : Les fonctions SECURITY DEFINER bypasse déjà la RLS.
-- On garde FORCE sur les tables sensibles pour la défense en profondeur.
-- ============================================================================

ALTER TABLE profiles           FORCE ROW LEVEL SECURITY;
ALTER TABLE clients            FORCE ROW LEVEL SECURITY;
ALTER TABLE stores             FORCE ROW LEVEL SECURITY;
ALTER TABLE tickets            FORCE ROW LEVEL SECURITY;
ALTER TABLE ticket_audit_logs  FORCE ROW LEVEL SECURITY;


-- ============================================================================
-- FIN DU SPRINT 2
-- ============================================================================
