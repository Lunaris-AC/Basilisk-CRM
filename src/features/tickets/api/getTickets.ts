import { createClient } from '@/utils/supabase/client'

export type TicketStatus = 'nouveau' | 'assigne' | 'en_cours' | 'attente_client' | 'suspendu' | 'resolu' | 'ferme'
export type TicketPriority = 'basse' | 'normale' | 'haute' | 'critique'

export interface TicketFilters {
    search?: string
    status?: string | 'all'
    priority?: string | 'all'
    escalation_level?: string | 'all'
    support_level_id?: string | 'all' // SPRINT 26.1
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
    support_level_id: string | null
    support_level: { id: string; name: string; color: string; rank: number } | null
    resume_at: string | null
    created_at: string
    category: 'HL' | 'COMMERCE' | 'SAV' | 'FORMATION' | 'DEV'
    // SPRINT 32 : Champs SLA
    sla_start_at: string | null
    sla_deadline_at: string | null
    sla_paused_at: string | null
    sla_elapsed_minutes: number | null
    client: { id: string; company: string; first_name?: string; last_name?: string; email?: string; phone?: string } | null
    store: { id: string; name: string; city: string } | null
    assignee: { id: string; first_name: string; last_name: string } | null
    creator: { id: string; first_name: string; last_name: string } | null
    contact: { id: string; first_name: string; last_name: string; email: string; phone: string; job_title: string } | null
    commerce_details?: { quote_number: string | null; invoice_number: string | null; service_type: string | null } | null
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
      id, title, description, status, priority, escalation_level, created_at, support_level_id,
      clients (company),
      profiles!tickets_assignee_id_fkey (first_name, last_name),
      support_levels (id, name, color, rank)
    `)
        .neq('category', 'DEV') // Exclure les SD du support classique

    // HOTFIX 29.5 : Récupère les tickets de SON magasin sans filtrer sur client_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, store_id')
        .eq('id', userId)
        .single()

    if (profile?.role === 'CLIENT') {
        if (profile.store_id) {
            query = query.eq('store_id', profile.store_id)
        } else {
            // Fallback en cas de profil sans magasin : on limite à ses propres créations
            query = query.eq('creator_id', userId)
        }
    } else {
        // Logique classique d'assignation
        if (filters?.assignee_id && filters.assignee_id !== 'all') {
            query = query.eq('assignee_id', filters.assignee_id)
        } else if (filters?.assignee_id === 'all') {
            query = query.not('assignee_id', 'is', null)
        } else {
            query = query.eq('assignee_id', userId)
        }
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
      id, title, description, status, priority, escalation_level, created_at, support_level_id,
      clients (company),
      support_levels (id, name, color, rank)
    `)
        .is('assignee_id', null)
        .neq('category', 'DEV') // Exclure les SD de la file d'attente

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

    if (filters?.support_level_id && filters.support_level_id !== 'all') {
        query = query.eq('support_level_id', filters.support_level_id)
    }

    if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return formatTickets(data)
}

// ============== SPRINT 17 : SD (BUGS & ÉVOLUTIONS DEV) ==============

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
      id, title, description, status, priority, escalation_level, created_at, category, support_level_id,
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

    // Filtrage côté client pour les champs de la table d'extension
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
    byLevel: Record<string, number>
    byCategory: { DEV: number; COMMERCE: number; SAV: number; FORMATION: number; HL: number }
}

export const getGlobalStats = async (): Promise<GlobalStats> => {
    const supabase = createClient()

    // Total tickets ouverts (non fermés)
    const { count: totalTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'ferme')

    // Total non affectés
    const { count: totalUnassigned } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .is('assignee_id', null)
        .neq('status', 'ferme')

    // SLA non respectés
    const { count: slaViolations } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'ferme')
        .neq('status', 'resolu')
        .not('sla_deadline_at', 'is', null)
        .lt('sla_deadline_at', new Date().toISOString())

    // Par niveau d'escalade (Dynamique SPRINT 26.1)
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

    // Par catégorie/service
    const categoryCounts = { DEV: 0, COMMERCE: 0, SAV: 0, FORMATION: 0, HL: 0 }
    for (const cat of ['DEV', 'COMMERCE', 'SAV', 'FORMATION', 'HL'] as const) {
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
        byLevel: levelCounts,
        byCategory: categoryCounts,
    }
}

export const getMyStatsByDate = async (userId: string, dateISO?: string): Promise<{ createdCount: number; closedCount: number }> => {
    const supabase = createClient()

    // Calculer début/fin de la journée demandée
    const targetDate = dateISO ? new Date(dateISO) : new Date()
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    // Requête 1 : Créés à cette date par l'utilisateur (creator_id)
    const { count: createdCount, error: err1 } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString())

    if (err1) throw new Error(err1.message)

    // Requête 2 : Fermés à cette date par l'utilisateur (assignee_id)
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

// Garder la compatibilité avec getMyDailyStats existant
export const getMyDailyStats = async (userId: string) => {
    const result = await getMyStatsByDate(userId)
    return { createdToday: result.createdCount, closedToday: result.closedCount }
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

// ============== SPRINT 22 : AUDIT LOGS ==============

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
        role: string
    } | null
}

/**
 * Récupère l'historique des actions (audit logs) d'un ticket.
 */
export async function getTicketAuditLogs(ticketId: string): Promise<AuditLogEntry[]> {
    const supabase = createClient()

    // 1. Fetch audit logs with select('*') for schema flexibility
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

    // 2. Detect the user ID column (could be user_id or author_id etc.)
    const sampleRow = logs[0] as Record<string, any>
    const userIdKey = 'user_id' in sampleRow ? 'user_id'
        : 'author_id' in sampleRow ? 'author_id'
            : 'performed_by' in sampleRow ? 'performed_by'
                : null

    // 3. Batch-fetch profiles for all unique user ids
    let profileMap: Record<string, { first_name: string; last_name: string; role: string }> = {}

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

    // 4. Merge into AuditLogEntry shape
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
