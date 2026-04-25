'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useClientsAndStores } from '@/features/tickets/api/useClientsAndStores'
import { createTicket } from '@/features/tickets/actions'
import { Loader2, UploadCloud, Ticket, AlertCircle, X, File, UserCircle, UserPlus, Bug, Sparkles, Activity } from 'lucide-react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

import { SmartContactSelector } from '@/components/SmartContactSelector'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'

// Schema Zod pour la validation stricte
const ticketSchema = z.object({
    title: z.string().min(5, "Le titre doit faire au moins 5 caractères").max(100, "Le titre est trop long"),
    description: z.string().min(20, "Veuillez fournir une description détaillée (min 20 caractères)"),
    client_id: z.string().optional(),
    store_id: z.string().optional(),
    contact_id: z.string().optional(),
    problem_location: z.string().optional(),
    priority: z.enum(['basse', 'normale', 'haute', 'critique']),
    category: z.enum(['HL', 'SAV1', 'SAV2', 'FORMATION', 'DEV']),

    // SAV
    serial_number: z.string().optional(),
    product_reference: z.string().optional(),
    hardware_status: z.string().optional(),

    // Formation
    travel_date: z.string().optional(),
    training_location: z.string().optional(),
    training_type: z.string().optional(),

    // DEV (SD)
    sd_type: z.enum(['BUG', 'EVOLUTION']).optional(),
    reproduction_steps: z.string().optional(),
    sd_impact: z.string().optional(),
    need_description: z.string().optional(),
    expected_process: z.string().optional(),

    // Optionnel : validation des fichiers côté client (taille, type)
    attachments: z.any().optional(),
})

type TicketFormValues = z.infer<typeof ticketSchema>

interface CreateTicketModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateTicketModal({ open, onOpenChange }: CreateTicketModalProps) {
    const queryClient = useQueryClient()
    const { data, isLoading: dataLoading } = useClientsAndStores()
    const clients = data?.clients || []
    const stores = data?.stores || []

