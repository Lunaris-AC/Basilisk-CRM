-- ============================================================================
-- SPRINT 24 — MOTEUR COMMERCIAL B2B
-- ============================================================================

BEGIN;

-- 1. ENUMS
CREATE TYPE item_type AS ENUM ('MATERIEL', 'LICENCE', 'SERVICE');
CREATE TYPE quote_status AS ENUM ('BROUILLON', 'EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'FACTURE');

-- 2. TABLE : commercial_catalogue
CREATE TABLE commercial_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type item_type NOT NULL,
  default_price DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger updated_at
CREATE TRIGGER trg_commercial_catalogue_updated_at
  BEFORE UPDATE ON commercial_catalogue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. TABLE : quotes
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status quote_status DEFAULT 'BROUILLON',
  total_ht DECIMAL(12, 2) DEFAULT 0,
  total_ttc DECIMAL(12, 2) DEFAULT 0,
  valid_until DATE,
  signature_hash TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger updated_at
CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. TABLE : quote_lines
CREATE TABLE quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  catalogue_item_id UUID REFERENCES commercial_catalogue(id) ON DELETE SET NULL,
  designation TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
  line_total DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS
ALTER TABLE commercial_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;

-- Catalogue : Lecture pour tout le monde, Écriture pour COM/ADMIN
CREATE POLICY catalogue_select ON commercial_catalogue FOR SELECT USING (true);
CREATE POLICY catalogue_insert ON commercial_catalogue FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('COM', 'ADMIN'))
);
CREATE POLICY catalogue_update ON commercial_catalogue FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('COM', 'ADMIN'))
);
CREATE POLICY catalogue_delete ON commercial_catalogue FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('COM', 'ADMIN'))
);

-- Quotes : Lecture pour les profils internes + CLIENT (si store_id correspond)
CREATE POLICY quotes_select ON quotes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role != 'CLIENT' AND profiles.is_active = TRUE
  ) OR
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN contacts c ON c.id = p.contact_id
    WHERE p.id = auth.uid() AND p.role = 'CLIENT' AND p.is_active = TRUE
      AND (
        quotes.store_id = c.store_id OR 
        (c.store_id IS NULL AND quotes.store_id IN (SELECT s.id FROM stores s WHERE s.client_id = c.client_id))
      )
  )
);
-- Quotes : Écriture pour COM/ADMIN, plus UPDATE pour CLIENT statuts acceptes/refusés
CREATE POLICY quotes_insert ON quotes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('COM', 'ADMIN'))
);
CREATE POLICY quotes_update ON quotes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('COM', 'ADMIN', 'CLIENT'))
);
CREATE POLICY quotes_delete ON quotes FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('COM', 'ADMIN'))
);

-- Quote Lines : Lecture via quotes, Écriture via quotes
CREATE POLICY quote_lines_select ON quote_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_id)
);
CREATE POLICY quote_lines_insert ON quote_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('COM', 'ADMIN'))
);
CREATE POLICY quote_lines_update ON quote_lines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('COM', 'ADMIN'))
);
CREATE POLICY quote_lines_delete ON quote_lines FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('COM', 'ADMIN'))
);

COMMIT;
