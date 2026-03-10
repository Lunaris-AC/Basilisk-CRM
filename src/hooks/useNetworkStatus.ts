'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOfflineStore } from '@/hooks/useOfflineStore'
import { toast } from 'sonner'

/**
 * Hook détecteur de réseau.  
 * Écoute les événements `online` / `offline` du navigateur.  
 * Déclenche automatiquement `processQueue()` au retour du réseau.
 */
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(true)
    const queryClient = useQueryClient()

    const handleOnline = useCallback(async () => {
        setIsOnline(true)

        const { syncQueue, processQueue } = useOfflineStore.getState()
        if (syncQueue.length > 0) {
            toast.info('📡 Réseau détecté — Synchronisation en cours…', { duration: 3000 })
            const count = syncQueue.length
            await processQueue()

            // Invalider les caches pour rafraîchir les données réelles
            queryClient.invalidateQueries({ queryKey: ['myTickets'] })
            queryClient.invalidateQueries({ queryKey: ['unassignedTickets'] })
            queryClient.invalidateQueries({ queryKey: ['ticket'] })
            queryClient.invalidateQueries({ queryKey: ['ticketComments'] })

            toast.success(`✅ Synchronisation terminée (${count} action${count > 1 ? 's' : ''} envoyée${count > 1 ? 's' : ''}).`, { duration: 5000 })
        }
    }, [queryClient])

    const handleOffline = useCallback(() => {
        setIsOnline(false)
    }, [])

    useEffect(() => {
        // État initial côté client
        setIsOnline(navigator.onLine)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [handleOnline, handleOffline])

    return { isOnline }
}
