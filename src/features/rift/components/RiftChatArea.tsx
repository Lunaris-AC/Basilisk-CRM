'use client'

// SPRINT 50.2 - Basilisk Rift : Zone de chat centrale avec Infinite Scroll

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { Hash, Lock, Users, MessageSquare, Loader2, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRiftStore } from '@/hooks/useRiftStore'
import { RiftMessageComponent } from './RiftMessage'
import { RiftMessageInput } from './RiftMessageInput'

interface RiftChatAreaProps {
    currentUserId: string
}

export function RiftChatArea({ currentUserId }: RiftChatAreaProps) {
    const {
        activeChannel,
        messages,
        hasMoreMessages,
        isLoadingMessages,
        loadMoreMessages,
        fetchReadReceipts,
    } = useRiftStore()

    const chatContainerRef = useRef<HTMLDivElement>(null)
    const prevMessageCount = useRef(0)

    // ── Scroll to bottom quand de nouveaux messages arrivent ──
    useEffect(() => {
        if (messages.length > prevMessageCount.current) {
            const isNewMessage = messages.length - prevMessageCount.current <= 2
            if (isNewMessage && chatContainerRef.current) {
                // Scroll smooth pour les nouveaux messages (envoi ou réception)
                // On utilise scrollTop au lieu de scrollIntoView pour ne pas scroller le parent <main>
                chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' })
            }
        }
        prevMessageCount.current = messages.length
    }, [messages.length])

    // ── Scroll to bottom à l'ouverture du channel ──
    useEffect(() => {
        if (activeChannel && messages.length > 0) {
            setTimeout(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
                }
            }, 100)
        }
    }, [activeChannel?.id])

    // ── Charger les accusés de lecture pour les messages visibles ──
    useEffect(() => {
        if (messages.length === 0) return
        const ownMessages = messages
            .filter(m => m.user_id === currentUserId && !m.deleted_at)
            .map(m => m.id)
        if (ownMessages.length > 0) {
            fetchReadReceipts(ownMessages)
        }
    }, [messages, currentUserId, fetchReadReceipts])

    // ── Bouton "Charger plus" ──
    const handleLoadMore = useCallback(async () => {
        if (!chatContainerRef.current) return
        const container = chatContainerRef.current
        const prevScrollHeight = container.scrollHeight

        await loadMoreMessages()

        // Maintenir la position de scroll après le chargement
        requestAnimationFrame(() => {
            const newScrollHeight = container.scrollHeight
            container.scrollTop = newScrollHeight - prevScrollHeight
        })
    }, [loadMoreMessages])

    // ── Déterminer si un message est le premier de son auteur dans un "groupe" ──
    const messageGroups = useMemo(() => {
        return messages.map((msg, i) => {
            const prev = i > 0 ? messages[i - 1] : null
            // Un message est "premier de groupe" si l'auteur précédent est différent
            // ou si plus de 5 minutes se sont écoulées
            const isFirstInGroup = !prev
                || prev.user_id !== msg.user_id
                || (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) > 5 * 60 * 1000
            return { message: msg, isFirstInGroup }
        })
    }, [messages])

    const memberCount = activeChannel?.members?.length ?? 0

    // ── État vide : aucun channel sélectionné ──
    if (!activeChannel) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                    <MessageSquare className="w-10 h-10 text-primary/60" />
                </div>
                <h3 className="text-xl font-bold text-foreground/80 mb-2">Bienvenue sur Rift</h3>
                <p className="text-sm text-muted-foreground/60 max-w-sm">
                    Sélectionnez un salon ou une conversation dans la barre latérale pour commencer à discuter.
                </p>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
            {/* Header du channel */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-black/20 backdrop-blur-xl flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    {activeChannel.type === 'PUBLIC' ? (
                        <Hash className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : activeChannel.type === 'PRIVATE_GROUP' ? (
                        <Lock className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                        <MessageSquare className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate">
                            {activeChannel.type === 'DM'
                                ? activeChannel.members?.find(m => m.user_id !== currentUserId)?.profile
                                    ? `${activeChannel.members.find(m => m.user_id !== currentUserId)!.profile!.first_name} ${activeChannel.members.find(m => m.user_id !== currentUserId)!.profile!.last_name}`
                                    : 'Message privé'
                                : activeChannel.name ?? 'Sans nom'
                            }
                        </h3>
                        {activeChannel.type !== 'DM' && (
                            <p className="text-[10px] text-muted-foreground/50">
                                {memberCount} membre{memberCount > 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors" title="Membres">
                        <Users className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Zone des messages */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto custom-scrollbar py-4 min-h-0"
            >
                {/* Bouton charger plus */}
                {hasMoreMessages && (
                    <div className="flex justify-center py-3">
                        <button
                            onClick={handleLoadMore}
                            disabled={isLoadingMessages}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all',
                                'bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground',
                                isLoadingMessages && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            {isLoadingMessages ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <ChevronUp className="w-3.5 h-3.5" />
                            )}
                            Charger les messages précédents
                        </button>
                    </div>
                )}

                {/* Loading initial */}
                {isLoadingMessages && messages.length === 0 && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* Messages vides */}
                {!isLoadingMessages && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                            <MessageSquare className="w-7 h-7 text-muted-foreground/30" />
                        </div>
                        <p className="text-sm text-muted-foreground/50">
                            Aucun message pour le moment.
                        </p>
                        <p className="text-xs text-muted-foreground/30 mt-1">
                            Soyez le premier à envoyer un message !
                        </p>
                    </div>
                )}

                {/* Liste des messages */}
                {messageGroups.map(({ message, isFirstInGroup }) => (
                    <RiftMessageComponent
                        key={message.id}
                        message={message}
                        currentUserId={currentUserId}
                        isLastByUser={isFirstInGroup}
                        channelMemberCount={memberCount}
                    />
                ))}
            </div>

            {/* Barre de saisie */}
            <RiftMessageInput />
        </div>
    )
}
