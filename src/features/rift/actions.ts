'use server'

// SPRINT 50.2 - Basilisk Rift : Server Actions pour la messagerie interne

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// TYPES
// ==========================================

type RiftChannelType = 'PUBLIC' | 'PRIVATE_GROUP' | 'DM'

// ==========================================
// CHANNELS
// ==========================================

/**
 * Créer un channel Rift (PUBLIC réservé aux ADMIN, PRIVATE_GROUP/DM pour tous les internes)
 */
export async function createRiftChannel(
    name: string | null,
    type: RiftChannelType,
    memberIds: string[]
) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Non authentifié.' }

    // Vérif rôle interne
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, support_level')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role === 'CLIENT') {
        return { error: 'Accès interdit aux clients.' }
    }

    if (type === 'PUBLIC' && profile.role !== 'ADMIN') {
        return { error: 'Seuls les ADMIN peuvent créer des channels publics.' }
    }

    // Pour les DM, vérifier qu'il n'y a que 2 membres et qu'un DM n'existe pas déjà
    if (type === 'DM') {
        const dmMembers = [user.id, ...memberIds.filter(id => id !== user.id)]
        if (dmMembers.length !== 2) {
            return { error: 'Un DM doit contenir exactement 2 participants.' }
        }

        // Vérifier si un DM existe déjà entre ces 2 utilisateurs
        const { data: existingDms } = await supabase
            .from('rift_channels')
            .select(`
                id,
                members:rift_channel_members(user_id)
            `)
            .eq('type', 'DM')

        if (existingDms) {
            for (const dm of existingDms) {
                const dmMemberIds = (dm.members as { user_id: string }[]).map(m => m.user_id).sort()
                if (
                    dmMemberIds.length === 2 &&
                    dmMemberIds[0] === dmMembers.sort()[0] &&
                    dmMemberIds[1] === dmMembers.sort()[1]
                ) {
                    return { success: true, channelId: dm.id, existing: true }
                }
            }
        }
    }

    // Créer le channel
    const { data: channel, error: channelError } = await supabase
        .from('rift_channels')
        .insert({
            name: type === 'DM' ? null : name,
            type,
            created_by: user.id,
        })
        .select('id')
        .single()

    if (channelError || !channel) {
        console.error('[Rift] Erreur createRiftChannel:', channelError)
        return { error: channelError?.message ?? 'Erreur lors de la création du channel.' }
    }

    // PUBLIC : auto-ajouter TOUS les utilisateurs internes
    let finalMemberIds = memberIds
    if (type === 'PUBLIC') {
        const { data: allInternals } = await supabase
            .from('profiles')
            .select('id')
            .neq('role', 'CLIENT')
            .eq('is_active', true)
        finalMemberIds = allInternals?.map(p => p.id) ?? [user.id]
    }

    // Ajouter les membres (incluant le créateur)
    const allMembers = [...new Set([user.id, ...finalMemberIds])]
    const memberInserts = allMembers.map(uid => ({
        channel_id: channel.id,
        user_id: uid,
    }))

    const { error: membersError } = await supabase
        .from('rift_channel_members')
        .insert(memberInserts)

    if (membersError) {
        console.error('[Rift] Erreur ajout membres:', membersError)
        // Cleanup : supprimer le channel créé si les membres échouent
        await supabase.from('rift_channels').delete().eq('id', channel.id)
        return { error: 'Erreur lors de l\'ajout des membres.' }
    }

    revalidatePath('/rift')
    return { success: true, channelId: channel.id }
}

/**
 * Ajouter un membre à un channel existant
 */
export async function addRiftMember(channelId: string, userId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { error } = await supabase
        .from('rift_channel_members')
        .insert({ channel_id: channelId, user_id: userId })

    if (error) {
        console.error('[Rift] Erreur addRiftMember:', error)
        return { error: error.message }
    }

    revalidatePath('/rift')
    return { success: true }
}

