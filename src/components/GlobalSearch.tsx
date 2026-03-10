'use client'

import { Search, Command as CommandIcon } from 'lucide-react'
import { useCommandStore } from '@/hooks/useCommandStore'

export function GlobalSearch() {
    const { setOpen } = useCommandStore()

    return (
        <button
            onClick={() => setOpen(true)}
            className="w-full max-w-md flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0a0a1a]/50 border border-white/5 hover:bg-[#0a0a1a]/80 hover:border-primary/30 text-muted-foreground hover:text-muted-foreground transition-all group shadow-sm"
        >
            <Search className="w-4 h-4 group-hover:text-primary/80 transition-colors" />
            <span className="text-sm font-medium flex-1 text-left">Rechercher une commande, aller à...</span>
            <kbd className="hidden sm:flex items-center gap-0.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-foreground/20 group-hover:text-muted-foreground transition-colors">
                <CommandIcon className="w-2.5 h-2.5" />K
            </kbd>
        </button>
    )
}
