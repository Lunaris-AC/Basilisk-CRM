-- ============================================================================
-- SPRINT 33 — RELEASE V1 : RLS FIX FOR CONTACTS
-- Correction des politiques RLS sur la table contacts pour permettre la création 
-- par tous les utilisateurs actifs.
-- ============================================================================

BEGIN;

-- 1. Suppression des anciennes politiques (restrictives)
DROP POLICY IF EXISTS "contacts_insert_privileged" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_privileged" ON public.contacts;
DROP POLICY IF EXISTS "contacts_select_all" ON public.contacts;

-- 2. Création des nouvelles politiques uniformisées
-- Ces politiques permettent à tout utilisateur actif d'interagir avec les contacts,
-- conformément aux politiques des tables clients et magasins.

CREATE POLICY "contacts_select" ON public.contacts
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT WITH CHECK (public.is_active_user());

CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE USING (public.is_active_user());

COMMIT;
