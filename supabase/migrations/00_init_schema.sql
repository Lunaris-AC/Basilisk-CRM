-- ==========================================
-- SPRINT 45 - CONSOLIDATED SCHEMA
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wiki-images',
  'wiki-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket_attachments',
  'ticket_attachments',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf','text/plain','application/zip','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('public_documents', 'public_documents', true)
ON CONFLICT (id) DO NOTHING;

-- 1. ENUMS
CREATE TYPE ticket_status AS ENUM (
  'nouveau', 'assigne', 'en_cours', 'attente_client', 'suspendu', 'resolu', 'ferme'
);

CREATE TYPE ticket_priority AS ENUM (
  'basse', 'normale', 'haute', 'critique'
);

CREATE TYPE user_role AS ENUM (
  'CLIENT', 'STANDARD', 'COM', 'SAV1', 'SAV2', 'FORMATEUR', 'DEV', 'N1', 'N2', 'N3', 'N4', 'ADMIN'
);

CREATE TYPE ticket_category AS ENUM ('HL', 'COMMERCE', 'SAV', 'FORMATION', 'DEV');
CREATE TYPE sd_type AS ENUM ('BUG', 'EVOLUTION');
CREATE TYPE sd_complexity AS ENUM ('HOTFIX', 'S', 'M', 'L', 'XL', 'MAJEUR');
CREATE TYPE equipment_status AS ENUM ('EN_SERVICE', 'EN_PANNE', 'EN_REPARATION_INTERNE', 'RMA_FOURNISSEUR', 'COMMANDÉ_FOURNISSEUR', 'REBUT');
CREATE TYPE item_type AS ENUM ('MATERIEL', 'LICENCE', 'SERVICE');
CREATE TYPE quote_status AS ENUM ('BROUILLON', 'EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'FACTURE');
CREATE TYPE wiki_document_status AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED');

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
    support_level_id UUID REFERENCES public.support_levels(id) ON DELETE SET NULL,
    contact_id  UUID REFERENCES public.contacts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_contact_id ON public.profiles(contact_id);

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
    equipment_model_id UUID REFERENCES public.equipment_catalogue(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commercial_catalogue_equipment_model_id
  ON public.commercial_catalogue(equipment_model_id)
  WHERE equipment_model_id IS NOT NULL;

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
    contact_id            UUID          REFERENCES public.contacts(id) ON DELETE SET NULL,
    linked_sd_id          UUID          REFERENCES public.tickets(id) ON DELETE SET NULL,
    status                ticket_status   NOT NULL DEFAULT 'nouveau',
    priority              ticket_priority NOT NULL DEFAULT 'normale',
    category              ticket_category,
    resume_at             TIMESTAMPTZ,
    sla_start_at          TIMESTAMPTZ,
    sla_paused_at         TIMESTAMPTZ,
    sla_elapsed_minutes   INTEGER       NOT NULL DEFAULT 0,
    sla_deadline_at       TIMESTAMPTZ,
    is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_contact_id ON public.tickets(contact_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON public.tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_linked_sd_id ON public.tickets(linked_sd_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON public.tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_creator ON public.tickets(creator_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client ON public.tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_store ON public.tickets(store_id);
CREATE INDEX IF NOT EXISTS idx_tickets_escalation ON public.tickets(escalation_level);
CREATE INDEX IF NOT EXISTS idx_tickets_pick ON public.tickets(escalation_level, status) WHERE assignee_id IS NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tickets_equipment_id ON public.tickets(equipment_id) WHERE equipment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_support_level_id ON public.tickets(support_level_id);

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

CREATE TABLE public.wiki_documents (
    id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id        UUID            REFERENCES public.wiki_documents(id) ON DELETE SET NULL,
    base_document_id UUID            REFERENCES public.wiki_documents(id) ON DELETE SET NULL,
    title            TEXT            NOT NULL DEFAULT 'Sans titre',
    icon             TEXT            DEFAULT '📄',
    content          JSONB           DEFAULT '[]'::jsonb,
    status           wiki_document_status NOT NULL DEFAULT 'DRAFT',
    author_id        UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rejection_reason TEXT,
    position         INTEGER         NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wiki_documents_parent ON public.wiki_documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_wiki_documents_status ON public.wiki_documents(status);
CREATE INDEX IF NOT EXISTS idx_wiki_documents_author ON public.wiki_documents(author_id);
CREATE INDEX IF NOT EXISTS idx_wiki_documents_base   ON public.wiki_documents(base_document_id);

CREATE TABLE public.wiki_revisions (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID         NOT NULL REFERENCES public.wiki_documents(id) ON DELETE CASCADE,
    title         TEXT         NOT NULL,
    content       JSONB        NOT NULL DEFAULT '[]'::jsonb,
    author_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wiki_revisions_document ON public.wiki_revisions(document_id, created_at DESC);

-- Indexes additionnels
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_stores_client_id ON public.stores(client_id);
CREATE INDEX IF NOT EXISTS idx_profiles_store_id ON public.profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_profiles_support_level_id ON public.profiles(support_level_id);
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON public.contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_store_id ON public.contacts(store_id);
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON public.ticket_comments(ticket_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_audit_ticket_id ON public.ticket_audit_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON public.ticket_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.ticket_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalogue_category ON public.equipment_catalogue(category);
CREATE INDEX IF NOT EXISTS idx_catalogue_brand ON public.equipment_catalogue(brand);
CREATE INDEX IF NOT EXISTS idx_equipments_store_id ON public.equipments(store_id);
CREATE INDEX IF NOT EXISTS idx_equipments_catalogue_id ON public.equipments(catalogue_id);
CREATE INDEX IF NOT EXISTS idx_equipments_status ON public.equipments(status);
CREATE INDEX IF NOT EXISTS idx_equipments_serial ON public.equipments(serial_number);
CREATE INDEX IF NOT EXISTS idx_licenses_store_id ON public.software_licenses(store_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiration_date ON public.software_licenses(expiration_date);
CREATE INDEX IF NOT EXISTS idx_licenses_is_active ON public.software_licenses(is_active);

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
ALTER TABLE public.wiki_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_revisions ENABLE ROW LEVEL SECURITY;

-- Force RLS même pour les propriétaires des tables
ALTER TABLE public.profiles           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clients            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.stores             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tickets            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_audit_logs  FORCE ROW LEVEL SECURITY;

-- 4. FUNCTIONS

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

-- Triggers updated_at pour toutes les tables avec updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ticket_comments_updated_at
  BEFORE UPDATE ON public.ticket_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_equipment_catalogue_updated_at
  BEFORE UPDATE ON public.equipment_catalogue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_equipments_updated_at
  BEFORE UPDATE ON public.equipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_software_licenses_updated_at
  BEFORE UPDATE ON public.software_licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_support_levels_updated_at
  BEFORE UPDATE ON public.support_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_commercial_catalogue_updated_at
  BEFORE UPDATE ON public.commercial_catalogue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ticket_routing_rules_updated_at
  BEFORE UPDATE ON public.ticket_routing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers updated_at pour les tables de détails
CREATE TRIGGER update_ticket_commerce_details_updated_at
  BEFORE UPDATE ON public.ticket_commerce_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_sav_details_updated_at
  BEFORE UPDATE ON public.ticket_sav_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_formateur_details_updated_at
  BEFORE UPDATE ON public.ticket_formateur_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_dev_details_updated_at
  BEFORE UPDATE ON public.ticket_dev_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Wiki : updated_at trigger
CREATE OR REPLACE FUNCTION public.wiki_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wiki_documents_updated_at
  BEFORE UPDATE ON public.wiki_documents
  FOR EACH ROW EXECUTE FUNCTION public.wiki_documents_updated_at();

-- Wiki : snapshot + purge à la publication
CREATE OR REPLACE FUNCTION public.wiki_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'PUBLISHED' AND (OLD.status IS NULL OR OLD.status <> 'PUBLISHED') THEN
    INSERT INTO public.wiki_revisions (document_id, title, content, author_id)
    VALUES (NEW.id, NEW.title, NEW.content, NEW.author_id);

    DELETE FROM public.wiki_revisions
    WHERE document_id = NEW.id
      AND id NOT IN (
        SELECT id FROM public.wiki_revisions
        WHERE document_id = NEW.id
        ORDER BY created_at DESC
        LIMIT 10
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_wiki_on_publish
  AFTER UPDATE ON public.wiki_documents
  FOR EACH ROW EXECUTE FUNCTION public.wiki_on_publish();

-- ==========================================
-- AUDIT TRAIL : Trigger automatique sur tickets
-- ==========================================
CREATE OR REPLACE FUNCTION fn_ticket_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
    VALUES (NEW.id, NEW.creator_id, 'INSERT', NULL, NULL, 'Ticket créé');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    DECLARE
      v_user_id UUID;
    BEGIN
      BEGIN
        v_user_id := current_setting('app.current_user_id', TRUE)::UUID;
      EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
      END;

      IF OLD.title IS DISTINCT FROM NEW.title THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'title', OLD.title, NEW.title);
      END IF;

      IF OLD.description IS DISTINCT FROM NEW.description THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'description', OLD.description, NEW.description);
      END IF;

      IF OLD.problem_location IS DISTINCT FROM NEW.problem_location THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'problem_location', OLD.problem_location, NEW.problem_location);
      END IF;

      IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'client_id', OLD.client_id::TEXT, NEW.client_id::TEXT);
      END IF;

      IF OLD.store_id IS DISTINCT FROM NEW.store_id THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'store_id', OLD.store_id::TEXT, NEW.store_id::TEXT);
      END IF;

      IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'assignee_id', OLD.assignee_id::TEXT, NEW.assignee_id::TEXT);
      END IF;

      IF OLD.escalation_level IS DISTINCT FROM NEW.escalation_level THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'escalation_level', OLD.escalation_level::TEXT, NEW.escalation_level::TEXT);
      END IF;

      IF OLD.escalated_by_id IS DISTINCT FROM NEW.escalated_by_id THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'escalated_by_id', OLD.escalated_by_id::TEXT, NEW.escalated_by_id::TEXT);
      END IF;

      IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'status', OLD.status::TEXT, NEW.status::TEXT);
      END IF;

      IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'priority', OLD.priority::TEXT, NEW.priority::TEXT);
      END IF;

      IF OLD.sla_start_at IS DISTINCT FROM NEW.sla_start_at THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'sla_start_at', OLD.sla_start_at::TEXT, NEW.sla_start_at::TEXT);
      END IF;

      IF OLD.sla_paused_at IS DISTINCT FROM NEW.sla_paused_at THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'sla_paused_at', OLD.sla_paused_at::TEXT, NEW.sla_paused_at::TEXT);
      END IF;

      IF OLD.sla_elapsed_minutes IS DISTINCT FROM NEW.sla_elapsed_minutes THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'sla_elapsed_minutes', OLD.sla_elapsed_minutes::TEXT, NEW.sla_elapsed_minutes::TEXT);
      END IF;

      IF OLD.sla_deadline_at IS DISTINCT FROM NEW.sla_deadline_at THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'sla_deadline_at', OLD.sla_deadline_at::TEXT, NEW.sla_deadline_at::TEXT);
      END IF;

      IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'is_active', OLD.is_active::TEXT, NEW.is_active::TEXT);
      END IF;
    END;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_tickets_audit_log
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION fn_ticket_audit_log();

