'use client'

import { useMyTickets, useMyDailyStats } from '@/features/tickets/api/useTickets'
import { TicketTable } from '@/features/tickets/components/TicketTable'
import { Plus, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { pickRandomTicket } from '@/features/tickets/actions'
import { TicketFilters } from '@/components/TicketFilters'
import { TicketFilters as Filters } from '@/features/tickets/api/getTickets'
import { useQueryClient } from '@tanstack/react-query'

export function HLDashboard() {
    const [filters, setFilters] = useState<Filters>({ search: '', status: 'all', priority: 'all', category: 'HL' })
    const { data: tickets, isLoading, error } = useMyTickets(filters)
    const { data: stats } = useMyDailyStats()
    const [isPicking, setIsPicking] = useState(false)
    const queryClient = useQueryClient()

    // Logique du flux tendu : 1 ticket actif max.
    const activeTickets = tickets?.filter(t => t.status !== 'resolu' && t.status !== 'ferme') || []
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
                        Vos tickets en cours et vos statistiques du jour.
                    </p>
                </div>

                <button
                    onClick={async () => {
                        setIsPicking(true)
                        const res = await pickRandomTicket()
                        if (res?.success) {
                            queryClient.invalidateQueries({ queryKey: ['myTickets'] })
                            queryClient.invalidateQueries({ queryKey: ['myDailyStats'] })
                            queryClient.invalidateQueries({ queryKey: ['unassignedTickets'] })
                        } else if (res?.error) {
                            alert(res.error) // Affiche l'erreur si bloqué (ex: ticket en cours)
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
                                    : 'PIOCHER UN TICKET'
                            }
                        </span>
                    </div>
                </button>
            </div>

            {/* STATS RAPIDES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col">
                    <span className="text-white/50 text-sm font-medium mb-1">Mes tickets en cours</span>
                    <span className="text-3xl font-bold tracking-tight text-white">{tickets?.length || 0}</span>
                </div>
                <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-md flex flex-col">
                    <span className="text-emerald-400/80 text-sm font-medium mb-1">Créés aujourd'hui</span>
                    <span className="text-3xl font-bold tracking-tight text-emerald-400">
                        {stats?.createdToday || 0}
                    </span>
                </div>
                <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/20 backdrop-blur-md flex flex-col">
                    <span className="text-purple-400/80 text-sm font-medium mb-1">Fermés aujourd'hui</span>
                    <span className="text-3xl font-bold tracking-tight text-purple-400">
                        {stats?.closedToday || 0}
                    </span>
                </div>
            </div>

            <TicketFilters filters={filters} setFilters={setFilters} />

            {/* LISTE DES TICKETS (DATA TABLE) */}
            <h2 className="text-xl font-bold text-white mt-10 mb-4 tracking-wide">Mes Tickets Actifs</h2>

            <TicketTable tickets={tickets} isLoading={isLoading} error={error} showAssignButton={false} />

        </div>
    )
}
