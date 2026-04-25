'use client'

import { TicketStatus, TicketPriority, TicketWithRelations } from '@/features/tickets/api/getTickets'
import { Loader2, Plus, AlertCircle, Clock, CheckCircle2, MoreHorizontal, ArrowRight } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useRouter } from 'next/navigation'
import { SlaBadge } from '@/components/SlaBadge'

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'nouveau': return { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: Plus, label: 'Nouveau' }
        case 'assigne': return { color: 'bg-primary/10 text-primary/80 border-primary/20', icon: Clock, label: 'Assigné' }
        case 'en_cours': return { color: 'bg-primary/10 text-primary/80 border-primary/20', icon: Clock, label: 'En cours' }
        case 'attente_client': return { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: AlertCircle, label: 'Attente Client' }
        case 'resolu': return { color: 'bg-primary/10 text-primary/80 border-primary/20', icon: CheckCircle2, label: 'Résolu' }
        case 'ferme': return { color: 'bg-primary/10 text-primary/80 border-primary/20', icon: CheckCircle2, label: 'Fermé' }
        default: return { color: 'bg-primary/10 text-primary/80 border-primary/20', icon: MoreHorizontal, label: status }
    }
}

const getPriorityConfig = (priority: string) => {
    switch (priority) {
        case 'basse': return 'bg-primary/10 text-primary/80'
        case 'normale': return 'bg-primary/10 text-primary/80'
        case 'haute': return 'bg-orange-500/10 text-orange-400'
        case 'critique': return 'bg-red-500/10 text-red-500 animate-pulse'
        default: return 'bg-primary/10 text-primary/80'
    }
}

import { useState } from 'react'
import { assignTicketManually } from '@/features/tickets/actions'
import { useQueryClient } from '@tanstack/react-query'

interface TicketTableProps {
    tickets: TicketWithRelations[] | undefined
    isLoading: boolean
    error: Error | null
    showAssignButton?: boolean
    userRole?: string;
    userSupportLevel?: string;
}

export function TicketTable({ tickets, isLoading, error, showAssignButton = false, userRole, userSupportLevel }: TicketTableProps) {
    const [assigningId, setAssigningId] = useState<string | null>(null)
    const queryClient = useQueryClient()
    const router = useRouter()

    const handleAssignClick = async (ticketId: string) => {
        setAssigningId(ticketId)
        const res = await assignTicketManually(ticketId)
        if (res?.success) {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['myTickets'] }),
                queryClient.invalidateQueries({ queryKey: ['unassignedTickets'] })
            ])
            router.refresh()
        }
        setAssigningId(null)
    }
    if (isLoading) {
        return (
            <div className="h-64 w-full flex flex-col items-center justify-center space-y-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">Chargement des données...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 backdrop-blur-md">
                <h3 className="font-bold text-lg mb-2">Erreur de connexion</h3>
                <p>{error.message}</p>
            </div>
        )
    }

    if (!tickets?.length) {
        return (
            <div className="h-40 w-full flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <p className="text-muted-foreground font-medium tracking-wide">La file est vide. Aucun ticket à afficher.</p>
            </div>
        )
    }

    return (
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Titre</TableHead>
                        <TableHead className="hidden md:table-cell">Client</TableHead>
                        <TableHead className="hidden lg:table-cell">Niveau</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Priorité</TableHead>
                        <TableHead className="hidden md:table-cell">Assigné à</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">SLA / Temps</TableHead>
                        {showAssignButton && <TableHead className="w-[120px]"></TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tickets.map((ticket) => {
                        const status = getStatusConfig(ticket.status)
                        const StatusIcon = status.icon
                        const pColor = getPriorityConfig(ticket.priority)

                        return (
                            <TableRow
                                key={ticket.id}
                                className="cursor-pointer hover:bg-white/5 transition-colors group"
                                onClick={() => router.push(`/tickets/${ticket.id}`)}
                            >
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                    {ticket.id.substring(0, 6)}
                                </TableCell>
                                <TableCell className="font-semibold text-foreground max-w-[300px] truncate">
                                    {ticket.title}
                                </TableCell>
                                <TableCell className="text-foreground/80 hidden md:table-cell">
                                    {ticket.client?.company || 'Inconnu'}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    <span
                                        className="px-2 py-0.5 rounded text-[10px] font-bold border transition-all"
                                        style={ticket.support_level ? {
                                            backgroundColor: `${ticket.support_level.color}15`,
                                            borderColor: `${ticket.support_level.color}30`,
                                            color: ticket.support_level.color
                                        } : {}}
                                    >
                                        {ticket.support_level?.name || `Lvl ${ticket.escalation_level}`}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.color} items-center gap-1.5`}>
                                        <StatusIcon className="w-3 h-3" />
                                        <span className="hidden sm:inline">{status.label.toUpperCase()}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className={`inline-flex px-2 py-1 rounded-md text-[10px] uppercase font-black tracking-widest ${pColor}`}>
                                        {ticket.priority}
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    {ticket.assignee ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-foreground/80 border border-white/5">
                                                {ticket.assignee.first_name[0]}
                                            </div>
                                            <span className="text-xs text-foreground/80 font-medium whitespace-nowrap">
                                                {ticket.assignee.first_name} {ticket.assignee.last_name}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">Non assigné</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right hidden sm:table-cell">
                                    <div className="flex justify-end">
                                        <SlaBadge
                                            slaStartAt={ticket.sla_start_at}
                                            slaDeadlineAt={ticket.sla_deadline_at}
                                            slaPausedAt={ticket.sla_paused_at}
                                            slaElapsedMinutes={ticket.sla_elapsed_minutes}
                                            priority={ticket.priority}
                                            status={ticket.status}
                                            createdAt={ticket.created_at}
                                            updatedAt={(ticket as any).updated_at}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        {showAssignButton && (
                                            (userRole === 'ADMIN' || userRole === 'STANDARD' || (userRole === 'TECHNICIEN' && userSupportLevel === 'N4')) ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleAssignClick(ticket.id)
                                                    }}
                                                    disabled={assigningId === ticket.id}
                                                    className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/20 text-primary-foreground text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {assigningId === ticket.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                                    {ticket.assignee_id ? 'Réassigner' : "S'assigner"}
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground italic uppercase font-bold tracking-wider" title="Accès restreint aux Administrateurs, Standards et N4">
                                                    Restreint
                                                </span>
                                            )
                                        )}
                                        <button
                                            className="inline-flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-foreground transition-colors border border-white/10 group-hover:bg-white/10"
                                            title="Voir le ticket"
                                        >
                                            <ArrowRight className="w-4 h-4 text-foreground/70 group-hover:text-foreground transition-colors" />
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
