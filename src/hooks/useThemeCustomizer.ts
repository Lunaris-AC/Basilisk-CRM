import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { updateMyThemeConfig } from '@/features/profiles/actions'

export function useThemeCustomizer() {
    const [customColors, setCustomColors] = useState({
        primary: '',
        background: '',
        border: ''
    })
    const [olympeTheme, setOlympeTheme] = useState<string | null>(null)

    useEffect(() => {
        const loadTheme = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('theme_config')
                    .eq('id', user.id)
                    .single()
                
                const config = profile?.theme_config
                
                if (config && (config.customColors || config.olympeTheme)) {
                    // La DB a des données, on les applique et on synchronise le LocalStorage
                    if (config.customColors && Object.values(config.customColors).some(v => v)) {
                        setCustomColors(config.customColors)
                        applyColors(config.customColors)
                        localStorage.setItem('basilisk-custom-theme', JSON.stringify(config.customColors))
                    } else {
                        localStorage.removeItem('basilisk-custom-theme')
                    }

                    if (config.olympeTheme && config.olympeTheme !== 'default') {
                        setOlympeTheme(config.olympeTheme)
                        localStorage.setItem('basilisk-olympe-theme', config.olympeTheme)
                    } else {
                        setOlympeTheme(null)
                        localStorage.removeItem('basilisk-olympe-theme')
                    }
                    return
                } else {
                    // La DB est vide, on regarde si le LocalStorage a quelque chose à lui donner
                    const savedCustom = localStorage.getItem('basilisk-custom-theme')
                    const savedOlympe = localStorage.getItem('basilisk-olympe-theme')
                    
                    if (savedCustom || savedOlympe) {
                        const parsedCustom = savedCustom ? JSON.parse(savedCustom) : null
                        // On pousse le local vers la DB pour la prochaine fois
                        await updateMyThemeConfig({
                            customColors: parsedCustom || { primary: '', background: '', border: '' },
                            olympeTheme: savedOlympe || null
                        })
                        if (parsedCustom) {
                            setCustomColors(parsedCustom)
                            applyColors(parsedCustom)
                        }
                        if (savedOlympe) setOlympeTheme(savedOlympe)
                        return
                    }
                }
            }

            // Fallback standard si non connecté ou erreur
            const saved = localStorage.getItem('basilisk-custom-theme')
            if (saved) {
                const parsed = JSON.parse(saved)
                setCustomColors(parsed)
                applyColors(parsed)
            }
            const savedOlympe = localStorage.getItem('basilisk-olympe-theme')
            if (savedOlympe) {
                setOlympeTheme(savedOlympe)
            }
        }

        loadTheme()
    }, [])

    const applyColors = (colors: { primary?: string, background?: string, border?: string }) => {
        const root = document.documentElement
        
        if (colors.primary) {
            const hsl = hexToHSL(colors.primary)
            root.style.setProperty('--primary', hsl)
            root.style.setProperty('--ring', hsl)
        } else {
            root.style.removeProperty('--primary')
            root.style.removeProperty('--ring')
        }

        if (colors.background) {
            const hsl = hexToHSL(colors.background)
            root.style.setProperty('--background', hsl)
        } else {
            root.style.removeProperty('--background')
        }

        if (colors.border) {
            const hsl = hexToHSL(colors.border)
            root.style.setProperty('--border', hsl)
        } else {
            root.style.removeProperty('--border')
        }
    }

    const updateColor = async (key: keyof typeof customColors, hex: string) => {
        const next = { ...customColors, [key]: hex }
        setCustomColors(next)
        localStorage.setItem('basilisk-custom-theme', JSON.stringify(next))
        applyColors(next)
        
        if (hex) {
            setOlympeTheme(null)
            localStorage.removeItem('basilisk-olympe-theme')
        }

        // Sync with DB
        await updateMyThemeConfig({ customColors: next, olympeTheme: null })
    }

    const setOlympeThemeId = async (themeId: string | null) => {
        setOlympeTheme(themeId)
        const root = document.documentElement
        
        // Nettoyage préalable pour éviter les conflits
        root.style.removeProperty('--primary')
        root.style.removeProperty('--ring')
        root.style.removeProperty('--background')
        root.style.removeProperty('--border')
        root.style.removeProperty('--accent')
        root.style.removeProperty('--muted')
        root.style.removeProperty('--sidebar-primary')

        if (themeId && themeId !== 'default') {
            localStorage.setItem('basilisk-olympe-theme', themeId)
            localStorage.removeItem('basilisk-custom-theme')
            setCustomColors({ primary: '', background: '', border: '' })
        } else {
            localStorage.removeItem('basilisk-olympe-theme')
            localStorage.removeItem('basilisk-custom-theme')
        }
        
        // Sync with DB
        await updateMyThemeConfig({ 
            customColors: { primary: '', background: '', border: '' }, 
            olympeTheme: themeId 
        })
    }

    const resetCustomColors = async () => {
        const empty = { primary: '', background: '', border: '' }
        setCustomColors(empty)
        localStorage.removeItem('basilisk-custom-theme')
        applyColors(empty)
        await updateMyThemeConfig({ customColors: empty, olympeTheme: olympeTheme })
    }

    return { customColors, updateColor, resetCustomColors, olympeTheme, setOlympeThemeId }
}

function hexToHSL(hex: string): string {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt("0x" + hex[1] + hex[1]);
        g = parseInt("0x" + hex[2] + hex[2]);
        b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
        r = parseInt("0x" + hex[1] + hex[2]);
        g = parseInt("0x" + hex[3] + hex[4]);
        b = parseInt("0x" + hex[5] + hex[6]);
    }
    
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}
