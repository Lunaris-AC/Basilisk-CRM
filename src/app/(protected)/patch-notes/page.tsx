'use client'

import { useDocuments } from '@/features/documents/api/useDocuments'
import { DocumentGrid } from '@/features/documents/components/DocumentGrid'
import { UploadDocumentModal } from '@/features/documents/components/UploadDocumentModal'
import { FileCode, Plus } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

export default function PatchNotesPage() {
    const { data: documents, isLoading } = useDocuments('PATCH_NOTE')
    const [uploadOpen, setUploadOpen] = useState(false)

    const { data: profile } = useQuery({
        queryKey: ['my-profile-patchnotes'],
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
                        <FileCode className="w-9 h-9 text-emerald-400" />
                        Patch Notes
                    </h1>
                    <p className="text-white/60 font-medium">
                        Historique des mises à jour et notes de version.
                    </p>
                </div>

                {canManage && (
                    <button
                        onClick={() => setUploadOpen(true)}
                        className="group relative px-6 py-3 rounded-2xl overflow-hidden transition-all shadow-xl border hover:scale-105 active:scale-95 shadow-emerald-500/20 border-emerald-400/30"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-center gap-2 text-white font-bold text-sm tracking-wide">
                            <Plus className="w-5 h-5" />
                            Publier un patch note
                        </div>
                    </button>
                )}
            </div>

            <DocumentGrid
                documents={documents}
                isLoading={isLoading}
                category="PATCH_NOTE"
                canManage={canManage}
            />

            <UploadDocumentModal
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                category="PATCH_NOTE"
            />
        </div>
    )
}
