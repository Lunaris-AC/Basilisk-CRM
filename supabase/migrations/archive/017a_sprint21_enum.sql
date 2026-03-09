-- ============================================================================
-- SPRINT 21a — Ajout du rôle CLIENT
-- ⚠️ EXÉCUTER CE SCRIPT EN PREMIER, seul, avant 017b.
-- PostgreSQL interdit l'utilisation d'une nouvelle valeur d'enum
-- dans la même transaction que son ALTER TYPE ADD VALUE.
-- ============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'CLIENT';
