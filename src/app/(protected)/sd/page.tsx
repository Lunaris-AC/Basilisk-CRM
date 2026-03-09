export const dynamic = 'force-dynamic'

import { SDContent } from './SDContent'

export const metadata = {
    title: 'Portail SD | Basilisk Support ERP',
    description: 'File des SD — Bugs et Évolutions du département Développement',
}

export default function SDPage() {
    return (
        <div className="w-full h-full max-w-7xl mx-auto">
            <SDContent />
        </div>
    )
}
