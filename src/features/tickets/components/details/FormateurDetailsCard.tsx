'use client'

import { useState, useTransition } from 'react'
import { Pencil, CheckCircle2, CalendarDays, MapPin, GraduationCap, Loader2 } from 'lucide-react'
import { updateFormateurDetails } from '@/features/tickets/actions'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface FormateurDetails {
    travel_date?: string | null
    training_location?: string | null
    training_type?: string | null
}

export function FormateurDetailsCard({ ticketId, details, isClosed }: { ticketId: string, details?: FormateurDetails | null, isClosed?: boolean }) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Local form state - extract YYYY-MM-DD from ISO string for the date input
    const initialDate = details?.travel_date ? details.travel_date.split('T')[0] : ''
    const [date, setDate] = useState(initialDate)
    const [location, setLocation] = useState(details?.training_location || '')
    const [type, setType] = useState(details?.training_type || '')

    const handleUpdate = () => {
        startTransition(async () => {
            const res = await updateFormateurDetails(ticketId, {
                travel_date: date || undefined,
                training_location: location,
                training_type: type
            })
            if (res.error) {
                alert(res.error)
            } else {
                setIsEditModalOpen(false)
            }
        })
    }

    const formattedDate = details?.travel_date
        ? format(new Date(details.travel_date), 'dd MMMM yyyy', { locale: fr })
        : null

    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-emerald-500/20 backdrop-blur-md shadow-xl space-y-4 relative group overflow-hidden transition-all duration-300 hover:border-emerald-500/40">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />

            <div className="flex items-center justify-between relative z-10">
                <h3 className="text-sm font-bold tracking-wider text-emerald-300 uppercase flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Détails Formation
                </h3>
                {!isClosed && (
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-colors border border-emerald-500/20"
                        title="Modifier les détails"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 pt-2">
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <CalendarDays className="w-3.5 h-3.5 text-emerald-400/70" /> Date de déplacement
                    </p>
                    <p className="text-sm font-medium text-foreground capitalize">{formattedDate || <span className="text-muted-foreground italic">Non renseignée</span>}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400/70" /> Lieu
                    </p>
                    <p className="text-sm font-medium text-foreground">{details?.training_location || <span className="text-muted-foreground italic">Non renseigné</span>}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-400/70" /> Type de formation
                    </p>
                    <p className="text-sm font-medium text-foreground">{details?.training_type || <span className="text-muted-foreground italic">Non renseigné</span>}</p>
                </div>
            </div>

            {/* Modale d'édition */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="bg-primary border-emerald-500/20 text-foreground sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-emerald-300 flex items-center gap-2">
                            <GraduationCap className="w-5 h-5" />
                            Modifier les détails Formation
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Mettez à jour les informations de logistique pour ce formateur.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="date" className="text-sm font-medium text-foreground/80">Date de déplacement</Label>
                            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-black/40 border-white/10 text-foreground focus:ring-emerald-500/50" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location" className="text-sm font-medium text-foreground/80">Lieu de formation</Label>
                            <Input id="location" value={location} onChange={e => setLocation(e.target.value)} className="bg-black/40 border-white/10 text-foreground focus:ring-emerald-500/50" placeholder="Sur site, Distanciel..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type" className="text-sm font-medium text-foreground/80">Type de formation</Label>
                            <Input id="type" value={type} onChange={e => setType(e.target.value)} className="bg-black/40 border-white/10 text-foreground focus:ring-emerald-500/50" placeholder="Initiale..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-xl text-foreground/70 hover:bg-white/10 transition-colors">
                            Annuler
                        </button>
                        <button onClick={handleUpdate} disabled={isPending} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold disabled:opacity-50 flex items-center gap-2">
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Enregistrer
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
