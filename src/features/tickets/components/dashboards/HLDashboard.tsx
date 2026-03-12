'use client'

import { useMyTickets, useMyStatsByDate, useGlobalStats } from '@/features/tickets/api/useTickets'
import { TicketTable } from '@/features/tickets/components/TicketTable'
import { Plus, Loader2, ChevronDown, ChevronUp, Pause, AlertTriangle, Clock, CalendarDays, Inbox, Activity, Shield, Zap } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { pickRandomTicket } from '@/features/tickets/actions'
import { TicketFilters } from '@/components/TicketFilters'
import { TicketFilters as Filters } from '@/features/tickets/api/getTickets'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'

// Barre de répartition inline
function DistributionBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0
    const colorMap: Record<string, { bar: string; text: string; bg: string }> = {
        indigo: { bar: 'bg-primary', text: 'text-primary/80', bg: 'bg-primary/10' },
        emerald: { bar: 'bg-emerald-500', text: 'text-emerald-300', bg: 'bg-emerald-500/10' },
        amber: { bar: 'bg-amber-500', text: 'text-amber-300', bg: 'bg-amber-500/10' },
        purple: { bar: 'bg-primary', text: 'text-primary/80', bg: 'bg-primary/10' },
        teal: { bar: 'bg-teal-500', text: 'text-teal-300', bg: 'bg-teal-500/10' },
        sky: { bar: 'bg-sky-500', text: 'text-sky-300', bg: 'bg-sky-500/10' },
        pink: { bar: 'bg-pink-500', text: 'text-pink-300', bg: 'bg-pink-500/10' },
        rose: { bar: 'bg-rose-500', text: 'text-rose-300', bg: 'bg-rose-500/10' },
    }
    const c = colorMap[color] || colorMap.indigo
    return (
        <div className="flex items-center gap-3">
            <span className={`text-xs font-bold w-20 truncate ${c.text}`}>{label}</span>
            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full rounded-full ${c.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-black min-w-[2rem] text-right ${c.text}`}>{value}</span>
        </div>
    )
}

export function HLDashboard() {
    const [filters, setFilters] = useState<Filters>({ search: '', status: 'all', priority: 'all', category: 'HL' })
    const { data: tickets, isLoading, error } = useMyTickets(filters)
    const { data: globalStats } = useGlobalStats()
    const [isPicking, setIsPicking] = useState(false)
    const [showSuspended, setShowSuspended] = useState(false)
    const router = useRouter()
    const queryClient = useQueryClient()

    // DatePicker pour feuille de temps personnelle
    const [statsDate, setStatsDate] = useState<Date>(new Date())
    const [datePickerOpen, setDatePickerOpen] = useState(false)
    const { data: personalStats } = useMyStatsByDate(statsDate.toISOString())

    // Flux tendu : exclure les tickets suspendus
    const activeTickets = tickets?.filter(t => t.status !== 'resolu' && t.status !== 'ferme' && t.status !== 'suspendu') || []
    const suspendedTickets = tickets?.filter(t => t.status === 'suspendu') || []
    const hasActiveTickets = activeTickets.length > 0

    const slaCount = globalStats?.slaViolations ?? 0
    const totalForServices = (globalStats?.byCategory.HL ?? 0) + (globalStats?.byCategory.COMMERCE ?? 0) + (globalStats?.byCategory.SAV ?? 0) + (globalStats?.byCategory.FORMATION ?? 0) + (globalStats?.byCategory.DEV ?? 0)
    const totalForLevels = Object.values(globalStats?.byLevel ?? {}).reduce((acc, curr) => acc + curr, 0)

    const colors = ['sky', 'purple', 'pink', 'rose', 'indigo', 'teal', 'emerald', 'amber']

    return (
        <div className="space-y-8 pb-10">

            {/* HEADER & BOUTON PIOCHER */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">Espace Personnel</h1>
                    <p className="text-muted-foreground font-medium">Vue d'ensemble et statistiques.</p>
                </div>
                <button
                    onClick={async () => {
                        setIsPicking(true)
                        const res = await pickRandomTicket()
                        if (res?.success && res.ticketId) {
                            toast.success('Ticket pioché avec succès !', {
                                description: `Vous pouvez maintenant travailler sur ce ticket.`,
                                duration: 4000,
                            })
                            queryClient.invalidateQueries({ queryKey: ['myTickets'] })
                            queryClient.invalidateQueries({ queryKey: ['myStatsByDate'] })
                            queryClient.invalidateQueries({ queryKey: ['globalStats'] })
                            queryClient.invalidateQueries({ queryKey: ['unassignedTickets'] })
                            router.refresh()
                        } else if (res?.error) {
                            toast.error('Pioche impossible', {
                                description: res.error,
                                duration: 6000,
                            })
                        }
                        setIsPicking(false)
                    }}
                    disabled={isPicking || hasActiveTickets}
                    title={hasActiveTickets ? "Terminez votre ticket en cours." : "Piocher le ticket le plus ancien"}
                    className={`group relative px-8 py-4 rounded-2xl overflow-hidden transition-all shadow-xl border 
                        ${hasActiveTickets ? 'bg-primary/50 border-white/5 opacity-60 cursor-not-allowed shadow-none' : 'hover:scale-105 active:scale-95 shadow-primary/20 border-primary/30'} disabled:opacity-50`}
                >
                    {!hasActiveTickets && (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-white/10 blur-md group-hover:bg-white/20 transition-all" />
                        </>
                    )}
                    <div className="relative flex items-center justify-center gap-3 text-foreground font-bold text-lg tracking-wide">
                        {isPicking ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className={`w-6 h-6 ${hasActiveTickets ? 'opacity-50' : ''}`} />}
                        <span>{isPicking ? 'RECHERCHE...' : hasActiveTickets ? '1 TICKET MAXIMUM' : suspendedTickets.length > 0 ? `PIOCHER (${suspendedTickets.length} en pause)` : 'PIOCHER UN TICKET'}</span>
                    </div>
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* ÉTAPE 1 — MÉTÉO GLOBALE (Top Level)                       */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Total Portail */}
                <div className="relative group p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 backdrop-blur-xl overflow-hidden transition-all hover:border-primary/40">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/15 transition-colors" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Activity className="w-3.5 h-3.5 text-primary/80" />
                            <span className="text-[10px] font-bold tracking-widest text-primary/80 uppercase">Total Portail</span>
                        </div>
                        <p className="text-3xl font-black tracking-tighter text-foreground">{globalStats?.totalTickets ?? '—'}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">tickets ouverts</p>
                    </div>
                </div>

                {/* File d'attente */}
                <div className="relative group p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/25 backdrop-blur-xl overflow-hidden transition-all hover:border-amber-500/50">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/15 transition-colors" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Inbox className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[10px] font-bold tracking-widest text-amber-400/80 uppercase">File d'attente</span>
                        </div>
                        <p className="text-3xl font-black tracking-tighter text-foreground">{globalStats?.totalUnassigned ?? '—'}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">non affectés</p>
                    </div>
                </div>

                {/* SLA Dépassés */}
                <div className={`relative group p-4 rounded-2xl backdrop-blur-xl overflow-hidden transition-all
                    ${slaCount > 0
                        ? 'bg-gradient-to-br from-rose-500/15 to-red-500/10 border border-rose-500/40 hover:border-rose-500/60'
                        : 'bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20 hover:border-emerald-500/40'
                    }`}
                >
                    <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full blur-3xl transition-colors ${slaCount > 0 ? 'bg-rose-500/15 group-hover:bg-rose-500/20' : 'bg-emerald-500/10 group-hover:bg-emerald-500/15'}`} />
                    {/* Pulse néon si SLA > 0 */}
                    {slaCount > 0 && <div className="absolute inset-0 rounded-2xl border border-rose-500/40 animate-pulse" />}
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-1.5">
                            <AlertTriangle className={`w-3.5 h-3.5 ${slaCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
                            <span className={`text-[10px] font-bold tracking-widest uppercase ${slaCount > 0 ? 'text-rose-400/80' : 'text-emerald-400/80'}`}>SLA Dépassés</span>
                        </div>
                        <p className={`text-3xl font-black tracking-tighter ${slaCount > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{slaCount}</p>
                        <p className={`text-[10px] mt-0.5 font-medium ${slaCount > 0 ? 'text-rose-300/40' : 'text-emerald-300/40'}`}>
                            {slaCount > 0 ? 'à traiter en urgence' : 'aucun dépassement'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* ÉTAPE 2 — RADIOGRAPHIE (Middle Level — Répartitions)       */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Répartition par Service */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Répartition par Service</h3>
                    </div>
                    <div className="space-y-3">
                        <DistributionBar label="Hotline" value={globalStats?.byCategory.HL ?? 0} total={totalForServices} color="indigo" />
                        <DistributionBar label="Commerce" value={globalStats?.byCategory.COMMERCE ?? 0} total={totalForServices} color="emerald" />
                        <DistributionBar label="SAV" value={globalStats?.byCategory.SAV ?? 0} total={totalForServices} color="amber" />
                        <DistributionBar label="Formation" value={globalStats?.byCategory.FORMATION ?? 0} total={totalForServices} color="purple" />
                        <DistributionBar label="DEV" value={globalStats?.byCategory.DEV ?? 0} total={totalForServices} color="teal" />
                    </div>
                </div>

                {/* Répartition Support HL */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Répartition Support (HL)</h3>
                    </div>
                    <div className="space-y-3">
                        {globalStats && Object.entries(globalStats.byLevel).map(([name, count], idx) => (
                            <DistributionBar
                                key={name}
                                label={name}
                                value={count}
                                total={totalForLevels}
                                color={colors[idx % colors.length]}
                            />
                        ))}
                        {!globalStats && (
                            <div className="h-20 flex items-center justify-center text-foreground/20 text-xs italic">
                                Chargement...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* ÉTAPE 3 — FEUILLE DE TEMPS PERSONNELLE (Bottom Level)      */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <hr className="border-white/10 my-2" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-sm font-bold tracking-wide text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Feuille de Temps Personnelle
                </h2>

                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-300/80 text-xs font-bold transition-all hover:bg-cyan-500/15">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {format(statsDate, 'EEEE d MMMM yyyy', { locale: fr })}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-primary/95 backdrop-blur-xl border-white/10 shadow-2xl" align="end">
                        <Calendar
                            mode="single"
                            selected={statsDate}
                            onSelect={(date) => { if (date) { setStatsDate(date); setDatePickerOpen(false) } }}
                            locale={fr}
                            disabled={{ after: new Date() }}
                            className="rounded-xl"
                            classNames={{
                                months: "flex flex-col", month: "space-y-3",
                                caption: "flex justify-center pt-1 relative items-center",
                                caption_label: "text-sm font-bold text-foreground",
                                nav: "flex items-center gap-1",
                                nav_button: "h-7 w-7 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center",
                                table: "w-full border-collapse", head_row: "flex",
                                head_cell: "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem]",
                                row: "flex w-full mt-1",
                                cell: "h-9 w-9 text-center text-sm p-0 relative",
                                day: "h-9 w-9 p-0 font-medium rounded-lg hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors text-foreground/70 inline-flex items-center justify-center",
                                day_selected: "bg-cyan-500 text-black hover:bg-cyan-400 font-bold",
                                day_today: "bg-white/10 text-foreground font-bold",
                                day_outside: "text-foreground/20",
                                day_disabled: "text-foreground/10 hover:bg-transparent",
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/15 backdrop-blur-md transition-all hover:border-cyan-500/30">
                    <span className="text-cyan-400/60 text-[10px] font-bold uppercase tracking-wider">Mes tickets en cours</span>
                    <p className="text-2xl font-black tracking-tight text-foreground mt-1">{activeTickets.length}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/15 backdrop-blur-md transition-all hover:border-cyan-500/30">
                    <span className="text-cyan-400/60 text-[10px] font-bold uppercase tracking-wider">Créés à cette date</span>
                    <p className="text-2xl font-black tracking-tight text-cyan-300 mt-1">{personalStats?.createdCount ?? '—'}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/15 backdrop-blur-md transition-all hover:border-cyan-500/30">
                    <span className="text-cyan-400/60 text-[10px] font-bold uppercase tracking-wider">Fermés à cette date</span>
                    <p className="text-2xl font-black tracking-tight text-cyan-300 mt-1">{personalStats?.closedCount ?? '—'}</p>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TICKETS                                                    */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <TicketFilters filters={filters} setFilters={setFilters} />

            <h2 className="text-xl font-bold text-foreground mt-10 mb-4 tracking-wide">Mes Tickets Actifs</h2>
            <TicketTable tickets={activeTickets} isLoading={isLoading} error={error} showAssignButton={false} />

            {suspendedTickets.length > 0 && (
                <div className="mt-8">
                    <button
                        onClick={() => setShowSuspended(!showSuspended)}
                        className="flex items-center gap-3 text-amber-400/80 hover:text-amber-300 transition-colors group mb-4"
                    >
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 group-hover:border-amber-500/40 transition-all">
                            <Pause className="w-4 h-4" />
                            <span className="text-sm font-bold">En pause ({suspendedTickets.length})</span>
                            {showSuspended ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                    </button>
                    {showSuspended && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                            <TicketTable tickets={suspendedTickets} isLoading={false} error={null} showAssignButton={false} />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
