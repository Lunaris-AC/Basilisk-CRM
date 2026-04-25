import { RealtimeSubscriber } from '@/components/RealtimeSubscriber'
import { RiftUnreadTracker } from '@/components/RiftUnreadTracker'
import { RiftCallManager } from '@/components/RiftCallManager'
import { GlobalCommandPalette } from '@/components/GlobalCommandPalette'
import { ProtectedShell } from '@/components/layout/ProtectedShell'

export default function ProtectedLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <div className="flex h-screen w-full overflow-hidden relative bg-background">
            {/* Activation de la synchronisation temps réel (Client Side) */}
            <RealtimeSubscriber />
            <RiftUnreadTracker />
            <RiftCallManager />

            <GlobalCommandPalette />

            <ProtectedShell>
                {children}
            </ProtectedShell>
        </div>
    )
}

