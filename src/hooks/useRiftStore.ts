'use client'

// SPRINT 50.2 - Basilisk Rift : Store Zustand temps réel pour la messagerie interne
// SPRINT 50.3 - Moteur Jitsi pour les Appels (Audio/Vidéo/Écran)

import { create } from 'zustand'
import { createClient } from '@/utils/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ==========================================
// TYPES
// ==========================================

export type RiftChannelType = 'PUBLIC' | 'PRIVATE_GROUP' | 'DM'
export type RiftPresenceStatus = 'online' | 'away' | 'busy' | 'offline'

export interface RiftChannel {
    id: string
    name: string | null
    type: RiftChannelType
    created_by: string
    created_at: string
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
    entity_id: string | null
    entity_type: string | null
    is_forwarded: boolean
    forwarded_from_id: string | null
    profile?: {
        id: string
        first_name: string
        last_name: string
        avatar_url: string | null
        role: string;
        support_level?: string
        presence_status?: RiftPresenceStatus
    }
    reply_to?: {
        id: string
        content: string
        user_id: string
        profile?: { first_name: string; last_name: string }
    } | null
    forwarded_from?: {
        id: string
        user_id: string
        profile?: { first_name: string; last_name: string }
    } | null
    reactions?: RiftReaction[]
}

export interface RiftCall {
    id: string
    channel_id: string
    created_by: string
    status: 'ACTIVE' | 'ENDED'
    type: 'AUDIO' | 'VIDEO'
    started_at: string
}

export interface RiftOnlineUser {
    user_id: string
    status: RiftPresenceStatus
    last_seen: string
}

export interface RiftReaction {
    id: string
    message_id: string
    user_id: string
    emoji: string
}

interface RiftStore {
    // ── State ──
    channels: RiftChannel[]
    activeChannel: RiftChannel | null
    messages: RiftMessage[]
    onlineUsers: Map<string, RiftOnlineUser>
    unreadCounts: Map<string, number>
    readReceipts: Map<string, any[]>
    activeCallsMap: Map<string, RiftCall>
    totalUnread: number
    hasMoreMessages: boolean
    isLoadingMessages: boolean
    isLoadingChannels: boolean
    replyingTo: RiftMessage | null
    activeCall: RiftCall | null
    incomingCall: RiftCall | null

    // ── Subscriptions ──
    _messagesChannel: RealtimeChannel | null
    _presenceChannel: RealtimeChannel | null
    _unreadChannel: RealtimeChannel | null
    _callsChannel: RealtimeChannel | null
    _membersChannel: RealtimeChannel | null

    // ── Actions ──
    fetchChannels: () => Promise<void>
    setActiveChannel: (channel: RiftChannel | null) => void
    fetchMessages: (channelId: string, reset?: boolean) => Promise<void>
    loadMoreMessages: () => Promise<void>
    setActiveCall: (call: RiftCall | null) => void
    setIncomingCall: (call: RiftCall | null) => void
    setReplyingTo: (msg: RiftMessage | null) => void
    fetchActiveCalls: () => Promise<void>

    // ── Actions : Messages ──
    addOptimisticMessage: (msg: RiftMessage) => void
    updateMessage: (msg: Partial<RiftMessage> & { id: string }) => void
    removeMessage: (msgId: string) => void
    
    // ── Presence & Read Receipts ──
    setMyPresence: (status: RiftPresenceStatus) => Promise<void>
    markAsRead: (messageId: string) => Promise<void>
    markChannelAsRead: (channelId: string) => Promise<void>
    fetchUnreadCounts: () => Promise<void>
    fetchReadReceipts: (messageIds: string[]) => Promise<void>

    // ── Sub/Unsub ──
    subscribeToMessages: (channelId: string) => void
    unsubscribeFromMessages: () => void
    subscribeToPresence: () => void
    unsubscribeFromPresence: () => void
    subscribeToUnread: () => void
    unsubscribeFromUnread: () => void
    subscribeToCalls: () => void
    unsubscribeFromCalls: () => void
    subscribeToMembers: () => void
    unsubscribeFromMembers: () => void
    cleanup: () => void
}

