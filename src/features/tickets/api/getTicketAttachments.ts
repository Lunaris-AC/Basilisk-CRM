import { createClient } from '@/utils/supabase/client'

export type TicketAttachment = {
    id: string;
    ticket_id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    created_at: string;
}

export async function getTicketAttachments(ticketId: string): Promise<TicketAttachment[]> {
    const supabase = createClient()

    const { data: attachments, error } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Erreur getTicketAttachments:", error)
        return []
    }

    return attachments as TicketAttachment[]
}
