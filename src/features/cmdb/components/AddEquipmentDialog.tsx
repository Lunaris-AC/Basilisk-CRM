'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createEquipment } from '../actions'
import type { EquipmentCatalogue } from '../actions'
import { RefreshCw, Server } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Store {
    id: string
    name: string
    client?: { company: string } | null
}

interface AddEquipmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    catalogues: EquipmentCatalogue[]
    stores: Store[]
}

export function AddEquipmentDialog({ open, onOpenChange, catalogues, stores }: AddEquipmentDialogProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    // Form fields
    const [catalogueId, setCatalogueId] = useState('')
    const [storeId, setStoreId] = useState('')
    const [serialNumber, setSerialNumber] = useState('')
    const [purchaseDate, setPurchaseDate] = useState('')
    const [warrantyEndDate, setWarrantyEndDate] = useState('')
    const [notes, setNotes] = useState('')
    const [customFields, setCustomFields] = useState<Record<string, string>>({})

    const selectedCatalogue = catalogues.find(c => c.id === catalogueId)

    // Reset form
    const resetForm = () => {
        setCatalogueId('')
        setStoreId('')
        setSerialNumber('')
        setPurchaseDate('')
        setWarrantyEndDate('')
        setNotes('')
        setCustomFields({})
        setError(null)
    }

    const handleClose = (open: boolean) => {
        if (!open) resetForm()
        onOpenChange(open)
    }

    const handleSubmit = () => {
        if (!catalogueId || !storeId || !serialNumber.trim()) {
            setError('Modèle, magasin et numéro de série sont requis.')
            return
        }
        setError(null)
        startTransition(async () => {
            // Convert custom fields to proper types
            const schema = selectedCatalogue?.custom_fields_schema ?? {}
            const typedData: Record<string, unknown> = {}
            for (const [key, type] of Object.entries(schema)) {
                const val = customFields[key]
                if (val === undefined || val === '') continue
                if (type === 'number') typedData[key] = parseFloat(val) || 0
                else if (type === 'boolean') typedData[key] = val === 'true'
                else typedData[key] = val
            }

            const result = await createEquipment({
                catalogue_id: catalogueId,
                store_id: storeId,
                serial_number: serialNumber.trim(),
                purchase_date: purchaseDate || null,
                warranty_end_date: warrantyEndDate || null,
                custom_fields_data: typedData,
                notes: notes.trim() || null,
            })

            if (result.error) {
                setError(result.error)
            } else {
                handleClose(false)
                router.refresh()
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <Server className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-white">Ajouter un équipement</DialogTitle>
                            <DialogDescription className="text-white/40">Enregistrer une nouvelle machine dans le parc matériel.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-5 pt-2">
                    {error && (
                        <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Modèle */}
                    <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs uppercase tracking-wider">Modèle *</Label>
                        <Select value={catalogueId} onValueChange={val => { setCatalogueId(val); setCustomFields({}) }}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Sélectionner un modèle..." />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10">
                                {catalogues.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id} className="text-white/80 focus:bg-white/10 focus:text-white">
                                        <span className="text-white/40 text-xs mr-1">[{cat.category}]</span> {cat.brand} {cat.model_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Magasin */}
                    <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs uppercase tracking-wider">Magasin *</Label>
                        <Select value={storeId} onValueChange={setStoreId}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Sélectionner un magasin..." />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10">
                                {stores.map(store => (
                                    <SelectItem key={store.id} value={store.id} className="text-white/80 focus:bg-white/10 focus:text-white">
                                        {store.name}
                                        {store.client && <span className="text-white/40 ml-1 text-xs">({store.client.company})</span>}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Numéro de série */}
                    <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs uppercase tracking-wider">Numéro de série *</Label>
                        <Input
                            value={serialNumber}
                            onChange={e => setSerialNumber(e.target.value)}
                            placeholder="ex: ABC123XYZ456"
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono"
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-white/60 text-xs uppercase tracking-wider">Date d'achat</Label>
                            <Input
                                type="date"
                                value={purchaseDate}
                                onChange={e => setPurchaseDate(e.target.value)}
                                className="bg-white/5 border-white/10 text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-white/60 text-xs uppercase tracking-wider">Fin de garantie</Label>
                            <Input
                                type="date"
                                value={warrantyEndDate}
                                onChange={e => setWarrantyEndDate(e.target.value)}
                                className="bg-white/5 border-white/10 text-white"
                            />
                        </div>
                    </div>

                    {/* Champs dynamiques du catalogue */}
                    {selectedCatalogue && Object.keys(selectedCatalogue.custom_fields_schema).length > 0 && (
                        <div className="space-y-3 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Spécifications ({selectedCatalogue.model_name})</p>
                            {Object.entries(selectedCatalogue.custom_fields_schema).map(([key, type]) => (
                                <div key={key} className="space-y-1.5">
                                    <Label className="text-white/60 text-xs capitalize">{key.replace(/_/g, ' ')}</Label>
                                    {type === 'boolean' ? (
                                        <Select value={customFields[key] ?? ''} onValueChange={val => setCustomFields(prev => ({ ...prev, [key]: val }))}>
                                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                                <SelectValue placeholder="Sélectionner..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-white/10">
                                                <SelectItem value="true" className="text-white/80 focus:bg-white/10 focus:text-white">✅ Oui</SelectItem>
                                                <SelectItem value="false" className="text-white/80 focus:bg-white/10 focus:text-white">❌ Non</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                                            value={customFields[key] ?? ''}
                                            onChange={e => setCustomFields(prev => ({ ...prev, [key]: e.target.value }))}
                                            placeholder={type === 'number' ? '0' : '...'}
                                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs uppercase tracking-wider">Notes (optionnel)</Label>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Remarques, état d'arrivée, historique..."
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                            rows={3}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => handleClose(false)}
                            className="flex-1 text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20"
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50"
                        >
                            {isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                            Enregistrer l'équipement
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
