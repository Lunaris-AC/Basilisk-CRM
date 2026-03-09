'use client'

import React from 'react'
import { useMyTickets } from '@/features/tickets/api/useTickets'
import { Loader2, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export function UrgentTicketsWidget() {
    // Top 5 tickets Urgent or Critical
    const { data: tickets, isLoading } = useMyTickets({ search: '', status: 'all', priority: 'critique', category: 'all' })

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    const urgentTickets = tickets?.slice(0, 5) || []

    return (
        <div className="h-full flex flex-col">
            {urgentTickets.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm font-medium">Aucun ticket critique assigné.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {urgentTickets.map(ticket => (
                        <div key={ticket.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase">
                                    CRITIQUE
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: fr })}
                                </span>
                            </div>
                            <h4 className="text-sm font-bold text-foreground truncate">{ticket.title}</h4>
                            <p className="text-xs text-muted-foreground truncate">{ticket.description || 'Aucune description'}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
