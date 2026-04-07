-- Migration : Normalisation des rôles et niveaux de support

-- 1. Ajouter la valeur 'TECHNICIEN' au type user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'TECHNICIEN';

-- 2. Ajouter la colonne support_level à profiles (TEXT acceptant N1 N2 N3 N4)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'support_level'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN support_level TEXT CHECK (support_level IN ('N1', 'N2', 'N3', 'N4'));
    END IF;
END $$;

