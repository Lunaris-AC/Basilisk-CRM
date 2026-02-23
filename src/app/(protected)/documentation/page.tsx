'use client'

import { useDocuments } from '@/features/documents/api/useDocuments'
import { DocumentGrid } from '@/features/documents/components/DocumentGrid'
import { UploadDocumentModal } from '@/features/documents/components/UploadDocumentModal'
import { FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

export default function DocumentationPage() {
    const { data: documents, isLoading } = useDocuments('DOC')
    const [uploadOpen, setUploadOpen] = useState(false)

    const { data: profile } = useQuery({
        queryKey: ['my-profile-docs'],
        queryFn: async () => {
            const { createClient } = await import('@/utils/supabase/client')
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null
            const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            return data
        },
        staleTime: 1000 * 60 * 10,
    })

    const canManage = ['ADMIN', 'DEV'].includes(profile?.role || '')

    return (
        <div className="space-y-8 pb-10 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-3">
                        <FileText className="w-9 h-9 text-indigo-400" />
                        Documentation
                    </h1>
                    <p className="text-white/60 font-medium">
                        Guides, procédures et documents internes.
                    </p>
                </div>

                {canManage && (
                    <button
                        onClick={() => setUploadOpen(true)}
                        className="group relative px-6 py-3 rounded-2xl overflow-hidden transition-all shadow-xl border hover:scale-105 active:scale-95 shadow-indigo-500/20 border-indigo-400/30"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-center gap-2 text-white font-bold text-sm tracking-wide">
                            <Plus className="w-5 h-5" />
                            Uploader un document
                        </div>
                    </button>
                )}
            </div>

            <DocumentGrid
                documents={documents}
                isLoading={isLoading}
                category="DOC"
                canManage={canManage}
            />

            <UploadDocumentModal
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                category="DOC"
            />
        </div>
    )
}
