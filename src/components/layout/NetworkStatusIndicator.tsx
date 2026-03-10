'use client'

import { CloudOff, Cloud } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineStore } from '@/hooks/useOfflineStore'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function NetworkStatusIndicator() {
    const { isOnline } = useNetworkStatus()
    const queueLength = useOfflineStore((s) => s.syncQueue.length)

    // Animation de flash vert au retour online
    const [showOnlineFlash, setShowOnlineFlash] = useState(false)

    useEffect(() => {
        if (isOnline) {
            setShowOnlineFlash(true)
            const timer = setTimeout(() => setShowOnlineFlash(false), 3000)
            return () => clearTimeout(timer)
        }
    }, [isOnline])

    // Offline → toujours visible
    if (!isOnline) {
        return (
            <div
                className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 animate-pulse"
                title={`Mode hors-ligne${queueLength > 0 ? ` — ${queueLength} action${queueLength > 1 ? 's' : ''} en attente` : ''}`}
            >
                <CloudOff className="w-4 h-4" />
                <span className="text-[10px] font-bold tracking-wider uppercase hidden sm:inline">Offline</span>
                {queueLength > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 text-[9px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-black/80">
                        {queueLength}
                    </span>
                )}
            </div>
        )
    }

    // Online + flash de synchro → vert furtif
    if (showOnlineFlash) {
        return (
            <div
                className={cn(
                    'flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 transition-opacity duration-1000',
                    'opacity-100'
                )}
                title="Connecté"
            >
                <Cloud className="w-4 h-4" />
                <span className="text-[10px] font-bold tracking-wider uppercase hidden sm:inline">En ligne</span>
            </div>
        )
    }

    // Online normal → rien affiché
    return null
}
