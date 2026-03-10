import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/utils/supabase/client'

export type OfflineActionType = 'UPDATE_TICKET' | 'ADD_COMMENT'

export interface OfflineAction {
    id: string
    type: OfflineActionType
    payload: Record<string, unknown>
    timestamp: string
}

interface OfflineStore {
    syncQueue: OfflineAction[]
    addToQueue: (action: Omit<OfflineAction, 'id' | 'timestamp'>) => void
    removeFromQueue: (id: string) => void
    clearQueue: () => void
    processQueue: () => Promise<void>
}

export const useOfflineStore = create<OfflineStore>()(
    persist(
        (set, get) => ({
            syncQueue: [],

            addToQueue: (action) =>
                set((state) => ({
                    syncQueue: [
                        ...state.syncQueue,
                        {
                            ...action,
                            id: crypto.randomUUID(),
                            timestamp: new Date().toISOString(),
                        },
                    ],
                })),

            removeFromQueue: (id) =>
                set((state) => ({
                    syncQueue: state.syncQueue.filter((a) => a.id !== id),
                })),

            clearQueue: () => set({ syncQueue: [] }),

            processQueue: async () => {
                const { syncQueue, removeFromQueue } = get()
                const supabase = createClient()

                for (const action of syncQueue) {
                    try {
                        if (action.type === 'UPDATE_TICKET') {
                            const { ticketId, newStatus } = action.payload as {
                                ticketId: string
                                newStatus: string
                            }

                            // Reproduire la logique SLA côté serveur en passant par Supabase directement
                            const { data: currentTicket } = await supabase
                                .from('tickets')
                                .select('status, sla_paused_at, sla_deadline_at, sla_elapsed_minutes')
                                .eq('id', ticketId)
                                .single()

                            const now = new Date()
                            const slaUpdates: Record<string, unknown> = {}

                            if (currentTicket) {
                                const wasPaused = currentTicket.sla_paused_at !== null

                                if (newStatus === 'attente_client' && !wasPaused) {
                                    slaUpdates.sla_paused_at = now.toISOString()
                                } else if (wasPaused && newStatus !== 'attente_client') {
                                    const pausedAt = new Date(currentTicket.sla_paused_at as string)
                                    const deltaMinutes = Math.round((now.getTime() - pausedAt.getTime()) / 60000)
                                    const previousElapsed = (currentTicket.sla_elapsed_minutes as number) ?? 0
                                    const previousDeadline = currentTicket.sla_deadline_at
                                        ? new Date(currentTicket.sla_deadline_at as string)
                                        : null

                                    slaUpdates.sla_paused_at = null
                                    slaUpdates.sla_elapsed_minutes = previousElapsed + deltaMinutes
                                    if (previousDeadline) {
                                        slaUpdates.sla_deadline_at = new Date(
                                            previousDeadline.getTime() + deltaMinutes * 60000
                                        ).toISOString()
                                    }
                                }
                            }

                            const { error } = await supabase
                                .from('tickets')
                                .update({ status: newStatus, ...slaUpdates })
                                .eq('id', ticketId)

                            if (error) throw error

                        } else if (action.type === 'ADD_COMMENT') {
                            const { ticketId, content, isInternal, authorId } = action.payload as {
                                ticketId: string
                                content: string
                                isInternal: boolean
                                authorId: string
                            }

                            const { error: insertError } = await supabase
                                .from('ticket_comments')
                                .insert({
                                    ticket_id: ticketId,
                                    author_id: authorId,
                                    content,
                                    is_internal: isInternal,
                                })

                            if (insertError) throw insertError

                            // Mettre à jour le timestamp du ticket
                            await supabase
                                .from('tickets')
                                .update({ updated_at: new Date().toISOString() })
                                .eq('id', ticketId)
                        }

                        // Succès → retirer de la file
                        removeFromQueue(action.id)
                    } catch (err) {
                        console.error(`[OfflineSync] Échec de la synchronisation pour l'action ${action.id}:`, err)
                        // On ne retire pas, on réessaiera plus tard
                        break
                    }
                }
            },
        }),
        {
            name: 'basilisk-offline-queue',
        }
    )
)
