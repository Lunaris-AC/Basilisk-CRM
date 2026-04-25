'use client'

// SPRINT 50.2 - Basilisk Rift : Composant message individuel
// Gère Fantômes (soft-delete 10min), Éditions, Accusés de lecture, Liens morts, Réactions, Réponses, Partages, Markdown & Code Blocks
// SPRINT 50.3 - Optimisation Hover et visibilité des actions

import { useEffect, useRef, useState, useCallback } from 'react'
import { differenceInMinutes, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
    Check, CheckCheck, CornerUpLeft, History, MoreHorizontal, Pencil, 
    Trash2, SmilePlus, Link2Off, ArrowRight, ExternalLink, Ticket, Code2,
    User, Hash, Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRiftStore, type RiftMessage } from '@/hooks/useRiftStore'
import { deleteRiftMessage, editRiftMessage, toggleRiftReaction, forwardRiftMessage } from '@/features/rift/actions'
import { toast } from 'sonner'
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

// ── Sous-composant pour gérer les images et liens morts ──
function SafeImage({ src, alt }: { src: string; alt: string }) {
    const [error, setError] = useState(false)
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 p-4 mt-2 rounded-xl bg-white/5 border border-dashed border-white/10 text-muted-foreground/50 max-w-full min-h-[100px]">
                <Link2Off className="w-6 h-6 opacity-50" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-center opacity-70">Image indisponible</span>
            </div>
        )
    }
    return <img src={src} alt={alt} onError={() => setError(true)} className="max-w-full max-h-80 rounded-xl mt-2 border border-white/10 cursor-zoom-in hover:opacity-90 transition-opacity" loading="lazy" />
}

interface RiftMessageProps {
    message: RiftMessage
    currentUserId: string
    isLastByUser?: boolean
    channelMemberCount?: number
}

