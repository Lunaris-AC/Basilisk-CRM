'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { SupportLevelDialog } from '@/features/admin/components/SupportLevelDialog'
import { SupportLevel, getSupportLevels, deleteSupportLevel } from '@/features/admin/actions/support-levels'
import { toast } from 'sonner'

export default function AdminGradesPage() {
    const [levels, setLevels] = useState<SupportLevel[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingLevel, setEditingLevel] = useState<SupportLevel | null>(null)

    const fetchLevels = async () => {
        setIsLoading(true)
        try {
            const data = await getSupportLevels()
            setLevels(data)
        } catch (error) {
            toast.error("Échec du chargement des niveaux.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchLevels()
    }, [])

    const handleOpenCreate = () => {
        setEditingLevel(null)
        setIsDialogOpen(true)
    }

    const handleOpenEdit = (level: SupportLevel) => {
        setEditingLevel(level)
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer ce niveau ?")) return

        try {
            const res = await deleteSupportLevel(id)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Niveau supprimé")
                fetchLevels()
            }
        } catch (error) {
            toast.error("Une erreur est survenue.")
        }
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent tracking-tighter">
                        ÉDITEUR DE GRADES
                    </h1>
                    <p className="text-muted-foreground font-medium italic">Gestion dynamique de la hiérarchie et de l&apos;escalade.</p>
                </div>
                <Button
                    onClick={handleOpenCreate}
                    className="bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary text-foreground shadow-xl shadow-primary/20 h-12 px-8 rounded-2xl border-none font-bold transition-all hover:scale-[1.02] active:scale-95"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    AJOUTER UN GRADE
                </Button>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/40 backdrop-blur-2xl shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                <Table>
                    <TableHeader className="bg-white/[0.02]">
                        <TableRow className="border-white/10 hover:bg-transparent h-16">
                            <TableHead className="w-24 text-center font-black text-muted-foreground text-[10px] uppercase tracking-widest px-6">Rang</TableHead>
                            <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-widest px-6">Dénomination</TableHead>
                            <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-widest px-6">Aperçu Badge</TableHead>
                            <TableHead className="text-right font-black text-muted-foreground text-[10px] uppercase tracking-widest px-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-80 text-center">
                                    <div className="flex flex-col items-center justify-center gap-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                                            <Loader2 className="w-10 h-10 text-primary animate-spin relative z-10" />
                                        </div>
                                        <p className="text-muted-foreground font-bold tracking-tight">SÉCURISATION DU SYSTÈME...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : levels.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-80 text-center">
                                    <div className="flex flex-col items-center justify-center opacity-40">
                                        <p className="text-xl font-black italic">DATABASE_EMPTY</p>
                                        <p className="text-sm">Aucun grade répertorié dans le moteur de routage.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            levels.map((level) => (
                                <TableRow key={level.id} className="border-white/5 hover:bg-white/[0.03] transition-all duration-300 group h-20">
                                    <TableCell className="text-center font-mono font-black text-xl text-foreground/20 px-6">
                                        {level.rank.toString().padStart(2, '0')}
                                    </TableCell>
                                    <TableCell className="font-bold text-lg text-foreground/90 px-6">
                                        {level.name}
                                    </TableCell>
                                    <TableCell className="px-6">
                                        <div
                                            className="inline-flex items-center px-4 py-1.5 rounded-xl text-sm font-black border tracking-tight shadow-lg"
                                            style={{
                                                backgroundColor: `${level.color}10`,
                                                borderColor: `${level.color}30`,
                                                color: level.color,
                                                boxShadow: `0 0 20px ${level.color}10`
                                            }}
                                        >
                                            <div
                                                className="w-2 h-2 rounded-full mr-2.5 animate-pulse"
                                                style={{ backgroundColor: level.color }}
                                            />
                                            {level.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenEdit(level)}
                                                className="h-10 w-10 text-muted-foreground hover:text-primary/80 hover:bg-primary/10 rounded-xl"
                                            >
                                                <Pencil className="w-5 h-5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(level.id)}
                                                className="h-10 w-10 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <SupportLevelDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                level={editingLevel}
                onSuccess={fetchLevels}
            />
        </div>
    )
}
