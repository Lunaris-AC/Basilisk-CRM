import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationType = 'info' | 'success' | 'warning'

export interface Notification {
    id: string
    title: string
    message: string
    type: NotificationType
    read: boolean
    createdAt: string
    ticketId?: string
}

interface NotificationStore {
    notifications: Notification[]
    addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
    markAsRead: (id: string) => void
    markAllAsRead: () => void
    clearAll: () => void
}

export const useNotificationStore = create<NotificationStore>()(
    persist(
        (set) => ({
            notifications: [],

            addNotification: (notification) =>
                set((state) => ({
                    notifications: [
                        {
                            ...notification,
                            id: crypto.randomUUID(),
                            read: false,
                            createdAt: new Date().toISOString(),
                        },
                        ...state.notifications,
                    ],
                })),

            markAsRead: (id) =>
                set((state) => ({
                    notifications: state.notifications.map((n) =>
                        n.id === id ? { ...n, read: true } : n
                    ),
                })),

            markAllAsRead: () =>
                set((state) => ({
                    notifications: state.notifications.map((n) => ({ ...n, read: true })),
                })),

            clearAll: () => set({ notifications: [] }),
        }),
        {
            name: 'basilisk-notifications',
        }
    )
)
