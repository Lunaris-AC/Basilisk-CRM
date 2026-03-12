'use client'

import { Siren, User } from 'lucide-react'
import { WallboardTicket } from '../queries'
import { WallboardSlaBadge } from './WallboardSlaBadge'

// ============================================================
// SPRINT 51 : Vue 1 — "Le Bloc Opératoire" — Tickets Critiques
// ============================================================

interface ViewCriticalProps {
    criticalTickets: WallboardTicket[]
}

export function ViewCritical({ criticalTickets }: ViewCriticalProps) {
    if (criticalTickets.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <p className="text-7xl mb-6">🎉</p>
                    <p className="text-5xl font-black text-emerald-400">
                        Aucun ticket critique
                    </p>
                    <p className="text-3xl text-slate-500 mt-4">
                        La situation est sous contrôle.
                    </p>
                </div>
            </div>
        )
    }

    // Grille adaptative : 1 col si ≤2, 2 cols si ≤6, 3 cols sinon
    const gridCols = criticalTickets.length <= 2
        ? 'grid-cols-1 max-w-3xl mx-auto'
        : criticalTickets.length <= 6
            ? 'grid-cols-2'
            : 'grid-cols-3'

    return (
        <div className="flex h-full w-full flex-col p-8">
            {/* Header */}
            <div className="flex items-center gap-5 mb-8">
                <Siren className="w-12 h-12 text-rose-400 animate-pulse" />
                <h2 className="text-5xl font-black text-white tracking-tight">
                    Tickets Critiques du Jour
                </h2>
                <div className="ml-auto flex items-center gap-3 px-6 py-3 rounded-2xl bg-rose-500/20 border-2 border-rose-500/40">
                    <span className="text-4xl font-black text-rose-300">{criticalTickets.length}</span>
                </div>
            </div>

            {/* Grille de cartes */}
            <div className={`flex-1 grid ${gridCols} gap-6 overflow-hidden`}>
                {criticalTickets.slice(0, 9).map((ticket) => (
                    <div
                        key={ticket.id}
                        className="flex flex-col justify-between p-6 rounded-3xl bg-rose-500/[0.06] border-2 border-rose-500/20 shadow-[0_0_25px_rgba(244,63,94,0.1)]"
                    >
                        {/* Titre */}
                        <div>
                            <p className="text-sm font-mono text-rose-400/60 mb-2 tracking-wider">
                                #{ticket.id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-3xl font-black text-white leading-tight line-clamp-2 mb-4">
                                {ticket.title}
                            </p>
                        </div>

                        {/* Client */}
                        <p className="text-2xl font-bold text-rose-200/80 mb-3 truncate">
                            {ticket.client_company}
                        </p>

                        {/* Footer : Technicien + SLA */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 min-w-0">
                                <User className="w-6 h-6 text-slate-400 shrink-0" />
                                <span className="text-xl font-semibold text-slate-300 truncate">
                                    {ticket.assignee_first_name
                                        ? `${ticket.assignee_first_name} ${ticket.assignee_last_name}`
                                        : 'Non assigné'}
                                </span>
                            </div>
                            <WallboardSlaBadge
                                slaStartAt={ticket.sla_start_at}
                                slaDeadlineAt={ticket.sla_deadline_at}
                                slaPausedAt={ticket.sla_paused_at}
                                slaElapsedMinutes={ticket.sla_elapsed_minutes}
                                priority={ticket.priority}
                                status={ticket.status}
                                createdAt={ticket.created_at}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
