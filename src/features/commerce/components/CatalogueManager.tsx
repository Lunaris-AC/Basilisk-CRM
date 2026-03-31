'use client'

import { useState, useEffect } from 'react'
import { CommercialCatalogueItem, ItemType, addCatalogueItem, deleteCatalogueItem, updateCatalogueItem, getEquipmentModelsForSelect } from '@/features/commerce/actions'
import { Plus, Package, BookOpen, Wrench, Search, Pencil, Trash2, Loader2, Euro } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const TYPE_ICONS: Record<ItemType, any> = {
    'MATERIEL': Package,
    'LICENCE': BookOpen,
    'SERVICE': Wrench
}

const TYPE_COLORS: Record<ItemType, string> = {
    'MATERIEL': 'text-primary/80 bg-primary/10 border-primary/20',
    'LICENCE': 'text-primary/80 bg-primary/10 border-primary/20',
    'SERVICE': 'text-orange-400 bg-orange-500/10 border-orange-500/20'
}

export function CatalogueManager({ catalogue }: { catalogue: CommercialCatalogueItem[] }) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState<ItemType | 'ALL'>('ALL')
    const [equipmentModels, setEquipmentModels] = useState<{ id: string, label: string }[]>([])

    useEffect(() => {
        getEquipmentModelsForSelect().then(res => {
            if (res.success && res.data) {
                setEquipmentModels(res.data)
            }
        })
    }, [])

    // Form State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        type: 'MATERIEL' as ItemType,
        default_price: 0,
        tax_rate: 20,
        equipment_model_id: null as string | null
    })

    const filteredItems = catalogue.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = typeFilter === 'ALL' || item.type === typeFilter
        return matchesSearch && matchesType
    })

    const openCreate = () => {
        setEditingId(null)
        setFormData({ name: '', type: 'MATERIEL', default_price: 0, tax_rate: 20, equipment_model_id: null })
        setIsDialogOpen(true)
    }

    const openEdit = (item: CommercialCatalogueItem) => {
        setEditingId(item.id)
        setFormData({
            name: item.name,
            type: item.type,
            default_price: item.default_price,
            tax_rate: item.tax_rate,
            equipment_model_id: item.equipment_model_id || null
        })
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm("Voulez-vous vraiment supprimer cet article ?")) return
        const res = await deleteCatalogueItem(id)
        if (res.success) {
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            let res
            if (editingId) {
                res = await updateCatalogueItem(editingId, formData)
            } else {
                res = await addCatalogueItem(formData)
            }

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(editingId ? "Article modifié avec succès" : "Article ajouté au catalogue")
                setIsDialogOpen(false)
                router.refresh()
            }
        } catch (err) {
            console.error(err)
            toast.error("Une erreur inattendue est survenue.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 w-full flex-wrap">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Rechercher un article..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border-white/10 text-foreground pl-10 h-11 rounded-xl"
                        />
                    </div>

                    <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                        <SelectTrigger className="w-full md:w-48 bg-white/5 border-white/10 text-foreground h-11 rounded-xl">
                            <SelectValue placeholder="Catégorie" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-foreground">
                            <SelectItem value="ALL">Toutes les catégories</SelectItem>
                            <SelectItem value="MATERIEL">Matériel</SelectItem>
                            <SelectItem value="LICENCE">Licence</SelectItem>
                            <SelectItem value="SERVICE">Service</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    onClick={openCreate}
                    className="w-full md:w-auto bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary text-foreground shadow-lg shadow-primary/25 transition-all h-11 px-6 rounded-xl"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nouvel Article
                </Button>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden flex-1 min-h-[400px]">
                <Table>
                    <TableHeader className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                        <TableRow>
                            <TableHead className="font-semibold text-foreground/70">Nom</TableHead>
                            <TableHead className="font-semibold text-foreground/70">Type</TableHead>
                            <TableHead className="font-semibold text-foreground/70">Modèle Lié</TableHead>
                            <TableHead className="font-semibold text-right text-foreground/70">Prix HT</TableHead>
                            <TableHead className="font-semibold text-center text-foreground/70">TVA</TableHead>
                            <TableHead className="font-semibold text-right text-foreground/70">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                                    Aucun article dans le catalogue.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map((item) => {
                                const Icon = TYPE_ICONS[item.type]
                                return (
                                    <TableRow key={item.id} className="hover:bg-white/5 transition-colors group">
                                        <TableCell className="font-medium text-foreground">
                                            {item.name}
                                        </TableCell>
                                        <TableCell>
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${TYPE_COLORS[item.type]}`}>
                                                <Icon className="w-3.5 h-3.5" />
                                                {item.type}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {item.type === 'MATERIEL' && item.equipment_model
                                                ? `${item.equipment_model.brand} ${item.equipment_model.model_name}`
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-medium text-emerald-400">
                                            {item.default_price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-muted-foreground">
                                            {item.tax_rate}%
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/10">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-red-400/50 hover:text-red-400 hover:bg-red-500/10">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-zinc-950 border border-white/10 text-foreground sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            {editingId ? "Modifier l'article" : "Nouvel article"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Remplissez les détails pour ajouter un produit ou service au catalogue commercial.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label className="text-foreground/70">Nom de l'article <span className="text-red-400">*</span></Label>
                            <Input
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Caisse Tactile HP"
                                className="bg-white/5 border-white/10 text-foreground placeholder:text-foreground/20 focus-visible:ring-primary"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-foreground/70">Type <span className="text-red-400">*</span></Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val: ItemType) => setFormData({ ...formData, type: val })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-foreground focus:ring-primary">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-foreground">
                                    <SelectItem value="MATERIEL">Matériel</SelectItem>
                                    <SelectItem value="LICENCE">Licence</SelectItem>
                                    <SelectItem value="SERVICE">Service</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.type === 'MATERIEL' && (
                            <div className="space-y-2">
                                <Label className="text-foreground/70">Lier à un modèle technique (Optionnel)</Label>
                                <Select
                                    value={formData.equipment_model_id || 'none'}
                                    onValueChange={(val: string) => setFormData({ ...formData, equipment_model_id: val === 'none' ? null : val })}
                                >
                                    <SelectTrigger className="bg-white/5 border-white/10 text-foreground focus:ring-primary">
                                        <SelectValue placeholder="Sélectionnez un modèle..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-white/10 text-foreground max-h-[200px]">
                                        <SelectItem value="none">Aucun modèle lié</SelectItem>
                                        {equipmentModels.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-foreground/70">Prix HT <span className="text-red-400">*</span></Label>
                                <div className="relative">
                                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formData.default_price}
                                        onChange={e => setFormData({ ...formData, default_price: parseFloat(e.target.value) || 0 })}
                                        className="bg-white/5 border-white/10 text-foreground font-mono pl-9 focus-visible:ring-primary"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-foreground/70">Taux TVA (%) <span className="text-red-400">*</span></Label>
                                <Input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.1"
                                    value={formData.tax_rate}
                                    onChange={e => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                                    className="bg-white/5 border-white/10 text-foreground font-mono focus-visible:ring-primary"
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-white/10">
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary text-primary-foreground">
                                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {editingId ? "Enregistrer" : "Créer l'article"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
