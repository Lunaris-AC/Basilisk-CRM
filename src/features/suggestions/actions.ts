'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { SuggestionStatus } from './types'

export async function getSuggestions() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch suggestions with creator profiles and check if current user has voted
    const { data, error } = await supabase
        .from('suggestions')
        .select(`
            *,
            profiles:created_by (first_name, last_name, avatar_url),
            suggestion_votes!left (user_id, vote_value)
        `)
        .eq('is_active', true)
        .order('votes_count', { ascending: false })
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching suggestions:', error)
        return { error: 'Erreur lors de la récupération des suggestions.' }
    }

    // Map data to include user_has_voted and vote_value
    const suggestions = data?.map((s: any) => {
        const myVote = s.suggestion_votes?.find((v: any) => v.user_id === user?.id)
        return {
            ...s,
            user_has_voted: !!myVote,
            user_vote_value: myVote?.vote_value
        }
    })

    return { data: suggestions }
}

export async function createSuggestion(title: string, description: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non authentifié.' }

    const { error } = await supabase
        .from('suggestions')
        .insert({
            title,
            description,
            created_by: user.id
        })

    if (error) {
        console.error('Error creating suggestion:', error)
        return { error: 'Erreur lors de la création de la suggestion.' }
    }

    revalidatePath('/suggestions')
    return { success: true }
}

export async function toggleVote(suggestionId: string, value: 1 | -1) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non authentifié.' }

    // Check suggestion status before voting
    const { data: suggestion } = await supabase
        .from('suggestions')
        .select('status')
        .eq('id', suggestionId)
        .single()

    if (!suggestion) return { error: 'Suggestion introuvable.' }
    if (suggestion.status !== 'PENDING') return { error: 'Les votes sont clôturés pour cette suggestion.' }

    // Check existing vote
    const { data: existingVote } = await supabase
        .from('suggestion_votes')
        .select('vote_value')
        .eq('suggestion_id', suggestionId)
        .eq('user_id', user.id)
        .single()

    if (existingVote) {
        if (existingVote.vote_value === value) {
            // Same vote -> remove it
            const { error } = await supabase
                .from('suggestion_votes')
                .delete()
                .eq('suggestion_id', suggestionId)
                .eq('user_id', user.id)

            if (error) return { error: "Erreur lors de la suppression du vote." }
        } else {
            // Different vote -> update it
            const { error } = await supabase
                .from('suggestion_votes')
                .update({ vote_value: value })
                .eq('suggestion_id', suggestionId)
                .eq('user_id', user.id)

            if (error) return { error: "Erreur lors de la mise à jour du vote." }
        }
    } else {
        // No vote -> insert it
        const { error } = await supabase
            .from('suggestion_votes')
            .insert({
                suggestion_id: suggestionId,
                user_id: user.id,
                vote_value: value
            })

        if (error) return { error: "Erreur lors de l'ajout du vote." }
    }

    revalidatePath('/suggestions')
    return { success: true }
}

export async function updateSuggestionStatus(suggestionId: string, status: SuggestionStatus) {
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'ADMIN') return { error: 'Accès non autorisé.' }

    const { error } = await supabase
        .from('suggestions')
        .update({ status })
        .eq('id', suggestionId)

    if (error) {
        console.error('Error updating status:', error)
        return { error: 'Erreur lors de la mise à jour du statut.' }
    }

    revalidatePath('/suggestions')
    return { success: true }
}

export async function getSuggestionComments(suggestionId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('suggestion_comments')
        .select(`
            *,
            profiles:user_id (first_name, last_name, avatar_url)
        `)
        .eq('suggestion_id', suggestionId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching comments:', error)
        return { error: 'Erreur lors de la récupération des commentaires.' }
    }

    return { data: data || [] }
}

export async function addSuggestionComment(suggestionId: string, content: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Non authentifié.' }

    const { error } = await supabase
        .from('suggestion_comments')
        .insert({
            suggestion_id: suggestionId,
            user_id: user.id,
            content
        })

    if (error) {
        console.error('Error adding comment:', error)
        return { error: 'Erreur lors de l\'ajout du commentaire.' }
    }

    revalidatePath('/suggestions')
    return { success: true }
}
