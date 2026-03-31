'use client'

import { useEffect, useState, useMemo } from 'react'
import { Clock, AlertCircle, PauseCircle, CheckCircle2, Timer } from 'lucide-react'
import { SLA_HOURS } from '@/features/tickets/sla'
import { cn } from '@/lib/utils'

// ============================================================
// SPRINT 48 + HOTFIX 48.1 : SlaBadge — Visualisation dynamique des SLA
// ============================================================

// Statuts DB exacts (minuscules, sans accents)
const STOP_STATUSES = ['resolu', 'ferme']
const PAUSE_STATUSES = ['attente_client', 'suspendu']
// Tout le reste est ACTIF : nouveau, assigne, en_cours, etc.

interface SlaBadgeProps {
    /** Date de début du SLA (sla_start_at) ou date de création */
    slaStartAt: string | null
    /** Deadline calculée par le backend */
    slaDeadlineAt: string | null
    /** Date de pause (attente_client) */
    slaPausedAt: string | null
    /** Minutes déjà écoulées (cumulées pendant les pauses) */
    slaElapsedMinutes: number | null
    /** Priorité du ticket (critique, haute, normale, basse) */
    priority: string
    /** Statut du ticket */
    status: string
    /** Date de création du ticket */
    createdAt: string
    /** Date de dernière mise à jour (résolution) */
    updatedAt?: string
}

/** Formatte une durée en minutes en texte lisible */
function formatDuration(totalMinutes: number): string {
    const absMinutes = Math.abs(Math.round(totalMinutes))
    if (absMinutes < 1) return '< 1m'
    if (absMinutes < 60) return `${absMinutes}m`
    const h = Math.floor(absMinutes / 60)
    const m = absMinutes % 60
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
}

export function SlaBadge({
    slaStartAt,
    slaDeadlineAt,
    slaPausedAt,
    slaElapsedMinutes,
    priority,
    status,
    createdAt,
    updatedAt,
}: SlaBadgeProps) {
    const [now, setNow] = useState(() => new Date())

    // Rafraîchir toutes les 60 secondes
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60_000)
        return () => clearInterval(timer)
    }, [])

    const slaLimitMinutes = (SLA_HOURS[priority] ?? 48) * 60

    return useMemo(() => {
        // Si aucune donnée SLA provenant du backend n'est présente, on ne tente pas 
        // de faire un fallback (qui serait faux et afficherait des chiffres aberrants comme +884h)
        if (!slaDeadlineAt) return null;

        const isStopped = STOP_STATUSES.includes(status)
        const isPaused = PAUSE_STATUSES.includes(status)
        const start = slaStartAt ? new Date(slaStartAt) : new Date(createdAt)

        // ═══════════════════════════════════════════════════
        // CAS 1 : Ticket résolu ou fermé → badge statique
        // ═══════════════════════════════════════════════════
        if (isStopped) {
            // Sans updatedAt, on ne peut pas savoir le temps exact écoulé pour un ticket résolu.
            // On se fie uniquement à updatedAt vs slaDeadlineAt pour savoir s'il est hors SLA.
            if (!updatedAt) return null;
            
            const resolvedTime = new Date(updatedAt).getTime()
            const deadlineTime = new Date(slaDeadlineAt).getTime()
            const wasBreached = resolvedTime > deadlineTime

            return (
                <div className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-sm whitespace-nowrap',
                    wasBreached
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400/70'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400/70'
                )}>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{wasBreached ? 'Résolu hors SLA' : 'SLA respecté'}</span>
                </div>
            )
        }

        // ═══════════════════════════════════════════════════
        // CAS 2 : SLA en pause (attente_client / suspendu)
        // ═══════════════════════════════════════════════════
        if (isPaused) {
            return (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400/70 text-[10px] font-bold backdrop-blur-sm whitespace-nowrap">
                    <PauseCircle className="w-3 h-3" />
                    <span>EN PAUSE</span>
                </div>
            )
        }

        // ═══════════════════════════════════════════════════
        // CAS 3 : Ticket actif → calcul dynamique
        // ═══════════════════════════════════════════════════
        if (slaDeadlineAt) {
            // Si on a une deadline backend, on s'en sert
            const deadline = new Date(slaDeadlineAt)
            const remainingMs = deadline.getTime() - now.getTime()
            const remainingMinutes = remainingMs / 60_000
            const ratio = remainingMinutes / slaLimitMinutes

            // SLA DÉPASSÉ
            if (remainingMinutes <= 0) {
                const overMinutes = Math.abs(remainingMinutes)
                return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-black animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.25)] backdrop-blur-md whitespace-nowrap">
                        <AlertCircle className="w-3 h-3" />
                        <span>+{formatDuration(overMinutes)}</span>
                    </div>
                )
            }

            // WARNING (< 50% restant)
            if (ratio < 0.5) {
                return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[10px] font-bold backdrop-blur-sm whitespace-nowrap">
                        <Timer className="w-3 h-3" />
                        <span>{formatDuration(remainingMinutes)}</span>
                    </div>
                )
            }

            // SAFE (> 50% restant)
            return (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold backdrop-blur-sm whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(remainingMinutes)}</span>
                </div>
            )
        }

        // ═══════════════════════════════════════════════════
        // CAS 4 : Pas de deadline backend → ne plus tenter de deviner 
        // ═══════════════════════════════════════════════════
        return null;
    }, [now, slaStartAt, slaDeadlineAt, slaPausedAt, slaElapsedMinutes, priority, status, createdAt, updatedAt, slaLimitMinutes])
}
