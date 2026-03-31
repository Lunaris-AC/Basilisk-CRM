'use client'

import { useState, useTransition, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { sendToRMA, updateEquipment, getEquipmentTickets } from '../actions'
import type { Equipment, EquipmentStatus } from '../actions'
import { format, isPast } from 'date-fns'
import { fr } from 'date-fns/locale'
import { PackageCheck, ExternalLink, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'


const STATUS_OPTIONS: { value: EquipmentStatus; label: string }[] = [
    { value: 'EN_SERVICE', label: '✅ En service' },
    { value: 'EN_PANNE', label: '🔴 En panne' },
    { value: 'EN_REPARATION_INTERNE', label: '🔧 Réparation interne' },
    { value: 'RMA_FOURNISSEUR', label: '📦 RMA Fournisseur' },
    { value: 'REBUT', label: '🗑 Rebut' },
]

const STATUS_COLORS: Record<string, string> = {
    EN_SERVICE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    EN_PANNE: 'bg-red-500/15 text-red-300 border-red-500/30',
    EN_REPARATION_INTERNE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    RMA_FOURNISSEUR: 'bg-primary/15 text-primary/80 border-primary/30',
    REBUT: 'bg-primary/15 text-primary/80 border-primary/30',
}

interface LinkedTicket {
    id: string
    title: string
    status: string
    priority: string
    created_at: string
}

interface EquipmentSheetProps {
    equipment: Equipment
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EquipmentSheet({ equipment, open, onOpenChange }: EquipmentSheetProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [rmaTracking, setRmaTracking] = useState(equipment.rma_tracking_number ?? '')
    const [rmaMode, setRmaMode] = useState(false)
    const [newStatus, setNewStatus] = useState<EquipmentStatus>(equipment.status)
    const [linkedTickets, setLinkedTickets] = useState<LinkedTicket[]>([])
    const [loadingTickets, setLoadingTickets] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; msg: string } | null>(null)

    useEffect(() => {
        if (open) {
            setLoadingTickets(true)
            getEquipmentTickets(equipment.id)
                .then(data => setLinkedTickets(data as LinkedTicket[]))
                .finally(() => setLoadingTickets(false))
        }
    }, [open, equipment.id])

    const handleSendRMA = () => {
        if (!rmaTracking.trim()) {
            setFeedback({ type: 'error', msg: 'Le numéro de suivi est requis.' })
            return
        }
        startTransition(async () => {
            const result = await sendToRMA(equipment.id, rmaTracking)
            if (result.error) {
                setFeedback({ type: 'error', msg: result.error })
            } else {
                setFeedback({ type: 'success', msg: 'Équipement envoyé en RMA avec succès.' })
                setRmaMode(false)
                router.refresh()
            }
        })
    }

    const handleStatusChange = (val: string) => {
        const s = val as EquipmentStatus
        setNewStatus(s)
        startTransition(async () => {
            const result = await updateEquipment(equipment.id, { status: s })
            if (result.error) {
                setFeedback({ type: 'error', msg: result.error })
            } else {
                setFeedback({ type: 'success', msg: 'Statut mis à jour.' })
                router.refresh()
            }
        })
    }

    const warrantyExpired = equipment.warranty_end_date ? isPast(new Date(equipment.warranty_end_date)) : null

    // Dynamic custom fields rendering
    const schema = equipment.catalogue?.custom_fields_schema ?? {}
    const data = equipment.custom_fields_data ?? {}

    const fieldTypeIcon: Record<string, string> = {
        string: '📝',
        number: '🔢',
        boolean: '✅',
        date: '📅',
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[480px] sm:w-[540px] bg-zinc-950/95 border-l border-white/10 backdrop-blur-xl overflow-y-auto">
                <SheetHeader className="pb-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <span className="text-lg">🖥️</span>
                        </div>
                        <div>
                            <SheetTitle className="text-foreground text-lg font-bold leading-tight">
                                {equipment.catalogue?.brand} {equipment.catalogue?.model_name}
                            </SheetTitle>
                            <SheetDescription className="font-mono text-cyan-400/70 text-xs">
                                {equipment.serial_number}
                            </SheetDescription>
                        </div>
                    </div>
                    <span className={`self-start inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[equipment.status] ?? 'bg-white/10 text-muted-foreground border-white/10'}`}>
                        {STATUS_OPTIONS.find(s => s.value === equipment.status)?.label ?? equipment.status}
                    </span>
                </SheetHeader>

                {/* Feedback */}
                {feedback && (
                    <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm font-medium border ${feedback.type === 'error' ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
                        {feedback.msg}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Infos générales */}
                    <section>
                        <h3 className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground mb-3">Informations générales</h3>
                        <div className="rounded-xl bg-white/[0.03] border border-white/5 divide-y divide-white/5">
                            <div className="flex justify-between items-center px-4 py-3">
                                <span className="text-sm text-muted-foreground">Catégorie</span>
                                <span className="text-sm text-foreground/80 font-medium">{equipment.catalogue?.category}</span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-3">
                                <span className="text-sm text-muted-foreground">Magasin</span>
                                <span className="text-sm text-foreground/80 font-medium">{equipment.store?.name}</span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-3">
                                <span className="text-sm text-muted-foreground">Client</span>
                                <span className="text-sm text-foreground/80 font-medium">{equipment.store?.client?.company ?? '—'}</span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-3">
                                <span className="text-sm text-muted-foreground">Date d'achat</span>
                                <span className="text-sm text-foreground/80">
                                    {equipment.purchase_date ? format(new Date(equipment.purchase_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-3">
                                <span className="text-sm text-muted-foreground">Fin de garantie</span>
                                <span className={`text-sm font-medium ${warrantyExpired ? 'text-red-400' : warrantyExpired === false ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                    {equipment.warranty_end_date
                                        ? format(new Date(equipment.warranty_end_date), 'dd MMM yyyy', { locale: fr }) + (warrantyExpired ? ' ⚠️' : ' ✓')
                                        : '—'}
                                </span>
                            </div>
                            {equipment.rma_tracking_number && (
                                <div className="flex justify-between items-center px-4 py-3">
                                    <span className="text-sm text-muted-foreground">N° Suivi RMA</span>
                                    <span className="text-sm font-mono text-primary/80">{equipment.rma_tracking_number}</span>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Champ dynamiques */}
                    {Object.keys(schema).length > 0 && (
                        <section>
                            <h3 className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground mb-3">Spécifications techniques</h3>
                            <div className="rounded-xl bg-white/[0.03] border border-white/5 divide-y divide-white/5">
                                {Object.entries(schema).map(([key, type]) => {
                                    const raw = data[key]
                                    const display = raw === undefined || raw === null
                                        ? '—'
                                        : type === 'boolean'
                                            ? (raw ? '✅ Oui' : '❌ Non')
                                            : String(raw)
                                    return (
                                        <div key={key} className="flex justify-between items-center px-4 py-3">
                                            <span className="text-sm text-muted-foreground capitalize">
                                                {fieldTypeIcon[type as string] ?? ''} {key.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-sm text-foreground/80 font-medium">{display}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    {/* Modifier le statut */}
                    <section>
                        <h3 className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground mb-3">Changer le statut</h3>
                        <Select value={newStatus} onValueChange={handleStatusChange} disabled={isPending}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-foreground">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-white/10">
                                {STATUS_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-foreground/80 focus:bg-white/10 focus:text-foreground">
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </section>

                    {/* Action RMA */}
                    {equipment.status !== 'RMA_FOURNISSEUR' && equipment.status !== 'REBUT' && (
                        <section>
                            <h3 className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground mb-3">Retour fournisseur (RMA)</h3>
                            {!rmaMode ? (
                                <button
                                    onClick={() => setRmaMode(true)}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary/80 text-sm font-medium transition-all duration-200"
                                >
                                    <PackageCheck className="w-4 h-4" />
                                    Initier un retour RMA
                                </button>
                            ) : (
                                <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                                    <Label className="text-muted-foreground text-xs">Numéro de suivi fournisseur</Label>
                                    <Input
                                        value={rmaTracking}
                                        onChange={e => setRmaTracking(e.target.value)}
                                        placeholder="ex: RMA-2024-00123"
                                        className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleSendRMA}
                                            disabled={isPending}
                                            className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary/80 border border-primary/30"
                                        >
                                            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                                            Confirmer RMA
                                        </Button>
                                        <Button variant="ghost" onClick={() => setRmaMode(false)} className="text-muted-foreground hover:text-muted-foreground">
                                            Annuler
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Tickets liés */}
                    <section>
                        <h3 className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground mb-3">Tickets liés</h3>
                        {loadingTickets ? (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Chargement...
                            </div>
                        ) : linkedTickets.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-2">Aucun ticket lié à cet équipement.</p>
                        ) : (
                            <div className="rounded-xl bg-white/[0.03] border border-white/5 divide-y divide-white/5">
                                {linkedTickets.map(ticket => (
                                    <a
                                        key={ticket.id}
                                        href={`/tickets/${ticket.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group"
                                    >
                                        <div>
                                            <div className="text-sm text-foreground/80 font-medium group-hover:text-foreground transition-colors line-clamp-1">
                                                {ticket.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: fr })}
                                            </div>
                                        </div>
                                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-muted-foreground flex-shrink-0 ml-3" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Notes */}
                    {equipment.notes && (
                        <section>
                            <h3 className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground mb-3">Notes</h3>
                            <p className="text-sm text-muted-foreground bg-white/[0.03] border border-white/5 rounded-xl p-4 leading-relaxed">
                                {equipment.notes}
                            </p>
                        </section>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
