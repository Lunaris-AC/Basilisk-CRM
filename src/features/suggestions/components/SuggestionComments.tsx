'use client'

import { useState, useEffect } from 'react'
import { SuggestionComment } from '../types'
import { getSuggestionComments, addSuggestionComment } from '../actions'
import { MessageSquare, Send, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SuggestionCommentsProps {
    suggestionId: string
}

export function SuggestionComments({ suggestionId }: SuggestionCommentsProps) {
    const [comments, setComments] = useState<SuggestionComment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [content, setContent] = useState('')

    useEffect(() => {
        const fetchComments = async () => {
            const res = await getSuggestionComments(suggestionId)
            if (res.data) setComments(res.data)
            setIsLoading(false)
        }
        fetchComments()
    }, [suggestionId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim()) return

        setIsSubmitting(true)
        const res = await addSuggestionComment(suggestionId, content)
        if (res.success) {
            setContent('')
            // Optimistic update or refetch
            const updated = await getSuggestionComments(suggestionId)
            if (updated.data) setComments(updated.data)
            toast.success('Commentaire ajouté')
        } else {
            toast.error(res.error || 'Erreur')
        }
        setIsSubmitting(false)
    }

    if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-primary/40" /></div>

    return (
        <div className="space-y-6 pt-4 border-t border-white/5 mt-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{comments.length} Commentaires</span>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {comment.profiles?.avatar_url ? (
                                <img src={comment.profiles.avatar_url} alt="" className="w-full h-full rounded-full" />
                            ) : (
                                <User className="w-4 h-4 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                    {comment.profiles?.first_name} {comment.profiles?.last_name}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                    {new Date(comment.created_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed bg-white/5 p-3 rounded-2xl border border-white/5">
                                {comment.content}
                            </p>
                        </div>
                    </div>
                ))}

                {comments.length === 0 && (
                    <p className="text-xs italic text-muted-foreground/40 text-center py-4">
                        Pas encore de commentaires. Poussez cette idée plus loin !
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="relative">
                <Textarea 
                    placeholder="Votre avis ou suggestion pour améliorer cette idée..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="bg-black/20 border-white/5 focus:border-primary/40 rounded-2xl pr-12 text-sm min-h-[80px] resize-none"
                />
                <Button 
                    type="submit" 
                    disabled={isSubmitting || !content.trim()}
                    size="icon"
                    className="absolute right-2 bottom-2 rounded-xl h-8 w-8"
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
            </form>
        </div>
    )
}
