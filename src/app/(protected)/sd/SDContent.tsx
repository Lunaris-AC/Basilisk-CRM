'use client'

import { useState, useTransition } from 'react'
import { useSDs } from '@/features/tickets/api/useTickets'
import { SDFilters } from '@/features/tickets/api/getTickets'
import { assignSD } from '@/features/tickets/actions'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
    Code2, Bug, Sparkles, Search, Loader2, ArrowRight, Filter, UserPlus, Zap
} from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    nouveau: { label: 'Nouveau', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    assigne: { label: 'Assigné', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    en_cours: { label: 'En cours', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    attente_client: { label: 'Attente', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    resolu: { label: 'Résolu', color: 'bg-primary/20 text-primary/80 border-primary/30' },
    ferme: { label: 'Fermé', color: 'bg-primary/20 text-primary/80 border-primary/30' },
}

const COMPLEXITY_LABELS: Record<string, { label: string; color: string }> = {
    HOTFIX: { label: 'HOTFIX', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]' },
    S: { label: 'S', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    M: { label: 'M', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    L: { label: 'L', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    XL: { label: 'XL', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    MAJEUR: { label: 'MAJEUR', color: 'bg-primary/20 text-primary/80 border-primary/40 shadow-[0_0_8px_rgba(168,85,247,0.2)]' },
}

export function SDContent() {
    const queryClient = useQueryClient()
    const [filters, setFilters] = useState<SDFilters>({})
    const [search, setSearch] = useState('')
    const [isPending, startTransition] = useTransition()
    const [assigningId, setAssigningId] = useState<string | null>(null)

    const { data: sds, isLoading } = useSDs(filters)
    const { data: profile } = useQuery({
        queryKey: ['my-profile-sd'],
        queryFn: async () => {
            const { createClient } = await import('@/utils/supabase/client')
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            return data
        },
        staleTime: 1000 * 60 * 5,
    })

    const isDev = profile?.role === 'DEV' || profile?.role === 'ADMIN'

    const handleSearch = (value: string) => {
        setSearch(value)
        setFilters(prev => ({ ...prev, search: value || undefined }))
    }

    const handleAssign = (ticketId: string) => {
        setAssigningId(ticketId)
        startTransition(async () => {
            const res = await assignSD(ticketId)
            if (res.error) {
                alert(res.error)
            }
            queryClient.invalidateQueries({ queryKey: ['sds'] })
            setAssigningId(null)
        })
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="relative">
                <div className="absolute -top-6 -left-6 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />

                <div className="relative flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-primary/20 border border-cyan-500/30 rounded-2xl shadow-lg shadow-cyan-500/10">
                            <Code2 className="w-7 h-7 text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-400 to-primary bg-clip-text text-transparent">
                                Portail SD
                            </h1>
                            <p className="text-sm text-muted-foreground mt-0.5">Bugs & Évolutions — Département Développement</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        <span>{sds?.length ?? 0} SD{(sds?.length ?? 0) > 1 ? 's' : ''} actif{(sds?.length ?? 0) > 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-sm font-bold text-muted-foreground">
                    <Filter className="w-4 h-4" /> Filtres
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder="Rechercher un SD..."
                            className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-foreground text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                        />
                    </div>

                    {/* Type */}
                    <select
                        value={filters.sd_type || 'all'}
                        onChange={e => setFilters(prev => ({ ...prev, sd_type: e.target.value as any }))}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all appearance-none"
                    >
                        <option value="all">Tous les types</option>
                        <option value="BUG">🐛 Bugs</option>
                        <option value="EVOLUTION">✨ Évolutions</option>
                    </select>

                    {/* Complexity */}
                    <select
                        value={filters.complexity || 'all'}
                        onChange={e => setFilters(prev => ({ ...prev, complexity: e.target.value }))}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all appearance-none"
                    >
                        <option value="all">Toutes complexités</option>
                        <option value="HOTFIX">🔥 Hotfix</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="MAJEUR">⚡ Majeur</option>
                    </select>

                    {/* Status */}
                    <select
                        value={filters.status || 'all'}
                        onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all appearance-none"
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="nouveau">Nouveau</option>
                        <option value="assigne">Assigné</option>
                        <option value="en_cours">En cours</option>
                        <option value="attente_client">Attente</option>
                        <option value="resolu">Résolu</option>
                        <option value="ferme">Fermé</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
            ) : !sds || sds.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                    <Code2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Aucun SD trouvé</p>
                    <p className="text-sm mt-1">Modifiez vos filtres ou créez un nouveau SD via le bouton &quot;Nouveau Ticket&quot;.</p>
                </div>
            ) : (
                <div className="rounded-2xl overflow-hidden border border-white/10 backdrop-blur-md bg-white/[0.02]">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="text-left px-5 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Titre</th>
                                <th className="text-center px-3 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                                <th className="text-center px-3 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Complexité</th>
                                <th className="text-center px-3 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Statut</th>
                                <th className="text-left px-3 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigné</th>
                                <th className="text-left px-3 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                                <th className="text-right px-5 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sds.map(sd => {
                                const typeInfo = sd.dev_details?.type === 'BUG'
                                    ? { icon: <Bug className="w-3.5 h-3.5" />, label: 'Bug', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
                                    : { icon: <Sparkles className="w-3.5 h-3.5" />, label: 'Évo', color: 'bg-primary/20 text-primary/80 border-primary/30' }
                                const complexity = sd.dev_details?.complexity ? COMPLEXITY_LABELS[sd.dev_details.complexity] : null
                                const status = STATUS_LABELS[sd.status] || STATUS_LABELS.nouveau

                                return (
                                    <tr key={sd.id} className="group hover:bg-white/[0.03] transition-colors">
                                        <td className="px-5 py-4">
                                            <Link href={`/tickets/${sd.id}`} className="font-semibold text-foreground hover:text-cyan-300 transition-colors truncate block max-w-[300px]">
                                                {sd.title}
                                            </Link>
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">{sd.description}</p>
                                        </td>
                                        <td className="text-center px-3 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${typeInfo.color}`}>
                                                {typeInfo.icon}
                                                {typeInfo.label}
                                            </span>
                                        </td>
                                        <td className="text-center px-3 py-4">
                                            {complexity ? (
                                                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border ${complexity.color}`}>
                                                    {complexity.label}
                                                </span>
                                            ) : (
                                                <span className="text-foreground/20 text-xs italic">—</span>
                                            )}
                                        </td>
                                        <td className="text-center px-3 py-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-3 py-4">
                                            {sd.assignee ? (
                                                <span className="text-sm text-foreground/70">{sd.assignee.first_name} {sd.assignee.last_name}</span>
                                            ) : (
                                                <span className="text-xs text-foreground/20 italic">Non assigné</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-4 text-xs text-muted-foreground">
                                            {new Date(sd.created_at).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center gap-2 justify-end">
                                                {/* Assign button for DEV users */}
                                                {isDev && !sd.assignee && (
                                                    <button
                                                        onClick={() => handleAssign(sd.id)}
                                                        disabled={isPending && assigningId === sd.id}
                                                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                    >
                                                        {isPending && assigningId === sd.id
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <UserPlus className="w-3 h-3" />
                                                        }
                                                        Prendre
                                                    </button>
                                                )}
                                                <Link
                                                    href={`/tickets/${sd.id}`}
                                                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground text-xs font-medium border border-white/10 transition-all flex items-center gap-1.5"
                                                >
                                                    Détail <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
