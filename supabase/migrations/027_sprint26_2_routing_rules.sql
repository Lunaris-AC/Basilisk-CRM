-- SPRINT 26.2 : Moteur de routage des tickets

-- Création de la table des règles de routage
CREATE TABLE IF NOT EXISTS public.ticket_routing_rules (
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

-- Ajouter des commentaires pour la documentation
COMMENT ON TABLE public.ticket_routing_rules IS 'Règles de routage automatique pour l''assignation initiale des tickets.';
COMMENT ON COLUMN public.ticket_routing_rules.execution_order IS 'Ordre d''évaluation (1 = priorité la plus haute).';
COMMENT ON COLUMN public.ticket_routing_rules.conditions IS 'Arbre de décision JSON. Ex: {"logical_operator": "AND", "conditions": [...]}';

-- Création du trigger pour updated_at (si la fonction update_updated_at_column existe)
DROP TRIGGER IF EXISTS trg_ticket_routing_rules_updated_at ON public.ticket_routing_rules;
CREATE TRIGGER trg_ticket_routing_rules_updated_at
BEFORE UPDATE ON public.ticket_routing_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Activer RLS
ALTER TABLE public.ticket_routing_rules ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent lire les règles
CREATE POLICY "Les utilisateurs peuvent voir les règles de routage."
    ON public.ticket_routing_rules
    FOR SELECT
    TO authenticated
    USING (true);

-- Les admins peuvent tout faire
CREATE POLICY "Les administrateurs peuvent gérer les règles de routage."
    ON public.ticket_routing_rules
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );
