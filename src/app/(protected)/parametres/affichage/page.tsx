'use client'

import { useState, useEffect } from 'react'
import { Monitor, Layout, Maximize2, Columns, Grid3X3, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDisplayStore, DisplayMode } from '@/hooks/useDisplayStore'

const LAYOUTS = [
    {
        id: 'FOCUS' as DisplayMode,
        name: 'Mode Focus',
        description: 'Un seul module à la fois. Idéal pour petits écrans.',
        icon: Maximize2
    },
    {
        id: 'TABS' as DisplayMode,
        name: 'Mode Onglets',
        description: "Barre d'onglets sous la Topbar pour basculer rapidement entre les modules.",
        icon: Columns
    },
    {
        id: 'GRID' as DisplayMode,
        name: 'Mode Grille',
        description: "Affichez jusqu'à 4 modules simultanément avec Drag & Drop.",
        icon: Grid3X3
    }
]

export default function AffichagePage() {
    const { mode, setMode } = useDisplayStore()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleLayoutSelect = (layoutId: DisplayMode) => {
        setMode(layoutId)
    }

    if (!mounted) return null

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl space-y-8">
                <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Layout className="w-5 h-5 text-primary" />
                        Disposition de l'interface
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Choisissez comment les modules de Basilisk s'affichent sur votre écran.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {LAYOUTS.map((layout) => {
                        const Icon = layout.icon
                        const isSelected = mode === layout.id
                        return (
                            <button
                                key={layout.id}
                                onClick={() => handleLayoutSelect(layout.id)}
                                className={cn(
                                    "text-left p-6 rounded-3xl border transition-all flex items-center gap-6 group relative overflow-hidden",
                                    isSelected
                                        ? "bg-primary/10 border-primary ring-1 ring-primary/40 shadow-xl shadow-primary/10"
                                        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]"
                                )}
                            >
                                <div className={cn(
                                    "p-4 rounded-2xl transition-colors",
                                    isSelected ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground group-hover:text-foreground"
                                )}>
                                    <Icon className="w-6 h-6" />
                                </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-black text-sm text-foreground uppercase tracking-wider">{layout.name}</h4>
                                        {isSelected && (
                                            <div className="px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-[9px] font-black text-primary uppercase">
                                                Actif
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{layout.description}</p>
                                </div>

                                {isSelected && (
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                                        <Check className="w-4 h-4" />
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <p className="text-[10px] text-amber-500/60 text-center italic leading-relaxed">
                        Note : Le changement de disposition nécessite un rafraîchissement des modules ouverts pour être pleinement effectif.
                    </p>
                </div>
            </div>
        </div>
    )
}
