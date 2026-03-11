import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { RealtimeSubscriber } from '@/components/RealtimeSubscriber'
import { RiftUnreadTracker } from '@/components/RiftUnreadTracker'
import { ClientDisplayManager } from '@/components/layout/ClientDisplayManager'
import { GlobalCommandPalette } from '@/components/GlobalCommandPalette'

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

            <GlobalCommandPalette />

            {/* Global Background abstract effects */}
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] mix-blend-screen pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] mix-blend-screen pointer-events-none" />

            {/* Sidebar fixed */}
            <div className="h-full z-50">
                <Sidebar />
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col h-full relative z-10">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <ClientDisplayManager>
                        {children}
                    </ClientDisplayManager>
                </main>
            </div>
        </div>
    )
}

