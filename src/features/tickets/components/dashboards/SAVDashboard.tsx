'use client'

import { useMyTickets, useUnassignedTickets } from '@/features/tickets/api/useTickets'
import { TicketTable } from '@/features/tickets/components/TicketTable'
import { TicketFilters } from '@/components/TicketFilters'
import { TicketFilters as Filters } from '@/features/tickets/api/getTickets'
import { useState } from 'react'

export function SAVDashboard() {
    const [filters, setFilters] = useState<Filters>({ search: '', status: 'all', priority: 'all', category: 'SAV' })

    // Le SAV voit ses tickets assignés ET les tickets de la file d'attente (escaladés niveau 2/3 ou catégorie SAV)
    const { data: myTickets, isLoading: loadingMy } = useMyTickets(filters)
    const { data: queueTickets, isLoading: loadingQueue } = useUnassignedTickets(filters)

    // On pourrait filtrer frontend par category='SAV' si on le souhaite, 
    // mais le rôle RLS et le niveau d'escalade (N2/N3) défini dans getTickets.ts font déjà le gros du travail.
    const isGlobalLoading = loadingMy || loadingQueue

    // On fusionne et on dé-duplique au cas où (bien que les requêtes soient distinctes)
    const allTicketsMap = new Map()
    myTickets?.forEach(t => allTicketsMap.set(t.id, t))
    queueTickets?.forEach(t => allTicketsMap.set(t.id, t))
    const tickets = Array.from(allTicketsMap.values())

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                        Portail SAV
                    </h1>
                    <p className="text-white/60 font-medium">
                        Tickets assignés au Service Après-Vente et en attente de prise en charge.
                    </p>
                </div>
            </div>

            <TicketFilters filters={filters} setFilters={setFilters} />

            <h2 className="text-xl font-bold text-white mt-10 mb-4 tracking-wide">Tickets Service Après-Vente</h2>
            <TicketTable tickets={tickets} isLoading={isGlobalLoading} error={null} showAssignButton={true} />

        </div>
    )
}
