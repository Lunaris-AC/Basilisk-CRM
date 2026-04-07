'use client'

// SPRINT 50.2 - Basilisk Rift : Store Zustand temps réel pour la messagerie interne

import { create } from 'zustand'
import { createClient } from '@/utils/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ==========================================
// TYPES
// ==========================================

export type RiftChannelType = 'PUBLIC' | 'PRIVATE_GROUP' | 'DM'

export type RiftPresenceStatus = 'online' | 'away' | 'dnd' | 'offline'

export interface RiftChannel {
    id: string
    name: string | null
    type: RiftChannelType
    created_by: string
    created_at: string
    // Dénormalisé pour l'affichage
    members?: RiftChannelMember[]
    unread_count?: number
}

export interface RiftChannelMember {
    channel_id: string
    user_id: string
    joined_at: string
    profile?: {
        id: string
        first_name: string
        last_name: string
        avatar_url: string | null
        role: string;
  support_level?: string
    }
}

export interface RiftMessage {
    id: string
    channel_id: string
    user_id: string
    content: string
    reply_to_id: string | null
    is_edited: boolean
    deleted_at: string | null
    created_at: string
    // Dénormalisé
    profile?: {
        id: string
        first_name: string
        last_name: string
        avatar_url: string | null
        role: string;
  support_level?: string
    }
    reply_to?: {
        id: string
        content: string
        user_id: string
        profile?: { first_name: string; last_name: string }
    } | null
    reactions?: RiftReaction[]
}

export interface RiftMessageEdit {
    id: string
    message_id: string
    old_content: string
    created_at: string
}

export interface RiftReaction {
    id: string
    message_id: string
    user_id: string
    emoji: string
}

export interface RiftReadReceipt {
    message_id: string
    user_id: string
    read_at: string
}

export interface RiftOnlineUser {
    user_id: string
    status: RiftPresenceStatus
    last_seen: string
}

// ==========================================
// STORE INTERFACE
// ==========================================

interface RiftStore {
    // ── State ──
    channels: RiftChannel[]
    activeChannel: RiftChannel | null
    messages: RiftMessage[]
    onlineUsers: Map<string, RiftOnlineUser>
    readReceipts: Map<string, RiftReadReceipt[]> // message_id → receipts
    unreadCounts: Map<string, number> // channel_id → unread count
    totalUnread: number
    hasMoreMessages: boolean
    isLoadingMessages: boolean
    isLoadingChannels: boolean
    replyingTo: RiftMessage | null

    // ── Subscriptions (internes) ──
    _messagesChannel: RealtimeChannel | null
    _presenceChannel: RealtimeChannel | null
    _membersChannel: RealtimeChannel | null
    _unreadChannel: RealtimeChannel | null

    // ── Actions : Channels ──
    fetchChannels: () => Promise<void>
    setActiveChannel: (channel: RiftChannel | null) => void

    // ── Actions : Messages ──
    fetchMessages: (channelId: string, reset?: boolean) => Promise<void>
    loadMoreMessages: () => Promise<void>
    addOptimisticMessage: (msg: RiftMessage) => void
    updateMessage: (msg: Partial<RiftMessage> & { id: string }) => void
    removeMessage: (msgId: string) => void

    // ── Actions : Presence ──
    setMyPresence: (status: RiftPresenceStatus) => void

    // ── Actions : Read Receipts ──
    markAsRead: (messageId: string) => Promise<void>
    fetchReadReceipts: (messageIds: string[]) => Promise<void>

    // ── Actions : Unread ──
    fetchUnreadCounts: () => Promise<void>
    markChannelAsRead: (channelId: string) => Promise<void>

    // ── Actions : Reply ──
    setReplyingTo: (msg: RiftMessage | null) => void

    // ── Realtime : Subscribe / Unsubscribe ──
    subscribeToMessages: (channelId: string) => void
    unsubscribeFromMessages: () => void
    subscribeToPresence: () => void
    unsubscribeFromPresence: () => void
    subscribeToMembers: () => void
    unsubscribeFromMembers: () => void
    subscribeToUnread: () => void
    unsubscribeFromUnread: () => void

    // ── Cleanup ──
    cleanup: () => void
}

// ==========================================
// CONSTANTES
// ==========================================

const MESSAGES_PER_PAGE = 50

// ==========================================
// STORE
// ==========================================

