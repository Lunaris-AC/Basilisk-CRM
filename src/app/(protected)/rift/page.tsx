'use client'

// SPRINT 50.2 - Basilisk Rift : Page principale de la messagerie interne

import { useEffect, useState } from 'react'
import { useRiftStore } from '@/hooks/useRiftStore'
import { RiftSidebar } from '@/features/rift/components/RiftSidebar'
import { RiftChatArea } from '@/features/rift/components/RiftChatArea'
import { createClient } from '@/utils/supabase/client'
import { Loader2 } from 'lucide-react'

export default function RiftPage() {
    const {
        subscribeToPresence,
        unsubscribeFromPresence,
        subscribeToMembers,
        unsubscribeFromMembers,
        cleanup,
    } = useRiftStore()

    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [isUnauthorized, setIsUnauthorized] = useState(false)

    // ── Vérifier l'authentification et le rôle ──
    useEffect(() => {
        const supabase = createClient()

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return

            supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
                .then(({ data: profile }) => {
                    if (!profile || profile.role === 'CLIENT') {
                        setIsUnauthorized(true)
                        return
                    }
                    setCurrentUserId(user.id)
                })
        })
    }, [])

    // ── Initialiser Presence & Members realtime ──
    useEffect(() => {
        if (!currentUserId) return

        subscribeToPresence()
        subscribeToMembers()

        return () => {
            unsubscribeFromPresence()
            unsubscribeFromMembers()
        }
    }, [currentUserId, subscribeToPresence, unsubscribeFromPresence, subscribeToMembers, unsubscribeFromMembers])

    // ── Cleanup global au démontage ──
    useEffect(() => {
        return () => cleanup()
    }, [cleanup])

    // ── Accès refusé pour les clients ──
    if (isUnauthorized) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <p className="text-lg font-bold text-rose-400 mb-2">Accès refusé</p>
                    <p className="text-sm text-muted-foreground">
                        La messagerie Rift est réservée aux utilisateurs internes.
                    </p>
                </div>
            </div>
        )
    }

    // ── Chargement ──
    if (!currentUserId) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100%+3rem)] md:h-[calc(100%+4rem)] -m-6 md:-m-8 overflow-hidden border border-white/[0.06] bg-black/20 backdrop-blur-xl">
            <RiftSidebar currentUserId={currentUserId} />
            <RiftChatArea currentUserId={currentUserId} />
        </div>
    )
}
