-- Refonte de la hiérarchie client
-- ENSEIGNE (clients) -> CENTRALE -> MINI-CENTRALE -> MAGASIN (stores)

-- 1. Création des tables intermédiaires
CREATE TABLE public.centrales (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    address     TEXT,
    city        TEXT,
    postal_code TEXT,
    phone       TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.mini_centrales (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    centrale_id UUID        NOT NULL REFERENCES public.centrales(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    address     TEXT,
    city        TEXT,
    postal_code TEXT,
    phone       TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Mise à jour de la table stores (MAGASINS)
ALTER TABLE public.stores 
ADD COLUMN centrale_id UUID REFERENCES public.centrales(id) ON DELETE SET NULL,
ADD COLUMN mini_centrale_id UUID REFERENCES public.mini_centrales(id) ON DELETE SET NULL;

-- 3. Mise à jour de la table contacts
ALTER TABLE public.contacts
ADD COLUMN centrale_id UUID REFERENCES public.centrales(id) ON DELETE SET NULL,
ADD COLUMN mini_centrale_id UUID REFERENCES public.mini_centrales(id) ON DELETE SET NULL;

-- 4. Mise à jour de la table tickets
ALTER TABLE public.tickets
ADD COLUMN centrale_id UUID REFERENCES public.centrales(id) ON DELETE SET NULL,
ADD COLUMN mini_centrale_id UUID REFERENCES public.mini_centrales(id) ON DELETE SET NULL;

-- 5. Triggers pour updated_at
CREATE TRIGGER trg_centrales_updated_at
  BEFORE UPDATE ON public.centrales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_mini_centrales_updated_at
  BEFORE UPDATE ON public.mini_centrales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Activation RLS
ALTER TABLE public.centrales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_centrales ENABLE ROW LEVEL SECURITY;

-- 7. Politiques RLS (Basées sur le modèle existant)
CREATE POLICY "centrales_select" ON public.centrales
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "centrales_manage" ON public.centrales
  FOR ALL USING (public.get_my_role() IN ('COM', 'N4', 'ADMIN'))
  WITH CHECK (public.get_my_role() IN ('COM', 'N4', 'ADMIN'));

CREATE POLICY "mini_centrales_select" ON public.mini_centrales
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "mini_centrales_manage" ON public.mini_centrales
  FOR ALL USING (public.get_my_role() IN ('COM', 'N4', 'ADMIN'))
  WITH CHECK (public.get_my_role() IN ('COM', 'N4', 'ADMIN'));

-- 8. Migration des données existantes (Création d'une centrale par client par défaut)
DO $$
DECLARE
    r RECORD;
    v_centrale_id UUID;
BEGIN
    FOR r IN SELECT id, company FROM public.clients LOOP
        -- Créer une centrale par défaut pour chaque client existant
        INSERT INTO public.centrales (client_id, name)
        VALUES (r.id, 'Centrale ' || r.company)
        RETURNING id INTO v_centrale_id;

        -- Lier tous les magasins existants à cette nouvelle centrale
        UPDATE public.stores
        SET centrale_id = v_centrale_id
        WHERE client_id = r.id;

        -- Lier les tickets ouverts
        UPDATE public.tickets
        SET centrale_id = v_centrale_id
        WHERE client_id = r.id;

        -- Lier les contacts
        UPDATE public.contacts
        SET centrale_id = v_centrale_id
        WHERE client_id = r.id;
    END LOOP;
END $$;

-- 9. Index de performance
CREATE INDEX IF NOT EXISTS idx_centrales_client_id ON public.centrales(client_id);
CREATE INDEX IF NOT EXISTS idx_mini_centrales_centrale_id ON public.mini_centrales(centrale_id);
CREATE INDEX IF NOT EXISTS idx_stores_centrale_id ON public.stores(centrale_id);
CREATE INDEX IF NOT EXISTS idx_stores_mini_centrale_id ON public.stores(mini_centrale_id);
CREATE INDEX IF NOT EXISTS idx_tickets_centrale_id ON public.tickets(centrale_id);
CREATE INDEX IF NOT EXISTS idx_tickets_mini_centrale_id ON public.tickets(mini_centrale_id);
CREATE INDEX IF NOT EXISTS idx_contacts_centrale_id ON public.contacts(centrale_id);
CREATE INDEX IF NOT EXISTS idx_contacts_mini_centrale_id ON public.contacts(mini_centrale_id);

