-- Update ticket_category enum to split SAV into SAV1 and SAV2
-- We add them to the enum first
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'SAV1';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'SAV2';

-- We could also migrate existing 'SAV' tickets to 'SAV1' by default if needed
UPDATE public.tickets SET category = 'SAV1' WHERE category = 'SAV';

-- Note: We keep 'SAV' in the enum for now to avoid errors if it's used elsewhere, 
-- but we will use SAV1 and SAV2 in the UI.
