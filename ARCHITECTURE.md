# Architecture Technique - Basilisk CRM

Ce document détaille les philosophies clés de l'architecture backend et métier du projet.

## 1. Philosophie Hybride des Tickets (Push vs Pull)

La gestion des flux d'incidents dans Basilisk repose sur un modèle hybride pour concilier automatisation et flexibilité.

### Système Push (Le moteur de Routage)
Lorsqu'un ticket est créé (Server Action `createTicket`), il passe par le moteur de **Routing Rules**.
Ce moteur évalue les conditions JSON configurables par les Admins (ex: `category == 'SAV'`) et assigne automatiquement le **Niveau de Support** (`support_level_id`) ou un Technicien précis (`assignee_id`). 

### Système Pull (La Pioche ou "Pick Ticket")
Les tickets qui ont un `support_level_id` mais pas d'`assignee_id` atterrissent dans les files d'attente (Queues). 
Les techniciens utilisent la **Pioche** (la RPC `pick_ticket`) pour réclamer un ticket.
- La fonction récupère **1 seul ticket** (`LIMIT 1`).
- Utilise un verrou exclusif basé sur le système (`FOR UPDATE SKIP LOCKED`) pour éviter que deux techniciens ne piochent le même ticket en même temps.
- Filtre automatiquement : le ticket pioché est le plus ancien de la priorité la plus élevée pour le `support_level_id` correspondant à celui du technicien.

La règle d'entreprise de Basilisk impose souvent le **flux tendu** : un technicien ne peut avoir qu'un seul ticket actif à la fois, le forçant à clôturer son encours avant de piocher à nouveau.

## 2. Relation Vitale : Profil -> Store -> Client

Le système est conçu en multi-tenancy stricte ("Silos client").

1. **Client** : Entité légale (ex: "Groupe Auchan").
2. **Store (Magasin)** : Lieu physique (ex: "Auchan Vélizy"). Appartient à un seul Client.
3. **Profil (Utilisateur Client)** : Les utilisateurs sont liés obligatoirement à un `store_id` (et donc à la hiérarchie du `client_id` de ce magasin).

**L'impact sur la RLS (Row Level Security) :**
- Les profils clients ne peuvent voir **que** les tickets (`ticket.store_id == auth.users.store_id`).
- Lors de la création d'un ticket, le `client_id` et le `store_id` sont obligatoirement hérités du créateur, garantissant qu'un utilisateur ne peut pas créer un ticket dans le mauvais silo.

## 3. Le Moteur SLA (Service Level Agreement)

Les performances du support sont suivies via un moteur SLA backend fonctionnant par bornes temporelles.

1. **Initialisation (`createTicket`)**
   - `sla_start_at` : Timestamp de la création.
   - `sla_deadline_at` : Date de fin contractuelle, calculée selon la `priority` (Critique: +2h, Haute: +8h, Normale: +48h, Basse: +120h).
   - `sla_elapsed_minutes` : Initialisé à `0`.

2. **Pause du SLA / Attente Client (`updateTicketStatus`)**
   - Règle métier : le temps de réponse du client n'est pas imputé au technicien.
   - Lorsqu'un ticket passe en statut `attente_client`, `sla_paused_at` est marqué au Timestamp actuel (la deadline est "gelée").

3. **Reprise du SLA (`updateTicketStatus`)**
   - Si le ticket repasse en `en_cours` ou `assigne`, on calcule la durée passée *depuis* `sla_paused_at`.
   - On additionne cette durée au champ `sla_deadline_at` (la deadline recule).
   - On ajoute le temps d'attente au `sla_elapsed_minutes`.
   - `sla_paused_at` repasse à NULL. Le SLA reprend sa course.

Toute cette logique s'exécute **strictement côté serveur** (Server Actions), assurant l'intégrité des délais SLA.
