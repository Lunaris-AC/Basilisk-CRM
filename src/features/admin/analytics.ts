import { createClient } from '@/utils/supabase/client'

// ======================== TYPES ========================

export interface GlobalMetrics {
    avgResolutionHours: number | null    // Temps moyen de résolution en heures
    slaComplianceRate: number            // Taux de respect SLA (0-100)
    totalActive: number
    closedLast30d: number
    volumeByCategory: { name: string; value: number }[]
}

export interface AgentPerformance {
    id: string
    first_name: string
    last_name: string
    role: string
    ticketsInProgress: number
    resolvedThisMonth: number
    avgResolutionHours: number | null
    slaRate: number // 0-100
}

export interface ClientDistribution {
    company: string
    ticketCount: number
}

export interface TrendPoint {
    date: string   // 'DD/MM'
    created: number
    closed: number
}

// ======================== HELPERS ========================

function diffHours(start: string, end: string): number {
    return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60)
}

// ======================== SERVER ACTIONS ========================

/**
 * 1. Métriques Globales
 */
export async function getGlobalMetrics(): Promise<GlobalMetrics> {
    const supabase = createClient()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Tickets fermés (pour calcul temps moyen et SLA)
    const { data: closedTickets } = await supabase
        .from('tickets')
        .select('created_at, updated_at, sla_deadline_at')
        .eq('status', 'ferme')
        .gte('updated_at', thirtyDaysAgo.toISOString())

    // Temps moyen de résolution
    let avgResolutionHours: number | null = null
    if (closedTickets && closedTickets.length > 0) {
        const totalHours = closedTickets.reduce((sum, t) => sum + diffHours(t.created_at, t.updated_at), 0)
        avgResolutionHours = Math.round((totalHours / closedTickets.length) * 10) / 10
    }

    // Taux de respect SLA
    let slaComplianceRate = 100
    if (closedTickets && closedTickets.length > 0) {
        const withSla = closedTickets.filter(t => t.sla_deadline_at)
        if (withSla.length > 0) {
            const respected = withSla.filter(t => new Date(t.updated_at) <= new Date(t.sla_deadline_at!))
            slaComplianceRate = Math.round((respected.length / withSla.length) * 100)
        }
    }

    // Total actifs
    const { count: totalActive } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'ferme')

    // Fermés sur 30j
    const closedLast30d = closedTickets?.length ?? 0

    // Volume par catégorie (actifs)
    const categories = ['HL', 'COMMERCE', 'SAV', 'FORMATION', 'DEV'] as const
    const volumeByCategory: { name: string; value: number }[] = []
    for (const cat of categories) {
        const { count } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('category', cat)
            .neq('status', 'ferme')
        volumeByCategory.push({ name: cat, value: count || 0 })
    }

    return {
        avgResolutionHours,
        slaComplianceRate,
        totalActive: totalActive || 0,
        closedLast30d,
        volumeByCategory,
    }
}

/**
 * 2. Performance des Agents
 */
export async function getAgentPerformance(): Promise<AgentPerformance[]> {
    const supabase = createClient()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Tous les profils actifs (pas STANDARD)
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('is_active', true)
        .neq('role', 'STANDARD')
        .order('first_name')

    if (!profiles) return []

    const results: AgentPerformance[] = []

    for (const p of profiles) {
        // Tickets en cours
        const { count: inProgress } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('assignee_id', p.id)
            .not('status', 'in', '("resolu","ferme")')

        // Résolus ce mois
        const { data: resolvedThisMonth } = await supabase
            .from('tickets')
            .select('created_at, updated_at, sla_deadline_at')
            .eq('assignee_id', p.id)
            .eq('status', 'ferme')
            .gte('updated_at', monthStart.toISOString())

        const resolved = resolvedThisMonth || []

        // Temps moyen
        let avgRes: number | null = null
        if (resolved.length > 0) {
            const total = resolved.reduce((s, t) => s + diffHours(t.created_at, t.updated_at), 0)
            avgRes = Math.round((total / resolved.length) * 10) / 10
        }

        // Taux SLA
        let slaRate = 100
        const withSla = resolved.filter(t => t.sla_deadline_at)
        if (withSla.length > 0) {
            const ok = withSla.filter(t => new Date(t.updated_at) <= new Date(t.sla_deadline_at!))
            slaRate = Math.round((ok.length / withSla.length) * 100)
        }

        results.push({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            role: p.role,
            ticketsInProgress: inProgress || 0,
            resolvedThisMonth: resolved.length,
            avgResolutionHours: avgRes,
            slaRate,
        })
    }

    // Tri par tickets résolus ce mois (desc)
    return results.sort((a, b) => b.resolvedThisMonth - a.resolvedThisMonth)
}

