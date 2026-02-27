'use client'

import { useState, useTransition } from 'react'
import { HardDrive, Trash2, RefreshCw } from 'lucide-react'
import type { EquipmentCatalogue } from '../actions'
import { deleteCatalogueItem } from '../actions'
import { useRouter } from 'next/navigation'

interface CatalogueTableProps {
    catalogues: EquipmentCatalogue[]
}

export function CatalogueTable({ catalogues }: CatalogueTableProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleDelete = (id: string) => {
        if (!window.confirm('Voulez-vous vraiment supprimer ce modèle ?')) return
        setDeletingId(id)
        startTransition(async () => {
            const res = await deleteCatalogueItem(id)
            setDeletingId(null)
            if (res?.error) {
                alert(res.error)
            } else {
                router.refresh()
            }
        })
    }

    if (catalogues.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <HardDrive className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-white/40 font-medium">Aucun modèle dans le catalogue</p>
                <p className="text-white/25 text-sm mt-1">Cliquez sur « Nouveau Modèle » pour commencer.</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/5">
                        <th className="text-left text-white/40 font-medium text-xs tracking-widest uppercase px-6 py-4">Catégorie</th>
                        <th className="text-left text-white/40 font-medium text-xs tracking-widest uppercase px-4 py-4">Marque</th>
                        <th className="text-left text-white/40 font-medium text-xs tracking-widest uppercase px-4 py-4">Modèle</th>
                        <th className="text-left text-white/40 font-medium text-xs tracking-widest uppercase px-4 py-4">Schéma (Aperçu)</th>
                        <th className="text-right text-white/40 font-medium text-xs tracking-widest uppercase px-6 py-4">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {catalogues.map((cat, i) => (
                        <tr
                            key={cat.id}
                            className={`group border-b border-white/[0.03] transition-all duration-150 hover:bg-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                        >
                            <td className="px-6 py-3.5">
                                <span className="text-white/50 text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-medium">
                                    {cat.category}
                                </span>
                            </td>
                            <td className="px-4 py-3.5 font-medium text-white/90">
                                {cat.brand}
                            </td>
                            <td className="px-4 py-3.5 text-white/70">
                                {cat.model_name}
                            </td>
                            <td className="px-4 py-3.5">
                                <div className="font-mono text-[10px] text-white/40 bg-white/5 p-2 rounded border border-white/10 max-w-xs truncate">
                                    {JSON.stringify(cat.custom_fields_schema)}
                                </div>
                            </td>
                            <td className="px-6 py-3.5 text-right">
                                <button
                                    onClick={() => handleDelete(cat.id)}
                                    disabled={isPending && deletingId === cat.id}
                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
                                    title="Supprimer ce modèle"
                                >
                                    {isPending && deletingId === cat.id ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
