'use client'

import { useTicket, useTicketComments } from '@/features/tickets/api/useTickets'
import { useTicketAttachments } from '@/features/tickets/api/useTicketAttachments'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { addComment, updateTicketStatus, escalateTicket, uploadAttachments, linkContactToTicket } from '@/features/tickets/actions'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Loader2, Lock, Paperclip, X, File, UploadCloud, UserCircle, Phone, Pencil } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AttachmentViewer } from '@/components/AttachmentViewer'
import { SlaTimer } from '@/components/SlaTimer'
import { SmartContactSelector } from '@/components/SmartContactSelector'
import { DateTimePicker } from '@/components/DateTimePicker'
import { CommerceDetailsCard, CommerceDetails } from '@/features/tickets/components/details/CommerceDetailsCard'
import { SAVDetailsCard, SAVDetails } from '@/features/tickets/components/details/SAVDetailsCard'
import { FormateurDetailsCard, FormateurDetails } from '@/features/tickets/components/details/FormateurDetailsCard'
import { DevDetailsCard, DevDetails } from '@/features/tickets/components/details/DevDetailsCard'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function TicketDetailContent({ ticketId }: { ticketId: string }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { data: ticket, isLoading: isLoadingTicket } = useTicket(ticketId)
    const { data: comments, isLoading: isLoadingComments } = useTicketComments(ticketId)
    const { data: attachments, isLoading: isLoadingAttachments } = useTicketAttachments(ticketId)
    const { data: myProfile } = useQuery({
        queryKey: ['my-profile-detail'],
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

    // Formulaires
    const [commentContent, setCommentContent] = useState('')
    const [isInternal, setIsInternal] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Upload
    const [selectedFiles, setSelectedFiles] = useState<globalThis.File[]>([])
    const [isUploading, setIsUploading] = useState(false)

    // Modales états
    const [suspendModalOpen, setSuspendModalOpen] = useState(false)
    const [closeModalOpen, setCloseModalOpen] = useState(false)
    const [escalateUpModalOpen, setEscalateUpModalOpen] = useState(false)
    const [escalateDownModalOpen, setEscalateDownModalOpen] = useState(false)
    const [reopenModalOpen, setReopenModalOpen] = useState(false)
    const [changeContactModalOpen, setChangeContactModalOpen] = useState(false)

    // Champs des modales
    const [actionJustification, setActionJustification] = useState('')
    const [resumeAtDate, setResumeAtDate] = useState('')
    const [selectedNewContactId, setSelectedNewContactId] = useState<string | null>(null)

    // Helpers pour reset les champs quand on ferme/ouvre une modale
    const resetModalForms = () => {
        setActionJustification('')
        setResumeAtDate('')
        setSelectedNewContactId(null)
    }

    const handleUploadFiles = async () => {
        if (selectedFiles.length === 0) return
        setIsUploading(true)

        const formData = new FormData()
        selectedFiles.forEach(file => {
            formData.append('attachments', file)
        })

        const res = await uploadAttachments(ticketId, formData)

        if (!res.error) {
            setSelectedFiles([])
            queryClient.invalidateQueries({ queryKey: ['ticket-attachments', ticketId] })
            queryClient.invalidateQueries({ queryKey: ['ticketComments', ticketId] })
        } else {
            alert(res.error)
        }
        setIsUploading(false)
    }

    if (isLoadingTicket) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-white/50" />
            </div>
        )
    }

    if (!ticket) {
        return <div className="text-white text-center mt-10">Ticket introuvable.</div>
    }

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!commentContent.trim()) return

        startTransition(async () => {
            const res = await addComment(ticketId, commentContent, isInternal)
            if (res.error) {
                alert(res.error)
            } else {
                setCommentContent('')
                setIsInternal(false)
                queryClient.invalidateQueries({ queryKey: ['ticketComments', ticketId] })
                queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
            }
        })
    }

    const handleChangeStatus = async (newStatus: string) => {
        startTransition(async () => {
            await updateTicketStatus(ticketId, newStatus)
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
        })
    }

    const handleSuspend = async () => {
        if (!actionJustification || !resumeAtDate) return
        startTransition(async () => {
            const { suspendTicket } = await import('@/features/tickets/actions')
            await suspendTicket(ticketId, resumeAtDate, actionJustification)
            setSuspendModalOpen(false)
            resetModalForms()
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
            queryClient.invalidateQueries({ queryKey: ['ticketComments', ticketId] })
        })
    }

    const handleClose = async () => {
        if (!actionJustification) return
        startTransition(async () => {
            const { closeTicket } = await import('@/features/tickets/actions')
            await closeTicket(ticketId, actionJustification)
            setCloseModalOpen(false)
            resetModalForms()
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
            queryClient.invalidateQueries({ queryKey: ['ticketComments', ticketId] })
        })
    }

    const handleEscalateSubmit = async (direction: 'up' | 'down') => {
        if (!actionJustification) return
        startTransition(async () => {
            await escalateTicket(ticketId, direction, ticket.escalation_level, actionJustification)
            if (direction === 'up') {
                setEscalateUpModalOpen(false)
                router.push('/dashboard')
            } else {
                setEscalateDownModalOpen(false)
                resetModalForms()
                queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
                queryClient.invalidateQueries({ queryKey: ['ticketComments', ticketId] })
            }
        })
    }

    const handleReopen = async () => {
        if (!actionJustification) return
        startTransition(async () => {
            const { reopenTicket } = await import('@/features/tickets/actions')
            await reopenTicket(ticketId, actionJustification)
            setReopenModalOpen(false)
            resetModalForms()
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
            queryClient.invalidateQueries({ queryKey: ['ticketComments', ticketId] })
        })
    }

    const handleChangeContactSubmit = async () => {
        if (!selectedNewContactId) return
        startTransition(async () => {
            const res = await linkContactToTicket(ticketId, selectedNewContactId)
            if (res.error) {
                alert(res.error)
            } else {
                setChangeContactModalOpen(false)
                setSelectedNewContactId(null)
                queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
            }
        })
    }

    return (
        <div className="space-y-6 pb-10">
            {/* EN-TÊTE GLOBAL */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                            {ticket.title}
                        </h1>
                        <p className="text-white/50 text-sm mt-1 flex items-center gap-2">
                            Ticket #{ticket.id.split('-')[0]} • Créé le {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <SlaTimer ticket={ticket} />
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white/80 border border-white/10">
                        {ticket.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white/80 border border-white/10">
                        PRIORITÉ {ticket.priority.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold border border-indigo-500/30">
                        NIVEAU {ticket.escalation_level}
                    </span>
                </div>
            </div>

            {/* GRILLE 70/30 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* COLONNE GAUCHE (70%) : Description & Fil de discussion */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Description Initiale */}
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30">
                                {ticket.creator?.first_name?.[0]}{ticket.creator?.last_name?.[0]}
                            </div>
                            <div>
                                <p className="text-white font-medium">{ticket.creator?.first_name} {ticket.creator?.last_name}</p>
                                <p className="text-white/40 text-xs">Auteur du ticket</p>
                            </div>
                        </div>
                        <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                            {ticket.description}
                        </p>
                    </div>

                    {/* VUES DÉTAILLÉES MULTI-SERVICES DYNAMIQUES */}
                    {ticket.category === 'COMMERCE' && (
                        <CommerceDetailsCard ticketId={ticket.id} details={ticket.commerce_details as CommerceDetails} isClosed={ticket.status === 'ferme'} />
                    )}
                    {ticket.category === 'SAV' && (
                        <SAVDetailsCard ticketId={ticket.id} details={ticket.sav_details as SAVDetails} isClosed={ticket.status === 'ferme'} />
                    )}
                    {ticket.category === 'FORMATION' && (
                        <FormateurDetailsCard ticketId={ticket.id} details={ticket.formateur_details as FormateurDetails} isClosed={ticket.status === 'ferme'} />
                    )}
                    {ticket.category === 'DEV' && (
                        <DevDetailsCard ticketId={ticket.id} details={ticket.dev_details as DevDetails} isClosed={ticket.status === 'ferme'} userRole={myProfile?.role} />
                    )}

                    {/* Pièces jointes du ticket */}
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl">
                        <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2 mb-4">
                            <Paperclip className="w-5 h-5 text-indigo-400" />
                            Pièces jointes
                        </h3>

                        {isLoadingAttachments ? (
                            <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
                        ) : (
                            <AttachmentViewer attachments={attachments || []} />
                        )}

                        {/* Zone d'ajout de fichiers */}
                        <div className="pt-4 border-t border-white/10">
                            {selectedFiles.length === 0 ? (
                                <div className="relative group cursor-pointer border border-dashed border-white/20 rounded-xl bg-black/20 hover:bg-white/5 transition-all">
                                    <input
                                        type="file"
                                        multiple
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)])
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        disabled={isPending || ticket.status === 'ferme' || isUploading}
                                    />
                                    <div className="flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                                        <UploadCloud className="w-6 h-6 text-white/40 mb-2 group-hover:text-indigo-400 transition-colors" />
                                        <p className="text-sm text-white/60">Ajouter de nouvelles pièces jointes</p>
                                        <p className="text-xs text-white/30 mt-1">Glissez vos fichiers ou cliquez ici</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                                                <div className="truncate text-sm text-indigo-200">{file.name}</div>
                                                <button
                                                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                                    className="p-1 text-rose-400 hover:bg-rose-500/20 rounded ml-2"
                                                    disabled={isUploading}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setSelectedFiles([])}
                                            disabled={isUploading}
                                            className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={handleUploadFiles}
                                            disabled={isUploading}
                                            className="px-4 py-2 text-sm font-bold bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                            Envoyer les fichiers
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fil de discussion */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white tracking-wide">Échanges</h3>

                        {isLoadingComments ? (
                            <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
                        ) : comments?.length === 0 ? (
                            <div className="p-8 text-center text-white/40 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                                Aucun commentaire pour le moment.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {comments?.map((comment) => (
                                    <div
                                        key={comment.id}
                                        className={`p-5 rounded-2xl border backdrop-blur-md shadow-lg transition-all ${comment.is_internal
                                            ? 'bg-amber-500/5 border-amber-500/20' // Style Note Interne
                                            : 'bg-white/5 border-white/10' // Style Normal
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${comment.is_internal ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-white/10 text-white/70 border-white/20'
                                                    }`}>
                                                    {comment.author?.first_name?.[0]}{comment.author?.last_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white flex items-center gap-2">
                                                        {comment.author?.first_name} {comment.author?.last_name}
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded-md text-white/50">{comment.author?.role}</span>
                                                    </p>
                                                    <p className="text-xs text-white/40">
                                                        il y a {formatDistanceToNow(new Date(comment.created_at), { addSuffix: false, locale: fr })}
                                                    </p>
                                                </div>
                                            </div>
                                            {comment.is_internal && (
                                                <div className="flex items-center gap-1.5 text-amber-400/80 bg-amber-400/10 px-2 py-1 rounded-md text-xs font-medium border border-amber-400/20">
                                                    <Lock className="w-3 h-3" /> Note interne
                                                </div>
                                            )}
                                        </div>
                                        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${comment.is_internal ? 'text-amber-100/90' : 'text-white/80'}`}>
                                            {comment.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Formulaire de réponse */}
                    <form onSubmit={handleSendComment} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl flex flex-col gap-3">
                        <textarea
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            placeholder="Écrivez votre réponse..."
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y min-h-[120px]"
                            disabled={isPending}
                        />
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative flex items-center justify-center w-5 h-5 rounded border border-white/20 bg-black/20 group-hover:border-amber-400/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={isInternal}
                                        onChange={(e) => setIsInternal(e.target.checked)}
                                        disabled={isPending}
                                    />
                                    <div className="absolute inset-0 bg-amber-500 rounded opacity-0 peer-checked:opacity-100 transition-opacity flex items-center justify-center">
                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                                <span className={`text-sm font-medium transition-colors ${isInternal ? 'text-amber-400' : 'text-white/50'}`}>
                                    Note interne privée
                                </span>
                            </label>

                            <button
                                type="submit"
                                disabled={isPending || !commentContent.trim()}
                                className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Envoyer
                            </button>
                        </div>
                    </form>
                </div>

                {/* COLONNE DROITE (30%) : Infos & Actions */}
                <div className="space-y-6">

                    {/* Carte Infos */}
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl space-y-4">
                        <h3 className="text-sm font-bold tracking-wider text-white/50 uppercase">Informations</h3>

                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-white/40 mb-1">Client</p>
                                <p className="text-sm font-medium text-white">{ticket.client?.company || 'Non renseigné'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-white/40 mb-1">Magasin</p>
                                <p className="text-sm font-medium text-white">{ticket.store?.name || 'Non renseigné'} <span className="text-white/30 truncate">({ticket.store?.city})</span></p>
                            </div>
                            {ticket.assignee && (
                                <div>
                                    <p className="text-xs text-white/40 mb-1">Assigné à</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400 font-bold border border-emerald-500/30">
                                            {ticket.assignee.first_name[0]}{ticket.assignee.last_name[0]}
                                        </div>
                                        <p className="text-sm text-emerald-400 font-medium">{ticket.assignee.first_name} {ticket.assignee.last_name}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Carte Interlocuteur */}
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl space-y-4 relative group overflow-hidden transition-all duration-300 hover:border-indigo-500/30">
                        {/* Accent subtil */}
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors" />

                        <div className="flex items-center justify-between relative z-10">
                            <h3 className="text-sm font-bold tracking-wider text-white/50 uppercase flex items-center gap-2">
                                <UserCircle className="w-3.5 h-3.5 text-indigo-400" />
                                Interlocuteur
                            </h3>
                            <button
                                onClick={() => setChangeContactModalOpen(true)}
                                disabled={isPending || ticket.status === 'ferme'}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/5"
                                title="Modifier l'interlocuteur"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {ticket.contact ? (
                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-300 border border-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
                                        {ticket.contact.first_name[0]}{ticket.contact.last_name[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white leading-tight">
                                            {ticket.contact.first_name} {ticket.contact.last_name}
                                        </p>
                                        {ticket.contact.job_title && (
                                            <p className="text-[11px] text-white/40 italic">{ticket.contact.job_title}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    {ticket.contact.phone && (
                                        <a
                                            href={`tel:${ticket.contact.phone}`}
                                            className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-indigo-500/20 border border-white/5 hover:border-indigo-500/30 text-white/80 transition-all group/link"
                                        >
                                            <Phone className="w-4 h-4 text-indigo-400 group-hover/link:animate-bounce" />
                                            <span className="text-xs font-medium">{ticket.contact.phone}</span>
                                        </a>
                                    )}
                                    {ticket.contact.email && (
                                        <a
                                            href={`mailto:${ticket.contact.email}`}
                                            className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/30 text-white/80 transition-all group/link"
                                        >
                                            <Send className="w-4 h-4 text-emerald-400" />
                                            <span className="text-xs font-medium truncate">{ticket.contact.email}</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl border border-dashed border-white/10 text-center relative z-10 bg-black/20">
                                <p className="text-sm text-white/40 mb-3">Aucun interlocuteur défini.</p>
                                <button
                                    onClick={() => setChangeContactModalOpen(true)}
                                    disabled={isPending || ticket.status === 'ferme'}
                                    className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                                >
                                    Relier un contact
                                </button>
                            </div>
                        )}

                        {/* Modale de changement d'interlocuteur */}
                        <Dialog open={changeContactModalOpen} onOpenChange={setChangeContactModalOpen}>
                            <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                                        <UserCircle className="w-5 h-5 text-indigo-400" />
                                        Modifier l'interlocuteur
                                    </DialogTitle>
                                    <DialogDescription className="text-white/60">
                                        Recherchez un contact existant par téléphone ou créez-en un nouveau.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <SmartContactSelector
                                        value={selectedNewContactId}
                                        onChange={(val) => setSelectedNewContactId(val)}
                                        clientId={ticket.client?.id}
                                        storeId={ticket.store?.id}
                                    />
                                </div>
                                <DialogFooter>
                                    <button
                                        onClick={() => setChangeContactModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleChangeContactSubmit}
                                        disabled={!selectedNewContactId || isPending}
                                        className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                    >
                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Mettre à jour
                                    </button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Carte Actions Métier (Dialogs) */}
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl space-y-6">
                        <h3 className="text-sm font-bold tracking-wider text-white/50 uppercase">Actions</h3>

                        <div className="space-y-3">
                            {ticket.status === 'ferme' ? (
                                /* TICKET EST FERMÉ : BOUTON RÉACTIVATION UNIQUEMENT */
                                <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
                                    <DialogTrigger asChild>
                                        <button
                                            disabled={isPending}
                                            className="w-full relative group overflow-hidden rounded-xl p-3 border border-fuchsia-500/50 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(217,70,239,0.3)] hover:shadow-[0_0_25px_rgba(217,70,239,0.5)]"
                                        >
                                            Réactiver le ticket
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="text-xl font-bold text-fuchsia-300">Réactiver ce ticket</DialogTitle>
                                            <DialogDescription className="text-white/60">
                                                Le ticket passera en statut "En cours". Vous devez justifier cette réouverture métier.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="reoJustif" className="text-sm font-medium text-white/80">Motif de réouverture (Requis)</Label>
                                                <Textarea
                                                    id="reoJustif"
                                                    placeholder="Pourquoi le problème est-il revenu ?"
                                                    value={actionJustification}
                                                    onChange={(e) => setActionJustification(e.target.value)}
                                                    className="bg-black/40 border-white/10 text-white focus:ring-fuchsia-500/50 min-h-[100px]"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <button
                                                onClick={() => setReopenModalOpen(false)}
                                                className="px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                onClick={handleReopen}
                                                disabled={!actionJustification.trim() || isPending}
                                                className="px-4 py-2 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                                Confirmer
                                            </button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            ) : (
                                /* TICKET NON FERMÉ : ACTIONS NORMALES */
                                <>
                                    {/* Statut Simple (Pour changer rapidement entre Assigné/En cours/Attente client sans justification) */}
                                    <select
                                        className="w-full bg-black/40 border border-white/10 text-white text-sm rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none disabled:opacity-50"
                                        value={ticket.status}
                                        onChange={(e) => handleChangeStatus(e.target.value)}
                                        disabled={isPending || ticket.status === 'resolu' || ticket.status === 'suspendu'}
                                    >
                                        <option value="nouveau" disabled={ticket.status !== 'nouveau'}>Nouveau</option>
                                        <option value="assigne">Assigné</option>
                                        <option value="en_cours">En cours</option>
                                        <option value="attente_client">En attente client</option>
                                        <option value="suspendu" disabled>Suspendu (Bouton⬇️)</option>
                                        <option value="resolu">Résolu</option>
                                    </select>

                                    <div className="h-px bg-white/10 w-full my-4" />

                                    {/* BOUTONS D'ACTIONS FORTES */}

                                    {/* SUSPENDRE */}
                                    <Dialog open={suspendModalOpen} onOpenChange={setSuspendModalOpen}>
                                        <DialogTrigger asChild>
                                            <button
                                                disabled={isPending || ticket.status === 'suspendu'}
                                                className="w-full rounded-xl p-3 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Suspendre
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle className="text-xl font-bold">Suspendre le ticket</DialogTitle>
                                                <DialogDescription className="text-white/60">
                                                    Le ticket sera mis en pause jusqu'à la date indiquée.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium text-white/80">Date de reprise (Requis)</Label>
                                                    <DateTimePicker
                                                        value={resumeAtDate}
                                                        onChange={(val) => setResumeAtDate(val)}
                                                        placeholder="Choisir la date de reprise..."
                                                        minDate={new Date()}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="suspendJustif" className="text-sm font-medium text-white/80">Motif (Requis)</Label>
                                                    <Textarea
                                                        id="suspendJustif"
                                                        placeholder="Pourquoi ce ticket est-il suspendu ?"
                                                        value={actionJustification}
                                                        onChange={(e) => setActionJustification(e.target.value)}
                                                        className="bg-black/40 border-white/10 text-white focus:ring-amber-500/50 min-h-[100px]"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <button
                                                    onClick={() => setSuspendModalOpen(false)}
                                                    className="px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
                                                >
                                                    Annuler
                                                </button>
                                                <button
                                                    onClick={handleSuspend}
                                                    disabled={!actionJustification.trim() || !resumeAtDate || isPending}
                                                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                                    Confirmer
                                                </button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    {/* CLÔTURER */}
                                    <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
                                        <DialogTrigger asChild>
                                            <button
                                                disabled={isPending}
                                                className="w-full rounded-xl p-3 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Clôturer
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle className="text-xl font-bold">Clôturer le ticket</DialogTitle>
                                                <DialogDescription className="text-white/60">
                                                    Ce message de clôture sera visible dans le fil de discussion.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="closeJustif" className="text-sm font-medium text-white/80">Message de clôture (Requis)</Label>
                                                    <Textarea
                                                        id="closeJustif"
                                                        placeholder="Comment le problème a-t-il été résolu ?"
                                                        value={actionJustification}
                                                        onChange={(e) => setActionJustification(e.target.value)}
                                                        className="bg-black/40 border-white/10 text-white focus:ring-emerald-500/50 min-h-[100px]"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <button
                                                    onClick={() => setCloseModalOpen(false)}
                                                    className="px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
                                                >
                                                    Annuler
                                                </button>
                                                <button
                                                    onClick={handleClose}
                                                    disabled={!actionJustification.trim() || isPending}
                                                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                                    Confirmer
                                                </button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    <div className="h-px bg-white/10 w-full my-4" />

                                    {/* ESCALADE - Visible seulement pour N1/N2/N3/N4/ADMIN */}
                                    {['N1', 'N2', 'N3', 'N4', 'ADMIN'].includes(myProfile?.role) && (
                                        <>
                                            {/* ESCALADER HAUT */}
                                            <Dialog open={escalateUpModalOpen} onOpenChange={setEscalateUpModalOpen}>
                                                <DialogTrigger asChild>
                                                    <button
                                                        disabled={isPending || ticket.escalation_level >= 4}
                                                        className="w-full relative group overflow-hidden rounded-xl p-3 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <ArrowUpRight className="w-4 h-4" />
                                                        Escalader (Niveau Supérieur)
                                                    </button>
                                                </DialogTrigger>
                                                <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-xl font-bold text-rose-300 flex items-center gap-2"><ArrowUpRight className="w-5 h-5" />Escalader ce ticket</DialogTitle>
                                                        <DialogDescription className="text-white/60">
                                                            Le ticket sera ré-assigné au niveau {Math.min(4, ticket.escalation_level + 1)}. Expliquez pourquoi le niveau actuel ne peut pas le traiter.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="escUpJustif" className="text-sm font-medium text-white/80">Motif (Requis)</Label>
                                                            <Textarea
                                                                id="escUpJustif"
                                                                placeholder="Pourquoi escalader ?"
                                                                value={actionJustification}
                                                                onChange={(e) => setActionJustification(e.target.value)}
                                                                className="bg-black/40 border-white/10 text-white focus:ring-rose-500/50 min-h-[100px]"
                                                            />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <button
                                                            onClick={() => setEscalateUpModalOpen(false)}
                                                            className="px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
                                                        >
                                                            Annuler
                                                        </button>
                                                        <button
                                                            onClick={() => handleEscalateSubmit('up')}
                                                            disabled={!actionJustification.trim() || isPending}
                                                            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                        >
                                                            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                                            Confirmer
                                                        </button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>

                                            {/* ESCALADER BAS */}
                                            <Dialog open={escalateDownModalOpen} onOpenChange={setEscalateDownModalOpen}>
                                                <DialogTrigger asChild>
                                                    <button
                                                        disabled={isPending || ticket.escalation_level <= 1}
                                                        className="w-full rounded-xl p-3 border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <ArrowDownRight className="w-4 h-4" />
                                                        Renvoyer (Niveau Inférieur)
                                                    </button>
                                                </DialogTrigger>
                                                <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-xl font-bold flex items-center gap-2"><ArrowDownRight className="w-5 h-5" />Renvoyer ce ticket</DialogTitle>
                                                        <DialogDescription className="text-white/60">
                                                            Le ticket retournera au niveau {Math.max(1, ticket.escalation_level - 1)}.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="escDownJustif" className="text-sm font-medium text-white/80">Motif (Requis)</Label>
                                                            <Textarea
                                                                id="escDownJustif"
                                                                placeholder="Pourquoi renvoyer ?"
                                                                value={actionJustification}
                                                                onChange={(e) => setActionJustification(e.target.value)}
                                                                className="bg-black/40 border-white/10 text-white focus:ring-white/50 min-h-[100px]"
                                                            />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <button
                                                            onClick={() => setEscalateDownModalOpen(false)}
                                                            className="px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
                                                        >
                                                            Annuler
                                                        </button>
                                                        <button
                                                            onClick={() => handleEscalateSubmit('down')}
                                                            disabled={!actionJustification.trim() || isPending}
                                                            className="px-4 py-2 rounded-xl bg-white hover:bg-white/90 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                        >
                                                            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                                            Confirmer
                                                        </button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </>
                                    )}
                                </>
                            )}

                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
