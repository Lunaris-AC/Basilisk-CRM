'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type WikiStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED'

export interface WikiDocument {
    id: string
    parent_id: string | null
    base_document_id: string | null
    title: string
    icon: string
    content: any
    status: WikiStatus
    author_id: string
    rejection_reason: string | null
    position: number
    created_at: string
    updated_at: string
    author?: { first_name: string; last_name: string; role: string }
    children?: WikiDocument[]
}

export interface WikiRevision {
    id: string
    document_id: string
    title: string
    content: any
    author_id: string
    created_at: string
    author?: { first_name: string; last_name: string }
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const REVIEWER_ROLES = ['N3', 'N4', 'ADMIN']
const BLOCKED_ROLE = 'CLIENT'

async function getAuthenticatedUserAndRole() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { error: 'Non authentifié.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profil introuvable.' }
    if (profile.role === BLOCKED_ROLE) return { error: 'Accès refusé.' }

    return { user, role: profile.role as string, supabase }
}

// ═══════════════════════════════════════════════════════════════
// CRUD : Documents
// ═══════════════════════════════════════════════════════════════

export async function getWikiTree() {
    const auth = await getAuthenticatedUserAndRole()
    if ('error' in auth) return { error: auth.error }
    const { supabase } = auth

    // RLS handles visibility based on status + role
    const { data, error } = await supabase
        .from('wiki_documents')
        .select('id, parent_id, title, icon, status, author_id, position, updated_at')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })

    if (error) return { error: error.message }
    return { data: data ?? [] }
}

export async function getWikiDocument(documentId: string) {
    const auth = await getAuthenticatedUserAndRole()
    if ('error' in auth) return { error: auth.error }
    const { supabase } = auth

    const { data, error } = await supabase
        .from('wiki_documents')
        .select('*, author:profiles!wiki_documents_author_id_fkey(first_name, last_name, role)')
        .eq('id', documentId)
        .single()

    if (error) return { error: error.message }
    return { data }
}

export async function createWikiDocument(input: {
    parentId?: string | null
    title?: string
    icon?: string
}) {
    const auth = await getAuthenticatedUserAndRole()
    if ('error' in auth) return { error: auth.error }
    const { user, supabase } = auth

    // Calculer la position (dernier enfant + 1)
    const { count } = await supabase
        .from('wiki_documents')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', input.parentId ?? null)

    const { data, error } = await supabase
        .from('wiki_documents')
        .insert({
            parent_id: input.parentId ?? null,
            title: input.title ?? 'Sans titre',
            icon: input.icon ?? '📄',
            content: [],
            status: 'DRAFT',
            author_id: user.id,
            position: (count ?? 0),
        })
        .select('id')
        .single()

    if (error) return { error: error.message }

    revalidatePath('/wiki')
    return { data }
}

export async function updateWikiDocument(
    documentId: string,
    updates: {
        title?: string
        icon?: string
        content?: any
        parent_id?: string | null
        position?: number
    }
) {
    const auth = await getAuthenticatedUserAndRole()
    if ('error' in auth) return { error: auth.error }
    const { supabase } = auth

    const { error } = await supabase
        .from('wiki_documents')
        .update(updates)
        .eq('id', documentId)

    if (error) return { error: error.message }

    revalidatePath('/wiki')
    return { success: true }
}

