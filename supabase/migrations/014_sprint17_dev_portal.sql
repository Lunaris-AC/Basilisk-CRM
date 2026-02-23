-- ==============================================================================
-- SPRINT 17a — AJOUT DES VALEURS ENUM (doit être committé avant utilisation)
-- ==============================================================================

-- 1. AJOUT DU RÔLE DEV
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'DEV';

-- 2. AJOUT DE LA CATÉGORIE DEV
ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'DEV';
