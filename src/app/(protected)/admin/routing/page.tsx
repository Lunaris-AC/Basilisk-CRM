'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, Link2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { getRoutingRules, deleteRoutingRule } from '@/features/tickets/actions/routing'

export default function AdminRoutingPage() {
    const router = useRouter()
    const [rules, setRules] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchRules = async () => {
        setIsLoading(true)
        try {
            const data = await getRoutingRules()
            setRules(data)
        } catch (error) {
            toast.error("Échec du chargement des règles de routage.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRules()
    }, [])

    const handleOpenCreate = () => {
        router.push('/admin/routing/nouveau')
    }

    const handleOpenEdit = (ruleId: string) => {
        router.push(`/admin/routing/nouveau?id=${ruleId}`)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer cette règle ? Les tickets déjà assignés ne seront pas impactés.")) return

        try {
            const res = await deleteRoutingRule(id)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Règle supprimée avec succès.")
                fetchRules()
            }
        } catch (error) {
            toast.error("Une erreur est survenue lors de la suppression.")
        }
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent tracking-tighter">
                        RÈGLES DE ROUTAGE
                    </h1>
                    <p className="text-muted-foreground font-medium italic">Gestion intelligente de l&apos;assignation automatique des tickets.</p>
                </div>
                <Button
                    onClick={handleOpenCreate}
                    className="bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary text-foreground shadow-xl shadow-primary/20 h-12 px-8 rounded-2xl border-none font-bold transition-all hover:scale-[1.02] active:scale-95"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    CRÉER UNE RÈGLE
                </Button>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/40 backdrop-blur-2xl shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                <Table>
                    <TableHeader className="bg-white/[0.02]">
                        <TableRow className="border-white/10 hover:bg-transparent h-16">
                            <TableHead className="w-24 text-center font-black text-muted-foreground text-[10px] uppercase tracking-widest px-6">Ordre</TableHead>
                            <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-widest px-6">Dénomination</TableHead>
                            <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-widest px-6">Statut</TableHead>
                            <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-widest px-6">Cible Action</TableHead>
                            <TableHead className="text-right font-black text-muted-foreground text-[10px] uppercase tracking-widest px-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-80 text-center">
                                    <div className="flex flex-col items-center justify-center gap-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                                            <Loader2 className="w-10 h-10 text-primary animate-spin relative z-10" />
                                        </div>
                                        <p className="text-muted-foreground font-bold tracking-tight">CHARGEMENT DES RÈGLES...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : rules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-80 text-center">
                                    <div className="flex flex-col items-center justify-center opacity-40">
                                        <p className="text-xl font-black italic">DATABASE_EMPTY</p>
                                        <p className="text-sm">Aucune règle répertoriée dans le moteur de routage.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            rules.map((rule) => (
                                <TableRow key={rule.id} className="border-white/5 hover:bg-white/[0.03] transition-all duration-300 group h-20">
                                    <TableCell className="text-center font-mono font-black text-xl text-foreground/20 px-6">
                                        #{rule.execution_order.toString().padStart(2, '0')}
                                    </TableCell>
                                    <TableCell className="font-bold text-lg text-foreground/90 px-6">
                                        {rule.name}
                                    </TableCell>
                                    <TableCell className="px-6">
                                        {rule.is_active ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                ACTIF
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold font-mono">
                                                <XCircle className="w-3.5 h-3.5" />
                                                INACTIF
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-6 text-sm font-medium text-foreground/70">
                                        {rule.target_user_id ? (
                                            <span className="flex items-center gap-2 text-primary/80">
                                                <Link2 className="w-4 h-4" />
                                                {rule.target_user?.first_name} {rule.target_user?.last_name}
                                            </span>
                                        ) : rule.target_support_level_id ? (
                                            <span className="flex items-center gap-2 text-emerald-400">
                                                <Link2 className="w-4 h-4" />
                                                Niveau : {rule.target_support_level?.name}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground italic">Aucune cible définie</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenEdit(rule.id)}
                                                className="h-10 w-10 text-muted-foreground hover:text-primary/80 hover:bg-primary/10 rounded-xl"
                                                title="Modifier la règle"
                                            >
                                                <Pencil className="w-5 h-5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(rule.id)}
                                                className="h-10 w-10 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl"
                                                title="Supprimer la règle"
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
        </div>
    )
}
