'use client'

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Ticket, User, Loader2, Command as CommandIcon, ArrowRight, X } from 'lucide-react'
import { searchOmnibar } from '@/features/tickets/actions'

import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"

interface SearchResults {
    tickets: Array<{ id: string; title: string; status: string; priority: string; category: string }>
    contacts: Array<{ id: string; first_name: string; last_name: string; email: string; phone: string }>
}

export function GlobalSearch() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResults>({ tickets: [], contacts: [] })
    const [isPending, startTransition] = useTransition()
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Raccourci global Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setOpen(prev => !prev)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Focus sur l'input à l'ouverture
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100)
        } else {
            setQuery('')
            setResults({ tickets: [], contacts: [] })
            setSelectedIndex(0)
        }
    }, [open])

    // Recherche avec debounce
    const handleSearch = useCallback((value: string) => {
        setQuery(value)
        setSelectedIndex(0)

        if (debounceRef.current) clearTimeout(debounceRef.current)

        if (value.trim().length < 2) {
            setResults({ tickets: [], contacts: [] })
            return
        }

        debounceRef.current = setTimeout(() => {
            startTransition(async () => {
                const res = await searchOmnibar(value)
                setResults(res)
            })
        }, 250)
    }, [])

    // Navigation clavier dans les résultats
    const allItems = [
        ...results.tickets.map(t => ({ type: 'ticket' as const, data: t })),
        ...results.contacts.map(c => ({ type: 'contact' as const, data: c })),
    ]

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter' && allItems[selectedIndex]) {
            e.preventDefault()
            const item = allItems[selectedIndex]
            if (item.type === 'ticket') {
                router.push(`/tickets/${item.data.id}`)
            }
            setOpen(false)
        } else if (e.key === 'Escape') {
            setOpen(false)
        }
    }

    const statusColors: Record<string, string> = {
        nouveau: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        assigne: 'bg-primary/20 text-primary/80 border-primary/30',
        en_cours: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        attente_client: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        suspendu: 'bg-white/10 text-muted-foreground border-white/10',
        resolu: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        ferme: 'bg-white/5 text-foreground/25 border-white/5',
    }

    const categoryColors: Record<string, string> = {
        DEV: 'text-primary/80',
        COMMERCE: 'text-emerald-400',
        SAV: 'text-orange-400',
        FORMATION: 'text-cyan-400',
        HL: 'text-primary/80',
    }

    const hasResults = results.tickets.length > 0 || results.contacts.length > 0
    const showEmpty = query.trim().length >= 2 && !isPending && !hasResults

    return (
        <>
            {/* Bouton trigger "Google Style" élargi */}
            <button
                onClick={() => setOpen(true)}
                className="w-full max-w-md flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0a0a1a]/50 border border-white/5 hover:bg-[#0a0a1a]/80 hover:border-primary/30 text-muted-foreground hover:text-muted-foreground transition-all group shadow-sm"
            >
                <Search className="w-4 h-4 group-hover:text-primary/80 transition-colors" />
                <span className="text-sm font-medium flex-1 text-left">Rechercher un ticket, ID, contact…</span>
                <kbd className="hidden sm:flex items-center gap-0.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-foreground/20 group-hover:text-muted-foreground transition-colors">
                    <CommandIcon className="w-2.5 h-2.5" />K
                </kbd>
            </button>

            {/* Modale de recherche */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-2xl p-0 bg-[#0a0a1a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-primary/10 overflow-hidden [&>button]:hidden">
                    <DialogTitle className="sr-only">Recherche globale</DialogTitle>

                    {/* Input de recherche */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
                        {isPending ? (
                            <Loader2 className="w-5 h-5 text-primary/80 animate-spin shrink-0" />
                        ) : (
                            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => handleSearch(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Rechercher un ticket, un contact…"
                            className="flex-1 bg-transparent text-foreground text-base placeholder-white/30 focus:outline-none"
                            autoComplete="off"
                            spellCheck={false}
                        />
                        {query && (
                            <button onClick={() => handleSearch('')} className="p-1 rounded hover:bg-white/10 transition-colors">
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                        )}
                        <kbd className="flex items-center gap-0.5 px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-muted-foreground">
                            ESC
                        </kbd>
                    </div>

                    {/* Résultats */}
                    <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                        {/* Tickets */}
                        {results.tickets.length > 0 && (
                            <div className="px-3 py-2">
                                <p className="px-2 py-1.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                                    <Ticket className="w-3 h-3 inline mr-1.5" />
                                    Tickets
                                </p>
                                {results.tickets.map((ticket, idx) => {
                                    const globalIdx = idx
                                    return (
                                        <button
                                            key={ticket.id}
                                            onClick={() => {
                                                router.push(`/tickets/${ticket.id}`)
                                                setOpen(false)
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group/item ${selectedIndex === globalIdx
                                                ? 'bg-primary/15 border border-primary/30'
                                                : 'hover:bg-white/5 border border-transparent'
                                                }`}
                                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                                        >
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusColors[ticket.status] || 'bg-white/5 text-muted-foreground border-white/10'}`}>
                                                {ticket.status.replace('_', ' ')}
                                            </span>
                                            <span className="text-sm text-foreground/80 truncate flex-1">{ticket.title}</span>
                                            <span className={`text-[9px] font-bold ${categoryColors[ticket.category] || 'text-muted-foreground'}`}>
                                                {ticket.category}
                                            </span>
                                            <span className="text-foreground/15 text-[9px] font-mono">#{ticket.id.slice(0, 8)}</span>
                                            <ArrowRight className="w-3.5 h-3.5 text-foreground/0 group-hover/item:text-muted-foreground transition-colors" />
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* Contacts */}
                        {results.contacts.length > 0 && (
                            <div className="px-3 py-2">
                                <p className="px-2 py-1.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                                    <User className="w-3 h-3 inline mr-1.5" />
                                    Contacts
                                </p>
                                {results.contacts.map((contact, idx) => {
                                    const globalIdx = results.tickets.length + idx
                                    return (
                                        <div
                                            key={contact.id}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${selectedIndex === globalIdx
                                                ? 'bg-primary/15 border border-primary/30'
                                                : 'hover:bg-white/5 border border-transparent'
                                                }`}
                                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary/80 border border-primary/30 shrink-0">
                                                {contact.first_name?.[0]}{contact.last_name?.[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground/80 font-medium truncate">{contact.first_name} {contact.last_name}</p>
                                                <p className="text-[11px] text-muted-foreground truncate">{contact.email || contact.phone || 'Aucune info'}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* État vide */}
                        {showEmpty && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Search className="w-8 h-8 text-foreground/10 mb-3" />
                                <p className="text-sm text-muted-foreground">Aucun résultat pour <span className="text-muted-foreground font-medium">"{query}"</span></p>
                                <p className="text-xs text-foreground/15 mt-1">Essayez avec un autre terme de recherche</p>
                            </div>
                        )}

                        {/* Hint initial */}
                        {!hasResults && !showEmpty && query.trim().length < 2 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                                    <Search className="w-5 h-5 text-primary/60" />
                                </div>
                                <p className="text-sm text-muted-foreground">Tapez au moins 2 caractères pour lancer la recherche</p>
                                <p className="text-xs text-foreground/15 mt-1">Recherchez par titre de ticket, ID, ou nom de contact</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {hasResults && (
                        <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/5 text-[10px] text-foreground/20">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">↑↓</kbd> naviguer</span>
                                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">↵</kbd> ouvrir</span>
                                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">esc</kbd> fermer</span>
                            </div>
                            <span>{allItems.length} résultat{allItems.length > 1 ? 's' : ''}</span>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
