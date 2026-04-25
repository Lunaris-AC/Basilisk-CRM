import { createClient } from '@/utils/supabase/client'
import { useQuery } from '@tanstack/react-query'

export interface MiniCentrale {
    id: string
    name: string
    centrale_id: string
    stores: Store[]
    contacts: Contact[]
}

export interface Centrale {
    id: string
    name: string
    client_id: string
    mini_centrales: MiniCentrale[]
    magasins_directs: Store[]
    contacts: Contact[]
}

export interface Store {
    id: string
    name: string
    city: string
    client_id: string
    centrale_id: string | null
    mini_centrale_id: string | null
    contacts: Contact[]
}

export interface Contact {
    id: string
    client_id: string
    centrale_id: string | null
    mini_centrale_id: string | null
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
    centrales: Centrale[]
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
                    centrales!client_id (
                        id,
                        name,
                        client_id,
                        mini_centrales!centrale_id (
                            id,
                            name,
                            centrale_id,
                            stores!mini_centrale_id (
                                id,
                                name,
                                city,
                                client_id,
                                centrale_id,
                                mini_centrale_id,
                                contacts!store_id (
                                    id,
                                    client_id,
                                    centrale_id,
                                    mini_centrale_id,
                                    store_id,
                                    first_name,
                                    last_name,
                                    email,
                                    phone,
                                    job_title,
                                    is_active
                                )
                            ),
                            contacts!mini_centrale_id (
                                id,
                                client_id,
                                centrale_id,
                                mini_centrale_id,
                                store_id,
                                first_name,
                                last_name,
                                email,
                                phone,
                                job_title,
                                is_active
                            )
                        ),
                        magasins_directs:stores!centrale_id (
                            id,
                            name,
                            city,
                            client_id,
                            centrale_id,
                            mini_centrale_id,
                            contacts!store_id (
                                id,
                                client_id,
                                centrale_id,
                                mini_centrale_id,
                                store_id,
                                first_name,
                                last_name,
                                email,
                                phone,
                                job_title,
                                is_active
                            )
                        ),
                        contacts!centrale_id (
                            id,
                            client_id,
                            centrale_id,
                            mini_centrale_id,
                            store_id,
                            first_name,
                            last_name,
                            email,
                            phone,
                            job_title,
                            is_active
                        )
                    ),
                    contacts!client_id (
                        id,
                        client_id,
                        centrale_id,
                        mini_centrale_id,
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

            if (error) {
                console.error("Supabase error details:", {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                })
                throw error
            }
            
            // Post-processing for magasins_directs filtering (those without mini_centrale_id)
            const processedData = data?.map((client: any) => ({
                ...client,
                centrales: client.centrales?.map((centrale: any) => ({
                    ...centrale,
                    magasins_directs: centrale.magasins_directs?.filter((s: any) => !s.mini_centrale_id) || []
                }))
            }))

            return processedData as Client[]
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
