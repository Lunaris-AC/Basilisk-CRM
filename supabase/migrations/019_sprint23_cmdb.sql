-- ============================================================
-- SPRINT 23 : CMDB (PARC MATÉRIEL) & LICENCES LOGICIELLES
-- Gestion du parc matériel avec champs dynamiques (JSONB)
-- Gestion des retours fournisseurs (RMA)
-- Gestion des licences logicielles par magasin
-- ============================================================

-- ============================================================
-- 1. ENUM : Statuts des équipements
-- ============================================================

CREATE TYPE equipment_status AS ENUM (
    'EN_SERVICE',           -- Matériel opérationnel en production
    'EN_PANNE',             -- Matériel défaillant, non fonctionnel
    'EN_REPARATION_INTERNE', -- En cours de réparation par le SAV interne
    'RMA_FOURNISSEUR',      -- Retourné au fournisseur (Return Merchandise Authorization)
    'REBUT'                 -- Mis au rebut définitivement
);

-- ============================================================
-- 2. TABLE : equipment_catalogue
-- Modèles de référence (catalogue d'appareils)
-- ============================================================

CREATE TABLE IF NOT EXISTS equipment_catalogue (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category              TEXT          NOT NULL,  -- ex: 'Caisse', 'Serveur', 'TPE', 'Imprimante'
    brand                 TEXT          NOT NULL,  -- ex: 'HP', 'Dell', 'Ingenico'
    model_name            TEXT          NOT NULL,  -- ex: 'EliteDesk 800 G6', 'Move/5000'
    -- Schéma JSON définissant les champs attendus pour ce modèle
    -- Format: {"field_key": "type"} où type est "string", "number", "boolean", "date"
    -- Exemple: {"os": "string", "ram_gb": "number", "screen_size": "number", "has_touchscreen": "boolean"}
    custom_fields_schema  JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  equipment_catalogue                      IS 'Catalogue des modèles d''appareils. Définit les champs dynamiques attendus via custom_fields_schema.';
COMMENT ON COLUMN equipment_catalogue.custom_fields_schema IS 'Schéma JSON des champs personnalisés. Format: {"key": "type"}. Types: string, number, boolean, date.';

CREATE INDEX idx_catalogue_category ON equipment_catalogue(category);
CREATE INDEX idx_catalogue_brand    ON equipment_catalogue(brand);

CREATE TRIGGER trg_equipment_catalogue_updated_at
    BEFORE UPDATE ON equipment_catalogue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. TABLE : equipments
-- Machines physiques (instances du catalogue)
-- ============================================================

CREATE TABLE IF NOT EXISTS equipments (
    id                   UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    catalogue_id         UUID            NOT NULL REFERENCES equipment_catalogue(id) ON DELETE RESTRICT,
    store_id             UUID            NOT NULL REFERENCES stores(id)              ON DELETE RESTRICT,
    serial_number        TEXT            NOT NULL UNIQUE,           -- Numéro de série constructeur
    status               equipment_status NOT NULL DEFAULT 'EN_SERVICE',
    purchase_date        DATE,                                       -- Date d'achat
    warranty_end_date    DATE,                                       -- Fin de garantie constructeur
    rma_tracking_number  TEXT,                                       -- Numéro de suivi retour fournisseur (RMA)
    -- Valeurs réelles des champs personnalisés définis dans le catalogue
    -- Exemple: {"os": "Windows 11 Pro", "ram_gb": 16, "screen_size": 27}
    custom_fields_data   JSONB           NOT NULL DEFAULT '{}'::jsonb,
    notes                TEXT,                                       -- Notes libres du technicien
    created_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  equipments                    IS 'Parc matériel physique. Chaque ligne est une machine réelle identifiée par son numéro de série.';
COMMENT ON COLUMN equipments.custom_fields_data IS 'Valeurs des champs dynamiques définis dans equipment_catalogue.custom_fields_schema.';
COMMENT ON COLUMN equipments.rma_tracking_number IS 'Numéro de suivi lors d''un retour fournisseur (RMA). Renseigné uniquement si statut = RMA_FOURNISSEUR.';

CREATE INDEX idx_equipments_store_id     ON equipments(store_id);
CREATE INDEX idx_equipments_catalogue_id ON equipments(catalogue_id);
CREATE INDEX idx_equipments_status       ON equipments(status);
CREATE INDEX idx_equipments_serial       ON equipments(serial_number);

CREATE TRIGGER trg_equipments_updated_at
    BEFORE UPDATE ON equipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. TABLE : software_licenses
-- Licences logicielles par magasin
-- ============================================================

CREATE TABLE IF NOT EXISTS software_licenses (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id         UUID        NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    software_name    TEXT        NOT NULL,  -- ex: 'Microsoft Office 365', 'Antivirus Pro'
    license_key      TEXT        NOT NULL,  -- Clé d'activation (peut être chiffrée côté app si besoin)
    seat_count       INTEGER     NOT NULL DEFAULT 1 CHECK (seat_count > 0), -- Nombre de postes couverts
    activation_date  DATE,                  -- Date d'activation de la licence
    expiration_date  DATE,                  -- Date d'expiration (NULL = perpétuelle)
    is_active        BOOLEAN     NOT NULL DEFAULT true, -- Licence activement utilisée
    notes            TEXT,                  -- Notes libres (revendeur, contact support, etc.)
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  software_licenses                  IS 'Licences logicielles des clients par magasin.';
COMMENT ON COLUMN software_licenses.seat_count       IS 'Nombre de postes (seats) couverts par la licence.';
COMMENT ON COLUMN software_licenses.expiration_date  IS 'Date d''expiration. NULL si licence perpétuelle.';
COMMENT ON COLUMN software_licenses.license_key      IS 'Clé d''activation ou identifiant de licence.';

CREATE INDEX idx_licenses_store_id        ON software_licenses(store_id);
CREATE INDEX idx_licenses_expiration_date ON software_licenses(expiration_date);
CREATE INDEX idx_licenses_is_active       ON software_licenses(is_active);

CREATE TRIGGER trg_software_licenses_updated_at
    BEFORE UPDATE ON software_licenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. ALTER TABLE tickets : Liaison optionnelle à un équipement
-- Permet de lier un ticket d'incident à une machine précise
-- ============================================================

ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipments(id) ON DELETE SET NULL;

COMMENT ON COLUMN tickets.equipment_id IS 'Équipement physique concerné par ce ticket (optionnel). FK vers equipments.';

CREATE INDEX idx_tickets_equipment_id ON tickets(equipment_id) WHERE equipment_id IS NOT NULL;

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

-- === equipment_catalogue ===
ALTER TABLE equipment_catalogue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture catalogue pour tous les utilisateurs authentifiés"
    ON equipment_catalogue FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Écriture catalogue pour rôles autorisés"
    ON equipment_catalogue FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('DEV', 'COM', 'SAV1', 'SAV2', 'ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('DEV', 'COM', 'SAV1', 'SAV2', 'ADMIN')
        )
    );

-- === equipments ===
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture équipements pour tous les utilisateurs authentifiés"
    ON equipments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Écriture équipements pour rôles autorisés"
    ON equipments FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('DEV', 'COM', 'SAV1', 'SAV2', 'ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('DEV', 'COM', 'SAV1', 'SAV2', 'ADMIN')
        )
    );

-- === software_licenses ===
ALTER TABLE software_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture licences pour tous les utilisateurs authentifiés"
    ON software_licenses FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Écriture licences pour rôles autorisés"
    ON software_licenses FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('DEV', 'COM', 'SAV1', 'SAV2', 'ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('DEV', 'COM', 'SAV1', 'SAV2', 'ADMIN')
        )
    );

-- ============================================================
-- 7. DONNÉES DE SEED (catalogue de démonstration)
-- ============================================================

INSERT INTO equipment_catalogue (category, brand, model_name, custom_fields_schema) VALUES
    ('Caisse',     'HP',       'RP9 G1',          '{"os": "string", "ram_gb": "number", "screen_size": "number", "has_touchscreen": "boolean"}'),
    ('Serveur',    'Dell',     'PowerEdge T150',  '{"os": "string", "ram_gb": "number", "cpu_cores": "number", "raid_level": "string", "is_virtualized": "boolean"}'),
    ('TPE',        'Ingenico', 'Move/5000',        '{"firmware_version": "string", "protocol": "string", "is_contactless": "boolean"}'),
    ('Imprimante', 'Epson',    'TM-T88VI',         '{"interface": "string", "paper_width_mm": "number", "is_cutter_present": "boolean"}'),
    ('PC Bureau',  'HP',       'EliteDesk 800 G6', '{"os": "string", "ram_gb": "number", "storage_gb": "number", "cpu": "string"}')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN DU SPRINT 23
-- ============================================================
