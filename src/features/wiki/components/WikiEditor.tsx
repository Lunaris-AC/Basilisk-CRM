'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import { useUpdateWikiDocument } from '@/features/wiki/api/useWiki'
import { uploadWikiImage } from '@/features/wiki/actions'
import { toast } from 'sonner'

interface WikiEditorProps {
    document: {
        id: string
        title: string
        icon: string
        content: any
        status: string
        author_id: string
    }
    canEdit: boolean
}

export function WikiEditor({ document, canEdit }: WikiEditorProps) {
    const updateDoc = useUpdateWikiDocument()
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Upload handler for images
    const handleUpload = useCallback(async (file: File): Promise<string> => {
        const formData = new FormData()
        formData.append('file', file)
        const result = await uploadWikiImage(formData)
        if ('error' in result) {
            toast.error(result.error)
            throw new Error(result.error)
        }
        return result.url!
    }, [])

    // Create the editor
    const editor = useCreateBlockNote({
        initialContent: document.content && Array.isArray(document.content) && document.content.length > 0
            ? document.content
            : undefined,
        uploadFile: handleUpload,
    })

    // Auto-save with debounce (800ms)
    const handleChange = useCallback(() => {
        if (!canEdit) return

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = setTimeout(() => {
            const blocks = editor.document
            updateDoc.mutate({
                id: document.id,
                content: blocks,
            })
        }, 800)
    }, [canEdit, document.id, editor, updateDoc])

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            {/* Titre éditable */}
            <TitleEditor
                documentId={document.id}
                initialTitle={document.title}
                initialIcon={document.icon}
                canEdit={canEdit}
            />

            {/* Éditeur de blocs */}
            <div className="mt-4 wiki-editor-wrapper">
                <BlockNoteView
                    editor={editor}
                    editable={canEdit}
                    onChange={handleChange}
                    theme="dark"
                />
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// Title + Icon editor
// ═══════════════════════════════════════════════════════════════

function TitleEditor({
    documentId,
    initialTitle,
    initialIcon,
    canEdit,
}: {
    documentId: string
    initialTitle: string
    initialIcon: string
    canEdit: boolean
}) {
    const updateDoc = useUpdateWikiDocument()
    const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const ICONS = ['📄', '📝', '📋', '📌', '📎', '📊', '📈', '🗂️', '💡', '🔧', '⚙️', '🚀', '🎯', '📦', '🔒', '🌐', '📡', '🖥️', '💻', '🛠️']

    const handleTitleChange = useCallback((value: string) => {
        if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
        titleTimeoutRef.current = setTimeout(() => {
            updateDoc.mutate({ id: documentId, title: value })
        }, 600)
    }, [documentId, updateDoc])

    const handleIconChange = useCallback((icon: string) => {
        updateDoc.mutate({ id: documentId, icon })
    }, [documentId, updateDoc])

    return (
        <div className="flex items-start gap-3">
            {/* Icon picker */}
            <div className="relative group">
                <button
                    className="text-4xl p-1 rounded-lg hover:bg-white/5 transition-colors"
                    disabled={!canEdit}
                >
                    {initialIcon}
                </button>
                {canEdit && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-background/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl grid grid-cols-5 gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50 w-52">
                        {ICONS.map(icon => (
                            <button
                                key={icon}
                                onClick={() => handleIconChange(icon)}
                                className="text-xl p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Title input */}
            <input
                type="text"
                defaultValue={initialTitle}
                onChange={e => handleTitleChange(e.target.value)}
                disabled={!canEdit}
                placeholder="Sans titre"
                className="flex-1 text-3xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 disabled:opacity-70"
            />
        </div>
    )
}
