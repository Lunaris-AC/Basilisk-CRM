'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
    return (
        <SonnerToaster
            position="top-left"
            toastOptions={{
                unstyled: true,
                classNames: {
                    toast: 'flex items-start gap-3 w-full max-w-sm p-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl text-white',
                    title: 'text-sm font-bold tracking-wide',
                    description: 'text-xs text-white/70 mt-1',
                },
            }}
        />
    )
}
