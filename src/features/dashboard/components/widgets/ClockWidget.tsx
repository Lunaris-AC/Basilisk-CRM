'use client'

import React from 'react'
import { WorldClock } from '@/components/layout/WorldClock'
import { Globe } from 'lucide-react'

export function ClockWidget() {
    return (
        <div className="flex flex-col items-center justify-center h-full space-y-8">
            <Globe className="w-24 h-24 text-foreground/10" />
            <div className="scale-150 origin-center bg-black/40 p-4 rounded-2xl border border-white/5 shadow-2xl">
                <WorldClock />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-[200px]">
                Consultez l'heure globale selon la zone sélectionnée.
            </p>
        </div>
    )
}
