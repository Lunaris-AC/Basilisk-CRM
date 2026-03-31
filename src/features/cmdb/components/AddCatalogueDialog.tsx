'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { addCatalogueItem } from '../actions'
import { RefreshCw, HardDrive } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AddCatalogueDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const CATEGORIES = [
    'PC',
    'Serveur',
    'Caisse',
    'TPE',
    'Imprimante',
    'Réseau',
    'Périphérique',
    'Autre'
]

export function AddCatalogueDialog({ open, onOpenChange }: AddCatalogueDialogProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const [category, setCategory] = useState('')
    const [brand, setBrand] = useState('')
    const [modelName, setModelName] = useState('')
    const [schemaStr, setSchemaStr] = useState('{\n  "os": "string",\n  "ram": "number"\n}')

    const resetForm = () => {
        setCategory('')
        setBrand('')
        setModelName('')
        setSchemaStr('{\n  "os": "string",\n  "ram": "number"\n}')
        setError(null)
    }

    const handleClose = (open: boolean) => {
        if (!open) resetForm()
        onOpenChange(open)
    }

    const handleSubmit = () => {
        if (!category || !brand.trim() || !modelName.trim()) {
            setError('Catégorie, marque et modèle sont requis.')
            return
        }

        let parsedSchema: Record<string, string> = {}
        if (schemaStr.trim()) {
            try {
                parsedSchema = JSON.parse(schemaStr)
                if (typeof parsedSchema !== 'object' || Array.isArray(parsedSchema)) {
                    throw new Error('Le schéma doit être un objet JSON valide.')
                }
            } catch (err) {
                setError('JSON invalide pour le schéma : ' + (err instanceof Error ? err.message : 'Erreur de parsing'))
                return
            }
        }

        setError(null)
        startTransition(async () => {
            const result = await addCatalogueItem({
                category,
                brand: brand.trim(),
                model_name: modelName.trim(),
                custom_fields_schema: parsedSchema,
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
            <DialogContent className="bg-zinc-950 border border-white/10 text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <HardDrive className="w-5 h-5 text-primary/80" />
                        </div>
                        <div>
                            <DialogTitle className="text-foreground">Nouveau Modèle</DialogTitle>
                            <DialogDescription className="text-muted-foreground">Ajouter un nouveau modèle d'équipement au catalogue.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-5 pt-2">
                    {error && (
                        <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Catégorie *</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-foreground">
                                <SelectValue placeholder="Sélectionner une catégorie..." />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-white/10">
                                {CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat} className="text-foreground/80 focus:bg-white/10 focus:text-foreground">
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Marque *</Label>
                        <Input
                            value={brand}
                            onChange={e => setBrand(e.target.value)}
                            placeholder="ex: Dell, HP, Epson..."
                            className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Modèle *</Label>
                        <Input
                            value={modelName}
                            onChange={e => setModelName(e.target.value)}
                            placeholder="ex: OptiPlex 7090, TM-T88VI..."
                            className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Schéma JSON (Champs personnalisés)</Label>
                        <Textarea
                            value={schemaStr}
                            onChange={e => setSchemaStr(e.target.value)}
                            placeholder={'{"os": "string", "ram": "number"}'}
                            className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground resize-none font-mono text-xs"
                            rows={6}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                            Types supportés: <code className="text-muted-foreground">string</code>, <code className="text-muted-foreground">number</code>, <code className="text-muted-foreground">boolean</code>, <code className="text-muted-foreground">date</code>
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => handleClose(false)}
                            className="flex-1 text-muted-foreground hover:text-foreground/80 border border-white/10 hover:border-white/20"
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary/80 border border-primary/30 hover:border-primary/50"
                        >
                            {isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                            Ajouter au catalogue
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
