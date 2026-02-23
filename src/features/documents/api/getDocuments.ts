import { createClient } from '@/utils/supabase/client'

export interface Document {
    id: string
    title: string
    file_url: string
    category: 'DOC' | 'PATCH_NOTE'
    uploaded_by: string
    created_at: string
    uploader?: {
        first_name: string
        last_name: string
    }
}

export const getDocuments = async (category: 'DOC' | 'PATCH_NOTE'): Promise<Document[]> => {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('documents')
        .select('id, title, file_url, category, uploaded_by, created_at')
        .eq('category', category)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    // Récupérer les profils des uploaders en batch
    const uploaderIds = [...new Set((data || []).map((d: any) => d.uploaded_by))]
    let profilesMap: Record<string, { first_name: string; last_name: string }> = {}

    if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', uploaderIds)

        if (profiles) {
            profilesMap = Object.fromEntries(profiles.map(p => [p.id, { first_name: p.first_name, last_name: p.last_name }]))
        }
    }

    return (data || []).map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        file_url: doc.file_url,
        category: doc.category,
        uploaded_by: doc.uploaded_by,
        created_at: doc.created_at,
        uploader: profilesMap[doc.uploaded_by] || null,
    }))
}

export const deleteDocument = async (id: string) => {
    const supabase = createClient()

    // Récupérer le doc pour supprimer aussi le fichier du storage
    const { data: doc } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', id)
        .single()

    if (doc?.file_url) {
        // Extraire le path du storage depuis l'URL
        const url = new URL(doc.file_url)
        const pathParts = url.pathname.split('/storage/v1/object/public/public_documents/')
        if (pathParts[1]) {
            await supabase.storage.from('public_documents').remove([decodeURIComponent(pathParts[1])])
        }
    }

    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) throw new Error(error.message)
}
