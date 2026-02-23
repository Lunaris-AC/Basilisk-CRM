import { useQuery } from '@tanstack/react-query'
import { getDocuments, Document } from './getDocuments'

export const useDocuments = (category: 'DOC' | 'PATCH_NOTE') => {
    return useQuery<Document[]>({
        queryKey: ['documents', category],
        queryFn: () => getDocuments(category),
        staleTime: 1000 * 60 * 2,
    })
}
