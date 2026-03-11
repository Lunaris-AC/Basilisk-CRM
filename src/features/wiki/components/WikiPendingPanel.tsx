'use client'

import { Clock, FileText, GitBranch, User } from 'lucide-react'
import { usePendingDocuments } from '@/features/wiki/api/useWiki'

interface WikiPendingPanelProps {
    onSelect: (id: string) => void
}

export function WikiPendingPanel({ onSelect }: WikiPendingPanelProps) {
    const { data: documents, isLoading } = usePendingDocuments()

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                        <Clock className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Documents en attente</h2>
                        <p className="text-sm text-muted-foreground">
                            Ces documents nécessitent votre validation avant publication.
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-sm text-muted-foreground">Chargement...</div>
                ) : !documents || documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
                        <FileText className="w-12 h-12 opacity-30" />
                        <p className="text-sm">Aucun document en attente de validation.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {documents.map((doc: any) => (
                            <button
                                key={doc.id}
                                onClick={() => onSelect(doc.id)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                            >
                                <span className="text-2xl">{doc.icon || '📄'}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-foreground truncate">{doc.title}</span>
                                        {doc.base_document_id && (
                                            <span className="flex items-center gap-1 text-[10px] text-violet-300/80 bg-violet-500/10 px-1.5 py-0.5 rounded-md border border-violet-500/20 shrink-0">
                                                <GitBranch className="w-3 h-3" />
                                                Modification
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                        <User className="w-3 h-3" />
                                        <span>
                                            {doc.author?.first_name} {doc.author?.last_name}
                                        </span>
                                        <span className="opacity-40">·</span>
                                        <span>
                                            {new Date(doc.updated_at).toLocaleDateString('fr-FR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                </div>
                                <span className="px-2 py-1 text-[10px] font-bold tracking-wider rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                    PENDING
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
