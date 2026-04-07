import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { QuoteBuilder } from '@/features/commerce/components/QuoteBuilder'
import { getCommercialCatalogue } from '@/features/commerce/actions'

export default async function NewQuotePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, support_level')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'COM' && profile?.role !== 'ADMIN') {
        redirect('/dashboard')
    }

    const catalogue = await getCommercialCatalogue()

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-br from-primary to-black relative">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" />
            <div className="relative z-10 p-6 lg:p-10 flex flex-col min-h-full">
                <QuoteBuilder catalogue={catalogue} />
            </div>
        </div>
    )
}
