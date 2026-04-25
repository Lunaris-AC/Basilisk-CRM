'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateMyProfile(formData: { first_name: string; last_name: string }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    const { error } = await supabase
        .from('profiles')
        .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

    if (error) {
        console.error('Error updating profile:', error)
        return { error: 'Erreur lors de la mise à jour du profil' }
    }

    revalidatePath('/parametres')
    return { success: true }
}

export async function updateMyAvatarUrl(avatar_url: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    const { error } = await supabase
        .from('profiles')
        .update({
            avatar_url,
            updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

    if (error) {
        console.error('Error updating avatar:', error)
        return { error: 'Erreur lors de la mise à jour de l\'avatar' }
    }

    revalidatePath('/parametres')
    return { success: true }
}

export async function updateMyThemeConfig(config: any) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    const { error } = await supabase
        .from('profiles')
        .update({
            theme_config: config,
            updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

    if (error) {
        console.error('Error updating theme config:', error)
        return { error: 'Erreur lors de la mise à jour du thème' }
    }

    return { success: true }
}
