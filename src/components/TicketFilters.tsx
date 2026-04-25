'use client'

import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { TicketFilters as Filters } from '@/features/tickets/api/getTickets'
import { useActiveAssignees, useSupportLevels } from '@/features/tickets/api/useTickets'
import { useState } from 'react'

import { useClientsWithStores } from '@/features/clients/api/useClients'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from "@/components/ui/select"

export type TicketFiltersProps = {
    filters: Filters;
    setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}

// ═══ Constantes de facettes ═══
const STATUS_OPTIONS = [
    { value: 'nouveau', label: 'Nouveau', color: 'bg-sky-500' },
    { value: 'assigne', label: 'Assigné', color: 'bg-indigo-500' },
    { value: 'en_cours', label: 'En cours', color: 'bg-amber-500' },
    { value: 'attente_client', label: 'Attente client', color: 'bg-orange-500' },
    { value: 'suspendu', label: 'Suspendu', color: 'bg-yellow-600' },
    { value: 'resolu', label: 'Résolu', color: 'bg-emerald-500' },
]

const PRIORITY_OPTIONS = [
    { value: 'basse', label: 'Basse', color: 'bg-white/30' },
    { value: 'normale', label: 'Normale', color: 'bg-blue-400' },
    { value: 'haute', label: 'Haute', color: 'bg-orange-500' },
    { value: 'critique', label: 'Critique', color: 'bg-rose-500' },
]

const CATEGORY_OPTIONS = [
    { value: 'HL', label: 'Support HL' },
    { value: 'COMMERCE', label: 'Commerce' },
    { value: 'SAV1', label: 'SAV 1 (Matériel)' },
    { value: 'SAV2', label: 'SAV 2 (Logiciel)' },
    { value: 'FORMATION', label: 'Formation' },
]

