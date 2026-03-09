-- SPRINT 25.1: MAPPING CATALOGUE COMMERCIAL VERS CMDB

-- 1. Ajout de la colonne pour lier au catalogue technique
ALTER TABLE commercial_catalogue
ADD COLUMN IF NOT EXISTS equipment_model_id UUID REFERENCES equipment_catalogue(id) ON DELETE SET NULL;

COMMENT ON COLUMN commercial_catalogue.equipment_model_id IS 'Lien optionnel vers un modèle d''équipement technique (utile pour l''automatisation des commandes de matériel).';

-- 2. Index de performance pour la jointure
CREATE INDEX IF NOT EXISTS idx_commercial_catalogue_equipment_model_id 
ON commercial_catalogue(equipment_model_id) 
WHERE equipment_model_id IS NOT NULL;
