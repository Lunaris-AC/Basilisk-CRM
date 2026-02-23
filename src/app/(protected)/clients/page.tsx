'use client'

import { useClientsWithStores, Client } from '@/features/clients/api/useClients'
import { addContact } from '@/features/clients/actions'
import { useAuthUser } from '@/features/tickets/api/useTickets'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import {
    Loader2, Users, Plus, ChevronDown, ChevronRight, Mail, Phone, MapPin,
    Store as StoreIcon, UserCircle, Briefcase, X
} from 'lucide-react'
import { Fragment, useState } from 'react'
import { toast } from 'sonner'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ClientsPage() {
    const { data: clients, isLoading } = useClientsWithStores()
    const { data: user } = useAuthUser()
    const queryClient = useQueryClient()
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
    const [activeTab, setActiveTab] = useState<Record<string, 'stores' | 'contacts'>>({})

    // Add contact modal
    const [contactModalOpen, setContactModalOpen] = useState(false)
    const [contactModalClientId, setContactModalClientId] = useState<string>('')
    const [contactForm, setContactForm] = useState({ first_name: '', last_name: '', email: '', phone: '', job_title: '' })
    const [isSubmittingContact, setIsSubmittingContact] = useState(false)

    const { data: profile } = useQuery({
        queryKey: ['my-profile-clients'],
        queryFn: async () => {
            const supabase = createClient()
            if (!user?.id) return null
            const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            return data
        },
        enabled: !!user?.id
    })

    const toggleExpand = (clientId: string) => {
        const newSet = new Set(expandedClients)
        if (newSet.has(clientId)) {
            newSet.delete(clientId)
        } else {
            newSet.add(clientId)
            if (!activeTab[clientId]) setActiveTab(prev => ({ ...prev, [clientId]: 'stores' }))
        }
        setExpandedClients(newSet)
    }

    const canAdd = profile?.role === 'COM' || profile?.role === 'N4' || profile?.role === 'ADMIN'

    const handleAddContact = async () => {
        if (!contactForm.first_name || !contactForm.last_name) return
        setIsSubmittingContact(true)
        const res = await addContact({ client_id: contactModalClientId, ...contactForm })
        if (res.success) {
            toast.success('Contact ajouté avec succès')
            queryClient.invalidateQueries({ queryKey: ['clients-with-stores'] })
            setContactModalOpen(false)
            setContactForm({ first_name: '', last_name: '', email: '', phone: '', job_title: '' })
        } else {
            toast.error(res.error || 'Erreur')
        }
        setIsSubmittingContact(false)
    }

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                        <Users className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Gestion des Clients</h1>
                        <p className="text-white/50 text-sm mt-1">Entreprises, magasins et interlocuteurs.</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-white/10">
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Entreprise</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Téléphone</TableHead>
                            <TableHead className="text-right">Magasins</TableHead>
                            <TableHead className="text-right">Contacts</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients?.map((client) => {
                            const tab = activeTab[client.id] || 'stores'
                            const isExpanded = expandedClients.has(client.id)

                            return (
                                <Fragment key={client.id}>
                                    <TableRow
                                        className="cursor-pointer hover:bg-white/5 border-white/5 transition-colors"
                                        onClick={() => toggleExpand(client.id)}
                                    >
                                        <TableCell>
                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-400" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
                                        </TableCell>
                                        <TableCell className="font-bold text-white">{client.company}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-white/60">
                                                <Mail className="w-3.5 h-3.5" />
                                                {client.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-white/60">
                                                <Phone className="w-3.5 h-3.5" />
                                                {client.phone}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-bold border border-indigo-500/20">
                                                {client.stores?.length || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-bold border border-emerald-500/20">
                                                {client.contacts?.filter(c => c.is_active)?.length || 0}
                                            </span>
                                        </TableCell>
                                    </TableRow>

                                    {isExpanded && (
                                        <TableRow className="bg-black/20 hover:bg-black/20 border-none">
                                            <TableCell colSpan={6} className="p-0">
                                                <div className="px-10 py-5 space-y-4">
                                                    {/* Tabs */}
                                                    <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 w-fit">
                                                        <button
                                                            onClick={() => setActiveTab(prev => ({ ...prev, [client.id]: 'stores' }))}
                                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'stores' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                                                        >
                                                            <StoreIcon className="w-3.5 h-3.5 inline mr-1.5" />
                                                            Magasins ({client.stores?.length || 0})
                                                        </button>
                                                        <button
                                                            onClick={() => setActiveTab(prev => ({ ...prev, [client.id]: 'contacts' }))}
                                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'contacts' ? 'bg-emerald-500 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                                                        >
                                                            <UserCircle className="w-3.5 h-3.5 inline mr-1.5" />
                                                            Contacts ({client.contacts?.filter(c => c.is_active)?.length || 0})
                                                        </button>
                                                    </div>

                                                    {/* Stores Tab */}
                                                    {tab === 'stores' && (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {client.stores?.length ? client.stores.map(store => (
                                                                <div key={store.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                                                        <StoreIcon className="w-4 h-4 text-white/50" />
                                                                    </div>
                                                                    <div className="overflow-hidden">
                                                                        <p className="text-sm font-semibold text-white truncate">{store.name}</p>
                                                                        <div className="flex items-center gap-1 text-[11px] text-white/40">
                                                                            <MapPin className="w-3 h-3" />
                                                                            {store.city}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )) : (
                                                                <p className="text-xs text-white/30 italic col-span-3">Aucun magasin enregistré.</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Contacts Tab */}
                                                    {tab === 'contacts' && (
                                                        <div className="space-y-3">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                {client.contacts?.filter(c => c.is_active)?.map(contact => (
                                                                    <div key={contact.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                                                                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-sm font-bold text-emerald-300 flex-shrink-0">
                                                                            {contact.first_name[0]}{contact.last_name[0]}
                                                                        </div>
                                                                        <div className="overflow-hidden space-y-1">
                                                                            <p className="text-sm font-bold text-white">{contact.first_name} {contact.last_name}</p>
                                                                            {contact.job_title && (
                                                                                <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                                                                                    <Briefcase className="w-3 h-3" />
                                                                                    {contact.job_title}
                                                                                </div>
                                                                            )}
                                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/40">
                                                                                {contact.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>}
                                                                                {contact.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {(!client.contacts?.filter(c => c.is_active)?.length) && (
                                                                    <p className="text-xs text-white/30 italic col-span-2">Aucun contact enregistré.</p>
                                                                )}
                                                            </div>

                                                            {canAdd && (
                                                                <button
                                                                    onClick={() => {
                                                                        setContactModalClientId(client.id)
                                                                        setContactModalOpen(true)
                                                                    }}
                                                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-500/20 transition-all"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                    Ajouter un contact
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Add Contact Modal */}
            <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-emerald-300 flex items-center gap-2">
                            <UserCircle className="w-5 h-5" />
                            Nouveau Contact
                        </DialogTitle>
                        <DialogDescription className="text-white/60">
                            Ajoutez un interlocuteur pour cette entreprise.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-white/80">Prénom *</Label>
                                <Input
                                    value={contactForm.first_name}
                                    onChange={e => setContactForm(f => ({ ...f, first_name: e.target.value }))}
                                    className="bg-black/40 border-white/10 text-white"
                                    placeholder="Pierre"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/80">Nom *</Label>
                                <Input
                                    value={contactForm.last_name}
                                    onChange={e => setContactForm(f => ({ ...f, last_name: e.target.value }))}
                                    className="bg-black/40 border-white/10 text-white"
                                    placeholder="Durand"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-white/80">Fonction</Label>
                            <Input
                                value={contactForm.job_title}
                                onChange={e => setContactForm(f => ({ ...f, job_title: e.target.value }))}
                                className="bg-black/40 border-white/10 text-white"
                                placeholder="Manager, DSI, Responsable..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-white/80">Email</Label>
                                <Input
                                    value={contactForm.email}
                                    onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                                    className="bg-black/40 border-white/10 text-white"
                                    placeholder="email@exemple.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/80">Téléphone</Label>
                                <Input
                                    value={contactForm.phone}
                                    onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                                    className="bg-black/40 border-white/10 text-white"
                                    placeholder="0612345678"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <button
                            onClick={() => setContactModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleAddContact}
                            disabled={!contactForm.first_name.trim() || !contactForm.last_name.trim() || isSubmittingContact}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmittingContact && <Loader2 className="w-4 h-4 animate-spin" />}
                            Ajouter
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