-- ==========================================
-- Création automatique du profil à l'inscription
-- ==========================================
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'STANDARD'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION fn_handle_new_user();

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
              WHEN v_role = 'COM' THEN category = 'COMMERCE'
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

-- CLIENT peut voir ses propres tickets (créés par lui ou liés à son magasin)
CREATE POLICY "tickets_select_client" ON public.tickets
  FOR SELECT USING (
    get_my_role() = 'CLIENT'
    AND (
      creator_id = auth.uid()
      OR store_id IN (
        SELECT s.id FROM stores s
        JOIN profiles p ON p.store_id = s.id
        WHERE p.id = auth.uid()
      )
    )
  );

-- 6. SUPPORT LEVELS
CREATE POLICY "support_levels_select" ON public.support_levels
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "support_levels_manage" ON public.support_levels
  FOR ALL USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

-- 7. EQUIPMENT CATALOGUE
CREATE POLICY "equipment_catalogue_select" ON public.equipment_catalogue
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "equipment_catalogue_manage" ON public.equipment_catalogue
  FOR ALL USING (public.get_my_role() IN ('ADMIN', 'SAV1', 'SAV2'))
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'SAV1', 'SAV2'));

-- 8. EQUIPMENTS
CREATE POLICY "equipments_select" ON public.equipments
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "equipments_manage" ON public.equipments
  FOR ALL USING (public.get_my_role() IN ('ADMIN', 'SAV1', 'SAV2', 'COM'))
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'SAV1', 'SAV2', 'COM'));

