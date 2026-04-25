'use client'

import { useState, useMemo, useEffect } from 'react'
import { 
    Hash, Lock, MessageSquare, Search, Users, ChevronDown, 
    Zap, Loader2, Send, X, Circle, Clock, MinusCircle, HelpCircle, 
    Ticket, Code2 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRiftStore, type RiftChannel, type RiftPresenceStatus } from '@/hooks/useRiftStore'
import { shareEntityInRift } from '@/features/rift/actions'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface RiftShareModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    entityId: string
    entityType: 'TICKET' | 'SD'
    currentUserId: string
}

export function RiftShareModal({ open, onOpenChange, entityId, entityType, currentUserId }: RiftShareModalProps) {
    const { channels, fetchChannels, onlineUsers } = useRiftStore()
    const [search, setSearch] = useState('')
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
    const [isSharing, setIsSharing] = useState(false)
    const [tab, setTab] = useState<'SALONS' | 'DMS'>('SALONS')

    useEffect(() => {
        if (open) fetchChannels()
    }, [open, fetchChannels])

    const filteredChannels = useMemo(() => {
        return channels.filter(c => {
            const name = getChannelDisplayName(c, currentUserId)
            return name.toLowerCase().includes(search.toLowerCase())
        })
    }, [channels, search, currentUserId])

    const groupChannels = filteredChannels.filter(c => c.type === 'PUBLIC' || c.type === 'PRIVATE_GROUP')
    const dmChannels = filteredChannels.filter(c => c.type === 'DM')

    function getChannelDisplayName(channel: RiftChannel, userId: string): string {
        if (channel.type !== 'DM') return channel.name ?? 'Sans nom'
        const other = channel.members?.find(m => m.user_id !== userId)
        return other?.profile ? `${other.profile.first_name} ${other.profile.last_name}` : 'Message privé'
    }

    function getUserPresence(userId: string): RiftPresenceStatus {
        return onlineUsers.get(userId)?.status ?? 'offline'
    }

    function presenceColor(status: RiftPresenceStatus): string {
        switch (status) {
            case 'online': return 'bg-emerald-500'
            case 'away': return 'bg-amber-500'
            case 'busy': return 'bg-rose-500'
            default: return 'bg-white/20'
        }
    }

    const handleShare = async () => {
        if (!selectedChannelId) return
        setIsSharing(true)
        const res = await shareEntityInRift(entityId, entityType, selectedChannelId)
        if (res.error) toast.error(res.error)
        else {
            toast.success('Entité partagée !')
            onOpenChange(false)
        }
        setIsSharing(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] bg-[#0a0a1a] border-white/10 text-foreground p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        Partager sur Rift
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Choisissez un salon ou un utilisateur pour envoyer ce {entityType}.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        <Input
                            placeholder="Rechercher..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-white/5 border-white/10 pl-10 h-11 rounded-xl"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setTab('SALONS')}
                            className={cn(
                                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                tab === 'SALONS' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            SALONS ({groupChannels.length})
                        </button>
                        <button
                            onClick={() => setTab('DMS')}
                            className={cn(
                                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                tab === 'DMS' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            MESSAGES PRIVÉS ({dmChannels.length})
                        </button>
                    </div>

                    {/* List */}
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1 pr-1">
                        {(tab === 'SALONS' ? groupChannels : dmChannels).map((channel) => {
                            const isSelected = selectedChannelId === channel.id
                            const name = getChannelDisplayName(channel, currentUserId)
                            const otherMember = channel.members?.find(m => m.user_id !== currentUserId)
                            const presence = otherMember ? getUserPresence(otherMember.user_id) : 'offline'

                            return (
                                <button
                                    key={channel.id}
                                    onClick={() => setSelectedChannelId(channel.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all border",
                                        isSelected 
                                            ? "bg-primary/20 border-primary/40 shadow-inner" 
                                            : "bg-white/[0.02] border-transparent hover:bg-white/[0.05] hover:border-white/10"
                                    )}
                                >
                                    <div className="relative shrink-0">
                                        {channel.type === 'DM' ? (
                                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary">
                                                {name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground">
                                                {channel.type === 'PUBLIC' ? <Hash className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                            </div>
                                        )}
                                        {channel.type === 'DM' && (
                                            <div className={cn(
                                                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a1a]",
                                                presenceColor(presence)
                                            )} />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className={cn("text-sm font-bold truncate", isSelected ? "text-primary" : "text-foreground/90")}>{name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-40">
                                            {channel.type === 'DM' ? 'Message Privé' : channel.type.replace('_', ' ')}
                                        </p>
                                    </div>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />}
                                </button>
                            )
                        })}
                        {(tab === 'SALONS' ? groupChannels : dmChannels).length === 0 && (
                            <div className="py-12 text-center">
                                <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground italic">Aucun résultat trouvé.</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-6 bg-black/40 border-t border-white/5">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={!selectedChannelId || isSharing}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                    >
                        {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Envoyer
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
