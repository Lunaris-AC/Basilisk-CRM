'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Server Action : Uploader un document vers le storage et insérer en base.
 */
export async function uploadDocumentAction(formData: FormData) {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return { error: 'Non authentifié.' }
    }

    // Vérifier le rôle
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, support_level')
        .eq('id', user.id)
        .single()

    if (!profile || !['ADMIN', 'DEV'].includes(profile.role)) {
        return { error: 'Permission refusée. Seuls les ADMIN et DEV peuvent uploader.' }
    }

    const title = formData.get('title') as string
    const category = formData.get('category') as string
    const file = formData.get('file') as File

    if (!title || !category || !file) {
        return { error: 'Titre, catégorie et fichier sont requis.' }
    }

    // Upload vers le storage
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${category.toLowerCase()}/${timestamp}_${safeName}`

    const { error: uploadError } = await supabase.storage
        .from('public_documents')
        .upload(storagePath, file)

    if (uploadError) {
        console.error('Upload error:', uploadError)
        return { error: 'Erreur lors de l\'upload du fichier.' }
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
        .from('public_documents')
        .getPublicUrl(storagePath)

    // Insérer en base
    const { error: insertError } = await supabase
        .from('documents')
        .insert({
            title,
            file_url: publicUrl,
            category,
            uploaded_by: user.id,
        })

    if (insertError) {
        console.error('Insert error:', insertError)
        return { error: 'Erreur lors de l\'enregistrement du document.' }
    }

    revalidatePath('/documentation')
    revalidatePath('/patch-notes')

    return { success: true }
}

/**
 * Server Action : Supprimer un document (fichier + base).
 */
export async function deleteDocumentAction(documentId: string) {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return { error: 'Non authentifié.' }
    }

    // Vérifier le rôle
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, support_level')
        .eq('id', user.id)
        .single()

    if (!profile || !['ADMIN', 'DEV'].includes(profile.role)) {
        return { error: 'Permission refusée.' }
    }

    // Récupérer l'URL pour supprimer du storage
    const { data: doc } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', documentId)
        .single()

    if (doc?.file_url) {
        const url = new URL(doc.file_url)
        const pathParts = url.pathname.split('/storage/v1/object/public/public_documents/')
        if (pathParts[1]) {
            await supabase.storage.from('public_documents').remove([decodeURIComponent(pathParts[1])])
        }
    }

    const { error } = await supabase.from('documents').delete().eq('id', documentId)

    if (error) {
        return { error: 'Erreur lors de la suppression.' }
    }

    revalidatePath('/documentation')
    revalidatePath('/patch-notes')

    return { success: true }
}
