'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Clock, PauseCircle, AlertCircle } from 'lucide-react'
import { TicketWithRelations } from '@/features/tickets/api/getTickets'

interface SlaTimerProps {
    ticket: TicketWithRelations
}

export function SlaTimer({ ticket }: SlaTimerProps) {
    const [now, setNow] = useState(new Date())

    useEffect(() => {
        // Rafraîchir toutes les minutes
        const timer = setInterval(() => setNow(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

    const isPaused = ticket.status === 'attente_client' || ticket.status === 'suspendu'
    const createdAt = new Date(ticket.created_at)
    const elapsedMs = now.getTime() - createdAt.getTime()
    const elapsedHours = elapsedMs / (1000 * 60 * 60)

    // Logique de dépassement (SLA Breach)
    const isBreached =
        (ticket.priority === 'critique' && elapsedHours > 2) ||
        (ticket.priority === 'haute' && elapsedHours > 24)

    if (isPaused) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/50 border border-white/10 text-white/40 text-[11px] font-medium backdrop-blur-sm">
                <PauseCircle className="w-3.5 h-3.5" />
                SLA EN PAUSE
            </div>
        )
    }

    return (
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border backdrop-blur-md text-[11px] font-bold transition-all duration-500
            ${isBreached
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
            }`}
        >
            {isBreached ? <AlertCircle className="w-3.5 h-3.5 shadow-sm" /> : <Clock className="w-3.5 h-3.5" />}
            <span className="tracking-wide uppercase">
                {isBreached ? 'DÉPASSEMENT' : 'SLA RÉSPECTÉ'} : {formatDistanceToNow(createdAt, { locale: fr, addSuffix: false })}
            </span>
        </div>
    )
}
