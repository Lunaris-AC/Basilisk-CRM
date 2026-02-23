'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createLicense } from '../actions'
import { RefreshCw, Key } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Store {
    id: string
    name: string
    client?: { company: string } | null
}

interface AddLicenseDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    stores: Store[]
}

export function AddLicenseDialog({ open, onOpenChange, stores }: AddLicenseDialogProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const [storeId, setStoreId] = useState('')
    const [softwareName, setSoftwareName] = useState('')
    const [licenseKey, setLicenseKey] = useState('')
    const [seatCount, setSeatCount] = useState('1')
    const [activationDate, setActivationDate] = useState('')
    const [expirationDate, setExpirationDate] = useState('')
    const [isPerpetual, setIsPerpetual] = useState(false)
    const [notes, setNotes] = useState('')

    const resetForm = () => {
        setStoreId('')
        setSoftwareName('')
        setLicenseKey('')
        setSeatCount('1')
        setActivationDate('')
        setExpirationDate('')
        setIsPerpetual(false)
        setNotes('')
        setError(null)
    }

    const handleClose = (open: boolean) => {
        if (!open) resetForm()
        onOpenChange(open)
    }

    const handleSubmit = () => {
        if (!storeId || !softwareName.trim() || !licenseKey.trim()) {
            setError('Magasin, nom du logiciel et clé de licence sont requis.')
            return
        }
        const seats = parseInt(seatCount)
        if (isNaN(seats) || seats < 1) {
            setError('Le nombre de sièges doit être au moins 1.')
            return
        }

        setError(null)
        startTransition(async () => {
            const result = await createLicense({
                store_id: storeId,
                software_name: softwareName.trim(),
                license_key: licenseKey.trim(),
                seat_count: seats,
                activation_date: activationDate || null,
                expiration_date: isPerpetual ? null : (expirationDate || null),
                is_active: true,
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
            <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                            <Key className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-white">Ajouter une licence</DialogTitle>
                            <DialogDescription className="text-white/40">Enregistrer une nouvelle clé logicielle pour un magasin.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-5 pt-2">
                    {error && (
                        <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

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

                    {/* Nom du logiciel */}
                    <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs uppercase tracking-wider">Nom du logiciel *</Label>
                        <Input
                            value={softwareName}
                            onChange={e => setSoftwareName(e.target.value)}
                            placeholder="ex: Microsoft 365 Business, Antivirus Endpoint..."
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        />
                    </div>

                    {/* Clé de licence */}
                    <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs uppercase tracking-wider">Clé de licence *</Label>
                        <Input
                            value={licenseKey}
                            onChange={e => setLicenseKey(e.target.value)}
                            placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono"
                        />
                    </div>

                    {/* Nombre de sièges */}
                    <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs uppercase tracking-wider">Nombre de sièges *</Label>
                        <Input
                            type="number"
                            min="1"
                            value={seatCount}
                            onChange={e => setSeatCount(e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-white/60 text-xs uppercase tracking-wider">Date d'activation</Label>
                            <Input
                                type="date"
                                value={activationDate}
                                onChange={e => setActivationDate(e.target.value)}
                                className="bg-white/5 border-white/10 text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-white/60 text-xs uppercase tracking-wider">Date d'expiration</Label>
                            <Input
                                type="date"
                                value={expirationDate}
                                onChange={e => setExpirationDate(e.target.value)}
                                disabled={isPerpetual}
                                className="bg-white/5 border-white/10 text-white disabled:opacity-30"
                            />
                        </div>
                    </div>

                    {/* Licence perpétuelle */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => { setIsPerpetual(!isPerpetual); setExpirationDate('') }}
                            className={`relative w-10 h-5 rounded-full transition-all duration-200 ${isPerpetual ? 'bg-emerald-500/40 border-emerald-500/50' : 'bg-white/10 border-white/20'} border`}
                        >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${isPerpetual ? 'left-5 bg-emerald-400' : 'left-0.5 bg-white/50'}`} />
                        </button>
                        <Label className="text-white/50 text-sm cursor-pointer" onClick={() => { setIsPerpetual(!isPerpetual); setExpirationDate('') }}>
                            Licence perpétuelle (aucune expiration)
                        </Label>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs uppercase tracking-wider">Notes (optionnel)</Label>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Revendeur, contact support, conditions..."
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                            rows={2}
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
                            className="flex-1 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 hover:border-violet-500/50"
                        >
                            {isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                            Enregistrer la licence
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
