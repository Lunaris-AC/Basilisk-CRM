'use client'

import { useState, useEffect, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { WikiTreeSidebar } from '@/features/wiki/components/WikiTreeSidebar'
import { WikiEditor } from '@/features/wiki/components/WikiEditor'
import { WikiToolbar } from '@/features/wiki/components/WikiToolbar'
import { WikiPendingPanel } from '@/features/wiki/components/WikiPendingPanel'
import { useWikiDocument } from '@/features/wiki/api/useWiki'
import { BookOpen } from 'lucide-react'

export default function WikiPage() {
    return (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><BookOpen className="w-10 h-10 animate-pulse text-muted-foreground" /></div>}>
            <WikiPageContent />
        </Suspense>
    )
}

function WikiPageContent() {
    const searchParams = useSearchParams()
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
    const [showPending, setShowPending] = useState(false)
    const { data: document, isLoading } = useWikiDocument(selectedDocId)

    // Ouvrir le document depuis l'URL (?docId=...)
    useEffect(() => {
        const docId = searchParams.get('docId')
        if (docId) setSelectedDocId(docId)
    }, [searchParams])

    const { data: profile } = useQuery({
        queryKey: ['my-profile-wiki'],
        queryFn: async () => {
            const { createClient } = await import('@/utils/supabase/client')
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null
            const { data } = await supabase.from('profiles').select('id, role, support_level, first_name, last_name').eq('id', user.id).single()
            return data
        },
        staleTime: 1000 * 60 * 10,
    })

    const isReviewer = (['ADMIN'].includes(profile?.role ?? '') || (profile?.role === 'TECHNICIEN' && ['N3', 'N4'].includes(profile?.support_level ?? '')))

    return (
        <div className="flex h-[calc(100vh-5rem)] -m-6 md:-m-8">
            {/* Sidebar Wiki (Tree) */}
            <WikiTreeSidebar
                selectedId={selectedDocId}
                onSelect={setSelectedDocId}
                userRole={profile?.role ?? ''}
                showPending={showPending}
                onTogglePending={() => setShowPending(!showPending)}
                isReviewer={isReviewer}
            />

            {/* Zone centrale */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {selectedDocId && document ? (
                    <>
                        {/* Toolbar */}
                        <WikiToolbar
                            document={document}
                            userRole={profile?.role ?? ''}
                            userId={profile?.id ?? ''}
                            isReviewer={isReviewer}
                            onDocumentChange={setSelectedDocId}
                        />

                        {/* Editor */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <WikiEditor
                                key={document.id}
                                document={document}
                                canEdit={
                                    (document.status === 'DRAFT' && document.author_id === profile?.id)
                                    || (document.status === 'PUBLISHED' && isReviewer)
                                }
                            />
                        </div>
                    </>
                ) : showPending && isReviewer ? (
                    <WikiPendingPanel onSelect={(id: string) => { setSelectedDocId(id); setShowPending(false) }} />
                ) : (
                    /* État vide */
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-4 opacity-50">
                            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground" />
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">Wiki Basilisk</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Sélectionnez une page dans l&apos;arborescence
                                    <br />ou créez-en une nouvelle.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
