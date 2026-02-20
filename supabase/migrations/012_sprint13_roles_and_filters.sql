-- ============================================================================
-- SPRINT 13 — FILTRES AVANCÉS ET MULTI-PORTAILS
-- Ajout du rôle FORMATEUR
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================================

-- Ajoute de manière sécurisée (IF NOT EXISTS) la valeur 'FORMATEUR' à l'ENUM user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'FORMATEUR';