-- 9. SOFTWARE LICENSES
CREATE POLICY "software_licenses_select" ON public.software_licenses
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "software_licenses_manage" ON public.software_licenses
  FOR ALL USING (public.get_my_role() IN ('ADMIN', 'SAV1', 'SAV2', 'COM'))
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'SAV1', 'SAV2', 'COM'));

-- 10. COMMERCIAL CATALOGUE
CREATE POLICY "commercial_catalogue_select" ON public.commercial_catalogue
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "commercial_catalogue_manage" ON public.commercial_catalogue
  FOR ALL USING (public.get_my_role() IN ('ADMIN', 'COM'))
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'COM'));

-- 11. TICKET COMMENTS
CREATE POLICY "ticket_comments_select" ON public.ticket_comments
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "ticket_comments_insert" ON public.ticket_comments
  FOR INSERT WITH CHECK (public.is_active_user() AND author_id = auth.uid());

CREATE POLICY "ticket_comments_update" ON public.ticket_comments
  FOR UPDATE USING (public.is_active_user() AND author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- 12. TICKET ATTACHMENTS
CREATE POLICY "ticket_attachments_select" ON public.ticket_attachments
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "ticket_attachments_insert" ON public.ticket_attachments
  FOR INSERT WITH CHECK (public.is_active_user());

-- 13. TICKET AUDIT LOGS
CREATE POLICY "ticket_audit_logs_select" ON public.ticket_audit_logs
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "ticket_audit_logs_insert" ON public.ticket_audit_logs
  FOR INSERT WITH CHECK (public.is_active_user());

-- 14. TICKET DETAIL TABLES
CREATE POLICY "ticket_commerce_details_select" ON public.ticket_commerce_details
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "ticket_commerce_details_manage" ON public.ticket_commerce_details
  FOR ALL USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

CREATE POLICY "ticket_sav_details_select" ON public.ticket_sav_details
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "ticket_sav_details_manage" ON public.ticket_sav_details
  FOR ALL USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

CREATE POLICY "ticket_formateur_details_select" ON public.ticket_formateur_details
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "ticket_formateur_details_manage" ON public.ticket_formateur_details
  FOR ALL USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

CREATE POLICY "ticket_dev_details_select" ON public.ticket_dev_details
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "ticket_dev_details_manage" ON public.ticket_dev_details
  FOR ALL USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

-- 15. TICKET ROUTING RULES
CREATE POLICY "ticket_routing_rules_select" ON public.ticket_routing_rules
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "ticket_routing_rules_manage" ON public.ticket_routing_rules
  FOR ALL USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

-- 16. QUOTES
CREATE POLICY "quotes_select" ON public.quotes
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "quotes_manage" ON public.quotes
  FOR ALL USING (public.get_my_role() IN ('ADMIN', 'COM'))
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'COM'));