    const { data: profile } = useQuery({
        queryKey: ['my-profile-modal'],
        queryFn: async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null
            const { data } = await supabase.from('profiles').select('id, role, contact_id').eq('id', user.id).single()
            return data
        },
        staleTime: 1000 * 60 * 5
    })

    const isClient = profile?.role === 'CLIENT'

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [selectedFiles, setSelectedFiles] = useState<globalThis.File[]>([])

    const form = useForm<TicketFormValues>({
        resolver: zodResolver(ticketSchema),
        defaultValues: {
            title: '',
            description: '',
            client_id: '',
            store_id: '',
            contact_id: '',
            problem_location: '',
            priority: 'normale',
            category: 'HL',
            serial_number: '',
            product_reference: '',
            hardware_status: '',
            travel_date: '',
            training_location: '',
            training_type: '',
            sd_type: undefined,
            reproduction_steps: '',
            sd_impact: '',
            need_description: '',
            expected_process: '',
        }
    })

    const selectedClientId = form.watch('client_id')
    const selectedStoreId = form.watch('store_id')
    const selectedCategory = form.watch('category')
    const filteredStores = stores.filter(store => store.client_id === selectedClientId)

    // SPRINT 29.2 : Auto-sélection du magasin et forçage du client_id cache
    useEffect(() => {
        if (isClient && profile?.id && !form.getValues('client_id')) {
            form.setValue('client_id', profile.id)
        }
        if (isClient && stores.length === 1 && !form.getValues('store_id')) {
            form.setValue('store_id', stores[0].id)
        }
    }, [isClient, stores, profile?.id, form])

    const handleSubmit = async (values: TicketFormValues, assignToMe: boolean = false) => {
        setIsSubmitting(true)
        setSubmitError(null)

        // Validation client/store pour les non-DEV et non-CLIENT
        if (!isClient && values.category !== 'DEV' && (!values.client_id || !values.store_id)) {
            setSubmitError('Veuillez sélectionner un client et un magasin.')
            setIsSubmitting(false)
            return
        }

        // Si CLIENT, la sélection du magasin suffit, on s'assure juste d'avoir un store (le client_id sera forcé au backend)
        if (isClient && !values.store_id) {
            setSubmitError('Veuillez sélectionner un magasin.')
            setIsSubmitting(false)
            return
        }

        const formData = new FormData()
        formData.append('title', values.title)
        formData.append('description', values.description)
        if (values.client_id) formData.append('client_id', values.client_id)
        if (values.store_id) formData.append('store_id', values.store_id)
        if (values.problem_location) formData.append('problem_location', values.problem_location)
        formData.append('priority', values.priority)
        formData.append('category', values.category)
        if (values.contact_id) formData.append('contact_id', values.contact_id)

        if (values.category === 'SAV1' || values.category === 'SAV2') {
            if (values.serial_number) formData.append('serial_number', values.serial_number)
            if (values.product_reference) formData.append('product_reference', values.product_reference)
            if (values.hardware_status) formData.append('hardware_status', values.hardware_status)
        } else if (values.category === 'FORMATION') {
            if (values.travel_date) formData.append('travel_date', values.travel_date)
            if (values.training_location) formData.append('training_location', values.training_location)
            if (values.training_type) formData.append('training_type', values.training_type)
        } else if (values.category === 'DEV') {
            if (values.sd_type) formData.append('sd_type', values.sd_type)
            if (values.reproduction_steps) formData.append('reproduction_steps', values.reproduction_steps)
            if (values.sd_impact) formData.append('sd_impact', values.sd_impact)
            if (values.need_description) formData.append('need_description', values.need_description)
            if (values.expected_process) formData.append('expected_process', values.expected_process)
        }

        // Compression des fichiers sélectionnés si ce sont des images
        const { compressFileIfImage } = await import('@/utils/compressImage')

        for (const file of selectedFiles) {
            const processedFile = await compressFileIfImage(file)
            formData.append('attachments', processedFile)
        }

        const result = await createTicket(formData, assignToMe)

        if (result.error) {
            setSubmitError(result.error)
            setIsSubmitting(false)
        } else {
            // Reset form & close modal
            form.reset()
            setSelectedFiles([])
            setSubmitError(null)
            setIsSubmitting(false)
            onOpenChange(false)

            // Invalidate queries to refresh lists
            queryClient.invalidateQueries({ queryKey: ['myTickets'] })
            queryClient.invalidateQueries({ queryKey: ['unassignedTickets'] })
            queryClient.invalidateQueries({ queryKey: ['myDailyStats'] })
            queryClient.invalidateQueries({ queryKey: ['sds'] })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 text-foreground p-0 gap-0 overflow-hidden" showCloseButton={false}>
                {/* Glassmorphism background effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

                {/* Header */}
                <DialogHeader className="p-6 pb-0 relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <Ticket className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                                    Créer un nouveau ticket
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground text-sm mt-0.5">
                                    Déclarez un incident et joignez toutes les informations utiles.
                                </DialogDescription>
                            </div>
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-foreground/70" />
                        </button>
                    </div>
                </DialogHeader>

                {/* Scrollable Content */}
                <div className="max-h-[75vh] overflow-y-auto p-6 custom-scrollbar relative z-10">
                    {dataLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                        </div>
                    ) : (
                        <form
                            onSubmit={form.handleSubmit((values) => handleSubmit(values, false))}
                            className="space-y-6"
                        >
                            {submitError && (
                                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p>{submitError}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Catégorie — masquée si CLIENT (forcé à HL en backend) */}
                                {!isClient && (
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-foreground/80">Catégorie du Ticket <span className="text-rose-500">*</span></label>
                                        <select
                                            {...form.register('category')}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none"
                                        >
                                            <option value="HL">Support HotLine (HL)</option>
                                            <option value="SAV1">SAV 1 (Matériel)</option>
                                            <option value="SAV2">SAV 2 (Logiciel)</option>
                                            <option value="FORMATION">Service Formation</option>
                                            <option value="DEV">SD / Développement</option>
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-bold text-foreground/80">Titre du problème <span className="text-rose-500">*</span></label>
                                    <input
                                        {...form.register('title')}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-foreground placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-medium"
                                        placeholder="Ex: Caisse n°2 en panne d'affichage"
                                    />
                                    {form.formState.errors.title && <p className="text-xs text-rose-400 mt-1">{form.formState.errors.title.message}</p>}
                                </div>

                                {/* Client / Store — masqués pour DEV et simplification pour CLIENT */}
                                {selectedCategory !== 'DEV' && (
                                    <>
                                        {!isClient && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-foreground/80">Client <span className="text-rose-500">*</span></label>
                                                <select
                                                    {...form.register('client_id')}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none"
                                                >
                                                    <option value="">Sélectionner un client...</option>
                                                    {clients.map(c => (
                                                        <option key={c.id} value={c.id}>{c.company}</option>
                                                    ))}
                                                </select>
                                                {form.formState.errors.client_id && <p className="text-xs text-rose-400 mt-1">{form.formState.errors.client_id.message}</p>}
                                            </div>
                                        )}

                                        <div className="space-y-2 md:col-span-1">
                                            <label className="text-sm font-bold text-foreground/80">Magasin concerné</label>

                                            {isClient && stores.length === 1 ? (
                                                <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                                                        <Activity className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-emerald-100">{stores[0].name}</p>
                                                        <p className="text-xs text-emerald-400/80">Magasin lié automatiquement</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <select
                                                        {...form.register('store_id')}
                                                        disabled={!isClient && !selectedClientId}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none disabled:opacity-50"
                                                    >
                                                        <option value="">Sélectionner un magasin...</option>
                                                        {filteredStores.map(s => <option key={s.id} value={s.id}>{s.name} {s.city ? `(${s.city})` : ''}</option>)}
                                                    </select>
                                                    {form.formState.errors.store_id && <p className="text-xs text-rose-400 mt-1">{form.formState.errors.store_id.message}</p>}
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Masqué pour les clients qui sont EUX MEMES le contact */}
                                {!isClient && (
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                                            <UserCircle className="w-4 h-4 text-muted-foreground" />
                                            Interlocuteur / Contact
                                        </label>
                                        {!selectedClientId ? (
                                            <div className="p-3 bg-black/20 border border-white/5 rounded-xl text-muted-foreground text-sm">
                                                Sélectionnez d&apos;abord un client pour rechercher ou créer un contact.
                                            </div>
                                        ) : (
                                            <SmartContactSelector
                                                value={form.watch('contact_id')}
                                                onChange={(val) => form.setValue('contact_id', val || '')}
                                                clientId={selectedClientId}
                                                storeId={selectedStoreId}
                                            />
                                        )}
                                    </div>
                                )}

                                {!isClient && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-foreground/80">Priorité <span className="text-rose-500">*</span></label>
                                        <select
                                            {...form.register('priority')}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none"
                                        >
                                            <option value="basse">Basse</option>
                                            <option value="normale">Normale</option>
                                            <option value="haute">Haute</option>
                                            <option value="critique">Critique (Bloquant)</option>
                                        </select>
                                        {form.formState.errors.priority && <p className="text-xs text-rose-400 mt-1">{form.formState.errors.priority.message}</p>}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground/80">Localisation (Optionnel)</label>
                                    <input
                                        {...form.register('problem_location')}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-foreground placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                                        placeholder="Ex: Rayon frais, Serveur principal..."
                                    />
                                </div>

                                {/* DÉTAILS SAV */}
                                {(selectedCategory === 'SAV1' || selectedCategory === 'SAV2') && (
                                    <div className="space-y-4 md:col-span-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                        <h3 className="text-sm font-bold text-rose-400">Détails SAV</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs text-foreground/70">Numéro de série</label>
                                                <input {...form.register('serial_number')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-foreground text-sm focus:ring-2 focus:ring-rose-500/50" placeholder="Ex: SN-123456789" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-foreground/70">Référence Produit</label>
                                                <input {...form.register('product_reference')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-foreground text-sm focus:ring-2 focus:ring-rose-500/50" placeholder="Ex: TPE-Ingenico-Move5000" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-foreground/70">État du matériel</label>
                                                <input {...form.register('hardware_status')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-foreground text-sm focus:ring-2 focus:ring-rose-500/50" placeholder="Ex: Ne s'allume plus..." />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* DÉTAILS FORMATION */}
                                {selectedCategory === 'FORMATION' && (
                                    <div className="space-y-4 md:col-span-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <h3 className="text-sm font-bold text-emerald-400">Détails Formation</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs text-foreground/70">Date de déplacement</label>
                                                <input type="date" {...form.register('travel_date')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-foreground text-sm focus:ring-2 focus:ring-emerald-500/50" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-foreground/70">Lieu de formation</label>
                                                <input {...form.register('training_location')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-foreground text-sm focus:ring-2 focus:ring-emerald-500/50" placeholder="Ex: Sur site, Distanciel..." />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-foreground/70">Type de formation</label>
                                                <input {...form.register('training_type')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-foreground text-sm focus:ring-2 focus:ring-emerald-500/50" placeholder="Ex: Initiale..." />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* DÉTAILS SD (DEV) */}
                                {selectedCategory === 'DEV' && (
                                    <div className="space-y-4 md:col-span-2 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                                        <h3 className="text-sm font-bold text-primary/80">Détails SD</h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs text-foreground/70">Type de SD <span className="text-rose-500">*</span></label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => form.setValue('sd_type', 'BUG')}
                                                        className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${form.watch('sd_type') === 'BUG'
                                                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-500/10'
                                                            : 'bg-black/20 border-white/10 text-muted-foreground hover:bg-white/5'
                                                            }`}
                                                    >
                                                        <Bug className="w-4 h-4" /> Bug
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => form.setValue('sd_type', 'EVOLUTION')}
                                                        className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${form.watch('sd_type') === 'EVOLUTION'
                                                            ? 'bg-primary/20 border-primary/40 text-primary/80 shadow-lg shadow-primary/10'
                                                            : 'bg-black/20 border-white/10 text-muted-foreground hover:bg-white/5'
                                                            }`}
                                                    >
                                                        <Sparkles className="w-4 h-4" /> Évolution
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Bug-specific fields */}
                                            {form.watch('sd_type') === 'BUG' && (
                                                <>
                                                    <div className="space-y-2">
                                                        <label className="text-xs text-foreground/70">Étapes de reproduction</label>
                                                        <textarea
                                                            {...form.register('reproduction_steps')}
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-foreground text-sm focus:ring-2 focus:ring-rose-500/50 resize-y min-h-[80px] placeholder-white/30"
                                                            placeholder="1. Aller sur...\n2. Cliquer sur...\n3. Observer l'erreur..."
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs text-foreground/70">Impact</label>
                                                        <input
                                                            {...form.register('sd_impact')}
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-foreground text-sm focus:ring-2 focus:ring-rose-500/50"
                                                            placeholder="Ex: Bloque 50% des utilisateurs sur le module caisse"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {/* Evolution-specific fields */}
                                            {form.watch('sd_type') === 'EVOLUTION' && (
                                                <>
                                                    <div className="space-y-2">
                                                        <label className="text-xs text-foreground/70">Description du besoin</label>
                                                        <textarea
                                                            {...form.register('need_description')}
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-foreground text-sm focus:ring-2 focus:ring-primary/50 resize-y min-h-[80px] placeholder-white/30"
                                                            placeholder="Décrivez le besoin fonctionnel..."
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs text-foreground/70">Procédé attendu</label>
                                                        <textarea
                                                            {...form.register('expected_process')}
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-foreground text-sm focus:ring-2 focus:ring-primary/50 resize-y min-h-[80px] placeholder-white/30"
                                                            placeholder="Comment la fonctionnalité devrait-elle fonctionner ?"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-bold text-foreground/80">Description détaillée <span className="text-rose-500">*</span></label>
                                    <textarea
                                        {...form.register('description')}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-foreground placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y min-h-[120px] transition-all"
                                        placeholder="Décrivez précisément les symptômes, les actions déjà tentées..."
                                    />
                                    {form.formState.errors.description && <p className="text-xs text-rose-400 mt-1">{form.formState.errors.description.message}</p>}
                                </div>

                                <div className="space-y-4 md:col-span-2 pt-4 border-t border-white/10">
                                    <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                                        <UploadCloud className="w-4 h-4 text-muted-foreground" />
                                        Pièces jointes (Photos, Logs, PDF...)
                                    </label>
                                    <div className="relative group cursor-pointer">
                                        <div className="absolute inset-0 bg-primary/5 rounded-xl border border-dashed border-primary/30 group-hover:bg-primary/10 group-hover:border-primary/50 transition-all" />
                                        <input
                                            id="modal-attachments"
                                            type="file"
                                            multiple
                                            onChange={(e) => {
                                                if (e.target.files) {
                                                    setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)])
                                                }
                                            }}
                                            className="relative z-10 w-full p-8 opacity-0 cursor-pointer"
                                            disabled={isSubmitting}
                                        />
                                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-4">
                                            <UploadCloud className="w-8 h-8 text-primary/80 mb-2 group-hover:scale-110 transition-transform" />
                                            <p className="text-sm font-medium text-foreground/80">Cliquez ou glissez vos fichiers ici</p>
                                            <p className="text-xs text-muted-foreground mt-1">Multiples fichiers autorisés</p>
                                        </div>
                                    </div>
                                    {selectedFiles.length > 0 && (
                                        <div className="space-y-2 mt-4">
                                            {selectedFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/10">
                                                    <div className="flex items-center gap-3">
                                                        <File className="w-5 h-5 text-primary/80" />
                                                        <span className="text-sm text-foreground truncate max-w-[200px]">{file.name}</span>
                                                    </div>
                                                    <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-rose-500 hover:text-rose-400">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer with both buttons */}
                            <div className="pt-6 border-t border-white/10 flex flex-col-reverse sm:flex-row justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isSubmitting}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-foreground/70 font-medium rounded-xl transition-all border border-white/10 disabled:opacity-50"
                                >
                                    Annuler
                                </button>
                                {!isClient && (
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={form.handleSubmit((values) => handleSubmit(values, true))}
                                        className="px-6 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-xl transition-all border border-emerald-500/30 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                        <UserPlus className="w-4 h-4" />
                                        Créer et se l&apos;assigner
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-8 py-3 bg-primary hover:bg-primary/20 text-primary-foreground font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Créer le ticket
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
