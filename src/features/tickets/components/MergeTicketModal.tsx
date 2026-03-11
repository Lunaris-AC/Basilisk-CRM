'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GitMerge, Search, Loader2, AlertTriangle } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { searchMergeCandidates, mergeTickets } from '@/features/tickets/actions'

// Debounce simple
function useDebounce(fn: (...args: any[]) => void, delay: number) {
    const timerRef = useState<ReturnType<typeof setTimeout> | null>(null)
    return useCallback((...args: any[]) => {
        if (timerRef[0]) clearTimeout(timerRef[0])
        timerRef[1](setTimeout(() => fn(...args), delay))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fn, delay])
}

interface CandidateTicket {
    id: string
    title: string
    status: string
    priority: string
    category: string | null
    created_at: string
}

interface MergeTicketModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Le ticket actuellement ouvert (celui qu'on veut garder = principal) */
    currentTicketId: string
    currentTicketTitle: string
}

const STATUS_LABELS: Record<string, string> = {
    nouveau: 'Nouveau',
    assigne: 'Assigné',
    en_cours: 'En cours',
    attente_client: 'Attente client',
    suspendu: 'Suspendu',
    resolu: 'Résolu',
    ferme: 'Fermé',
}

const PRIORITY_COLORS: Record<string, string> = {
    basse: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    moyenne: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    haute: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critique: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function MergeTicketModal({
    open,
    onOpenChange,
    currentTicketId,
    currentTicketTitle,
}: MergeTicketModalProps) {
    const queryClient = useQueryClient()

    const [query, setQuery] = useState('')
    const [candidates, setCandidates] = useState<CandidateTicket[]>([])
    const [searching, setSearching] = useState(false)
    const [selected, setSelected] = useState<CandidateTicket | null>(null)
    const [confirming, setConfirming] = useState(false)
    const [merging, setMerging] = useState(false)

    // Recherche avec debounce
    const doSearch = useCallback(async (term: string) => {
        if (term.trim().length < 2) {
            setCandidates([])
            setSearching(false)
            return
        }
        setSearching(true)
        const result = await searchMergeCandidates(currentTicketId, term)
        if ('tickets' in result) {
            setCandidates(result.tickets || [])
        }
        setSearching(false)
    }, [currentTicketId])

    const debouncedSearch = useDebounce(doSearch, 350)

    const handleQueryChange = (value: string) => {
        setQuery(value)
        setSelected(null)
        setConfirming(false)
        debouncedSearch(value)
    }

    const handleSelect = (ticket: CandidateTicket) => {
        setSelected(ticket)
        setConfirming(false)
    }

    const handleMerge = async () => {
        if (!selected) return
        setMerging(true)
        const result = await mergeTickets(currentTicketId, selected.id)
        setMerging(false)

        if (result.error) {
            toast.error(result.error)
            return
        }

        toast.success(result.message || 'Fusion effectuée')
        queryClient.invalidateQueries({ queryKey: ['ticket'] })
        queryClient.invalidateQueries({ queryKey: ['tickets'] })
        handleClose()
    }

    const handleClose = () => {
        setQuery('')
        setCandidates([])
        setSelected(null)
        setConfirming(false)
        setMerging(false)
        onOpenChange(false)
    }

    const shortId = (id: string) => id.slice(0, 8)

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitMerge className="h-5 w-5 text-purple-500" />
                        Fusionner un doublon
                    </DialogTitle>
                    <DialogDescription>
                        Le ticket actuel (<span className="font-medium">#{shortId(currentTicketId)}</span>) sera conservé comme ticket principal.
                        Recherchez le ticket doublon à fermer et fusionner.
                    </DialogDescription>
                </DialogHeader>

                {/* Barre de recherche */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par titre ou n° de ticket…"
                        value={query}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        className="pl-9"
                        autoFocus
                    />
                    {searching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                </div>

                {/* Liste des candidats */}
                {candidates.length > 0 && !selected && (
                    <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
                        {candidates.map((ticket) => (
                            <button
                                key={ticket.id}
                                onClick={() => handleSelect(ticket)}
                                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium truncate flex-1">
                                        {ticket.title}
                                    </span>
                                    <Badge variant="outline" className={PRIORITY_COLORS[ticket.priority] || ''}>
                                        {ticket.priority}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <span>#{shortId(ticket.id)}</span>
                                    <span>·</span>
                                    <span>{STATUS_LABELS[ticket.status] || ticket.status}</span>
                                    {ticket.category && (
                                        <>
                                            <span>·</span>
                                            <span>{ticket.category}</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Aucun résultat */}
                {query.trim().length >= 2 && candidates.length === 0 && !searching && !selected && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun ticket ouvert correspondant
                    </p>
                )}

                {/* Ticket sélectionné — récapitulatif */}
                {selected && (
                    <div className="border rounded-md p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold">{selected.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    #{shortId(selected.id)} · {STATUS_LABELS[selected.status] || selected.status}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setConfirming(false) }}>
                                Changer
                            </Button>
                        </div>

                        {!confirming ? (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm">
                                <div className="flex gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-medium text-amber-800 dark:text-amber-300">Récapitulatif de la fusion</p>
                                        <ul className="mt-1 text-amber-700 dark:text-amber-400 space-y-1">
                                            <li>• <strong>#{shortId(currentTicketId)}</strong> ({currentTicketTitle.slice(0, 40)}…) → reste ouvert <span className="text-green-600">(principal)</span></li>
                                            <li>• <strong>#{shortId(selected.id)}</strong> ({selected.title.slice(0, 40)}…) → sera fermé <span className="text-red-500">(doublon)</span></li>
                                        </ul>
                                        <p className="mt-2 text-xs">Un commentaire interne sera ajouté sur chaque ticket.</p>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={merging}>
                        Annuler
                    </Button>
                    {selected && !confirming && (
                        <Button
                            variant="default"
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() => setConfirming(true)}
                        >
                            Confirmer la fusion
                        </Button>
                    )}
                    {selected && confirming && (
                        <Button
                            variant="destructive"
                            onClick={handleMerge}
                            disabled={merging}
                        >
                            {merging ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Fusion en cours…
                                </>
                            ) : (
                                <>
                                    <GitMerge className="h-4 w-4 mr-2" />
                                    Fusionner définitivement
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
