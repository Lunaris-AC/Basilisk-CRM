-- ENUM for suggestion status
CREATE TYPE suggestion_status AS ENUM ('PENDING', 'APPROVED', 'REFUSED', 'DEFERRED');

-- SUGGESTIONS table
CREATE TABLE public.suggestions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status      suggestion_status NOT NULL DEFAULT 'PENDING',
    votes_count INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SUGGESTION_VOTES table
CREATE TABLE public.suggestion_votes (
    suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (suggestion_id, user_id)
);

-- Trigger for updated_at
CREATE TRIGGER trg_suggestions_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function and Trigger to maintain votes_count
CREATE OR REPLACE FUNCTION public.fn_sync_suggestion_votes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.suggestions
        SET votes_count = votes_count + 1
        WHERE id = NEW.suggestion_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.suggestions
        SET votes_count = votes_count - 1
        WHERE id = OLD.suggestion_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_suggestion_votes
AFTER INSERT OR DELETE ON public.suggestion_votes
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_suggestion_votes();

-- Enable RLS
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_votes ENABLE ROW LEVEL SECURITY;

-- Policies for SUGGESTIONS
CREATE POLICY "suggestions_select" ON public.suggestions
    FOR SELECT USING (public.is_active_user());

CREATE POLICY "suggestions_insert" ON public.suggestions
    FOR INSERT WITH CHECK (public.is_active_user() AND created_by = auth.uid());

CREATE POLICY "suggestions_update_creator" ON public.suggestions
    FOR UPDATE USING (public.is_active_user() AND created_by = auth.uid() AND status = 'PENDING')
    WITH CHECK (created_by = auth.uid() AND status = 'PENDING');

CREATE POLICY "suggestions_update_admin" ON public.suggestions
    FOR UPDATE USING (public.get_my_role() = 'ADMIN')
    WITH CHECK (TRUE);

-- Policies for SUGGESTION_VOTES
CREATE POLICY "suggestion_votes_select" ON public.suggestion_votes
    FOR SELECT USING (public.is_active_user());

CREATE POLICY "suggestion_votes_insert" ON public.suggestion_votes
    FOR INSERT WITH CHECK (public.is_active_user() AND user_id = auth.uid());

CREATE POLICY "suggestion_votes_delete" ON public.suggestion_votes
    FOR DELETE USING (public.is_active_user() AND user_id = auth.uid());

-- Seed data
INSERT INTO public.suggestions (title, description, created_by, status, votes_count)
SELECT 
    'Mode sombre automatique', 
    'Permettre au logiciel de basculer en mode sombre selon les réglages du système de l''utilisateur.',
    id,
    'APPROVED',
    12
FROM public.profiles 
WHERE role = 'ADMIN' 
LIMIT 1;

INSERT INTO public.suggestions (title, description, created_by, status, votes_count)
SELECT 
    'Export PDF des tickets', 
    'Ajouter un bouton pour exporter l''intégralité de la conversation d''un ticket au format PDF pour les archives clients.',
    id,
    'PENDING',
    8
FROM public.profiles 
WHERE role = 'ADMIN' 
LIMIT 1;

INSERT INTO public.suggestions (title, description, created_by, status, votes_count)
SELECT 
    'Chat interne entre techniciens', 
    'Un petit module de chat direct (Rift) intégré pour discuter d''un ticket sans passer par les commentaires publics.',
    id,
    'DEFERRED',
    25
FROM public.profiles 
WHERE role = 'ADMIN' 
LIMIT 1;

INSERT INTO public.suggestions (title, description, created_by, status, votes_count)
SELECT 
    'Notifications Push Mobile', 
    'Recevoir des notifications sur smartphone quand un ticket urgent est assigné.',
    id,
    'PENDING',
    15
FROM public.profiles 
WHERE role = 'ADMIN' 
LIMIT 1;

INSERT INTO public.suggestions (title, description, created_by, status, votes_count)
SELECT 
    'Signature électronique des devis', 
    'Intégrer un système de signature tactile pour valider les devis directement en clientèle.',
    id,
    'APPROVED',
    20
FROM public.profiles 
WHERE role = 'ADMIN' 
LIMIT 1;
