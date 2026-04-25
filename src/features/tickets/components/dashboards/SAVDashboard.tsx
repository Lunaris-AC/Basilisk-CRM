'use client'

import { useMyTickets, useUnassignedTickets } from '@/features/tickets/api/useTickets'
import { TicketTable } from '@/features/tickets/components/TicketTable'
import { TicketFilters } from '@/components/TicketFilters'
import { TicketFilters as Filters } from '@/features/tickets/api/getTickets'
import { useState, useEffect } from 'react'

export function SAVDashboard() {
    const [mounted, setMounted] = useState(false)
    const [filters, setFilters] = useState<Filters>({ search: '', status: 'all', priority: 'all', category: 'all' })

    useEffect(() => {
        setMounted(true)
    }, [])

    // Le SAV voit ses tickets assignés ET les tickets de la file d'attente (escaladés niveau 2/3 ou catégories SAV1/SAV2)
    const { data: myTickets, isLoading: loadingMy } = useMyTickets({ ...filters, category: filters.category === 'all' ? undefined : filters.category })
    const { data: queueTickets, isLoading: loadingQueue } = useUnassignedTickets({ ...filters, category: filters.category === 'all' ? undefined : filters.category })

    const isGlobalLoading = loadingMy || loadingQueue

    // Filtrage supplémentaire pour s'assurer qu'on ne voit que SAV1 et SAV2 si category est 'all' sur ce dashboard spécifique
    const tickets = Array.from(new Map([...(myTickets || []), ...(queueTickets || [])].map(t => [t.id, t])).values())
        .filter(t => filters.category !== 'all' ? t.category === filters.category : (t.category === 'SAV1' || t.category === 'SAV2'))

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
                        Portail SAV
                    </h1>
                    <p className="text-muted-foreground font-medium">
                        Tickets assignés au Service Après-Vente et en attente de prise en charge.
                    </p>
                </div>
            </div>

            <TicketFilters filters={filters} setFilters={setFilters} />

            <h2 className="text-xl font-bold text-foreground mt-10 mb-4 tracking-wide">Tickets Service Après-Vente</h2>
            <TicketTable tickets={tickets} isLoading={!mounted || isGlobalLoading} error={null} showAssignButton={true} />

        </div>
    )
}
