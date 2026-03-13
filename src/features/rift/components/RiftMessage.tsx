'use client'

// SPRINT 50.2 - Basilisk Rift : Composant message individuel
// Gère Fantômes (soft-delete 10min), Éditions, Accusés de lecture

import { useEffect, useRef, useState, useCallback } from 'react'
import { differenceInMinutes, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Check, CheckCheck, CornerUpLeft, History, MoreHorizontal, Pencil, Trash2, SmilePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRiftStore, type RiftMessage, type RiftMessageEdit } from '@/hooks/useRiftStore'
import { deleteRiftMessage, editRiftMessage, getRiftMessageEdits, toggleRiftReaction } from '@/features/rift/actions'
import { toast } from 'sonner'
import EmojiPicker from 'emoji-picker-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// ── Utilitaire : séparer le texte des pièces jointes markdown ──
const ATTACHMENT_REGEX = /\n*(?:!\[[^\]]*\]\([^)]+\)|\[📎\s*[^\]]*\]\([^)]+\))/g

function splitContentAndAttachments(content: string): { text: string; attachments: string } {
    const matches = content.match(ATTACHMENT_REGEX)
    if (!matches) return { text: content, attachments: '' }
    const text = content.replace(ATTACHMENT_REGEX, '').trim()
    return { text, attachments: matches.join('') }
}

function getAttachmentPreviews(attachments: string): { type: 'image' | 'file'; name: string; url: string }[] {
    const results: { type: 'image' | 'file'; name: string; url: string }[] = []
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    const fileRegex = /\[📎\s*([^\]]*)\]\(([^)]+)\)/g
    let m: RegExpExecArray | null
    while ((m = imgRegex.exec(attachments)) !== null) {
        results.push({ type: 'image', name: m[1], url: m[2] })
    }
    while ((m = fileRegex.exec(attachments)) !== null) {
        results.push({ type: 'file', name: m[1], url: m[2] })
    }
    return results
}

interface RiftMessageProps {
    message: RiftMessage
    currentUserId: string
    isLastByUser?: boolean
    channelMemberCount?: number
}

