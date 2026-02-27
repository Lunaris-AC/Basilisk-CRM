import { getQuoteById, QuoteStatus } from '@/features/commerce/actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, CheckCircle2, Clock, XCircle, FileCheck, MapPin, Building2, User } from 'lucide-react'
import { AcceptQuoteButton } from '@/features/commerce/components/AcceptQuoteButton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const STATUS_COLORS: Record<QuoteStatus, { bg: string, text: string, border: string, icon: any, label: string }> = {
    'BROUILLON': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', icon: FileText, label: 'Brouillon' },
    'EN_ATTENTE': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Clock, label: 'En attente' },
    'ACCEPTE': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: CheckCircle2, label: 'Accepté' },
    'REFUSE': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', icon: XCircle, label: 'Refusé' },
    'FACTURE': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', icon: FileCheck, label: 'Facturé' }
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isInternal = profile?.role === 'COM' || profile?.role === 'ADMIN' || profile?.role === 'N1' || profile?.role === 'N2' || profile?.role === 'N3' || profile?.role === 'N4'

    const quote = await getQuoteById(id)

    if (!quote) {
        return (
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-br from-slate-900 to-black relative flex items-center justify-center h-full">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" />
                <div className="relative z-10 text-center space-y-4">
                    <FileText className="w-16 h-16 text-white/20 mx-auto" />
                    <h2 className="text-2xl font-bold text-white">Devis introuvable</h2>
                    <p className="text-white/60">Ce devis n'existe pas ou vous n'y avez pas accès.</p>
                    <Link
                        href="/commerce"
                        className="inline-flex items-center gap-2 px-6 py-3 mt-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour aux devis
                    </Link>
                </div>
            </div>
        )
    }

    const StatusData = STATUS_COLORS[quote.status] || STATUS_COLORS['BROUILLON']
    const StatusIcon = StatusData.icon

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-br from-slate-900 to-black relative">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" />

            <div className="relative z-10 p-6 lg:p-10 flex flex-col min-h-full space-y-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/commerce"
                            className="p-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold text-white flex items-center gap-4">
                                Devis {quote.quote_number}
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${StatusData.bg} ${StatusData.text} ${StatusData.border}`}>
                                    <StatusIcon className="w-4 h-4" />
                                    {StatusData.label}
                                </div>
                            </h1>
                            <p className="text-white/50 text-sm">
                                Créé le {new Date(quote.created_at).toLocaleDateString('fr-FR', {
                                    day: '2-digit', month: 'long', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>
                    {/* Actions de devis */}
                    {(quote.status === 'BROUILLON' || quote.status === 'EN_ATTENTE') && (
                        <div className="flex shrink-0">
                            <AcceptQuoteButton quoteId={quote.id} signerId={user.id} />
                        </div>
                    )}
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
                        <div className="flex items-center gap-3 text-emerald-400">
                            <Building2 className="w-5 h-5" />
                            <h3 className="font-semibold text-lg">Informations Client</h3>
                        </div>
                        <div className="space-y-2 text-white/80">
                            {quote.client ? (
                                <>
                                    <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-white/40" /> <span className="font-medium text-white">{quote.client.company || 'Sans société'}</span></div>
                                    <div className="flex items-center gap-2"><User className="w-4 h-4 text-white/40" /> {quote.client.first_name} {quote.client.last_name}</div>
                                </>
                            ) : (
                                <span className="text-white/40 italic">Client introuvable</span>
                            )}
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
                        <div className="flex items-center gap-3 text-indigo-400">
                            <MapPin className="w-5 h-5" />
                            <h3 className="font-semibold text-lg">Magasin Livré</h3>
                        </div>
                        <div className="space-y-2 text-white/80">
                            {quote.store ? (
                                <>
                                    <div className="font-medium text-white text-lg">{quote.store.name}</div>
                                    <div className="flex items-center gap-2 text-white/60">
                                        <MapPin className="w-4 h-4" />
                                        {quote.store.city || 'Ville non renseignée'}
                                    </div>
                                </>
                            ) : (
                                <span className="text-white/40 italic">Magasin introuvable</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Lines Table */}
                <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 overflow-hidden flex flex-col">
                    <h3 className="text-xl font-semibold text-white/90 mb-4 px-2">Détail du devis</h3>
                    <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                                <TableRow>
                                    <TableHead className="font-semibold text-white/70 w-[40%]">Désignation</TableHead>
                                    <TableHead className="font-semibold text-center text-white/70 w-[10%]">Qté</TableHead>
                                    <TableHead className="font-semibold text-right text-white/70 w-[15%]">PU HT</TableHead>
                                    <TableHead className="font-semibold text-center text-white/70 w-[15%]">TVA</TableHead>
                                    <TableHead className="font-semibold text-right text-white/70 w-[20%]">Total Ligne HT</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quote.lines && quote.lines.length > 0 ? (
                                    quote.lines.map((line) => (
                                        <TableRow key={line.id} className="hover:bg-white/5 transition-colors">
                                            <TableCell className="font-medium text-white">{line.designation}</TableCell>
                                            <TableCell className="text-center text-white/80">{line.quantity}</TableCell>
                                            <TableCell className="text-right font-mono text-white/80">{formatCurrency(line.unit_price)}</TableCell>
                                            <TableCell className="text-center font-mono text-white/60">{line.tax_rate}%</TableCell>
                                            <TableCell className="text-right font-mono font-medium text-emerald-400">{formatCurrency(line.line_total)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-12 text-center text-white/40">Aucune ligne dans ce devis.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Resume financier */}
                <div className="flex justify-end">
                    <div className="w-full md:w-96 space-y-4 p-8 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/5 shadow-2xl">
                        <div className="flex justify-between text-white/70 text-lg">
                            <span>Total HT</span>
                            <span className="font-mono font-medium">{formatCurrency(quote.total_ht)}</span>
                        </div>
                        <div className="flex justify-between text-white/70 text-lg">
                            <span>Total TVA</span>
                            <span className="font-mono">{formatCurrency(quote.total_ttc - quote.total_ht)}</span>
                        </div>
                        <div className="h-px w-full bg-white/10 my-4" />
                        <div className="flex justify-between text-2xl font-bold text-white">
                            <span>Total TTC</span>
                            <span className="font-mono text-emerald-400">{formatCurrency(quote.total_ttc)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
