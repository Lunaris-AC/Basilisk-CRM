export const dynamic = 'force-dynamic'

import { IncidentsContent } from './IncidentsContent'

export const metadata = {
    title: 'Incidents | NexusSupport',
    description: 'File d\'attente des tickets non assignés',
}

export default function IncidentsPage() {
    return (
        <div className="w-full h-full max-w-7xl mx-auto">
            <IncidentsContent />
        </div>
    )
}
