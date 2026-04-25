'use client'

// SPRINT 50.3 - Basilisk Rift : Hook de gestion des appels WebRTC
// Gère la signalisation, les flux média (Cam/Micro) et le Partage d'Écran
// V3 - Stabilité renforcée, fix des races conditions et des aperçus noirs

import { useEffect, useRef, useCallback, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRiftStore, type RiftCall } from '@/hooks/useRiftStore'
import { joinRiftCall, leaveRiftCall, updateParticipantMedia, declineRiftCall } from '@/features/rift/actions'
import { toast } from 'sonner'

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ]
}

export function useRiftCalls(currentUserId: string) {
    const { activeCall, incomingCall, setActiveCall, setIncomingCall } = useRiftStore()
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
    const pendingJoins = useRef<Set<string>>(new Set())
    const makingOffer = useRef<Map<string, boolean>>(new Map())
    const screenStreamRef = useRef<MediaStream | null>(null)
    const supabase = createClient()

    // ── Gérer les flux locaux ──
    const startLocalStream = useCallback(async (type: 'AUDIO' | 'VIDEO') => {
        try {
            console.log(`[RiftCall] Accès médias (${type})...`)
            
            const constraints: MediaStreamConstraints = {
                audio: { echoCancellation: true, noiseSuppression: true },
                video: type === 'VIDEO' ? { width: 1280, height: 720, frameRate: 30 } : false
            }

            let stream: MediaStream
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints)
            } catch (vErr) {
                if (type === 'VIDEO') {
                    console.warn('[RiftCall] Échec Vidéo, tentative Audio seul...')
                    toast.info('Caméra introuvable ou bloquée. Passage en audio.')
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                } else {
                    throw vErr
                }
            }

            setLocalStream(stream)
            return stream
        } catch (err) {
            console.error('[RiftCall] Erreur fatale média:', err)
            toast.error('Impossible d\'accéder à vos périphériques audio/vidéo.')
            return null
        }
    }, [])

    // ── Partage d'Écran ──
    const toggleScreenShare = useCallback(async () => {
        if (!activeCall || !localStream) return

        if (isScreenSharing) {
            // ARRÊTER
            screenStreamRef.current?.getTracks().forEach(t => t.stop())
            screenStreamRef.current = null
            setIsScreenSharing(false)
            
            const videoStream = await startLocalStream(activeCall.type)
            if (videoStream) {
                const videoTrack = videoStream.getVideoTracks()[0]
                peerConnections.current.forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video')
                    if (sender && videoTrack) sender.replaceTrack(videoTrack)
                })
            }
            await updateParticipantMedia(activeCall.id, { is_screen_sharing: false })
        } else {
            // DÉMARRER
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
                screenStreamRef.current = stream
                setIsScreenSharing(true)

                const screenTrack = stream.getVideoTracks()[0]
                
                // Mettre à jour l'aperçu local
                setLocalStream(new MediaStream([localStream.getAudioTracks()[0], screenTrack]))

                peerConnections.current.forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video')
                    if (sender) sender.replaceTrack(screenTrack)
                    else pc.addTrack(screenTrack, stream)
                })

                screenTrack.onended = () => toggleScreenShare()
                await updateParticipantMedia(activeCall.id, { is_screen_sharing: true })
            } catch (err) {
                console.error('[RiftCall] Partage écran annulé ou échoué')
            }
        }
    }, [activeCall, isScreenSharing, localStream, startLocalStream])

    // ── Créer une PeerConnection ──
    const createPeerConnection = useCallback((targetUserId: string, stream: MediaStream) => {
        if (peerConnections.current.has(targetUserId)) return peerConnections.current.get(targetUserId)!

        const pc = new RTCPeerConnection(ICE_SERVERS)
        stream.getTracks().forEach(track => pc.addTrack(track, stream))

        pc.ontrack = ({ streams: [remoteStream] }) => {
            setRemoteStreams(prev => new Map(prev).set(targetUserId, remoteStream))
        }

        pc.onicecandidate = ({ candidate }) => {
            if (candidate && activeCall) {
                supabase.channel(`rift_signaling_${activeCall.id}`).send({
                    type: 'broadcast', event: 'signal',
                    payload: { from: currentUserId, to: targetUserId, type: 'ice-candidate', data: candidate }
                })
            }
        }

        pc.onconnectionstatechange = () => {
            if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                setRemoteStreams(prev => { const n = new Map(prev); n.delete(targetUserId); return n; })
                peerConnections.current.delete(targetUserId)
            }
        }

        peerConnections.current.set(targetUserId, pc)
        return pc
    }, [activeCall, currentUserId, supabase])

    // ── Signalisation (V3 avec gestion des collisions) ──
    useEffect(() => {
        if (!activeCall) return
        const channel = supabase.channel(`rift_signaling_${activeCall.id}`)
        channel
            .on('broadcast', { event: 'signal' }, async ({ payload }) => {
                const { from, to, type, data } = payload
                if (to !== currentUserId && to !== 'ALL') return

                const pc = peerConnections.current.get(from) || (localStream ? createPeerConnection(from, localStream) : null)
                if (!pc) return

                try {
                    if (type === 'offer') {
                        // Politesse WebRTC : on ne traite pas l'offre si on est déjà en train d'en faire une de notre côté (race condition)
                        const isImpolite = currentUserId > from // Stratégie simple de priorité
                        if (pc.signalingState !== 'stable' && !isImpolite) return
                        
                        await pc.setRemoteDescription(new RTCSessionDescription(data))
                        const answer = await pc.createAnswer()
                        await pc.setLocalDescription(answer)
                        channel.send({ type: 'broadcast', event: 'signal', payload: { from: currentUserId, to: from, type: 'answer', data: answer }})
                    } else if (type === 'answer') {
                        if (pc.signalingState === 'have-local-offer') {
                            await pc.setRemoteDescription(new RTCSessionDescription(data))
                        }
                    } else if (type === 'ice-candidate') {
                        await pc.addIceCandidate(new RTCIceCandidate(data))
                    } else if (type === 'join' && from !== currentUserId) {
                        if (localStream) {
                            const pcNew = createPeerConnection(from, localStream)
                            const offer = await pcNew.createOffer()
                            await pcNew.setLocalDescription(offer)
                            channel.send({ type: 'broadcast', event: 'signal', payload: { from: currentUserId, to: from, type: 'offer', data: offer }})
                        } else {
                            pendingJoins.current.add(from)
                        }
                    }
                } catch (e) {
                    console.warn('[RiftCall] Erreur signalisation:', e)
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    channel.send({ type: 'broadcast', event: 'signal', payload: { from: currentUserId, to: 'ALL', type: 'join' }})
                }
            })

        return () => { supabase.removeChannel(channel) }
    }, [activeCall, currentUserId, localStream, createPeerConnection, supabase])

    // ── Actions ──
    const answerCall = async () => {
        if (!incomingCall) return
        const stream = await startLocalStream(incomingCall.type)
        if (!stream) return
        const res = await joinRiftCall(incomingCall.id)
        if (!res.error) { setActiveCall(incomingCall); setIncomingCall(null); }
    }

    const hangup = async () => {
        if (!activeCall) return
        await leaveRiftCall(activeCall.id)
        localStream?.getTracks().forEach(t => t.stop())
        screenStreamRef.current?.getTracks().forEach(t => t.stop())
        peerConnections.current.forEach(pc => pc.close())
        peerConnections.current.clear()
        setLocalStream(null)
        setRemoteStreams(new Map())
        setIsScreenSharing(false)
        setActiveCall(null)
    }

    const toggleMute = async () => {
        if (!localStream || !activeCall) return
        const track = localStream.getAudioTracks()[0]
        if (track) {
            track.enabled = !track.enabled
            await updateParticipantMedia(activeCall.id, { is_muted: !track.enabled })
        }
    }

    const toggleCamera = async () => {
        if (!localStream || !activeCall) return
        const track = localStream.getVideoTracks()[0]
        if (track) {
            track.enabled = !track.enabled
            await updateParticipantMedia(activeCall.id, { is_camera_on: track.enabled })
        }
    }

    useEffect(() => {
        if (activeCall && !localStream && !incomingCall) startLocalStream(activeCall.type)
    }, [activeCall, localStream, incomingCall, startLocalStream])

    // Support des JOINS en attente
    useEffect(() => {
        if (localStream && pendingJoins.current.size > 0 && activeCall) {
            const channel = supabase.channel(`rift_signaling_${activeCall.id}`)
            pendingJoins.current.forEach(async (f) => {
                const pc = createPeerConnection(f, localStream)
                const o = await pc.createOffer(); await pc.setLocalDescription(o)
                channel.send({ type: 'broadcast', event: 'signal', payload: { from: currentUserId, to: f, type: 'offer', data: o }})
            })
            pendingJoins.current.clear()
        }
    }, [localStream, activeCall, currentUserId, createPeerConnection, supabase])

    return {
        localStream, remoteStreams, isScreenSharing, toggleScreenShare,
        answerCall, hangup, toggleMute, toggleCamera,
        declineCall: () => { if (incomingCall) declineRiftCall(incomingCall.id); setIncomingCall(null); }
    }
}
