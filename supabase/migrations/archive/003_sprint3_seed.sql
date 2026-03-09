-- ============================================================================
-- SPRINT 3 — SEED : JEU DE DONNÉES RÉALISTE (VERSION SANS AUTH.USERS)
-- SaaS Ticketing / Support Interne
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. INSERTION DES CLIENTS
-- ============================================================================
INSERT INTO clients (id, company, first_name, last_name, email, phone)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Carrefour Market', 'Pierre', 'Durand', 'p.durand@carrefour.fr', '0102030405'),
  ('c0000000-0000-0000-0000-000000000002', 'Fnac Darty', 'Alice', 'Darty', 'alice@darty.com', '0144445566'),
  ('c0000000-0000-0000-0000-000000000003', 'Leroy Merlin', 'Robert', 'Leroy', 'robert@leroymerlin.fr', '0203040506'),
  ('c0000000-0000-0000-0000-000000000004', 'Decathlon', 'Julie', 'Decat', 'julie@decathlon.com', '0304050607'),
  ('c0000000-0000-0000-0000-000000000005', 'Boulanger', 'Marc', 'Boulanger', 'marc@boulanger.fr', '0405060708'),
  ('c0000000-0000-0000-0000-000000000006', 'IKEA France', 'Ingvar', 'Kamprad', 'office@ikea.fr', '0506070809'),
  ('c0000000-0000-0000-0000-000000000007', 'Castorama', 'Paul', 'Casto', 'paul@casto.fr', '0607080910'),
  ('c0000000-0000-0000-0000-000000000008', 'Auchan Retail', 'Gerard', 'Auchan', 'gerard@auchan.fr', '0708091011'),
  ('c0000000-0000-0000-0000-000000000009', 'Monoprix', 'Monique', 'Monop', 'monique@monoprix.fr', '0809101112'),
  ('c0000000-0000-0000-0000-000000000010', 'Electro Depot', 'Eric', 'Electro', 'eric@electro.fr', '0910111213')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. INSERTION DES MAGASINS
-- ============================================================================
INSERT INTO stores (client_id, name, city, postal_code)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Carrefour Market Paris 15', 'Paris', '75015'),
  ('c0000000-0000-0000-0000-000000000001', 'Carrefour Market Lyon 3', 'Lyon', '69003'),
  ('c0000000-0000-0000-0000-000000000002', 'Fnac Ternes', 'Paris', '75017'),
  ('c0000000-0000-0000-0000-000000000002', 'Darty Madeleine', 'Paris', '75008'),
  ('c0000000-0000-0000-0000-000000000003', 'Leroy Merlin Ivry', 'Ivry-sur-Seine', '94200'),
  ('c0000000-0000-0000-0000-000000000003', 'Leroy Merlin Bordeaux', 'Bordeaux', '33000'),
  ('c0000000-0000-0000-0000-000000000004', 'Decathlon Madeleine', 'Paris', '75008'),
  ('c0000000-0000-0000-0000-000000000004', 'Decathlon Campus', 'Villeneuve-d''Ascq', '59650'),
  ('c0000000-0000-0000-0000-000000000005', 'Boulanger Opera', 'Paris', '75002'),
  ('c0000000-0000-0000-0000-000000000006', 'IKEA Paris Nord', 'Roissy', '95700'),
  ('c0000000-0000-0000-0000-000000000006', 'IKEA Toulouse', 'Roques', '31120'),
  ('c0000000-0000-0000-0000-000000000007', 'Castorama Defense', 'Nanterre', '92000'),
  ('c0000000-0000-0000-0000-000000000008', 'Auchan La Defense', 'Puteaux', '92800'),
  ('c0000000-0000-0000-0000-000000000008', 'Auchan Val d''Europe', 'Serris', '77700'),
  ('c0000000-0000-0000-0000-000000000009', 'Monoprix Beaugrenelle', 'Paris', '75015'),
  ('c0000000-0000-0000-0000-000000000010', 'Electro Depot Nantes', 'Nantes', '44000'),
  ('c0000000-0000-0000-0000-000000000010', 'Electro Depot Marseille', 'Marseille', '13000'),
  ('c0000000-0000-0000-0000-000000000001', 'Carrefour Market Nice', 'Nice', '06000'),
  ('c0000000-0000-0000-0000-000000000002', 'Fnac Lille', 'Lille', '59000'),
  ('c0000000-0000-0000-0000-000000000003', 'Leroy Merlin Nantes', 'Nantes', '44000');


