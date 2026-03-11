'use client'

import { useState } from 'react'
import {
    Send,
    CheckCircle2,
    XCircle,
    Edit3,
    History,
    Trash2,
    GitBranch,
    Loader2,
} from 'lucide-react'
import {
    useSubmitForReview,
    useApproveDocument,
    useRejectDocument,
    useSuggestEdit,
    useDeleteWikiDocument,
    useWikiRevisions,
} from '@/features/wiki/api/useWiki'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface WikiToolbarProps {
    document: {
        id: string
        title: string
        status: string
        author_id: string
        base_document_id?: string | null
        rejection_reason?: string | null
        author?: { first_name: string; last_name: string; role: string } | null
    }
    userRole: string
    userId: string
    isReviewer: boolean
    onDocumentChange: (id: string | null) => void
}

export function WikiToolbar({ document, userRole, userId, isReviewer, onDocumentChange }: WikiToolbarProps) {
    const submitForReview = useSubmitForReview()
    const approve = useApproveDocument()
    const reject = useRejectDocument()
    const suggestEditMut = useSuggestEdit()
    const deleteDoc = useDeleteWikiDocument()

    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [showHistory, setShowHistory] = useState(false)

    const isDraft = document.status === 'DRAFT'
    const isPending = document.status === 'PENDING'
    const isPublished = document.status === 'PUBLISHED'
    const isAuthor = document.author_id === userId

    async function handleSubmit() {
        try {
            await submitForReview.mutateAsync(document.id)
            toast.success('Document soumis pour validation !')
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    async function handleApprove() {
        try {
            const result = await approve.mutateAsync(document.id)
            if (document.base_document_id) {
                toast.success('Modification fusionnée et nettoyée !')
                onDocumentChange(document.base_document_id)
            } else {
                toast.success('Document approuvé et publié !')
            }
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    async function handleReject() {
        try {
            await reject.mutateAsync({ id: document.id, reason: rejectReason })
            toast.success('Document rejeté.')
            setShowRejectModal(false)
            setRejectReason('')
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    async function handleSuggestEdit() {
        try {
            const result = await suggestEditMut.mutateAsync(document.id)
            onDocumentChange(result.id)
            toast.success('Brouillon de modification créé.')
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    async function handleDelete() {
        if (!confirm('Supprimer ce document ?')) return
        try {
            await deleteDoc.mutateAsync(document.id)
            onDocumentChange(null)
            toast.success('Document supprimé.')
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    return (
        <>
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-black/10 backdrop-blur-sm shrink-0">
                {/* Left: status info */}
                <div className="flex items-center gap-3 text-sm">
                    <StatusBadge status={document.status} />

                    {document.base_document_id && (
                        <span className="flex items-center gap-1 text-xs text-violet-300/80">
                            <GitBranch className="w-3.5 h-3.5" />
                            Modification suggérée
                        </span>
                    )}

                    {document.author && (
                        <span className="text-xs text-muted-foreground">
                            par {document.author.first_name} {document.author.last_name}
                        </span>
                    )}

                    {isDraft && document.rejection_reason && (
                        <span className="text-xs text-red-400/80 max-w-xs truncate" title={document.rejection_reason}>
                            ⚠️ Rejeté : {document.rejection_reason}
                        </span>
                    )}
                </div>

                {/* Right: action buttons */}
                <div className="flex items-center gap-2">
                    {/* History */}
                    {isPublished && (
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                showHistory
                                    ? 'bg-white/10 text-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                            )}
                        >
                            <History className="w-3.5 h-3.5" />
                            Historique
                        </button>
                    )}

                    {/* DRAFT: Submit for review */}
                    {isDraft && isAuthor && (
                        <ActionButton
                            onClick={handleSubmit}
                            loading={submitForReview.isPending}
                            icon={Send}
                            label="Proposer la publication"
                            className="bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30"
                        />
                    )}

                    {/* PENDING: Approve / Reject (reviewers only) */}
                    {isPending && isReviewer && (
                        <>
                            <ActionButton
                                onClick={handleApprove}
                                loading={approve.isPending}
                                icon={CheckCircle2}
                                label="Approuver"
                                className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                            />
                            <ActionButton
                                onClick={() => setShowRejectModal(true)}
                                loading={false}
                                icon={XCircle}
                                label="Rejeter"
                                className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30"
                            />
                        </>
                    )}

                    {/* PUBLISHED: Suggest edit (non-reviewer) / Direct edit info (reviewer) */}
                    {isPublished && !isReviewer && (
                        <ActionButton
                            onClick={handleSuggestEdit}
                            loading={suggestEditMut.isPending}
                            icon={Edit3}
                            label="Suggérer une modification"
                            className="bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500/30"
                        />
                    )}

                    {/* Delete (drafts by author, published by reviewers) */}
                    {((isDraft && isAuthor) || (isPublished && isReviewer)) && (
                        <button
                            onClick={handleDelete}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Supprimer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-background border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-bold text-foreground">Rejeter le document</h3>
                        <p className="text-sm text-muted-foreground">
                            Indiquez la raison du rejet. L&apos;auteur pourra voir ce commentaire.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Raison du rejet..."
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                                className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={reject.isPending}
                                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                                {reject.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Rejeter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Panel */}
            {showHistory && <RevisionHistory documentId={document.id} />}
        </>
    )
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
    const config = {
        DRAFT: { label: 'Brouillon', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
        PENDING: { label: 'En attente', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
        PUBLISHED: { label: 'Publié', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    }[status] ?? { label: status, className: 'bg-white/10 text-foreground border-white/20' }

    return (
        <span className={cn('px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-md border', config.className)}>
            {config.label}
        </span>
    )
}

function ActionButton({
    onClick,
    loading,
    icon: Icon,
    label,
    className,
}: {
    onClick: () => void
    loading: boolean
    icon: any
    label: string
    className: string
}) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50',
                className
            )}
        >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
            {label}
        </button>
    )
}

function RevisionHistory({ documentId }: { documentId: string }) {
    const { data: revisions, isLoading } = useWikiRevisions(documentId)

    return (
        <div className="border-b border-white/5 bg-black/10 px-6 py-4 max-h-64 overflow-y-auto custom-scrollbar">
            <h4 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-3">
                Historique des révisions
            </h4>
            {isLoading ? (
                <p className="text-xs text-muted-foreground">Chargement...</p>
            ) : !revisions || revisions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune révision enregistrée.</p>
            ) : (
                <div className="space-y-2">
                    {revisions.map((rev: any, i: number) => (
                        <div key={rev.id} className="flex items-center gap-3 text-xs py-1.5 px-2 rounded-lg hover:bg-white/5">
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {revisions.length - i}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-medium text-foreground truncate">{rev.title}</span>
                                <span className="text-muted-foreground ml-2">
                                    par {rev.author?.first_name} {rev.author?.last_name}
                                </span>
                            </div>
                            <span className="text-muted-foreground shrink-0">
                                {new Date(rev.created_at).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
