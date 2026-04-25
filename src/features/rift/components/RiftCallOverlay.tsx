'use client'

// SPRINT 50.3 - Basilisk Rift : Système d'Appel via Jitsi Meet
// Gère l'interface de visioconférence et la synchronisation des états

import { useEffect, useRef, useState } from 'react'
import { useRiftStore } from '@/hooks/useRiftStore'
import { leaveRiftCall } from '@/features/rift/actions'
import { createClient } from '@/utils/supabase/client'
import { PhoneOff, Maximize2, Minimize2, Loader2, Video, Mic, MonitorUp } from 'lucide-react'
import { cn } from '@/lib/utils'

declare global {
    interface Window {
        JitsiMeetExternalAPI: any
    }
}

export function RiftCallOverlay({ currentUserId }: { currentUserId: string }) {
    const { activeCall, setActiveCall, incomingCall, setIncomingCall } = useRiftStore()
    const [isMinimized, setIsMinimized] = useState(false)
    const [isJitsiReady, setIsJitsiReady] = useState(false)
    const [myProfile, setMyProfile] = useState<{first_name: string, last_name: string, role: string} | null>(null)
    const [jitsiError, setJitsiError] = useState<string | null>(null)
    const jitsiContainerRef = useRef<HTMLDivElement>(null)
    const jitsiApiRef = useRef<any>(null)
    const retryCountRef = useRef(0)

    // ── Charger mon profil pour Jitsi ──
    useEffect(() => {
        if (!currentUserId) return
        const fetchMe = async () => {
            const { data, error } = await createClient()
                .from('profiles')
                .select('first_name, last_name, role')
                .eq('id', currentUserId)
                .single()
            
            if (error) {
                console.error('[Rift] Profile fetch error:', error)
                // Fallback name if profile fetch fails
                setMyProfile({ first_name: 'Utilisateur', last_name: 'Basilisk', role: 'STANDARD' })
            } else {
                setMyProfile(data)
            }
        }
        fetchMe()
    }, [currentUserId])

    const handleAnswer = () => {
        if (incomingCall) {
            setActiveCall(incomingCall)
            setIncomingCall(null)
        }
    }

    const handleDecline = () => setIncomingCall(null)

    // ── Initialiser Jitsi ──
    useEffect(() => {
        if (!activeCall || !jitsiContainerRef.current || !myProfile) return

        const initJitsi = () => {
            if (!window.JitsiMeetExternalAPI) {
                retryCountRef.current++
                if (retryCountRef.current > 50) { // ~15 secondes
                    setJitsiError("Impossible de charger le moteur de flux (Jitsi API introuvable). Vérifiez votre connexion ou vos bloqueurs de scripts.")
                    return
                }
                setTimeout(initJitsi, 300)
                return
            }

            try {
                const roomName = `basilisk-rift-${activeCall.channel_id.substring(0, 8)}`
                const isModerator = myProfile.role === 'ADMIN' || activeCall.created_by === currentUserId

                const options = {
                    roomName: roomName,
                    width: '100%',
                    height: '100%',
                    parentNode: jitsiContainerRef.current,
                    configOverwrite: {
                        startWithAudioMuted: false,
                        startWithVideoMuted: activeCall.type === 'AUDIO',
                        prejoinPageEnabled: false,
                        disableDeepLinking: true,
                        enableWelcomePage: false,
                        // Droits de modération
                        disableRemoteMute: !isModerator,
                        remoteVideoMenu: {
                            disableKick: !isModerator,
                        },
                    },
                    interfaceConfigOverwrite: {
                        TOOLBAR_BUTTONS: [
                            'microphone', 'camera', 'desktop', 'hangup', 'chat', 'raisehand',
                            'videoquality', 'tileview', 'settings', 'fullscreen',
                            ...(isModerator ? ['mute-everyone', 'security'] : [])
                        ],
                    },
                    userInfo: {
                        displayName: `${myProfile.first_name} ${myProfile.last_name}`,
                        role: isModerator ? 'moderator' : 'participant'
                    }
                }

                const api = new window.JitsiMeetExternalAPI('meet.jit.si', options)
                jitsiApiRef.current = api

                api.addEventListener('videoConferenceJoined', () => {
                    setIsJitsiReady(true)
                    setJitsiError(null)
                })
                
                // Backup : si l'événement n'arrive pas après 10s mais que l'iframe est là
                const backupTimer = setTimeout(() => {
                    if (jitsiApiRef.current && !isJitsiReady) {
                        setIsJitsiReady(true)
                    }
                }, 10000)

                // Si on raccroche depuis Jitsi
                api.addEventListener('videoConferenceLeft', () => handleHangup())
                api.addEventListener('readyToClose', () => handleHangup())

                return () => clearTimeout(backupTimer)
            } catch (err) {
                console.error('[Rift] Jitsi init error:', err)
                setJitsiError("Erreur lors de l'initialisation de l'appel.")
            }
        }

        const cleanup = initJitsi()

        return () => {
            if (cleanup) cleanup()
            if (jitsiApiRef.current) {
                jitsiApiRef.current.dispose()
                jitsiApiRef.current = null
            }
            setIsJitsiReady(false)
            retryCountRef.current = 0
        }
    }, [activeCall, myProfile])

    const handleHangup = async () => {
        if (activeCall) {
            await leaveRiftCall(activeCall.id)
            setActiveCall(null)
            setIsJitsiReady(false)
        }
    }

    // ── HUD Réception ──
    if (incomingCall && !activeCall) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-[#0a0a1a] border border-primary/30 rounded-3xl p-8 w-80 shadow-2xl shadow-primary/20 flex flex-col items-center gap-6 text-center">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary animate-pulse flex items-center justify-center text-primary">
                            {incomingCall.type === 'VIDEO' ? <Video className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Appel Rift Entrant</h3>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-black opacity-50">Canal: {incomingCall.channel_id.substring(0,8)}</p>
                    </div>
                    <div className="flex gap-3 w-full">
                        <button onClick={handleDecline} className="flex-1 py-3 rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors font-bold text-[10px] uppercase tracking-widest border border-rose-500/20">Refuser</button>
                        <button onClick={handleAnswer} className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20">Répondre</button>
                    </div>
                </div>
            </div>
        )
    }

    // ── HUD Appel Actif (Jitsi) ──
    if (activeCall) {
        return (
            <div className={cn(
                "fixed z-[90] transition-all duration-500 ease-out flex flex-col overflow-hidden bg-black border border-white/10 shadow-2xl",
                isMinimized 
                    ? "bottom-6 right-6 w-80 h-48 rounded-2xl ring-1 ring-primary/40" 
                    : "inset-6 rounded-3xl"
            )}>
                {/* Header Controls */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-zinc-950 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/50">
                                Session Rift Live — {activeCall.type}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground transition-colors">
                            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                        </button>
                        {!isMinimized && (
                            <button onClick={handleHangup} className="p-2 hover:bg-rose-500/20 rounded-lg text-rose-400 transition-colors" title="Raccrocher">
                                <PhoneOff className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Jitsi Container */}
                <div className="flex-1 relative bg-zinc-950">
                    {jitsiError ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950 z-20 text-center p-8">
                            <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 mb-2">
                                <PhoneOff className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">{jitsiError}</p>
                            <button 
                                onClick={handleHangup}
                                className="mt-4 px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    ) : !isJitsiReady && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950 z-10 text-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest animate-pulse">Initialisation du moteur de flux...</p>
                        </div>
                    )}
                    <div ref={jitsiContainerRef} className="w-full h-full" />
                </div>
            </div>
        )
    }

    return null
}
