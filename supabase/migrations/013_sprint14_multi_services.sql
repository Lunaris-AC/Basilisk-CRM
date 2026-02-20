-- ==============================================================================
-- SPRINT 14 : ARCHITECTURE MULTI-SERVICES (EXTENSION 1-TO-1)
-- ==============================================================================
-- Ce script ajoute la notion de "Service" (Catégorie) aux tickets existants,
-- et crée des tables d'extension spécifiques pour les informations propres à
-- chaque service métier (Commerce, SAV, Formation) afin de ne pas polluer 
-- la table principale `tickets` tout en conservant l'intégrité référentielle
-- (Audit logs, Commentaires, Pièces jointes).
-- ==============================================================================

-- 1. CREATION DU TYPE ENUM CATEGORIE
DO $$ BEGIN
    CREATE TYPE ticket_category AS ENUM ('HL', 'COMMERCE', 'SAV', 'FORMATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. AJOUT DE LA COLONNE CATEGORIE DANS LA TABLE TICKETS
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS category ticket_category NOT NULL DEFAULT 'HL';

-- Optionnel : Création d'un index pour la recherche par catégorie
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);

-- ==============================================================================
-- 3. CREATION DES TABLES D'EXTENSION
-- ==============================================================================

-------------------------------------------------------------------------------
-- 3.1 Détails COMMERCE
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_commerce_details (
    ticket_id UUID PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
    quote_number TEXT,
    invoice_number TEXT,
    service_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activation RLS
ALTER TABLE ticket_commerce_details ENABLE ROW LEVEL SECURITY;

-- Politiques RLS Commerce
CREATE POLICY "Lecture publique des détails commerce" ON ticket_commerce_details
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Ecriture des détails commerce" ON ticket_commerce_details
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'COM', 'N4') -- Ou les techniciens qui créent le ticket (creator_id)
        ) OR EXISTS (
            SELECT 1 FROM tickets
            WHERE id = ticket_id AND creator_id = auth.uid()
        )
    );

-------------------------------------------------------------------------------
-- 3.2 Détails SAV
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_sav_details (
    ticket_id UUID PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
    serial_number TEXT,
    product_reference TEXT,
    hardware_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activation RLS
ALTER TABLE ticket_sav_details ENABLE ROW LEVEL SECURITY;

-- Politiques RLS SAV
CREATE POLICY "Lecture publique des détails sav" ON ticket_sav_details
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Ecriture des détails sav" ON ticket_sav_details
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'SAV1', 'SAV2', 'N4') 
        ) OR EXISTS (
            SELECT 1 FROM tickets
            WHERE id = ticket_id AND creator_id = auth.uid()
        )
    );

-------------------------------------------------------------------------------
-- 3.3 Détails FORMATEUR
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_formateur_details (
    ticket_id UUID PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
    travel_date TIMESTAMPTZ,
    training_location TEXT,
    training_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activation RLS
ALTER TABLE ticket_formateur_details ENABLE ROW LEVEL SECURITY;

-- Politiques RLS Formateur
CREATE POLICY "Lecture publique des détails formateur" ON ticket_formateur_details
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Ecriture des détails formateur" ON ticket_formateur_details
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'FORMATEUR', 'N4')
        ) OR EXISTS (
            SELECT 1 FROM tickets
            WHERE id = ticket_id AND creator_id = auth.uid()
        )
    );

-- ==============================================================================
-- 4. TRIGGERS POUR UPDATED_AT
-- ==============================================================================
DROP TRIGGER IF EXISTS update_ticket_commerce_details_updated_at ON ticket_commerce_details;
CREATE TRIGGER update_ticket_commerce_details_updated_at
    BEFORE UPDATE ON ticket_commerce_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_sav_details_updated_at ON ticket_sav_details;
CREATE TRIGGER update_ticket_sav_details_updated_at
    BEFORE UPDATE ON ticket_sav_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_formateur_details_updated_at ON ticket_formateur_details;
CREATE TRIGGER update_ticket_formateur_details_updated_at
    BEFORE UPDATE ON ticket_formateur_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- COMMENTAIRES
-- ==============================================================================
COMMENT ON TABLE ticket_commerce_details IS 'Table d''extension 1-to-1 pour les tickets de la catégorie COMMERCE';
COMMENT ON TABLE ticket_sav_details IS 'Table d''extension 1-to-1 pour les tickets de la catégorie SAV';
COMMENT ON TABLE ticket_formateur_details IS 'Table d''extension 1-to-1 pour les tickets de la catégorie FORMATION';
