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