-- 17. QUOTE LINES
CREATE POLICY "quote_lines_select" ON public.quote_lines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "quote_lines_manage" ON public.quote_lines
  FOR ALL USING (public.get_my_role() IN ('ADMIN', 'COM'))
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'COM'));

-- 18. DOCUMENTS
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (public.is_active_user());

CREATE POLICY "documents_manage" ON public.documents
  FOR ALL USING (public.get_my_role() IN ('ADMIN', 'DEV'))
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'DEV'));

CREATE POLICY "documents_select_client" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'CLIENT'
        AND profiles.is_active = TRUE
    )
  );

-- ==========================================
-- STORAGE POLICIES : public_documents
-- ==========================================
CREATE POLICY "public_documents_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'public_documents');

CREATE POLICY "public_documents_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'public_documents'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DEV'))
  );

CREATE POLICY "public_documents_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'public_documents'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DEV'))
  );

-- ==========================================
-- TICKET ATTACHMENTS : STORAGE POLICIES
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'ticket_attachments_select'
  ) THEN
    CREATE POLICY "ticket_attachments_select"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'ticket_attachments');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'ticket_attachments_insert'
  ) THEN
    CREATE POLICY "ticket_attachments_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'ticket_attachments');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'ticket_attachments_manage'
  ) THEN
    CREATE POLICY "ticket_attachments_manage"
      ON storage.objects FOR ALL
      TO authenticated
      USING (bucket_id = 'ticket_attachments' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.get_my_role() = 'ADMIN'))
      WITH CHECK (bucket_id = 'ticket_attachments');
  END IF;
