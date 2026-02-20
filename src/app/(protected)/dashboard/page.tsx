export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { HLDashboard } from '@/features/tickets/components/dashboards/HLDashboard'
import { CommerceDashboard } from '@/features/tickets/components/dashboards/CommerceDashboard'
import { SAVDashboard } from '@/features/tickets/components/dashboards/SAVDashboard'

export const metadata = {
    title: 'Portail | NexusSupport',
    description: 'Vos tickets et tableaux de bord',
}

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'STANDARD'

    return (
        <div className="w-full h-full max-w-7xl mx-auto">
            {role === 'COM' ? (
                <CommerceDashboard />
            ) : role === 'SAV1' || role === 'SAV2' ? (
                <SAVDashboard />
            ) : (
                <HLDashboard />
            )}
        </div>
    )
}
