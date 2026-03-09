# Basilisk CRM

Plateforme de gestion de tickets, d'incidents et de CMDB pour les équipes de support, commerciaux, formateurs et développeurs.

## 🚀 Stack Technique

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Base de données / Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, RPCs)
- **Style**: [Tailwind CSS](https://tailwindcss.com/)
- **Composants UI**: [Shadcn UI](https://ui.shadcn.com/) (Radix Primitives)
- **State Management**: [React Query](https://tanstack.com/query/latest) (TanStack Query)
- **Formulaires**: React Hook Form + Zod
- **Icônes**: Lucide React

## ⚙️ Prérequis

- Node.js (v18+)
- NPM ou Yarn
- Un projet Supabase fonctionnel avec la base de données initialisée.

## 🏗️ Installation & Déploiement

### 1. Variables d'environnement
Créez un fichier `.env.local` à la racine (basé sur `.env.example` si existant) et configurez les variables Supabase :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=votre-cle-anon
```

### 2. Initialisation de la Base de Données
Naviguez dans l'interface Supabase (SQL Editor) et exécutez les scripts situés dans `supabase/migrations/` **dans cet ordre précit** :
1. `00_init_schema.sql` (Crée les tables, relations, RLS, fonctions RPC et triggers)
2. `01_seed_data.sql` (Injecte les niveaux de support de base et règles de routage obligatoires)

### 3. Démarrage de l'application
Installez les dépendances et lancez le serveur de développement :

```bash
npm install
npm run dev
```
L'application sera accessible sur `http://localhost:3000`.

## 🛡️ Rôles & Accès (RLS)
Le projet utilise intensivement les politiques RLS de PostgreSQL de Supabase. Les utilisateurs ont des rôles stricts (`user_role` ENUM) : `ADMIN`, `N4`, `N3`, `N2`, `N1`, `SAV2`, `SAV1`, `COM`, `FORMATEUR`, `DEV`, `STANDARD`. Un tableau de bord God Mode est accessible aux `ADMIN` pour muter/gérer les assignations.
