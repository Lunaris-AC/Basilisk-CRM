'use client'

import { useState, useTransition } from 'react'
import { Pencil, CheckCircle2, FileText, FileSpreadsheet, Briefcase, Loader2 } from 'lucide-react'
import { updateCommerceDetails } from '@/features/tickets/actions'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export interface CommerceDetails {
    quote_number?: string | null
    invoice_number?: string | null
    service_type?: string | null
}

export function CommerceDetailsCard({ ticketId, details, isClosed }: { ticketId: string, details?: CommerceDetails | null, isClosed?: boolean }) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Local form state
    const [quote, setQuote] = useState(details?.quote_number || '')
    const [invoice, setInvoice] = useState(details?.invoice_number || '')
    const [service, setService] = useState(details?.service_type || '')

    const handleUpdate = () => {
        startTransition(async () => {
            const res = await updateCommerceDetails(ticketId, {
                quote_number: quote,
                invoice_number: invoice,
                service_type: service
            })
            if (res.error) {
                alert(res.error)
            } else {
                setIsEditModalOpen(false)
            }
        })
    }

    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-primary/20 backdrop-blur-md shadow-xl space-y-4 relative group overflow-hidden transition-all duration-300 hover:border-primary/40">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />

            <div className="flex items-center justify-between relative z-10">
                <h3 className="text-sm font-bold tracking-wider text-primary/80 uppercase flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Détails Commerce
                </h3>
                {!isClosed && (
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary/80 transition-colors border border-primary/20"
                        title="Modifier les détails"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 pt-2">
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <FileText className="w-3.5 h-3.5 text-primary/70" /> Numéro de devis
                    </p>
                    <p className="text-sm font-medium text-foreground">{details?.quote_number || <span className="text-muted-foreground italic">Non renseigné</span>}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-primary/70" /> Numéro de facture
                    </p>
                    <p className="text-sm font-medium text-foreground">{details?.invoice_number || <span className="text-muted-foreground italic">Non renseigné</span>}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Briefcase className="w-3.5 h-3.5 text-primary/70" /> Type de prestation
                    </p>
                    <p className="text-sm font-medium text-foreground">{details?.service_type || <span className="text-muted-foreground italic">Non renseigné</span>}</p>
                </div>
            </div>

            {/* Modale d'édition */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="bg-card border-primary/20 text-foreground sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-primary/80 flex items-center gap-2">
                            <Briefcase className="w-5 h-5" />
                            Modifier les détails Commerce
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Mettez à jour les métadonnées commerciales de ce ticket.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="quote" className="text-sm font-medium text-foreground/80">Numéro de devis</Label>
                            <Input id="quote" value={quote} onChange={e => setQuote(e.target.value)} className="bg-black/40 border-white/10 text-foreground focus:ring-primary/50" placeholder="DEV-..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="invoice" className="text-sm font-medium text-foreground/80">Numéro de facture</Label>
                            <Input id="invoice" value={invoice} onChange={e => setInvoice(e.target.value)} className="bg-black/40 border-white/10 text-foreground focus:ring-primary/50" placeholder="FAC-..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service" className="text-sm font-medium text-foreground/80">Type de prestation</Label>
                            <Input id="service" value={service} onChange={e => setService(e.target.value)} className="bg-black/40 border-white/10 text-foreground focus:ring-primary/50" placeholder="Ex: Renouvellement" />
                        </div>
                    </div>
                    <DialogFooter>
                        <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-xl text-foreground/70 hover:bg-white/10 transition-colors">
                            Annuler
                        </button>
                        <button onClick={handleUpdate} disabled={isPending} className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/20 text-primary-foreground font-bold disabled:opacity-50 flex items-center gap-2">
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Enregistrer
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
