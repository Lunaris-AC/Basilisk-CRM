'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Palette, Moon, Sun, Monitor, Check, Sparkles } from 'lucide-react'
import { OLYMPE_THEMES, type Theme as OlympeTheme } from '@/lib/themes'
import { cn } from '@/lib/utils'

export default function ApparencePage() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [currentThemeId, setCurrentThemeId] = useState('default')

    useEffect(() => {
        setMounted(true)
        const savedThemeId = localStorage.getItem('basilisk-olympe-theme') || 'default'
        setCurrentThemeId(savedThemeId)
        if (savedThemeId !== 'default') {
            const t = OLYMPE_THEMES.find(th => th.id === savedThemeId)
            if (t) applyOlympeTheme(t)
        }
    }, [])

    const applyOlympeTheme = (olympe: OlympeTheme | null) => {
        const root = document.documentElement;

        if (olympe) {
            root.style.setProperty('--primary', olympe.primary);
            root.style.setProperty('--ring', olympe.primary);
            root.style.setProperty('--sidebar-primary', olympe.primary);
            root.style.setProperty('--accent', olympe.accent);
            root.style.setProperty('--muted', olympe.muted);
        } else {
            root.style.removeProperty('--primary');
            root.style.removeProperty('--ring');
            root.style.removeProperty('--sidebar-primary');
            root.style.removeProperty('--accent');
            root.style.removeProperty('--muted');
        }
    }

    const handleThemeSelect = (themeId: string) => {
        setCurrentThemeId(themeId)
        localStorage.setItem('basilisk-olympe-theme', themeId)

        if (themeId === 'default') {
            applyOlympeTheme(null)
        } else {
            const t = OLYMPE_THEMES.find(th => th.id === themeId)
            if (t) applyOlympeTheme(t)
        }
    }

    if (!mounted) return null

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Mode d'affichage (Clair/Sombre) */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Monitor className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Mode d'affichage</h3>
                        <p className="text-xs text-muted-foreground">Choisissez l'ambiance globale de votre interface.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Clair', value: 'light', icon: Sun },
                        { label: 'Sombre', value: 'dark', icon: Moon },
                        { label: 'Système', value: 'system', icon: Monitor },
                    ].map((mode) => {
                        const Icon = mode.icon
                        const isActive = theme === mode.value
                        return (
                            <button
                                key={mode.value}
                                onClick={() => setTheme(mode.value)}
                                className={cn(
                                    "p-6 rounded-3xl border transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                                    isActive
                                        ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                                        : "bg-white/5 border-white/10 hover:border-white/30"
                                )}
                            >
                                <Icon className={cn("w-8 h-8 transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground")} />
                                <span className={cn("text-xs font-black uppercase tracking-widest", isActive ? "text-primary" : "text-muted-foreground")}>
                                    {mode.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* Galerie Olympe */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <Palette className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Moteur de Thèmes Olympe</h3>
                            <p className="text-xs text-muted-foreground">30 palettes divines pour sublimer votre expérience.</p>
                        </div>
                    </div>

                    <button
                        onClick={() => handleThemeSelect('default')}
                        className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                    >
                        Réinitialiser par défaut
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {OLYMPE_THEMES.map((olympe) => {
                        const isSelected = currentThemeId === olympe.id
                        return (
                            <button
                                key={olympe.id}
                                onClick={() => handleThemeSelect(olympe.id)}
                                className={cn(
                                    "text-left p-5 rounded-3xl border transition-all group relative overflow-hidden",
                                    isSelected
                                        ? "bg-white/10 border-primary ring-1 ring-primary/40 shadow-xl shadow-primary/10"
                                        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]"
                                )}
                            >
                                {isSelected && (
                                    <div className="absolute top-3 right-3 p-1 rounded-full bg-primary text-primary-foreground">
                                        <Check className="w-3 h-3" />
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-black text-sm text-foreground uppercase tracking-wider">{olympe.name}</h4>
                                        {isSelected && <Sparkles className="w-3 h-3 text-primary animate-pulse" />}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-1">{olympe.description}</p>

                                    {/* Palette Preview */}
                                    <div className="flex gap-2 pt-2">
                                        <div className="w-full h-2 rounded-full" style={{ backgroundColor: `hsl(${olympe.primary})` }} title="Primaire" />
                                        <div className="w-1/3 h-2 rounded-full" style={{ backgroundColor: `hsl(${olympe.accent})` }} title="Accent" />
                                        <div className="w-1/3 h-2 rounded-full" style={{ backgroundColor: `hsl(${olympe.muted})` }} title="Muted" />
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </section>
        </div>
    )
}
