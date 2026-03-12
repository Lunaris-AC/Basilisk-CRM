'use client'

import { Inbox, ShieldAlert } from 'lucide-react'
import { WallboardTicket } from '../queries'
import { WallboardSlaBadge } from './WallboardSlaBadge'

// ============================================================
// SPRINT 51 : Vue 0 — "Le Front" — Tickets en attente & SLA
// ============================================================

interface ViewFrontProps {
    unassignedCount: number
    slaExpiringTickets: WallboardTicket[]
}

export function ViewFront({ unassignedCount, slaExpiringTickets }: ViewFrontProps) {
    return (
        <div className="flex h-full w-full gap-8 p-8">
            {/* ── Côté gauche : Gros compteur ─────────────────── */}
            <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-white/[0.03] border border-white/[0.06]">
                <Inbox className="w-20 h-20 text-sky-400 mb-6" />
                <p className="text-4xl font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Tickets en attente
                </p>
                <p className={`font-black leading-none transition-all duration-500 ${
                    unassignedCount > 10
                        ? 'text-9xl text-rose-400 animate-pulse'
                        : unassignedCount > 5
                            ? 'text-9xl text-orange-400'
                            : 'text-9xl text-emerald-400'
                }`}>
                    {unassignedCount}
                </p>
                <p className="text-3xl text-slate-500 mt-4">
                    Non assignés · Nouveaux
                </p>
            </div>

            {/* ── Côté droit : Top 5 SLA urgents ─────────────── */}
            <div className="flex-1 flex flex-col rounded-3xl bg-white/[0.03] border border-white/[0.06] p-6">
                <div className="flex items-center gap-4 mb-6">
                    <ShieldAlert className="w-10 h-10 text-orange-400" />
                    <h2 className="text-4xl font-black text-white tracking-tight">
                        SLA en danger
                    </h2>
                </div>

                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    {slaExpiringTickets.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-3xl text-emerald-400 font-bold">
                                ✅ Aucun SLA en danger
                            </p>
                        </div>
                    ) : (
                        slaExpiringTickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                className="flex items-center gap-6 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-2xl font-bold text-white truncate">
                                        {ticket.title}
                                    </p>
                                    <p className="text-xl text-slate-400 truncate">
                                        {ticket.client_company}
                                        {ticket.assignee_first_name && (
                                            <span className="text-slate-500"> · {ticket.assignee_first_name} {ticket.assignee_last_name}</span>
                                        )}
                                    </p>
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
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
