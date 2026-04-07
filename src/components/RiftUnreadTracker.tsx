'use client'

// Composant global qui initialise le suivi des messages non lus Rift
// Monté dans le layout protégé pour que le badge Sidebar fonctionne partout

import { useEffect } from 'react'
import { useRiftStore } from '@/hooks/useRiftStore'
import { createClient } from '@/utils/supabase/client'

export function RiftUnreadTracker() {
    const { fetchUnreadCounts, subscribeToUnread, unsubscribeFromUnread } = useRiftStore()

    useEffect(() => {
        let cancelled = false
        const supabase = createClient()

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (cancelled || !user) return

            // Vérifier que c'est un utilisateur interne
            supabase
                .from('profiles')
                .select('role, support_level')
                .eq('id', user.id)
                .single()
                .then(({ data: profile }) => {
                    if (cancelled || !profile || profile.role === 'CLIENT') return

                    // Charger les compteurs initiaux
                    fetchUnreadCounts()
                    // S'abonner aux nouveaux messages pour mise à jour temps réel
                    subscribeToUnread()
                })
        })

        return () => {
            cancelled = true
            unsubscribeFromUnread()
        }
    }, [fetchUnreadCounts, subscribeToUnread, unsubscribeFromUnread])

    return null
}
