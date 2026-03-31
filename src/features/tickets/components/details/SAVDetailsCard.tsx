'use client'

import { useState, useTransition } from 'react'
import { Pencil, CheckCircle2, Cpu, Wrench, ShieldAlert, Loader2 } from 'lucide-react'
import { updateSAVDetails } from '@/features/tickets/actions'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export interface SAVDetails {
    serial_number?: string | null
    product_reference?: string | null
    hardware_status?: string | null
}

export function SAVDetailsCard({ ticketId, details, isClosed }: { ticketId: string, details?: SAVDetails | null, isClosed?: boolean }) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Local form state
    const [serial, setSerial] = useState(details?.serial_number || '')
    const [ref, setRef] = useState(details?.product_reference || '')
    const [status, setStatus] = useState(details?.hardware_status || '')

    const handleUpdate = () => {
        startTransition(async () => {
            const res = await updateSAVDetails(ticketId, {
                serial_number: serial,
                product_reference: ref,
                hardware_status: status
            })
            if (res.error) {
                alert(res.error)
            } else {
                setIsEditModalOpen(false)
            }
        })
    }

    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-rose-500/20 backdrop-blur-md shadow-xl space-y-4 relative group overflow-hidden transition-all duration-300 hover:border-rose-500/40">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition-colors" />

            <div className="flex items-center justify-between relative z-10">
                <h3 className="text-sm font-bold tracking-wider text-rose-300 uppercase flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Détails SAV
                </h3>
                {!isClosed && (
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors border border-rose-500/20"
                        title="Modifier les détails"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 pt-2">
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Cpu className="w-3.5 h-3.5 text-rose-400/70" /> Numéro de série
                    </p>
                    <p className="text-sm font-medium text-foreground">{details?.serial_number || <span className="text-muted-foreground italic">Non renseigné</span>}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <FileText className="w-3.5 h-3.5 text-rose-400/70" /> Référence Produit
                    </p>
                    <p className="text-sm font-medium text-foreground">{details?.product_reference || <span className="text-muted-foreground italic">Non renseigné</span>}</p>
                </div>
                <div className="space-y-1 md:col-span-2 lg:col-span-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400/70" /> État du matériel
                    </p>
                    {details?.hardware_status ? (
                        <span className="inline-block px-2 py-1 bg-rose-500/10 text-rose-200 rounded text-xs font-semibold border border-rose-500/20">{details.hardware_status}</span>
                    ) : (
                        <span className="text-sm text-muted-foreground italic">Non renseigné</span>
                    )}
                </div>
            </div>

            {/* Modale d'édition */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="bg-card border-rose-500/20 text-foreground sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-rose-300 flex items-center gap-2">
                            <Wrench className="w-5 h-5" />
                            Modifier les détails SAV
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Mettez à jour les informations matérielles.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="serial" className="text-sm font-medium text-foreground/80">Numéro de série</Label>
                            <Input id="serial" value={serial} onChange={e => setSerial(e.target.value)} className="bg-black/40 border-white/10 text-foreground focus:ring-rose-500/50" placeholder="SN-..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ref" className="text-sm font-medium text-foreground/80">Référence Produit</Label>
                            <Input id="ref" value={ref} onChange={e => setRef(e.target.value)} className="bg-black/40 border-white/10 text-foreground focus:ring-rose-500/50" placeholder="Modèle exact" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-sm font-medium text-foreground/80">État du matériel</Label>
                            <Input id="status" value={status} onChange={e => setStatus(e.target.value)} className="bg-black/40 border-white/10 text-foreground focus:ring-rose-500/50" placeholder="Ex: Écran cassé" />
                        </div>
                    </div>
                    <DialogFooter>
                        <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-xl text-foreground/70 hover:bg-white/10 transition-colors">
                            Annuler
                        </button>
                        <button onClick={handleUpdate} disabled={isPending} className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold disabled:opacity-50 flex items-center gap-2">
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Enregistrer
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
// Hack to fix lucide icon import in the generated code
import { FileText } from 'lucide-react'
