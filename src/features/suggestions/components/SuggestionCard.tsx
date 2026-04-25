'use client'

import { Suggestion, SuggestionStatus } from '../types'
import { ThumbsUp, ThumbsDown, Clock, CheckCircle2, XCircle, Timer, User, MessageSquare } from 'lucide-react'
import { toggleVote, updateSuggestionStatus } from '../actions'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SuggestionComments } from './SuggestionComments'
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'

interface SuggestionCardProps {
    suggestion: Suggestion
    isAdmin: boolean
    isTopThree?: boolean
}

const statusConfig: Record<SuggestionStatus, { label: string, icon: any, color: string }> = {
    PENDING: { label: 'En attente', icon: Clock, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    APPROVED: { label: 'Approuvé', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    REFUSED: { label: 'Refusé', icon: XCircle, color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
    DEFERRED: { label: 'Plus tard', icon: Timer, color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
}

export function SuggestionCard({ suggestion, isAdmin, isTopThree }: SuggestionCardProps) {
    const [isVoting, setIsVoting] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const StatusIcon = statusConfig[suggestion.status].icon

    const canVote = suggestion.status === 'PENDING'

    const handleVote = async (value: 1 | -1) => {
        if (!canVote) return
        setIsVoting(true)
        const res = await toggleVote(suggestion.id, value)
        if (res?.error) {
            toast.error(res.error)
        }
        setIsVoting(false)
    }

    const handleStatusUpdate = async (newStatus: SuggestionStatus) => {
        const res = await updateSuggestionStatus(suggestion.id, newStatus)
        if (res?.success) {
            toast.success(`Statut mis à jour : ${statusConfig[newStatus].label}`)
        } else {
            toast.error(res?.error || 'Erreur lors de la mise à jour')
        }
    }

    return (
        <div className={cn(
            "relative group flex flex-col p-5 rounded-3xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md transition-all hover:bg-white/[0.05]",
            isTopThree && "border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-lg shadow-primary/10"
        )}>
            {isTopThree && (
                <div className="absolute -top-3 -left-3 bg-primary text-black font-black text-[10px] px-2 py-1 rounded-lg shadow-xl uppercase tracking-tighter">
                    🔥 Top Idée
                </div>
            )}

            <div className="flex justify-between items-start gap-4 mb-4">
                <div className="space-y-1">
                    <h3 className="font-bold text-lg text-foreground leading-tight">{suggestion.title}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                        <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{suggestion.profiles?.first_name} {suggestion.profiles?.last_name}</span>
                        </div>
                        <span>•</span>
                        <span>{new Date(suggestion.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                </div>

                <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider shrink-0",
                    statusConfig[suggestion.status].color
                )}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig[suggestion.status].label}
                </div>
            </div>

            <p className="text-sm text-muted-foreground/90 mb-6 flex-1 leading-relaxed">
                {suggestion.description}
            </p>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                {canVote ? (
                    <div className="flex items-center gap-1 bg-white/5 rounded-2xl p-1 border border-white/5">
                        <button
                            onClick={() => handleVote(1)}
                            disabled={isVoting}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-tighter",
                                suggestion.user_vote_value === 1
                                    ? "bg-primary text-black shadow-lg shadow-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            <ThumbsUp className={cn("w-3.5 h-3.5", suggestion.user_vote_value === 1 && "fill-current")} />
                            <span>{suggestion.upvotes_count}</span>
                        </button>
                        <div className="w-px h-4 bg-white/10 mx-0.5" />
                        <button
                            onClick={() => handleVote(-1)}
                            disabled={isVoting}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-tighter",
                                suggestion.user_vote_value === -1
                                    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                                    : "text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                            )}
                        >
                            <ThumbsDown className={cn("w-3.5 h-3.5", suggestion.user_vote_value === -1 && "fill-current")} />
                            <span>{suggestion.downvotes_count}</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        <ThumbsUp className="w-3 h-3" />
                        <span>Score final : {suggestion.votes_count}</span>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest",
                            showComments ? "bg-white/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Détails</span>
                    </button>

                    {isAdmin && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl opacity-50 hover:opacity-100">
                                    <Timer className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-white/10">
                                {Object.entries(statusConfig).map(([status, config]) => (
                                    <DropdownMenuItem 
                                        key={status}
                                        onClick={() => handleStatusUpdate(status as SuggestionStatus)}
                                        className="flex items-center gap-2 text-xs font-bold py-2 cursor-pointer"
                                    >
                                        <config.icon className={cn("w-4 h-4", config.color.split(' ')[0])} />
                                        {config.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {showComments && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    <SuggestionComments suggestionId={suggestion.id} />
                </div>
            )}
        </div>
    )
}
