import { createClient } from '@/utils/supabase/client'

export type TicketStatus = 'nouveau' | 'assigne' | 'en_cours' | 'attente_client' | 'suspendu' | 'resolu' | 'ferme'
export type TicketPriority = 'basse' | 'normale' | 'haute' | 'critique'

export interface TicketFilters {
    search?: string
    status?: string | 'all'
    priority?: string | 'all'
    escalation_level?: string | 'all'
    support_level_id?: string | 'all'
    assignee_id?: string | 'all'
    category?: string | 'all'
    statuses?: string[]
    priorities?: string[]
    support_level_ids?: string[]
    store_ids?: string[]
}

export interface TicketWithRelations {
    id: string
    title: string
    description: string
    status: TicketStatus
    priority: TicketPriority
    escalation_level: number
    support_level_id: string | null
    support_level: { id: string; name: string; color: string; rank: number } | null
    resume_at: string | null
    created_at: string
    updated_at: string
    category: 'HL' | 'COMMERCE' | 'SAV1' | 'SAV2' | 'FORMATION' | 'DEV'
    sla_start_at: string | null
    sla_deadline_at: string | null
    sla_paused_at: string | null
    sla_elapsed_minutes: number | null
    client: { id: string; company: string; first_name?: string; last_name?: string; email?: string; phone?: string } | null
    store: { id: string; name: string; city: string } | null
    assignee: { id: string; first_name: string; last_name: string } | null
    creator: { id: string; first_name: string; last_name: string } | null
    contact: { id: string; first_name: string; last_name: string; email: string; phone: string; job_title: string } | null
    sav_details?: { serial_number: string | null; product_reference: string | null; hardware_status: string | null } | null
    formateur_details?: { travel_date: string | null; training_location: string | null; training_type: string | null } | null
    dev_details?: { type: 'BUG' | 'EVOLUTION'; reproduction_steps: string | null; impact: string | null; need_description: string | null; expected_process: string | null; complexity: string | null } | null
    linked_sd_id?: string | null
    linked_sd?: { id: string; title: string; status: string; priority: string } | null
}

const formatTickets = (data: any[] | null): TicketWithRelations[] => {
    return (data || []).map((ticket: any) => ({
        ...ticket,
        client: ticket.clients ? { company: ticket.clients.company } : null,
        assignee: ticket.profiles ? { first_name: ticket.profiles.first_name, last_name: ticket.profiles.last_name } : null,
        support_level: ticket.support_levels || null
    }))
}

