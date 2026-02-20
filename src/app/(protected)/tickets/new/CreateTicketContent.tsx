'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useClientsAndStores } from '@/features/tickets/api/useClientsAndStores'
import { createTicket } from '@/features/tickets/actions'
import { Loader2, UploadCloud, Ticket, AlertCircle, ArrowLeft, X, File, UserCircle } from 'lucide-react'
import Link from 'next/link'

import { SmartContactSelector } from '@/components/SmartContactSelector'

// Schema Zod pour la validation stricte
const ticketSchema = z.object({
    title: z.string().min(5, "Le titre doit faire au moins 5 caractères").max(100, "Le titre est trop long"),
    description: z.string().min(20, "Veuillez fournir une description détaillée (min 20 caractères)"),
    client_id: z.string().min(1, "Veuillez sélectionner un client"),
    store_id: z.string().min(1, "Veuillez sélectionner un magasin"),
    contact_id: z.string().optional(),
    problem_location: z.string().optional(),
    priority: z.enum(['basse', 'normale', 'haute', 'critique']),
    category: z.enum(['HL', 'COMMERCE', 'SAV', 'FORMATION']),

    // Commerce
    quote_number: z.string().optional(),
    invoice_number: z.string().optional(),
    service_type: z.string().optional(),

    // SAV
    serial_number: z.string().optional(),
    product_reference: z.string().optional(),
    hardware_status: z.string().optional(),

    // Formation
    travel_date: z.string().optional(),
    training_location: z.string().optional(),
    training_type: z.string().optional(),

    // Optionnel : validation des fichiers côté client (taille, type)
    attachments: z.any().optional(),
})

type TicketFormValues = z.infer<typeof ticketSchema>