export const useRiftStore = create<RiftStore>((set, get) => ({
    // ── Initial state ──
    channels: [],
    activeChannel: null,
    messages: [],
    onlineUsers: new Map(),
    readReceipts: new Map(),
    unreadCounts: new Map(),
    totalUnread: 0,
    hasMoreMessages: true,
    isLoadingMessages: false,
    isLoadingChannels: false,
    replyingTo: null,
    _messagesChannel: null,
    _presenceChannel: null,
    _membersChannel: null,
    _unreadChannel: null,

    // ══════════════════════════════════════
    // CHANNELS
    // ══════════════════════════════════════

    fetchChannels: async () => {
        set({ isLoadingChannels: true })
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Récupérer les channels dont l'utilisateur est membre
            const { data: memberRows } = await supabase
                .from('rift_channel_members')
                .select('channel_id')
                .eq('user_id', user.id)

            const channelIds = memberRows?.map(r => r.channel_id) ?? []
            if (channelIds.length === 0) {
                set({ channels: [], isLoadingChannels: false })
                return
            }

            const { data: channels } = await supabase
                .from('rift_channels')
                .select(`
                    *,
                    members:rift_channel_members(
                        user_id,
                        joined_at,
                        profile:profiles(id, first_name, last_name, avatar_url, role)
                    )
                `)
                .in('id', channelIds)
                .order('created_at', { ascending: false })

            set({ channels: (channels as RiftChannel[]) ?? [], isLoadingChannels: false })

            // Charger les compteurs de non-lus
            get().fetchUnreadCounts()
        } catch (err) {
            console.error('[Rift] Erreur fetchChannels:', err)
            set({ isLoadingChannels: false })
        }
    },

    setActiveChannel: (channel) => {
        const prev = get().activeChannel
        if (prev?.id === channel?.id) return

        // Unsub de l'ancien channel messages
        get().unsubscribeFromMessages()

        set({
            activeChannel: channel,
            messages: [],
            hasMoreMessages: true,
            replyingTo: null,
        })

        if (channel) {
            get().fetchMessages(channel.id, true)
            get().subscribeToMessages(channel.id)
            // Marquer le channel comme lu
            get().markChannelAsRead(channel.id)
        }
    },

    // ══════════════════════════════════════
    // MESSAGES
    // ══════════════════════════════════════

    fetchMessages: async (channelId, reset = false) => {
        const state = get()
        if (state.isLoadingMessages) return

        set({ isLoadingMessages: true })

        try {
            const supabase = createClient()
            const currentMessages = reset ? [] : state.messages
            const offset = currentMessages.length

            // 1. Requête principale (sans self-join reply_to qui cause des erreurs PostgREST)
            const { data, error } = await supabase
                .from('rift_messages')
                .select(`
                    *,
                    profile:profiles!rift_messages_user_id_fkey(id, first_name, last_name, avatar_url, role),
                    reactions:rift_reactions(id, message_id, user_id, emoji)
                `)
                .eq('channel_id', channelId)
                .order('created_at', { ascending: false })
                .range(offset, offset + MESSAGES_PER_PAGE - 1)

            if (error) {
                console.error('[Rift] Erreur fetchMessages:', error.message ?? error.code ?? JSON.stringify(error))
                set({ isLoadingMessages: false })
                return
            }

            const fetched = (data ?? []) as RiftMessage[]

            // 2. Enrichir les messages qui ont un reply_to_id (batch)
            const replyIds = [...new Set(fetched.filter(m => m.reply_to_id).map(m => m.reply_to_id!))]
            let repliesMap: Record<string, RiftMessage['reply_to']> = {}

            if (replyIds.length > 0) {
                const { data: replies } = await supabase
                    .from('rift_messages')
                    .select('id, content, user_id, profile:profiles!rift_messages_user_id_fkey(first_name, last_name)')
                    .in('id', replyIds)

                if (replies) {
                    repliesMap = Object.fromEntries(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        replies.map((r: any) => [r.id, {
                            id: r.id,
                            content: r.content,
                            user_id: r.user_id,
                            profile: Array.isArray(r.profile) ? r.profile[0] : r.profile,
                        } as RiftMessage['reply_to']])
                    )
                }
            }

            const enriched = fetched.map(m => ({
                ...m,
                reply_to: m.reply_to_id ? (repliesMap[m.reply_to_id] ?? null) : null,
            }))

            set({
                messages: reset
                    ? enriched.reverse()
                    : [...enriched.reverse(), ...currentMessages],
                hasMoreMessages: fetched.length === MESSAGES_PER_PAGE,
                isLoadingMessages: false,
            })
        } catch (err) {
            console.error('[Rift] Erreur fetchMessages:', err)
            set({ isLoadingMessages: false })
        }
    },

    loadMoreMessages: async () => {
        const { activeChannel, hasMoreMessages, isLoadingMessages } = get()
        if (!activeChannel || !hasMoreMessages || isLoadingMessages) return
        await get().fetchMessages(activeChannel.id, false)
    },

    addOptimisticMessage: (msg) => {
        set((s) => ({ messages: [...s.messages, msg] }))
    },

    updateMessage: (partial) => {
        set((s) => ({
            messages: s.messages.map((m) =>
                m.id === partial.id ? { ...m, ...partial } : m
            ),
        }))
    },

    removeMessage: (msgId) => {
        set((s) => ({
            messages: s.messages.filter((m) => m.id !== msgId),
        }))
    },

    // ══════════════════════════════════════
    // PRESENCE
    // ══════════════════════════════════════

    setMyPresence: (status) => {
        const channel = get()._presenceChannel
        if (!channel) return
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            channel.track({
                user_id: user.id,
                status,
                last_seen: new Date().toISOString(),
            })
        })
    },

    // ══════════════════════════════════════
    // READ RECEIPTS
    // ══════════════════════════════════════

    markAsRead: async (messageId) => {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            await supabase
                .from('rift_read_receipts')
                .upsert(
                    { message_id: messageId, user_id: user.id, read_at: new Date().toISOString() },
                    { onConflict: 'message_id,user_id' }
                )
        } catch (err) {
            console.error('[Rift] Erreur markAsRead:', err)
        }
    },

    fetchReadReceipts: async (messageIds) => {
        if (messageIds.length === 0) return
        try {
            const supabase = createClient()
            const { data } = await supabase
                .from('rift_read_receipts')
                .select('*')
                .in('message_id', messageIds)

            if (!data) return

            const map = new Map<string, RiftReadReceipt[]>(get().readReceipts)
            for (const receipt of data) {
                const existing = map.get(receipt.message_id) ?? []
                const idx = existing.findIndex(r => r.user_id === receipt.user_id)
                if (idx >= 0) {
                    existing[idx] = receipt
                } else {
                    existing.push(receipt)
                }
                map.set(receipt.message_id, existing)
            }
            set({ readReceipts: map })
        } catch (err) {
            console.error('[Rift] Erreur fetchReadReceipts:', err)
        }
    },

    // ══════════════════════════════════════
    // UNREAD COUNTS
    // ══════════════════════════════════════

    fetchUnreadCounts: async () => {
        try {
            const supabase = createClient()
            const { data, error } = await supabase.rpc('get_rift_unread_counts')
            if (error) {
                console.error('[Rift] Erreur fetchUnreadCounts:', error)
                return
            }
            const map = new Map<string, number>()
            let total = 0
            for (const row of (data ?? [])) {
                map.set(row.channel_id, row.unread_count)
                total += row.unread_count
            }
            set({ unreadCounts: map, totalUnread: total })
        } catch (err) {
            console.error('[Rift] Erreur fetchUnreadCounts:', err)
        }
    },

    markChannelAsRead: async (channelId) => {
        try {
            const supabase = createClient()
            await supabase.rpc('mark_rift_channel_read', { p_channel_id: channelId })
            // Mettre à jour les unread counts localement
            const counts = new Map(get().unreadCounts)
            const removed = counts.get(channelId) ?? 0
            counts.delete(channelId)
            set({
                unreadCounts: counts,
                totalUnread: Math.max(0, get().totalUnread - removed),
            })
        } catch (err) {
            console.error('[Rift] Erreur markChannelAsRead:', err)
        }
    },

    // ══════════════════════════════════════
    // REPLY
    // ══════════════════════════════════════

    setReplyingTo: (msg) => set({ replyingTo: msg }),

    // ══════════════════════════════════════
    // REALTIME SUBSCRIPTIONS
    // ══════════════════════════════════════

    subscribeToMessages: (channelId) => {
        const supabase = createClient()

        const channel = supabase
            .channel(`rift_messages_${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'rift_messages',
                    filter: `channel_id=eq.${channelId}`,
                },
                async (payload) => {
                    const newMsg = payload.new as RiftMessage

                    // Vérifier qu'il n'est pas déjà dans la liste (par ID réel)
                    const exists = get().messages.some(m => m.id === newMsg.id)
                    if (exists) return

                    // Enrichir avec le profil
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id, first_name, last_name, avatar_url, role')
                        .eq('id', newMsg.user_id)
                        .single()

                    const enriched: RiftMessage = { ...newMsg, profile: profile ?? undefined }

                    // Si c'est une réponse, charger le message d'origine
                    if (newMsg.reply_to_id) {
                        const { data: replyData } = await supabase
                            .from('rift_messages')
                            .select('id, content, user_id, profile:profiles!rift_messages_user_id_fkey(first_name, last_name)')
                            .eq('id', newMsg.reply_to_id)
                            .single()
                        enriched.reply_to = replyData as RiftMessage['reply_to']
                    }

                    // Chercher un message optimiste (temp-*) du même auteur avec le même contenu → le remplacer
                    const tempIdx = get().messages.findIndex(
                        m => m.id.startsWith('temp-') && m.user_id === newMsg.user_id && m.content === newMsg.content
                    )

                    if (tempIdx >= 0) {
                        // Remplacer le message optimiste par le vrai
                        set((s) => ({
                            messages: s.messages.map((m, i) =>
                                i === tempIdx ? enriched : m
                            ),
                        }))
                    } else {
                        set((s) => ({ messages: [...s.messages, enriched] }))
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'rift_messages',
                    filter: `channel_id=eq.${channelId}`,
                },
                (payload) => {
                    const updated = payload.new as RiftMessage
                    get().updateMessage(updated)
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'rift_reactions',
                },
                (payload) => {
                    const reaction = payload.new as RiftReaction
                    const msgs = get().messages
                    const msg = msgs.find(m => m.id === reaction.message_id)
                    if (msg) {
                        const newReactions = [...(msg.reactions || []), reaction]
                        get().updateMessage({ id: msg.id, reactions: newReactions })
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'rift_reactions',
                },
                (payload) => {
                    const deletedId = payload.old.id
                    const msgs = get().messages
                    for (const msg of msgs) {
                        if (msg.reactions?.some(r => r.id === deletedId)) {
                            const newReactions = msg.reactions.filter(r => r.id !== deletedId)
                            get().updateMessage({ id: msg.id, reactions: newReactions })
                            break
                        }
                    }
                }
            )
            .subscribe()

        set({ _messagesChannel: channel })
    },

    unsubscribeFromMessages: () => {
        const channel = get()._messagesChannel
        if (channel) {
            const supabase = createClient()
            supabase.removeChannel(channel)
            set({ _messagesChannel: null })
        }
    },

    subscribeToPresence: () => {
        const supabase = createClient()

        const channel = supabase.channel('rift_global_presence', {
            config: { presence: { key: '' } },
        })

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                const users = new Map<string, RiftOnlineUser>()

                for (const key of Object.keys(state)) {
                    const presences = state[key] as unknown as RiftOnlineUser[]
                    for (const p of presences) {
                        if (p.user_id) {
                            users.set(p.user_id, p)
                        }
                    }
                }

                set({ onlineUsers: users })
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                        await channel.track({
                            user_id: user.id,
                            status: 'online' as RiftPresenceStatus,
                            last_seen: new Date().toISOString(),
                        })
                    }
                }
            })

        set({ _presenceChannel: channel })
    },

    unsubscribeFromPresence: () => {
        const channel = get()._presenceChannel
        if (channel) {
            const supabase = createClient()
            supabase.removeChannel(channel)
            set({ _presenceChannel: null })
        }
    },

    subscribeToMembers: () => {
        const supabase = createClient()

        const channel = supabase
            .channel('rift_members_global')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'rift_channel_members',
                },
                () => {
                    // Recharger les channels quand les membres changent
                    get().fetchChannels()
                }
            )
            .subscribe()

        set({ _membersChannel: channel })
    },

    unsubscribeFromMembers: () => {
        const channel = get()._membersChannel
        if (channel) {
            const supabase = createClient()
            supabase.removeChannel(channel)
            set({ _membersChannel: null })
        }
    },

    subscribeToUnread: () => {
        const supabase = createClient()

        const channel = supabase
            .channel('rift_unread_global')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'rift_messages',
                },
                async (payload) => {
                    const newMsg = payload.new as { channel_id: string; user_id: string }
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user || newMsg.user_id === user.id) return

                    const active = get().activeChannel
                    if (active?.id === newMsg.channel_id) {
                        // Channel actif : marquer comme lu automatiquement
                        get().markChannelAsRead(newMsg.channel_id)
                    } else {
                        // Autre channel : incrémenter le compteur local
                        const counts = new Map(get().unreadCounts)
                        counts.set(newMsg.channel_id, (counts.get(newMsg.channel_id) ?? 0) + 1)
                        let total = 0
                        counts.forEach(v => total += v)
                        set({ unreadCounts: counts, totalUnread: total })
                    }
                }
            )
            .subscribe()

        set({ _unreadChannel: channel })
    },

    unsubscribeFromUnread: () => {
        const channel = get()._unreadChannel
        if (channel) {
            const supabase = createClient()
            supabase.removeChannel(channel)
            set({ _unreadChannel: null })
        }
    },

    // ══════════════════════════════════════
    // CLEANUP
    // ══════════════════════════════════════

    cleanup: () => {
        get().unsubscribeFromMessages()
        get().unsubscribeFromPresence()
        get().unsubscribeFromMembers()
        get().unsubscribeFromUnread()
        set({
            channels: [],
            activeChannel: null,
            messages: [],
            onlineUsers: new Map(),
            readReceipts: new Map(),
            unreadCounts: new Map(),
            totalUnread: 0,
            hasMoreMessages: true,
            replyingTo: null,
        })
    },
}))
