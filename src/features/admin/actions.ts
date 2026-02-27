'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Force le changement de rôle d'un utilisateur (Usurpation)
 */
export async function forceChangeUserRole(targetUserId: string, newRole: string) {
    const supabase = await createClient()

    // Vérification de sécurité sévère : L'appelant DOIT être N4
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'N4' && callerProfile?.role !== 'ADMIN') return { error: 'Accès non autorisé : God Mode réservé aux administrateurs.' }

    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUserId)

    if (error) {
        console.error("God Mode Error [changement de rôle] :", error)
        return { error: 'Échec du changement de rôle.' }
    }

    revalidatePath('/admin/debug')
    return { success: true }
}

/**
 * Désassigne absolument tous les tickets en cours pour un utilisateur ciblé.
 */
export async function unassignAllUserTickets(targetUserId: string) {
    const supabase = await createClient()

    // Vérification N4
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'N4' && callerProfile?.role !== 'ADMIN') return { error: 'Accès non autorisé.' }

    // Strip de l'assignation
    const { error } = await supabase
        .from('tickets')
        .update({ assignee_id: null })
        .eq('assignee_id', targetUserId)

    if (error) {
        console.error("God Mode Error [désassignation massive] :", error)
        return { error: 'Échec de la purge des assignations.' }
    }

    revalidatePath('/admin/debug')
    revalidatePath('/incidents')
    revalidatePath('/dashboard')
    return { success: true, message: "Tous les tickets de l'utilisateur ont été remis dans la file." }
}

/**
 * Fonction "Nuke" : Soft delete (is_active = false) tous les tickets fermés depuis plus de 30 jours.
 */
export async function softDeleteOldClosedTickets() {
    const supabase = await createClient()

    // Vérification N4
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'N4' && callerProfile?.role !== 'ADMIN') return { error: 'Accès non autorisé.' }

    // Calcul de la date d'il y a 30 jours
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
        .from('tickets')
        .update({ is_active: false })
        .eq('status', 'ferme')
        .lt('updated_at', thirtyDaysAgo.toISOString())
        .select('id')

    if (error) {
        console.error("God Mode Error [nuke tickets] :", error)
        return { error: 'Échec du lancement du protocole Nuke.' }
    }

    revalidatePath('/admin/debug')
    return { success: true, count: data?.length || 0 }
}

// ============== SPRINT 20 : ADMIN CRUD ==============

/**
 * Met à jour un profil utilisateur (rôle, is_active, first_name, last_name).
 */
export async function adminUpdateProfile(
    targetUserId: string,
    updates: { role?: string; is_active?: boolean; first_name?: string; last_name?: string; store_id?: string | null; support_level_id?: string | null }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'N4' && callerProfile?.role !== 'ADMIN') return { error: 'Accès non autorisé.' }

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', targetUserId)

    if (error) {
        console.error("God Mode Error [updateProfile]:", error)
        return { error: 'Échec de la mise à jour du profil.' }
    }

    revalidatePath('/admin/debug')
    return { success: true }
}

/**
 * Force Edit d'un ticket — modifie n'importe quel champ sans restriction workflow.
 */
export async function adminForceEditTicket(
    ticketId: string,
    updates: { status?: string; priority?: string; category?: string; escalation_level?: number; support_level_id?: string | null; assignee_id?: string | null; sla_deadline_at?: string | null }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'N4' && callerProfile?.role !== 'ADMIN') return { error: 'Accès non autorisé.' }

    const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)

    if (error) {
        console.error("God Mode Error [forceEditTicket]:", error)
        return { error: 'Échec de la modification du ticket.' }
    }

    revalidatePath('/admin/debug')
    revalidatePath('/incidents')
    revalidatePath('/dashboard')
    return { success: true }
}

/**
 * Récupère la liste simplifiée des magasins (id, name) pour un composant Select.
 */
export async function getStoresForSelect() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.', data: [] }

    const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .order('name')

    if (error) {
        console.error("Erreur [getStoresForSelect]:", error)
        return { error: 'Échec de la récupération des magasins.', data: [] }
    }

    return { success: true, data: data || [] }
}

