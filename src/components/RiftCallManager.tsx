'use client'

// SPRINT 50.3 - Basilisk Rift : Gestionnaire global des appels
// S'abonne aux notifications d'appels et affiche l'overlay partout

import { useEffect, useState } from 'react'
import { useRiftStore } from '@/hooks/useRiftStore'
import { createClient } from '@/utils/supabase/client'
import { RiftCallOverlay } from '@/features/rift/components/RiftCallOverlay'

export function RiftCallManager() {
    const { subscribeToCalls, unsubscribeFromCalls } = useRiftStore()
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        const supabase = createClient()

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (cancelled || !user) return
            setCurrentUserId(user.id)
            
            // S'abonner aux appels (globalement)
            subscribeToCalls()
        })

        return () => {
            cancelled = true
            unsubscribeFromCalls()
        }
    }, [subscribeToCalls, unsubscribeFromCalls])

    if (!currentUserId) return null

    return <RiftCallOverlay currentUserId={currentUserId} />
}
