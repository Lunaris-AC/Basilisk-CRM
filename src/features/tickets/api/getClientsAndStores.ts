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

    // Récupérer les clients actifs
    const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, company')
        .eq('is_active', true)
        .order('company', { ascending: true })

    if (clientsError) {
        console.error("Erreur getClients:", clientsError)
        return { clients: [], stores: [] }
    }

    // Récupérer les magasins actifs
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
