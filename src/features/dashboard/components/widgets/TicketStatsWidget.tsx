'use client'

import React from 'react'
import { useGlobalStats } from '@/features/tickets/api/useTickets'
import { Loader2, AlertTriangle, CheckCircle2, Inbox } from 'lucide-react'

export function TicketStatsWidget() {
    const { data: stats, isLoading } = useGlobalStats()

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    const slaViolations = stats?.slaViolations || 0
    const activeIT = (stats?.byCategory?.HL || 0) + (stats?.byCategory?.DEV || 0)
    const totalN1 = stats?.byLevel?.['N1'] || 0

    return (
        <div className="flex flex-col h-full justify-center space-y-6">
            <div className="grid grid-cols-2 gap-4">
                {/* Violations SLA */}
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col items-center justify-center text-center">
                    <AlertTriangle className="w-8 h-8 text-rose-500 mb-2" />
                    <span className="text-3xl font-black text-foreground">{slaViolations}</span>
                    <span className="text-xs font-bold text-rose-300 uppercase mt-1">SLA Dépassés</span>
                </div>

                {/* IT & Dev */}
                <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex flex-col items-center justify-center text-center">
                    <CheckCircle2 className="w-8 h-8 text-sky-500 mb-2" />
                    <span className="text-3xl font-black text-foreground">{activeIT}</span>
                    <span className="text-xs font-bold text-sky-300 uppercase mt-1">Tickets IT & Dev</span>
                </div>

                {/* N1 */}
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center text-center col-span-2">
                    <Inbox className="w-8 h-8 text-primary mb-2" />
                    <span className="text-3xl font-black text-foreground">{totalN1}</span>
                    <span className="text-xs font-bold text-primary/80 uppercase mt-1">Tickets assignés N1</span>
                </div>
            </div>
        </div>
    )
}
