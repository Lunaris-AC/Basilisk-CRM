'use client'

import { useState, useTransition } from 'react'
import { UploadCloud, X, Loader2, FileUp } from 'lucide-react'
import { uploadDocumentAction } from '@/features/documents/actions'
import { useQueryClient } from '@tanstack/react-query'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UploadDocumentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    category: 'DOC' | 'PATCH_NOTE'
}

export function UploadDocumentModal({ open, onOpenChange, category }: UploadDocumentModalProps) {
    const [title, setTitle] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isPending, startTransition] = useTransition()
    const queryClient = useQueryClient()

    const resetForm = () => {
        setTitle('')
        setSelectedFile(null)
    }

    const handleSubmit = () => {
        if (!title.trim() || !selectedFile) return

        startTransition(async () => {
            const formData = new FormData()
            formData.append('title', title.trim())
            formData.append('category', category)
            formData.append('file', selectedFile)

            const res = await uploadDocumentAction(formData)

            if (res.error) {
                alert(res.error)
            } else {
                resetForm()
                onOpenChange(false)
                queryClient.invalidateQueries({ queryKey: ['documents', category] })
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); onOpenChange(val) }}>
            <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                        <FileUp className="w-5 h-5 text-primary/80" />
                        Uploader un document
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {category === 'DOC'
                            ? 'Ajoutez un fichier à la documentation interne.'
                            : 'Publiez une nouvelle note de patch.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Titre */}
                    <div className="space-y-2">
                        <Label htmlFor="docTitle" className="text-sm font-medium text-foreground/80">
                            Titre du document
                        </Label>
                        <Input
                            id="docTitle"
                            placeholder="Ex: Guide d'utilisation v3.2"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-black/40 border-white/10 text-foreground focus:ring-primary/50"
                            disabled={isPending}
                        />
                    </div>

                    {/* Zone upload fichier */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground/80">Fichier</Label>
                        {!selectedFile ? (
                            <div className="relative group cursor-pointer border border-dashed border-white/20 rounded-xl bg-black/20 hover:bg-white/5 transition-all">
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md,.zip"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            setSelectedFile(e.target.files[0])
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    disabled={isPending}
                                />
                                <div className="flex flex-col items-center justify-center p-8 text-center pointer-events-none">
                                    <UploadCloud className="w-8 h-8 text-muted-foreground mb-2 group-hover:text-primary/80 transition-colors" />
                                    <p className="text-sm text-muted-foreground">Cliquez ou glissez votre fichier ici</p>
                                    <p className="text-xs text-muted-foreground mt-1">PDF, Excel, Word, ZIP...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/30">
                                <div className="flex items-center gap-3 min-w-0">
                                    <FileUp className="w-5 h-5 text-primary/80 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm text-primary font-medium truncate">{selectedFile.name}</p>
                                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedFile(null)}
                                    className="p-1 text-rose-400 hover:bg-rose-500/20 rounded ml-2 shrink-0"
                                    disabled={isPending}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <button
                        onClick={() => { resetForm(); onOpenChange(false) }}
                        className="px-4 py-2 rounded-xl text-foreground/70 hover:bg-white/10 transition-colors"
                        disabled={isPending}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!title.trim() || !selectedFile || isPending}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/20 text-primary-foreground font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                        Uploader
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
