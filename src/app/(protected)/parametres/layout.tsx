'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Palette, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    {
        title: 'Profil',
        href: '/parametres/profil',
        icon: User
    },
    {
        title: 'Apparence',
        href: '/parametres/apparence',
        icon: Palette
    },
    {
        title: 'Affichage',
        href: '/parametres/affichage',
        icon: Monitor
    }
]

export default function ParametresLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight">Paramètres du Système</h1>
                <p className="text-muted-foreground mt-2">Configurez votre environnement de travail Basilisk.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Navigation latérale locale */}
                <aside className="w-full lg:w-64 flex-shrink-0">
                    <nav className="flex lg:flex-col gap-2 p-1 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.title}
                                </Link>
                            )
                        })}
                    </nav>
                </aside>

                {/* Contenu principal */}
                <main className="flex-1 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    )
}
