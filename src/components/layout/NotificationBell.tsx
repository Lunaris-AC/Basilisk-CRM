'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Trash2, Info, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useNotificationStore, type NotificationType } from '@/hooks/useNotificationStore'
import { cn } from '@/lib/utils'

const typeConfig: Record<NotificationType, { icon: typeof Info; color: string }> = {
    info: { icon: Info, color: 'text-blue-400' },
    success: { icon: CheckCircle2, color: 'text-emerald-400' },
    warning: { icon: AlertTriangle, color: 'text-amber-400' },
}

export function NotificationBell() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore()

    const unreadCount = notifications.filter((n) => !n.read).length

    const handleNotificationClick = (id: string, ticketId?: string) => {
        markAsRead(id)
        if (ticketId) {
            setOpen(false)
            router.push(`/tickets/${ticketId}`)
        }
    }

    const formatDate = (iso: string) => {
        const date = new Date(iso)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMin = Math.floor(diffMs / 60000)

        if (diffMin < 1) return "À l'instant"
        if (diffMin < 60) return `Il y a ${diffMin}min`
        const diffH = Math.floor(diffMin / 60)
        if (diffH < 24) return `Il y a ${diffH}h`
        const diffD = Math.floor(diffH / 24)
        return `Il y a ${diffD}j`
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    id="notification-bell"
                    className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-lg transition-all"
                    title="Notifications"
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-black/80">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[380px] max-h-[480px] p-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h3 className="text-sm font-semibold text-foreground">
                        Notifications
                        {unreadCount > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                                ({unreadCount} non lue{unreadCount > 1 ? 's' : ''})
                            </span>
                        )}
                    </h3>
                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="p-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-md transition-all flex items-center gap-1"
                                title="Tout marquer comme lu"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={clearAll}
                                className="p-1.5 text-xs text-muted-foreground hover:text-rose-400 hover:bg-white/10 rounded-md transition-all flex items-center gap-1"
                                title="Tout supprimer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Liste */}
                <div className="overflow-y-auto max-h-[400px] divide-y divide-white/5">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Bell className="w-8 h-8 mb-2 opacity-30" />
                            <p className="text-sm">Aucune notification</p>
                        </div>
                    ) : (
                        notifications.map((notification) => {
                            const config = typeConfig[notification.type]
                            const Icon = config.icon

                            return (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification.id, notification.ticketId)}
                                    className={cn(
                                        'w-full text-left px-4 py-3 flex items-start gap-3 transition-all hover:bg-white/5',
                                        !notification.read && 'bg-primary/10',
                                        notification.ticketId && 'cursor-pointer'
                                    )}
                                >
                                    {/* Indicateur non lu */}
                                    <div className="mt-1.5 flex-shrink-0">
                                        {!notification.read ? (
                                            <div className="w-2 h-2 rounded-full bg-primary" />
                                        ) : (
                                            <div className="w-2 h-2" />
                                        )}
                                    </div>

                                    {/* Icône type */}
                                    <div className="mt-0.5 flex-shrink-0">
                                        <Icon className={cn('w-4 h-4', config.color)} />
                                    </div>

                                    {/* Contenu */}
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            'text-sm leading-tight',
                                            !notification.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/70'
                                        )}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                                            {formatDate(notification.createdAt)}
                                        </p>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
