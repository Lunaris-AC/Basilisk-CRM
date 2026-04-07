'use client'

import { useUnassignedTickets, useAuthUser } from '@/features/tickets/api/useTickets'
import { TicketTable } from '@/features/tickets/components/TicketTable'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { TicketFilters } from '@/components/TicketFilters'
import { TicketFilters as Filters } from '@/features/tickets/api/getTickets'

export function IncidentsContent() {
    const [mounted, setMounted] = useState(false)
    const [filters, setFilters] = useState<Filters>({ search: '', status: 'all', priority: 'all' })
    const { data: user } = useAuthUser()
    const [userRole, setUserRole] = useState<string>('');
    const [userSupportLevel, setUserSupportLevel] = useState<string>('');
    const [userSupportLevelId, setUserSupportLevelId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true)
        const fetchRole = async () => {
            if (user?.id) {
                const supabase = createClient()
                const { data } = await supabase.from('profiles').select('role, support_level, support_level_id').eq('id', user.id).single()
                if (data) { 
                    setUserRole(data.role); 
                    setUserSupportLevel(data.support_level); 
                    setUserSupportLevelId(data.support_level_id);
                }
            }
        }
        fetchRole()
    }, [user?.id])

    const userRolesLevel = userRole ? { role: userRole, support_level_id: userSupportLevelId } : undefined;
    const { data: tickets, isLoading, error } = useUnassignedTickets(filters, userRolesLevel)

    return (
        <div className="space-y-8 pb-10">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
                        Incidents (File d'attente)
                    </h1>
                    <p className="text-muted-foreground font-medium">
                        Tickets récemment créés ou non assignés en attente de prise en charge.
                    </p>
                </div>
            </div>

            {/* STATS RAPIDES (Optionnelles pour la file) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col">
                    <span className="text-muted-foreground text-sm font-medium mb-1">Tickets dans la file</span>
                    <span className="text-3xl font-bold tracking-tight text-foreground">{tickets?.length || 0}</span>
                </div>
                <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 backdrop-blur-md flex flex-col">
                    <span className="text-amber-400/80 text-sm font-medium mb-1">En attente critique</span>
                    <span className="text-3xl font-bold tracking-tight text-amber-500">
                        {tickets?.filter(t => t.priority === 'critique').length || 0}
                    </span>
                </div>
            </div>

            <TicketFilters filters={filters} setFilters={setFilters} />

            {/* LISTE DES TICKETS (DATA TABLE) */}
            <div className="pt-4">
                <TicketTable tickets={tickets} isLoading={!mounted || isLoading} error={error} showAssignButton={true} userRole={userRole} userSupportLevel={userSupportLevel} />
            </div>

        </div>
    )
}
