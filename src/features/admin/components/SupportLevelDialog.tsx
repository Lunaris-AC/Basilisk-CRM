'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { SupportLevel, addSupportLevel, updateSupportLevel } from '@/features/admin/actions/support-levels'

interface SupportLevelDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    level?: SupportLevel | null
    onSuccess: () => void
}

export function SupportLevelDialog({ open, onOpenChange, level, onSuccess }: SupportLevelDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        rank: 1,
        color: '#ffffff'
    })

    useEffect(() => {
        if (level) {
            setFormData({
                name: level.name,
                rank: level.rank,
                color: level.color
            })
        } else {
            setFormData({
                name: '',
                rank: 1,
                color: '#ffffff'
            })
        }
    }, [level, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            let res
            if (level) {
                res = await updateSupportLevel(level.id, formData)
            } else {
                res = await addSupportLevel(formData)
            }

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(level ? "Niveau modifié avec succès" : "Niveau ajouté avec succès")
                onOpenChange(false)
                onSuccess()
            }
        } catch (err) {
            console.error(err)
            toast.error("Une erreur inattendue est survenue.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border border-white/10 text-foreground sm:max-w-[425px] overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <DialogHeader className="relative z-10">
                    <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary bg-clip-text text-transparent">
                        {level ? "Modifier le niveau" : "Nouveau niveau"}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Définissez le nom, le rang hiérarchique et la couleur du badge.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-1 relative z-10">
                    <div className="space-y-2">
                        <Label className="text-foreground/70 text-xs uppercase tracking-wider font-semibold">Nom du niveau <span className="text-rose-500">*</span></Label>
                        <Input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: N1 - Helpdesk"
                            className="bg-white/5 border-white/10 text-foreground placeholder:text-foreground/20 focus-visible:ring-primary h-11 rounded-xl"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-foreground/70 text-xs uppercase tracking-wider font-semibold">Rang (Hiérarchie) <span className="text-rose-500">*</span></Label>
                        <Input
                            type="number"
                            required
                            min="1"
                            value={formData.rank}
                            onChange={e => setFormData({ ...formData, rank: parseInt(e.target.value) || 1 })}
                            className="bg-white/5 border-white/10 text-foreground focus-visible:ring-primary h-11 rounded-xl"
                        />
                        <p className="text-[10px] text-muted-foreground italic px-1">Le rang définit l&apos;ordre d&apos;escalade (1 = plus bas).</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-foreground/70 text-xs uppercase tracking-wider font-semibold">Couleur du Badge <span className="text-rose-500">*</span></Label>
                        <div className="flex gap-3">
                            <div className="relative group overflow-hidden rounded-xl border border-white/10 w-12 h-11">
                                <Input
                                    type="color"
                                    value={formData.color}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                    className="absolute inset-[-10px] w-[200%] h-[200%] cursor-pointer border-none p-0 bg-transparent"
                                />
                            </div>
                            <div className="relative flex-1">
                                <Input
                                    value={formData.color}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                    className="bg-white/5 border-white/10 text-foreground uppercase font-mono h-11 rounded-xl pl-9"
                                    placeholder="#HEX"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">#</span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-8 gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-muted-foreground hover:text-foreground hover:bg-white/10 h-11 rounded-xl"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary text-foreground font-bold h-11 rounded-xl px-6 border-none shadow-lg shadow-primary/20"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {level ? "Enregistrer" : "Créer le niveau"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
