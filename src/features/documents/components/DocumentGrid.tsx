'use client'

import { Document } from '@/features/documents/api/getDocuments'
import { deleteDocumentAction } from '@/features/documents/actions'
import { FileText, FileSpreadsheet, Download, Trash2, Loader2, Calendar, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface DocumentGridProps {
    documents: Document[] | undefined
    isLoading: boolean
    category: 'DOC' | 'PATCH_NOTE'
    canManage: boolean
}

function getFileIcon(url: string) {
    const lower = url.toLowerCase()
    if (lower.includes('.xls') || lower.includes('.csv')) {
        return <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
    }
    return <FileText className="w-8 h-8 text-primary/80" />
}

function getFileExtension(url: string): string {
    try {
        const pathname = new URL(url).pathname
        const ext = pathname.split('.').pop()?.toUpperCase() || 'FILE'
        return ext
    } catch {
        return 'FILE'
    }
}

export function DocumentGrid({ documents, isLoading, category, canManage }: DocumentGridProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const queryClient = useQueryClient()

    const handleDelete = (docId: string) => {
        if (!confirm('Supprimer ce document ?')) return
        setDeletingId(docId)
        startTransition(async () => {
            const res = await deleteDocumentAction(docId)
            if (res.error) {
                alert(res.error)
            } else {
                queryClient.invalidateQueries({ queryKey: ['documents', category] })
            }
            setDeletingId(null)
        })
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!documents || documents.length === 0) {
        return (
            <div className="p-12 text-center rounded-2xl bg-white/5 border border-dashed border-white/10">
                <FileText className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground text-lg font-medium">Aucun document pour le moment.</p>
                {canManage && (
                    <p className="text-muted-foreground text-sm mt-1">Utilisez le bouton "Uploader" pour ajouter un document.</p>
                )}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
                <div
                    key={doc.id}
                    className="group p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/[0.08] hover:border-primary/30 transition-all duration-300 flex flex-col gap-4 relative overflow-hidden"
                >
                    {/* Glow effect */}
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

                    {/* Icône + Extension */}
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/20 transition-colors">
                            {getFileIcon(doc.file_url)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-foreground truncate group-hover:text-indigo-200 transition-colors">{doc.title}</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-muted-foreground font-semibold tracking-wider">
                                {getFileExtension(doc.file_url)}
                            </span>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1.5 relative z-10">
                        {doc.uploader && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <User className="w-3 h-3" />
                                <span>{doc.uploader.first_name} {doc.uploader.last_name}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>il y a {formatDistanceToNow(new Date(doc.created_at), { addSuffix: false, locale: fr })}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5 relative z-10 mt-auto">
                        <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary/80 text-xs font-bold hover:bg-primary/20 hover:border-primary/40 transition-all"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Consulter
                        </a>

                        {canManage && (
                            <button
                                onClick={() => handleDelete(doc.id)}
                                disabled={deletingId === doc.id}
                                className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all disabled:opacity-50"
                                title="Supprimer"
                            >
                                {deletingId === doc.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                )}
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
