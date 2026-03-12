'use client'

import Marquee from 'react-fast-marquee'
import { AlertTriangle } from 'lucide-react'
import { WallboardTicket } from '../queries'

// ============================================================
// SPRINT 51 : NewsTicker — Bandeau d'alerte défilant
// ============================================================

interface NewsTickerProps {
    criticalTickets: WallboardTicket[]
    breachedTickets: WallboardTicket[]
}

const ZEN_PHRASES = [
    '✅  Tous les SLA sont respectés — Bonne journée à tous !',
    '🧘  Aucune urgence en cours — Continuez comme ça.',
    '🌟  Zéro ticket critique — L\'équipe assure !',
    '☕  Situation nominale — Profitez de votre café.',
]

export function NewsTicker({ criticalTickets, breachedTickets }: NewsTickerProps) {
    const hasUrgency = criticalTickets.length > 0 || breachedTickets.length > 0

    // Dédupliquer les tickets (un ticket critique peut aussi être en breach)
    const urgentMap = new Map<string, WallboardTicket>()
    for (const t of breachedTickets) urgentMap.set(t.id, t)
    for (const t of criticalTickets) urgentMap.set(t.id, t)
    const urgentTickets = Array.from(urgentMap.values())

    if (hasUrgency) {
        return (
            <div className="w-full h-[50px] bg-rose-600 flex items-center overflow-hidden relative shadow-[0_0_40px_rgba(225,29,72,0.4)]">
                {/* Icône pulsante fixe à gauche */}
                <div className="absolute left-0 z-10 flex items-center justify-center w-16 h-full bg-rose-700">
                    <AlertTriangle className="w-7 h-7 text-white animate-pulse" />
                </div>

                <div className="ml-16 flex-1">
                    <Marquee speed={60} gradient={false} className="h-full">
                        {urgentTickets.map((ticket) => (
                            <span
                                key={ticket.id}
                                className="text-2xl font-black text-white tracking-wide mx-12"
                            >
                                🚨 URGENCE : Ticket #{ticket.id.slice(0, 6).toUpperCase()} —{' '}
                                [{ticket.client_company}] — {ticket.title} 🚨
                            </span>
                        ))}
                    </Marquee>
                </div>
            </div>
        )
    }

    // Mode zen : pas d'urgence
    const zenPhrase = ZEN_PHRASES[Math.floor(Date.now() / 60_000) % ZEN_PHRASES.length]

    return (
        <div className="w-full h-[50px] bg-slate-900/80 border-b border-white/5 flex items-center overflow-hidden">
            <Marquee speed={30} gradient={false} className="h-full">
                <span className="text-2xl font-medium text-slate-400 tracking-wide mx-16">
                    {zenPhrase}
                </span>
                <span className="text-2xl font-medium text-slate-500 tracking-wide mx-16">
                    📅 {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span className="text-2xl font-medium text-slate-400 tracking-wide mx-16">
                    {zenPhrase}
                </span>
            </Marquee>
        </div>
    )
}
