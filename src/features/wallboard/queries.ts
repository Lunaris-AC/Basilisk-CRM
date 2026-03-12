import { createClient } from '@/utils/supabase/client'

// ============================================================
// SPRINT 51 : Wallboard — Queries temps réel pour le kiosque TV
// ============================================================

/** Ticket simplifié pour l'affichage wallboard */
export interface WallboardTicket {
    id: string
    title: string
    status: string
    priority: string
    created_at: string
    sla_start_at: string | null
    sla_deadline_at: string | null
    sla_paused_at: string | null
    sla_elapsed_minutes: number | null
    client_company: string
    store_name: string
    assignee_first_name: string | null
    assignee_last_name: string | null
    assignee_id: string | null
}

export interface TopResolver {
    assignee_id: string
    first_name: string
    last_name: string
    avatar_url: string | null
    resolved_count: number
}

// ─── 1. Tickets critiques non résolus (pour bandeau + vue 1) ────────────────

export async function getCriticalTickets(): Promise<WallboardTicket[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('tickets')
        .select(`
            id, title, status, priority, created_at,
            sla_start_at, sla_deadline_at, sla_paused_at, sla_elapsed_minutes,
            assignee_id,
            clients (company),
            stores:store_id (name),
            assignee:profiles!tickets_assignee_id_fkey (first_name, last_name)
        `)
        .eq('priority', 'critique')
        .not('status', 'in', '(resolu,ferme)')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('[Wallboard] getCriticalTickets error:', error)
        return []
    }

    return (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        created_at: t.created_at,
        sla_start_at: t.sla_start_at,
        sla_deadline_at: t.sla_deadline_at,
        sla_paused_at: t.sla_paused_at,
        sla_elapsed_minutes: t.sla_elapsed_minutes,
        client_company: t.clients?.company ?? 'Inconnu',
        store_name: t.stores?.name ?? '',
        assignee_first_name: t.assignee?.first_name ?? null,
        assignee_last_name: t.assignee?.last_name ?? null,
        assignee_id: t.assignee_id,
    }))
}

// ─── 2. Tickets avec SLA dépassé (pour bandeau d'alerte) ───────────────────

export async function getBreachedSlaTickets(): Promise<WallboardTicket[]> {
    const supabase = createClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
        .from('tickets')
        .select(`
            id, title, status, priority, created_at,
            sla_start_at, sla_deadline_at, sla_paused_at, sla_elapsed_minutes,
            assignee_id,
            clients (company),
            stores:store_id (name),
            assignee:profiles!tickets_assignee_id_fkey (first_name, last_name)
        `)
        .not('status', 'in', '(resolu,ferme,attente_client,suspendu)')
        .not('sla_deadline_at', 'is', null)
        .lt('sla_deadline_at', now)
        .order('sla_deadline_at', { ascending: true })

    if (error) {
        console.error('[Wallboard] getBreachedSlaTickets error:', error)
        return []
    }

    return (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        created_at: t.created_at,
        sla_start_at: t.sla_start_at,
        sla_deadline_at: t.sla_deadline_at,
        sla_paused_at: t.sla_paused_at,
        sla_elapsed_minutes: t.sla_elapsed_minutes,
        client_company: t.clients?.company ?? 'Inconnu',
        store_name: t.stores?.name ?? '',
        assignee_first_name: t.assignee?.first_name ?? null,
        assignee_last_name: t.assignee?.last_name ?? null,
        assignee_id: t.assignee_id,
    }))
}

// ─── 3. Tickets non assignés / nouveaux (Vue 0 — compteur) ─────────────────

export async function getUnassignedCount(): Promise<number> {
    const supabase = createClient()

    const { count, error } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['nouveau'])
        .is('assignee_id', null)

    if (error) {
        console.error('[Wallboard] getUnassignedCount error:', error)
        return 0
    }

    return count ?? 0
}

// ─── 4. Top 5 tickets dont le SLA expire en premier (Vue 0) ────────────────

export async function getSlaExpiringTickets(): Promise<WallboardTicket[]> {
    const supabase = createClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
        .from('tickets')
        .select(`
            id, title, status, priority, created_at,
            sla_start_at, sla_deadline_at, sla_paused_at, sla_elapsed_minutes,
            assignee_id,
            clients (company),
            stores:store_id (name),
            assignee:profiles!tickets_assignee_id_fkey (first_name, last_name)
        `)
        .not('status', 'in', '(resolu,ferme,attente_client,suspendu)')
        .not('sla_deadline_at', 'is', null)
        .gt('sla_deadline_at', now)
        .order('sla_deadline_at', { ascending: true })
        .limit(5)

    if (error) {
        console.error('[Wallboard] getSlaExpiringTickets error:', error)
        return []
    }

    return (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        created_at: t.created_at,
        sla_start_at: t.sla_start_at,
        sla_deadline_at: t.sla_deadline_at,
        sla_paused_at: t.sla_paused_at,
        sla_elapsed_minutes: t.sla_elapsed_minutes,
        client_company: t.clients?.company ?? 'Inconnu',
        store_name: t.stores?.name ?? '',
        assignee_first_name: t.assignee?.first_name ?? null,
        assignee_last_name: t.assignee?.last_name ?? null,
        assignee_id: t.assignee_id,
    }))
}

// ─── 5. Top résolveurs du jour (Vue 2 — Hall of Fame) ──────────────────────

export async function getTopResolversToday(): Promise<TopResolver[]> {
    const supabase = createClient()

    // Début de la journée (minuit)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Tickets résolus/fermés aujourd'hui
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('assignee_id')
        .in('status', ['resolu', 'ferme'])
        .gte('updated_at', todayISO)
        .not('assignee_id', 'is', null)

    if (error || !tickets) {
        console.error('[Wallboard] getTopResolversToday error:', error)
        return []
    }

    // Grouper par assignee_id
    const countMap: Record<string, number> = {}
    for (const t of tickets) {
        if (t.assignee_id) {
            countMap[t.assignee_id] = (countMap[t.assignee_id] || 0) + 1
        }
    }

    // Trier par count décroissant, top 3
    const topIds = Object.entries(countMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)

    if (topIds.length === 0) return []

    // Récupérer les profils
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', topIds.map(([id]) => id))

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    return topIds.map(([id, count]) => {
        const profile = profileMap.get(id)
        return {
            assignee_id: id,
            first_name: profile?.first_name ?? 'Inconnu',
            last_name: profile?.last_name ?? '',
            avatar_url: profile?.avatar_url ?? null,
            resolved_count: count,
        }
    })
}
