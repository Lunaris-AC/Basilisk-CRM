'use client'

import { useClientsWithStores, Client, Centrale, MiniCentrale, Store, Contact } from '@/features/clients/api/useClients'
import { addContact, createEnseigne, createCentrale, createMiniCentrale, createStore } from '@/features/clients/actions'
import { useAuthUser } from '@/features/tickets/api/useTickets'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import {
    Loader2, Plus, ChevronRight, Mail, Phone, MapPin,
    Store as StoreIcon, UserCircle, Briefcase, Building2, Warehouse, GitMerge, Info
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { Separator } from '@/components/ui/separator'

export default function ClientsPage() {
    const { data: clients, isLoading } = useClientsWithStores()
    const { data: user } = useAuthUser()
    const queryClient = useQueryClient()
    
    // States for expansion
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

    // Modals
    const [enseigneModal, setEnseigneModal] = useState(false)
    const [centraleModal, setCentraleModal] = useState<{ open: boolean; client_id: string; clientName: string }>({ open: false, client_id: '', clientName: '' })
    const [miniModal, setMiniModal] = useState<{ open: boolean; centrale_id: string; centraleName: string }>({ open: false, centrale_id: '', centraleName: '' })
    const [storeModal, setStoreModal] = useState<{ open: boolean; client_id: string; centrale_id?: string; mini_centrale_id?: string; levelName: string }>({ open: false, client_id: '', levelName: '' })
    const [contactModal, setContactModal] = useState<{ open: boolean; client_id: string; centrale_id?: string; mini_centrale_id?: string; store_id?: string; levelName: string }>({ open: false, client_id: '', levelName: '' })
    
    // Detail Modal
    const [detailModal, setDetailModal] = useState<{ open: boolean; type: string; data: any }>({ open: false, type: '', data: null })

    const [isSubmitting, setIsSubmitting] = useState(false)

    const { data: profile } = useQuery({
        queryKey: ['my-profile-clients'],
        queryFn: async () => {
            const supabase = createClient()
            if (!user?.id) return null
            const { data } = await supabase.from('profiles').select('role, support_level').eq('id', user.id).single()
            return data
        },
        enabled: !!user?.id
    })

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setExpandedIds(newSet)
    }

    // Now everyone can add contacts
    const canAddContact = true
    const canAddHierarchy = profile?.role === 'COM' || (profile?.role === 'TECHNICIEN' && profile?.support_level === 'N4') || profile?.role === 'ADMIN'

    const refreshData = () => queryClient.invalidateQueries({ queryKey: ['clients-with-stores'] })

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestion des Enseignes"
                subtitle="Structure hiérarchique : Enseignes, Centrales, Mini-Centrales et Magasins."
                icon={Building2}
                rightElement={
                    canAddHierarchy && (
                        <button 
                            onClick={() => setEnseigneModal(true)}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                        >
                            <Plus className="w-4 h-4" /> Nouvelle Enseigne
                        </button>
                    )
                }
            />

            <div className="space-y-4">
                {clients?.map((client) => (
                    <EnseigneNode 
                        key={client.id} 
                        client={client} 
                        expandedIds={expandedIds} 
                        toggleExpand={toggleExpand}
                        canAddHierarchy={canAddHierarchy}
                        canAddContact={canAddContact}
                        onAddCentrale={() => setCentraleModal({ open: true, client_id: client.id, clientName: client.company })}
                        onAddStore={(data: any) => setStoreModal({ open: true, client_id: client.id, ...data })}
                        onAddContact={(levelData: any) => setContactModal({ open: true, client_id: client.id, ...levelData })}
                        onAddMini={(data: any) => setMiniModal({ open: true, ...data })}
                        onShowDetail={(data: any) => setDetailModal({ open: true, type: 'Enseigne', data })}
                    />
                ))}
            </div>

            {/* Modals */}
            <ClientModals 
                enseigneModal={enseigneModal} setEnseigneModal={setEnseigneModal}
                centraleModal={centraleModal} setCentraleModal={setCentraleModal}
                miniModal={miniModal} setMiniModal={setMiniModal}
                storeModal={storeModal} setStoreModal={setStoreModal}
                contactModal={contactModal} setContactModal={setContactModal}
                refreshData={refreshData}
                isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting}
            />

            {/* Detail Modal */}
            <Dialog open={detailModal.open} onOpenChange={open => setDetailModal(prev => ({ ...prev, open }))}>
                <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-primary">
                            <Info className="w-5 h-5" />
                            Détails de l'unité : {detailModal.data?.name || detailModal.data?.company}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Type : {detailModal.type}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-xs uppercase">Nom / Enseigne</Label>
                                <p className="font-bold text-lg">{detailModal.data?.company || detailModal.data?.name}</p>
                            </div>
                            {detailModal.data?.city && (
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs uppercase">Localisation</Label>
                                    <p className="flex items-center gap-1.5 font-medium"><MapPin className="w-4 h-4 text-primary" /> {detailModal.data.city}</p>
                                </div>
                            )}
                        </div>

                        {(detailModal.data?.email || detailModal.data?.phone) && (
                            <div className="grid grid-cols-2 gap-6">
                                {detailModal.data?.email && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground text-xs uppercase">Contact Email</Label>
                                        <p className="flex items-center gap-1.5 font-medium truncate"><Mail className="w-4 h-4 text-primary" /> {detailModal.data.email}</p>
                                    </div>
                                )}
                                {detailModal.data?.phone && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground text-xs uppercase">Téléphone</Label>
                                        <p className="flex items-center gap-1.5 font-medium"><Phone className="w-4 h-4 text-primary" /> {detailModal.data.phone}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <Separator className="bg-white/5" />

                        <div className="space-y-3">
                            <h4 className="text-sm font-bold flex items-center gap-2"><UserCircle className="w-4 h-4" /> Contacts rattachés</h4>
                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {(detailModal.data?.contacts?.length > 0) ? (
                                    detailModal.data.contacts.map((c: any) => (
                                        <div key={c.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-sm">{c.first_name} {c.last_name}</p>
                                                <p className="text-[10px] text-muted-foreground">{c.job_title || 'Pas de titre'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {c.email && <Mail className="w-3.5 h-3.5 text-muted-foreground" />}
                                                {c.phone && <Phone className="w-3.5 h-3.5 text-muted-foreground" />}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground italic py-4 text-center bg-white/[0.02] rounded-xl border border-dashed border-white/10">Aucun contact spécifique trouvé pour cette unité.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function EnseigneNode({ client, expandedIds, toggleExpand, canAddHierarchy, canAddContact, onAddCentrale, onAddStore, onAddContact, onAddMini, onShowDetail }: any) {
    const isExpanded = expandedIds.has(client.id)
    const contacts = client.contacts?.filter((c: any) => c.is_active && !c.centrale_id && !c.mini_centrale_id && !c.store_id) || []

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition-all duration-300">
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => toggleExpand(client.id)}>
                <div className="flex items-center gap-3">
                    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}><ChevronRight className="w-5 h-5 text-muted-foreground" /></div>
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30"><Building2 className="w-5 h-5 text-primary" /></div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-foreground">{client.company}</h3>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onShowDetail(client); }}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors text-muted-foreground"
                            >
                                <Info className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {client.email}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">{client.centrales?.length || 0} Centrales</Badge>
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-white/5 bg-black/20 p-4 pl-12 space-y-4">
                    <div className="flex flex-wrap gap-3 mb-4">
                        {canAddHierarchy && <button onClick={(e) => { e.stopPropagation(); onAddCentrale(); }} className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-500/20 transition-all"><Plus className="w-3.5 h-3.5" /> Ajouter Centrale</button>}
                        {canAddHierarchy && <button onClick={(e) => { e.stopPropagation(); onAddStore({ levelName: client.company }); }} className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-primary/20 transition-all"><Plus className="w-3.5 h-3.5" /> Ajouter Magasin Direct</button>}
                        {canAddContact && <button onClick={(e) => { e.stopPropagation(); onAddContact({ levelName: client.company }); }} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500/20 transition-all"><Plus className="w-3.5 h-3.5" /> Contact Enseigne</button>}
                    </div>

                    {contacts.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                            {contacts.map((contact: any) => <ContactCard key={contact.id} contact={contact} />)}
                        </div>
                    )}

                    <div className="space-y-4">
                        {client.centrales?.map((centrale: any) => (
                            <CentraleNode 
                                key={centrale.id} 
                                centrale={centrale} 
                                expandedIds={expandedIds} 
                                toggleExpand={toggleExpand} 
                                canAddHierarchy={canAddHierarchy} 
                                canAddContact={canAddContact}
                                onAddStore={onAddStore} 
                                onAddContact={onAddContact} 
                                onAddMini={onAddMini}
                                onShowDetail={(data: any) => onShowDetail({ ...data, contacts: data.contacts })}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function CentraleNode({ centrale, expandedIds, toggleExpand, canAddHierarchy, canAddContact, onAddStore, onAddContact, onAddMini, onShowDetail }: any) {
    const isExpanded = expandedIds.has(centrale.id)
    const contacts = centrale.contacts?.filter((c: any) => c.is_active && !c.mini_centrale_id && !c.store_id) || []

    return (
        <div className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
            <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => toggleExpand(centrale.id)}>
                <div className="flex items-center gap-3">
                    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}><ChevronRight className="w-4 h-4 text-muted-foreground" /></div>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30"><Warehouse className="w-4 h-4 text-blue-400" /></div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{centrale.name}</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onShowDetail(centrale); }}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors text-muted-foreground"
                        >
                            <Info className="w-3 h-3" />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-5 bg-purple-500/10 border-purple-500/20 text-purple-400">{centrale.mini_centrales?.length || 0} Mini-Centrales</Badge>
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-white/5 bg-black/10 p-4 pl-10 space-y-4">
                    <div className="flex flex-wrap gap-2 mb-2">
                        {canAddHierarchy && <button onClick={(e) => { e.stopPropagation(); onAddMini({ centrale_id: centrale.id, centraleName: centrale.name }); }} className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold flex items-center gap-1 hover:bg-purple-500/20 transition-all"><Plus className="w-3 h-3" /> Ajouter Mini-Centrale</button>}
                        {canAddHierarchy && <button onClick={(e) => { e.stopPropagation(); onAddStore({ centrale_id: centrale.id, levelName: centrale.name }); }} className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold flex items-center gap-1 hover:bg-primary/20 transition-all"><Plus className="w-3 h-3" /> Ajouter Magasin</button>}
                        {canAddContact && <button onClick={(e) => { e.stopPropagation(); onAddContact({ centrale_id: centrale.id, levelName: centrale.name }); }} className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-500/20 transition-all"><Plus className="w-3 h-3" /> Contact Centrale</button>}
                    </div>

                    {contacts.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {contacts.map((contact: any) => <ContactCard key={contact.id} contact={contact} />)}
                        </div>
                    )}

                    <div className="space-y-4">
                        {centrale.mini_centrales?.map((mini: any) => (
                            <MiniCentraleNode 
                                key={mini.id} 
                                mini={mini} 
                                centrale={centrale} 
                                expandedIds={expandedIds} 
                                toggleExpand={toggleExpand} 
                                canAddHierarchy={canAddHierarchy} 
                                canAddContact={canAddContact}
                                onAddStore={onAddStore} 
                                onAddContact={onAddContact} 
                                onShowDetail={onShowDetail}
                            />
                        ))}

                        {centrale.magasins_directs?.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-2">Magasins Directs</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {centrale.magasins_directs.map((store: any) => (
                                        <StoreNode 
                                            key={store.id} 
                                            store={store} 
                                            centrale={centrale} 
                                            canAddContact={canAddContact}
                                            onAddContact={onAddContact} 
                                            onShowDetail={onShowDetail}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function MiniCentraleNode({ mini, centrale, expandedIds, toggleExpand, canAddHierarchy, canAddContact, onAddStore, onAddContact, onShowDetail }: any) {
    const isExpanded = expandedIds.has(mini.id)
    const contacts = mini.contacts?.filter((c: any) => c.is_active && !c.store_id) || []

    return (
        <div className="rounded-lg border border-white/5 bg-white/5 overflow-hidden">
            <div className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => toggleExpand(mini.id)}>
                <div className="flex items-center gap-3">
                    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}><ChevronRight className="w-4 h-4 text-muted-foreground" /></div>
                    <div className="w-7 h-7 rounded bg-purple-500/20 flex items-center justify-center border border-purple-500/30"><GitMerge className="w-3.5 h-3.5 text-purple-400" /></div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{mini.name}</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onShowDetail(mini); }}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors text-muted-foreground"
                        >
                            <Info className="w-2.5 h-2.5" />
                        </button>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-white/5 bg-black/10 p-3 pl-8 space-y-3">
                    <div className="flex flex-wrap gap-2 mb-1">
                        {canAddHierarchy && <button onClick={(e) => { e.stopPropagation(); onAddStore({ centrale_id: centrale.id, mini_centrale_id: mini.id, levelName: mini.name }); }} className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 text-primary text-[9px] font-bold flex items-center gap-1 hover:bg-primary/20 transition-all"><Plus className="w-2.5 h-2.5" /> Ajouter Magasin</button>}
                        {canAddContact && <button onClick={(e) => { e.stopPropagation(); onAddContact({ centrale_id: centrale.id, mini_centrale_id: mini.id, levelName: mini.name }); }} className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold flex items-center gap-1 hover:bg-emerald-500/20 transition-all"><Plus className="w-2.5 h-2.5" /> Contact Mini-Centrale</button>}
                    </div>
                    {contacts.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {contacts.map((contact: any) => <ContactCard key={contact.id} contact={contact} compact />)}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {mini.stores?.map((store: any) => (
                            <StoreNode 
                                key={store.id} 
                                store={store} 
                                centrale={centrale} 
                                mini={mini} 
                                canAddContact={canAddContact}
                                onAddContact={onAddContact} 
                                onShowDetail={onShowDetail}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function StoreNode({ store, centrale, mini, canAddContact, onAddContact, onShowDetail }: any) {
    const contacts = store.contacts?.filter((c: any) => c.is_active) || []
    
    return (
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2 group hover:border-primary/30 transition-all">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30"><StoreIcon className="w-4 h-4 text-primary" /></div>
                <div className="overflow-hidden flex-1">
                    <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground truncate">{store.name}</p>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onShowDetail(store); }}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                        >
                            <Info className="w-2.5 h-2.5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><MapPin className="w-3 h-3" /> {store.city}</div>
                </div>
            </div>
            
            {contacts.length > 0 && (
                <div className="space-y-1 mt-1">
                    {contacts.map((contact: any) => (
                        <div key={contact.id} className="text-[10px] text-emerald-400/80 flex items-center gap-1 font-medium bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                            <UserCircle className="w-2.5 h-2.5" /> {contact.first_name} {contact.last_name}
                        </div>
                    ))}
                </div>
            )}

            {canAddContact && (
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onAddContact({ 
                            centrale_id: centrale?.id, 
                            mini_centrale_id: mini?.id, 
                            store_id: store.id, 
                            levelName: store.name 
                        }); 
                    }} 
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[9px] font-bold text-emerald-400 hover:text-emerald-300 transition-all mt-1"
                >
                    <Plus className="w-2.5 h-2.5" /> Contact Magasin
                </button>
            )}
        </div>
    )
}

function ContactCard({ contact, compact = false }: any) {
    return (
        <div className={`${compact ? 'p-2' : 'p-3'} rounded-xl bg-white/5 border border-white/5 flex items-start gap-3`}>
            <div className={`${compact ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-sm'} rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-300 flex-shrink-0`}>{contact.first_name[0]}{contact.last_name[0]}</div>
            <div className="overflow-hidden space-y-0.5">
                <p className={`${compact ? 'text-xs' : 'text-sm'} font-bold text-foreground`}>{contact.first_name} {contact.last_name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                    {contact.email && <span className="flex items-center gap-1 truncate max-w-[150px] font-mono text-[9px]"><Mail className="w-2.5 h-2.5" />{contact.email}</span>}
                    {contact.phone && <span className="flex items-center gap-1 font-mono text-[9px]"><Phone className="w-2.5 h-2.5" />{contact.phone}</span>}
                </div>
            </div>
        </div>
    )
}

function ClientModals({ 
    enseigneModal, setEnseigneModal,
    centraleModal, setCentraleModal,
    miniModal, setMiniModal,
    storeModal, setStoreModal,
    contactModal, setContactModal,
    refreshData,
    isSubmitting, setIsSubmitting
}: any) {
    const [enseigneForm, setEnseigneForm] = useState({ company: '', email: '' })
    const [centraleForm, setCentraleForm] = useState({ name: '', city: '' })
    const [miniForm, setMiniForm] = useState({ name: '' })
    const [storeForm, setStoreForm] = useState({ name: '', city: '' })
    const [contactForm, setContactForm] = useState({ first_name: '', last_name: '', email: '', phone: '', job_title: '' })

    const handleAction = async (action: any, formData: any, setModal: any, resetForm: any) => {
        setIsSubmitting(true)
        const res = await action(formData)
        if (res.success) {
            toast.success('Opération réussie')
            refreshData()
            setModal(typeof setModal === 'function' ? false : { ...setModal, open: false })
            resetForm()
        } else {
            toast.error(res.error || 'Erreur')
        }
        setIsSubmitting(false)
    }

    return (
        <>
            {/* Enseigne Modal */}
            <Dialog open={enseigneModal} onOpenChange={setEnseigneModal}>
                <DialogContent className="bg-card border-white/10 text-foreground">
                    <DialogHeader><DialogTitle className="text-primary">Nouvelle Enseigne</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nom de l'entreprise *</Label>
                            <Input value={enseigneForm.company} onChange={e => setEnseigneForm({ ...enseigneForm, company: e.target.value })} className="bg-black/40 border-white/10" placeholder="Ex: Auchan Retail" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email contact (Optionnel)</Label>
                            <Input value={enseigneForm.email} onChange={e => setEnseigneForm({ ...enseigneForm, email: e.target.value })} className="bg-black/40 border-white/10" />
                        </div>
                    </div>
                    <DialogFooter>
                        <button onClick={() => handleAction(createEnseigne, enseigneForm, setEnseigneModal, () => setEnseigneForm({ company: '', email: '' }))} disabled={!enseigneForm.company || isSubmitting} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all">
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Créer l'Enseigne
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Centrale Modal */}
            <Dialog open={centraleModal.open} onOpenChange={open => setCentraleModal({ ...centraleModal, open })}>
                <DialogContent className="bg-card border-white/10 text-foreground">
                    <DialogHeader><DialogTitle className="text-blue-400">Nouvelle Centrale pour {centraleModal.clientName}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nom de la centrale *</Label>
                            <Input value={centraleForm.name} onChange={e => setCentraleForm({ ...centraleForm, name: e.target.value })} className="bg-black/40 border-white/10" placeholder="Ex: Centrale Nord" />
                        </div>
                        <div className="space-y-2">
                            <Label>Ville (Optionnel)</Label>
                            <Input value={centraleForm.city} onChange={e => setCentraleForm({ ...centraleForm, city: e.target.value })} className="bg-black/40 border-white/10" />
                        </div>
                    </div>
                    <DialogFooter>
                        <button onClick={() => handleAction(createCentrale, { ...centraleForm, client_id: centraleModal.client_id }, setCentraleModal, () => setCentraleForm({ name: '', city: '' }))} disabled={!centraleForm.name || isSubmitting} className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all">
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Créer la Centrale
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mini Centrale Modal */}
            <Dialog open={miniModal.open} onOpenChange={open => setMiniModal({ ...miniModal, open })}>
                <DialogContent className="bg-card border-white/10 text-foreground">
                    <DialogHeader><DialogTitle className="text-purple-400">Nouvelle Mini-Centrale pour {miniModal.centraleName}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nom de la mini-centrale *</Label>
                            <Input value={miniForm.name} onChange={e => setMiniForm({ ...miniForm, name: e.target.value })} className="bg-black/40 border-white/10" placeholder="Ex: Secteur IDF" />
                        </div>
                    </div>
                    <DialogFooter>
                        <button onClick={() => handleAction(createMiniCentrale, { ...miniForm, centrale_id: miniModal.centrale_id }, setMiniModal, () => setMiniForm({ name: '' }))} disabled={!miniForm.name || isSubmitting} className="px-6 py-2.5 bg-purple-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-purple-600 transition-all">
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Créer la Mini-Centrale
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Store Modal */}
            <Dialog open={storeModal.open} onOpenChange={open => setStoreModal({ ...storeModal, open })}>
                <DialogContent className="bg-card border-white/10 text-foreground">
                    <DialogHeader><DialogTitle className="text-primary">Nouveau Magasin rattaché à {storeModal.levelName}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nom du magasin *</Label>
                            <Input value={storeForm.name} onChange={e => setStoreForm({ ...storeForm, name: e.target.value })} className="bg-black/40 border-white/10" placeholder="Ex: Auchan Paris" />
                        </div>
                        <div className="space-y-2">
                            <Label>Ville (Optionnel)</Label>
                            <Input value={storeForm.city} onChange={e => setStoreForm({ ...storeForm, city: e.target.value })} className="bg-black/40 border-white/10" />
                        </div>
                    </div>
                    <DialogFooter>
                        <button onClick={() => handleAction(createStore, { ...storeForm, client_id: storeModal.client_id, centrale_id: storeModal.centrale_id, mini_centrale_id: storeModal.mini_centrale_id }, setStoreModal, () => setStoreForm({ name: '', city: '' }))} disabled={!storeForm.name || isSubmitting} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all">
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Créer le Magasin
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Contact Modal */}
            <Dialog open={contactModal.open} onOpenChange={open => setContactModal({ ...contactModal, open })}>
                <DialogContent className="bg-card border-white/10 text-foreground">
                    <DialogHeader><DialogTitle className="text-emerald-400">Nouveau Contact pour {contactModal.levelName}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Prénom *</Label><Input value={contactForm.first_name} onChange={e => setContactForm({ ...contactForm, first_name: e.target.value })} className="bg-black/40 border-white/10" /></div>
                            <div className="space-y-2"><Label>Nom *</Label><Input value={contactForm.last_name} onChange={e => setContactForm({ ...contactForm, last_name: e.target.value })} className="bg-black/40 border-white/10" /></div>
                        </div>
                        <div className="space-y-2"><Label>Job Title</Label><Input value={contactForm.job_title} onChange={e => setContactForm({ ...contactForm, job_title: e.target.value })} className="bg-black/40 border-white/10" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Email</Label><Input value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} className="bg-black/40 border-white/10" /></div>
                            <div className="space-y-2"><Label>Phone</Label><Input value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} className="bg-black/40 border-white/10" /></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <button onClick={() => handleAction(addContact, { ...contactForm, client_id: contactModal.client_id, centrale_id: contactModal.centrale_id, mini_centrale_id: contactModal.mini_centrale_id, store_id: contactModal.store_id }, setContactModal, () => setContactForm({ first_name: '', last_name: '', email: '', phone: '', job_title: '' }))} disabled={!contactForm.first_name || !contactForm.last_name || isSubmitting} className="px-6 py-2.5 bg-emerald-500 text-black rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all">
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Ajouter le Contact
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