export function RiftMessageComponent({ message, currentUserId, isLastByUser = false, channelMemberCount = 0 }: RiftMessageProps) {
    const { markAsRead, readReceipts, setReplyingTo } = useRiftStore()
    const [showActions, setShowActions] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState('')
    const [editAttachments, setEditAttachments] = useState('')
    const [showEdits, setShowEdits] = useState(false)
    const [edits, setEdits] = useState<RiftMessageEdit[]>([])
    const [loadingEdits, setLoadingEdits] = useState(false)
    const messageRef = useRef<HTMLDivElement>(null)
    const editInputRef = useRef<HTMLTextAreaElement>(null)

    const isOwn = message.user_id === currentUserId
    const receipts = readReceipts.get(message.id) ?? []
    const othersReadCount = receipts.filter(r => r.user_id !== currentUserId).length
    const allOthersRead = channelMemberCount > 1 && othersReadCount >= channelMemberCount - 1

    // ── FANTÔME : Soft delete avec disparition progressive ──
    if (message.deleted_at) {
        const minutesSinceDeletion = differenceInMinutes(new Date(), new Date(message.deleted_at))

        // >= 10 minutes : le fantôme disparaît complètement
        if (minutesSinceDeletion >= 10) {
            return null
        }

        // < 10 minutes : afficher en mode fantôme
        return (
            <div
                className={cn(
                    'flex gap-3 px-4 py-2 opacity-40 transition-opacity',
                    isOwn ? 'flex-row-reverse' : 'flex-row'
                )}
            >
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                <div className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2 border border-white/5 bg-white/5',
                    isOwn ? 'rounded-tr-md' : 'rounded-tl-md'
                )}>
                    <p className="text-sm italic text-muted-foreground">
                        🕸️ Message supprimé <span className="text-xs opacity-60">(disparaît bientôt)</span>
                    </p>
                </div>
            </div>
        )
    }

    // ── Intersection Observer : marquer comme lu quand visible ──
    useEffect(() => {
        if (isOwn) return // Pas besoin de marquer ses propres messages comme lus

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        markAsRead(message.id)
                        observer.disconnect()
                    }
                }
            },
            { threshold: 0.5 }
        )

        if (messageRef.current) {
            observer.observe(messageRef.current)
        }

        return () => observer.disconnect()
    }, [message.id, isOwn, markAsRead])

    // ── Focus l'input d'édition quand on passe en mode édition ──
    useEffect(() => {
        if (isEditing && editInputRef.current) {
            editInputRef.current.focus()
            editInputRef.current.setSelectionRange(editContent.length, editContent.length)
        }
    }, [isEditing])

    // ── Actions ──
    const handleEdit = useCallback(async () => {
        // Recombiner texte + pièces jointes
        const fullContent = editAttachments
            ? (editContent.trim() ? `${editContent.trim()}\n\n${editAttachments.trim()}` : editAttachments.trim())
            : editContent.trim()

        if (!fullContent || fullContent === message.content) {
            setIsEditing(false)
            return
        }
        const result = await editRiftMessage(message.id, fullContent)
        if (result.error) {
            toast.error(result.error)
        } else {
            setIsEditing(false)
        }
    }, [editContent, editAttachments, message.id, message.content])

    const handleDelete = useCallback(async () => {
        const result = await deleteRiftMessage(message.id)
        if (result.error) {
            toast.error(result.error)
        }
    }, [message.id])

    const handleShowEdits = useCallback(async () => {
        if (showEdits) {
            setShowEdits(false)
            return
        }
        setLoadingEdits(true)
        const result = await getRiftMessageEdits(message.id)
        if (result.edits) {
            setEdits(result.edits)
        }
        setLoadingEdits(false)
        setShowEdits(true)
    }, [message.id, showEdits])

    // ── Détection d'image dans le contenu (pour les pièces jointes) ──
    const renderContent = (content: string) => {
        // Pattern pour les images uploadées : ![nom](url)
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
        // Pattern pour les liens de fichiers : [📎 nom](url)
        const fileRegex = /\[📎\s*([^\]]*)\]\(([^)]+)\)/g
        // Pattern pour les mentions (@PrénomNom)
        const mentionRegex = /@([a-zA-ZÀ-ÿ0-9_]+)/g

        const parts: React.ReactNode[] = []
        let lastIndex = 0
        const combined = new RegExp(`${imageRegex.source}|${fileRegex.source}|${mentionRegex.source}`, 'g')
        let match: RegExpExecArray | null

        while ((match = combined.exec(content)) !== null) {
            // Texte avant le match
            if (match.index > lastIndex) {
                parts.push(
                    <span key={`text-${lastIndex}`}>
                        {content.slice(lastIndex, match.index)}
                    </span>
                )
            }

            if (match[0].startsWith('![')) {
                // Image ou GIF
                const alt = match[1] || 'Image'
                const url = match[2]
                parts.push(
                    <img
                        key={`img-${match.index}`}
                        src={url}
                        alt={alt}
                        className="max-w-full max-h-80 rounded-xl mt-2 cursor-pointer hover:opacity-90 transition-opacity border border-white/10"
                        loading="lazy"
                    />
                )
            } else if (match[0].startsWith('[📎')) {
                // Fichier
                const fileName = match[3] ?? match[1]
                const url = match[4] ?? match[2]
                parts.push(
                    <a
                        key={`file-${match.index}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 mt-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm text-primary"
                    >
                        📎 {fileName}
                    </a>
                )
            } else if (match[0].startsWith('@')) {
                // Mention
                const mentionName = match[5] || match[0].substring(1)
                // Coloriser la mention
                parts.push(
                    <span key={`mention-${match.index}`} className="font-bold text-primary bg-primary/10 px-1 py-0.5 rounded-md">
                        @{mentionName}
                    </span>
                )
            }

            lastIndex = match.index + match[0].length
        }

        // Texte restant
        if (lastIndex < content.length) {
            parts.push(
                <span key={`text-${lastIndex}`}>
                    {content.slice(lastIndex)}
                </span>
            )
        }

        return parts.length > 0 ? parts : content
    }

    const profile = message.profile
    const initials = profile
        ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`
        : '?'
    const displayName = profile
        ? `${profile.first_name} ${profile.last_name}`
        : 'Utilisateur inconnu'

    return (
        <div
            ref={messageRef}
            className={cn(
                'group flex gap-3 px-4 py-1.5 hover:bg-white/[0.02] transition-colors',
                isOwn ? 'flex-row-reverse' : 'flex-row'
            )}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Avatar */}
            {isLastByUser ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-white/10 flex items-center justify-center text-[10px] font-bold text-foreground/70 flex-shrink-0">
                    {initials}
                </div>
            ) : (
                <div className="w-8 flex-shrink-0" />
            )}

            {/* Bulle de message */}
            <div className={cn('max-w-[70%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                {/* Nom + heure */}
                {isLastByUser && (
                    <div className={cn('flex items-center gap-2 mb-0.5', isOwn ? 'flex-row-reverse' : 'flex-row')}>
                        <span className="text-xs font-semibold text-foreground/70">{displayName}</span>
                        <span className="text-[10px] text-muted-foreground">
                            {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                        </span>
                    </div>
                )}

                {/* Réponse citée */}
                {message.reply_to && (
                    <div className={cn(
                        'flex items-center gap-2 px-3 py-1.5 mb-1 rounded-lg border-l-2 border-primary/40 bg-white/[0.03] text-xs text-muted-foreground max-w-full truncate',
                        isOwn ? 'ml-auto' : ''
                    )}>
                        <CornerUpLeft className="w-3 h-3 flex-shrink-0 text-primary/60" />
                        <span className="font-medium text-foreground/60">
                            {message.reply_to.profile?.first_name} {message.reply_to.profile?.last_name}
                        </span>
                        <span className="truncate">{message.reply_to.content}</span>
                    </div>
                )}

                {/* Contenu du message */}
                <div className={cn(
                    'relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    isOwn
                        ? 'bg-primary/20 border border-primary/20 text-foreground rounded-tr-md'
                        : 'bg-white/[0.06] border border-white/[0.06] text-foreground rounded-tl-md'
                )}>
                    {isEditing ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                            <textarea
                                ref={editInputRef}
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleEdit()
                                    }
                                    if (e.key === 'Escape') {
                                        setIsEditing(false)
                                        const { text, attachments } = splitContentAndAttachments(message.content)
                                        setEditContent(text)
                                        setEditAttachments(attachments)
                                    }
                                }}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                                rows={2}
                            />
                            {/* Aperçu des pièces jointes conservées */}
                            {editAttachments && (
                                <div className="flex flex-wrap gap-2">
                                    {getAttachmentPreviews(editAttachments).map((att, i) => (
                                        att.type === 'image' ? (
                                            <img
                                                key={i}
                                                src={att.url}
                                                alt={att.name}
                                                className="w-16 h-16 rounded-lg object-cover border border-white/10 opacity-70"
                                            />
                                        ) : (
                                            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-muted-foreground">
                                                📎 {att.name}
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2 text-xs">
                                <button
                                    onClick={handleEdit}
                                    className="px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                                >
                                    Sauvegarder
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false)
                                        const { text, attachments } = splitContentAndAttachments(message.content)
                                        setEditContent(text)
                                        setEditAttachments(attachments)
                                    }}
                                    className="px-2 py-1 rounded bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="whitespace-pre-wrap break-words">
                            {renderContent(message.content)}
                        </div>
                    )}

                    {/* Badge "modifié" */}
                    {message.is_edited && !isEditing && (
                        <button
                            onClick={handleShowEdits}
                            className="inline-flex items-center gap-1 ml-2 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                            title="Voir l'historique des modifications"
                        >
                            <Pencil className="w-2.5 h-2.5" />
                            (modifié)
                        </button>
                    )}

                    {/* Actions flottantes */}
                    {showActions && !isEditing && (
                        <div className={cn(
                            'absolute -top-8 flex items-center gap-0.5 bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg px-1 py-0.5 shadow-xl z-10',
                            isOwn ? 'right-0' : 'left-0'
                        )}>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        className="p-1.5 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                                        title="Ajouter une réaction"
                                    >
                                        <SmilePlus className="w-3.5 h-3.5" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent side="top" align="center" className="w-auto p-0 border-none bg-transparent shadow-none">
                                    <EmojiPicker
                                        onEmojiClick={async (emojiData) => {
                                            const res = await toggleRiftReaction(message.id, emojiData.emoji)
                                            if (res.error) toast.error(res.error)
                                        }}
                                        theme={'dark' as any}
                                    />
                                </PopoverContent>
                            </Popover>
                            <button
                                onClick={() => setReplyingTo(message)}
                                className="p-1.5 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                                title="Répondre"
                            >
                                <CornerUpLeft className="w-3.5 h-3.5" />
                            </button>
                            {isOwn && (
                                <>
                                    <button
                                        onClick={() => {
                                            const { text, attachments } = splitContentAndAttachments(message.content)
                                            setEditContent(text)
                                            setEditAttachments(attachments)
                                            setIsEditing(true)
                                        }}
                                        className="p-1.5 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                                        title="Modifier"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="p-1.5 rounded hover:bg-rose-500/20 transition-colors text-muted-foreground hover:text-rose-400"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            )}
                            {message.is_edited && (
                                <button
                                    onClick={handleShowEdits}
                                    className="p-1.5 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                                    title="Historique"
                                >
                                    <History className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Réactions */}
                {message.reactions && message.reactions.length > 0 && (
                    <div className={cn('flex flex-wrap gap-1 mt-1 z-10', isOwn ? 'justify-end' : 'justify-start')}>
                        {Object.entries(
                            message.reactions.reduce((acc, r) => {
                                if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasReacted: false }
                                acc[r.emoji].count++
                                if (r.user_id === currentUserId) acc[r.emoji].hasReacted = true
                                return acc
                            }, {} as Record<string, { count: number, hasReacted: boolean }>)
                        ).map(([emoji, { count, hasReacted }]) => (
                            <button
                                key={emoji}
                                onClick={async () => {
                                    const res = await toggleRiftReaction(message.id, emoji);
                                    if (res.error) toast.error(res.error);
                                }}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs border transition-colors',
                                    hasReacted 
                                        ? 'bg-primary/20 border-primary/40 text-primary' 
                                        : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                                )}
                            >
                                <span>{emoji}</span>
                                <span className="font-semibold">{count}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Historique des éditions (dropdown) */}
                {showEdits && edits.length > 0 && (
                    <div className={cn(
                        'mt-1 p-3 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 max-w-full overflow-hidden text-xs space-y-2',
                        isOwn ? 'ml-auto' : ''
                    )}>
                        <div className="flex items-center gap-2 text-muted-foreground font-medium mb-1">
                            <History className="w-3 h-3" />
                            Historique des modifications
                        </div>
                        {edits.map((edit) => {
                            const { text: editText, attachments: editAtt } = splitContentAndAttachments(edit.old_content)
                            const attPreviews = getAttachmentPreviews(editAtt)
                            return (
                                <div key={edit.id} className="pl-3 border-l-2 border-white/10 overflow-hidden">
                                    <span className="text-muted-foreground/60">
                                        {format(new Date(edit.created_at), 'dd/MM HH:mm', { locale: fr })}
                                    </span>
                                    {editText && (
                                        <p className="text-muted-foreground line-through mt-0.5 break-words">{editText}</p>
                                    )}
                                    {attPreviews.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {attPreviews.map((att, i) => (
                                                att.type === 'image' ? (
                                                    <img
                                                        key={i}
                                                        src={att.url}
                                                        alt={att.name}
                                                        className="w-12 h-12 rounded-lg object-cover border border-white/10 opacity-50"
                                                    />
                                                ) : (
                                                    <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground/50 line-through">
                                                        📎 {att.name}
                                                    </span>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Accusés de lecture */}
                {isOwn && receipts.length > 0 && (
                    <div className="flex items-center gap-1 mt-0.5 mr-1">
                        {allOthersRead ? (
                            <CheckCheck className="w-3.5 h-3.5 text-primary" />
                        ) : othersReadCount > 0 ? (
                            <CheckCheck className="w-3.5 h-3.5 text-muted-foreground/50" />
                        ) : (
                            <Check className="w-3.5 h-3.5 text-muted-foreground/30" />
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
