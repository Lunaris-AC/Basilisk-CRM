"use client";

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useDisplayStore } from '@/hooks/useDisplayStore'
import { CustomGridDashboard } from '@/features/dashboard/components/CustomGridDashboard'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ClientDisplayManagerProps {
    children: React.ReactNode
}

export function ClientDisplayManager({ children }: ClientDisplayManagerProps) {
    const [isMounted, setIsMounted] = useState(false)
    const mode = useDisplayStore((state) => state.mode)
    const pathname = usePathname()

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return <>{children}</>
    }

    // GRID Mode logic for dashboard
    if (mode === 'GRID' && pathname === '/dashboard') {
        return <CustomGridDashboard />
    }

    // TABS Mode logic
    if (mode === 'TABS') {
        const tabs = [
            { name: 'Dashboard', href: '/dashboard' },
            { name: 'Incidents', href: '/incidents' },
            { name: 'Équipements', href: '/cmdb' },
            { name: 'Tickets', href: '/tickets' },
            { name: 'Commerce', href: '/commerce' },
        ]

        return (
            <div className="flex flex-col h-full w-full">
                <nav className="flex items-center gap-1 p-1 bg-white/5 border-b border-white/10 backdrop-blur-md sticky top-0 z-30">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.href
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                )}
                            >
                                {tab.name}
                            </Link>
                        )
                    })}
                </nav>
                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </div>
        )
    }

    // Default or FOCUS mode
    return <>{children}</>
}
