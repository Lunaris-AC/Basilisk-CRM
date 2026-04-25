'use server'

import { createClient } from '@/utils/supabase/server'

export async function createEnseigne(formData: { company: string; email?: string; phone?: string; address?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    const { error } = await supabase
        .from('clients')
        .insert({
            company: formData.company,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null,
        })

    if (error) {
        console.error('Error creating enseigne:', error)
        return { error: 'Erreur lors de la création de l\'enseigne.' }
    }

    return { success: true }
}

export async function createCentrale(formData: { client_id: string; name: string; city?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    const { error } = await supabase
        .from('centrales')
        .insert({
            client_id: formData.client_id,
            name: formData.name,
            city: formData.city || null,
        })

    if (error) {
        console.error('Error creating centrale:', error)
        return { error: 'Erreur lors de la création de la centrale.' }
    }

    return { success: true }
}

export async function createMiniCentrale(formData: { centrale_id: string; name: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    const { error } = await supabase
        .from('mini_centrales')
        .insert({
            centrale_id: formData.centrale_id,
            name: formData.name,
        })

    if (error) {
        console.error('Error creating mini centrale:', error)
        return { error: 'Erreur lors de la création de la mini-centrale.' }
    }

    return { success: true }
}

export async function createStore(formData: { 
    client_id: string; 
    centrale_id?: string; 
    mini_centrale_id?: string; 
    name: string; 
    city?: string 
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    const { error } = await supabase
        .from('stores')
        .insert({
            client_id: formData.client_id,
            centrale_id: formData.centrale_id || null,
            mini_centrale_id: formData.mini_centrale_id || null,
            name: formData.name,
            city: formData.city || null,
        })

    if (error) {
        console.error('Error creating store:', error)
        return { error: 'Erreur lors de la création du magasin.' }
    }

    return { success: true }
}

export async function addContact(formData: {
    client_id: string
    centrale_id?: string
    mini_centrale_id?: string
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
            centrale_id: formData.centrale_id || null,
            mini_centrale_id: formData.mini_centrale_id || null,
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
    centrale_id?: string
    mini_centrale_id?: string
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
            centrale_id: formData.centrale_id || null,
            mini_centrale_id: formData.mini_centrale_id || null,
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

export async function getClientsForSelect() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.', data: [] }

    const { data, error } = await supabase
        .from('clients')
        .select('id, company')
        .order('company')

    if (error) {
        console.error("Erreur [getClientsForSelect]:", error)
        return { error: 'Échec de la récupération des clients.', data: [] }
    }

    return { success: true, data: data || [] }
}
