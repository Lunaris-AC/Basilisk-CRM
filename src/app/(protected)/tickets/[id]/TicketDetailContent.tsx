'use client'

import { useTicket, useTicketComments, useTicketAuditLogs, useSupportLevels } from '@/features/tickets/api/useTickets'
import { useTicketAttachments } from '@/features/tickets/api/useTicketAttachments'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { addComment, updateTicketStatus, escalateTicket, uploadAttachments, linkContactToTicket, linkTicketToSD, resolveSD, assignTicketManually } from '@/features/tickets/actions'
import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Loader2, Lock, Paperclip, X, File, UploadCloud, UserCircle, Phone, Pencil, Link2, Code2, ExternalLink, Unlink, History, MessageSquare, Zap, UserCheck, ArrowRightLeft, Shield } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useOfflineStore } from '@/hooks/useOfflineStore'

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

    // SD Link modal
    const [sdLinkModalOpen, setSdLinkModalOpen] = useState(false)
    const [sdSearchTerm, setSdSearchTerm] = useState('')
    const [selectedSdId, setSelectedSdId] = useState<string | null>(null)

    // Resolve SD modal (Sprint 22)
    const [resolveSDModalOpen, setResolveSDModalOpen] = useState(false)
    const [resolveSDMessage, setResolveSDMessage] = useState('')
    const [resolveSDCloseLinked, setResolveSDCloseLinked] = useState(true)

    // Ref pour le champ commentaire (raccourci "C")
    const commentRef = useRef<HTMLTextAreaElement>(null)

    // Audit Logs (Sprint 22)
    const { data: auditLogs, isLoading: isLoadingAuditLogs } = useTicketAuditLogs(ticketId)

    // SPRINT 26.1 : Grades de support dynamiques
    const { data: supportLevels } = useSupportLevels()

    // Fetch open SD tickets for linking
    const { data: openSDs } = useQuery({
        queryKey: ['open-sds-for-link'],
        queryFn: async () => {
            const { createClient } = await import('@/utils/supabase/client')
            const supabase = createClient()
            const { data } = await supabase
                .from('tickets')
                .select('id, title, status, priority')
                .eq('category', 'DEV')
                .neq('status', 'ferme')
                .order('created_at', { ascending: false })
                .limit(50)
            return data || []
        },
        enabled: sdLinkModalOpen,
        staleTime: 30_000,
    })

    // Fetch linked SD ticket details (separate query — PostgREST can't self-join)
    const { data: linkedSD } = useQuery({
        queryKey: ['linked-sd', ticket?.linked_sd_id],
        queryFn: async () => {
            const { createClient } = await import('@/utils/supabase/client')
            const supabase = createClient()
            const { data } = await supabase
                .from('tickets')
                .select('id, title, status, priority')
                .eq('id', ticket!.linked_sd_id!)
                .single()
            return data
        },
        enabled: !!ticket?.linked_sd_id,
        staleTime: 30_000,
    })

    // Fetch HL tickets linked to this SD (if this is a DEV ticket)
    const { data: linkedHLTickets } = useQuery({
        queryKey: ['linked-hl-tickets', ticketId],
        queryFn: async () => {
            const { createClient } = await import('@/utils/supabase/client')
            const supabase = createClient()
            const { data } = await supabase
                .from('tickets')
                .select('id, title, status, priority, store:stores(name)')
                .eq('linked_sd_id', ticketId)
                .order('created_at', { ascending: false })
            return data || []
        },
        enabled: !!ticket && ticket.category === 'DEV',
        staleTime: 30_000,
    })

    // ═══ SPRINT 40 : RACCOURCIS CLAVIER POWER USER ═══
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Ne rien faire si l'utilisateur tape dans un input/textarea/select/contenteditable
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target as HTMLElement)?.isContentEditable) return
            // Ne rien faire si une modale est ouverte
            if (suspendModalOpen || closeModalOpen || escalateUpModalOpen || escalateDownModalOpen || reopenModalOpen || changeContactModalOpen || sdLinkModalOpen || resolveSDModalOpen) return

            if (e.key === 'a' || e.key === 'A') {
                // A : Assigner à moi-même
                e.preventDefault()
                if (ticket && !ticket.assignee) {
                    startTransition(async () => {
                        const res = await assignTicketManually(ticketId)
                        if (res.error) {
                            alert(res.error)
                        } else {
                            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
                        }
                    })
                }
            } else if (e.key === 'r' || e.key === 'R') {
                // R : Passer en Résolu
                e.preventDefault()
                if (ticket && ticket.status !== 'resolu' && ticket.status !== 'ferme') {
                    if (ticket.category === 'DEV') {
                        setResolveSDModalOpen(true)
                    } else {
                        handleChangeStatus('resolu')
                    }
                }
            } else if (e.key === 'c' || e.key === 'C') {
                // C : Focus sur le champ commentaire
                e.preventDefault()
                commentRef.current?.focus()
                commentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        }

        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [ticket, ticketId, suspendModalOpen, closeModalOpen, escalateUpModalOpen, escalateDownModalOpen, reopenModalOpen, changeContactModalOpen, sdLinkModalOpen, resolveSDModalOpen, queryClient, startTransition])

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
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!ticket) {
        return <div className="text-foreground text-center mt-10">Ticket introuvable.</div>
    }

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!commentContent.trim()) return

        // MODE CAVE : si offline, on queue et on fait un optimistic update
        if (!navigator.onLine) {
            const { createClient } = await import('@/utils/supabase/client')
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            useOfflineStore.getState().addToQueue({
                type: 'ADD_COMMENT',
                payload: { ticketId, content: commentContent, isInternal, authorId: user?.id ?? '' },
            })

            // Optimistic UI : on vide le champ et on notifie
            setCommentContent('')
            setIsInternal(false)
            toast.warning('📡 Réseau perdu. Commentaire sauvegardé en local et synchronisé au retour du réseau.', { duration: 5000 })
            return
        }

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
        // MODE CAVE : si offline, on queue et on fait un optimistic update
        if (!navigator.onLine) {
            useOfflineStore.getState().addToQueue({
                type: 'UPDATE_TICKET',
                payload: { ticketId, newStatus },
            })

            // Optimistic UI : invalider le cache pour forcer le re-render
            queryClient.setQueryData(['ticket', ticketId], (old: any) =>
                old ? { ...old, status: newStatus } : old
            )
            toast.warning('📡 Réseau perdu. Changement de statut sauvegardé en local et synchronisé au retour du réseau.', { duration: 5000 })
            return
        }

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

    // Sprint 22 : Résolution SD en cascade
    const handleResolveSD = async () => {
        if (!resolveSDMessage.trim()) return
        startTransition(async () => {
            const res = await resolveSD(ticketId, resolveSDMessage, resolveSDCloseLinked)
            if (res.error) {
                alert(res.error)
            } else {
                setResolveSDModalOpen(false)
                setResolveSDMessage('')
                setResolveSDCloseLinked(true)
                queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
                queryClient.invalidateQueries({ queryKey: ['ticketComments', ticketId] })
                queryClient.invalidateQueries({ queryKey: ['linked-hl-tickets', ticketId] })
                queryClient.invalidateQueries({ queryKey: ['ticketAuditLogs', ticketId] })
            }
        })
    }

    // Helpers pour l'audit log timeline
    const auditActionConfig: Record<string, { label: string, icon: React.ReactNode, color: string }> = {
        created: { label: 'Créé', icon: <Zap className="w-3 h-3" />, color: 'bg-sky-500' },
        status_changed: { label: 'Statut modifié', icon: <ArrowRightLeft className="w-3 h-3" />, color: 'bg-primary' },
        assigned: { label: 'Assigné', icon: <UserCheck className="w-3 h-3" />, color: 'bg-emerald-500' },
        escalated: { label: 'Escaladé', icon: <ArrowUpRight className="w-3 h-3" />, color: 'bg-rose-500' },
        resolved: { label: 'Résolu', icon: <CheckCircle2 className="w-3 h-3" />, color: 'bg-emerald-500' },
        resolved_cascade: { label: 'Résolu (cascade)', icon: <Shield className="w-3 h-3" />, color: 'bg-primary' },
        comment_added: { label: 'Commentaire', icon: <MessageSquare className="w-3 h-3" />, color: 'bg-white/30' },
        transferred: { label: 'Transféré', icon: <ArrowRightLeft className="w-3 h-3" />, color: 'bg-amber-500' },
        priority_changed: { label: 'Priorité modifiée', icon: <AlertTriangle className="w-3 h-3" />, color: 'bg-orange-500' },
    }

    const hlCount = (linkedHLTickets || []).filter((hl: any) => hl.status !== 'ferme' && hl.status !== 'resolu').length

    return (
        <div className="space-y-6 pb-10">
            {/* EN-TÊTE GLOBAL */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                            {ticket.title}
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
                            Ticket #{ticket.id.split('-')[0]} • Créé le {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <SlaTimer ticket={ticket} />
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-foreground/80 border border-white/10">
                        {ticket.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-foreground/80 border border-white/10">
                        PRIORITÉ {ticket.priority.toUpperCase()}
                    </span>
                    <span
                        className="px-3 py-1 rounded-full text-xs font-bold border transition-colors"
                        style={{
                            backgroundColor: ticket.support_level?.color ? `${ticket.support_level.color}20` : 'rgba(99, 102, 241, 0.2)',
                            color: ticket.support_level?.color || '#a5b4fc',
                            borderColor: ticket.support_level?.color ? `${ticket.support_level.color}40` : 'rgba(99, 102, 241, 0.3)'
                        }}
                    >
                        {ticket.support_level?.name?.toUpperCase() || `NIVEAU ${ticket.escalation_level}`}
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
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary/80 font-bold border border-primary/30">
                                {ticket.creator?.first_name?.[0]}{ticket.creator?.last_name?.[0]}
                            </div>
                            <div>
                                <p className="text-foreground font-medium">{ticket.creator?.first_name} {ticket.creator?.last_name}</p>
                                <p className="text-muted-foreground text-xs">Auteur du ticket</p>
                            </div>
                        </div>
                        <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
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

                    {/* ═══ SPRINT 21 : LIAISON HL ↔ SD ═══ */}

                    {/* Section pour tickets HL : afficher le SD lié ou bouton de liaison */}
                    {ticket.category !== 'DEV' && (
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl">
                            <h3 className="text-lg font-bold text-foreground tracking-wide flex items-center gap-2 mb-4">
                                <Code2 className="w-5 h-5 text-primary/80" />
                                Bug Logiciel Associé
                            </h3>
                            {ticket.linked_sd_id && linkedSD ? (() => {
                                const sd = linkedSD
                                const sColor: Record<string, string> = { nouveau: 'text-sky-300', assigne: 'text-primary/80', en_cours: 'text-amber-300', resolu: 'text-emerald-300', ferme: 'text-muted-foreground' }
                                return (
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
                                        <Link2 className="w-4 h-4 text-primary/80 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-foreground font-semibold text-sm truncate">{sd.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-bold uppercase ${sColor[sd.status] || 'text-muted-foreground'}`}>{sd.status}</span>
                                                <span className="text-foreground/20">·</span>
                                                <span className={`text-[10px] font-bold ${sd.priority === 'critique' ? 'text-rose-400' : sd.priority === 'haute' ? 'text-orange-400' : 'text-muted-foreground'}`}>{sd.priority}</span>
                                            </div>
                                        </div>
                                        <a href={`/tickets/${sd.id}`} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Ouvrir le SD">
                                            <ExternalLink className="w-4 h-4 text-primary/80" />
                                        </a>
                                        {myProfile?.role && !['CLIENT', 'COM', 'SAV1', 'SAV2'].includes(myProfile.role) && (
                                            <button
                                                onClick={() => startTransition(async () => {
                                                    await linkTicketToSD(ticket.id, null)
                                                    queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
                                                })}
                                                className="p-2 rounded-lg hover:bg-rose-500/10 transition-colors" title="Délier"
                                            >
                                                <Unlink className="w-4 h-4 text-rose-400" />
                                            </button>
                                        )}
                                    </div>
                                )
                            })() : (
                                <div>
                                    {myProfile?.role && !['CLIENT', 'COM', 'SAV1', 'SAV2'].includes(myProfile.role) && (
                                        <Dialog open={sdLinkModalOpen} onOpenChange={setSdLinkModalOpen}>
                                            <DialogTrigger asChild>
                                                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary/80 hover:bg-primary/20 transition-colors text-sm font-semibold">
                                                    <Link2 className="w-4 h-4" />
                                                    Lier à un SD
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-lg bg-[#0a0a1a] border border-white/10 text-foreground">
                                                <DialogHeader>
                                                    <DialogTitle>Lier à un Ticket SD</DialogTitle>
                                                    <DialogDescription className="text-muted-foreground">Sélectionnez un SD (Bug/Évolution) ouvert pour le rattacher à cet incident.</DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-3 py-2">
                                                    <Input
                                                        placeholder="Rechercher un SD…"
                                                        value={sdSearchTerm}
                                                        onChange={(e) => setSdSearchTerm(e.target.value)}
                                                        className="bg-white/5 border-white/10 text-foreground"
                                                    />
                                                    <div className="max-h-60 overflow-y-auto space-y-1">
                                                        {(openSDs || []).filter(sd => !sdSearchTerm || sd.title.toLowerCase().includes(sdSearchTerm.toLowerCase())).map((sd: any) => (
                                                            <button
                                                                key={sd.id}
                                                                onClick={() => setSelectedSdId(sd.id)}
                                                                className={`w-full text-left flex items-center gap-2 p-3 rounded-lg transition-colors ${selectedSdId === sd.id ? 'bg-primary/20 border border-primary/30' : 'bg-white/[0.02] hover:bg-white/[0.05] border border-transparent'}`}
                                                            >
                                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${sd.priority === 'critique' ? 'bg-rose-500/20 text-rose-300' : sd.priority === 'haute' ? 'bg-orange-500/20 text-orange-300' : 'bg-white/5 text-white/40'}`}>{sd.priority}</span>
                                                                <span className="text-foreground/70 text-xs truncate flex-1">{sd.title}</span>
                                                                <span className="text-foreground/20 text-[9px]">{sd.status}</span>
                                                            </button>
                                                        ))}
                                                        {(openSDs || []).length === 0 && <p className="text-center text-foreground/20 text-sm py-4">Aucun SD ouvert.</p>}
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <button
                                                        disabled={!selectedSdId || isPending}
                                                        onClick={() => startTransition(async () => {
                                                            if (selectedSdId) {
                                                                await linkTicketToSD(ticket.id, selectedSdId)
                                                                queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
                                                                setSdLinkModalOpen(false)
                                                                setSelectedSdId(null)
                                                                setSdSearchTerm('')
                                                            }
                                                        })}
                                                        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary disabled:opacity-50 disabled:pointer-events-none transition-colors"
                                                    >
                                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lier'}
                                                    </button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                    {(!myProfile?.role || ['CLIENT', 'COM', 'SAV1', 'SAV2'].includes(myProfile.role)) && (
                                        <p className="text-foreground/20 text-sm">Aucun bug logiciel associé.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Section pour tickets SD : afficher les incidents HL rattachés */}
                    {ticket.category === 'DEV' && (linkedHLTickets || []).length > 0 && (
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl">
                            <h3 className="text-lg font-bold text-foreground tracking-wide flex items-center gap-2 mb-4">
                                <Link2 className="w-5 h-5 text-cyan-400" />
                                Incidents (HL) Rattachés
                                <span className="ml-auto text-xs font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-lg">{(linkedHLTickets || []).length}</span>
                            </h3>
                            <div className="space-y-2">
                                {(linkedHLTickets || []).map((hl: any) => {
                                    const store = Array.isArray(hl.store) ? hl.store[0] : hl.store
                                    return (
                                        <a key={hl.id} href={`/tickets/${hl.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors group">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${hl.status === 'ferme' ? 'bg-white/5 text-white/30 border-white/10' : hl.status === 'resolu' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'}`}>{hl.status}</span>
                                            <span className="text-muted-foreground text-xs truncate flex-1">{hl.title}</span>
                                            {store?.name && <span className="text-foreground/20 text-[10px] shrink-0">{store.name}</span>}
                                            <ExternalLink className="w-3 h-3 text-foreground/20 group-hover:text-cyan-400 transition-colors shrink-0" />
                                        </a>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Pièces jointes du ticket */}
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl">
                        <h3 className="text-lg font-bold text-foreground tracking-wide flex items-center gap-2 mb-4">
                            <Paperclip className="w-5 h-5 text-primary/80" />
                            Pièces jointes
                        </h3>

                        {isLoadingAttachments ? (
                            <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
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
                                        <UploadCloud className="w-6 h-6 text-muted-foreground mb-2 group-hover:text-primary/80 transition-colors" />
                                        <p className="text-sm text-muted-foreground">Ajouter de nouvelles pièces jointes</p>
                                        <p className="text-xs text-muted-foreground mt-1">Glissez vos fichiers ou cliquez ici</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/30">
                                                <div className="truncate text-sm text-primary">{file.name}</div>
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
                                            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={handleUploadFiles}
                                            disabled={isUploading}
                                            className="px-4 py-2 text-sm font-bold bg-primary hover:bg-primary/20 text-primary-foreground rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                            Envoyer les fichiers
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══ SPRINT 22 : TABS Commentaires + Historique ═══ */}
                    <Tabs defaultValue="comments" className="w-full">
                        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
                            <TabsTrigger value="comments" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary/80 data-[state=active]:border-primary/30 rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground border border-transparent transition-all gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Commentaires & Chat
                            </TabsTrigger>
                            <TabsTrigger value="history" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary/80 data-[state=active]:border-primary/30 rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground border border-transparent transition-all gap-2">
                                <History className="w-4 h-4" />
                                Historique
                            </TabsTrigger>
                        </TabsList>

                        {/* Onglet Commentaires */}
                        <TabsContent value="comments" className="mt-4 space-y-4">
                            {/* Fil de discussion */}
                            <div className="space-y-4">
                                {isLoadingComments ? (
                                    <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                                ) : comments?.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground bg-white/5 rounded-2xl border border-white/10 border-dashed">
                                        Aucun commentaire pour le moment.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {comments?.map((comment) => (
                                            <div
                                                key={comment.id}
                                                className={`p-5 rounded-2xl border backdrop-blur-md shadow-lg transition-all ${comment.is_internal
                                                    ? 'bg-amber-500/5 border-amber-500/20'
                                                    : 'bg-white/5 border-white/10'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${comment.is_internal ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-white/10 text-white/70 border-white/20'
                                                            }`}>
                                                            {comment.author?.first_name?.[0]}{comment.author?.last_name?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground flex items-center gap-2">
                                                                {comment.author?.first_name} {comment.author?.last_name}
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded-md text-muted-foreground">{comment.author?.role}</span>
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
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
                                                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${comment.is_internal ? 'text-amber-100/90' : 'text-foreground/80'}`}>
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
                                    ref={commentRef}
                                    value={commentContent}
                                    onChange={(e) => setCommentContent(e.target.value)}
                                    placeholder="Écrivez votre réponse... (appuyez C pour focus)"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-foreground placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y min-h-[120px]"
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
                                                <CheckCircle2 className="w-3 h-3 text-foreground" />
                                            </div>
                                        </div>
                                        <span className={`text-sm font-medium transition-colors ${isInternal ? 'text-amber-400' : 'text-muted-foreground'}`}>
                                            Note interne privée
                                        </span>
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={isPending || !commentContent.trim()}
                                        className="px-6 py-2.5 bg-primary hover:bg-primary/20 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground text-sm font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                                    >
                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Envoyer
                                    </button>
                                </div>
                            </form>
                        </TabsContent>

                        {/* Onglet Historique (Audit Logs) */}
                        <TabsContent value="history" className="mt-4">
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl">
                                <h3 className="text-sm font-bold tracking-wider text-primary/80 uppercase flex items-center gap-2 mb-6">
                                    <History className="w-4 h-4" />
                                    Chronologie du ticket
                                </h3>

                                {isLoadingAuditLogs ? (
                                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                                ) : !auditLogs || auditLogs.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground border border-dashed border-white/10 rounded-xl">
                                        <History className="w-8 h-8 mx-auto mb-3 text-foreground/10" />
                                        Aucun événement enregistré pour ce ticket.
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {/* Ligne verticale */}
                                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/30 via-white/10 to-transparent" />

                                        <div className="space-y-4">
                                            {auditLogs.map((log) => {
                                                const config = auditActionConfig[log.action] || { label: log.action, icon: <Zap className="w-3 h-3" />, color: 'bg-white/20' }
                                                return (
                                                    <div key={log.id} className="flex items-start gap-4 group">
                                                        {/* Pastille */}
                                                        <div className={`relative z-10 w-6 h-6 rounded-full ${config.color} flex items-center justify-center text-foreground shadow-lg shrink-0 ring-4 ring-[#0a0a1a] group-hover:scale-110 transition-transform`}>
                                                            {config.icon}
                                                        </div>

                                                        {/* Contenu */}
                                                        <div className="flex-1 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-sm text-foreground/80 font-medium">
                                                                    {config.label}
                                                                    {log.user && (
                                                                        <span className="text-muted-foreground font-normal"> par {log.user.first_name} {log.user.last_name}</span>
                                                                    )}
                                                                </p>
                                                                <span className="text-[10px] text-foreground/20 shrink-0">
                                                                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
                                                                </span>
                                                            </div>
                                                            {log.details && Object.keys(log.details).length > 0 && (
                                                                <div className="mt-1.5 space-y-0.5">
                                                                    {log.details.from && log.details.to && (
                                                                        <p className="text-xs text-muted-foreground">
                                                                            <span className="text-foreground/20">{log.details.from}</span>
                                                                            <span className="mx-1.5">→</span>
                                                                            <span className="text-muted-foreground font-medium">{log.details.to}</span>
                                                                        </p>
                                                                    )}
                                                                    {log.details.message && (
                                                                        <p className="text-xs text-muted-foreground italic truncate">« {log.details.message} »</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* COLONNE DROITE (30%) : Infos & Actions */}
                <div className="space-y-6">

                    {/* Carte Infos */}
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl space-y-4">
                        <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Informations</h3>

                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Client</p>
                                <p className="text-sm font-medium text-foreground">{ticket.client?.company || 'Non renseigné'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Magasin</p>
                                <p className="text-sm font-medium text-foreground">{ticket.store?.name || 'Non renseigné'} <span className="text-muted-foreground truncate">({ticket.store?.city})</span></p>
                            </div>
                            {ticket.assignee && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Assigné à</p>
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
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl space-y-4 relative group overflow-hidden transition-all duration-300 hover:border-primary/30">
                        {/* Accent subtil */}
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />

                        <div className="flex items-center justify-between relative z-10">
                            <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
                                <UserCircle className="w-3.5 h-3.5 text-primary/80" />
                                Interlocuteur
                            </h3>
                            <button
                                onClick={() => setChangeContactModalOpen(true)}
                                disabled={isPending || ticket.status === 'ferme'}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors border border-white/5"
                                title="Modifier l'interlocuteur"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {ticket.contact ? (
                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary/80 border border-primary/30 group-hover:scale-105 transition-transform duration-300">
                                        {ticket.contact.first_name[0]}{ticket.contact.last_name[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground leading-tight">
                                            {ticket.contact.first_name} {ticket.contact.last_name}
                                        </p>
                                        {ticket.contact.job_title && (
                                            <p className="text-[11px] text-muted-foreground italic">{ticket.contact.job_title}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    {ticket.contact.phone && (
                                        <a
                                            href={`tel:${ticket.contact.phone}`}
                                            className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-primary/20 border border-white/5 hover:border-primary/30 text-foreground/80 transition-all group/link"
                                        >
                                            <Phone className="w-4 h-4 text-primary/80 group-hover/link:animate-bounce" />
                                            <span className="text-xs font-medium">{ticket.contact.phone}</span>
                                        </a>
                                    )}
                                    {ticket.contact.email && (
                                        <a
                                            href={`mailto:${ticket.contact.email}`}
                                            className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/30 text-foreground/80 transition-all group/link"
                                        >
                                            <Send className="w-4 h-4 text-emerald-400" />
                                            <span className="text-xs font-medium truncate">{ticket.contact.email}</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl border border-dashed border-white/10 text-center relative z-10 bg-black/20">
                                <p className="text-sm text-muted-foreground mb-3">Aucun interlocuteur défini.</p>
                                <button
                                    onClick={() => setChangeContactModalOpen(true)}
                                    disabled={isPending || ticket.status === 'ferme'}
                                    className="text-xs font-medium text-primary/80 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors"
                                >
                                    Relier un contact
                                </button>
                            </div>
                        )}

                        {/* Modale de changement d'interlocuteur */}
                        <Dialog open={changeContactModalOpen} onOpenChange={setChangeContactModalOpen}>
                            <DialogContent className="bg-primary border-white/10 text-foreground sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                                        <UserCircle className="w-5 h-5 text-primary/80" />
                                        Modifier l'interlocuteur
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground">
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
                                        className="px-4 py-2 rounded-xl text-foreground/70 hover:bg-white/10 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleChangeContactSubmit}
                                        disabled={!selectedNewContactId || isPending}
                                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/20 text-primary-foreground font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
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
                        <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Actions</h3>

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
                                    <DialogContent className="bg-primary border-white/10 text-foreground sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="text-xl font-bold text-fuchsia-300">Réactiver ce ticket</DialogTitle>
                                            <DialogDescription className="text-muted-foreground">
                                                Le ticket passera en statut "En cours". Vous devez justifier cette réouverture métier.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="reoJustif" className="text-sm font-medium text-foreground/80">Motif de réouverture (Requis)</Label>
                                                <Textarea
                                                    id="reoJustif"
                                                    placeholder="Pourquoi le problème est-il revenu ?"
                                                    value={actionJustification}
                                                    onChange={(e) => setActionJustification(e.target.value)}
                                                    className="bg-black/40 border-white/10 text-foreground focus:ring-fuchsia-500/50 min-h-[100px]"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <button
                                                onClick={() => setReopenModalOpen(false)}
                                                className="px-4 py-2 rounded-xl text-foreground/70 hover:bg-white/10 transition-colors"
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
                                        className="w-full bg-black/40 border border-white/10 text-foreground text-sm rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none disabled:opacity-50"
                                        value={ticket.status}
                                        onChange={(e) => {
                                            if (e.target.value === 'resolu' && ticket.category === 'DEV') {
                                                setResolveSDModalOpen(true)
                                            } else {
                                                handleChangeStatus(e.target.value)
                                            }
                                        }}
                                        disabled={isPending || ticket.status === 'resolu' || ticket.status === 'suspendu'}
                                    >
                                        <option value="nouveau" disabled={ticket.status !== 'nouveau'}>Nouveau</option>
                                        <option value="assigne">Assigné</option>
                                        <option value="en_cours">En cours</option>
                                        <option value="attente_client">En attente client</option>
                                        <option value="suspendu" disabled>Suspendu (Bouton⬇️)</option>
                                        <option value="resolu">Résolu</option>
                                    </select>

                                    {/* BOUTON RÉSOUDRE SD DÉDIÉ pour tickets DEV */}
                                    {ticket.category === 'DEV' && ticket.status !== 'resolu' && (
                                        <button
                                            onClick={() => setResolveSDModalOpen(true)}
                                            disabled={isPending}
                                            className="w-full relative group overflow-hidden rounded-xl p-3 border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Résoudre ce SD
                                            {hlCount > 0 && (
                                                <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-[10px] font-bold">
                                                    + {hlCount} HL
                                                </span>
                                            )}
                                        </button>
                                    )}

                                    {/* Modale Résolution SD en cascade (Sprint 22) */}
                                    <Dialog open={resolveSDModalOpen} onOpenChange={setResolveSDModalOpen}>
                                        <DialogContent className="bg-primary border-white/10 text-foreground sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle className="text-xl font-bold text-emerald-300 flex items-center gap-2">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    Résoudre ce SD
                                                </DialogTitle>
                                                <DialogDescription className="text-muted-foreground">
                                                    Marquez ce ticket SD comme résolu. Vous pouvez aussi clôturer automatiquement tous les incidents HL liés.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="resolveSdMsg" className="text-sm font-medium text-foreground/80">Message de résolution (Requis)</Label>
                                                    <Textarea
                                                        id="resolveSdMsg"
                                                        placeholder="Décrivez le correctif apporté…"
                                                        value={resolveSDMessage}
                                                        onChange={(e) => setResolveSDMessage(e.target.value)}
                                                        className="bg-black/40 border-white/10 text-foreground focus:ring-emerald-500/50 min-h-[100px]"
                                                    />
                                                </div>

                                                {hlCount > 0 && (
                                                    <label className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15 cursor-pointer group">
                                                        <div className="relative flex items-center justify-center w-5 h-5 mt-0.5 rounded border border-white/20 bg-black/20 group-hover:border-emerald-400/50 transition-colors shrink-0">
                                                            <input
                                                                type="checkbox"
                                                                className="peer sr-only"
                                                                checked={resolveSDCloseLinked}
                                                                onChange={(e) => setResolveSDCloseLinked(e.target.checked)}
                                                            />
                                                            <div className="absolute inset-0 bg-emerald-500 rounded opacity-0 peer-checked:opacity-100 transition-opacity flex items-center justify-center">
                                                                <CheckCircle2 className="w-3 h-3 text-foreground" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">
                                                                Clôturer automatiquement les <span className="text-emerald-400 font-bold">{hlCount}</span> ticket{hlCount > 1 ? 's' : ''} HL associé{hlCount > 1 ? 's' : ''}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                Un commentaire de résolution automatique sera ajouté dans chaque ticket HL.
                                                            </p>
                                                        </div>
                                                    </label>
                                                )}
                                            </div>
                                            <DialogFooter>
                                                <button
                                                    onClick={() => setResolveSDModalOpen(false)}
                                                    className="px-4 py-2 rounded-xl text-foreground/70 hover:bg-white/10 transition-colors"
                                                >
                                                    Annuler
                                                </button>
                                                <button
                                                    onClick={handleResolveSD}
                                                    disabled={!resolveSDMessage.trim() || isPending}
                                                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                                >
                                                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                                    Résoudre
                                                </button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

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
                                        <DialogContent className="bg-primary border-white/10 text-foreground sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle className="text-xl font-bold">Suspendre le ticket</DialogTitle>
                                                <DialogDescription className="text-muted-foreground">
                                                    Le ticket sera mis en pause jusqu'à la date indiquée.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium text-foreground/80">Date de reprise (Requis)</Label>
                                                    <DateTimePicker
                                                        value={resumeAtDate}
                                                        onChange={(val) => setResumeAtDate(val)}
                                                        placeholder="Choisir la date de reprise..."
                                                        minDate={new Date()}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="suspendJustif" className="text-sm font-medium text-foreground/80">Motif (Requis)</Label>
                                                    <Textarea
                                                        id="suspendJustif"
                                                        placeholder="Pourquoi ce ticket est-il suspendu ?"
                                                        value={actionJustification}
                                                        onChange={(e) => setActionJustification(e.target.value)}
                                                        className="bg-black/40 border-white/10 text-foreground focus:ring-amber-500/50 min-h-[100px]"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <button
                                                    onClick={() => setSuspendModalOpen(false)}
                                                    className="px-4 py-2 rounded-xl text-foreground/70 hover:bg-white/10 transition-colors"
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
                                        <DialogContent className="bg-primary border-white/10 text-foreground sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle className="text-xl font-bold">Clôturer le ticket</DialogTitle>
                                                <DialogDescription className="text-muted-foreground">
                                                    Ce message de clôture sera visible dans le fil de discussion.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="closeJustif" className="text-sm font-medium text-foreground/80">Message de clôture (Requis)</Label>
                                                    <Textarea
                                                        id="closeJustif"
                                                        placeholder="Comment le problème a-t-il été résolu ?"
                                                        value={actionJustification}
                                                        onChange={(e) => setActionJustification(e.target.value)}
                                                        className="bg-black/40 border-white/10 text-foreground focus:ring-emerald-500/50 min-h-[100px]"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <button
                                                    onClick={() => setCloseModalOpen(false)}
                                                    className="px-4 py-2 rounded-xl text-foreground/70 hover:bg-white/10 transition-colors"
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
                                                <DialogContent className="bg-primary border-white/10 text-foreground sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-xl font-bold text-rose-300 flex items-center gap-2"><ArrowUpRight className="w-5 h-5" />Escalader ce ticket</DialogTitle>
                                                        <DialogDescription className="text-muted-foreground">
                                                            Le ticket sera ré-assigné au grade supérieur. Expliquez pourquoi le niveau actuel ne peut pas le traiter.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="escUpJustif" className="text-sm font-medium text-foreground/80">Motif (Requis)</Label>
                                                            <Textarea
                                                                id="escUpJustif"
                                                                placeholder="Pourquoi escalader ?"
                                                                value={actionJustification}
                                                                onChange={(e) => setActionJustification(e.target.value)}
                                                                className="bg-black/40 border-white/10 text-foreground focus:ring-rose-500/50 min-h-[100px]"
                                                            />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <button
                                                            onClick={() => setEscalateUpModalOpen(false)}
                                                            className="px-4 py-2 rounded-xl text-foreground/70 hover:bg-white/10 transition-colors"
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
                                                        className="w-full rounded-xl p-3 border border-white/10 bg-white/5 hover:bg-white/10 text-foreground/70 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <ArrowDownRight className="w-4 h-4" />
                                                        Renvoyer (Niveau Inférieur)
                                                    </button>
                                                </DialogTrigger>
                                                <DialogContent className="bg-primary border-white/10 text-foreground sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-xl font-bold flex items-center gap-2"><ArrowDownRight className="w-5 h-5" />Renvoyer ce ticket</DialogTitle>
                                                        <DialogDescription className="text-muted-foreground">
                                                            Le ticket retournera au grade inférieur.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="escDownJustif" className="text-sm font-medium text-foreground/80">Motif (Requis)</Label>
                                                            <Textarea
                                                                id="escDownJustif"
                                                                placeholder="Pourquoi renvoyer ?"
                                                                value={actionJustification}
                                                                onChange={(e) => setActionJustification(e.target.value)}
                                                                className="bg-black/40 border-white/10 text-foreground focus:ring-white/50 min-h-[100px]"
                                                            />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <button
                                                            onClick={() => setEscalateDownModalOpen(false)}
                                                            className="px-4 py-2 rounded-xl text-foreground/70 hover:bg-white/10 transition-colors"
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
