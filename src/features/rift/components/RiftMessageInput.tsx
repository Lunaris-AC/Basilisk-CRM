'use client'

// SPRINT 50.2 - Basilisk Rift : Barre de saisie avec upload et compression d'images

import { useRef, useState, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from 'react'
import { Paperclip, Send, X, CornerUpLeft, Smile, Loader2, Sticker } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRiftStore } from '@/hooks/useRiftStore'
import { sendRiftMessage, uploadRiftAttachment } from '@/features/rift/actions'
import { createClient } from '@/utils/supabase/client'
import { compressFileIfImage } from '@/utils/compressImage'
import { toast } from 'sonner'
import type { RiftMessage } from '@/hooks/useRiftStore'
import { GiphyFetch } from '@giphy/js-fetch-api'
import { Grid } from '@giphy/react-components'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const gf = new GiphyFetch('sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh') // Giphy public test key

// ── Catégories d'emojis fréquents ──
const EMOJI_CATEGORIES = [
    { label: 'Fréquents', emojis: ['😂', '❤️', '😍', '🙏', '👍', '🔥', '🎉', '😢', '😱', '😎', '🙄', '🤔', '👀', '✅', '❌', '💯'] },
    { label: 'Visages', emojis: ['😀', '😃', '😄', '😁', '😅', '😣', '😥', '🤯', '🥵', '🥶', '🥱', '🥴', '😴', '🥳', '🤡', '😈'] },
    { label: 'Gestes', emojis: ['👋', '👌', '✌️', '🤞', '🤟', '🤘', '👊', '👎', '🙌', '👏', '🤝', '🙋', '🤷', '🤦', '💁', '💪'] },
    { label: 'Objets', emojis: ['💻', '📱', '⚙️', '🛠️', '📁', '📊', '🔒', '🎯', '💡', '⏰', '🌟', '🚀', '🌞', '🌙', '☔', '☕'] },
]

