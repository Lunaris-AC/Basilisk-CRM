'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Clock, PauseCircle, AlertCircle } from 'lucide-react'
import { TicketWithRelations } from '@/features/tickets/api/getTickets'

interface SlaTimerProps {
    ticket: TicketWithRelations
}

// ============================================================
// SPRINT 32 : SlaTimer branché sur la vraie deadline SLA (backend)
// ============================================================

export function SlaTimer({ ticket }: SlaTimerProps) {
    const [now, setNow] = useState(new Date())

    useEffect(() => {
        // Rafraîchir toutes les minutes
        const timer = setInterval(() => setNow(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

    // 1. Si aucune deadline n'a été calculée (ex: ticket très ancien), on n'affiche rien
    if (!ticket.sla_deadline_at) {
        return null
    }

    const deadline = new Date(ticket.sla_deadline_at)

    // 2. SLA en PAUSE (attente client)
    if (ticket.sla_paused_at !== null) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/50 border border-amber-500/30 text-amber-400/70 text-[11px] font-medium backdrop-blur-sm">
                <PauseCircle className="w-3.5 h-3.5" />
                <span className="tracking-wide uppercase">SLA EN PAUSE</span>
            </div>
        )
    }

    const isBreached = now.getTime() > deadline.getTime()

    // 3. SLA dépassé → badge rouge clignotant
    if (isBreached) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-400 text-[11px] font-bold animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)] backdrop-blur-md">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="tracking-wide uppercase">
                    DÉPASSEMENT : {formatDistanceToNow(deadline, { locale: fr, addSuffix: false })}
                </span>
            </div>
        )
    }

    // 4. SLA en cours → badge vert avec countdown
    return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-[11px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.1)] backdrop-blur-md transition-all duration-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="tracking-wide uppercase">
                SLA : {formatDistanceToNow(deadline, { locale: fr, addSuffix: true })}
            </span>
        </div>
    )
}
