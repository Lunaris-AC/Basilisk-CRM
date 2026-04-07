import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getCatalogues, getEquipments, getLicenses } from '@/features/cmdb/actions'
import { CMDBPageContent } from '@/features/cmdb/components/CMDBPageContent'

export const metadata = {
    title: 'Parc Matériel (CMDB) — Basilisk Support ERP',
    description: 'Gestion du parc matériel et des licences logicielles',
}

const ALLOWED_ROLES = ['COM', 'SAV1', 'SAV2', 'DEV', 'ADMIN']

export default async function CMDBPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, support_level')
        .eq('id', user.id)
        .single()

    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
        redirect('/dashboard')
    }

    // Récupérer toutes les données initiales en parallèle
    const [equipments, licenses, catalogues] = await Promise.all([
        getEquipments(),
        getLicenses(),
        getCatalogues(),
    ])

    // Récupérer les magasins pour les formulaires de création
    const { data: stores } = await supabase
        .from('stores')
        .select('id, name, client:clients(company)')
        .order('name')

    return (
        <CMDBPageContent
            initialEquipments={equipments}
            initialLicenses={licenses}
            catalogues={catalogues}
            stores={(stores as any) ?? []}
        />
    )
}
