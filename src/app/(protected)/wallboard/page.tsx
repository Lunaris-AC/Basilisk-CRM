'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Maximize, Monitor, Wifi, WifiOff } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

import { NewsTicker } from '@/features/wallboard/components/NewsTicker'
import { ViewFront } from '@/features/wallboard/components/ViewFront'
import { ViewCritical } from '@/features/wallboard/components/ViewCritical'
import { ViewHallOfFame } from '@/features/wallboard/components/ViewHallOfFame'
import {
    getCriticalTickets,
    getBreachedSlaTickets,
    getUnassignedCount,
    getSlaExpiringTickets,
    getTopResolversToday,
    WallboardTicket,
    TopResolver,
} from '@/features/wallboard/queries'

// ============================================================
// SPRINT 51 : WALLBOARD MODULE — Affichage Kiosque TV
// Plein écran, temps réel, carrousel automatique 15s
// Réservé ADMIN
// ============================================================

const CAROUSEL_INTERVAL = 15_000 // 15 secondes entre chaque vue
const DATA_REFRESH_INTERVAL = 30_000 // Rafraîchir les données toutes les 30s
const VIEW_COUNT = 3

export default function WallboardPage() {
    // ── Auth & Rôle ─────────────────────────────────────────
    const [authorized, setAuthorized] = useState<boolean | null>(null)
    const [currentView, setCurrentView] = useState(0)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [clock, setClock] = useState(new Date())

    // ── Data states ─────────────────────────────────────────
    const [criticalTickets, setCriticalTickets] = useState<WallboardTicket[]>([])
    const [breachedTickets, setBreachedTickets] = useState<WallboardTicket[]>([])
    const [unassignedCount, setUnassignedCount] = useState(0)
    const [slaExpiringTickets, setSlaExpiringTickets] = useState<WallboardTicket[]>([])
    const [topResolvers, setTopResolvers] = useState<TopResolver[]>([])
    const [isConnected, setIsConnected] = useState(true)

    const supabaseRef = useRef(createClient())

    // ── Vérification du rôle ADMIN ──────────────────────────
    useEffect(() => {
        async function checkRole() {
            const supabase = supabaseRef.current
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                window.location.href = '/login'
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'ADMIN' && profile?.role !== 'N4') {
                window.location.href = '/dashboard'
                return
            }

            setAuthorized(true)
        }
        checkRole()
    }, [])

    // ── Fetch toutes les données ────────────────────────────
    const fetchAllData = useCallback(async () => {
        try {
            const [critical, breached, unassigned, slaExpiring, resolvers] = await Promise.all([
                getCriticalTickets(),
                getBreachedSlaTickets(),
                getUnassignedCount(),
                getSlaExpiringTickets(),
                getTopResolversToday(),
            ])

            setCriticalTickets(critical)
            setBreachedTickets(breached)
            setUnassignedCount(unassigned)
            setSlaExpiringTickets(slaExpiring)
            setTopResolvers(resolvers)
            setIsConnected(true)
        } catch (err) {
            console.error('[Wallboard] Data fetch error:', err)
            setIsConnected(false)
        }
    }, [])

    // ── Chargement initial + polling ────────────────────────
    useEffect(() => {
        if (!authorized) return
        fetchAllData()
        const interval = setInterval(fetchAllData, DATA_REFRESH_INTERVAL)
        return () => clearInterval(interval)
    }, [authorized, fetchAllData])

    // ── Realtime WebSocket : invalide les données à chaque changement ──
    useEffect(() => {
        if (!authorized) return

        const supabase = supabaseRef.current

        const channel = supabase
            .channel('wallboard-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tickets' },
                () => {
                    // Refresh toutes les données à chaque mutation
                    fetchAllData()
                }
            )
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED')
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [authorized, fetchAllData])

    // ── Carrousel automatique ───────────────────────────────
    useEffect(() => {
        if (!authorized) return

        const interval = setInterval(() => {
            setIsTransitioning(true)
            setTimeout(() => {
                setCurrentView((prev) => (prev + 1) % VIEW_COUNT)
                setIsTransitioning(false)
            }, 400) // Durée du fade-out
        }, CAROUSEL_INTERVAL)

        return () => clearInterval(interval)
    }, [authorized])

    // ── Horloge ─────────────────────────────────────────────
    useEffect(() => {
        const timer = setInterval(() => setClock(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    // ── Plein écran ─────────────────────────────────────────
    const handleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen()
        } else {
            document.documentElement.requestFullscreen()
        }
    }

    // ── Loading screen ──────────────────────────────────────
    if (authorized === null) {
        return (
            <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
                <div className="text-center">
                    <Monitor className="w-20 h-20 text-slate-600 mx-auto mb-6 animate-pulse" />
                    <p className="text-3xl font-bold text-slate-500">
                        Initialisation du Wallboard...
                    </p>
                </div>
            </div>
        )
    }

    if (!authorized) return null

    // ── Rendu des vues ──────────────────────────────────────
    const renderCurrentView = () => {
        switch (currentView) {
            case 0:
                return (
                    <ViewFront
                        unassignedCount={unassignedCount}
                        slaExpiringTickets={slaExpiringTickets}
                    />
                )
            case 1:
                return <ViewCritical criticalTickets={criticalTickets} />
            case 2:
                return <ViewHallOfFame topResolvers={topResolvers} />
            default:
                return null
        }
    }

    const viewLabels = ['Le Front', 'Bloc Opératoire', 'Hall of Fame']

    return (
        <div className="fixed inset-0 z-[9999] bg-black text-white overflow-hidden flex flex-col select-none cursor-default">
            {/* ── Bandeau d'alerte (NewsTicker) ───────────── */}
            <NewsTicker
                criticalTickets={criticalTickets}
                breachedTickets={breachedTickets}
            />

            {/* ── Zone principale du carrousel ────────────── */}
            <div className="flex-1 relative overflow-hidden">
                <div
                    className={`absolute inset-0 transition-opacity duration-400 ease-in-out ${
                        isTransitioning ? 'opacity-0' : 'opacity-100'
                    }`}
                >
                    {renderCurrentView()}
                </div>
            </div>

            {/* ── Barre de status en bas ──────────────────── */}
            <div className="h-14 bg-slate-950 border-t border-white/5 flex items-center justify-between px-8">
                {/* Indicateurs de vue */}
                <div className="flex items-center gap-3">
                    {viewLabels.map((label, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                setIsTransitioning(true)
                                setTimeout(() => {
                                    setCurrentView(index)
                                    setIsTransitioning(false)
                                }, 400)
                            }}
                            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-300 ${
                                currentView === index
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'text-slate-600 hover:text-slate-400'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Centre : Indicateurs dots */}
                <div className="flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                                currentView === i
                                    ? 'bg-white scale-125'
                                    : 'bg-white/20'
                            }`}
                        />
                    ))}
                </div>

                {/* Droite : Horloge + Statut + Fullscreen */}
                <div className="flex items-center gap-6">
                    {/* Statut connexion */}
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <Wifi className="w-4 h-4 text-emerald-400" />
                        ) : (
                            <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />
                        )}
                        <span className={`text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isConnected ? 'LIVE' : 'DÉCONNECTÉ'}
                        </span>
                    </div>

                    {/* Horloge géante */}
                    <span className="text-2xl font-black text-white tabular-nums tracking-wider">
                        {clock.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>

                    {/* Bouton fullscreen furtif */}
                    <button
                        onClick={handleFullscreen}
                        className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/10 transition-all duration-200"
                        title="Plein écran"
                    >
                        <Maximize className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
