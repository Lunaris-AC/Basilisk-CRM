'use client'

import React from 'react'
import Link from 'next/navigation'
import { PlusCircle, Database, Megaphone, Settings, Users } from 'lucide-react'

export function ShortcutsWidget() {
    const shortcuts = [
        { icon: <PlusCircle className="w-6 h-6" />, label: "Nouveau Ticket", bg: "bg-emerald-500/20", color: "text-emerald-400" },
        { icon: <Database className="w-6 h-6" />, label: "CMDB", bg: "bg-primary/20", color: "text-primary/80" },
        { icon: <Users className="w-6 h-6" />, label: "Clients", bg: "bg-sky-500/20", color: "text-sky-400" },
        { icon: <Megaphone className="w-6 h-6" />, label: "Commercial", bg: "bg-amber-500/20", color: "text-amber-400" },
        { icon: <Settings className="w-6 h-6" />, label: "Paramètres", bg: "bg-white/10", color: "text-muted-foreground" },
    ]

    return (
        <div className="h-full flex flex-col justify-center">
            <div className="grid grid-cols-2 gap-4">
                {shortcuts.map((s, i) => (
                    <div
                        key={i}
                        className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center gap-4"
                    >
                        <div className={`p-3 rounded-xl ${s.bg} ${s.color} transition-transform group-hover:scale-110`}>
                            {s.icon}
                        </div>
                        <span className="text-sm font-bold text-foreground tracking-wide">{s.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
