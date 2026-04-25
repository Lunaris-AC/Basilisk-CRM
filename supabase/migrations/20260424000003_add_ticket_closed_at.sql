-- Ajout d'un timestamp de clôture précis
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Fonction pour mettre à jour closed_at automatiquement
CREATE OR REPLACE FUNCTION public.handle_ticket_closure()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'ferme' AND (OLD.status IS NULL OR OLD.status != 'ferme')) THEN
        NEW.closed_at = NOW();
    ELSIF (NEW.status != 'ferme') THEN
        NEW.closed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour la clôture
DROP TRIGGER IF EXISTS trg_handle_ticket_closure ON public.tickets;
CREATE TRIGGER trg_handle_ticket_closure
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_ticket_closure();

-- Initialisation pour les tickets déjà fermés (avant aujourd'hui pour ne pas fausser le delta du jour)
-- On met une date ancienne pour les tickets qui étaient déjà fermés avant la migration de ce matin
UPDATE public.tickets 
SET closed_at = updated_at 
WHERE status = 'ferme' 
AND updated_at < '2026-04-24T00:00:00Z';
