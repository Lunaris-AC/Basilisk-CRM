import { createClient } from '@/utils/supabase/client'

export type TicketStatus = 'nouveau' | 'assigne' | 'en_cours' | 'attente_client' | 'suspendu' | 'resolu' | 'ferme'
export type TicketPriority = 'basse' | 'normale' | 'haute' | 'critique'

export interface TicketFilters {
    search?: string
    status?: string | 'all'
    priority?: string | 'all'
    escalation_level?: string | 'all'
    assignee_id?: string | 'all'
    category?: string | 'all'
}

export interface TicketWithRelations {
    id: string
    title: string
    description: string
    status: TicketStatus
    priority: TicketPriority
    escalation_level: number
    resume_at: string | null
    created_at: string
    category: 'HL' | 'COMMERCE' | 'SAV' | 'FORMATION'
    client: { id: string; company: string; first_name?: string; last_name?: string; email?: string; phone?: string } | null
    store: { id: string; name: string; city: string } | null
    assignee: { id: string; first_name: string; last_name: string } | null
    creator: { id: string; first_name: string; last_name: string } | null
    contact: { id: string; first_name: string; last_name: string; email: string; phone: string; job_title: string } | null
    commerce_details?: { quote_number: string | null; invoice_number: string | null; service_type: string | null } | null
    sav_details?: { serial_number: string | null; product_reference: string | null; hardware_status: string | null } | null
    formateur_details?: { travel_date: string | null; training_location: string | null; training_type: string | null } | null
}

const formatTickets = (data: any[] | null): TicketWithRelations[] => {
    return (data || []).map((ticket: any) => ({
        ...ticket,
        client: ticket.clients ? { company: ticket.clients.company } : null,
        assignee: ticket.profiles ? { first_name: ticket.profiles.first_name, last_name: ticket.profiles.last_name } : null,
    }))
}

export const getMyTickets = async (userId: string, filters?: TicketFilters): Promise<TicketWithRelations[]> => {
    const supabase = createClient()
    let query = supabase
        .from('tickets')
        .select(`
      id, title, description, status, priority, escalation_level, created_at,
      clients (company),
      profiles!tickets_assignee_id_fkey (first_name, last_name)
      profiles!tickets_assignee_id_fkey (first_name, last_name)
    `)

    if (filters?.assignee_id && filters.assignee_id !== 'all') {
        query = query.eq('assignee_id', filters.assignee_id)
    } else if (filters?.assignee_id === 'all') {
        query = query.not('assignee_id', 'is', null)
    } else {
        query = query.eq('assignee_id', userId)
    }

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
    } else {
        query = query.neq('status', 'ferme')
    }

    if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority)
    }

    if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`)
    }

    if (filters?.escalation_level && filters.escalation_level !== 'all') {
        query = query.eq('escalation_level', parseInt(filters.escalation_level, 10))
    }

    if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return formatTickets(data)
}

export const getUnassignedTickets = async (filters?: TicketFilters): Promise<TicketWithRelations[]> => {
    const supabase = createClient()
    let query = supabase
        .from('tickets')
        .select(`
      id, title, description, status, priority, escalation_level, created_at,
      clients (company),
      profiles!tickets_assignee_id_fkey (first_name, last_name)
    `)
        .is('assignee_id', null)

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
    } else {
        query = query.neq('status', 'ferme')
    }

    if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority)
    }

    if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`)
    }

    if (filters?.escalation_level && filters.escalation_level !== 'all') {
        query = query.eq('escalation_level', parseInt(filters.escalation_level, 10))
    }

    if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return formatTickets(data)
}

export const getMyDailyStats = async (userId: string): Promise<{ createdToday: number; closedToday: number }> => {
    const supabase = createClient()

    // Obtenir le début de la journée courante au format ISO
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()

    // Requête 1 : Créés aujourd'hui par l'utilisateur (creator_id)
    const { count: createdToday, error: err1 } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId)
        .gte('created_at', todayISO)

    if (err1) throw new Error(err1.message)

    // Requête 2 : Fermés aujourd'hui par l'utilisateur (assignee_id)
    const { count: closedToday, error: err2 } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', userId)
        .eq('status', 'ferme')
        .gte('updated_at', todayISO)

    if (err2) throw new Error(err2.message)

    return {
        createdToday: createdToday || 0,
        closedToday: closedToday || 0
    }
}

// ============== SPRINT 7 : DÉTAIL TICKET ET COMMENTAIRES ==============

export interface TicketComment {
    id: string
    ticket_id: string
    author_id: string
    content: string
    is_internal: boolean
    created_at: string
    author: {
        first_name: string
        last_name: string
        role: string
    }
}

/**
 * Récupère un ticket précis avec toutes ses relations.
 */
export async function getTicketById(id: string): Promise<TicketWithRelations | null> {
    const supabase = createClient()

    const { data: ticket, error } = await supabase
        .from('tickets')
        .select(`
            id, title, description, status, priority, escalation_level, created_at, category,
            client:clients (
                id,
                company,
                first_name,
                last_name,
                email,
                phone
            ),
            store:stores (
                id,
                name,
                city
            ),
            creator:profiles!tickets_creator_id_fkey (
                id,
                first_name,
                last_name
            ),
            assignee:profiles!tickets_assignee_id_fkey (
                id,
                first_name,
                last_name
            ),
            contact:contacts (
                id,
                first_name,
                last_name,
                email,
                phone,
                job_title
            ),
            commerce_details:ticket_commerce_details (
                quote_number,
                invoice_number,
                service_type
            ),
            sav_details:ticket_sav_details (
                serial_number,
                product_reference,
                hardware_status
            ),
            formateur_details:ticket_formateur_details (
                travel_date,
                training_location,
                training_type
            )
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error("Erreur getTicketById:", error)
        throw new Error(error.message)
    }

    return ticket as unknown as TicketWithRelations
}

/**
 * Récupère le fil de discussion (commentaires et notes) d'un ticket.
 */
export async function getCommentsByTicket(ticketId: string): Promise<TicketComment[]> {
    const supabase = createClient()

    const { data: comments, error } = await supabase
        .from('ticket_comments')
        .select(`
            id,
            ticket_id,
            author_id,
            content,
            is_internal,
            created_at,
            author:profiles!ticket_comments_author_id_fkey (
                first_name,
                last_name,
                role
            )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error("Erreur getCommentsByTicket:", error)
        throw new Error(error.message)
    }

    return comments as unknown as TicketComment[]
}

/**
 * Récupère la liste des profils pouvant être assignés à un ticket (actifs, et potentiellement certains rôles)
 */
export async function getActiveAssignees() {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('is_active', true)
        .order('first_name')

    if (error) throw new Error(error.message)
    return data
}
