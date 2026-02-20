'use client'

import { useMyTickets } from '@/features/tickets/api/useTickets'
import { TicketTable } from '@/features/tickets/components/TicketTable'
import { TicketFilters } from '@/components/TicketFilters'
import { TicketFilters as Filters } from '@/features/tickets/api/getTickets'
import { useState } from 'react'

export function CommerceDashboard() {
    const [filters, setFilters] = useState<Filters>({ search: '', status: 'all', priority: 'all', category: 'COMMERCE' })

    // Le commercial voit ses propres tickets (l'API getMyTickets filtre déjà par créateur_id = MOI)
    // S'il est de rôle 'COM', ça lui remontera ce qu'il a créé.
    // Pour être certain, on pourrait filtrer côté frontend `ticket.category === 'COMMERCE'` mais ce n'est pas strict.
    // L'API a été faite pour `getMyTickets`, ce qui est parfait pour un commercial.
    const { data: tickets, isLoading, error } = useMyTickets(filters)

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                        Portail Commerce
                    </h1>
                    <p className="text-white/60 font-medium">
                        Tickets de vos clients.
                    </p>
                </div>
            </div>

            <TicketFilters filters={filters} setFilters={setFilters} />

            <h2 className="text-xl font-bold text-white mt-10 mb-4 tracking-wide">Mes Tickets</h2>
            <TicketTable tickets={tickets} isLoading={isLoading} error={error} showAssignButton={false} />

        </div>
    )
}
