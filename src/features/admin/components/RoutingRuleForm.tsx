'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, Trash2, ArrowLeft, Save, Loader2, GitMerge } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

import { createRoutingRule, updateRoutingRule } from '@/features/tickets/actions/routing'
import { getSupportLevels } from '@/features/admin/actions/support-levels'
import { createClient } from '@/utils/supabase/client'

// Zod Schema
const ruleConditionSchema = z.object({
    field: z.string().min(1, "Le champ est requis"),
    operator: z.enum(['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'IN', 'NOT_IN']),
    value: z.string().min(1, "La valeur est requise"),
});

const formSchema = z.object({
    name: z.string().min(1, "Le nom est requis"),
    execution_order: z.coerce.number().min(1, "L'ordre doit être > 0"),
    is_active: z.boolean().default(true),
    logical_operator: z.enum(['AND', 'OR']),
    conditions: z.array(ruleConditionSchema).min(1, "Au moins une condition est requise"),
    target_support_level_id: z.string().optional().nullable(),
    target_user_id: z.string().optional().nullable(),
}).refine(data => data.target_support_level_id || data.target_user_id, {
    message: "Vous devez définir une cible (Grade ou Utilisateur)",
    path: ["target_support_level_id"], // Met l'erreur sur le champ grade visuellement
})

type FormValues = z.infer<typeof formSchema>

const FIELDS = [
    { value: 'category', label: 'Catégorie (Ex: HL, DEV, SAV, COMMERCE)' },
    { value: 'priority', label: 'Priorité (basse, normale, haute, urgente)' },
    { value: 'client_id', label: 'ID Client (UUID)' },
    { value: 'store_id', label: 'ID Magasin (UUID)' },
    { value: 'equipment_id', label: 'ID Équipement (UUID)' },
]

const OPERATORS = [
    { value: 'EQUALS', label: 'Est égal à' },
    { value: 'NOT_EQUALS', label: 'Est différent de' },
    { value: 'CONTAINS', label: 'Contient' },
    { value: 'IN', label: 'Est dans (virgules)' },
    { value: 'NOT_IN', label: 'N\'est pas dans' },
]

export function RoutingRuleForm({ initialData, clients = [], stores = [] }: { initialData?: any, clients?: any[], stores?: any[] }) {
    const router = useRouter()
    const [supportLevels, setSupportLevels] = useState<any[]>([])
    const [profiles, setProfiles] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const defaultValues: FormValues = {
        name: initialData?.name || '',
        execution_order: initialData?.execution_order || 1,
        is_active: initialData?.is_active ?? true,
        logical_operator: initialData?.conditions?.logical_operator || 'AND',
        conditions: initialData?.conditions?.conditions || [{ field: '', operator: 'EQUALS', value: '' }],
        target_support_level_id: initialData?.target_support_level_id || '',
        target_user_id: initialData?.target_user_id || '',
    }

    const { register, control, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "conditions"
    })

    const logicalOperator = watch('logical_operator')
    const isActive = watch('is_active')

    useEffect(() => {
        const fetchReferences = async () => {
            try {
                const levels = await getSupportLevels()
                setSupportLevels(levels)

                const supabase = createClient()
                const { data: users } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, role')
                    .in('role', ['N1', 'N2', 'N3', 'N4', 'SAV1', 'SAV2', 'ADMIN', 'DEV'])
                    .order('first_name', { ascending: true })

                if (users) setProfiles(users)
            } catch (error) {
                console.error("Erreur de chargement des listes de référence :", error)
            }
        }
        fetchReferences()
    }, [])

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true)
        try {
            const payload = {
                name: data.name,
                is_active: data.is_active,
                execution_order: data.execution_order,
                conditions: {
                    logical_operator: data.logical_operator,
                    conditions: data.conditions
                },
                target_support_level_id: data.target_support_level_id || null,
                target_user_id: data.target_user_id || null
            } as any;

            if (initialData?.id) {
                const res = await updateRoutingRule(initialData.id, payload)
                if (res.error) throw new Error(res.error)
                toast.success("Règle mise à jour avec succès")
            } else {
                const res = await createRoutingRule(payload)
                if (res.error) throw new Error(res.error)
                toast.success("Règle créée avec succès")
            }
            router.push('/admin/routing')
            router.refresh()
        } catch (e: any) {
            toast.error(e.message || "Erreur lors de la sauvegarde")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-24">
            {/* Header Form */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button type="button" variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full bg-white/5 hover:bg-white/10 text-foreground/70">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent tracking-tighter">
                            {initialData ? 'ÉDITER LA RÈGLE' : 'NOUVELLE RÈGLE'}
                        </h1>
                        <p className="text-muted-foreground font-medium italic">Constructeur visuel de conditions</p>
                    </div>
                </div>
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-foreground shadow-xl shadow-emerald-500/20 h-12 px-8 rounded-2xl border-none font-bold transition-all hover:scale-[1.02] active:scale-95"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                    SAUVEGARDER
                </Button>
            </div>

            {/* Informations générales */}
            <div className="p-8 rounded-[2rem] border border-white/10 bg-zinc-950/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary opacity-50" />
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <span>1. Paramètres de base</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <Label className="text-foreground/70 font-bold ml-1">Nom de la règle</Label>
                        <Input
                            {...register("name")}
                            placeholder="Ex: VIP Client Routing"
                            className="bg-white/5 border-white/10 text-foreground h-12 rounded-xl focus-visible:ring-primary"
                        />
                        {errors.name && <p className="text-rose-500 text-sm font-medium mt-1 ml-1">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-foreground/70 font-bold ml-1">Ordre d'exécution (1 = Priorité max)</Label>
                        <Input
                            type="number"
                            {...register("execution_order")}
                            className="bg-white/5 border-white/10 text-foreground h-12 rounded-xl focus-visible:ring-primary"
                        />
                        {errors.execution_order && <p className="text-rose-500 text-sm font-medium mt-1 ml-1">{errors.execution_order.message}</p>}
                    </div>
                </div>

                <div className="mt-8 flex items-center space-x-3 p-4 rounded-xl bg-white/5 border border-white/5 w-fit">
                    <Controller
                        control={control}
                        name="is_active"
                        render={({ field }) => (
                            <Checkbox
                                id="active"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="w-6 h-6 border-2 border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                        )}
                    />
                    <Label htmlFor="active" className="text-base font-bold cursor-pointer select-none">
                        {isActive ? <span className="text-emerald-400">Règle active</span> : <span className="text-muted-foreground">Règle inactive</span>}
                    </Label>
                </div>
            </div>

            {/* Constructeur de conditions */}
            <div className="p-8 rounded-[2rem] border border-white/10 bg-zinc-950/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-50" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-white/5 gap-4">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <span>2. Conditions de déclenchement</span>
                    </h2>

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground">Opérateur global :</span>
                        <div className="w-40">
                            <Controller
                                control={control}
                                name="logical_operator"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                                        <SelectTrigger className="bg-white/5 border-white/10 text-foreground font-bold h-10 w-full">
                                            <SelectValue placeholder="Opérateur" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" className="bg-primary border-white/10 text-foreground z-[9999] shadow-2xl">
                                            <SelectItem value="AND" className="font-bold focus:bg-white/10">ET (Toutes vraies)</SelectItem>
                                            <SelectItem value="OR" className="font-bold focus:bg-white/10">OU (Au moins une)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>
                </div>

                {errors.conditions && <p className="text-rose-500 font-bold mb-4">{errors.conditions.root?.message}</p>}

                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="group relative flex flex-col md:flex-row gap-4 items-start md:items-center p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">

                            {/* Opérande visuel (ET/OU) */}
                            {index > 0 && (
                                <div className="hidden md:flex absolute -top-4 left-1/2 -px-2 bg-zinc-950 text-[10px] font-black tracking-widest text-amber-500/70 py-1 rounded-md border border-white/5">
                                    {logicalOperator}
                                </div>
                            )}

                            <div className="flex-1 w-full">
                                <Controller
                                    control={control}
                                    name={`conditions.${index}.field`}
                                    render={({ field: selectField }) => (
                                        <Select
                                            onValueChange={(val) => {
                                                selectField.onChange(val);
                                                setValue(`conditions.${index}.value`, '');
                                            }}
                                            value={selectField.value || undefined}
                                        >
                                            <SelectTrigger className="bg-black/40 border-white/10 text-foreground h-12 rounded-xl">
                                                <SelectValue placeholder="Choisir un champ..." />
                                            </SelectTrigger>
                                            <SelectContent position="popper" className="bg-primary border-white/10 text-foreground">
                                                {FIELDS.map(f => (
                                                    <SelectItem key={f.value} value={f.value} className="focus:bg-white/10">{f.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.conditions?.[index]?.field && <p className="text-rose-500 text-xs mt-1 absolute">{errors.conditions[index]?.field?.message}</p>}
                            </div>

                            <div className="flex-1 w-full relative">
                                <Controller
                                    control={control}
                                    name={`conditions.${index}.operator`}
                                    render={({ field: selectField }) => (
                                        <Select onValueChange={selectField.onChange} value={selectField.value || undefined}>
                                            <SelectTrigger className="bg-black/40 border-white/10 text-amber-400 font-bold h-12 rounded-xl">
                                                <SelectValue placeholder="Opérateur..." />
                                            </SelectTrigger>
                                            <SelectContent position="popper" className="bg-primary border-white/10 text-foreground">
                                                {OPERATORS.map(o => (
                                                    <SelectItem key={o.value} value={o.value} className="focus:bg-white/10 font-medium">
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.conditions?.[index]?.operator && <p className="text-rose-500 text-xs mt-1 absolute">{errors.conditions[index]?.operator?.message}</p>}
                            </div>

                            <div className="flex-[1.5] flex gap-3 w-full relative">
                                <div className="w-full">
                                    {(() => {
                                        const currentField = watch(`conditions.${index}.field`)

                                        if (currentField === 'client_id') {
                                            return (
                                                <Controller
                                                    control={control}
                                                    name={`conditions.${index}.value`}
                                                    render={({ field: valField }) => (
                                                        <Select onValueChange={valField.onChange} value={valField.value || undefined}>
                                                            <SelectTrigger className="bg-black/40 border-white/10 text-primary/80 font-medium h-12 rounded-xl focus-visible:ring-amber-500">
                                                                <SelectValue placeholder="Sélectionner un client..." />
                                                            </SelectTrigger>
                                                            <SelectContent position="popper" className="bg-primary border-white/10 text-foreground max-h-60 z-[9999] shadow-2xl">
                                                                {clients.length === 0 ? (
                                                                    <SelectItem value="no_clients_found" disabled className="text-muted-foreground italic">Aucun client trouvé</SelectItem>
                                                                ) : (
                                                                    clients.map(c => (
                                                                        <SelectItem key={c.id} value={c.id} className="focus:bg-white/10">
                                                                            {c.company_name || `${c.first_name} ${c.last_name}`}
                                                                        </SelectItem>
                                                                    ))
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            )
                                        }

                                        if (currentField === 'store_id') {
                                            return (
                                                <Controller
                                                    control={control}
                                                    name={`conditions.${index}.value`}
                                                    render={({ field: valField }) => (
                                                        <Select onValueChange={valField.onChange} value={valField.value || undefined}>
                                                            <SelectTrigger className="bg-black/40 border-white/10 text-primary/80 font-medium h-12 rounded-xl focus-visible:ring-amber-500">
                                                                <SelectValue placeholder="Sélectionner un magasin..." />
                                                            </SelectTrigger>
                                                            <SelectContent position="popper" className="bg-primary border-white/10 text-foreground max-h-60 z-[9999] shadow-2xl">
                                                                {stores.length === 0 ? (
                                                                    <SelectItem value="no_stores_found" disabled className="text-muted-foreground italic">Aucun magasin trouvé</SelectItem>
                                                                ) : (
                                                                    stores.map(s => (
                                                                        <SelectItem key={s.id} value={s.id} className="focus:bg-white/10">
                                                                            {s.name}
                                                                        </SelectItem>
                                                                    ))
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            )
                                        }

                                        if (currentField === 'priority') {
                                            return (
                                                <Controller
                                                    control={control}
                                                    name={`conditions.${index}.value`}
                                                    render={({ field: valField }) => (
                                                        <Select onValueChange={valField.onChange} value={valField.value || undefined}>
                                                            <SelectTrigger className="bg-black/40 border-white/10 text-primary/80 font-medium h-12 rounded-xl focus-visible:ring-amber-500">
                                                                <SelectValue placeholder="Priorité..." />
                                                            </SelectTrigger>
                                                            <SelectContent position="popper" className="bg-primary border-white/10 text-foreground z-[9999] shadow-2xl">
                                                                <SelectItem value="BASSE" className="focus:bg-white/10 text-primary/80 font-bold">Basse</SelectItem>
                                                                <SelectItem value="NORMALE" className="focus:bg-white/10 text-sky-400 font-bold">Normale</SelectItem>
                                                                <SelectItem value="HAUTE" className="focus:bg-white/10 text-amber-400 font-bold">Haute</SelectItem>
                                                                <SelectItem value="URGENTE" className="focus:bg-white/10 text-rose-500 font-bold">Urgente</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            )
                                        }

                                        if (currentField === 'status') {
                                            return (
                                                <Controller
                                                    control={control}
                                                    name={`conditions.${index}.value`}
                                                    render={({ field: valField }) => (
                                                        <Select onValueChange={valField.onChange} value={valField.value || undefined}>
                                                            <SelectTrigger className="bg-black/40 border-white/10 text-primary/80 font-medium h-12 rounded-xl focus-visible:ring-amber-500">
                                                                <SelectValue placeholder="Statut..." />
                                                            </SelectTrigger>
                                                            <SelectContent position="popper" className="bg-primary border-white/10 text-foreground z-[9999] shadow-2xl">
                                                                <SelectItem value="NOUVEAU" className="focus:bg-white/10 font-bold">Nouveau</SelectItem>
                                                                <SelectItem value="EN_COURS" className="focus:bg-white/10 text-sky-400 font-bold">En cours</SelectItem>
                                                                <SelectItem value="ATTENTE_CLIENT" className="focus:bg-white/10 text-amber-500 font-bold">Attente client</SelectItem>
                                                                <SelectItem value="RESOLU" className="focus:bg-white/10 text-emerald-500 font-bold">Résolu</SelectItem>
                                                                <SelectItem value="FERME" className="focus:bg-white/10 text-primary font-bold">Fermé</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            )
                                        }

                                        // Default Text Input
                                        return (
                                            <Input
                                                {...register(`conditions.${index}.value`)}
                                                placeholder="Valeur (séparez par virgule pour IN/NOT_IN)"
                                                className="bg-black/40 border-white/10 text-primary/80 font-medium h-12 rounded-xl focus-visible:ring-amber-500"
                                            />
                                        )
                                    })()}
                                    {errors.conditions?.[index]?.value && <p className="text-rose-500 text-xs mt-1 absolute">{errors.conditions[index]?.value?.message}</p>}
                                </div>

                                {fields.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => remove(index)}
                                        className="h-12 w-12 shrink-0 rounded-xl text-foreground/20 hover:text-rose-500 hover:bg-rose-500/10"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <Button
                    type="button"
                    onClick={() => append({ field: '', operator: 'EQUALS', value: '' })}
                    className="mt-6 border-dashed border-2 border-white/10 bg-transparent hover:bg-white/5 text-muted-foreground hover:text-foreground h-12 px-6 rounded-xl w-full"
                >
                    <Plus className="w-5 h-5 mr-2" /> Ajouter une condition
                </Button>
            </div>

            {/* Cible de routage */}
            <div className="p-8 rounded-[2rem] border border-white/10 bg-zinc-950/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-primary opacity-50" />
                <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                    <span>3. Cible d'assignation</span>
                </h2>
                <p className="text-muted-foreground text-sm mb-6">Si les conditions sont validées, le ticket sera assigné vers cette cible. Saisissez <strong>un seul</strong> des deux choix.</p>

                {errors.target_support_level_id && (
                    <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold flex items-center gap-3">
                        <GitMerge className="w-5 h-5" />
                        {errors.target_support_level_id.message as string}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative">

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-primary border border-white/10 text-muted-foreground font-black text-xs z-10">
                        OU
                    </div>

                    <div className={`p-6 rounded-2xl border transition-all ${watch('target_support_level_id') ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-white/5 border-white/5'}`}>
                        <Label className="text-foreground/70 font-bold mb-3 block">Assigner à une file d'attente (Grade)</Label>
                        <Controller
                            control={control}
                            name="target_support_level_id"
                            render={({ field }) => (
                                <Select
                                    onValueChange={(val) => {
                                        field.onChange(val === 'none' ? '' : val)
                                        if (val && val !== 'none') setValue('target_user_id', '') // Mutuellement exclusif
                                    }}
                                    value={field.value || undefined}
                                >
                                    <SelectTrigger className="bg-black/50 border-white/10 text-foreground h-14 rounded-xl text-lg">
                                        <SelectValue placeholder="Sélectionner un grade..." />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="bg-primary border-white/10 text-foreground z-[9999] shadow-2xl">
                                        <SelectItem value="none" className="text-muted-foreground italic focus:bg-white/5">-- Aucun grade --</SelectItem>
                                        {supportLevels.map(level => (
                                            <SelectItem key={level.id} value={level.id} className="font-bold focus:bg-white/10">
                                                {level.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    <div className={`p-6 rounded-2xl border transition-all ${watch('target_user_id') ? 'bg-primary/5 border-primary/30' : 'bg-white/5 border-white/5'}`}>
                        <Label className="text-foreground/70 font-bold mb-3 block">Assigner à un Utilisateur spécifique</Label>
                        <Controller
                            control={control}
                            name="target_user_id"
                            render={({ field }) => (
                                <Select
                                    onValueChange={(val) => {
                                        field.onChange(val === 'none' ? '' : val)
                                        if (val && val !== 'none') setValue('target_support_level_id', '') // Mutuellement exclusif
                                    }}
                                    value={field.value || undefined}
                                >
                                    <SelectTrigger className="bg-black/50 border-white/10 text-foreground h-14 rounded-xl text-lg">
                                        <SelectValue placeholder="Sélectionner un agent..." />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="bg-primary border-white/10 text-foreground z-[9999] shadow-2xl">
                                        <SelectItem value="none" className="text-muted-foreground italic focus:bg-white/5">-- Aucun utilisateur --</SelectItem>
                                        {profiles.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="font-bold focus:bg-white/10">
                                                {p.first_name} {p.last_name} ({p.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                </div>
            </div>
        </form>
    )
}
