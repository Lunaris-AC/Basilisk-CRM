'use client'

import { useEffect, useState, useMemo } from 'react'
import { Clock, AlertCircle, PauseCircle, Timer } from 'lucide-react'
import { SLA_HOURS } from '@/features/tickets/sla'
import { cn } from '@/lib/utils'

// ============================================================
// SPRINT 51 : SlaBadge version XXL pour le Wallboard TV
// ============================================================

const PAUSE_STATUSES = ['attente_client', 'suspendu']

interface WallboardSlaBadgeProps {
    slaStartAt: string | null
    slaDeadlineAt: string | null
    slaPausedAt: string | null
    slaElapsedMinutes: number | null
    priority: string
    status: string
    createdAt: string
}

function formatDuration(totalMinutes: number): string {
    const absMinutes = Math.abs(Math.round(totalMinutes))
    if (absMinutes < 1) return '< 1m'
    if (absMinutes < 60) return `${absMinutes}m`
    const h = Math.floor(absMinutes / 60)
    const m = absMinutes % 60
    if (m === 0) return `${h}h`
    return `${h}h${m}m`
}

export function WallboardSlaBadge({
    slaStartAt,
    slaDeadlineAt,
    slaPausedAt,
    slaElapsedMinutes,
    priority,
    status,
    createdAt,
}: WallboardSlaBadgeProps) {
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30_000)
        return () => clearInterval(timer)
    }, [])

    const slaLimitMinutes = (SLA_HOURS[priority] ?? 48) * 60

    return useMemo(() => {
        const isPaused = PAUSE_STATUSES.includes(status)
        const start = slaStartAt ? new Date(slaStartAt) : new Date(createdAt)

        if (isPaused) {
            return (
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 text-amber-300 text-3xl font-black whitespace-nowrap">
                    <PauseCircle className="w-8 h-8" />
                    <span>EN PAUSE</span>
                </div>
            )
        }

        if (slaDeadlineAt) {
            const deadline = new Date(slaDeadlineAt)
            const remainingMs = deadline.getTime() - now.getTime()
            const remainingMinutes = remainingMs / 60_000
            const ratio = remainingMinutes / slaLimitMinutes

            if (remainingMinutes <= 0) {
                const overMinutes = Math.abs(remainingMinutes)
                return (
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-rose-500/30 border-2 border-rose-500/60 text-rose-300 text-3xl font-black animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.5)] whitespace-nowrap">
                        <AlertCircle className="w-8 h-8" />
                        <span>+{formatDuration(overMinutes)}</span>
                    </div>
                )
            }

            if (ratio < 0.5) {
                return (
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-orange-500/20 border-2 border-orange-500/40 text-orange-300 text-3xl font-black whitespace-nowrap">
                        <Timer className="w-8 h-8" />
                        <span>{formatDuration(remainingMinutes)}</span>
                    </div>
                )
            }

            return (
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-300 text-3xl font-black whitespace-nowrap">
                    <Clock className="w-8 h-8" />
                    <span>{formatDuration(remainingMinutes)}</span>
                </div>
            )
        }

        // Fallback sans deadline
        const elapsedMinutes = (now.getTime() - start.getTime()) / 60_000
        const remainingMinutes = slaLimitMinutes - elapsedMinutes
        const ratio = remainingMinutes / slaLimitMinutes

        if (remainingMinutes <= 0) {
            const overMinutes = Math.abs(remainingMinutes)
            return (
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-rose-500/30 border-2 border-rose-500/60 text-rose-300 text-3xl font-black animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.5)] whitespace-nowrap">
                    <AlertCircle className="w-8 h-8" />
                    <span>+{formatDuration(overMinutes)}</span>
                </div>
            )
        }

        if (ratio < 0.5) {
            return (
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-orange-500/20 border-2 border-orange-500/40 text-orange-300 text-3xl font-black whitespace-nowrap">
                    <Timer className="w-8 h-8" />
                    <span>{formatDuration(remainingMinutes)}</span>
                </div>
            )
        }

        return (
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-300 text-3xl font-black whitespace-nowrap">
                <Clock className="w-8 h-8" />
                <span>{formatDuration(remainingMinutes)}</span>
            </div>
        )
    }, [now, slaStartAt, slaDeadlineAt, slaPausedAt, slaElapsedMinutes, priority, status, createdAt, slaLimitMinutes])
}