export function RiftMessageInput() {
    const { activeChannel, replyingTo, setReplyingTo, addOptimisticMessage, updateMessage, removeMessage } = useRiftStore()
    const [content, setContent] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [attachmentPreview, setAttachmentPreview] = useState<{
        file: File
        preview: string | null
        isImage: boolean
    } | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const emojiPickerRef = useRef<HTMLDivElement>(null)
    const emojiBtnRef = useRef<HTMLButtonElement>(null)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)

    // Mentions state
    const [mentionSearch, setMentionSearch] = useState<string | null>(null)
    const [cursorPosition, setCursorPosition] = useState(0)

    // GIF state
    const [gifSearchText, setGifSearchText] = useState('')
    const [isGifPopoverOpen, setIsGifPopoverOpen] = useState(false)

    const fetchGifs = useCallback((offset: number) => {
        return gifSearchText 
            ? gf.search(gifSearchText, { offset, limit: 10 })
            : gf.trending({ offset, limit: 10 })
    }, [gifSearchText])

    const handleGifClick = useCallback(async (gif: any, e: React.SyntheticEvent<HTMLElement, Event>) => {
        e.preventDefault()
        setIsGifPopoverOpen(false)
        if (!activeChannel) return
        
        const gifUrl = gif.images.fixed_height.url || gif.images.original.url
        const messageContent = `![GIF](${gifUrl})`
        
        setIsSending(true)
        // Optomistic msg omitted for brevity, let's just send it
        const result = await sendRiftMessage(
            activeChannel.id,
            messageContent,
            replyingTo?.id ?? null
        )
        if (result.error) toast.error(result.error)
        
        setReplyingTo(null)
        setIsSending(false)
    }, [activeChannel, replyingTo, setReplyingTo])

    // ── Fermer le picker emoji quand on clique ailleurs ──
    useEffect(() => {
        if (!showEmojiPicker) return
        const handleClickOutside = (e: MouseEvent) => {
            if (
                emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node) &&
                emojiBtnRef.current && !emojiBtnRef.current.contains(e.target as Node)
            ) {
                setShowEmojiPicker(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showEmojiPicker])

    // ── Insérer un emoji dans le textarea ──
    const insertEmoji = useCallback((emoji: string) => {
        setContent(prev => prev + emoji)
        textareaRef.current?.focus()
    }, [])

    // Focus textarea when replyingTo changes
    useEffect(() => {
        if (replyingTo && textareaRef.current) {
            textareaRef.current.focus()
        }
    }, [replyingTo])

    // ── Gérer le Coller (Paste) ──
    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1 || items[i].kind === 'file') {
                const file = items[i].getAsFile()
                if (file) {
                    // Simuler une sélection de fichier
                    if (file.size > 20 * 1024 * 1024) {
                        toast.error('Le fichier collé est trop volumineux (max 20 MB)')
                        continue
                    }

                    const isImage = file.type.startsWith('image/') && file.type !== 'image/svg+xml'
                    let preview: string | null = null
                    if (isImage) {
                        preview = URL.createObjectURL(file)
                    }

                    setAttachmentPreview({ file, preview, isImage })
                    // On arrête au premier fichier trouvé dans le presse-papier
                    break
                }
            }
        }
    }, [])

    // ── Auto-resize du textarea ──
    const handleTextareaChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setContent(val)
        
        const el = e.target
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`

        const caret = e.target.selectionStart
        setCursorPosition(caret)
        
        const textBeforeCaret = val.slice(0, caret)
        const match = textBeforeCaret.match(/@(\w*)$/)
        if (match) {
            setMentionSearch(match[1].toLowerCase())
        } else {
            setMentionSearch(null)
        }
    }, [])

    const insertMention = useCallback((member: any) => {
        const before = content.slice(0, cursorPosition)
        const after = content.slice(cursorPosition)
        const matchStart = before.lastIndexOf('@')
        
        if (matchStart !== -1) {
            const prefix = before.slice(0, matchStart)
            // Ajoute un espace insécable ou normal après la mention
            const mentionText = `@${member.profile?.first_name}${member.profile?.last_name}`
            const newContent = `${prefix}${mentionText} ${after}`
            setContent(newContent)
            setMentionSearch(null)
            
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus()
                    const newPos = matchStart + mentionText.length + 1
                    textareaRef.current.setSelectionRange(newPos, newPos)
                }
            }, 0)
        }
    }, [content, cursorPosition])

    const filteredMembers = activeChannel?.members?.filter(m => {
        if (!m.profile) return false
        if (mentionSearch === null) return true
        const fullName = `${m.profile.first_name} ${m.profile.last_name}`.toLowerCase()
        return fullName.includes(mentionSearch)
    }) || []

    // ── Sélection de fichier ──
    const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Vérification taille max (20 MB brut)
        if (file.size > 20 * 1024 * 1024) {
            toast.error('Le fichier est trop volumineux (max 20 MB)')
            return
        }

        const isImage = file.type.startsWith('image/') && file.type !== 'image/svg+xml'
        let preview: string | null = null

        if (isImage) {
            preview = URL.createObjectURL(file)
        }

        setAttachmentPreview({ file, preview, isImage })

        // Reset l'input file
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [])

    // ── Suppression de la preview d'attachment ──
    const clearAttachment = useCallback(() => {
        if (attachmentPreview?.preview) {
            URL.revokeObjectURL(attachmentPreview.preview)
        }
        setAttachmentPreview(null)
    }, [attachmentPreview])

    // ── Envoi du message ──
    const handleSend = useCallback(async () => {
        if ((!content.trim() && !attachmentPreview) || !activeChannel || isSending) return

        setIsSending(true)
        let messageContent = content.trim()

        try {
            // 1. Upload de la pièce jointe si présente
            if (attachmentPreview) {
                setIsUploading(true)

                let fileToUpload = attachmentPreview.file

                // Compression si c'est une image
                if (attachmentPreview.isImage) {
                    try {
                        fileToUpload = await compressFileIfImage(attachmentPreview.file)
                    } catch {
                        console.warn('[Rift] Compression échouée, upload du fichier original')
                    }
                }

                const formData = new FormData()
                formData.append('file', fileToUpload)

                const uploadResult = await uploadRiftAttachment(formData)
                setIsUploading(false)

                if (uploadResult.error) {
                    toast.error(`Erreur upload : ${uploadResult.error}`)
                    setIsSending(false)
                    return
                }

                // Construire le contenu avec le lien markdown
                if (uploadResult.url) {
                    if (attachmentPreview.isImage) {
                        messageContent = messageContent
                            ? `${messageContent}\n\n![${attachmentPreview.file.name}](${uploadResult.url})`
                            : `![${attachmentPreview.file.name}](${uploadResult.url})`
                    } else {
                        messageContent = messageContent
                            ? `${messageContent}\n\n[📎 ${attachmentPreview.file.name}](${uploadResult.url})`
                            : `[📎 ${attachmentPreview.file.name}](${uploadResult.url})`
                    }
                }

                clearAttachment()
            }

            if (!messageContent) {
                setIsSending(false)
                return
            }

            // 2. Créer un message optimiste instantané
            // Récupérer le profil depuis les membres du channel (déjà en cache)
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            const myMember = activeChannel.members?.find(m => m.user_id === user?.id)
            const myProfile = myMember?.profile

            const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
            const optimisticMsg: RiftMessage = {
                id: tempId,
                channel_id: activeChannel.id,
                user_id: user?.id ?? '',
                content: messageContent,
                reply_to_id: replyingTo?.id ?? null,
                is_edited: false,
                deleted_at: null,
                created_at: new Date().toISOString(),
                entity_id: null,
                entity_type: null,
                is_forwarded: false,
                forwarded_from_id: null,
                profile: myProfile ? {
                    id: myProfile.id,
                    first_name: myProfile.first_name,
                    last_name: myProfile.last_name,
                    avatar_url: myProfile.avatar_url,
                    role: myProfile.role,
                } : undefined,
                reply_to: replyingTo ? {
                    id: replyingTo.id,
                    content: replyingTo.content,
                    user_id: replyingTo.user_id,
                    profile: replyingTo.profile ? { first_name: replyingTo.profile.first_name, last_name: replyingTo.profile.last_name } : undefined,
                } : null,
            }

            addOptimisticMessage(optimisticMsg)

            // Reset immédiatement (l'utilisateur voit déjà son message)
            setContent('')
            setReplyingTo(null)
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
            }

            // 4. Envoi réel du message
            const result = await sendRiftMessage(
                activeChannel.id,
                messageContent,
                replyingTo?.id ?? null
            )

            if (result.error) {
                // Retirer le message optimiste en cas d'erreur
                removeMessage(tempId)
                toast.error(result.error)
            }
            // Si succès : le realtime remplacera le message optimiste par le vrai
        } catch (err) {
            console.error('[Rift] Erreur envoi:', err)
            toast.error('Erreur lors de l\'envoi du message')
        }

        setIsSending(false)
    }, [content, attachmentPreview, activeChannel, isSending, replyingTo, clearAttachment, setReplyingTo])

    // ── Raccourci clavier : Enter pour envoyer, Shift+Enter pour saut de ligne ──
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
        if (e.key === 'Escape') {
            setReplyingTo(null)
            clearAttachment()
        }
    }, [handleSend, setReplyingTo, clearAttachment])

    if (!activeChannel) return null

    return (
        <div className="border-t border-white/[0.06] bg-black/20 backdrop-blur-xl">
            {/* Barre de réponse */}
            {replyingTo && (
                <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-white/[0.04]">
                    <CornerUpLeft className="w-4 h-4 text-primary/60 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-primary/80">
                            Réponse à {replyingTo.profile?.first_name} {replyingTo.profile?.last_name}
                        </span>
                        <div className="text-[11px] text-muted-foreground truncate flex items-center gap-2">
                            {(() => {
                                const content = replyingTo.content
                                const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g
                                const fileRegex = /\[📎\s*([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g
                                
                                let displayContent: React.ReactNode = content
                                
                                if (content.match(imageRegex)) {
                                    displayContent = <span className="flex items-center gap-1 italic opacity-70">🖼️ Image</span>
                                } else if (content.match(fileRegex)) {
                                    const match = fileRegex.exec(content)
                                    displayContent = <span className="flex items-center gap-1 italic text-primary/60">📎 {match?.[1] || 'Fichier'}</span>
                                }
                                
                                return displayContent
                            })()}
                        </div>
                    </div>
                    <button
                        onClick={() => setReplyingTo(null)}
                        className="p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Preview de la pièce jointe */}
            {attachmentPreview && (
                <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.02] border-b border-white/[0.04]">
                    {attachmentPreview.isImage && attachmentPreview.preview ? (
                        <img
                            src={attachmentPreview.preview}
                            alt="Preview"
                            className="w-16 h-16 rounded-lg object-cover border border-white/10"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                            <Paperclip className="w-6 h-6 text-muted-foreground" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{attachmentPreview.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {(attachmentPreview.file.size / 1024).toFixed(0)} Ko
                            {attachmentPreview.isImage && ' — sera compressé'}
                        </p>
                    </div>
                    <button
                        onClick={clearAttachment}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors text-muted-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Barre de saisie */}
            <div className="flex items-end gap-2 p-3 min-w-0">
                {/* Bouton trombone */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={cn(
                        'p-2.5 rounded-xl transition-colors flex-shrink-0',
                        'text-muted-foreground hover:text-foreground hover:bg-white/5',
                        isUploading && 'opacity-50 cursor-not-allowed'
                    )}
                    title="Joindre un fichier"
                >
                    {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Paperclip className="w-5 h-5" />
                    )}
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.7z,.rar,.mp3,.ogg,.wav,.mp4,.webm"
                />

                {/* Textarea */}
                <div className="flex-1 relative">
                    {/* Menu Mentions */}
                    {mentionSearch !== null && filteredMembers.length > 0 && (
                        <div className="absolute bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl z-50 custom-scrollbar p-1">
                            {filteredMembers.map(m => (
                                <button
                                    key={m.user_id}
                                    onClick={() => insertMention(m)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                                >
                                    <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0 overflow-hidden">
                                        {m.profile?.avatar_url ? (
                                            <img src={m.profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            `${m.profile?.first_name?.[0] || ''}${m.profile?.last_name?.[0] || ''}`
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-foreground truncate">
                                        {m.profile?.first_name} {m.profile?.last_name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder="Écrire un message..."
                        disabled={isSending}
                        rows={1}
                        className={cn(
                            'w-full resize-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50',
                            'focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/20',
                            'transition-all custom-scrollbar',
                            isSending && 'opacity-50'
                        )}
                        style={{ maxHeight: '160px' }}
                    />
                </div>

                {/* Bouton emoji */}
                <div className="relative">
                    <button
                        ref={emojiBtnRef}
                        onClick={() => setShowEmojiPicker(prev => !prev)}
                        className={cn(
                            'p-2.5 rounded-xl transition-colors flex-shrink-0',
                            showEmojiPicker
                                ? 'bg-primary/20 text-primary'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        )}
                        title="Emoji"
                    >
                        <Smile className="w-5 h-5" />
                    </button>

                    {/* Panneau Emoji */}
                    {showEmojiPicker && (
                        <div
                            ref={emojiPickerRef}
                            className="absolute bottom-full right-0 mb-2 w-72 max-h-64 overflow-y-auto rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl z-50 custom-scrollbar"
                        >
                            {EMOJI_CATEGORIES.map((cat) => (
                                <div key={cat.label} className="p-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 px-1 mb-1">{cat.label}</p>
                                    <div className="grid grid-cols-8 gap-0.5">
                                        {cat.emojis.map((emoji) => (
                                            <button
                                                key={emoji}
                                                onClick={() => insertEmoji(emoji)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-lg"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bouton GIF */}
                <Popover open={isGifPopoverOpen} onOpenChange={setIsGifPopoverOpen}>
                    <PopoverTrigger asChild>
                        <button
                            className="p-2.5 rounded-xl transition-colors flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/5"
                            title="Envoyer un GIF"
                        >
                            <Sticker className="w-5 h-5" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="end" className="w-[340px] h-[400px] p-0 bg-black/90 backdrop-blur-xl border-white/10 shadow-2xl flex flex-col z-50">
                        <div className="p-3 border-b border-white/5">
                            <input 
                                type="text" 
                                placeholder="Rechercher un GIF..." 
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                                onChange={(e) => setGifSearchText(e.target.value)}
                                value={gifSearchText}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                            <Grid 
                                key={gifSearchText /* force remount on search change */} 
                                width={320} 
                                columns={2} 
                                fetchGifs={fetchGifs} 
                                onGifClick={handleGifClick} 
                                noResultsMessage={<div className="p-4 text-center text-sm text-muted-foreground">Aucun GIF trouvé</div>}
                            />
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Bouton envoi */}
                <button
                    onClick={handleSend}
                    disabled={isSending || (!content.trim() && !attachmentPreview)}
                    className={cn(
                        'p-2.5 rounded-xl transition-all flex-shrink-0',
                        content.trim() || attachmentPreview
                            ? 'bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20'
                            : 'bg-white/[0.03] text-muted-foreground/30 border border-white/[0.04] cursor-not-allowed'
                    )}
                    title="Envoyer (Enter)"
                >
                    {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Send className="w-5 h-5" />
                    )}
                </button>
            </div>
        </div>
    )
}
