'use client'

import { useState, useTransition } from 'react'
import { Bug, Sparkles, Code2, Footprints, AlertTriangle, FileText, Lightbulb, Loader2 } from 'lucide-react'
import { updateDevDetails } from '@/features/tickets/actions'

export interface DevDetails {
    type: 'BUG' | 'EVOLUTION'
    reproduction_steps?: string | null
    impact?: string | null
    need_description?: string | null
    expected_process?: string | null
    complexity?: string | null
}

const COMPLEXITY_OPTIONS = [
    { value: '', label: 'Non qualifié', color: 'text-white/40' },
    { value: 'HOTFIX', label: '🔥 Hotfix', color: 'text-rose-400' },
    { value: 'S', label: 'S', color: 'text-emerald-400' },
    { value: 'M', label: 'M', color: 'text-sky-400' },
    { value: 'L', label: 'L', color: 'text-amber-400' },
    { value: 'XL', label: 'XL', color: 'text-orange-400' },
    { value: 'MAJEUR', label: '⚡ Majeur', color: 'text-purple-400' },
]

export function DevDetailsCard({
    ticketId,
    details,
    isClosed,
    userRole,
}: {
    ticketId: string
    details?: DevDetails | null
    isClosed?: boolean
    userRole?: string
}) {
    const [isPending, startTransition] = useTransition()
    const [complexity, setComplexity] = useState(details?.complexity || '')

    const isDev = userRole === 'DEV' || userRole === 'ADMIN'
    const isBug = details?.type === 'BUG'

    const handleComplexityChange = (value: string) => {
        setComplexity(value)
        startTransition(async () => {
            const res = await updateDevDetails(ticketId, { complexity: value })
            if (res.error) {
                alert(res.error)
                setComplexity(details?.complexity || '')
            }
        })
    }

    const accentColor = isBug ? 'rose' : 'violet'
    const accentGradient = isBug
        ? 'from-rose-500/20 to-orange-500/20'
        : 'from-violet-500/20 to-cyan-500/20'
    const borderColor = isBug ? 'border-rose-500/20' : 'border-violet-500/20'
    const hoverBorder = isBug ? 'hover:border-rose-500/40' : 'hover:border-violet-500/40'
    const accentText = isBug ? 'text-rose-300' : 'text-violet-300'
    const glowColor = isBug ? 'bg-rose-500/5' : 'bg-violet-500/5'
    const glowHover = isBug ? 'group-hover:bg-rose-500/10' : 'group-hover:bg-violet-500/10'

    if (!details) return null

    return (
        <div className={`p-6 rounded-2xl bg-white/5 border ${borderColor} backdrop-blur-md shadow-xl space-y-5 relative group overflow-hidden transition-all duration-300 ${hoverBorder}`}>
            <div className={`absolute -right-4 -top-4 w-16 h-16 ${glowColor} rounded-full blur-xl ${glowHover} transition-colors`} />

            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
                <h3 className={`text-sm font-bold tracking-wider ${accentText} uppercase flex items-center gap-2`}>
                    <Code2 className="w-4 h-4" />
                    Détails SD
                </h3>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border ${isBug
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                    }`}>
                    {isBug ? <Bug className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isBug ? 'BUG' : 'ÉVOLUTION'}
                </span>
            </div>

            {/* Complexity selector for DEV users */}
            {isDev && !isClosed && (
                <div className="relative z-10">
                    <label className="text-xs text-white/50 mb-1.5 block font-medium">Qualification de complexité</label>
                    <div className="relative">
                        <select
                            value={complexity}
                            onChange={e => handleComplexityChange(e.target.value)}
                            disabled={isPending}
                            className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-${accentColor}-500/50 transition-all appearance-none disabled:opacity-50`}
                        >
                            {COMPLEXITY_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        {isPending && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Read-only complexity badge */}
            {(!isDev || isClosed) && details.complexity && (
                <div className="relative z-10">
                    <p className="text-xs text-white/50 mb-1.5">Complexité</p>
                    <span className={`inline-flex px-3 py-1.5 rounded-lg text-sm font-bold border ${details.complexity === 'HOTFIX' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                            details.complexity === 'S' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                details.complexity === 'M' ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' :
                                    details.complexity === 'L' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                        details.complexity === 'XL' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                                            'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        }`}>
                        {details.complexity}
                    </span>
                </div>
            )}

            {/* Content */}
            <div className="relative z-10 space-y-4">
                {isBug ? (
                    <>
                        {/* Bug fields */}
                        <div className="space-y-1.5">
                            <p className="text-xs text-white/50 flex items-center gap-1.5">
                                <Footprints className="w-3.5 h-3.5 text-rose-400/70" /> Étapes de reproduction
                            </p>
                            <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                                {details.reproduction_steps || <span className="text-white/30 italic">Non renseigné</span>}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-xs text-white/50 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400/70" /> Impact
                            </p>
                            <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                                {details.impact || <span className="text-white/30 italic">Non renseigné</span>}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Evolution fields */}
                        <div className="space-y-1.5">
                            <p className="text-xs text-white/50 flex items-center gap-1.5">
                                <Lightbulb className="w-3.5 h-3.5 text-violet-400/70" /> Besoin
                            </p>
                            <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                                {details.need_description || <span className="text-white/30 italic">Non renseigné</span>}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-xs text-white/50 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-violet-400/70" /> Procédé attendu
                            </p>
                            <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                                {details.expected_process || <span className="text-white/30 italic">Non renseigné</span>}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