/**
 * Quitter un channel
 */
export async function leaveRiftChannel(channelId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { error } = await supabase
        .from('rift_channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', user.id)

    if (error) {
        console.error('[Rift] Erreur leaveRiftChannel:', error)
        return { error: error.message }
    }

    revalidatePath('/rift')
    return { success: true }
}

// ==========================================
// MESSAGES
// ==========================================

/**
 * Envoyer un message dans un channel Rift
 */
export async function sendRiftMessage(
    channelId: string,
    content: string,
    replyToId?: string | null
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: message, error } = await supabase
        .from('rift_messages')
        .insert({
            channel_id: channelId,
            user_id: user.id,
            content,
            reply_to_id: replyToId ?? null,
        })
        .select('id')
        .single()

    if (error) {
        console.error('[Rift] Erreur sendRiftMessage:', error)
        return { error: error.message }
    }

    return { success: true, messageId: message?.id }
}

/**
 * Modifier le contenu d'un message (le trigger SQL gère l'audit)
 */
export async function editRiftMessage(messageId: string, newContent: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { error } = await supabase
        .from('rift_messages')
        .update({ content: newContent })
        .eq('id', messageId)
        .eq('user_id', user.id) // RLS + vérif supplémentaire

    if (error) {
        console.error('[Rift] Erreur editRiftMessage:', error)
        return { error: error.message }
    }

    return { success: true }
}

/**
 * Soft-delete un message (passage en fantôme)
 */
export async function deleteRiftMessage(messageId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { error } = await supabase
        .from('rift_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', user.id)

    if (error) {
        console.error('[Rift] Erreur deleteRiftMessage:', error)
        return { error: error.message }
    }

    return { success: true }
}

/**
 * Récupérer l'historique des éditions d'un message
 */
export async function getRiftMessageEdits(messageId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data, error } = await supabase
        .from('rift_message_edits')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('[Rift] Erreur getRiftMessageEdits:', error)
        return { error: error.message }
    }

    return { success: true, edits: data ?? [] }
}

// ==========================================
// REACTIONS
// ==========================================

export async function toggleRiftReaction(messageId: string, emoji: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: existing } = await supabase
        .from('rift_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle()

    if (existing) {
        const { error } = await supabase.from('rift_reactions').delete().eq('id', existing.id)
        if (error) return { error: error.message }
    } else {
        const { error } = await supabase.from('rift_reactions').insert({
            message_id: messageId,
            user_id: user.id,
            emoji
        })
        if (error) return { error: error.message }
    }
    return { success: true }
}

// ==========================================
// UPLOAD ATTACHMENTS
// ==========================================

/**
 * Upload un fichier dans le bucket rift-attachments.
 * Retourne l'URL publique signée.
 */
export async function uploadRiftAttachment(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const file = formData.get('file') as File
    if (!file) return { error: 'Aucun fichier fourni.' }

    const ext = file.name.split('.').pop()
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
        .from('rift-attachments')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
        })

    if (uploadError) {
        console.error('[Rift] Erreur upload:', uploadError)
        return { error: uploadError.message }
    }

    // Obtenir l'URL signée (valide 7 jours)
    const { data: urlData } = await supabase.storage
        .from('rift-attachments')
        .createSignedUrl(path, 60 * 60 * 24 * 7) // 7 jours

    return {
        success: true,
        url: urlData?.signedUrl ?? '',
        path,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
    }
}

// ==========================================
// PROFILS INTERNES (pour sélection de membres)
// ==========================================

/**
 * Récupérer tous les profils internes (hors CLIENT) pour la sélection de membres
 */
export async function getInternalProfiles() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role')
        .neq('role', 'CLIENT')
        .eq('is_active', true)
        .order('first_name')

    if (error) {
        console.error('[Rift] Erreur getInternalProfiles:', error)
        return { error: error.message }
    }

    return { success: true, profiles: data ?? [] }
}
