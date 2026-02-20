import { useQuery } from '@tanstack/react-query'
import { getClientsAndStores } from './getClientsAndStores'

export function useClientsAndStores() {
    return useQuery({
        queryKey: ['clients-and-stores'],
        queryFn: getClientsAndStores,
        staleTime: 1000 * 60 * 5, // Cache de 5 minutes
    })
}
