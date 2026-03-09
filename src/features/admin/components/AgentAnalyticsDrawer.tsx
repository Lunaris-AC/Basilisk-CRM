'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAgentDetailedStats, AgentDetailedStats, AgentPerformance } from '@/features/admin/analytics'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Loader2, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const PRIO_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444']

const statusColors: Record<string, string> = {
    nouveau: 'bg-sky-500/15 text-sky-300',
    assigne: 'bg-primary/15 text-primary/80',
    en_cours: 'bg-amber-500/15 text-amber-300',
    attente_client: 'bg-orange-500/15 text-orange-300',
    resolu: 'bg-emerald-500/15 text-emerald-300',
    ferme: 'bg-white/5 text-muted-foreground',
    suspendu: 'bg-primary/15 text-primary/80',
}

interface Props {
    agent: AgentPerformance | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AgentAnalyticsDrawer({ agent, open, onOpenChange }: Props) {
    const { data: stats, isLoading } = useQuery<AgentDetailedStats>({
        queryKey: ['agent-detailed-stats', agent?.id],
        queryFn: () => getAgentDetailedStats(agent!.id),
        enabled: open && !!agent?.id,
        staleTime: 60_000,
    })

    if (!agent) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="bg-zinc-950/95 backdrop-blur-2xl border-white/10 text-foreground w-full sm:max-w-xl overflow-y-auto custom-scrollbar">
                <SheetHeader className="pb-4 border-b border-white/10">
                    <SheetTitle className="text-foreground text-xl font-black tracking-tight">
                        {agent.first_name} {agent.last_name}
                    </SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold tracking-wider text-muted-foreground">{agent.role}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${agent.slaRate >= 90 ? 'bg-emerald-500/15 text-emerald-300' : agent.slaRate >= 70 ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300'}`}>
                            SLA {agent.slaRate}%
                        </span>
                    </div>
                </SheetHeader>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : stats ? (
                    <div className="space-y-6 pt-6">
                        {/* Indice de Vélocité */}
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                            <h4 className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-2">Indice de Vélocité</h4>
                            {stats.velocityIndex !== null ? (
                                <div className="flex items-center gap-3">
                                    {stats.velocityIndex > 0 ? <TrendingUp className="w-6 h-6 text-emerald-400" />
                                        : stats.velocityIndex < 0 ? <TrendingDown className="w-6 h-6 text-rose-400" />
                                            : <Minus className="w-6 h-6 text-muted-foreground" />}
                                    <span className={`text-3xl font-black ${stats.velocityIndex > 0 ? 'text-emerald-300' : stats.velocityIndex < 0 ? 'text-rose-300' : 'text-muted-foreground'}`}>
                                        {stats.velocityIndex > 0 ? '+' : ''}{stats.velocityIndex}%
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        {stats.velocityIndex > 0 ? 'plus rapide que la moyenne' : stats.velocityIndex < 0 ? 'plus lent que la moyenne' : 'dans la moyenne'}
                                    </span>
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">Pas assez de données pour calculer la vélocité.</p>
                            )}
                        </div>

                        {/* Graphique : Résolution 30j */}
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                            <h4 className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-4">Volume de Résolution — 30 jours</h4>
                            <ResponsiveContainer width="100%" height={180}>
                                <AreaChart data={stats.trendLast30d}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                                    <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 11 }} />
                                    <defs>
                                        <linearGradient id="agentGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="closed" name="Fermés" stroke="#06b6d4" fill="url(#agentGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Graphique : Par priorité */}
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                            <h4 className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-4">Tickets par Priorité</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={stats.byPriority} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" nameKey="name" stroke="none">
                                        {stats.byPriority.map((_, i) => <Cell key={i} fill={PRIO_COLORS[i % PRIO_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-4 mt-2">
                                {stats.byPriority.map((p, i) => (
                                    <div key={p.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIO_COLORS[i] }} />
                                        {p.name} ({p.value})
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tickets récents */}
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                            <h4 className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-3">Derniers Tickets</h4>
                            <div className="space-y-2">
                                {stats.recentTickets.map(t => (
                                    <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors group">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusColors[t.status] || 'bg-white/5 text-muted-foreground'}`}>{t.status}</span>
                                        <span className="text-foreground/70 text-xs truncate flex-1">{t.title}</span>
                                        <span className="text-foreground/20 text-[10px]">{t.category}</span>
                                        <ExternalLink className="w-3 h-3 text-foreground/20 group-hover:text-cyan-400 transition-colors shrink-0" />
                                    </Link>
                                ))}
                                {stats.recentTickets.length === 0 && <p className="text-foreground/20 text-xs text-center py-4">Aucun ticket récent.</p>}
                            </div>
                        </div>
                    </div>
                ) : null}
            </SheetContent>
        </Sheet>
    )
}
