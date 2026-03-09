'use client'

import React, { useState, useEffect } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const frenchTimezones = [
    { label: "MÉTROPOLE", tz: "Europe/Paris" },
    { label: "LA RÉUNION", tz: "Indian/Reunion" },
    { label: "MAYOTTE", tz: "Indian/Mayotte" },
    { label: "GUADELOUPE", tz: "America/Guadeloupe" },
    { label: "MARTINIQUE", tz: "America/Martinique" },
    { label: "GUYANE", tz: "America/Cayenne" },
    { label: "NLLE CALÉDONIE", tz: "Pacific/Noumea" },
    { label: "POLYNÉSIE", tz: "Pacific/Tahiti" }
];

export function WorldClock() {
    const [now, setNow] = useState<Date>(new Date())
    const [selectedTz, setSelectedTz] = useState<string>("Europe/Paris")
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem('basilisk-timezone')
        if (saved) setSelectedTz(saved)

        const interval = setInterval(() => {
            setNow(new Date())
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    const handleSelect = (tz: string) => {
        setSelectedTz(tz)
        localStorage.setItem('basilisk-timezone', tz)
    }

    if (!mounted) return null

    // Get time for the currently selected zone to show on the button or general area
    const currentTime = formatInTimeZone(now, selectedTz, 'HH:mm:ss')
    const currentLabel = frenchTimezones.find(t => t.tz === selectedTz)?.label || "MÉTROPOLE"

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 text-foreground/70 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/10 px-3">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium font-mono text-sm tracking-tight">{currentTime}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">• {currentLabel}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] md:w-[600px] p-8 border-white/10 rounded-3xl backdrop-blur-3xl shadow-2xl" align="end">
                <div className="space-y-8">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <div className="p-3 rounded-2xl bg-primary/10 mb-2">
                            <Globe className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/90">Global Time Zones</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {frenchTimezones.map((item) => {
                            const isSelected = selectedTz === item.tz
                            const time = formatInTimeZone(now, item.tz, 'HH:mm')

                            return (
                                <button
                                    key={item.tz}
                                    onClick={() => handleSelect(item.tz)}
                                    className={cn(
                                        "p-5 rounded-2xl bg-white/5 border border-white/10 transition-all text-left relative overflow-hidden group",
                                        isSelected
                                            ? "border-l-4 border-primary bg-primary/5 shadow-inner"
                                            : "hover:bg-white/10 hover:border-white/20"
                                    )}
                                >
                                    <div className={cn(
                                        "text-xs font-black uppercase tracking-tight mb-2",
                                        isSelected ? "text-primary" : "text-muted-foreground"
                                    )}>
                                        {item.label}
                                    </div>
                                    <div className="text-2xl font-bold tracking-tighter tabular-nums text-foreground">
                                        {time}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