export const getMyTickets = async (userId: string, filters?: TicketFilters): Promise<TicketWithRelations[]> => {
    const supabase = createClient()
    let query = supabase
        .from('tickets')
        .select(`
      id, title, description, status, priority, escalation_level, created_at, updated_at, support_level_id,
      sla_start_at, sla_deadline_at, sla_paused_at, sla_elapsed_minutes,
      clients (company),
      profiles!tickets_assignee_id_fkey (first_name, last_name),
      support_levels (id, name, color, rank)
    `)
        .neq('category', 'DEV')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, store_id')
        .eq('id', userId)
        .single()

    if (profile?.role === 'CLIENT') {
        if (profile.store_id) {
            query = query.eq('store_id', profile.store_id)
        } else {
            query = query.eq('creator_id', userId)
        }
    } else {
        if (filters?.assignee_id && filters.assignee_id !== 'all') {
            query = query.eq('assignee_id', filters.assignee_id)
        } else if (filters?.assignee_id === 'all') {
            query = query.not('assignee_id', 'is', null)
        } else {
            query = query.eq('assignee_id', userId)
        }
    }

    if (filters?.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses)
    } else if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
    } else {
        query = query.neq('status', 'ferme')
    }

    if (filters?.priorities && filters.priorities.length > 0) {
        query = query.in('priority', filters.priorities)
    } else if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority)
    }

    if (filters?.support_level_ids && filters.support_level_ids.length > 0) {
        query = query.in('support_level_id', filters.support_level_ids)
    } else if (filters?.support_level_id && filters.support_level_id !== 'all') {
        query = query.eq('support_level_id', filters.support_level_id)
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

    if (filters?.store_ids && filters.store_ids.length > 0) {
        query = query.in('store_id', filters.store_ids)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return formatTickets(data)
}

export const getUnassignedTickets = async (filters?: TicketFilters, userRolesLevel?: { role: string; support_level_id?: string | null }): Promise<TicketWithRelations[]> => {
    const supabase = createClient()
    
    // SPRINT 50 : ADMIN et STANDARD voient TOUS les tickets (même assignés) dans la file
    const seeAll = userRolesLevel?.role === 'ADMIN' || userRolesLevel?.role === 'STANDARD'

    let query = supabase
        .from('tickets')
        .select(`
      id, title, description, status, priority, escalation_level, created_at, updated_at, support_level_id,
      sla_start_at, sla_deadline_at, sla_paused_at, sla_elapsed_minutes,
      clients (company),
      profiles!tickets_assignee_id_fkey (first_name, last_name),
      support_levels (id, name, color, rank)
    `)
        .neq('category', 'DEV')

    if (!seeAll) {
        query = query.is('assignee_id', null)
    }

    if (userRolesLevel && userRolesLevel.role === 'TECHNICIEN') {
        if (userRolesLevel.support_level_id) {
            query = query.or(`support_level_id.eq.${userRolesLevel.support_level_id},support_level_id.is.null`)
        } else {
             query = query.is('support_level_id', null)
        }
    }

    if (filters?.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses)
    } else if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
    } else {
        query = query.neq('status', 'ferme')
    }

    if (filters?.priorities && filters.priorities.length > 0) {
        query = query.in('priority', filters.priorities)
    } else if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority)
    }

    if (filters?.support_level_ids && filters.support_level_ids.length > 0) {
        query = query.in('support_level_id', filters.support_level_ids)
    } else if (filters?.support_level_id && filters.support_level_id !== 'all') {
        query = query.eq('support_level_id', filters.support_level_id)
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

    if (filters?.store_ids && filters.store_ids.length > 0) {
        query = query.in('store_id', filters.store_ids)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    const formatted = formatTickets(data)

    return formatted.sort((a, b) => {
        if (a.status === 'resolu' && b.status !== 'resolu') return 1
        if (a.status !== 'resolu' && b.status === 'resolu') return -1
        return 0
    })
}

export interface SDFilters {
    search?: string
    sd_type?: 'BUG' | 'EVOLUTION' | 'all'
    complexity?: string | 'all'
    status?: string | 'all'
}

export const getSDs = async (filters?: SDFilters): Promise<TicketWithRelations[]> => {
    const supabase = createClient()
    let query = supabase
        .from('tickets')
        .select(`
      id, title, description, status, priority, escalation_level, created_at, updated_at, category, support_level_id,
      sla_start_at, sla_deadline_at, sla_paused_at, sla_elapsed_minutes,
      clients (company),
      creator:profiles!tickets_creator_id_fkey (id, first_name, last_name),
      assignee:profiles!tickets_assignee_id_fkey (id, first_name, last_name),
      support_levels (id, name, color, rank),
      dev_details:ticket_dev_details (
          type, reproduction_steps, impact, need_description, expected_process, complexity
      )
    `)
        .eq('category', 'DEV')

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
    } else {
        query = query.neq('status', 'ferme')
    }

    if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    let results = (data || []) as unknown as TicketWithRelations[]

    if (filters?.sd_type && filters.sd_type !== 'all') {
        results = results.filter(t => t.dev_details?.type === filters.sd_type)
    }
    if (filters?.complexity && filters.complexity !== 'all') {
        results = results.filter(t => t.dev_details?.complexity === filters.complexity)
    }

    return results
}

export interface GlobalStats {
    totalTickets: number
    totalUnassigned: number
    slaViolations: number
    deltaTickets: number 
    byLevel: Record<string, number>
    byCategory: { DEV: number; SAV1: number; SAV2: number; FORMATION: number; HL: number; COMMERCE: number }
}

