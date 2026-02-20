import { useQuery } from '@tanstack/react-query'
import { getMyTickets, getUnassignedTickets, getMyDailyStats, getTicketById, getCommentsByTicket, getActiveAssignees, TicketFilters } from './getTickets'
import { createClient } from '@/utils/supabase/client'

// Hook utilitaire pour récupérer le UserID
export const useAuthUser = () => {
    return useQuery({
        queryKey: ['authUser'],
        queryFn: async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            return user
        },
        staleTime: Infinity,
    })
}

export const useMyTickets = (filters?: TicketFilters) => {
    const { data: user } = useAuthUser()

    return useQuery({
        queryKey: ['myTickets', user?.id, filters],
        queryFn: () => getMyTickets(user!.id, filters),
        enabled: !!user?.id,
    })
}

export const useUnassignedTickets = (filters?: TicketFilters) => {
    return useQuery({
        queryKey: ['unassignedTickets', filters],
        queryFn: () => getUnassignedTickets(filters),
    })
}

export const useMyDailyStats = () => {
    const { data: user } = useAuthUser()

    return useQuery({
        queryKey: ['myDailyStats', user?.id],
        queryFn: () => getMyDailyStats(user!.id),
        enabled: !!user?.id,
    })
}

// ============== SPRINT 7 : HOOKS DÉTAIL TICKET ==============

export const useTicket = (id: string) => {
    return useQuery({
        queryKey: ['ticket', id],
        queryFn: () => getTicketById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 2,
    })
}

export const useTicketComments = (ticketId: string) => {
    return useQuery({
        queryKey: ['ticketComments', ticketId],
        queryFn: () => getCommentsByTicket(ticketId),
        enabled: !!ticketId,
        staleTime: 1000 * 30, // Rafraîchissement plus fréquent pour le tchat
    })
}

export const useActiveAssignees = () => {
    return useQuery({
        queryKey: ['activeAssignees'],
        queryFn: getActiveAssignees,
        staleTime: 1000 * 60 * 5,
    })
}
