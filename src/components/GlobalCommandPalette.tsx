'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
import { Monitor, Moon, Sun, MonitorSmartphone, LayoutDashboard, Settings, Plus, Hand, Ticket as TicketIcon, Search, BookOpen } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { useCommandStore } from "@/hooks/useCommandStore"
import { useTheme } from "next-themes"
import { createClient } from "@/utils/supabase/client"

const STATUS_COLORS: Record<string, string> = {
    nouveau: 'text-sky-300',
    assigne: 'text-indigo-300',
    en_cours: 'text-amber-300',
    attente_client: 'text-orange-300',
    resolu: 'text-emerald-300',
    ferme: 'text-white/30',
}

const PRIO_COLORS: Record<string, string> = {
    critique: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    haute: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    normale: 'bg-white/5 text-white/40 border-white/10',
    basse: 'bg-white/5 text-white/30 border-white/10',
}

export function GlobalCommandPalette() {
    const router = useRouter()
    const { isOpen, setOpen } = useCommandStore()
    const { setTheme } = useTheme()
    const [searchValue, setSearchValue] = React.useState('')

    // Lightweight ticket fetch for search (limit 200, cached 2 min)
    const { data: allTickets } = useQuery({
        queryKey: ['command-palette-tickets'],
        queryFn: async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('tickets')
                .select('id, title, status, priority, category')
                .neq('status', 'ferme')
                .order('created_at', { ascending: false })
                .limit(200)
            return data || []
        },
        enabled: isOpen,
        staleTime: 120_000,
    })

    // Wiki documents fetch (PUBLISHED only, cached 2 min)
    const { data: allWikiDocs } = useQuery({
        queryKey: ['command-palette-wiki'],
        queryFn: async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('wiki_documents')
                .select('id, title, icon')
                .eq('status', 'PUBLISHED')
                .order('updated_at', { ascending: false })
                .limit(100)
            return data || []
        },
        enabled: isOpen,
        staleTime: 120_000,
    })

    // Filter tickets by search value
    const filteredTickets = React.useMemo(() => {
        if (!searchValue.trim() || !allTickets) return []
        const q = searchValue.toLowerCase().trim()
        return allTickets
            .filter(t =>
                t.title.toLowerCase().includes(q) ||
                t.id.toLowerCase().startsWith(q) ||
                t.id.split('-')[0].toLowerCase().includes(q)
            )
            .slice(0, 8)
    }, [searchValue, allTickets])

    // Filter wiki docs by search value
    const filteredWikiDocs = React.useMemo(() => {
        if (!searchValue.trim() || !allWikiDocs) return []
        const q = searchValue.toLowerCase().trim()
        return allWikiDocs
            .filter(d => d.title.toLowerCase().includes(q))
            .slice(0, 6)
    }, [searchValue, allWikiDocs])

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen(true)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [setOpen])

    // Reset search when dialog closes
    React.useEffect(() => {
        if (!isOpen) setSearchValue('')
    }, [isOpen])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [setOpen])

    return (
        <CommandDialog open={isOpen} onOpenChange={setOpen}>
            <CommandInput
                placeholder="Rechercher un ticket, une commande..."
                value={searchValue}
                onValueChange={setSearchValue}
            />
            <CommandList>
                <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

                {/* TICKET SEARCH RESULTS */}
                {filteredTickets.length > 0 && (
                    <>
                        <CommandGroup heading="TICKETS TROUVÉS">
                            {filteredTickets.map(t => (
                                <CommandItem
                                    key={t.id}
                                    value={`ticket-${t.id}-${t.title}`}
                                    onSelect={() => runCommand(() => router.push(`/tickets/${t.id}`))}
                                    className="flex items-center gap-3"
                                >
                                    <TicketIcon className="w-4 h-4 text-primary/60 shrink-0" />
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${PRIO_COLORS[t.priority] || ''}`}>
                                        {t.priority}
                                    </span>
                                    <span className="truncate flex-1 text-foreground/80">{t.title}</span>
                                    <span className={`text-[10px] font-semibold shrink-0 ${STATUS_COLORS[t.status] || 'text-muted-foreground'}`}>
                                        {t.status.replace('_', ' ')}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                    </>
                )}

                {/* WIKI SEARCH RESULTS */}
                {filteredWikiDocs.length > 0 && (
                    <>
                        <CommandGroup heading="BASE DE CONNAISSANCES (WIKI)">
                            {filteredWikiDocs.map(d => (
                                <CommandItem
                                    key={d.id}
                                    value={`wiki-${d.id}-${d.title}`}
                                    keywords={[d.title, 'wiki', 'documentation', 'base de connaissances']}
                                    onSelect={() => runCommand(() => router.push(`/wiki?docId=${d.id}`))}
                                    className="flex items-center gap-3"
                                >
                                    <BookOpen className="w-4 h-4 text-violet-400/70 shrink-0" />
                                    <span className="text-sm shrink-0">{d.icon}</span>
                                    <span className="truncate flex-1 text-foreground/80">{d.title}</span>
                                    <span className="text-[10px] font-semibold text-violet-300/60 shrink-0">wiki</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                    </>
                )}

                <CommandGroup heading="NAVIGATION">
                    <CommandItem onSelect={() => runCommand(() => router.push('/dashboard'))}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Aller au Dashboard</span>
                        <CommandShortcut>G D</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push('/parc'))}>
                        <MonitorSmartphone className="mr-2 h-4 w-4" />
                        <span>Aller au Parc Matériel</span>
                        <CommandShortcut>G P</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push('/parametres'))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Aller aux Paramètres</span>
                        <CommandShortcut>G S</CommandShortcut>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="ACTIONS RAPIDES">
                    <CommandItem onSelect={() => runCommand(() => router.push('/tickets/nouveau'))}>
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Créer un nouveau ticket</span>
                    </CommandItem>
                    <CommandItem onSelect={() => {
                        runCommand(() => {
                            alert("Action Piocher un ticket déclenchée !")
                        })
                    }}>
                        <Hand className="mr-2 h-4 w-4" />
                        <span>Piocher un ticket</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="THÈMES">
                    <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Activer mode clair</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Activer mode sombre</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
                        <Monitor className="mr-2 h-4 w-4" />
                        <span>Activer mode système</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
