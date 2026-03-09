-- ==========================================
-- SPRINT 33 - RELEASE V1 schema
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE ticket_status AS ENUM (
  'nouveau', 'assigne', 'en_cours', 'attente_client', 'resolu', 'ferme'
);

CREATE TYPE ticket_priority AS ENUM (
  'basse', 'normale', 'haute', 'critique'
);

CREATE TYPE user_role AS ENUM (
  'STANDARD', 'COM', 'SAV1', 'SAV2', 'N1', 'N2', 'N3', 'N4', 'ADMIN'
);

CREATE TYPE ticket_category AS ENUM ('HL', 'COMMERCE', 'SAV', 'FORMATION', 'DEV');
CREATE TYPE sd_type AS ENUM ('BUG', 'EVOLUTION');
CREATE TYPE sd_complexity AS ENUM ('HOTFIX', 'S', 'M', 'L', 'XL', 'MAJEUR');
CREATE TYPE equipment_status AS ENUM ('EN_SERVICE', 'EN_PANNE', 'EN_REPARATION_INTERNE', 'RMA_FOURNISSEUR', 'REBUT');
CREATE TYPE item_type AS ENUM ('MATERIEL', 'LICENCE', 'SERVICE');
CREATE TYPE quote_status AS ENUM ('BROUILLON', 'EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'FACTURE');

-- 2. TABLES
CREATE TABLE public.support_levels (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT        NOT NULL,
    rank        INTEGER     NOT NULL,
    color       TEXT        NOT NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.clients (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company     TEXT        NOT NULL,
    first_name  TEXT        NOT NULL DEFAULT '',
    last_name   TEXT        NOT NULL DEFAULT '',
    email       TEXT,
    phone       TEXT,
    address     TEXT,
    notes       TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stores (
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

CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name  TEXT        NOT NULL DEFAULT '',
    last_name   TEXT        NOT NULL DEFAULT '',
    role        user_role   NOT NULL DEFAULT 'STANDARD',
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    avatar_url  TEXT,
    store_id    UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    support_level_id UUID REFERENCES public.support_levels(id) ON DELETE SET NULL
);

CREATE TABLE public.equipment_catalogue (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category              TEXT          NOT NULL,
    brand                 TEXT          NOT NULL,
    model_name            TEXT          NOT NULL,
    custom_fields_schema  JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE public.equipments (
    id                   UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    catalogue_id         UUID            NOT NULL REFERENCES public.equipment_catalogue(id) ON DELETE RESTRICT,
    store_id             UUID            NOT NULL REFERENCES public.stores(id)              ON DELETE RESTRICT,
    serial_number        TEXT            NOT NULL UNIQUE,
    status               equipment_status NOT NULL DEFAULT 'EN_SERVICE',
    purchase_date        DATE,
    warranty_end_date    DATE,
    rma_tracking_number  TEXT,
    custom_fields_data   JSONB           NOT NULL DEFAULT '{}'::jsonb,
    notes                TEXT,
    created_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE public.software_licenses (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id         UUID        NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    software_name    TEXT        NOT NULL,
    license_key      TEXT        NOT NULL,
    seat_count       INTEGER     NOT NULL DEFAULT 1 CHECK (seat_count > 0),
    activation_date  DATE,
    expiration_date  DATE,
    is_active        BOOLEAN     NOT NULL DEFAULT true,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.commercial_catalogue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type item_type NOT NULL,
    default_price DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    description TEXT,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    billing_cycle TEXT,
    provider_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.contacts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    store_id    UUID        REFERENCES public.stores(id) ON DELETE SET NULL,
    first_name  TEXT        NOT NULL DEFAULT '',
    last_name   TEXT        NOT NULL DEFAULT '',
    email       TEXT,
    phone       TEXT,
    job_title   TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.tickets (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                 TEXT          NOT NULL,
    description           TEXT          NOT NULL DEFAULT '',
    problem_location      TEXT,
    source                TEXT,
    client_id             UUID          REFERENCES public.clients(id)  ON DELETE SET NULL,
    store_id              UUID          REFERENCES public.stores(id)   ON DELETE SET NULL,
    creator_id            UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    assignee_id           UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
    escalation_level      SMALLINT      NOT NULL DEFAULT 1,
    escalated_by_id       UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
    support_level_id      UUID          REFERENCES public.support_levels(id) ON DELETE SET NULL,
    equipment_id          UUID          REFERENCES public.equipments(id) ON DELETE SET NULL,
    status                ticket_status   NOT NULL DEFAULT 'nouveau',
    priority              ticket_priority NOT NULL DEFAULT 'normale',
    category              TEXT,
    sla_start_at          TIMESTAMPTZ,
    sla_paused_at         TIMESTAMPTZ,
    sla_elapsed_minutes   INTEGER       NOT NULL DEFAULT 0,
    sla_deadline_at       TIMESTAMPTZ,
    is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ticket_comments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id   UUID        NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    author_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    content     TEXT        NOT NULL,
    is_internal BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ticket_attachments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id   UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    file_name   TEXT NOT NULL,
    file_url    TEXT NOT NULL,
    file_type   TEXT NOT NULL,
    file_size   BIGINT NOT NULL DEFAULT 0,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ticket_audit_logs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id     UUID        NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    performed_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    action        TEXT        NOT NULL,
    field_name    TEXT,
    old_value     TEXT,
    new_value     TEXT,
    details       JSONB       DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ticket_commerce_details (
    ticket_id UUID PRIMARY KEY REFERENCES public.tickets(id) ON DELETE CASCADE,
    quote_number TEXT,
    invoice_number TEXT,
    service_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ticket_sav_details (
    ticket_id UUID PRIMARY KEY REFERENCES public.tickets(id) ON DELETE CASCADE,
    serial_number TEXT,
    product_reference TEXT,
    hardware_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ticket_formateur_details (
    ticket_id UUID PRIMARY KEY REFERENCES public.tickets(id) ON DELETE CASCADE,
    travel_date TIMESTAMPTZ,
    training_location TEXT,
    training_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ticket_dev_details (
    ticket_id          UUID PRIMARY KEY REFERENCES public.tickets(id) ON DELETE CASCADE,
    type               sd_type       NOT NULL,
    reproduction_steps TEXT,
    impact             TEXT,
    need_description   TEXT,
    expected_process   TEXT,
    complexity         sd_complexity,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ticket_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    execution_order INTEGER NOT NULL,
    conditions JSONB NOT NULL,
    target_support_level_id UUID REFERENCES public.support_levels(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number TEXT UNIQUE NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status quote_status DEFAULT 'BROUILLON',
    total_ht DECIMAL(12, 2) DEFAULT 0,
    total_ttc DECIMAL(12, 2) DEFAULT 0,
    valid_until DATE,
    signature_hash TEXT,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.quote_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    catalogue_item_id UUID REFERENCES public.commercial_catalogue(id) ON DELETE SET NULL,
    designation TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    line_total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('DOC', 'PATCH_NOTE')),
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.support_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.software_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_commerce_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_sav_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_formateur_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_dev_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 4. FUNCTIONS$$ language 'plpgsql';

-- ==========================================
-- RLS UTILITY FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role
  FROM profiles
  WHERE id = auth.uid()
    AND is_active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND is_active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION pick_ticket(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role user_role;
    v_support_level_id UUID;
    v_ticket_id UUID;
    v_active_ticket_id UUID;
BEGIN
    SELECT role, support_level_id INTO v_role, v_support_level_id
    FROM profiles
    WHERE id = p_user_id AND is_active = TRUE;

    IF v_role IS NULL THEN
        RAISE EXCEPTION 'Utilisateur introuvable ou inactif.';
    END IF;

    SELECT id INTO v_active_ticket_id
    FROM tickets
    WHERE assignee_id = p_user_id
      AND status IN ('assigne', 'en_cours', 'attente_client', 'resolu')
    LIMIT 1;

    IF v_active_ticket_id IS NOT NULL THEN
        RETURN NULL; 
    END IF;

    SELECT id INTO v_ticket_id
    FROM tickets
    WHERE status = 'nouveau'
      AND assignee_id IS NULL
      AND is_active = TRUE
      AND (
          CASE
              WHEN v_role = 'COMMERCE' THEN category = 'COMMERCE'
              WHEN v_role = 'SAV1' THEN category = 'SAV'
              WHEN v_role = 'SAV2' THEN category = 'SAV' AND priority IN ('haute', 'critique')
              WHEN v_role = 'FORMATEUR' THEN category = 'FORMATION'
              WHEN v_role = 'DEV' THEN category = 'DEV'
              WHEN v_support_level_id IS NOT NULL THEN support_level_id = v_support_level_id AND category != 'DEV'
              ELSE FALSE 
          END
      )
    ORDER BY
      CASE priority
        WHEN 'critique' THEN 1
        WHEN 'haute'    THEN 2
        WHEN 'normale'  THEN 3
        WHEN 'basse'    THEN 4
        ELSE 5
      END,
      created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF v_ticket_id IS NOT NULL THEN
        UPDATE tickets
        SET assignee_id = p_user_id,
            status = 'assigne',
            updated_at = NOW()
        WHERE id = v_ticket_id;
        
        RETURN v_ticket_id;
    ELSE
        RETURN NULL;
    END IF;
END;
$$;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- 1. PROFILES
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (public.is_active_user() AND id = auth.uid())
  WITH CHECK (role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (TRUE);

-- 2. CLIENTS
CREATE POLICY "clients_select" ON public.clients
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT WITH CHECK (public.is_active_user());

CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE USING (public.get_my_role() IN ('COM', 'N4', 'ADMIN'))
  WITH CHECK (public.get_my_role() IN ('COM', 'N4', 'ADMIN'));

-- 3. STORES
CREATE POLICY "stores_select" ON public.stores
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "stores_insert" ON public.stores
  FOR INSERT WITH CHECK (public.is_active_user());

CREATE POLICY "stores_update" ON public.stores
  FOR UPDATE USING (public.get_my_role() IN ('COM', 'N4', 'ADMIN'))
  WITH CHECK (public.get_my_role() IN ('COM', 'N4', 'ADMIN'));

-- 4. CONTACTS (FIXED: relaxed for all active users)
CREATE POLICY "contacts_select" ON public.contacts
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT WITH CHECK (public.is_active_user());

CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE USING (public.is_active_user());

-- 5. TICKETS
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT WITH CHECK (public.is_active_user() AND creator_id = auth.uid());

CREATE POLICY "tickets_update_admin_n4" ON public.tickets
  FOR UPDATE USING (public.get_my_role() IN ('ADMIN', 'N4'))
  WITH CHECK (TRUE);

CREATE POLICY "tickets_update_creator" ON public.tickets
  FOR UPDATE USING (public.is_active_user() AND creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "tickets_update_assignee" ON public.tickets
  FOR UPDATE USING (public.is_active_user() AND assignee_id = auth.uid())
  WITH CHECK (TRUE);

CREATE POLICY "tickets_update_pick" ON public.tickets
  FOR UPDATE USING (public.is_active_user() AND assignee_id IS NULL AND is_active = TRUE)
  WITH CHECK (assignee_id = auth.uid());