-- ============================================================================
-- 3. INSERTION DES 50 TICKETS
-- ============================================================================
-- On va récupérer le premier utilisateur Admin (toi !) pour le mettre en créateur
-- et parfois en assigné, histoire d'avoir un Dashboard peuplé.

DO $$
DECLARE
  v_client_ids UUID[];
  v_store_ids UUID[];
  v_admin_id UUID;
  v_statuses ticket_status[] := ARRAY['nouveau', 'assigne', 'en_cours', 'attente_client', 'resolu', 'ferme']::ticket_status[];
  v_priorities ticket_priority[] := ARRAY['basse', 'normale', 'haute', 'critique']::ticket_priority[];
  i INTEGER;
  v_status ticket_status;
  v_priority ticket_priority;
  v_escalation SMALLINT;
  v_assignee UUID;
  v_client UUID;
  v_store UUID;
BEGIN
  -- Récupérer le seul utilisateur disponible (qui doit être l'Admin créé manuellement)
  SELECT id INTO v_admin_id FROM profiles LIMIT 1;

  -- Si on n'a pas d'utilisateur, on arrête tout
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Aucun profil trouvé ! Veuillez créer au moins un compte dans Supabase Auth avant de lancer ce script.';
  END IF;

  -- Récupérer les IDs des entités
  SELECT array_agg(id) INTO v_client_ids FROM clients;
  SELECT array_agg(id) INTO v_store_ids FROM stores;

  FOR i IN 1..50 LOOP
    -- Aléatoire
    v_status := v_statuses[1 + floor(random() * 6)::int];
    v_priority := v_priorities[1 + floor(random() * 4)::int];
    v_escalation := 1 + floor(random() * 4)::int;
    v_client := v_client_ids[1 + floor(random() * array_length(v_client_ids, 1))::int];
    v_store := v_store_ids[1 + floor(random() * array_length(v_store_ids, 1))::int];
    
    -- Assignation : pour l'instant tu es le seul TECH/ADMIN du système
    IF v_status = 'nouveau' THEN
      v_assignee := NULL;
    ELSE
      v_assignee := v_admin_id;
    END IF;

    -- Désactiver l'audit temporairement pour le créateur (car la variable de config n'est pas définie dans l'éditeur)
    -- L'audit fonctionnera quand même, mais "performed_by" sera NULL ou v_admin_id (par le trigger insert)

    INSERT INTO tickets (
      title,
      description,
      problem_location,
      client_id,
      store_id,
      creator_id,
      assignee_id,
      escalation_level,
      status,
      priority,
      sla_start_at
    ) VALUES (
      'Ticket #' || i || ' : ' || (CASE WHEN v_priority = 'critique' THEN 'URGENT - ' ELSE '' END) || 'Problème technique ' || i,
      'Ceci est une description détaillée pour le problème numéro ' || i || '. Le client signale un dysfonctionnement majeur sur son équipement. Une intervention est sûrement nécessaire.',
      'Zone ' || (1 + i % 5),
      v_client,
      v_store,
      v_admin_id,  -- Tu es le créateur
      v_assignee,  -- Tu es assigné si le statut n'est pas "nouveau"
      v_escalation,
      v_status,
      v_priority,
      (CASE WHEN v_status != 'nouveau' THEN now() - (random() * interval '2 days') ELSE NULL END)
    );
  END LOOP;
END $$;

COMMIT;

-- FIN DU SEED v2
