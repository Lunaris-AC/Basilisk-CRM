'use client'

// SPRINT 50.2 - Basilisk Rift : Sidebar de la messagerie
// Liste des salons (Publics/Privés) + DMs avec pastilles de présence
// SPRINT 50.3 - Ajout des indicateurs d'appels actifs

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Hash, Lock, MessageSquare, Plus, Search, Users, ChevronDown, Loader2, Circle, Clock, MinusCircle, HelpCircle, Phone, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRiftStore, type RiftChannel, type RiftPresenceStatus } from '@/hooks/useRiftStore'
import { RiftCreateChannelModal } from './RiftCreateChannelModal'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface RiftSidebarProps {
    currentUserId: string
}

export function RiftSidebar({ currentUserId }: RiftSidebarProps) {
    const {
        channels,
        activeChannel,
        setActiveChannel,
        onlineUsers,
        isLoadingChannels,
        fetchChannels,
        unreadCounts,
        activeCallsMap,
        setMyPresence,
    } = useRiftStore()

    const [search, setSearch] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [createType, setCreateType] = useState<'PUBLIC' | 'PRIVATE_GROUP' | 'DM'>('PRIVATE_GROUP')
    const [channelsOpen, setChannelsOpen] = useState(true)
    const [dmsOpen, setDmsOpen] = useState(true)

    useEffect(() => {
        fetchChannels()
    }, [fetchChannels])

    // ── Séparer channels et DMs ──
    const { groupChannels, dmChannels } = useMemo(() => {
        const filtered = channels.filter(c => {
            if (!search.trim()) return true
            const name = getChannelDisplayName(c, currentUserId)
            return name.toLowerCase().includes(search.toLowerCase())
        })

        return {
            groupChannels: filtered.filter(c => c.type === 'PUBLIC' || c.type === 'PRIVATE_GROUP'),
            dmChannels: filtered.filter(c => c.type === 'DM'),
        }
    }, [channels, search, currentUserId])

    // ── Nom d'affichage pour un channel ──
    function getChannelDisplayName(channel: RiftChannel, userId: string): string {
        if (channel.type !== 'DM') {
            return channel.name ?? 'Sans nom'
        }
        // DM : afficher le nom de l'autre participant
        const other = channel.members?.find(m => m.user_id !== userId)
        if (other?.profile) {
            return `${other.profile.first_name} ${other.profile.last_name}`
        }
        return 'Message privé'
    }

    // ── Initiales pour avatar ──
    function getOtherMemberInitials(channel: RiftChannel, userId: string): string {
        const other = channel.members?.find(m => m.user_id !== userId)
        if (other?.profile) {
            return `${other.profile.first_name?.[0] ?? ''}${other.profile.last_name?.[0] ?? ''}`
        }
        return '?'
    }

    // ── Statut de présence d'un utilisateur ──
    function getUserPresence(userId: string): RiftPresenceStatus {
        return onlineUsers.get(userId)?.status ?? 'offline'
    }

    // ── Couleur de la pastille de présence ──
    function presenceColor(status: RiftPresenceStatus): string {
        switch (status) {
            case 'online': return 'bg-emerald-500'
            case 'away': return 'bg-amber-500'
            case 'busy': return 'bg-rose-500'
            default: return 'bg-white/20'
        }
    }

    const myPresence = getUserPresence(currentUserId)

    const handleCreateChannel = useCallback((type: 'PUBLIC' | 'PRIVATE_GROUP' | 'DM') => {
        setCreateType(type)
        setShowCreateModal(true)
    }, [])

    return (
        <div className="flex flex-col w-64 h-full bg-black/30 backdrop-blur-xl border-r border-white/[0.06] flex-shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        Rift
                    </h2>
                    <button
                        onClick={() => handleCreateChannel('PRIVATE_GROUP')}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
                        title="Nouveau channel"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Recherche */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher..."
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                </div>
            </div>

            {/* Liste scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                {isLoadingChannels && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* ═══ SALONS ═══ */}
                <div className="px-2">
                    <button
                        onClick={() => setChannelsOpen(!channelsOpen)}
                        className="flex items-center justify-between w-full px-2 py-1.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                        <span className="text-[10px] font-black tracking-[0.15em] uppercase flex items-center gap-1.5">
                            <Users className="w-3 h-3" />
                            Salons ({groupChannels.length})
                        </span>
                        <ChevronDown className={cn('w-3 h-3 transition-transform', channelsOpen ? 'rotate-180' : '')} />
                    </button>

                    {channelsOpen && (
                        <div className="space-y-0.5 mt-1">
                            {groupChannels.map((channel) => {
                                const isActive = activeChannel?.id === channel.id
                                const isPublic = channel.type === 'PUBLIC'
                                const unread = unreadCounts.get(channel.id) ?? 0
                                const activeCall = activeCallsMap.get(channel.id)

                                return (
                                    <button
                                        key={channel.id}
                                        onClick={() => setActiveChannel(channel)}
                                        className={cn(
                                            'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-all text-left',
                                            isActive
                                                ? 'bg-white/10 text-foreground ring-1 ring-white/10'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                                        )}
                                    >
                                        {isPublic ? (
                                            <Hash className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary' : '')} />
                                        ) : (
                                            <Lock className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary' : '')} />
                                        )}
                                        <span className={cn('text-sm font-medium truncate flex-1', unread > 0 && !isActive && 'text-foreground font-bold')}>
                                            {getChannelDisplayName(channel, currentUserId)}
                                        </span>
                                        
                                        {activeCall && (
                                            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 animate-pulse">
                                                {activeCall.type === 'VIDEO' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                                            </div>
                                        )}

                                        {unread > 0 && !isActive && (
                                            <span className="min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-foreground shadow-lg shadow-primary/30 flex-shrink-0">
                                                {unread > 99 ? '99+' : unread}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}

                            {/* Bouton créer un salon */}
                            <button
                                onClick={() => handleCreateChannel('PRIVATE_GROUP')}
                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/[0.02] transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-sm">Créer un salon</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Séparateur */}
                <div className="h-px bg-white/[0.04] mx-4 my-3" />

                {/* ═══ MESSAGES DIRECTS ═══ */}
                <div className="px-2">
                    <button
                        onClick={() => setDmsOpen(!dmsOpen)}
                        className="flex items-center justify-between w-full px-2 py-1.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                        <span className="text-[10px] font-black tracking-[0.15em] uppercase flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3" />
                            Messages directs ({dmChannels.length})
                        </span>
                        <ChevronDown className={cn('w-3 h-3 transition-transform', dmsOpen ? 'rotate-180' : '')} />
                    </button>

                    {dmsOpen && (
                        <div className="space-y-0.5 mt-1">
                            {dmChannels.map((channel) => {
                                const isActive = activeChannel?.id === channel.id
                                const otherMember = channel.members?.find(m => m.user_id !== currentUserId)
                                const presence = otherMember ? getUserPresence(otherMember.user_id) : 'offline'
                                const unread = unreadCounts.get(channel.id) ?? 0
                                const activeCall = activeCallsMap.get(channel.id)

                                return (
                                    <button
                                        key={channel.id}
                                        onClick={() => setActiveChannel(channel)}
                                        className={cn(
                                            'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-all text-left',
                                            isActive
                                                ? 'bg-white/10 text-foreground ring-1 ring-white/10'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                                        )}
                                    >
                                        {/* Avatar + pastille de présence */}
                                        <div className="relative flex-shrink-0">
                                            <div className={cn(
                                                'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border',
                                                isActive
                                                    ? 'bg-primary/20 border-primary/30 text-primary'
                                                    : 'bg-white/5 border-white/10 text-foreground/60'
                                            )}>
                                                {getOtherMemberInitials(channel, currentUserId)}
                                            </div>
                                            <div className={cn(
                                                'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black/80',
                                                presenceColor(presence)
                                            )} />
                                        </div>
                                        <span className={cn('text-sm font-medium truncate flex-1', unread > 0 && !isActive && 'text-foreground font-bold')}>
                                            {getChannelDisplayName(channel, currentUserId)}
                                        </span>

                                        {activeCall && (
                                            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 animate-pulse">
                                                {activeCall.type === 'VIDEO' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                                            </div>
                                        )}

                                        {unread > 0 && !isActive && (
                                            <span className="min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-foreground shadow-lg shadow-primary/30 flex-shrink-0">
                                                {unread > 99 ? '99+' : unread}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}

                            {/* Bouton nouveau DM */}
                            <button
                                onClick={() => handleCreateChannel('DM')}
                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/[0.02] transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-sm">Nouveau message</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* User Presence Selector Footer */}
            <div className="p-3 border-t border-white/[0.06] bg-black/20">
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white/5 transition-colors text-left group">
                            <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary border border-primary/30">
                                    MOI
                                </div>
                                <div className={cn(
                                    'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a1a]',
                                    presenceColor(myPresence)
                                )} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-foreground/80 truncate">Mon Statut</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-40 group-hover:opacity-100 transition-opacity">{myPresence}</p>
                            </div>
                            <ChevronDown className="w-3 h-3 text-muted-foreground/30 group-hover:text-foreground transition-colors" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="start" className="w-48 p-1 bg-zinc-900 border-white/10 shadow-2xl">
                        <div className="space-y-0.5">
                            {[
                                { id: 'online', label: 'En ligne', color: 'text-emerald-500', icon: Circle },
                                { id: 'away', label: 'Absent', color: 'text-amber-500', icon: Clock },
                                { id: 'busy', label: 'Occupé', color: 'text-rose-500', icon: MinusCircle },
                                { id: 'offline', label: 'Hors ligne', color: 'text-muted-foreground', icon: HelpCircle },
                            ].map((status) => (
                                <button
                                    key={status.id}
                                    onClick={() => setMyPresence(status.id as RiftPresenceStatus)}
                                    className={cn(
                                        'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                                        myPresence === status.id 
                                            ? 'bg-white/10 text-foreground' 
                                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                    )}
                                >
                                    <status.icon className={cn('w-3.5 h-3.5', status.color)} />
                                    {status.label}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Modale de création */}
            <RiftCreateChannelModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                defaultType={createType}
                currentUserId={currentUserId}
            />
        </div>
    )
}
