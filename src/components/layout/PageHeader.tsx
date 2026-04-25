'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
    title: string
    subtitle?: string
    icon: LucideIcon
    iconColor?: string
    gradientFrom?: string
    gradientTo?: string
    rightElement?: React.ReactNode
    className?: string
}

export function PageHeader({
    title,
    subtitle,
    icon: Icon,
    iconColor = "text-primary",
    gradientFrom = "from-primary/20",
    gradientTo = "to-primary/10",
    rightElement,
    className
}: PageHeaderProps) {
    return (
        <div className={cn("relative mb-8", className)}>
            {/* Background Glows */}
            <div className={cn("absolute -top-6 -left-6 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-20 bg-primary")} />
            
            <div className="relative flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "p-3 bg-gradient-to-br border rounded-2xl shadow-lg",
                        gradientFrom, 
                        gradientTo,
                        "border-white/10"
                    )}>
                        <Icon className={cn("w-7 h-7", iconColor)} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
                        )}
                    </div>
                </div>
                {rightElement && (
                    <div className="flex items-center gap-3">
                        {rightElement}
                    </div>
                )}
            </div>
        </div>
    )
}
