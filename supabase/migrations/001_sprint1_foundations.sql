-- ============================================================================
-- SPRINT 1 — FONDATIONS DE LA BASE DE DONNÉES
-- SaaS Ticketing / Support Interne
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- UUID v4 (activée par défaut sur Supabase, on s'assure qu'elle est là)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TYPES ENUM
-- ============================================================================

-- Statuts du cycle de vie d'un ticket
CREATE TYPE ticket_status AS ENUM (
  'nouveau',        -- Ticket vient d'être créé, pas encore pris en charge
  'assigne',        -- Ticket assigné à un technicien
  'en_cours',       -- Technicien travaille activement dessus
  'attente_client', -- En attente d'une réponse du client (SLA figé)
  'resolu',         -- Résolution proposée, en attente de confirmation
  'ferme'           -- Ticket clôturé définitivement
);

-- Niveaux de priorité
CREATE TYPE ticket_priority AS ENUM (
  'basse',
  'normale',
  'haute',
  'critique'
);

-- Rôles utilisateurs du système
CREATE TYPE user_role AS ENUM (
  'STANDARD',  -- Utilisateur basique (création de tickets uniquement)
  'COM',       -- Commercial
  'SAV1',      -- Service Après-Vente niveau 1
  'SAV2',      -- Service Après-Vente niveau 2
  'N1',        -- Technicien niveau 1
  'N2',        -- Technicien niveau 2
  'N3',        -- Technicien niveau 3
  'N4',        -- Expert / Ingénieur niveau 4
  'ADMIN'      -- Administrateur — accès total
);


-- ============================================================================
-- 3. FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction générique pour mettre à jour automatiquement `updated_at`
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 4. TABLE : profiles
-- Liée 1:1 à auth.users via l'id Supabase Auth
-- ============================================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  TEXT        NOT NULL DEFAULT '',
  last_name   TEXT        NOT NULL DEFAULT '',
  role        user_role   NOT NULL DEFAULT 'STANDARD',
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,   -- Soft delete : false = désactivé
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  profiles             IS 'Profils utilisateurs étendus, liés 1:1 à auth.users.';
COMMENT ON COLUMN profiles.is_active   IS 'Soft delete — false signifie que le compte est désactivé.';
COMMENT ON COLUMN profiles.role        IS 'Rôle fonctionnel de l''utilisateur dans le système.';

-- Trigger updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 5. TABLE : clients
-- Informations des clients finaux
-- ============================================================================

CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company     TEXT        NOT NULL,                -- Raison sociale
  first_name  TEXT        NOT NULL DEFAULT '',
  last_name   TEXT        NOT NULL DEFAULT '',
  email       TEXT,                                 -- E-mail de contact principal
  phone       TEXT,                                 -- Téléphone
  address     TEXT,                                 -- Adresse postale
  notes       TEXT,                                 -- Notes internes libres
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,   -- Soft delete
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  clients           IS 'Clients finaux du système de ticketing.';
COMMENT ON COLUMN clients.company   IS 'Raison sociale / nom de l''entreprise.';
COMMENT ON COLUMN clients.is_active IS 'Soft delete — false = client supprimé logiquement.';

-- Index pour recherche rapide par email
CREATE INDEX idx_clients_email ON clients (email);

-- Trigger updated_at
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 6. TABLE : stores
-- Magasins / points de vente rattachés à un client
-- ============================================================================

CREATE TABLE stores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,                -- Nom du magasin
  address     TEXT,                                 -- Adresse complète
  city        TEXT,                                 -- Ville
  postal_code TEXT,                                 -- Code postal
  phone       TEXT,                                 -- Téléphone du magasin
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,   -- Soft delete
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  stores           IS 'Magasins / points de vente rattachés à un client.';
COMMENT ON COLUMN stores.client_id IS 'Référence vers le client propriétaire du magasin.';

-- Index pour lister les magasins d'un client rapidement
CREATE INDEX idx_stores_client_id ON stores (client_id);

-- Trigger updated_at
CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 7. TABLE : tickets
-- Table centrale du système de ticketing
-- ============================================================================

