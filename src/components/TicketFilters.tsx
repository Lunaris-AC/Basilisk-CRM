'use client'

import { Search } from 'lucide-react'
import { TicketFilters as Filters } from '@/features/tickets/api/getTickets'
import { useActiveAssignees, useSupportLevels } from '@/features/tickets/api/useTickets'

export type TicketFiltersProps = {
    filters: Filters;
    setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}

export function TicketFilters({ filters, setFilters }: TicketFiltersProps) {
    const { data: activeAssignees } = useActiveAssignees()
    const { data: levels } = useSupportLevels()

    return (
        <div className="flex flex-col md:flex-row flex-wrap items-center gap-4 mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl w-full">

            {/* Recherche Textuelle */}
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Chercher par titre..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
                />
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                {/* Filtre Statut */}
                <select
                    value={filters.status || 'all'}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full md:w-40 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
                >
                    <option value="all">Tous les statuts</option>
                    <option value="nouveau">Nouveau</option>
                    <option value="assigne">Assigné</option>
                    <option value="en_cours">En cours</option>
                    <option value="attente_client">Attente client</option>
                    <option value="suspendu">Suspendu</option>
                    <option value="resolu">Résolu</option>
                </select>

                {/* Filtre Priorité */}
                <select
                    value={filters.priority || 'all'}
                    onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full md:w-36 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
                >
                    <option value="all">Toutes priorités</option>
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="critique">Critique</option>
                </select>

                {/* Filtre Service / Catégorie */}
                <select
                    value={filters.category || 'all'}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full md:w-40 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
                >
                    <option value="all">Tous Services</option>
                    <option value="HL">Support HL</option>
                    <option value="COMMERCE">Commerce</option>
                    <option value="SAV">SAV</option>
                    <option value="FORMATION">Formation</option>
                </select>

                {/* Filtre Niveau (Dynamic SPRINT 26.1) */}
                <select
                    value={filters.support_level_id || 'all'}
                    onChange={(e) => setFilters(prev => ({ ...prev, support_level_id: e.target.value }))}
                    className="w-full md:w-32 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none cursor-pointer"
                >
                    <option value="all">Tous Niveaux</option>
                    {levels?.map(lvl => (
                        <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
                    ))}
                </select>

                {/* Filtre Assigné */}
                <select
                    value={filters.assignee_id || 'all'}
                    onChange={(e) => setFilters(prev => ({ ...prev, assignee_id: e.target.value }))}
                    className="w-full md:w-48 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
                >
                    <option value="all">Tous les Assignés</option>
                    {activeAssignees?.map(profile => (
                        <option key={profile.id} value={profile.id}>
                            {profile.first_name} {profile.last_name} ({profile.role})
                        </option>
                    ))}
                </select>
            </div>

        </div>
    )
}