export function CreateTicketContent() {
    const router = useRouter()
    const { data, isLoading: dataLoading } = useClientsAndStores()
    const clients = data?.clients || []
    const stores = data?.stores || []

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
            quote_number: '',
            invoice_number: '',
            service_type: '',
            serial_number: '',
            product_reference: '',
            hardware_status: '',
            travel_date: '',
            training_location: '',
            training_type: '',
        }
    })

    const selectedClientId = form.watch('client_id')
    const selectedStoreId = form.watch('store_id')
    const selectedCategory = form.watch('category')
    const filteredStores = stores.filter(store => store.client_id === selectedClientId)

    const onSubmit = async (values: TicketFormValues) => {
        setIsSubmitting(true)
        setSubmitError(null)

        const formData = new FormData()
        formData.append('title', values.title)
        formData.append('description', values.description)
        formData.append('client_id', values.client_id)
        formData.append('store_id', values.store_id)
        if (values.problem_location) formData.append('problem_location', values.problem_location)
        formData.append('priority', values.priority)
        formData.append('category', values.category)
        if (values.contact_id) formData.append('contact_id', values.contact_id)

        if (values.category === 'COMMERCE') {
            if (values.quote_number) formData.append('quote_number', values.quote_number)
            if (values.invoice_number) formData.append('invoice_number', values.invoice_number)
            if (values.service_type) formData.append('service_type', values.service_type)
        } else if (values.category === 'SAV') {
            if (values.serial_number) formData.append('serial_number', values.serial_number)
            if (values.product_reference) formData.append('product_reference', values.product_reference)
            if (values.hardware_status) formData.append('hardware_status', values.hardware_status)
        } else if (values.category === 'FORMATION') {
            if (values.travel_date) formData.append('travel_date', values.travel_date)
            if (values.training_location) formData.append('training_location', values.training_location)
            if (values.training_type) formData.append('training_type', values.training_type)
        }

        // Compression des fichiers sélectionnés si ce sont des images
        const { compressFileIfImage } = await import('@/utils/compressImage')

        for (const file of selectedFiles) {
            const processedFile = await compressFileIfImage(file)
            formData.append('attachments', processedFile)
        }

        const result = await createTicket(formData)

        if (result.error) {
            setSubmitError(result.error)
            setIsSubmitting(false)
        } else {
            router.push('/dashboard')
        }
    }

    if (dataLoading) {
        return (
            <div className="flex h-screen items-center justify-center p-8 bg-[#0a0a0a]">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white/70" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent flex items-center gap-3">
                            <Ticket className="w-6 h-6 text-amber-500" />
                            Créer un nouveau ticket
                        </h1>
                        <p className="text-white/50 text-sm mt-1">Déclarez un incident et joignez toutes les informations utiles.</p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="p-6 md:p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

                    <form onSubmit={form.handleSubmit(onSubmit)} className="relative z-10 space-y-6">
                        {submitError && (
                            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p>{submitError}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-white/80">Catégorie du Ticket <span className="text-rose-500">*</span></label>
                                <select
                                    {...form.register('category')}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none"
                                >
                                    <option value="HL">Support HotLine (HL)</option>
                                    <option value="COMMERCE">Service Commerce</option>
                                    <option value="SAV">Service Après-Vente (SAV)</option>
                                    <option value="FORMATION">Service Formation</option>
                                </select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-white/80">Titre du problème <span className="text-rose-500">*</span></label>
                                <input
                                    {...form.register('title')}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-medium"
                                    placeholder="Ex: Caisse n°2 en panne d'affichage"
                                />
                                {form.formState.errors.title && <p className="text-xs text-rose-400 mt-1">{form.formState.errors.title.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/80">Client <span className="text-rose-500">*</span></label>
                                <select
                                    {...form.register('client_id')}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none"
                                >
                                    <option value="">Sélectionner un client...</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.company}</option>
                                    ))}
                                </select>
                                {form.formState.errors.client_id && <p className="text-xs text-rose-400 mt-1">{form.formState.errors.client_id.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/80">Magasin <span className="text-rose-500">*</span></label>
                                <select
                                    {...form.register('store_id')}
                                    disabled={!selectedClientId}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none disabled:opacity-50"
                                >
                                    <option value="">Sélectionner un magasin...</option>
                                    {filteredStores.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} {s.city ? `(${s.city})` : ''}</option>
                                    ))}
                                </select>
                                {form.formState.errors.store_id && <p className="text-xs text-rose-400 mt-1">{form.formState.errors.store_id.message}</p>}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-white/80 flex items-center gap-2">
                                    <UserCircle className="w-4 h-4 text-white/50" />
                                    Interlocuteur / Contact
                                </label>
                                {!selectedClientId ? (
                                    <div className="p-3 bg-black/20 border border-white/5 rounded-xl text-white/40 text-sm">
                                        Sélectionnez d'abord un client pour rechercher ou créer un contact.
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

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/80">Priorité <span className="text-rose-500">*</span></label>
                                <select
                                    {...form.register('priority')}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none"
                                >
                                    <option value="basse">Basse</option>
                                    <option value="normale">Normale</option>
                                    <option value="haute">Haute</option>
                                    <option value="critique">Critique (Bloquant)</option>
                                </select>
                                {form.formState.errors.priority && <p className="text-xs text-rose-400 mt-1">{form.formState.errors.priority.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/80">Localisation (Optionnel)</label>
                                <input
                                    {...form.register('problem_location')}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                                    placeholder="Ex: Rayon frais, Serveur principal..."
                                />
                            </div>

                            {/* DÉTAILS COMMERCE */}
                            {selectedCategory === 'COMMERCE' && (
                                <div className="space-y-4 md:col-span-2 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                    <h3 className="text-sm font-bold text-indigo-400">Détails Commerce</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/70">Numéro de devis</label>
                                            <input {...form.register('quote_number')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50" placeholder="Ex: DEV-2026-001" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/70">Numéro de facture</label>
                                            <input {...form.register('invoice_number')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50" placeholder="Ex: FAC-2026-001" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/70">Type de prestation</label>
                                            <input {...form.register('service_type')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50" placeholder="Ex: Renouvellement, Vente..." />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DÉTAILS SAV */}
                            {selectedCategory === 'SAV' && (
                                <div className="space-y-4 md:col-span-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                    <h3 className="text-sm font-bold text-rose-400">Détails SAV</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/70">Numéro de série</label>
                                            <input {...form.register('serial_number')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-rose-500/50" placeholder="Ex: SN-123456789" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/70">Référence Produit</label>
                                            <input {...form.register('product_reference')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-rose-500/50" placeholder="Ex: TPE-Ingenico-Move5000" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/70">État du matériel</label>
                                            <input {...form.register('hardware_status')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-rose-500/50" placeholder="Ex: Ne s'allume plus..." />
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
                                            <label className="text-xs text-white/70">Date de déplacement</label>
                                            <input type="date" {...form.register('travel_date')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-emerald-500/50" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/70">Lieu de formation</label>
                                            <input {...form.register('training_location')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-emerald-500/50" placeholder="Ex: Sur site, Distanciel..." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/70">Type de formation</label>
                                            <input {...form.register('training_type')} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-emerald-500/50" placeholder="Ex: Initiale..." />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-white/80">Description détaillée <span className="text-rose-500">*</span></label>
                                <textarea
                                    {...form.register('description')}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y min-h-[160px] transition-all"
                                    placeholder="Décrivez précisément les symptômes, les actions déjà tentées..."
                                />
                                {form.formState.errors.description && <p className="text-xs text-rose-400 mt-1">{form.formState.errors.description.message}</p>}
                            </div>

                            <div className="space-y-4 md:col-span-2 pt-4 border-t border-white/10">
                                <label className="text-sm font-bold text-white/80 flex items-center gap-2">
                                    <UploadCloud className="w-4 h-4 text-white/50" />
                                    Pièces jointes (Photos, Logs, PDF...)
                                </label>
                                <div className="relative group cursor-pointer">
                                    <div className="absolute inset-0 bg-indigo-500/5 rounded-xl border border-dashed border-indigo-500/30 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/50 transition-all" />
                                    <input
                                        id="attachments"
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
                                        <UploadCloud className="w-8 h-8 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                                        <p className="text-sm font-medium text-white/80">Cliquez ou glissez vos fichiers ici</p>
                                        <p className="text-xs text-white/40 mt-1">Multiples fichiers autorisés</p>
                                    </div>
                                </div>
                                {selectedFiles.length > 0 && (
                                    <div className="space-y-2 mt-4">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/10">
                                                <div className="flex items-center gap-3">
                                                    <File className="w-5 h-5 text-indigo-400" />
                                                    <span className="text-sm text-white truncate max-w-[200px]">{file.name}</span>
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

                        <div className="pt-6 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Créer le ticket
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
