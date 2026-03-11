'use client'

// SPRINT 50.2 - Basilisk Rift : Modale de création de channel/DM

import { useState, useEffect, useCallback } from 'react'
import { Hash, Lock, MessageSquare, Loader2, Search, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createRiftChannel, getInternalProfiles } from '@/features/rift/actions'
import { useRiftStore, type RiftChannelType } from '@/hooks/useRiftStore'
import { toast } from 'sonner'

interface Profile {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
    role: string
}

interface RiftCreateChannelModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultType: RiftChannelType
    currentUserId: string
}

export function RiftCreateChannelModal({ open, onOpenChange, defaultType, currentUserId }: RiftCreateChannelModalProps) {
    const { fetchChannels, setActiveChannel } = useRiftStore()
    const [type, setType] = useState<RiftChannelType>(defaultType)
    const [name, setName] = useState('')
    const [search, setSearch] = useState('')
    const [selectedMembers, setSelectedMembers] = useState<string[]>([])
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    // Sync le type par défaut quand il change
    useEffect(() => {
        setType(defaultType)
    }, [defaultType])

    // Charger les profils internes
    useEffect(() => {
        if (!open) return
        setIsLoading(true)
        getInternalProfiles().then((result) => {
            if (result.profiles) {
                setProfiles(result.profiles.filter(p => p.id !== currentUserId))
            }
            setIsLoading(false)
        })
    }, [open, currentUserId])

    // Reset à la fermeture
    useEffect(() => {
        if (!open) {
            setName('')
            setSearch('')
            setSelectedMembers([])
        }
    }, [open])

    const filteredProfiles = profiles.filter(p => {
        if (!search.trim()) return true
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
        return fullName.includes(search.toLowerCase()) || p.role.toLowerCase().includes(search.toLowerCase())
    })

    const toggleMember = useCallback((userId: string) => {
        if (type === 'DM') {
            // DM : un seul membre sélectionnable
            setSelectedMembers(prev => prev[0] === userId ? [] : [userId])
        } else {
            setSelectedMembers(prev =>
                prev.includes(userId)
                    ? prev.filter(id => id !== userId)
                    : [...prev, userId]
            )
        }
    }, [type])

    const handleCreate = useCallback(async () => {
        if (type !== 'DM' && !name.trim()) {
            toast.error('Veuillez donner un nom au salon')
            return
        }
        // PUBLIC n'a pas besoin de sélection de membres (tout le monde est ajouté automatiquement)
        if (type !== 'PUBLIC' && selectedMembers.length === 0) {
            toast.error('Veuillez sélectionner au moins un membre')
            return
        }
        if (type === 'DM' && selectedMembers.length !== 1) {
            toast.error('Sélectionnez exactement une personne pour un DM')
            return
        }

        setIsCreating(true)
        const result = await createRiftChannel(
            type === 'DM' ? null : name.trim(),
            type,
            selectedMembers
        )

        if (result.error) {
            toast.error(result.error)
            setIsCreating(false)
            return
        }

        if (result.existing) {
            toast.info('Conversation existante ouverte')
        } else {
            toast.success(type === 'DM' ? 'Conversation créée' : `Salon "${name}" créé`)
        }

        // Rafraîchir et sélectionner le channel
        await fetchChannels()
        const channels = useRiftStore.getState().channels
        const newChannel = channels.find(c => c.id === result.channelId)
        if (newChannel) {
            setActiveChannel(newChannel)
        }

        setIsCreating(false)
        onOpenChange(false)
    }, [type, name, selectedMembers, fetchChannels, setActiveChannel, onOpenChange])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                    <h3 className="text-lg font-bold text-foreground">
                        {type === 'DM' ? 'Nouveau message' : 'Créer un salon'}
                    </h3>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Sélection du type */}
                    {type !== 'DM' && (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setType('PUBLIC')}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all',
                                        type === 'PUBLIC'
                                            ? 'bg-primary/20 border-primary/30 text-primary'
                                            : 'bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:bg-white/[0.06]'
                                    )}
                                >
                                    <Hash className="w-4 h-4" />
                                    Public
                                </button>
                                <button
                                    onClick={() => setType('PRIVATE_GROUP')}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all',
                                        type === 'PRIVATE_GROUP'
                                            ? 'bg-primary/20 border-primary/30 text-primary'
                                            : 'bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:bg-white/[0.06]'
                                    )}
                                >
                                    <Lock className="w-4 h-4" />
                                    Privé
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Nom du channel */}
                    {type !== 'DM' && (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nom du salon</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="ex: projet-basilisk"
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                        </div>
                    )}

                    {/* Sélection des membres (masqué pour PUBLIC) */}
                    {type === 'PUBLIC' ? (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <p className="text-sm text-muted-foreground">
                                <Hash className="w-4 h-4 inline mr-1.5 text-primary/60" />
                                Un salon public est automatiquement accessible à <span className="font-semibold text-foreground">tous les utilisateurs internes</span>.
                            </p>
                        </div>
                    ) : (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {type === 'DM' ? 'Envoyer un message à' : 'Ajouter des membres'}
                        </label>

                        {/* Recherche */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Rechercher un collègue..."
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                        </div>

                        {/* Membres sélectionnés */}
                        {selectedMembers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {selectedMembers.map(id => {
                                    const p = profiles.find(pr => pr.id === id)
                                    if (!p) return null
                                    return (
                                        <span
                                            key={id}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs text-primary"
                                        >
                                            {p.first_name} {p.last_name}
                                            <button onClick={() => toggleMember(id)} className="hover:text-foreground">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    )
                                })}
                            </div>
                        )}

                        {/* Liste des profils */}
                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredProfiles.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground/50 py-6">Aucun résultat</p>
                            ) : (
                                filteredProfiles.map(p => {
                                    const selected = selectedMembers.includes(p.id)
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => toggleMember(p.id)}
                                            className={cn(
                                                'flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors text-left',
                                                selected
                                                    ? 'bg-primary/10 text-foreground'
                                                    : 'hover:bg-white/[0.04] text-muted-foreground'
                                            )}
                                        >
                                            <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                                {p.first_name?.[0]}{p.last_name?.[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium truncate block">
                                                    {p.first_name} {p.last_name}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground/50 uppercase">{p.role}</span>
                                            </div>
                                            {selected && (
                                                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                            )}
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-5 border-t border-white/[0.06]">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={isCreating || (type !== 'PUBLIC' && selectedMembers.length === 0) || (type !== 'DM' && !name.trim())}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                            'bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30',
                            'disabled:opacity-40 disabled:cursor-not-allowed'
                        )}
                    >
                        {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                        {type === 'DM' ? 'Ouvrir la conversation' : 'Créer le salon'}
                    </button>
                </div>
            </div>
        </div>
    )
}
