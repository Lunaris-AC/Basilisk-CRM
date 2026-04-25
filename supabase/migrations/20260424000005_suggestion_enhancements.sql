-- Update suggestion_votes to support Up/Down
ALTER TABLE public.suggestion_votes ADD COLUMN vote_value SMALLINT DEFAULT 1 CHECK (vote_value IN (1, -1));

-- Update suggestions table to track likes/dislikes separately or use a net score
-- I will keep votes_count as the NET score (likes - dislikes)
ALTER TABLE public.suggestions ADD COLUMN upvotes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.suggestions ADD COLUMN downvotes_count INTEGER NOT NULL DEFAULT 0;

-- Reset and update the sync function for votes
CREATE OR REPLACE FUNCTION public.fn_sync_suggestion_votes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.vote_value = 1) THEN
            UPDATE public.suggestions 
            SET upvotes_count = upvotes_count + 1,
                votes_count = votes_count + 1
            WHERE id = NEW.suggestion_id;
        ELSE
            UPDATE public.suggestions 
            SET downvotes_count = downvotes_count + 1,
                votes_count = votes_count - 1
            WHERE id = NEW.suggestion_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.vote_value = 1) THEN
            UPDATE public.suggestions 
            SET upvotes_count = upvotes_count - 1,
                votes_count = votes_count - 1
            WHERE id = OLD.suggestion_id;
        ELSE
            UPDATE public.suggestions 
            SET downvotes_count = downvotes_count - 1,
                votes_count = votes_count + 1
            WHERE id = OLD.suggestion_id;
        END IF;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Handle vote flip (up to down or vice versa)
        IF (OLD.vote_value = NEW.vote_value) THEN RETURN NEW; END IF;
        
        IF (NEW.vote_value = 1) THEN
            UPDATE public.suggestions 
            SET upvotes_count = upvotes_count + 1,
                downvotes_count = downvotes_count - 1,
                votes_count = votes_count + 2
            WHERE id = NEW.suggestion_id;
        ELSE
            UPDATE public.suggestions 
            SET upvotes_count = upvotes_count - 1,
                downvotes_count = downvotes_count + 1,
                votes_count = votes_count - 2
            WHERE id = NEW.suggestion_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger to include UPDATE
DROP TRIGGER IF EXISTS trg_sync_suggestion_votes ON public.suggestion_votes;
CREATE TRIGGER trg_sync_suggestion_votes
AFTER INSERT OR DELETE OR UPDATE ON public.suggestion_votes
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_suggestion_votes();

-- Create suggestion_comments table
CREATE TABLE public.suggestion_comments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content       TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at on comments
CREATE TRIGGER trg_suggestion_comments_updated_at
  BEFORE UPDATE ON public.suggestion_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for comments
ALTER TABLE public.suggestion_comments ENABLE ROW LEVEL SECURITY;

-- Policies for comments
CREATE POLICY "suggestion_comments_select" ON public.suggestion_comments
    FOR SELECT USING (public.is_active_user());

CREATE POLICY "suggestion_comments_insert" ON public.suggestion_comments
    FOR INSERT WITH CHECK (public.is_active_user() AND user_id = auth.uid());

CREATE POLICY "suggestion_comments_update" ON public.suggestion_comments
    FOR UPDATE USING (public.is_active_user() AND user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "suggestion_comments_delete" ON public.suggestion_comments
    FOR DELETE USING (public.is_active_user() AND (user_id = auth.uid() OR public.get_my_role() = 'ADMIN'));

-- Initial sync for existing data (seed)
UPDATE public.suggestions s
SET upvotes_count = s.votes_count;
