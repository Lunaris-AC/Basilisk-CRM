'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SupportLevel {
    id: string
    name: string
    rank: number
    color: string
    is_active: boolean
    created_at: string
    updated_at: string
}

/**
 * Récupère tous les niveaux de support actifs, triés par rang.
 */
export async function getSupportLevels(): Promise<SupportLevel[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('support_levels')
        .select('*')
        .eq('is_active', true)
        .order('rank', { ascending: true })

    if (error) {
        console.error('Erreur getSupportLevels:', error)
        throw new Error('Impossible de récupérer les niveaux de support.')
    }

    return data as SupportLevel[]
}

/**
 * Ajoute un nouveau niveau de support.
 */
export async function addSupportLevel(data: { name: string; rank: number; color: string }) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('support_levels')
        .insert(data)

    if (error) {
        console.error('Erreur addSupportLevel:', error)
        return { error: 'Impossible de créer le niveau de support.' }
    }

    revalidatePath('/admin/grades')
    return { success: true }
}

/**
 * Met à jour un niveau de support existant.
 */
export async function updateSupportLevel(id: string, data: { name?: string; rank?: number; color?: string; is_active?: boolean }) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('support_levels')
        .update(data)
        .eq('id', id)

    if (error) {
        console.error('Erreur updateSupportLevel:', error)
        return { error: 'Impossible de mettre à jour le niveau de support.' }
    }

    revalidatePath('/admin/grades')
    // On revalide aussi les incidents car les badges pourraient changer
    revalidatePath('/incidents')
    revalidatePath('/dashboard')

    return { success: true }
}

/**
 * Supprime (soft delete) un niveau de support.
 * On vérifie d'abord s'il reste des tickets ou profils rattachés.
 */
export async function deleteSupportLevel(id: string) {
    const supabase = await createClient()

    // 1. Vérifier si des profils utilisent ce niveau
    const { count: profileCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('support_level_id', id)

    if (profileCount && profileCount > 0) {
        return { error: 'Impossible de supprimer ce niveau car des utilisateurs y sont rattachés.' }
    }

    // 2. Vérifier si des tickets utilisent ce niveau
    const { count: ticketCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('support_level_id', id)

    if (ticketCount && ticketCount > 0) {
        return { error: 'Impossible de supprimer ce niveau car des tickets y sont rattachés.' }
    }

    // 3. Soft delete
    const { error } = await supabase
        .from('support_levels')
        .update({ is_active: false })
        .eq('id', id)

    if (error) {
        console.error('Erreur deleteSupportLevel:', error)
        return { error: 'Impossible de supprimer le niveau de support.' }
    }

    revalidatePath('/admin/grades')
    return { success: true }
}
