'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import {
    getGlobalMetrics, getAgentPerformance, getClientDistribution, getTicketsTrend,
    getBacklogAging, getTopOffendersStores, getTopOffendersEquipments, getAgentSparklines, getCategoryStatusMatrix,
    GlobalMetrics, AgentPerformance, ClientDistribution, TrendPoint,
    BacklogAgingPoint, TopOffenderItem, CategoryStatusItem,
} from '@/features/admin/analytics'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts'
import { Clock, ShieldCheck, Activity, CheckCircle, Loader2, Eye, Crown, Flame } from 'lucide-react'
import { AgentAnalyticsDrawer } from '@/features/admin/components/AgentAnalyticsDrawer'
import { BacklogAgingChart } from '@/features/admin/components/BacklogAgingChart'
import { TopOffendersChart } from '@/features/admin/components/TopOffendersChart'
import { TicketsByPriorityAndStatus } from '@/features/admin/components/TicketsByPriorityAndStatus'

const NEON_COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#a855f7', '#10b981']

export default function AdminAnalyticsPage() {
    const router = useRouter()
    const [authorized, setAuthorized] = useState<boolean | null>(null)

    // Vérifier rôle ADMIN côté client
    useEffect(() => {
        (async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.replace('/dashboard'); return }
            const { data: profile } = await supabase.from('profiles').select('role, support_level').eq('id', user.id).single()
            if (profile?.role !== 'ADMIN') { router.replace('/dashboard'); return }
            setAuthorized(true)
        })()
    }, [router])

    // ═══ Existing queries ═══
    const { data: metrics, isLoading: l1 } = useQuery<GlobalMetrics>({ queryKey: ['admin-metrics'], queryFn: getGlobalMetrics, enabled: authorized === true, staleTime: 60_000 })
    const { data: agents, isLoading: l2 } = useQuery<AgentPerformance[]>({ queryKey: ['admin-agents'], queryFn: getAgentPerformance, enabled: authorized === true, staleTime: 60_000 })
    const { data: clients, isLoading: l3 } = useQuery<ClientDistribution[]>({ queryKey: ['admin-clients'], queryFn: getClientDistribution, enabled: authorized === true, staleTime: 60_000 })
    const { data: trend, isLoading: l4 } = useQuery<TrendPoint[]>({ queryKey: ['admin-trend'], queryFn: getTicketsTrend, enabled: authorized === true, staleTime: 60_000 })

    // ═══ Sprint 39 queries ═══
    const { data: backlogAging, isLoading: l5 } = useQuery<BacklogAgingPoint[]>({ queryKey: ['admin-backlog-aging'], queryFn: getBacklogAging, enabled: authorized === true, staleTime: 60_000 })
    const { data: topStores, isLoading: l6 } = useQuery<TopOffenderItem[]>({ queryKey: ['admin-top-stores'], queryFn: getTopOffendersStores, enabled: authorized === true, staleTime: 60_000 })
    const { data: topEquipments, isLoading: l7 } = useQuery<TopOffenderItem[]>({ queryKey: ['admin-top-equipments'], queryFn: getTopOffendersEquipments, enabled: authorized === true, staleTime: 60_000 })
    const { data: catStatusMatrix, isLoading: l8 } = useQuery<CategoryStatusItem[]>({ queryKey: ['admin-cat-status'], queryFn: getCategoryStatusMatrix, enabled: authorized === true, staleTime: 60_000 })

    // Sparklines — fetched once agents are loaded
    const agentIds = useMemo(() => (agents || []).map(a => a.id), [agents])
    const { data: sparklines } = useQuery<Record<string, number[]>>({
        queryKey: ['admin-sparklines', agentIds],
        queryFn: () => getAgentSparklines(agentIds),
        enabled: authorized === true && agentIds.length > 0,
        staleTime: 60_000,
    })

    // Agent drawer
    const [selectedAgent, setSelectedAgent] = useState<AgentPerformance | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    if (authorized === null) return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
    )

    return (
        <div className="space-y-8 pb-10 max-w-[1600px] mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2 flex items-center gap-3">
                    <Eye className="w-9 h-9 text-rose-400" />
                    L'Œil de Sauron
                </h1>
                <p className="text-muted-foreground font-medium">Tableau de bord analytique — Vision globale de l'entreprise.</p>
            </div>

            {/* ═══ LIGNE 1 : KPIs GLOBAUX ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiHero label="Temps Moyen de Résolution" value={metrics?.avgResolutionHours != null ? `${metrics.avgResolutionHours}h` : '—'} icon={Clock} color="indigo" subtitle="par ticket (30j)" />
                <KpiHero label="Taux de SLA Global" value={metrics != null ? `${metrics.slaComplianceRate}%` : '—'} icon={ShieldCheck} color={metrics && metrics.slaComplianceRate >= 90 ? 'emerald' : metrics && metrics.slaComplianceRate >= 70 ? 'amber' : 'rose'} subtitle="respect des délais" />
                <KpiHero label="Tickets Actifs" value={metrics?.totalActive ?? '—'} icon={Activity} color="cyan" subtitle="en cours sur le portail" />
                <KpiHero label="Clôturés (30j)" value={metrics?.closedLast30d ?? '—'} icon={CheckCircle} color="purple" subtitle="tickets fermés" />
            </div>

            {/* ═══ LIGNE 2 : GRAPHIQUES EXISTANTS ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* LineChart — 2/3 */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                    <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4">Tendance Créés vs Fermés — 30 jours</h3>
                    {l4 ? <ChartSkeleton /> : (
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={trend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }} />
                                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
                                <Line type="monotone" dataKey="created" name="Créés" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                                <Line type="monotone" dataKey="closed" name="Fermés" stroke="#a855f7" strokeWidth={2.5} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* PieChart — 1/3 */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                    <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4">Répartition par Service</h3>
                    {l1 ? <ChartSkeleton /> : (
                        <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                                <Pie
                                    data={metrics?.volumeByCategory || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={4}
                                    dataKey="value"
                                    nameKey="name"
                                    stroke="none"
                                >
                                    {(metrics?.volumeByCategory || []).map((_, i) => (
                                        <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }} />
                                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ═══ LIGNE 3 : BACKLOG AGING + TREEMAP ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <BacklogAgingChart data={backlogAging} isLoading={l5} />
                </div>
                <div>
                    <TicketsByPriorityAndStatus data={catStatusMatrix} isLoading={l8} />
                </div>
            </div>

            {/* ═══ LIGNE 4 : LEADERBOARD AGENTS (avec Sparklines) ═══ */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-5 flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    Palmarès des Agents — Ce Mois
                </h3>
                {l2 ? <ChartSkeleton /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                                    <th className="pb-3 px-3">#</th>
                                    <th className="pb-3 px-3">Agent</th>
                                    <th className="pb-3 px-3">Rôle</th>
                                    <th className="pb-3 px-3 text-center">En Cours</th>
                                    <th className="pb-3 px-3 text-center">Résolus</th>
                                    <th className="pb-3 px-3 text-center">Tendance (7j)</th>
                                    <th className="pb-3 px-3 text-center">Temps Moy.</th>
                                    <th className="pb-3 px-3 text-center">SLA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {(agents || []).map((a, i) => (
                                    <tr key={a.id} className="hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => { setSelectedAgent(a); setDrawerOpen(true) }}>
                                        <td className="py-3 px-3">
                                            {i === 0 ? <span className="text-amber-400 font-black">🥇</span>
                                                : i === 1 ? <span className="text-muted-foreground font-bold">🥈</span>
                                                    : i === 2 ? <span className="text-amber-700 font-bold">🥉</span>
                                                        : <span className="text-foreground/20 font-medium">{i + 1}</span>}
                                        </td>
                                        <td className="py-3 px-3 text-foreground font-semibold">{a.first_name} {a.last_name}</td>
                                        <td className="py-3 px-3">
                                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold tracking-wider text-muted-foreground">{a.role}</span>
                                        </td>
                                        <td className="py-3 px-3 text-center text-foreground/70">{a.ticketsInProgress}</td>
                                        <td className="py-3 px-3 text-center font-bold text-foreground">{a.resolvedThisMonth}</td>
                                        <td className="py-3 px-3">
                                            <AgentSparkline data={sparklines?.[a.id]} />
                                        </td>
                                        <td className="py-3 px-3 text-center text-muted-foreground">{a.avgResolutionHours != null ? `${a.avgResolutionHours}h` : '—'}</td>
                                        <td className="py-3 px-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${a.slaRate >= 90
                                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                                : a.slaRate >= 70
                                                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                                }`}>
                                                {a.slaRate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {(!agents || agents.length === 0) && (
                                    <tr><td colSpan={8} className="py-8 text-center text-foreground/20">Aucune donnée disponible.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══ LIGNE 5 : TOP OFFENDERS ═══ */}
            <TopOffendersChart
                storeData={topStores}
                equipmentData={topEquipments}
                isLoadingStores={l6}
                isLoadingEquipments={l7}
            />

            {/* ═══ LIGNE 6 : TOP CLIENTS (existant) ═══ */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-5 flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    Top 5 Clients — Volume de Tickets
                </h3>
                {l3 ? <ChartSkeleton /> : (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={clients || []} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="company" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
                            <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }} />
                            <Bar dataKey="ticketCount" name="Tickets" radius={[0, 6, 6, 0]} maxBarSize={30}>
                                {(clients || []).map((_, i) => (
                                    <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Agent Drawer */}
            <AgentAnalyticsDrawer agent={selectedAgent} open={drawerOpen} onOpenChange={setDrawerOpen} />
        </div>
    )
}

// ═══ Sub-Components ═══

function AgentSparkline({ data }: { data?: number[] }) {
    if (!data) return <div className="w-20 h-6" />
    const chartData = data.map((v, i) => ({ i, v }))
    const hasData = data.some(v => v > 0)

    return (
        <div className="flex justify-center">
            <div className="w-20 h-7">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                        <Line
                            type="monotone"
                            dataKey="v"
                            stroke={hasData ? '#6366f1' : 'rgba(255,255,255,0.1)'}
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

function KpiHero({ label, value, icon: Icon, color, subtitle }: { label: string; value: string | number; icon: any; color: string; subtitle: string }) {
    const colorMap: Record<string, { border: string; icon: string; glow: string }> = {
        indigo: { border: 'border-primary/20', icon: 'text-primary/80', glow: 'bg-primary/10' },
        emerald: { border: 'border-emerald-500/20', icon: 'text-emerald-400', glow: 'bg-emerald-500/10' },
        amber: { border: 'border-amber-500/20', icon: 'text-amber-400', glow: 'bg-amber-500/10' },
        rose: { border: 'border-rose-500/30', icon: 'text-rose-400', glow: 'bg-rose-500/15' },
        cyan: { border: 'border-cyan-500/20', icon: 'text-cyan-400', glow: 'bg-cyan-500/10' },
        purple: { border: 'border-primary/20', icon: 'text-primary/80', glow: 'bg-primary/10' },
    }
    const c = colorMap[color] || colorMap.indigo
    return (
        <div className={`relative group p-5 rounded-2xl bg-white/[0.03] border ${c.border} backdrop-blur-xl overflow-hidden transition-all hover:bg-white/[0.05]`}>
            <div className={`absolute -right-6 -top-6 w-24 h-24 ${c.glow} rounded-full blur-3xl transition-colors`} />
            <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${c.icon}`} />
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">{label}</span>
                </div>
                <p className="text-4xl font-black tracking-tighter text-foreground">{value}</p>
                <p className="text-[10px] text-foreground/25 mt-1 font-medium">{subtitle}</p>
            </div>
        </div>
    )
}

function ChartSkeleton() {
    return (
        <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-foreground/20" />
        </div>
    )
}
