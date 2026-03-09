-- ============================================================================
-- SPRINT 7.1 — JUSTIFICATIONS OBLIGATOIRES ET SUSPENSION
-- SaaS Ticketing / Support Interne
-- ============================================================================

-- 1. Ajout de la valeur 'suspendu' à l'enum ticket_status
-- Note: PostgreSQL ne permet pas d'ajouter une valeur à l'intérieur d'une transaction
-- sur les anciennes versions, mais depuis la v12+ on peut.
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'suspendu';

-- 2. Ajout de la colonne `resume_at` pour indiquer la date de reprise d'un ticket suspendu
ALTER TABLE tickets 
ADD COLUMN resume_at TIMESTAMPTZ;

-- Commentaire pour la documentation (Optionnel)
COMMENT ON COLUMN tickets.resume_at IS 'Date et heure prévues pour la reprise de l''activité sur un ticket suspendu.';
