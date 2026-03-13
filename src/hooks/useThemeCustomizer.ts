import { useEffect, useState } from 'react'

export function useThemeCustomizer() {
    const [customColors, setCustomColors] = useState({
        primary: '',
        background: '',
        border: ''
    })

    useEffect(() => {
        const saved = localStorage.getItem('basilisk-custom-theme')
        if (saved) {
            const parsed = JSON.parse(saved)
            setCustomColors(parsed)
            applyColors(parsed)
        }
    }, [])

    const applyColors = (colors: { primary?: string, background?: string, border?: string }) => {
        const root = document.documentElement
        
        if (colors.primary) {
            // Assume we can just pass standard CSS colors to primary if it's hex, but shadcn uses HSL for primary
            // Since we use standard color pickers (which output hex), we might need to convert hex to HSL
            // Or just allow CSS var overrides directly if we set them properly, but standard shadcn uses `hsl(var(--primary))`
            // If the user selects a hex, we need to set `--primary` as `H S L` values.
            // Let's implement a simple wrapper or just assign directly and see if they modify `--primary` space.
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

    const updateColor = (key: keyof typeof customColors, hex: string) => {
        const next = { ...customColors, [key]: hex }
        setCustomColors(next)
        localStorage.setItem('basilisk-custom-theme', JSON.stringify(next))
        applyColors(next)
        // Switch off Olympe theme if we have custom colors
        if (hex) {
            localStorage.removeItem('basilisk-olympe-theme')
        }
    }

    const resetCustomColors = () => {
        setCustomColors({ primary: '', background: '', border: '' })
        localStorage.removeItem('basilisk-custom-theme')
        applyColors({ primary: '', background: '', border: '' })
    }

    return { customColors, updateColor, resetCustomColors }
}

// Helper to convert HEX to HSL format used by shadcn (e.g. "210 100% 50%")
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
