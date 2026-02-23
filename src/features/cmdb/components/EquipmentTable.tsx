'use client'

import { useState } from 'react'
import { EquipmentSheet } from './EquipmentSheet'
import type { Equipment } from '../actions'
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
        className: 'bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-[0_0_8px_rgba(167,139,250,0.25)]',
    },
    REBUT: {
        label: 'Rebut',
        className: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
    },
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-white/10 text-white/50 border border-white/10' }
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${cfg.className}`}>
            {status === 'RMA_FOURNISSEUR' && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mr-1.5 animate-pulse" />}
            {status === 'EN_SERVICE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />}
            {cfg.label}
        </span>
    )
}

function WarrantyCell({ date }: { date: string | null }) {
    if (!date) return <span className="text-white/30 text-sm">—</span>
    const d = new Date(date)
    const daysLeft = differenceInDays(d, new Date())
    const expired = isPast(d)
    return (
        <span className={`text-sm font-medium ${expired ? 'text-red-400' : daysLeft < 60 ? 'text-amber-400' : 'text-white/60'}`}>
            {expired ? '⚠ Expirée' : formatDistanceToNow(d, { addSuffix: true, locale: fr })}
        </span>
    )
}

interface EquipmentTableProps {
    equipments: Equipment[]
}

export function EquipmentTable({ equipments }: EquipmentTableProps) {
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)

    if (equipments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <span className="text-2xl">🖥️</span>
                </div>
                <p className="text-white/40 font-medium">Aucun équipement enregistré</p>
                <p className="text-white/25 text-sm mt-1">Cliquez sur « Ajouter un équipement » pour commencer.</p>
            </div>
        )
    }

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="text-left text-white/40 font-medium text-xs tracking-widest uppercase px-6 py-4">N° Série</th>
                            <th className="text-left text-white/40 font-medium text-xs tracking-widest uppercase px-4 py-4">Modèle</th>
                            <th className="text-left text-white/40 font-medium text-xs tracking-widest uppercase px-4 py-4">Catégorie</th>
                            <th className="text-left text-white/40 font-medium text-xs tracking-widest uppercase px-4 py-4">Magasin</th>
                            <th className="text-left text-white/40 font-medium text-xs tracking-widest uppercase px-4 py-4">Statut</th>
                            <th className="text-left text-white/40 font-medium text-xs tracking-widest uppercase px-4 py-4">Garantie</th>
                        </tr>
                    </thead>
                    <tbody>
                        {equipments.map((eq, i) => (
                            <tr
                                key={eq.id}
                                onClick={() => setSelectedEquipment(eq)}
                                className={`group border-b border-white/[0.03] cursor-pointer transition-all duration-150 hover:bg-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                            >
                                <td className="px-6 py-3.5 font-mono text-xs text-cyan-300/80 group-hover:text-cyan-200 transition-colors">
                                    {eq.serial_number}
                                </td>
                                <td className="px-4 py-3.5">
                                    <div className="font-medium text-white/90">{eq.catalogue?.brand} {eq.catalogue?.model_name}</div>
                                </td>
                                <td className="px-4 py-3.5">
                                    <span className="text-white/50 text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                        {eq.catalogue?.category}
                                    </span>
                                </td>
                                <td className="px-4 py-3.5">
                                    <div className="text-white/70">{eq.store?.name}</div>
                                    {eq.store?.client && (
                                        <div className="text-white/40 text-xs">{eq.store.client.company}</div>
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

            {selectedEquipment && (
                <EquipmentSheet
                    equipment={selectedEquipment}
                    open={!!selectedEquipment}
                    onOpenChange={(open) => { if (!open) setSelectedEquipment(null) }}
                />
            )}
        </>
    )
}