END $$;

-- ==========================================
-- WIKI : STORAGE POLICIES
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'wiki_images_insert'
  ) THEN
    CREATE POLICY "wiki_images_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'wiki-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'wiki_images_select'
  ) THEN
    CREATE POLICY "wiki_images_select"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'wiki-images');
  END IF;
END $$;

-- ==========================================
-- WIKI : RLS POLICIES
-- ==========================================

-- wiki_documents : SELECT
CREATE POLICY "wiki_docs_select_draft"
  ON public.wiki_documents FOR SELECT
  TO authenticated
  USING (status = 'DRAFT' AND author_id = auth.uid());

CREATE POLICY "wiki_docs_select_pending"
  ON public.wiki_documents FOR SELECT
  TO authenticated
  USING (
    status = 'PENDING'
    AND (author_id = auth.uid() OR get_my_role() IN ('N3', 'N4', 'ADMIN'))
  );

CREATE POLICY "wiki_docs_select_published"
  ON public.wiki_documents FOR SELECT
  TO authenticated
  USING (status = 'PUBLISHED' AND get_my_role() <> 'CLIENT');

-- wiki_documents : INSERT
CREATE POLICY "wiki_docs_insert"
  ON public.wiki_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() <> 'CLIENT'
    AND author_id = auth.uid()
    AND status = 'DRAFT'
  );

-- wiki_documents : UPDATE
CREATE POLICY "wiki_docs_update_draft"
  ON public.wiki_documents FOR UPDATE
  TO authenticated
  USING (status = 'DRAFT' AND author_id = auth.uid())
  WITH CHECK (true);

CREATE POLICY "wiki_docs_update_pending"
  ON public.wiki_documents FOR UPDATE
  TO authenticated
  USING (status = 'PENDING' AND get_my_role() IN ('N3', 'N4', 'ADMIN'))
  WITH CHECK (true);

CREATE POLICY "wiki_docs_update_published"
  ON public.wiki_documents FOR UPDATE
  TO authenticated
  USING (status = 'PUBLISHED' AND get_my_role() IN ('N3', 'N4', 'ADMIN'))
  WITH CHECK (true);

-- wiki_documents : DELETE
CREATE POLICY "wiki_docs_delete_draft"
  ON public.wiki_documents FOR DELETE
  TO authenticated
  USING (status = 'DRAFT' AND author_id = auth.uid());

CREATE POLICY "wiki_docs_delete_pending"
  ON public.wiki_documents FOR DELETE
  TO authenticated
  USING (status = 'PENDING' AND get_my_role() IN ('N3', 'N4', 'ADMIN'));

CREATE POLICY "wiki_docs_delete_published"
  ON public.wiki_documents FOR DELETE
  TO authenticated
  USING (status = 'PUBLISHED' AND get_my_role() IN ('N3', 'N4', 'ADMIN'));

-- wiki_revisions : SELECT / INSERT
CREATE POLICY "wiki_revisions_select"
  ON public.wiki_revisions FOR SELECT
  TO authenticated
  USING (get_my_role() <> 'CLIENT');

CREATE POLICY "wiki_revisions_insert"
  ON public.wiki_revisions FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() NOT IN ('CLIENT'));

-- ==========================================
-- REALTIME : PRESENCE & BROADCAST (HOTFIX 43.1)
-- ==========================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated presence and broadcast"
  ON realtime.messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- REALTIME : PUBLICATION (pour les mises à jour en temps réel)
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;