/**
 * 3. Top 5 Clients
 */
export async function getClientDistribution(): Promise<ClientDistribution[]> {
    const supabase = createClient()

    // Récupérer tous les tickets avec client (non fermés et fermés récents)
    const { data: tickets } = await supabase
        .from('tickets')
        .select('client_id, clients (company)')
        .not('client_id', 'is', null)

    if (!tickets) return []

    // Compter par client
    const map: Record<string, { company: string; count: number }> = {}
    for (const t of tickets as any[]) {
        const cid = t.client_id
        const company = t.clients?.company || 'Inconnu'
        if (!map[cid]) map[cid] = { company, count: 0 }
        map[cid].count++
    }

    return Object.values(map)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(c => ({ company: c.company, ticketCount: c.count }))
}

/**
 * 4. Tendance sur 30 jours (créés vs fermés par jour)
 */
export async function getTicketsTrend(): Promise<TrendPoint[]> {
    const supabase = createClient()
    const now = new Date()
    const points: TrendPoint[] = []

    for (let i = 29; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

        const { count: created } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', dayStart.toISOString())
            .lte('created_at', dayEnd.toISOString())

        const { count: closed } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ferme')
            .gte('updated_at', dayStart.toISOString())
            .lte('updated_at', dayEnd.toISOString())

        points.push({
            date: `${dayStart.getDate().toString().padStart(2, '0')}/${(dayStart.getMonth() + 1).toString().padStart(2, '0')}`,
            created: created || 0,
            closed: closed || 0,
        })
    }

    return points
}

// ======================== SPRINT 20 : AGENT DRILL-DOWN ========================

export interface AgentDetailedStats {
    trendLast30d: { date: string; closed: number }[]
    byPriority: { name: string; value: number }[]
    velocityIndex: number | null   // % plus rapide/lent que la moyenne
    recentTickets: { id: string; title: string; status: string; created_at: string; category: string }[]
}

/**
 * Statistiques approfondies pour un agent donné.
 */
export async function getAgentDetailedStats(userId: string): Promise<AgentDetailedStats> {
    const supabase = createClient()
    const now = new Date()

    // 1. Trend 30 jours (fermés par jour)
    const trendLast30d: { date: string; closed: number }[] = []
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

        const { count } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('assignee_id', userId)
            .eq('status', 'ferme')
            .gte('updated_at', dayStart.toISOString())
            .lte('updated_at', dayEnd.toISOString())

        trendLast30d.push({
            date: `${dayStart.getDate().toString().padStart(2, '0')}/${(dayStart.getMonth() + 1).toString().padStart(2, '0')}`,
            closed: count || 0,
        })
    }

    // 2. Par priorité (tous les tickets assignés non fermés + fermés récents)
    const priorities = ['basse', 'normale', 'haute', 'critique'] as const
    const byPriority: { name: string; value: number }[] = []
    for (const prio of priorities) {
        const { count } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('assignee_id', userId)
            .eq('priority', prio)
        byPriority.push({ name: prio.charAt(0).toUpperCase() + prio.slice(1), value: count || 0 })
    }

    // 3. Vélocité : temps moyen de l'agent vs moyenne globale
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const { data: agentClosed } = await supabase
        .from('tickets')
        .select('created_at, updated_at')
        .eq('assignee_id', userId)
        .eq('status', 'ferme')
        .gte('updated_at', thirtyDaysAgo.toISOString())

    const { data: allClosed } = await supabase
        .from('tickets')
        .select('created_at, updated_at')
        .eq('status', 'ferme')
        .gte('updated_at', thirtyDaysAgo.toISOString())

    let velocityIndex: number | null = null
    if (agentClosed && agentClosed.length > 0 && allClosed && allClosed.length > 0) {
        const agentAvg = agentClosed.reduce((s, t) => s + diffHours(t.created_at, t.updated_at), 0) / agentClosed.length
        const globalAvg = allClosed.reduce((s, t) => s + diffHours(t.created_at, t.updated_at), 0) / allClosed.length
        if (globalAvg > 0) velocityIndex = Math.round(((globalAvg - agentAvg) / globalAvg) * 100)
    }

    // 4. Derniers tickets
    const { data: recentRaw } = await supabase
        .from('tickets')
        .select('id, title, status, created_at, category')
        .eq('assignee_id', userId)
        .order('updated_at', { ascending: false })
        .limit(5)

    const recentTickets = (recentRaw || []).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        created_at: t.created_at,
        category: t.category,
    }))

    return { trendLast30d, byPriority, velocityIndex, recentTickets }
}
