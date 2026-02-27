# Audit de l'Architecture (State of the Union)

Ce document dresse un état des lieux exhaustif de la structure actuelle de l'application avant d'entamer les sprints liés à la facturation et aux bons de commande.

## 1. STRUCTURE DE LA BASE DE DONNÉES (SCHÉMA)

### Tables existantes
- **Fondations :** `profiles`, `clients`, `stores`, `contacts`, `documents`
- **Tickets (Core) :** `tickets`, `ticket_audit_logs`, `ticket_comments`, `ticket_attachments`
- **Extensions Multi-Services (1-to-1 avec Tickets) :**
  - `ticket_commerce_details`
  - `ticket_sav_details`
  - `ticket_formateur_details`
  - `ticket_dev_details`
- **CMDB (Parc Matériel et Licences) :** 
  - `equipment_catalogue` (modèles avec schémas dynamiques JSONB)
  - `equipments` (machines physiques)
  - `software_licenses`
- **Commerce (B2B) :** 
  - `commercial_catalogue` (modèles de prestations/produits)
  - `quotes` (entêtes de devis)
  - `quote_lines` (lignes de devis)

### ENUMs existants
- `ticket_category` : 'HL', 'COMMERCE', 'SAV', 'FORMATION'
- `ticket_status` : DIVERS (ex: 'NOUVEAU', 'EN_COURS', 'RESOLU', etc.)
- `ticket_priority` : DIVERS
- `user_role` : 'ADMIN', 'DEV', 'COM', 'SAV1', 'SAV2', 'CLIENT', 'N1', 'N2', 'N3', 'N4', 'FORMATEUR'
- `equipment_status` : 'EN_SERVICE', 'EN_PANNE', 'EN_REPARATION_INTERNE', 'RMA_FOURNISSEUR', 'REBUT'
- `sd_type` : 'BUG', 'EVOLUTION'
- `sd_complexity` : 'HOTFIX', 'S', 'M', 'L', 'XL', 'MAJEUR'
- `item_type` : 'MATERIEL', 'LICENCE', 'SERVICE'
- `quote_status` : 'BROUILLON', 'EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'FACTURE'

### Détail des Tables Commerce
L'architecture actuelle gère les Devis (Quotes) et le catalogue de cette façon :
1. **`commercial_catalogue`** : Contient les produits vendables, avec `name`, `type` (item_type), `default_price`, et `tax_rate`.
2. **`quotes`** : Représente la demande avec un identifiant incrémental automatique (`quote_number`), et conserve les historiques globaux (`total_ht`, `total_ttc`, `signature_hash`, `valid_until`, `status`).
3. **`quote_lines`** : Les lignes individuelles rattachées au devis, incluant prix unitaire, quantité, taux de TVA appliqué et total de la ligne (`line_total`).

---

## 2. ROUTAGE ET PORTAILS (FRONT-END)

Le routage (Next.js App Router) centralise l'accès authentifié dans `src/app/(protected)/`. Voici les sections identifiées :
- `/dashboard` : Tableau de bord principal (habituellement segmenté en fonction du rôle de l'utilisateur).
- `/cmdb` : Gestion du Master Data Matériel et Licences.
- `/commerce` : Gestion des ventes B2B et des Devis (logements de l'UI pour la création et la gestion du catalogue, validé par l'existence de ces composants dans d'autres actions/routes bien qu'absent directement sous `/` protégé par défaut, peut-être niché/partagé). *Note: L'appel revalidatePath('/commerce') dans les actions confirme l'existence de cette route.*
- `/clients` : Explorateur et répertoire des clients (`Profils` / `Magasins`).
- `/admin` : Vues d'administration (incluant God Mode et débogage).
- `/incidents` & `/tickets` : Gestion du cycle de vie des requêtes d'assistance.
- `/sd` : Outil de suivi des développements (Logiciel / Service Desk).
- `/documentation` & `/patch-notes` : Informations et base de connaissances internes.
- `/parametres` : Configuration des comptes ou des préférences.

---

## 3. FONCTIONNALITÉS DU COMMERCE ACTUELLES

Les règles métiers existantes sont exposées au sein du fichier Server Actions : `src/features/commerce/actions.ts`.

**Catalogue CRUD :**
- `getCommercialCatalogue()`
- `addCatalogueItem()`
- `updateCatalogueItem()`
- `deleteCatalogueItem()`

**Devis (Quotes) :**
- `getQuotes(status?: QuoteStatus)`
- `createQuote(data, lines)` : **Intègre un calcul 100% back-end**.
  - Calcule automatiquement le `total_ht` et `total_ttc` itératif à partir des lignes soumises (quantité, prix unitaire, taxe).
  - Génère intelligemment le nommage du devis `DEV-YYYY-XXXX` de manière séquentielle pour l'année en cours.
- `acceptQuote(quoteId, signerId)` : **Héberge la logique de signature**.
  - Vérifie l'existence et l'autorisation du profil du "signer".
  - Crée un hash de signature cryptographique strict (SHA-256) basé sur l'identifiant du devis, l'ID du signataire et un timestamp (date ISO de signature).
  - Bascule le statut à `ACCEPTE`.

---

## 4. RELATIONS CLÉS (FOREIGN KEYS)

- **Client ↔ Magasin :** Le rattachement s'effectue via la table `profiles`.
  - Relation : `profiles.store_id` pointe sur `stores(id)`. Un utilisateur (Client/Gérant) est lié directement au magasin par cette Foreign Key.
- **Ticket ↔ Équipement :**
  - Relation : `tickets.equipment_id` pointe sur `equipments(id)`. Exprimé de manière optionnelle (`ON DELETE SET NULL`), tout incident peut être attribué sélectivement à un poste physique/TPE/etc de la CMDB.
- **Ticket ↔ SD (Développement) :**
  - Relation : L'extension est un strict `1-to-1`. La table auxiliaire `ticket_dev_details` a pour Primary Key la colonne `ticket_id`, qui agit simultanément comme Foreign Key (`ON DELETE CASCADE`) vers la table `tickets`.
