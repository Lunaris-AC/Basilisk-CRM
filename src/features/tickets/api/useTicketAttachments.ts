import { useQuery } from '@tanstack/react-query'
import { getTicketAttachments } from './getTicketAttachments'

export function useTicketAttachments(ticketId: string) {
    return useQuery({
        queryKey: ['ticket-attachments', ticketId],
        queryFn: () => getTicketAttachments(ticketId),
        enabled: !!ticketId,
        staleTime: 1000 * 60, // 1 minute
    })
}
