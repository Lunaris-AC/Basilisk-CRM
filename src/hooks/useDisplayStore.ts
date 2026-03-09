import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DisplayMode = 'FOCUS' | 'TABS' | 'GRID'

interface DisplayState {
    mode: DisplayMode
    setMode: (mode: DisplayMode) => void
}

export const useDisplayStore = create<DisplayState>()(
    persist(
        (set) => ({
            mode: 'FOCUS',
            setMode: (mode) => set({ mode }),
        }),
        {
            name: 'basilisk-display-storage',
        }
    )
)
