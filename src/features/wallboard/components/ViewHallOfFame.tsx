'use client'

import { Crown, Trophy, Medal, Award } from 'lucide-react'
import { TopResolver } from '../queries'

// ============================================================
// SPRINT 51 : Vue 2 — "Hall of Fame" — Top Résolveurs du Jour
// ============================================================

interface ViewHallOfFameProps {
    topResolvers: TopResolver[]
}

function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

const PODIUM_CONFIG = [
    {
        rank: 1,
        icon: Crown,
        iconSize: 'w-16 h-16',
        avatarSize: 'w-44 h-44',
        textSize: 'text-6xl',
        nameSize: 'text-4xl',
        scoreSize: 'text-5xl',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        shadow: 'shadow-[0_0_60px_rgba(234,179,8,0.2)]',
        glow: 'from-yellow-500/20 to-transparent',
        initialsColor: 'text-yellow-300',
        initialsBg: 'bg-yellow-500/20 border-yellow-500/40',
    },
    {
        rank: 2,
        icon: Medal,
        iconSize: 'w-12 h-12',
        avatarSize: 'w-36 h-36',
        textSize: 'text-5xl',
        nameSize: 'text-3xl',
        scoreSize: 'text-4xl',
        color: 'text-slate-300',
        bg: 'bg-slate-400/10',
        border: 'border-slate-400/20',
        shadow: 'shadow-[0_0_40px_rgba(148,163,184,0.1)]',
        glow: 'from-slate-400/10 to-transparent',
        initialsColor: 'text-slate-200',
        initialsBg: 'bg-slate-500/20 border-slate-400/30',
    },
    {
        rank: 3,
        icon: Award,
        iconSize: 'w-10 h-10',
        avatarSize: 'w-32 h-32',
        textSize: 'text-4xl',
        nameSize: 'text-2xl',
        scoreSize: 'text-3xl',
        color: 'text-amber-600',
        bg: 'bg-amber-700/10',
        border: 'border-amber-700/20',
        shadow: 'shadow-[0_0_30px_rgba(180,83,9,0.1)]',
        glow: 'from-amber-700/10 to-transparent',
        initialsColor: 'text-amber-500',
        initialsBg: 'bg-amber-700/20 border-amber-600/30',
    },
]

export function ViewHallOfFame({ topResolvers }: ViewHallOfFameProps) {
    if (topResolvers.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <Trophy className="w-24 h-24 text-slate-600 mx-auto mb-6" />
                    <p className="text-5xl font-black text-slate-400">
                        Pas encore de résolutions
                    </p>
                    <p className="text-3xl text-slate-600 mt-4">
                        Le podium attend ses héros du jour...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full w-full flex-col p-8">
            {/* Header */}
            <div className="flex items-center justify-center gap-5 mb-12">
                <Trophy className="w-14 h-14 text-yellow-400" />
                <h2 className="text-6xl font-black text-white tracking-tight">
                    Top Résolveurs du Jour
                </h2>
                <Trophy className="w-14 h-14 text-yellow-400" />
            </div>

            {/* Podium */}
            <div className="flex-1 flex items-center justify-center gap-12">
                {/* Réordonner : 2ème — 1er — 3ème pour l'effet podium classique */}
                {[topResolvers[1], topResolvers[0], topResolvers[2]]
                    .filter(Boolean)
                    .map((resolver, displayIndex) => {
                        // Mapper l'index d'affichage au rang réel
                        const actualRankIndex =
                            displayIndex === 0 ? 1  // 2ème place (gauche)
                                : displayIndex === 1 ? 0  // 1ère place (centre)
                                    : 2  // 3ème place (droite)

                        const config = PODIUM_CONFIG[actualRankIndex]
                        const IconComponent = config.icon

                        return (
                            <div
                                key={resolver.assignee_id}
                                className={`flex flex-col items-center gap-6 p-10 rounded-3xl ${config.bg} border-2 ${config.border} ${config.shadow} transition-all duration-500`}
                            >
                                {/* Icône rang */}
                                <IconComponent className={`${config.iconSize} ${config.color}`} />

                                {/* Avatar géant */}
                                {resolver.avatar_url ? (
                                    <img
                                        src={resolver.avatar_url}
                                        alt={`${resolver.first_name} ${resolver.last_name}`}
                                        className={`${config.avatarSize} rounded-full object-cover border-4 ${config.border}`}
                                    />
                                ) : (
                                    <div className={`${config.avatarSize} rounded-full ${config.initialsBg} border-4 flex items-center justify-center`}>
                                        <span className={`${config.textSize} font-black ${config.initialsColor}`}>
                                            {getInitials(resolver.first_name, resolver.last_name)}
                                        </span>
                                    </div>
                                )}

                                {/* Nom */}
                                <p className={`${config.nameSize} font-black text-white text-center`}>
                                    {resolver.first_name} {resolver.last_name}
                                </p>

                                {/* Score */}
                                <div className={`flex items-center gap-3 px-8 py-4 rounded-2xl ${config.bg} border-2 ${config.border}`}>
                                    <span className={`${config.scoreSize} font-black ${config.color}`}>
                                        {resolver.resolved_count}
                                    </span>
                                    <span className="text-2xl font-bold text-slate-400">
                                        ticket{resolver.resolved_count > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
            </div>
        </div>
    )
}
