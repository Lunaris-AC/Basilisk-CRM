'use server'

import { createClient } from '@/utils/supabase/server'

export async function addContact(formData: {
    client_id: string
    store_id?: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
    job_title?: string
}) {
    const supabase = await createClient()

    // Vérification de l'utilisateur
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    const { error } = await supabase
        .from('contacts')
        .insert({
            client_id: formData.client_id,
            store_id: formData.store_id || null,
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email || null,
            phone: formData.phone || null,
            job_title: formData.job_title || null,
        })

    if (error) {
        console.error('Error adding contact:', error)
        return { error: 'Erreur lors de la création du contact.' }
    }

    return { success: true }
}

export async function searchContactByPhone(phone: string, clientId?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    // Clean phone number (remove spaces, dots, dashes)
    const cleanedPhone = phone.replace(/[\s\.\-\+]/g, '')
    if (cleanedPhone.length < 9) return { data: null } // Trop court pour être pertinent

    let query = supabase
        .from('contacts')
        .select('*')
        .eq('is_active', true)
        // Utilisation de ilike pour s'affranchir un minimum de la casse/formatage basique
        .ilike('phone', `%${phone.trim()}%`)

    if (clientId) {
        query = query.eq('client_id', clientId)
    }

    const { data, error } = await query.limit(1).maybeSingle()

    if (error) {
        console.error('Error searching contact:', error)
        return { error: 'Erreur lors de la recherche du contact.' }
    }

    return { data }
}

export async function quickCreateContact(formData: {
    client_id: string
    store_id?: string
    first_name: string
    last_name: string
    email?: string
    phone: string
    job_title?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    const { data, error } = await supabase
        .from('contacts')
        .insert({
            client_id: formData.client_id,
            store_id: formData.store_id || null,
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email || null,
            phone: formData.phone,
            job_title: formData.job_title || null,
        })
        .select()
        .single()

    if (error) {
        console.error('Error quick creating contact:', error)
        return { error: 'Erreur lors de la création rapide du contact.' }
    }

    return { success: true, data }
}
