import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AdminDebugContent } from './AdminDebugContent'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'GOD MODE | Admin Debug',
    description: 'Interface d\'administration secrète',
}

export default async function AdminDebugPage() {
    const supabase = await createClient()

    // Vérification stricte du rôle N4 (ADMIN) côté serveur
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase.from('profiles').select('role, support_level').eq('id', user.id).single()

    if ((profile?.role !== 'TECHNICIEN' || profile?.support_level !== 'N4') && profile?.role !== 'ADMIN') {
        // Renvoi brutal vers le dashboard si c'est pas un admin
        redirect('/dashboard')
    }

    // On fetch les users pour le dropdown de l'UI
    const { data: allUsers } = await supabase.from('profiles').select('id, first_name, last_name, role').order('last_name')

    return (
        <div className="w-full h-full max-w-7xl mx-auto">
            <AdminDebugContent users={allUsers || []} />
        </div>
    )
}
