import { RoutingRuleForm } from '@/features/admin/components/RoutingRuleForm'
import { getRoutingRuleById } from '@/features/tickets/actions/routing'
import { getStoresForSelect } from '@/features/admin/actions'
import { getClientsForSelect } from '@/features/clients/actions'
import { redirect } from 'next/navigation'

export default async function NewRoutingRulePage(props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    let initialData = null

    if (props.searchParams) {
        const params = await props.searchParams;
        const id = params?.id as string;

        if (id) {
            initialData = await getRoutingRuleById(id)
            if (!initialData) {
                redirect('/admin/routing')
            }
        }
    }

    // Load reference data from Server Actions
    const { data: clientsData } = await getClientsForSelect()
    const { data: storesData } = await getStoresForSelect()

    return (
        <div className="p-4 md:p-8">
            <RoutingRuleForm initialData={initialData} clients={clientsData || []} stores={storesData || []} />
        </div>
    )
}
