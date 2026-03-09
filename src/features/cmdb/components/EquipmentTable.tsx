'use client'

import { useState, useMemo } from 'react'
import { EquipmentSheet } from './EquipmentSheet'
import type { Equipment } from '../actions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, RotateCcw } from 'lucide-react'
import { formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    EN_SERVICE: {
        label: 'En service',
        className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    },
    EN_PANNE: {
        label: 'En panne',
        className: 'bg-red-500/15 text-red-300 border border-red-500/30',
    },
    EN_REPARATION_INTERNE: {
        label: 'Réparation interne',
        className: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    },
    RMA_FOURNISSEUR: {
        label: 'RMA Fournisseur',
        className: 'bg-primary/15 text-primary/80 border border-primary/30 shadow-[0_0_8px_rgba(167,139,250,0.25)]',
    },
    REBUT: {
        label: 'Rebut',
        className: 'bg-primary/15 text-primary/80 border border-primary/30',
    },
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-white/10 text-muted-foreground border border-white/10' }
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${cfg.className}`}>
            {status === 'RMA_FOURNISSEUR' && <span className="w-1.5 h-1.5 rounded-full bg-primary/20 mr-1.5 animate-pulse" />}
            {status === 'EN_SERVICE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />}
            {cfg.label}
        </span>
    )
}

function WarrantyCell({ date }: { date: string | null }) {
    if (!date) return <span className="text-muted-foreground text-sm">—</span>
    const d = new Date(date)
    const daysLeft = differenceInDays(d, new Date())
    const expired = isPast(d)
    return (
        <span className={`text-sm font-medium ${expired ? 'text-red-400' : daysLeft < 60 ? 'text-amber-400' : 'text-muted-foreground'}`}>
            {expired ? '⚠ Expirée' : formatDistanceToNow(d, { addSuffix: true, locale: fr })}
        </span>
    )
}

interface Store {
    id: string
    name: string
    client?: { company: string } | null
}

interface EquipmentTableProps {
    equipments: Equipment[]
    stores: Store[]
}

export function EquipmentTable({ equipments, stores }: EquipmentTableProps) {
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
    const [selectedStore, setSelectedStore] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')

    // Filtres
    const [selectedBrands, setSelectedBrands] = useState<string[]>([])
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

    // Extraction dynamique des filtres
    const uniqueBrands = useMemo(() => {
        const brands = equipments.map(eq => eq.catalogue?.brand).filter(Boolean) as string[]
        return Array.from(new Set(brands)).sort()
    }, [equipments])

    const uniqueCategories = useMemo(() => {
        const categories = equipments.map(eq => eq.catalogue?.category).filter(Boolean) as string[]
        return Array.from(new Set(categories)).sort()
    }, [equipments])

    const uniqueStatuses = Object.keys(STATUS_CONFIG)

    // Moteur de recherche réactif
    const filteredEquipments = useMemo(() => {
        let result = equipments

        if (selectedStore !== 'all') {
            result = result.filter(eq => eq.store_id === selectedStore)
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            result = result.filter(eq =>
                eq.serial_number.toLowerCase().includes(term) ||
                eq.catalogue?.brand?.toLowerCase().includes(term) ||
                eq.catalogue?.model_name?.toLowerCase().includes(term) ||
                eq.catalogue?.category?.toLowerCase().includes(term)
            )
        }

        if (selectedStatuses.length > 0) {
            result = result.filter(eq => selectedStatuses.includes(eq.status))
        }

        if (selectedCategories.length > 0) {
            result = result.filter(eq => eq.catalogue?.category && selectedCategories.includes(eq.catalogue.category))
        }

        if (selectedBrands.length > 0) {
            result = result.filter(eq => eq.catalogue?.brand && selectedBrands.includes(eq.catalogue.brand))
        }

        return result
    }, [equipments, selectedStore, searchTerm, selectedStatuses, selectedCategories, selectedBrands])

    const toggleArrayItem = (array: string[], item: string, setArray: (val: string[]) => void) => {
        if (array.includes(item)) {
            setArray(array.filter(i => i !== item))
        } else {
            setArray([...array, item])
        }
    }

    const resetFilters = () => {
        setSelectedBrands([])
        setSelectedCategories([])
        setSelectedStatuses([])
        setSearchTerm('')
        setSelectedStore('all')
    }

    if (equipments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <span className="text-2xl">🖥️</span>
                </div>
                <p className="text-muted-foreground font-medium">Aucun équipement enregistré</p>
                <p className="text-foreground/25 text-sm mt-1">Cliquez sur « Ajouter un équipement » pour commencer.</p>
            </div>
        )
    }

    return (
        <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* SIDEBAR FILTRES */}
                <aside className="md:col-span-1 space-y-6 bg-white/[0.02] border border-white/5 rounded-2xl p-5 h-fit backdrop-blur-xl shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-foreground/90 font-semibold flex items-center gap-2">
                            Filtres
                        </h2>
                        {(selectedBrands.length > 0 || selectedCategories.length > 0 || selectedStatuses.length > 0 || searchTerm) && (
                            <button
                                onClick={resetFilters}
                                className="text-muted-foreground hover:text-foreground/80 transition-colors"
                                title="Réinitialiser les filtres"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Statut */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-foreground/70">Statut</h3>
                        <div className="space-y-2">
                            {uniqueStatuses.map(status => (
                                <div key={status} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`status-${status}`}
                                        checked={selectedStatuses.includes(status)}
                                        onCheckedChange={() => toggleArrayItem(selectedStatuses, status, setSelectedStatuses)}
                                        className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                                    />
                                    <label htmlFor={`status-${status}`} className="text-sm font-medium leading-none text-foreground/70 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                        {STATUS_CONFIG[status]?.label || status}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Catégorie */}
                    {uniqueCategories.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground/70">Catégorie</h3>
                            <div className="space-y-2">
                                {uniqueCategories.map(cat => (
                                    <div key={cat} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`cat-${cat}`}
                                            checked={selectedCategories.includes(cat)}
                                            onCheckedChange={() => toggleArrayItem(selectedCategories, cat, setSelectedCategories)}
                                            className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                                        />
                                        <label htmlFor={`cat-${cat}`} className="text-sm font-medium leading-none text-foreground/70 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                            {cat}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Marque */}
                    {uniqueBrands.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground/70">Marque</h3>
                            <div className="space-y-2">
                                {uniqueBrands.map(brand => (
                                    <div key={brand} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`brand-${brand}`}
                                            checked={selectedBrands.includes(brand)}
                                            onCheckedChange={() => toggleArrayItem(selectedBrands, brand, setSelectedBrands)}
                                            className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                                        />
                                        <label htmlFor={`brand-${brand}`} className="text-sm font-medium leading-none text-foreground/70 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                            {brand}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={resetFilters}
                        className="w-full mt-4 py-2 bg-white/5 hover:bg-white/10 text-foreground/70 text-sm font-medium rounded-lg transition-colors border border-white/5 flex items-center justify-center gap-2"
                    >
                        Réinitialiser
                    </button>
                </aside>

                {/* CONTENU PRINCIPAL */}
                <div className="md:col-span-3 space-y-4">
                    {/* Top Actions: Search + Store Select */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/[0.01] p-4 rounded-2xl border border-white/5">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par N° série, modèle, marque..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground h-10 w-full"
                            />
                        </div>
                        <div className="w-full sm:w-64">
                            <Select value={selectedStore} onValueChange={setSelectedStore}>
                                <SelectTrigger className="bg-white/5 border-white/10 text-foreground/70 h-10">
                                    <SelectValue placeholder="Tous les magasins" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les magasins</SelectItem>
                                    {stores.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.01]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="text-left text-muted-foreground font-medium text-xs tracking-widest uppercase px-6 py-4">N° Série</th>
                                    <th className="text-left text-muted-foreground font-medium text-xs tracking-widest uppercase px-4 py-4">Modèle</th>
                                    <th className="text-left text-muted-foreground font-medium text-xs tracking-widest uppercase px-4 py-4">Catégorie</th>
                                    <th className="text-left text-muted-foreground font-medium text-xs tracking-widest uppercase px-4 py-4">Magasin</th>
                                    <th className="text-left text-muted-foreground font-medium text-xs tracking-widest uppercase px-4 py-4">Statut</th>
                                    <th className="text-left text-muted-foreground font-medium text-xs tracking-widest uppercase px-4 py-4">Garantie</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEquipments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="text-muted-foreground mb-1">Aucun équipement ne correspond à vos critères</div>
                                            <button onClick={resetFilters} className="text-cyan-400 hover:text-cyan-300 text-sm">
                                                Effacer les filtres
                                            </button>
                                        </td>
                                    </tr>
                                ) : filteredEquipments.map((eq, i) => (
                                    <tr
                                        key={eq.id}
                                        onClick={() => setSelectedEquipment(eq)}
                                        className={`group border-b border-white/[0.03] cursor-pointer transition-all duration-150 hover:bg-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                                    >
                                        <td className="px-6 py-3.5 font-mono text-xs text-cyan-300/80 group-hover:text-cyan-200 transition-colors">
                                            {eq.serial_number}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="font-medium text-foreground/90">{eq.catalogue?.brand} {eq.catalogue?.model_name}</div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="text-muted-foreground text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                {eq.catalogue?.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="text-foreground/70">{eq.store?.name}</div>
                                            {eq.store?.client && (
                                                <div className="text-muted-foreground text-xs">{eq.store.client.company}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <StatusBadge status={eq.status} />
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <WarrantyCell date={eq.warranty_end_date} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedEquipment && (
                <EquipmentSheet
                    equipment={selectedEquipment}
                    open={!!selectedEquipment}
                    onOpenChange={(open) => { if (!open) setSelectedEquipment(null) }}
                />
            )}
        </div>
    )
}
