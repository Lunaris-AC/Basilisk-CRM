export const dynamic = 'force-dynamic'

import { TicketDetailContent } from './TicketDetailContent'

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
    const p = await params
    return <TicketDetailContent ticketId={p.id} />
}