export const getGlobalStats = async (): Promise<GlobalStats> => {
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const { count: totalTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'ferme')

    const { count: createdToday } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO)

    const { count: closedToday } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .gte('closed_at', todayISO)

    const deltaTickets = (createdToday || 0) - (closedToday || 0)

    const { count: totalUnassigned } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .is('assignee_id', null)
        .neq('status', 'ferme')

    const { count: slaViolations } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'ferme')
        .neq('status', 'resolu')
        .not('sla_deadline_at', 'is', null)
        .lt('sla_deadline_at', new Date().toISOString())

    const { data: levels } = await supabase
        .from('support_levels')
        .select('id, name')
        .eq('is_active', true)
        .order('rank', { ascending: true })

    const levelCounts: Record<string, number> = {}
    if (levels) {
        for (const level of levels) {
            const { count } = await supabase
                .from('tickets')
                .select('*', { count: 'exact', head: true })
                .eq('support_level_id', level.id)
                .neq('status', 'ferme')
            levelCounts[level.name] = count || 0
        }
    }

    const categoryCounts: any = { DEV: 0, SAV1: 0, SAV2: 0, FORMATION: 0, HL: 0, COMMERCE: 0 }
    for (const cat of ['DEV', 'SAV1', 'SAV2', 'FORMATION', 'HL', 'COMMERCE'] as const) {
        const { count } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('category', cat)
            .neq('status', 'ferme')
        categoryCounts[cat] = count || 0
    }

    return {
        totalTickets: totalTickets || 0,
        totalUnassigned: totalUnassigned || 0,
        slaViolations: slaViolations || 0,
        deltaTickets,
        byLevel: levelCounts,
        byCategory: categoryCounts,
    }
}

export const getMyStatsByDate = async (userId: string, dateISO?: string): Promise<{ createdCount: number; closedCount: number }> => {
    const supabase = createClient()
    const targetDate = dateISO ? new Date(dateISO) : new Date()
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    const { count: createdCount, error: err1 } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString())

    if (err1) throw new Error(err1.message)

    const { count: closedCount, error: err2 } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', userId)
        .eq('status', 'ferme')
        .gte('updated_at', dayStart.toISOString())
        .lte('updated_at', dayEnd.toISOString())

    if (err2) throw new Error(err2.message)

    return {
        createdCount: createdCount || 0,
        closedCount: closedCount || 0
    }
}

export const getMyDailyStats = async (userId: string) => {
    const result = await getMyStatsByDate(userId)
    return { createdToday: result.createdCount, closedToday: result.closedCount }
}

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
        role: string;
        support_level?: string
    }
}

export async function getTicketById(id: string): Promise<TicketWithRelations | null> {
    const supabase = createClient()

    const { data: ticket, error } = await supabase
        .from('tickets')
        .select(`
            id, title, description, status, priority, escalation_level, created_at, updated_at, category,
            linked_sd_id, support_level_id,
            sla_start_at, sla_deadline_at, sla_paused_at, sla_elapsed_minutes,
            support_level:support_levels (id, name, color, rank),
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
            sav_details:ticket_sav_details (
                serial_number,
                product_reference,
                hardware_status
            ),
            formateur_details:ticket_formateur_details (
                travel_date,
                training_location,
                training_type
            ),
            dev_details:ticket_dev_details (
                type,
                reproduction_steps,
                impact,
                need_description,
                expected_process,
                complexity
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

export interface AuditLogEntry {
    id: string
    ticket_id: string
    user_id: string | null
    action: string
    details: Record<string, any>
    created_at: string
    user: {
        first_name: string
        last_name: string
        role: string;
        support_level?: string
    } | null
}

export async function getTicketAuditLogs(ticketId: string): Promise<AuditLogEntry[]> {
    const supabase = createClient()

    const { data: logs, error } = await supabase
        .from('ticket_audit_logs')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Erreur getTicketAuditLogs:', JSON.stringify(error, null, 2))
        return []
    }

    if (!logs || logs.length === 0) return []

    const sampleRow = logs[0] as Record<string, any>
    const userIdKey = 'user_id' in sampleRow ? 'user_id'
        : 'author_id' in sampleRow ? 'author_id'
            : 'performed_by' in sampleRow ? 'performed_by'
                : null

    let profileMap: Record<string, { first_name: string; last_name: string; role: string; support_level?: string }> = {}

    if (userIdKey) {
        const userIds = [...new Set(logs.map(l => (l as any)[userIdKey]).filter(Boolean))] as string[]

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, role')
                .in('id', userIds)

            if (profiles) {
                profileMap = Object.fromEntries(profiles.map(p => [p.id, { first_name: p.first_name, last_name: p.last_name, role: p.role }]))
            }
        }
    }

    return logs.map((log: any) => ({
        id: log.id,
        ticket_id: log.ticket_id,
        user_id: userIdKey ? log[userIdKey] : null,
        action: log.action || log.event_type || 'unknown',
        details: log.details || log.metadata || {},
        created_at: log.created_at,
        user: userIdKey && log[userIdKey] ? profileMap[log[userIdKey]] || null : null,
    }))
}