export async function deleteWikiDocument(documentId: string) {
    const auth = await getAuthenticatedUserAndRole()
    if ('error' in auth) return { error: auth.error }
    const { supabase } = auth

    const { error } = await supabase
        .from('wiki_documents')
        .delete()
        .eq('id', documentId)

    if (error) return { error: error.message }

    revalidatePath('/wiki')
    return { success: true }
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW : Validation
// ═══════════════════════════════════════════════════════════════

/** DRAFT → PENDING (Proposer la publication) */
export async function submitForReview(documentId: string) {
    const auth = await getAuthenticatedUserAndRole()
    if ('error' in auth) return { error: auth.error }
    const { user, supabase } = auth

    // Vérifier que le document est un DRAFT de l'auteur
    const { data: doc } = await supabase
        .from('wiki_documents')
        .select('status, author_id')
        .eq('id', documentId)
        .single()

    if (!doc) return { error: 'Document introuvable.' }
    if (doc.status !== 'DRAFT') return { error: 'Seuls les brouillons peuvent être soumis.' }
    if (doc.author_id !== user.id) return { error: 'Vous ne pouvez soumettre que vos propres brouillons.' }

    const { error } = await supabase
        .from('wiki_documents')
        .update({ status: 'PENDING', rejection_reason: null })
        .eq('id', documentId)

    if (error) return { error: error.message }

    revalidatePath('/wiki')
    return { success: true }
}

/** PENDING → PUBLISHED (Approuver) — N3/N4/ADMIN uniquement */
export async function approveDocument(documentId: string) {
    const auth = await getAuthenticatedUserAndRole()
    if ('error' in auth) return { error: auth.error }
    const { role, user, supabase } = auth

    if (!REVIEWER_ROLES.includes(role)) {
        return { error: 'Seuls les N3, N4 et ADMIN peuvent approuver.' }
    }

    const { data: doc } = await supabase
        .from('wiki_documents')
        .select('status, base_document_id, title, content, parent_id, icon, position, author_id')
        .eq('id', documentId)
        .single()

    if (!doc) return { error: 'Document introuvable.' }
    if (doc.status !== 'PENDING') return { error: 'Seuls les documents en attente peuvent être approuvés.' }

    // ─── CAS 1 : Suggestion de modification (base_document_id != null) ───
    // On fusionne le contenu dans le document original puis on SUPPRIME le brouillon zombie.
    if (doc.base_document_id) {
        // 1a. Mettre à jour le document original avec le contenu de la suggestion
        const { error: updateError } = await supabase
            .from('wiki_documents')
            .update({
                title: doc.title,
                content: doc.content,
                icon: doc.icon,
            })
            .eq('id', doc.base_document_id)

        if (updateError) return { error: updateError.message }

        // 1b. Créer manuellement la révision (le trigger trg_wiki_on_publish
        // ne se déclenche pas car le document base est déjà en PUBLISHED)
        await supabase.from('wiki_revisions').insert({
            document_id: doc.base_document_id,
            title: doc.title,
            content: doc.content,
            author_id: doc.author_id,
        })

        // 1c. LIGNE CRUCIALE : Supprimer définitivement le brouillon de proposition
        const { error: deleteError } = await supabase
            .from('wiki_documents')
            .delete()
            .eq('id', documentId)

        if (deleteError) return { error: `Fusion OK mais suppression échouée : ${deleteError.message}` }

        revalidatePath('/wiki')
        return { success: true, merged: true }
    }

    // ─── CAS 2 : Nouvelle page (base_document_id == null) ───
    // Publication directe, le trigger trg_wiki_on_publish créera la V1.
    const { error } = await supabase
        .from('wiki_documents')
        .update({ status: 'PUBLISHED', rejection_reason: null })
        .eq('id', documentId)

    if (error) return { error: error.message }

    revalidatePath('/wiki')
    return { success: true, merged: false }
}

/** PENDING → DRAFT (Rejeter) — N3/N4/ADMIN uniquement */
export async function rejectDocument(documentId: string, reason: string) {
    const auth = await getAuthenticatedUserAndRole()
    if ('error' in auth) return { error: auth.error }
    const { role, supabase } = auth

    if (!REVIEWER_ROLES.includes(role)) {
        return { error: 'Seuls les N3, N4 et ADMIN peuvent rejeter.' }
    }

    const { error } = await supabase
        .from('wiki_documents')
        .update({ status: 'DRAFT', rejection_reason: reason || 'Aucune raison spécifiée.' })
        .eq('id', documentId)

    if (error) return { error: error.message }

    revalidatePath('/wiki')
    return { success: true }
}

/** PUBLISHED → (Créer un brouillon de modification lié) */
export async function suggestEdit(documentId: string) {
    const auth = await getAuthenticatedUserAndRole()
    if ('error' in auth) return { error: auth.error }
    const { user, supabase } = auth

    // Récupérer le document publié
    const { data: doc } = await supabase
        .from('wiki_documents')
        .select('title, content, icon, parent_id')
        .eq('id', documentId)
        .single()

    if (!doc) return { error: 'Document introuvable.' }

    // Créer un DRAFT lié au base_document_id
    const { data: draft, error } = await supabase
        .from('wiki_documents')
        .insert({
            parent_id: doc.parent_id,
            base_document_id: documentId,
            title: doc.title,
            icon: doc.icon,
            content: doc.content,
            status: 'DRAFT',
            author_id: user.id,
            position: 0,
        })
        .select('id')
        .single()

    if (error) return { error: error.message }

    revalidatePath('/wiki')
    return { data: draft }
}

// ═══════════════════════════════════════════════════════════════
// REVISIONS : Historique
// ═══════════════════════════════════════════════════════════════

export async function getWikiRevisions(documentId: string) {
    const auth = await getAuthenticatedUserAndRole()
    if ('error' in auth) return { error: auth.error }
    const { supabase } = auth

    const { data, error } = await supabase
        .from('wiki_revisions')
        .select('*, author:profiles!wiki_revisions_author_id_fkey(first_name, last_name)')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) return { error: error.message }
    return { data: data ?? [] }
}

// ═══════════════════════════════════════════════════════════════
// IMAGES : Upload vers wiki-images bucket
// ═══════════════════════════════════════════════════════════════

export async function uploadWikiImage(formData: FormData) {
    const auth = await getAuthenticatedUserAndRole()
    if ('error' in auth) return { error: auth.error }
    const { supabase } = auth

    const file = formData.get('file') as File
    if (!file) return { error: 'Fichier requis.' }

    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${timestamp}_${safeName}`

    const { error: uploadError } = await supabase.storage
        .from('wiki-images')
        .upload(storagePath, file)

    if (uploadError) return { error: `Erreur upload : ${uploadError.message}` }

    const { data: { publicUrl } } = supabase.storage
        .from('wiki-images')
        .getPublicUrl(storagePath)

    return { url: publicUrl }
}

// ═══════════════════════════════════════════════════════════════
// PENDING DOCUMENTS : liste pour les reviewers
// ═══════════════════════════════════════════════════════════════

export async function getPendingDocuments() {
    const auth = await getAuthenticatedUserAndRole()
    if ('error' in auth) return { error: auth.error }
    const { role, supabase } = auth

    if (!REVIEWER_ROLES.includes(role)) {
        return { data: [] }
    }

    const { data, error } = await supabase
        .from('wiki_documents')
        .select('id, title, icon, status, author_id, base_document_id, created_at, updated_at, author:profiles!wiki_documents_author_id_fkey(first_name, last_name)')
        .eq('status', 'PENDING')
        .order('updated_at', { ascending: false })

    if (error) return { error: error.message }
    return { data: data ?? [] }
}
