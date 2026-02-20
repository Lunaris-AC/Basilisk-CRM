import { createClient } from '@/utils/supabase/client'
import { useQuery } from '@tanstack/react-query'

export interface Store {
    id: string
    name: string
    city: string
    client_id: string
}

export interface Contact {
    id: string
    client_id: string
    store_id: string | null
    first_name: string
    last_name: string
    email: string
    phone: string
    job_title: string
    is_active: boolean
}

export interface Client {
    id: string
    company: string
    email: string
    phone: string
    stores: Store[]
    contacts: Contact[]
}

export function useClientsWithStores() {
    return useQuery({
        queryKey: ['clients-with-stores'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('clients')
                .select(`
                    id, 
                    company, 
                    email, 
                    phone,
                    stores (
                        id,
                        name,
                        city,
                        client_id
                    ),
                    contacts (
                        id,
                        client_id,
                        store_id,
                        first_name,
                        last_name,
                        email,
                        phone,
                        job_title,
                        is_active
                    )
                `)
                .order('company')

            if (error) throw error
            return data as Client[]
        }
    })
}

// Hook pour récupérer les contacts filtrés par client_id (et optionellement store_id)
export function useContactsByClient(clientId: string | undefined, storeId?: string) {
    return useQuery({
        queryKey: ['contacts-by-client', clientId, storeId],
        queryFn: async () => {
            if (!clientId) return []
            const supabase = createClient()
            let query = supabase
                .from('contacts')
                .select('*')
                .eq('client_id', clientId)
                .eq('is_active', true)
                .order('last_name')

            // Si un store est sélectionné, on récupère les contacts liés à ce store OU globaux (store_id IS NULL)
            if (storeId) {
                query = supabase
                    .from('contacts')
                    .select('*')
                    .eq('client_id', clientId)
                    .eq('is_active', true)
                    .or(`store_id.eq.${storeId},store_id.is.null`)
                    .order('last_name')
            }

            const { data, error } = await query
            if (error) throw error
            return data as Contact[]
        },
        enabled: !!clientId
    })
}
