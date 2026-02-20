'use client'

import { useRealtimeTickets } from '@/hooks/useRealtimeTickets'

export function RealtimeSubscriber() {
    // Ce composant client appelle le hook temps réel
    useRealtimeTickets()

    // Il ne rend rien visuellement
    return null
}