// ═══ Composant Checkbox Facette ═══
function FacetCheckbox({ checked, onChange, label, color, count }: { checked: boolean; onChange: () => void; label: string; color?: string; count?: number }) {
    return (
        <label onClick={onChange} className="flex items-center gap-2.5 cursor-pointer group py-1 px-1 rounded-lg hover:bg-white/5 transition-colors">
            <div className={`relative w-4 h-4 rounded border transition-all shrink-0 flex items-center justify-center
                ${checked ? 'bg-primary border-primary' : 'border-white/20 bg-black/20 group-hover:border-white/40'}`}>
                {checked && (
                    <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>
            {color && <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />}
            <span className={`text-sm transition-colors ${checked ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{label}</span>
            {count !== undefined && (
                <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono">{count}</span>
            )}
        </label>
    )
}

// ═══ Section pliable de facette ═══
function FacetSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="border-b border-white/5 last:border-b-0">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center justify-between w-full py-3 text-xs font-bold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
                {title}
                {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {open && <div className="pb-3 space-y-0.5">{children}</div>}
        </div>
    )
}

// ═══ Composant principal ═══
export function TicketFilters({ filters, setFilters }: TicketFiltersProps) {
    const { data: activeAssignees } = useActiveAssignees()
    const { data: levels } = useSupportLevels()
    const { data: clients } = useClientsWithStores()
    const [panelOpen, setPanelOpen] = useState(false)

    // Helpers pour multi-sélection
    const toggleArrayFilter = (key: 'statuses' | 'priorities' | 'support_level_ids' | 'store_ids', value: string) => {
        setFilters(prev => {
            const current = prev[key] || []
            const next = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value]
            return { ...prev, [key]: next }
        })
    }

    // Badges actifs : liste de tous les filtres cochés
    const activeBadges: { key: string; filterKey: 'statuses' | 'priorities' | 'support_level_ids' | 'store_ids' | 'status' | 'priority' | 'category' | 'support_level_id' | 'assignee_id'; value: string; label: string; color?: string }[] = []

    // Multi-select badges
    ;(filters.statuses || []).forEach(v => {
        const opt = STATUS_OPTIONS.find(o => o.value === v)
        if (opt) activeBadges.push({ key: `status-${v}`, filterKey: 'statuses', value: v, label: opt.label, color: opt.color })
    })
    ;(filters.priorities || []).forEach(v => {
        const opt = PRIORITY_OPTIONS.find(o => o.value === v)
        if (opt) activeBadges.push({ key: `prio-${v}`, filterKey: 'priorities', value: v, label: opt.label, color: opt.color })
    })
    ;(filters.support_level_ids || []).forEach(v => {
        const lvl = levels?.find(l => l.id === v)
        if (lvl) activeBadges.push({ key: `level-${v}`, filterKey: 'support_level_ids', value: v, label: lvl.name })
    })
    ;(filters.store_ids || []).forEach(v => {
        let storeName = "Magasin inconnu"
        clients?.forEach(c => {
            // Chercher dans les magasins directs des centrales
            c.centrales?.forEach(centrale => {
                const s = centrale.magasins_directs?.find(st => st.id === v)
                if (s) storeName = `${s.name} (${c.company})`
                
                // Chercher dans les mini-centrales
                centrale.mini_centrales?.forEach(mini => {
                    const ms = mini.stores?.find(st => st.id === v)
                    if (ms) storeName = `${ms.name} (${c.company})`
                })
            })
        })
        activeBadges.push({ key: `store-${v}`, filterKey: 'store_ids', value: v, label: storeName })
    })

    // Legacy single-select badges
    if (filters.status && filters.status !== 'all') {
        const opt = STATUS_OPTIONS.find(o => o.value === filters.status)
        if (opt && !(filters.statuses || []).includes(filters.status)) {
            activeBadges.push({ key: `legacy-status`, filterKey: 'status', value: 'all', label: opt.label, color: opt.color })
        }
    }
    if (filters.priority && filters.priority !== 'all') {
        const opt = PRIORITY_OPTIONS.find(o => o.value === filters.priority)
        if (opt && !(filters.priorities || []).includes(filters.priority)) {
            activeBadges.push({ key: `legacy-prio`, filterKey: 'priority', value: 'all', label: opt.label, color: opt.color })
        }
    }
    if (filters.category && filters.category !== 'all') {
        const opt = CATEGORY_OPTIONS.find(o => o.value === filters.category)
        if (opt) activeBadges.push({ key: `legacy-cat`, filterKey: 'category', value: 'all', label: opt.label })
    }
    if (filters.assignee_id && filters.assignee_id !== 'all') {
        const prof = activeAssignees?.find(a => a.id === filters.assignee_id)
        if (prof) activeBadges.push({ key: `legacy-assignee`, filterKey: 'assignee_id', value: 'all', label: `${prof.first_name} ${prof.last_name}` })
    }

    const removeBadge = (badge: typeof activeBadges[number]) => {
        if (badge.filterKey === 'statuses' || badge.filterKey === 'priorities' || badge.filterKey === 'support_level_ids' || badge.filterKey === 'store_ids') {
            toggleArrayFilter(badge.filterKey, badge.value)
        } else {
            setFilters(prev => ({ ...prev, [badge.filterKey]: 'all' }))
        }
    }

    const clearAllFilters = () => {
        setFilters(prev => ({
            search: prev.search,
            status: 'all',
            priority: 'all',
            category: prev.category, // on garde la catégorie par défaut du dashboard
            assignee_id: 'all',
            support_level_id: 'all',
            statuses: [],
            priorities: [],
            support_level_ids: [],
            store_ids: [],
        }))
    }

    const hasActiveFilters = activeBadges.length > 0

    return (
        <div className="space-y-3" suppressHydrationWarning>
            {/* ═══ Barre principale ═══ */}
            <div className="flex flex-col md:flex-row flex-wrap items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl w-full" suppressHydrationWarning>

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

                {/* Bouton Filtres avancés */}
                <button
                    type="button"
                    onClick={() => setPanelOpen(!panelOpen)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all
                        ${panelOpen
                            ? 'bg-primary/15 border-primary/40 text-primary'
                            : hasActiveFilters
                                ? 'bg-primary/10 border-primary/30 text-primary/80 hover:bg-primary/15'
                                : 'bg-black/40 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                        }`}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filtres
                    {hasActiveFilters && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black leading-none">
                            {activeBadges.length}
                        </span>
                    )}
                </button>

                {/* Filtres rapides legacy (Catégorie & Assigné & Magasin) */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Select
                        value={filters.store_ids?.[0] || 'all'}
                        onValueChange={(val) => setFilters(prev => ({ ...prev, store_ids: val === 'all' ? [] : [val] }))}
                    >
                        <SelectTrigger className="w-full md:w-56 h-[38px] bg-black/40 border-white/10 text-foreground">
                            <SelectValue placeholder="Magasin / Site" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            <SelectItem value="all">Tous les magasins</SelectItem>
                            {clients?.map((client) => {
                                // Aplatir les magasins pour l'affichage dans le select
                                const allStores: any[] = []
                                client.centrales?.forEach(c => {
                                    c.magasins_directs?.forEach(s => allStores.push(s))
                                    c.mini_centrales?.forEach(m => {
                                        m.stores?.forEach(s => allStores.push(s))
                                    })
                                })

                                if (allStores.length === 0) return null;
                                
                                return (
                                    <SelectGroup key={client.id}>
                                        <SelectLabel className="text-xs text-muted-foreground">{client.company}</SelectLabel>
                                        {allStores.map(store => (
                                            <SelectItem key={store.id} value={store.id} className="pl-6">
                                                {store.name} - {store.city}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                );
                            })}
                        </SelectContent>
                    </Select>

                    <select
                        value={filters.category || 'all'}
                        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full md:w-40 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
                    >
                        <option value="all">Tous Services</option>
                        {CATEGORY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

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

            {/* ═══ Badges filtres actifs ═══ */}
            {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                    {activeBadges.map(badge => (
                        <button
                            key={badge.key}
                            onClick={() => removeBadge(badge)}
                            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 hover:bg-rose-500/15 hover:border-rose-500/40 text-sm font-medium text-primary/90 hover:text-rose-300 transition-all"
                        >
                            {badge.color && <div className={`w-2 h-2 rounded-full ${badge.color} shrink-0`} />}
                            {badge.label}
                            <X className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ))}
                    <button
                        onClick={clearAllFilters}
                        className="text-xs text-muted-foreground hover:text-rose-400 transition-colors font-medium ml-1"
                    >
                        Tout effacer
                    </button>
                </div>
            )}

            {/* ═══ Panneau de facettes déplié ═══ */}
            {panelOpen && (
                <div className="animate-in slide-in-from-top-2 duration-200 p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Facette : Statuts */}
                        <div>
                            <FacetSection title="Statut">
                                {STATUS_OPTIONS.map(opt => (
                                    <FacetCheckbox
                                        key={opt.value}
                                        checked={(filters.statuses || []).includes(opt.value)}
                                        onChange={() => toggleArrayFilter('statuses', opt.value)}
                                        label={opt.label}
                                        color={opt.color}
                                    />
                                ))}
                            </FacetSection>
                        </div>

                        {/* Facette : Priorités */}
                        <div>
                            <FacetSection title="Priorité">
                                {PRIORITY_OPTIONS.map(opt => (
                                    <FacetCheckbox
                                        key={opt.value}
                                        checked={(filters.priorities || []).includes(opt.value)}
                                        onChange={() => toggleArrayFilter('priorities', opt.value)}
                                        label={opt.label}
                                        color={opt.color}
                                    />
                                ))}
                            </FacetSection>
                        </div>

                        {/* Facette : Niveaux de support */}
                        <div>
                            <FacetSection title="Niveau de support">
                                {levels?.map(lvl => (
                                    <FacetCheckbox
                                        key={lvl.id}
                                        checked={(filters.support_level_ids || []).includes(lvl.id)}
                                        onChange={() => toggleArrayFilter('support_level_ids', lvl.id)}
                                        label={lvl.name}
                                    />
                                )) || (
                                    <p className="text-xs text-muted-foreground italic py-2">Chargement...</p>
                                )}
                            </FacetSection>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
