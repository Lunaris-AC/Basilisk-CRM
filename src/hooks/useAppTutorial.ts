'use client'

import { useCallback } from 'react'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

/**
 * SPRINT 43 – Hook pour le tutoriel interactif de l'interface Basilisk.
 * Utilise Driver.js pour guider l'utilisateur à travers les éléments clés.
 * Le tutoriel ne se lance JAMAIS automatiquement : l'utilisateur doit cliquer sur le bouton dédié.
 */
export function useAppTutorial() {
    const startTutorial = useCallback(() => {
        const steps: DriveStep[] = [
            {
                element: '#sidebar-queue',
                popover: {
                    title: 'File d\'attente',
                    description: 'Voici la file d\'attente. C\'est ici que tombent les tickets non assignés. Piochez-en un pour commencer à travailler.',
                    side: 'right' as const,
                    align: 'start' as const,
                },
            },
            {
                element: '#cmd-k-btn',
                popover: {
                    title: 'Mode Ninja ⌘K',
                    description: 'Appuyez sur ⌘K (ou Ctrl+K) pour chercher un ticket ou naviguer n\'importe où sans la souris. Un gain de temps incroyable.',
                    side: 'bottom' as const,
                    align: 'center' as const,
                },
            },
            {
                element: '#notification-bell',
                popover: {
                    title: 'Alertes Temps Réel',
                    description: 'Vos notifications en temps réel. Ne ratez aucun SLA, aucune escalade, aucun commentaire important.',
                    side: 'bottom' as const,
                    align: 'end' as const,
                },
            },
        ]

        const driverObj = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            overlayColor: 'rgba(0, 0, 0, 0.75)',
            stagePadding: 8,
            stageRadius: 12,
            popoverClass: 'basilisk-driver-popover',
            nextBtnText: 'Suivant →',
            prevBtnText: '← Précédent',
            doneBtnText: 'Terminer ✓',
            progressText: '{{current}} sur {{total}}',
            steps,
        })

        driverObj.drive()
    }, [])

    return { startTutorial }
}
