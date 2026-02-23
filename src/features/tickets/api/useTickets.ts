import { useQuery } from '@tanstack/react-query'
import { getMyTickets, getUnassignedTickets, getMyDailyStats, getMyStatsByDate, getGlobalStats, getTicketById, getCommentsByTicket, getActiveAssignees, getSDs, TicketFilters, SDFilters } from './getTickets'
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

// ============== SPRINT 18 : HOOKS ANALYTICS ==============

export const useGlobalStats = () => {
    return useQuery({
        queryKey: ['globalStats'],
        queryFn: getGlobalStats,
        staleTime: 1000 * 60 * 2,
    })
}

export const useMyStatsByDate = (dateISO?: string) => {
    const { data: user } = useAuthUser()

    return useQuery({
        queryKey: ['myStatsByDate', user?.id, dateISO],
        queryFn: () => getMyStatsByDate(user!.id, dateISO),
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
        staleTime: 1000 * 30,
    })
}

export const useActiveAssignees = () => {
    return useQuery({
        queryKey: ['activeAssignees'],
        queryFn: getActiveAssignees,
        staleTime: 1000 * 60 * 5,
    })
}

// ============== SPRINT 17 : HOOKS SD ==============

export const useSDs = (filters?: SDFilters) => {
    return useQuery({
        queryKey: ['sds', filters],
        queryFn: () => getSDs(filters),
    })
}
