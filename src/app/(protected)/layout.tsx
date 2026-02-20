import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { RealtimeSubscriber } from '@/components/RealtimeSubscriber'

export default function ProtectedLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <div className="flex h-screen w-full bg-zinc-950 overflow-hidden relative">
            {/* Activation de la synchronisation temps réel (Client Side) */}
            <RealtimeSubscriber />

            {/* Global Background abstract effects */}
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px] mix-blend-screen pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[100px] mix-blend-screen pointer-events-none" />

            {/* Sidebar fixed */}
            <div className="h-full z-50">
                <Sidebar />
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col h-full relative z-10">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    )
}