export const useRiftStore = create<RiftStore>((set, get) => ({
    channels: [],
    activeChannel: null,
    messages: [],
    onlineUsers: new Map(),
    unreadCounts: new Map(),
    readReceipts: new Map(),
    activeCallsMap: new Map(),
    totalUnread: 0,
    hasMoreMessages: true,
    isLoadingMessages: false,
    isLoadingChannels: false,
    replyingTo: null,
    activeCall: null,
    incomingCall: null,
    _messagesChannel: null,
    _presenceChannel: null,
    _unreadChannel: null,
    _callsChannel: null,
    _membersChannel: null,

    fetchChannels: async () => {
        set({ isLoadingChannels: true })
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: memberRows } = await supabase.from('rift_channel_members').select('channel_id').eq('user_id', user.id)
        const ids = memberRows?.map(r => r.channel_id) ?? []
        if (ids.length === 0) { set({ channels: [], isLoadingChannels: false }); return; }

        const { data: channels } = await supabase.from('rift_channels').select('*, members:rift_channel_members(*, profile:profiles(*))').in('id', ids).order('created_at', { ascending: false })
        set({ channels: channels as RiftChannel[] ?? [], isLoadingChannels: false })
        get().fetchUnreadCounts()
        get().fetchActiveCalls()
    },

    setActiveChannel: (channel) => {
        if (get().activeChannel?.id === channel?.id) return
        get().unsubscribeFromMessages()
        set({ activeChannel: channel, messages: [], hasMoreMessages: true, replyingTo: null })
        if (channel) {
            get().fetchMessages(channel.id, true)
            get().subscribeToMessages(channel.id)
            get().markChannelAsRead(channel.id)
        }
    },

    fetchMessages: async (channelId, reset = false) => {
        if (get().isLoadingMessages) return
        set({ isLoadingMessages: true })
        
        try {
            const offset = reset ? 0 : get().messages.length
            const { data, error } = await createClient()
                .from('rift_messages')
                .select('*, profile:profiles!rift_messages_user_id_fkey(*), reactions:rift_reactions(*)')
                .eq('channel_id', channelId)
                .order('created_at', { ascending: false })
                .range(offset, offset + 49)

            if (error) {
                console.error('[Rift] Erreur fetchMessages:', error)
                set({ isLoadingMessages: false })
                return
            }

            const fetchedMsgs = (data as RiftMessage[]) || []
            const reversed = [...fetchedMsgs].reverse()

            set(s => ({
                messages: reset ? reversed : [...reversed, ...s.messages],
                hasMoreMessages: fetchedMsgs.length === 50,
                isLoadingMessages: false
            }))
        } catch (err) {
            console.error('[Rift] Erreur fatale fetchMessages:', err)
            set({ isLoadingMessages: false })
        }
    },

    loadMoreMessages: async () => {
        if (get().activeChannel) await get().fetchMessages(get().activeChannel!.id)
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

    setActiveCall: (call) => set({ activeCall: call }),
    setIncomingCall: (call) => set({ incomingCall: call }),
    setReplyingTo: (msg) => set({ replyingTo: msg }),

    fetchActiveCalls: async () => {
        const { data } = await createClient().from('rift_calls').select('*').eq('status', 'ACTIVE')
        const map = new Map<string, RiftCall>()
        data?.forEach(c => map.set(c.channel_id, c))
        set({ activeCallsMap: map })
    },

    setMyPresence: async (status) => {
        const ch = get()._presenceChannel
        if (!ch) return
        const { data: { user } } = await createClient().auth.getUser()
        if (user) ch.track({ user_id: user.id, status, last_seen: new Date().toISOString() })
    },

    markAsRead: async (mid) => {
        // AGGRESSIVE FILTERING
        if (!mid || typeof mid !== 'string' || mid.startsWith('temp-')) return
        
        const { data: { user } } = await createClient().auth.getUser()
        if (user) await createClient().from('rift_read_receipts').upsert({ message_id: mid, user_id: user.id, read_at: new Date().toISOString() })
    },

    markChannelAsRead: async (cid) => {
        await createClient().rpc('mark_rift_channel_read', { p_channel_id: cid })
        get().fetchUnreadCounts()
    },

    fetchUnreadCounts: async () => {
        const { data } = await createClient().rpc('get_rift_unread_counts')
        const map = new Map<string, number>()
        let total = 0
        data?.forEach((r: any) => { map.set(r.channel_id, r.unread_count); total += r.unread_count; })
        set({ unreadCounts: map, totalUnread: total })
    },

    fetchReadReceipts: async (mids) => {
        // AGGRESSIVE FILTERING
        const validIds = mids.filter(id => id && typeof id === 'string' && !id.startsWith('temp-'))
        if (validIds.length === 0) return

        const { data } = await createClient().from('rift_read_receipts').select('*').in('message_id', validIds)
        if (!data) return
        const map = new Map(get().readReceipts)
        data.forEach(r => {
            const existing = map.get(r.message_id) ?? []
            if (!existing.some((e: any) => e.user_id === r.user_id)) {
                existing.push(r)
                map.set(r.message_id, existing)
            }
        })
        set({ readReceipts: map })
    },

    subscribeToMessages: (cid) => {
        const ch = createClient().channel(`rift_msgs_${cid}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rift_messages', filter: `channel_id=eq.${cid}` }, async (p) => {
                const { data: prof } = await createClient().from('profiles').select('*').eq('id', p.new.user_id).single()
                
                // Remplacement du message optimiste
                const tempIdx = get().messages.findIndex(m => m.id.startsWith('temp-') && m.user_id === p.new.user_id && m.content === p.new.content)
                
                if (tempIdx >= 0) {
                    set(s => ({ messages: s.messages.map((m, i) => i === tempIdx ? { ...p.new, profile: prof } as RiftMessage : m) }))
                } else {
                    set(s => ({ messages: [...s.messages, { ...p.new, profile: prof } as RiftMessage] }))
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rift_messages', filter: `channel_id=eq.${cid}` }, (p) => {
                set(s => ({ messages: s.messages.map(m => m.id === p.new.id ? { ...m, ...p.new } : m) }))
            })
            .subscribe()
        set({ _messagesChannel: ch })
    },

    unsubscribeFromMessages: () => {
        if (get()._messagesChannel) createClient().removeChannel(get()._messagesChannel!)
        set({ _messagesChannel: null })
    },

    subscribeToPresence: () => {
        const ch = createClient().channel('rift_presence', { config: { presence: { key: '' } } })
            .on('presence', { event: 'sync' }, () => {
                const st = ch.presenceState()
                const users = new Map<string, RiftOnlineUser>()
                Object.keys(st).forEach(k => { (st[k] as any).forEach((p: any) => users.set(p.user_id, p)) })
                set({ onlineUsers: users })
            })
            .subscribe(async (s) => {
                if (s === 'SUBSCRIBED') {
                    const { data: { user } } = await createClient().auth.getUser()
                    if (user) ch.track({ user_id: user.id, status: 'online', last_seen: new Date().toISOString() })
                }
            })
        set({ _presenceChannel: ch })
    },

    unsubscribeFromPresence: () => {
        if (get()._presenceChannel) createClient().removeChannel(get()._presenceChannel!)
        set({ _presenceChannel: null })
    },

    subscribeToUnread: () => {
        const ch = createClient().channel('rift_unread')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rift_messages' }, () => get().fetchUnreadCounts())
            .subscribe()
        set({ _unreadChannel: ch })
    },

    unsubscribeFromUnread: () => {
        if (get()._unreadChannel) createClient().removeChannel(get()._unreadChannel!)
        set({ _unreadChannel: null })
    },

    subscribeToCalls: () => {
        const ch = createClient().channel('rift_calls')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rift_calls' }, async (p) => {
                get().fetchActiveCalls()
                const { data: { user } } = await createClient().auth.getUser()
                if (!user) return

                if (p.event === 'INSERT' && p.new.status === 'ACTIVE' && p.new.created_by !== user.id) {
                    const { data: member } = await createClient().from('rift_channel_members').select('id').eq('channel_id', p.new.channel_id).eq('user_id', user.id).maybeSingle()
                    if (member) set({ incomingCall: p.new as RiftCall })
                }
                if (p.new?.status === 'ENDED' || p.old?.status === 'ACTIVE') {
                    const id = p.new?.id || p.old?.id
                    if (get().activeCall?.id === id) set({ activeCall: null })
                    if (get().incomingCall?.id === id) set({ incomingCall: null })
                }
            })
            .subscribe()
        set({ _callsChannel: ch })
    },

    unsubscribeFromCalls: () => {
        if (get()._callsChannel) createClient().removeChannel(get()._callsChannel!)
        set({ _callsChannel: null })
    },

    subscribeToMembers: () => {
        const ch = createClient().channel('rift_members')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rift_channel_members' }, () => get().fetchChannels())
            .subscribe()
        set({ _membersChannel: ch })
    },

    unsubscribeFromMembers: () => {
        if (get()._membersChannel) createClient().removeChannel(get()._membersChannel!)
        set({ _membersChannel: null })
    },

    cleanup: () => {
        const { _messagesChannel, _presenceChannel, _unreadChannel, _callsChannel, _membersChannel } = get()
        const supabase = createClient()
        if (_messagesChannel) supabase.removeChannel(_messagesChannel)
        if (_presenceChannel) supabase.removeChannel(_presenceChannel)
        if (_unreadChannel) supabase.removeChannel(_unreadChannel)
        if (_callsChannel) supabase.removeChannel(_callsChannel)
        if (_membersChannel) supabase.removeChannel(_membersChannel)
        
        set({ 
            activeChannel: null, 
            messages: [], 
            activeCall: null, 
            incomingCall: null,
            _messagesChannel: null,
            _presenceChannel: null,
            _unreadChannel: null,
            _callsChannel: null,
            _membersChannel: null
        })
    }
}))
