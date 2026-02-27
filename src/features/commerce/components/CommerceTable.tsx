'use client'

import { useState } from 'react'
import { Quote } from '@/features/commerce/actions'
import { FileText, Search, Clock, CheckCircle2, XCircle, FileCheck, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const STATUS_COLORS: Record<string, { bg: string, text: string, border: string, icon: any, label: string }> = {
    'BROUILLON': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', icon: FileText, label: 'Brouillon' },
    'EN_ATTENTE': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Clock, label: 'En attente' },
    'ACCEPTE': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: CheckCircle2, label: 'Accepté' },
    'REFUSE': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', icon: XCircle, label: 'Refusé' },
    'FACTURE': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', icon: FileCheck, label: 'Facturé' }
}

export function CommerceTable({ quotes }: { quotes: Quote[] }) {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredQuotes = quotes.filter(q =>
        q.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.store?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                        type="text"
                        placeholder="Rechercher un devis (numéro, magasin)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-white/50">
                    <span className="font-semibold text-white/90">{filteredQuotes.length}</span> devis trouvé(s)
                </div>
            </div>

            <div className="rounded-xl border border-white/10 overflow-hidden relative">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left align-middle text-white/80">
                        <thead className="text-xs uppercase bg-white/5 text-white/60">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Numéro</th>
                                <th className="px-6 py-4 font-semibold">Magasin / Client</th>
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold">Total HT</th>
                                <th className="px-6 py-4 font-semibold">Total TTC</th>
                                <th className="px-6 py-4 font-semibold">Statut</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredQuotes.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-white/40">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="w-8 h-8 opacity-50" />
                                            <p>Aucun devis trouvé.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredQuotes.map((quote) => {
                                    const StatusData = STATUS_COLORS[quote.status] || STATUS_COLORS['BROUILLON']
                                    const StatusIcon = StatusData.icon

                                    return (
                                        <tr key={quote.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-white group-hover:text-rose-200 transition-colors">
                                                {quote.quote_number}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-white/90">{quote.store?.name || 'Magasin Inconnu'}</span>
                                                    <span className="text-xs text-white/40 font-mono">{quote.client_id.substring(0, 8)}...</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-white/60">
                                                {new Date(quote.created_at).toLocaleDateString('fr-FR', {
                                                    day: '2-digit', month: 'short', year: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-white/80">
                                                {quote.total_ht.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-white">
                                                {quote.total_ttc.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${StatusData.bg} ${StatusData.text} ${StatusData.border}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {StatusData.label}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <Link
                                                    href={`/commerce/${quote.id}`}
                                                    className="inline-block p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
