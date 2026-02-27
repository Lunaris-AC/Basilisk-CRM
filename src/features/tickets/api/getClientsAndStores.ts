import { createClient } from '@/utils/supabase/client'

export type ClientSimple = {
    id: string
    company: string
}

export type StoreSimple = {
    id: string
    client_id: string
    name: string
    city: string | null
}

export async function getClientsAndStores() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { clients: [], stores: [] }

    // Obtenir le profil pour vérifier si l'utilisateur est un CLIENT
    const { data: profile } = await supabase.from('profiles').select('role, store_id').eq('id', user.id).single()

    // SPRINT 29.3: Requête stricte basée sur la liaison direct profil -> magasin (store_id)
    if (profile?.role === 'CLIENT') {
        if (!profile.store_id) {
            return { clients: [], stores: [] }
        }

        const { data: stores, error: storesError } = await supabase
            .from('stores')
            .select('id, client_id, name, city')
            .eq('id', profile.store_id)
            .eq('is_active', true)

        if (storesError) {
            console.error("Erreur getStoresForClient:", storesError)
            return { clients: [], stores: [] }
        }
        return { clients: [], stores: stores as StoreSimple[] }
    }

    // Récupérer les clients actifs (pour Admins, N4, etc.)
    const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, company')
        .eq('is_active', true)
        .order('company', { ascending: true })

    if (clientsError) {
        console.error("Erreur getClients:", clientsError)
        return { clients: [], stores: [] }
    }

    // Récupérer tous les magasins actifs (pour Admins, N4, etc.)
    const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, client_id, name, city')
        .eq('is_active', true)
        .order('name', { ascending: true })

    if (storesError) {
        console.error("Erreur getStores:", storesError)
        return { clients: clients as ClientSimple[], stores: [] }
    }

    return {
        clients: clients as ClientSimple[],
        stores: stores as StoreSimple[]
    }
}
