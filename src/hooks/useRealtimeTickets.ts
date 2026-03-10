'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useAuthUser } from '@/features/tickets/api/useTickets'
import { toast } from 'sonner'
import { useNotificationStore } from '@/hooks/useNotificationStore'

export function useRealtimeTickets() {
    const queryClient = useQueryClient()
    const { data: user } = useAuthUser()

    useEffect(() => {
        const supabase = createClient()

        // Abonnement au canal temps réel pour la table 'tickets'
        const channel = supabase
            .channel('realtime-tickets-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'tickets',
                },
                async (payload) => {
                    console.log('Realtime update received on tickets:', payload)

                    // Invalider les caches concernés
                    queryClient.invalidateQueries({ queryKey: ['myTickets'] })
                    queryClient.invalidateQueries({ queryKey: ['unassignedTickets'] })
                    queryClient.invalidateQueries({ queryKey: ['ticket', (payload.new as any)?.id] })

                    const ticket = payload.new as any

                    // --- Notifications enrichies (Toast Sonner) + Store persistant ---
                    const { addNotification } = useNotificationStore.getState()

                    if (payload.eventType === 'INSERT' && ticket) {
                        // Récupérer le nom du magasin depuis Supabase
                        let storeName = 'Inconnu'
                        if (ticket.store_id) {
                            const { data: store } = await supabase
                                .from('stores')
                                .select('name')
                                .eq('id', ticket.store_id)
                                .single()
                            if (store?.name) storeName = store.name
                        }

                        const isCritique = ticket.priority === 'critique'
                        const isHaute = ticket.priority === 'haute'
                        const priorityLabel = (ticket.priority || 'normale').toUpperCase()

                        const toastTitle = isCritique ? `🚨 Nouveau ticket : ${priorityLabel}` : `📩 Nouveau ticket : ${priorityLabel}`
                        const toastDesc = `${ticket.title || 'Sans titre'} — Magasin : ${storeName}`

                        toast(toastTitle, {
                                description: toastDesc,
                                duration: isCritique ? 10000 : 5000,
                                classNames: isCritique
                                    ? { toast: 'flex items-start gap-3 w-full max-w-sm p-4 rounded-2xl bg-black/80 backdrop-blur-xl border-2 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.4)] text-foreground animate-pulse' }
                                    : isHaute
                                        ? { toast: 'flex items-start gap-3 w-full max-w-sm p-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.3)] text-foreground' }
                                        : undefined,
                            }
                        )

                        // Notification persistante
                        addNotification({
                            title: toastTitle,
                            message: toastDesc,
                            type: isCritique ? 'warning' : 'info',
                            ticketId: ticket.id,
                        })
                    } else if (payload.eventType === 'UPDATE' && ticket) {
                        const old = payload.old as any

                        // Si le ticket vient d'être assigné à l'utilisateur actuel
                        if (ticket.assignee_id === user?.id && old.assignee_id !== user?.id) {
                            const assignTitle = '📌 Ticket assigné'
                            const assignDesc = `Le ticket "${ticket.title || 'Sans titre'}" vous a été assigné.`

                            toast(assignTitle, {
                                description: assignDesc,
                                duration: 6000,
                            })

                            // Notification persistante
                            addNotification({
                                title: assignTitle,
                                message: assignDesc,
                                type: 'success',
                                ticketId: ticket.id,
                            })
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ticket_comments',
                },
                (payload) => {
                    console.log('Realtime update received on comments:', payload)
                    // Invalider les commentaires pour ce ticket précis
                    queryClient.invalidateQueries({ queryKey: ['ticketComments', (payload.new as any)?.ticket_id] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [queryClient, user?.id])
}