export function RiftMessageComponent({ message, currentUserId, isLastByUser = false, channelMemberCount = 0 }: RiftMessageProps) {
    const { markAsRead, setReplyingTo, channels } = useRiftStore()
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState('')
    const [isForwarding, setIsForwarding] = useState(false)
    const messageRef = useRef<HTMLDivElement>(null)

    const isOwn = message.user_id === currentUserId

    const markdownComponents = {
        p: ({ children }: any) => <div className="mb-1 last:mb-0 whitespace-pre-wrap break-all [overflow-wrap:anywhere]">{children}</div>,
        code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            return !inline ? (
                <div className="relative my-2 group/code">
                    <div className="absolute -top-3 right-2 px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-0 group-hover/code:opacity-100 transition-opacity">{match ? match[1] : 'code'}</div>
                    <pre className="p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] leading-relaxed overflow-x-auto custom-scrollbar">
                        <code className={className} {...props}>{children}</code>
                    </pre>
                </div>
            ) : (
                <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] text-primary-foreground/90" {...props}>{children}</code>
            )
        },
        a: ({ href, children }: any) => {
            const isSafe = href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/') || href.startsWith('mailto:'))
            return (
                <a 
                    href={isSafe ? href : '#'} 
                    target={isSafe ? "_blank" : undefined} 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline break-all"
                    onClick={!isSafe ? (e) => e.preventDefault() : undefined}
                >
                    {children}
                </a>
            )
        },
        img: ({ src, alt }: any) => <SafeImage src={src || ''} alt={alt || 'Image'} />,
        ul: ({ children }: any) => <ul className="list-disc list-inside mb-1 ml-2">{children}</ul>,
        ol: ({ children }: any) => <ol className="list-decimal list-inside mb-1 ml-2">{children}</ol>,
        blockquote: ({ children }: any) => <blockquote className="border-l-2 border-primary/30 pl-3 italic my-1 text-muted-foreground">{children}</blockquote>,
    }

    const renderContent = (content: string, isPreview = false) => {
        const processedContent = content.replace(/@([a-zA-ZÀ-ÿ0-9_]+)/g, '**@$1**')
        if (isPreview) return <span className="italic">{processedContent.substring(0, 100)}{processedContent.length > 100 ? '...' : ''}</span>
        return <ReactMarkdown components={markdownComponents as any}>{processedContent}</ReactMarkdown>
    }

    const handleEdit = useCallback(async () => {
        if (!editContent.trim() || editContent.trim() === message.content) { setIsEditing(false); return; }
        const res = await editRiftMessage(message.id, editContent.trim())
        if (res.error) toast.error(res.error); else setIsEditing(false)
    }, [editContent, message.id, message.content])

    const handleDelete = useCallback(async () => {
        const res = await deleteRiftMessage(message.id)
        if (res.error) toast.error(res.error)
    }, [message.id])

    const handleForward = async (cid: string) => {
        const res = await forwardRiftMessage(message.id, cid)
        if (res.error) toast.error(res.error); else { toast.success('Transféré !'); setIsForwarding(false); }
    }

    const initials = message.profile ? `${message.profile.first_name?.[0] ?? ''}${message.profile.last_name?.[0] ?? ''}` : '?'

    return (
        <div ref={messageRef} className={cn('flex w-full px-4 py-1 transition-colors hover:bg-white/[0.01] group/msg', isOwn ? 'justify-end' : 'justify-start')}>
            <div className={cn('flex gap-3 min-w-0 max-w-full', isOwn ? 'flex-row-reverse' : 'flex-row')}>
                <div className="flex-shrink-0 w-8">
                    {isLastByUser ? <div className="w-8 h-8 rounded-full bg-primary/20 border border-white/10 flex items-center justify-center text-[10px] font-bold text-primary">{initials}</div> : <div className="w-8" />}
                </div>

                <div className={cn('flex flex-col min-w-0', isOwn ? 'items-end' : 'items-start')} style={{ maxWidth: 'calc(100vw - 12rem)' }}>
                    {isLastByUser && (
                        <div className={cn('flex items-center gap-2 mb-1 w-full', isOwn ? 'flex-row-reverse' : 'flex-row')}>
                            <span className="text-xs font-bold text-foreground/70 truncate">{message.profile?.first_name} {message.profile?.last_name}</span>
                            <span className="text-[9px] text-muted-foreground opacity-50">{format(new Date(message.created_at), 'HH:mm', { locale: fr })}</span>
                        </div>
                    )}

                    {message.is_forwarded && <div className="flex items-center gap-1.5 mb-1 opacity-50"><ArrowRight className="w-3 h-3 text-muted-foreground" /><span className="text-[10px] italic">Transféré</span></div>}

                    <div className={cn('relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed border flex flex-col w-fit max-w-full', isOwn ? 'bg-primary/20 border-primary/20 rounded-tr-md' : 'bg-white/[0.06] border-white/[0.06] rounded-tl-md')}>
                        {message.reply_to && (
                            <div className="mb-2 p-2 rounded-lg bg-black/20 border-l-2 border-primary/50 text-[11px] opacity-70">
                                <p className="font-bold text-primary">{message.reply_to.profile?.first_name} {message.reply_to.profile?.last_name}</p>
                                <div className="italic line-clamp-2">{renderContent(message.reply_to.content, true)}</div>
                            </div>
                        )}

                        <div className="whitespace-pre-wrap break-all [overflow-wrap:anywhere]">
                            {isEditing ? (
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                    <textarea autoFocus value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full bg-black/40 border border-primary/30 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" rows={3} />
                                    <div className="flex justify-end gap-2"><button onClick={() => setIsEditing(false)} className="text-[10px] text-muted-foreground hover:text-foreground">Annuler</button><button onClick={handleEdit} className="text-[10px] text-primary font-bold">Enregistrer</button></div>
                                </div>
                            ) : renderContent(message.content)}
                        </div>

                        {message.entity_id && (
                            <Link href={`/tickets/${message.entity_id}`} className="flex items-center gap-3 p-3 mt-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group w-full">
                                <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center"><Ticket className="w-5 h-5" /></div>
                                <div className="flex-1 min-w-0"><p className="text-[10px] font-black uppercase tracking-widest opacity-40">{message.entity_type}</p><p className="text-sm font-bold truncate group-hover:text-primary transition-colors">Consulter en live</p></div>
                                <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                            </Link>
                        )}

                        {message.is_edited && !isEditing && <span className="text-[9px] text-muted-foreground/40 ml-1">(modifié)</span>}

                        {!isEditing && (
                            <div className={cn('absolute -top-9 flex items-center gap-1 bg-[#0a0a1a] border border-white/10 rounded-xl p-1 shadow-2xl z-20 opacity-0 scale-95 pointer-events-none group-hover/msg:opacity-100 group-hover/msg:scale-100 group-hover/msg:pointer-events-auto transition-all duration-200', isOwn ? 'right-0' : 'left-0')}>
                                <button onClick={() => setReplyingTo(message)} className="p-1.5 hover:bg-white/10 rounded-lg" title="Répondre"><CornerUpLeft className="w-4 h-4" /></button>
                                
                                <Popover open={isForwarding} onOpenChange={setIsForwarding}>
                                    <PopoverTrigger asChild><button className="p-1.5 hover:bg-white/10 rounded-lg"><ArrowRight className="w-4 h-4" /></button></PopoverTrigger>
                                    <PopoverContent side="top" className="w-64 p-2 bg-[#0a0a1a] border border-white/10 shadow-2xl rounded-2xl">
                                        <p className="text-[10px] font-black text-primary px-3 py-2 uppercase tracking-widest border-b border-white/5 mb-2">Transférer vers...</p>
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                                            {channels.map(c => {
                                                const isDM = c.type === 'DM'
                                                const other = isDM ? c.members?.find(m => m.user_id !== currentUserId) : null
                                                const name = isDM ? (other?.profile ? `${other.profile.first_name} ${other.profile.last_name}` : 'Inconnu') : (c.name || 'Salon')
                                                return (
                                                    <button key={c.id} onClick={() => handleForward(c.id)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-primary/20 flex items-center gap-3 transition-all group/item">
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover/item:border-primary/30">{isDM ? <User className="w-4 h-4" /> : c.type === 'PUBLIC' ? <Hash className="w-4 h-4" /> : <Lock className="w-4 h-4" />}</div>
                                                        <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate group-hover/item:text-primary">{name}</p><p className="text-[9px] opacity-50">{c.type}</p></div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                <Popover>
                                    <PopoverTrigger asChild><button className="p-1.5 hover:bg-white/10 rounded-lg"><SmilePlus className="w-4 h-4" /></button></PopoverTrigger>
                                    <PopoverContent side="top" className="p-0 border-none bg-transparent shadow-none"><EmojiPicker theme={Theme.DARK} emojiStyle={EmojiStyle.NATIVE} onEmojiClick={e => toggleRiftReaction(message.id, e.emoji)} /></PopoverContent>
                                </Popover>

                                {isOwn && <button onClick={() => { setIsEditing(true); setEditContent(message.content) }} className="p-1.5 hover:bg-white/10 rounded-lg"><Pencil className="w-4 h-4" /></button>}
                                {isOwn && <button onClick={handleDelete} className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-400"><Trash2 className="w-4 h-4" /></button>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