CREATE TABLE tickets (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Contenu
  title                 TEXT          NOT NULL,
  description           TEXT          NOT NULL DEFAULT '',
  problem_location      TEXT,                        -- Localisation du problème (zone, rayon, etc.)

  -- Références
  client_id             UUID          REFERENCES clients(id)  ON DELETE SET NULL,
  store_id              UUID          REFERENCES stores(id)   ON DELETE SET NULL,
  creator_id            UUID          NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assignee_id           UUID          REFERENCES profiles(id) ON DELETE SET NULL,

  -- Escalade
  escalation_level      SMALLINT      NOT NULL DEFAULT 1,      -- Niveau actuel : 1, 2, 3 ou 4
  escalated_by_id       UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  -- Qui a escaladé en dernier (pour la désescalade : retour obligatoire à cette personne)

  -- Classification
  status                ticket_status   NOT NULL DEFAULT 'nouveau',
  priority              ticket_priority NOT NULL DEFAULT 'normale',

  -- SLA / Chronomètre
  -- On stocke les bornes et le cumul pour calculer le temps passé en heures ouvrées
  sla_start_at          TIMESTAMPTZ,                 -- Début du chrono SLA (première prise en charge)
  sla_paused_at         TIMESTAMPTZ,                 -- Timestamp de mise en pause (attente client)
  sla_elapsed_minutes   INTEGER       NOT NULL DEFAULT 0,
  -- Minutes ouvrées cumulées avant la dernière pause
  sla_deadline_at       TIMESTAMPTZ,                 -- Échéance SLA calculée

  -- Soft delete
  is_active             BOOLEAN       NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  tickets                     IS 'Table centrale de gestion des tickets de support.';
COMMENT ON COLUMN tickets.problem_location    IS 'Localisation physique ou fonctionnelle du problème.';
COMMENT ON COLUMN tickets.escalation_level    IS 'Niveau d''escalade actuel (1=N1, 2=N2, 3=N3, 4=N4).';
COMMENT ON COLUMN tickets.escalated_by_id     IS 'Dernier technicien ayant escaladé — sert pour la désescalade.';
COMMENT ON COLUMN tickets.sla_start_at        IS 'Début effectif du chronomètre SLA.';
COMMENT ON COLUMN tickets.sla_paused_at       IS 'Timestamp de la dernière mise en pause SLA (attente client).';
COMMENT ON COLUMN tickets.sla_elapsed_minutes IS 'Cumul des minutes ouvrées écoulées avant la dernière pause.';
COMMENT ON COLUMN tickets.sla_deadline_at     IS 'Échéance SLA (date/heure limite de résolution).';

-- Index pour les requêtes les plus fréquentes
CREATE INDEX idx_tickets_status       ON tickets (status);
CREATE INDEX idx_tickets_priority     ON tickets (priority);
CREATE INDEX idx_tickets_assignee     ON tickets (assignee_id);
CREATE INDEX idx_tickets_creator      ON tickets (creator_id);
CREATE INDEX idx_tickets_client       ON tickets (client_id);
CREATE INDEX idx_tickets_store        ON tickets (store_id);
CREATE INDEX idx_tickets_escalation   ON tickets (escalation_level);

-- Index composite pour le bouton "piocher" : tickets non assignés d'un niveau donné
CREATE INDEX idx_tickets_pick
  ON tickets (escalation_level, status)
  WHERE assignee_id IS NULL AND is_active = TRUE;

-- Trigger updated_at
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 8. TABLE : ticket_audit_logs
-- Traçabilité absolue : chaque modification est enregistrée
-- ============================================================================

CREATE TABLE ticket_audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id     UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  performed_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  -- L'utilisateur ayant effectué l'action (NULL = système / trigger)
  action        TEXT        NOT NULL,   -- 'INSERT' ou 'UPDATE'
  field_name    TEXT,                    -- Nom du champ modifié (NULL pour INSERT)
  old_value     TEXT,                    -- Ancienne valeur (NULL pour INSERT)
  new_value     TEXT,                    -- Nouvelle valeur
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  ticket_audit_logs              IS 'Journal d''audit complet de chaque modification sur les tickets.';
COMMENT ON COLUMN ticket_audit_logs.performed_by IS 'Utilisateur ayant déclenché le changement (NULL = action système).';
COMMENT ON COLUMN ticket_audit_logs.action       IS 'Type d''opération : INSERT ou UPDATE.';
COMMENT ON COLUMN ticket_audit_logs.field_name   IS 'Colonne modifiée (NULL si INSERT global).';
COMMENT ON COLUMN ticket_audit_logs.old_value    IS 'Valeur avant modification (NULL si INSERT).';
COMMENT ON COLUMN ticket_audit_logs.new_value    IS 'Valeur après modification.';

-- Index pour retrouver rapidement l'historique d'un ticket
CREATE INDEX idx_audit_ticket_id ON ticket_audit_logs (ticket_id);
CREATE INDEX idx_audit_performed_by ON ticket_audit_logs (performed_by);
CREATE INDEX idx_audit_created_at ON ticket_audit_logs (created_at DESC);


-- ============================================================================
-- 9. TRIGGER : Audit Trail automatique sur la table tickets
-- ============================================================================

-- Fonction de trigger qui logue chaque INSERT et chaque changement de colonne
CREATE OR REPLACE FUNCTION fn_ticket_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  -- -------------------------------------------------------
  -- CAS 1 : INSERT → on logue la création du ticket
  -- -------------------------------------------------------
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
    VALUES (
      NEW.id,
      NEW.creator_id,     -- Le créateur est l'auteur de l'INSERT
      'INSERT',
      NULL,
      NULL,
      'Ticket créé'
    );
    RETURN NEW;
  END IF;

  -- -------------------------------------------------------
  -- CAS 2 : UPDATE → on compare champ par champ
  -- On utilise current_setting pour récupérer l'ID de l'utilisateur
  -- positionné par l'application via SET LOCAL app.current_user_id = '...'
  -- Si non défini, on tombe sur NULL (action système).
  -- -------------------------------------------------------
  IF TG_OP = 'UPDATE' THEN
    DECLARE
      v_user_id UUID;
    BEGIN
      -- Tenter de récupérer l'ID utilisateur depuis la session applicative
      BEGIN
        v_user_id := current_setting('app.current_user_id', TRUE)::UUID;
      EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
      END;

      -- Titre
      IF OLD.title IS DISTINCT FROM NEW.title THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'title', OLD.title, NEW.title);
      END IF;

      -- Description
      IF OLD.description IS DISTINCT FROM NEW.description THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'description', OLD.description, NEW.description);
      END IF;

      -- Localisation du problème
      IF OLD.problem_location IS DISTINCT FROM NEW.problem_location THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'problem_location', OLD.problem_location, NEW.problem_location);
      END IF;

      -- Client
      IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'client_id', OLD.client_id::TEXT, NEW.client_id::TEXT);
      END IF;

      -- Magasin
      IF OLD.store_id IS DISTINCT FROM NEW.store_id THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'store_id', OLD.store_id::TEXT, NEW.store_id::TEXT);
      END IF;

      -- Assigné
      IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'assignee_id', OLD.assignee_id::TEXT, NEW.assignee_id::TEXT);
      END IF;

      -- Niveau d'escalade
      IF OLD.escalation_level IS DISTINCT FROM NEW.escalation_level THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'escalation_level', OLD.escalation_level::TEXT, NEW.escalation_level::TEXT);
      END IF;

      -- Escaladé par
      IF OLD.escalated_by_id IS DISTINCT FROM NEW.escalated_by_id THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'escalated_by_id', OLD.escalated_by_id::TEXT, NEW.escalated_by_id::TEXT);
      END IF;

      -- Statut
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'status', OLD.status::TEXT, NEW.status::TEXT);
      END IF;

      -- Priorité
      IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'priority', OLD.priority::TEXT, NEW.priority::TEXT);
      END IF;

      -- SLA start
      IF OLD.sla_start_at IS DISTINCT FROM NEW.sla_start_at THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'sla_start_at', OLD.sla_start_at::TEXT, NEW.sla_start_at::TEXT);
      END IF;

      -- SLA paused
      IF OLD.sla_paused_at IS DISTINCT FROM NEW.sla_paused_at THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'sla_paused_at', OLD.sla_paused_at::TEXT, NEW.sla_paused_at::TEXT);
      END IF;

      -- SLA elapsed minutes
      IF OLD.sla_elapsed_minutes IS DISTINCT FROM NEW.sla_elapsed_minutes THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'sla_elapsed_minutes', OLD.sla_elapsed_minutes::TEXT, NEW.sla_elapsed_minutes::TEXT);
      END IF;

      -- SLA deadline
      IF OLD.sla_deadline_at IS DISTINCT FROM NEW.sla_deadline_at THEN
        INSERT INTO ticket_audit_logs (ticket_id, performed_by, action, field_name, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'UPDATE', 'sla_deadline_at', OLD.sla_deadline_at::TEXT, NEW.sla_deadline_at::TEXT);
      END IF;

      -- Soft delete (is_active)
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

-- Attacher le trigger à la table tickets (AFTER pour ne pas bloquer l'opération)
CREATE TRIGGER trg_tickets_audit_log
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION fn_ticket_audit_log();


-- ============================================================================
-- 10. TRIGGER : Création automatique du profil à l'inscription
-- Quand un utilisateur s'inscrit via Supabase Auth, on crée son profil
-- ============================================================================

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

-- Trigger sur auth.users (schéma auth géré par Supabase)
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION fn_handle_new_user();


-- ============================================================================
-- FIN DU SPRINT 1
-- ============================================================================
