export type SuggestionStatus = 'PENDING' | 'APPROVED' | 'REFUSED' | 'DEFERRED';

export interface SuggestionComment {
    id: string;
    suggestion_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    profiles?: {
        first_name: string;
        last_name: string;
        avatar_url: string | null;
    };
}

export interface Suggestion {
    id: string;
    title: string;
    description: string;
    created_by: string;
    status: SuggestionStatus;
    votes_count: number;
    upvotes_count: number;
    downvotes_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    profiles?: {
        first_name: string;
        last_name: string;
        avatar_url: string | null;
    };
    user_has_voted?: boolean;
    user_vote_value?: number; // 1 or -1
}
