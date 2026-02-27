-- HOTFIX 26.1.1 : Correction du mapping des niveaux de support
-- Ce script corrige le mapping entre les rôles techniques et les niveaux de support
-- sans toucher aux rôles utilisateur eux-mêmes.

-- 1. On s'assure que les niveaux de support existent bien avec les bons noms
-- (Normalement déjà fait par le script 026, mais on sécurise)
UPDATE support_levels SET name = 'N1 - Helpdesk' WHERE rank = 1;
UPDATE support_levels SET name = 'N2 - Technicien' WHERE rank = 2;
UPDATE support_levels SET name = 'N3 - Expert' WHERE rank = 3;
UPDATE support_levels SET name = 'N4 - Ingénieur' WHERE rank = 4;

-- 2. Correction du mapping dans la table profiles
-- On ne touche PAS à la colonne 'role', on met seulement à jour 'support_level_id'
UPDATE profiles p
SET support_level_id = sl.id
FROM support_levels sl
WHERE (p.role::TEXT = 'SAV1' AND sl.name = 'N1 - Helpdesk')
   OR (p.role::TEXT = 'SAV2' AND sl.name = 'N2 - Technicien')
   OR (p.role::TEXT = 'DEV' AND sl.name = 'N3 - Expert')
   OR (p.role::TEXT = 'ADMIN' AND sl.name = 'N4 - Ingénieur');

-- 3. Optionnel : On s'assure que les rôles non techniques ont un niveau de support NULL
UPDATE profiles 
SET support_level_id = NULL 
WHERE role::TEXT IN ('CLIENT', 'COM', 'STANDARD', 'FORMATEUR');
