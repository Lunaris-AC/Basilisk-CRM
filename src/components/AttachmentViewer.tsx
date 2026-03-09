'use client'

import { useState } from 'react'
import { File, Image as ImageIcon, Video, FileText, Maximize2, ExternalLink } from 'lucide-react'
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { TicketAttachment } from '@/features/tickets/api/getTicketAttachments'

type AttachmentViewerProps = {
    attachments: TicketAttachment[];
}

export function AttachmentViewer({ attachments }: AttachmentViewerProps) {
    const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null)
    const [docPreviewTitle, setDocPreviewTitle] = useState<string | null>(null)

    if (!attachments || attachments.length === 0) {
        return <p className="text-sm text-muted-foreground italic mb-6">Aucune pièce jointe sur ce ticket.</p>
    }

    const isImage = (type: string) => type.startsWith('image/')
    const isVideo = (type: string) => type.startsWith('video/')
    const isDocument = (type: string, name: string) => {
        const lowerType = type.toLowerCase()
        const lowerName = name.toLowerCase()
        return lowerType.includes('pdf') ||
            lowerType.includes('msword') ||
            lowerType.includes('officedocument') ||
            lowerType.includes('sheet') ||
            lowerType.includes('csv') ||
            lowerType.includes('excel') ||
            lowerType.includes('powerpoint') ||
            lowerType.includes('presentation') ||
            lowerName.endsWith('.doc') ||
            lowerName.endsWith('.docx') ||
            lowerName.endsWith('.xls') ||
            lowerName.endsWith('.xlsx') ||
            lowerName.endsWith('.ppt') ||
            lowerName.endsWith('.pptx') ||
            lowerName.endsWith('.csv')
    }

    // URL encode for Microsoft Office Viewer
    const openDocPreview = (url: string, name: string) => {
        // Le viewer Office exige une URL publique absolue (Supabase storage.getPublicUrl() génère une absolue)
        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
        setDocPreviewUrl(viewerUrl)
        setDocPreviewTitle(name)
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {attachments.map((file) => {
                    const cleanName = file.file_name.replace(/^\d+_/, '') // Enlève le timestamp s'il y en a un

                    if (isImage(file.file_type)) {
                        return (
                            <div key={file.id} className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-video flex-shrink-0">
                                <Zoom>
                                    <img
                                        src={file.file_url}
                                        alt={cleanName}
                                        className="w-full h-full object-cover"
                                    />
                                </Zoom>
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pointer-events-none">
                                    <p className="text-xs font-semibold text-foreground truncate flex items-center gap-2">
                                        <ImageIcon className="w-3 h-3 text-primary/80" />
                                        {cleanName}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">{(file.file_size / 1024 / 1024).toFixed(2)} Mo</p>
                                </div>
                            </div>
                        )
                    }

                    if (isVideo(file.file_type)) {
                        return (
                            <div key={file.id} className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-video flex-shrink-0">
                                <video controls className="w-full h-full object-cover">
                                    <source src={file.file_url} type={file.file_type} />
                                    Votre navigateur ne supporte pas la lecture vidéo.
                                </video>
                                <div className="absolute top-0 left-0 bg-black/50 p-1.5 rounded-br-lg pointer-events-none">
                                    <Video className="w-4 h-4 text-rose-400" />
                                </div>
                            </div>
                        )
                    }

                    if (isDocument(file.file_type, cleanName) && !file.file_type.includes('pdf') && !cleanName.toLowerCase().endsWith('.pdf')) {
                        return (
                            <div key={file.id}
                                onClick={() => openDocPreview(file.file_url, cleanName)}
                                className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all cursor-pointer group"
                            >
                                <FileText className="w-10 h-10 text-emerald-400 p-2 bg-emerald-500/10 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform" />
                                <div className="truncate">
                                    <p className="text-sm font-medium text-foreground truncate">{cleanName}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">{(file.file_size / 1024 / 1024).toFixed(2)} Mo <Maximize2 className="w-3 h-3 inline ml-2" /> Aperçu</p>
                                </div>
                            </div>
                        )
                    }

                    // Fichier générique ou PDF (qui peut souvent s'ouvrir dans un nouvel onglet navigateur natif)
                    return (
                        <a
                            key={file.id}
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all group"
                        >
                            <File className="w-10 h-10 text-primary/80 p-2 bg-primary/10 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform" />
                            <div className="truncate">
                                <p className="text-sm font-medium text-foreground truncate">{cleanName}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">{(file.file_size / 1024 / 1024).toFixed(2)} Mo <ExternalLink className="w-3 h-3 inline ml-2" /> Ouvrir</p>
                            </div>
                        </a>
                    )
                })}
            </div>

            {/* Modal Iframe pour DOCX/XLSX */}
            <Dialog open={!!docPreviewUrl} onOpenChange={(open) => !open && setDocPreviewUrl(null)}>
                <DialogContent className="max-w-5xl h-[85vh] p-0 bg-white border-0 flex flex-col overflow-hidden">
                    <DialogHeader className="p-4 bg-zinc-900 border-b border-white/10 shrink-0">
                        <DialogTitle className="text-foreground flex items-center justify-between">
                            <span className="truncate">{docPreviewTitle}</span>
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs">
                            Aperçu généré via Microsoft Office Viewer
                        </DialogDescription>
                    </DialogHeader>
                    {/* Conteneur iframe qui prend tout l'espace restant */}
                    <div className="flex-1 w-full bg-zinc-100">
                        {docPreviewUrl && (
                            <iframe
                                src={docPreviewUrl}
                                className="w-full h-full border-0"
                                title="Aperçu du document"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
