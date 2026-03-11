import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getWikiTree,
    getWikiDocument,
    createWikiDocument,
    updateWikiDocument,
    deleteWikiDocument,
    submitForReview,
    approveDocument,
    rejectDocument,
    suggestEdit,
    getWikiRevisions,
    getPendingDocuments,
} from '../actions'

// ═══ Keys ═══
export const wikiKeys = {
    all: ['wiki'] as const,
    tree: () => [...wikiKeys.all, 'tree'] as const,
    document: (id: string) => [...wikiKeys.all, 'document', id] as const,
    revisions: (id: string) => [...wikiKeys.all, 'revisions', id] as const,
    pending: () => [...wikiKeys.all, 'pending'] as const,
}

// ═══ Queries ═══

export function useWikiTree() {
    return useQuery({
        queryKey: wikiKeys.tree(),
        queryFn: async () => {
            const result = await getWikiTree()
            if ('error' in result) throw new Error(result.error)
            return result.data!
        },
        staleTime: 1000 * 30,
    })
}

export function useWikiDocument(id: string | null) {
    return useQuery({
        queryKey: wikiKeys.document(id ?? ''),
        queryFn: async () => {
            if (!id) return null
            const result = await getWikiDocument(id)
            if ('error' in result) throw new Error(result.error)
            return result.data
        },
        enabled: !!id,
        staleTime: 1000 * 10,
    })
}

export function useWikiRevisions(documentId: string | null) {
    return useQuery({
        queryKey: wikiKeys.revisions(documentId ?? ''),
        queryFn: async () => {
            if (!documentId) return []
            const result = await getWikiRevisions(documentId)
            if ('error' in result) throw new Error(result.error)
            return result.data!
        },
        enabled: !!documentId,
    })
}

export function usePendingDocuments() {
    return useQuery({
        queryKey: wikiKeys.pending(),
        queryFn: async () => {
            const result = await getPendingDocuments()
            if ('error' in result) throw new Error(result.error)
            return result.data!
        },
        staleTime: 1000 * 30,
    })
}

// ═══ Mutations ═══

export function useCreateWikiDocument() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: { parentId?: string | null; title?: string; icon?: string }) =>
            createWikiDocument(input).then(r => {
                if ('error' in r) throw new Error(r.error)
                return r.data!
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: wikiKeys.tree() })
        },
    })
}

export function useUpdateWikiDocument() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...updates }: { id: string; title?: string; icon?: string; content?: any; parent_id?: string | null; position?: number }) =>
            updateWikiDocument(id, updates).then(r => {
                if ('error' in r) throw new Error(r.error)
                return r
            }),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: wikiKeys.document(variables.id) })
            qc.invalidateQueries({ queryKey: wikiKeys.tree() })
        },
    })
}

export function useDeleteWikiDocument() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) =>
            deleteWikiDocument(id).then(r => {
                if ('error' in r) throw new Error(r.error)
                return r
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: wikiKeys.tree() })
        },
    })
}

export function useSubmitForReview() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) =>
            submitForReview(id).then(r => {
                if ('error' in r) throw new Error(r.error)
                return r
            }),
        onSuccess: (_, id) => {
            qc.invalidateQueries({ queryKey: wikiKeys.document(id) })
            qc.invalidateQueries({ queryKey: wikiKeys.tree() })
            qc.invalidateQueries({ queryKey: wikiKeys.pending() })
        },
    })
}

export function useApproveDocument() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) =>
            approveDocument(id).then(r => {
                if ('error' in r) throw new Error(r.error)
                return r as { success: true; merged: boolean }
            }),
        onSuccess: () => {
            // Invalider tout le cache wiki : tree, pending, documents
            qc.invalidateQueries({ queryKey: wikiKeys.all })
        },
    })
}

export function useRejectDocument() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            rejectDocument(id, reason).then(r => {
                if ('error' in r) throw new Error(r.error)
                return r
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: wikiKeys.all })
        },
    })
}

export function useSuggestEdit() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) =>
            suggestEdit(id).then(r => {
                if ('error' in r) throw new Error(r.error)
                return r.data!
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: wikiKeys.tree() })
        },
    })
}
