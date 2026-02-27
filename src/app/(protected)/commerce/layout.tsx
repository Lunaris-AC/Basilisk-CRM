import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { AlertTriangle } from 'lucide-react'

export default async function CommerceLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    // 1. Vérification de la session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    // 2. Vérification du rôle
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'ADMIN') {
        // Redirection de sécurité absolue
        redirect('/dashboard')
    }

    return (
        <div className="flex flex-col h-full relative">
            {/* Bandeau de chantier */}
            <div className="bg-amber-500/20 border-b border-amber-500/30 px-6 py-3 flex items-center justify-center gap-3 shrink-0 relative z-50">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <p className="text-amber-200/90 text-sm font-medium text-center">
                    <span className="font-bold text-amber-400 uppercase tracking-widest mr-2">Module en cours de développement</span>
                    Les fonctionnalités de ce module (comme la liaison avec le parc matériel) sont incomplètes. Accès restreint aux administrateurs.
                </p>
            </div>

            {/* Contenu de la page (Commerce) */}
            <div className="flex-1 overflow-hidden relative">
                {children}
            </div>
        </div>
    )
}
