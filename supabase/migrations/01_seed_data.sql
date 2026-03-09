-- ==========================================
-- SPRINT 33 - RELEASE V1 SEED DATA
-- ==========================================

-- 1. Niveaux de support par défaut
INSERT INTO public.support_levels (id, name, rank, color, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'N1', 1, '#10b981', true),  -- Vert
  ('22222222-2222-2222-2222-222222222222', 'N2', 2, '#3b82f6', true),  -- Bleu
  ('33333333-3333-3333-3333-333333333333', 'N3', 3, '#8b5cf6', true),  -- Violet
  ('44444444-4444-4444-4444-444444444444', 'N4', 4, '#f43f5e', true)   -- Rouge
ON CONFLICT (id) DO NOTHING;

-- Note : Le profil ADMIN initial et les configurations d'authentification 
-- sont généralement gérés via le dashboard Supabase. 
-- Lors du déploiement via ce seed, l'utilisateur d'ID '00000000-0000-0000-0000-000000000000'
-- pourrait être lié si vous avez défini un mock en local.

-- 2. Règles de routage par défaut
INSERT INTO public.ticket_routing_rules (id, name, execution_order, conditions, target_support_level_id, is_active)
VALUES
  (
    '99999999-9999-9999-9999-999999999999',
    'Routage SAV par défaut (HL -> N1)',
    10,
    '[{"field": "category", "operator": "equals", "value": "SAV"}]'::jsonb,
    '11111111-1111-1111-1111-111111111111',
    true
  )
ON CONFLICT (id) DO NOTHING;
