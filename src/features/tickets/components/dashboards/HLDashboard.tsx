'use client'

import { useMyTickets, useMyStatsByDate, useGlobalStats, useAuthUser } from '@/features/tickets/api/useTickets'
import { TicketTable } from '@/features/tickets/components/TicketTable'
import { Plus, Loader2, ChevronDown, ChevronUp, Pause, TrendingUp, Users, AlertTriangle, Clock, BarChart3, CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { pickRandomTicket } from '@/features/tickets/actions'
import { TicketFilters } from '@/components/TicketFilters'
import { TicketFilters as Filters } from '@/features/tickets/api/getTickets'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Mini KPI Card
function KpiCard({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon?: any }) {
    const colorMap: Record<string, string> = {
        indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300',
        rose: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
        amber: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
        emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
        purple: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
        sky: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
        pink: 'bg-pink-500/10 border-pink-500/20 text-pink-300',
        teal: 'bg-teal-500/10 border-teal-500/20 text-teal-300',
        white: 'bg-white/5 border-white/10 text-white/80',
    }
    return (
        <div className={`p-3 rounded-xl border backdrop-blur-md ${colorMap[color] || colorMap.white} transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-semibold tracking-wider uppercase opacity-70 truncate">{label}</span>
                {Icon && <Icon className="w-3 h-3 opacity-50 shrink-0" />}
            </div>
            <p className="text-xl font-black tracking-tight">{value}</p>
        </div>
    )
}

export function HLDashboard() {
    const [filters, setFilters] = useState<Filters>({ search: '', status: 'all', priority: 'all', category: 'HL' })
    const { data: tickets, isLoading, error } = useMyTickets(filters)
    const { data: globalStats } = useGlobalStats()
    const [isPicking, setIsPicking] = useState(false)
    const [showSuspended, setShowSuspended] = useState(false)
    const queryClient = useQueryClient()

    // DatePicker pour feuille de temps personnelle
    const [statsDate, setStatsDate] = useState<Date>(new Date())
    const [datePickerOpen, setDatePickerOpen] = useState(false)
    const { data: personalStats } = useMyStatsByDate(statsDate.toISOString())

    // Flux tendu : exclure les tickets suspendus du calcul "1 ticket actif max"
    const activeTickets = tickets?.filter(t => t.status !== 'resolu' && t.status !== 'ferme' && t.status !== 'suspendu') || []
    const suspendedTickets = tickets?.filter(t => t.status === 'suspendu') || []
    const hasActiveTickets = activeTickets.length > 0

    return (
        <div className="space-y-8 pb-10">

            {/* HEADER & BOUTON GÉANT PIOCHER */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                        Espace Personnel
                    </h1>
                    <p className="text-white/60 font-medium">
                        Vos tickets en cours et vos statistiques.
                    </p>
                </div>

                <button
                    onClick={async () => {
                        setIsPicking(true)
                        const res = await pickRandomTicket()
                        if (res?.success) {
                            queryClient.invalidateQueries({ queryKey: ['myTickets'] })
                            queryClient.invalidateQueries({ queryKey: ['myStatsByDate'] })
                            queryClient.invalidateQueries({ queryKey: ['globalStats'] })
                            queryClient.invalidateQueries({ queryKey: ['unassignedTickets'] })
                        } else if (res?.error) {
                            alert(res.error)
                        }
                        setIsPicking(false)
                    }}
                    disabled={isPicking || hasActiveTickets}
                    title={hasActiveTickets ? "Vous devez d'abord traiter votre ticket en cours." : "Piocher le ticket le plus ancien"}
                    className={`group relative px-8 py-4 rounded-2xl overflow-hidden transition-all shadow-xl border 
                        ${hasActiveTickets
                            ? 'bg-zinc-800/50 border-white/5 opacity-60 cursor-not-allowed shadow-none'
                            : 'hover:scale-105 active:scale-95 shadow-indigo-500/20 border-indigo-400/30'
                        } 
                        disabled:opacity-50`}
                >
                    {!hasActiveTickets && (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-white/10 blur-md group-hover:bg-white/20 transition-all" />
                        </>
                    )}
                    <div className="relative flex items-center justify-center gap-3 text-white font-bold text-lg tracking-wide">
                        {isPicking ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <Plus className={`w-6 h-6 ${hasActiveTickets ? 'opacity-50' : ''}`} />
                        )}
                        <span>
                            {isPicking
                                ? 'RECHERCHE...'
                                : hasActiveTickets
                                    ? '1 TICKET MAXIMUM'
                                    : suspendedTickets.length > 0
                                        ? `PIOCHER (${suspendedTickets.length} en pause)`
                                        : 'PIOCHER UN TICKET'
                            }
                        </span>
                    </div>
                </button>
            </div>

            {/* ===== GLOBAL STATS KPI GRID ===== */}
            <div>
                <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3 flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Statistiques Globales — Portail
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                    <KpiCard label="Total" value={globalStats?.totalTickets ?? '—'} color="indigo" icon={TrendingUp} />
                    <KpiCard label="File d'attente" value={globalStats?.totalUnassigned ?? '—'} color="amber" icon={Users} />
                    <KpiCard label="SLA dépassés" value={globalStats?.slaViolations ?? '—'} color="rose" icon={AlertTriangle} />
                    <KpiCard label="N1" value={globalStats?.byLevel.N1 ?? '—'} color="sky" />
                    <KpiCard label="N2" value={globalStats?.byLevel.N2 ?? '—'} color="purple" />
                    <KpiCard label="N3" value={globalStats?.byLevel.N3 ?? '—'} color="pink" />
                    <KpiCard label="N4" value={globalStats?.byLevel.N4 ?? '—'} color="rose" />
                    <KpiCard label="DEV" value={globalStats?.byCategory.DEV ?? '—'} color="teal" />
                </div>
                {/* Ligne 2 : répartition services */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    <KpiCard label="Commerce" value={globalStats?.byCategory.COMMERCE ?? '—'} color="emerald" />
                    <KpiCard label="SAV" value={globalStats?.byCategory.SAV ?? '—'} color="amber" />
                    <KpiCard label="Formation" value={globalStats?.byCategory.FORMATION ?? '—'} color="purple" />
                    <KpiCard label="Hotline" value={globalStats?.byCategory.HL ?? '—'} color="indigo" />
                </div>
            </div>

            {/* ===== FEUILLE DE TEMPS PERSONNELLE ===== */}
            <div>
                <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Feuille de Temps
                    </h2>

                    {/* DatePicker */}
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-500/30 text-white/70 text-xs font-medium transition-all">
                                <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                                {format(statsDate, 'EEEE d MMMM yyyy', { locale: fr })}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-zinc-900/95 backdrop-blur-xl border-white/10 shadow-2xl" align="start">
                            <Calendar
                                mode="single"
                                selected={statsDate}
                                onSelect={(date) => { if (date) { setStatsDate(date); setDatePickerOpen(false) } }}
                                locale={fr}
                                disabled={{ after: new Date() }}
                                className="rounded-xl"
                                classNames={{
                                    months: "flex flex-col",
                                    month: "space-y-3",
                                    caption: "flex justify-center pt-1 relative items-center",
                                    caption_label: "text-sm font-bold text-white",
                                    nav: "flex items-center gap-1",
                                    nav_button: "h-7 w-7 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors inline-flex items-center justify-center",
                                    table: "w-full border-collapse",
                                    head_row: "flex",
                                    head_cell: "text-white/40 rounded-md w-9 font-medium text-[0.8rem]",
                                    row: "flex w-full mt-1",
                                    cell: "h-9 w-9 text-center text-sm p-0 relative",
                                    day: "h-9 w-9 p-0 font-medium rounded-lg hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors text-white/70 inline-flex items-center justify-center",
                                    day_selected: "bg-indigo-500 text-white hover:bg-indigo-400 font-bold",
                                    day_today: "bg-white/10 text-white font-bold",
                                    day_outside: "text-white/20",
                                    day_disabled: "text-white/10 hover:bg-transparent",
                                }}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col">
                        <span className="text-white/50 text-sm font-medium mb-1">Mes tickets en cours</span>
                        <span className="text-3xl font-bold tracking-tight text-white">{activeTickets.length}</span>
                    </div>
                    <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-md flex flex-col">
                        <span className="text-emerald-400/80 text-sm font-medium mb-1">Créés à cette date</span>
                        <span className="text-3xl font-bold tracking-tight text-emerald-400">
                            {personalStats?.createdCount ?? '—'}
                        </span>
                    </div>
                    <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20 backdrop-blur-md flex flex-col">
                        <span className="text-purple-400/80 text-sm font-medium mb-1">Fermés à cette date</span>
                        <span className="text-3xl font-bold tracking-tight text-purple-400">
                            {personalStats?.closedCount ?? '—'}
                        </span>
                    </div>
                </div>
            </div>

            <TicketFilters filters={filters} setFilters={setFilters} />

            {/* LISTE DES TICKETS ACTIFS */}
            <h2 className="text-xl font-bold text-white mt-10 mb-4 tracking-wide">Mes Tickets Actifs</h2>

            <TicketTable tickets={activeTickets} isLoading={isLoading} error={error} showAssignButton={false} />

            {/* SECTION TICKETS EN PAUSE (suspendus) */}
            {suspendedTickets.length > 0 && (
                <div className="mt-8">
                    <button
                        onClick={() => setShowSuspended(!showSuspended)}
                        className="flex items-center gap-3 text-amber-400/80 hover:text-amber-300 transition-colors group mb-4"
                    >
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 group-hover:border-amber-500/40 transition-all">
                            <Pause className="w-4 h-4" />
                            <span className="text-sm font-bold">
                                En pause ({suspendedTickets.length})
                            </span>
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
