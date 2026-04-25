'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { createSuggestion } from '../actions'
import { toast } from 'sonner'
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function NewSuggestionForm() {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !description.trim()) return

        setIsSubmitting(true)
        const res = await createSuggestion(title, description)
        
        if (res?.success) {
            toast.success('Suggestion soumise ! Merci pour votre contribution.')
            setTitle('')
            setDescription('')
            setIsOpen(false)
        } else {
            toast.error(res?.error || 'Une erreur est survenue.')
        }
        setIsSubmitting(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4" />
                    Nouvelle Idée
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-2xl border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Proposer une amélioration</DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium">
                        Partagez vos idées pour rendre Basilisk encore plus puissant.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                            Titre de l'idée
                        </Label>
                        <Input
                            id="title"
                            placeholder="Ex: Mode sombre automatique"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                            Description détaillée
                        </Label>
                        <Textarea
                            id="description"
                            placeholder="Expliquez comment cela aiderait les utilisateurs..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            rows={5}
                            className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setIsOpen(false)}
                            className="rounded-xl font-bold"
                        >
                            Annuler
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting || !title.trim() || !description.trim()}
                            className="rounded-xl font-bold min-w-[120px]"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
