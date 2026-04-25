'use client'

import { useState } from 'react'
import { forceChangeUserRole, unassignAllUserTickets, softDeleteOldClosedTickets, adminUpdateProfile, adminForceEditTicket, getStoresForSelect, updateSlaPolicy } from '@/features/admin/actions'
import { ShieldAlert, UserCog, Trash2, Flame, Loader2, Users, Ticket, CheckCircle, XCircle, Pencil, Save, X, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/utils/supabase/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSupportLevels } from '@/features/tickets/api/useTickets'

type UserProfile = {
    id: string
    first_name: string
    last_name: string
    role: string;
  support_level?: string
    is_active?: boolean
    support_level_id?: string | null
    store_id?: string | null
}

type TicketRow = {
    id: string
    title: string
    status: string
    priority: string
    category: string
    escalation_level: number
    assignee_id: string | null
    created_at: string
    assignee?: { first_name: string; last_name: string } | null
}

export function ControlCenterContent({ users }: { users: UserProfile[] }) {
    const router = useRouter()
    const queryClient = useQueryClient()

    return (
        <div id="god-mode-content" className="space-y-8 pb-10 bg-background">
            {/* EN-TÊTE DANGER */}
            <div className="p-8 rounded-3xl bg-rose-500/10 border-2 border-rose-500/50 backdrop-blur-xl shadow-[0_0_50px_rgba(244,63,94,0.15)] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50 pointer-events-none" />
                <div className="flex items-start gap-6 relative z-10 flex-1">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex flex-shrink-0 items-center justify-center border border-rose-500/50 shadow-inner">
                        <ShieldAlert className="w-8 h-8 text-rose-400" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-rose-50 tracking-tight mb-2">GOD MODE</h1>
                        <p className="text-rose-200/70 font-medium text-lg">
                            Interface d'administration avancée. Toute action ici impacte instantanément la base de données de production.
                        </p>
                    </div>
                </div>
            </div>

            {/* TABS */}
            <Tabs defaultValue="macros" className="w-full">
                <TabsList className="w-full bg-white/5 border border-white/10 rounded-xl p-1 h-auto flex gap-1">
                    <TabsTrigger value="macros" className="flex-1 data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-300 data-[state=active]:border-rose-500/30 border border-transparent rounded-lg py-3 text-muted-foreground font-bold text-sm transition-all">
                        <Flame className="w-4 h-4 mr-2" /> Macros Systèmes
                    </TabsTrigger>
                    <TabsTrigger value="profiles" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary/80 data-[state=active]:border-primary/30 border border-transparent rounded-lg py-3 text-muted-foreground font-bold text-sm transition-all">
                        <Users className="w-4 h-4 mr-2" /> Explorateur Profils
                    </TabsTrigger>
                    <TabsTrigger value="tickets" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary/80 data-[state=active]:border-primary/30 border border-transparent rounded-lg py-3 text-muted-foreground font-bold text-sm transition-all">
                        <Ticket className="w-4 h-4 mr-2" /> Explorateur Tickets
                    </TabsTrigger>
                    <TabsTrigger value="sla" className="flex-1 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30 border border-transparent rounded-lg py-3 text-muted-foreground font-bold text-sm transition-all">
                        <Clock className="w-4 h-4 mr-2" /> Politiques SLA
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: MACROS */}
                <TabsContent value="macros" className="mt-6">
                    <MacrosTab users={users} />
                </TabsContent>

                {/* TAB 2: PROFILES */}
                <TabsContent value="profiles" className="mt-6">
                    <ProfilesExplorerTab />
                </TabsContent>

                {/* TAB 3: TICKETS */}
                <TabsContent value="tickets" className="mt-6">
                    <TicketsExplorerTab />
                </TabsContent>

                {/* TAB 4: SLA */}
                <TabsContent value="sla" className="mt-6">
                    <SlaPoliciesTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}

// ═══════════════════════════════════════
// TAB 1: MACROS
// ═══════════════════════════════════════
function MacrosTab({ users }: { users: UserProfile[] }) {
    const router = useRouter()
    const [isLoadingRole, setIsLoadingRole] = useState(false)
    const [isLoadingPurge, setIsLoadingPurge] = useState(false)
    const [isLoadingNuke, setIsLoadingNuke] = useState(false)
    const [selectedUserForRole, setSelectedUserForRole] = useState('')
    const [selectedRole, setSelectedRole] = useState('N1')
    const [selectedUserForPurge, setSelectedUserForPurge] = useState('')

    const handleRoleChange = async () => {
        if (!selectedUserForRole) return alert("Sélectionnez un utilisateur")
        setIsLoadingRole(true)
        const res = await forceChangeUserRole(selectedUserForRole, selectedRole)
        if (res.error) alert(res.error)
        else { alert("Rôle modifié avec succès !"); router.refresh() }
        setIsLoadingRole(false)
    }

    const handlePurge = async () => {
        if (!selectedUserForPurge) return alert("Sélectionnez un utilisateur")
        if (!confirm("Voulez-vous vraiment désassigner tous les tickets de cet utilisateur ?")) return
        setIsLoadingPurge(true)
        const res = await unassignAllUserTickets(selectedUserForPurge)
        if (res.error) alert(res.error)
        else { alert(res.message); router.refresh() }
        setIsLoadingPurge(false)
    }

    const handleNuke = async () => {
        if (!confirm("ATTENTION : Cette action va archiver TOUS les tickets fermés depuis plus de 30 jours. Êtes-vous absolument sûr ?")) return
        setIsLoadingNuke(true)
        const res = await softDeleteOldClosedTickets()
        if (res.error) alert(res.error)
        else { alert(`Nuke terminé. ${res.count} tickets archivés.`); router.refresh() }
        setIsLoadingNuke(false)
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Changement de rôle */}
            <div className="p-6 rounded-2xl bg-black/60 border border-rose-500/20 backdrop-blur-md shadow-2xl hover:border-rose-500/40 transition-all">
                <div className="flex items-center gap-3 mb-6">
                    <UserCog className="w-6 h-6 text-rose-400" />
                    <h2 className="text-xl font-bold text-foreground">Changement de Grade</h2>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Utilisateur cible</label>
                        <select value={selectedUserForRole} onChange={e => setSelectedUserForRole(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-foreground focus:outline-none focus:border-rose-500/50">
                            <option value="">Choisir un utilisateur...</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.last_name} {u.first_name} ({u.role})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nouveau Rôle</label>
                        <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-foreground focus:outline-none focus:border-rose-500/50">
                            {['STANDARD', 'COM', 'SAV1', 'SAV2', 'N1', 'N2', 'N3', 'N4', 'ADMIN', 'FORMATEUR', 'DEV'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <button onClick={handleRoleChange} disabled={isLoadingRole || !selectedUserForRole} className="w-full py-3 mt-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                        {isLoadingRole ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Forcer la mutation'}
                    </button>
                </div>
            </div>

            {/* Purge */}
            <div className="p-6 rounded-2xl bg-black/60 border border-orange-500/20 backdrop-blur-md shadow-2xl hover:border-orange-500/40 transition-all">
                <div className="flex items-center gap-3 mb-6">
                    <Trash2 className="w-6 h-6 text-orange-400" />
                    <h2 className="text-xl font-bold text-foreground">Purge d'Assignation</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Retire tous les tickets actuellement assignés à l'utilisateur sélectionné.</p>
                <div className="space-y-4">
                    <select value={selectedUserForPurge} onChange={e => setSelectedUserForPurge(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-foreground focus:outline-none focus:border-orange-500/50">
                        <option value="">Choisir un utilisateur...</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.last_name} {u.first_name} ({u.role})</option>)}
                    </select>
                    <button onClick={handlePurge} disabled={isLoadingPurge || !selectedUserForPurge} className="w-full py-3 mt-2 rounded-xl bg-orange-600/20 border border-orange-500/50 text-orange-400 hover:bg-orange-500/30 font-bold transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                        {isLoadingPurge ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Désassigner tous ses tickets'}
                    </button>
                </div>
            </div>

            {/* Nuke */}
            <div className="lg:col-span-2 p-8 rounded-2xl bg-gradient-to-r from-red-950/80 to-black border border-red-500/30 backdrop-blur-md shadow-[0_0_30px_rgba(220,38,38,0.1)] mt-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <Flame className="w-8 h-8 text-red-500 animate-pulse" />
                            <h2 className="text-2xl font-black text-red-500 tracking-wider">PROTOCOLE NUKE</h2>
                        </div>
                        <p className="text-red-200/50 font-medium">Archiver tous les tickets fermés depuis plus de 30 jours.</p>
                    </div>
                    <button onClick={handleNuke} disabled={isLoadingNuke} className="px-8 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 w-full md:w-auto shrink-0">
                        {isLoadingNuke ? <Loader2 className="w-6 h-6 animate-spin" /> : 'LANCER LE NUKE'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════
// TAB 2: PROFILES EXPLORER
// ═══════════════════════════════════════
function ProfilesExplorerTab() {
    const queryClient = useQueryClient()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState({ role: '', is_active: true, first_name: '', last_name: '', store_id: '' as string | null, support_level_id: '' as string | null, support_level: '' as string | null })
    const [saving, setSaving] = useState(false)

    const { data: profiles, isLoading } = useQuery({
        queryKey: ['admin-all-profiles'],
        queryFn: async () => {
            const supabase = createClient()
            const { data } = await supabase.from('profiles').select('id, first_name, last_name, role, is_active, created_at, store_id, support_level_id').order('last_name')
            return data || []
        },
    })

    const { data: levels } = useSupportLevels()

    const { data: stores } = useQuery({
        queryKey: ['admin-stores-select'],
        queryFn: async () => {
            const res = await getStoresForSelect()
            return res.data || []
        }
    })

    const startEdit = (p: any) => {
        setEditingId(p.id)
        setEditForm({
            role: p.role,
            is_active: p.is_active,
            first_name: p.first_name,
            last_name: p.last_name,
            store_id: p.store_id || null, support_level: p.support_level || null,
            support_level_id: p.support_level_id || null
        })
    }

    const saveEdit = async () => {
        if (!editingId) return
        setSaving(true)
        const res = await adminUpdateProfile(editingId, editForm)
        if (res.error) alert(res.error)
        else { queryClient.invalidateQueries({ queryKey: ['admin-all-profiles'] }); setEditingId(null) }
        setSaving(false)
    }

    return (
        <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.07] backdrop-blur-md overflow-x-auto">
            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                            <th className="pb-3 px-3">Nom</th>
                            <th className="pb-3 px-3">Prénom</th>
                            <th className="pb-3 px-3">Rôle</th>
                            <th className="pb-3 px-3">Niveau Support</th>
                            <th className="pb-3 px-3 text-center">Actif</th>
                            <th className="pb-3 px-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {(profiles || []).map(p => (
                            <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                                {editingId === p.id ? (
                                    <>
                                        <td className="py-2 px-3 "><input value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} className="w-full px-2 py-1 bg-white/5 border border-white/20 rounded-lg text-foreground text-xs" /></td>
                                        <td className="py-2 px-3"><input value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} className="w-full px-2 py-1 bg-white/5 border border-white/20 rounded-lg text-foreground text-xs" /></td>
                                        <td className="py-2 px-3">
                                            <div className="flex flex-col gap-2">
                                                <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="px-2 py-1 bg-white/5 border border-white/20 rounded-lg text-foreground text-xs">
                                                    {['STANDARD', 'COM', 'SAV1', 'SAV2', 'ADMIN', 'FORMATEUR', 'DEV', 'CLIENT', 'TECHNICIEN'].map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                                {editForm.role === 'CLIENT' && (
                                                    <select value={editForm.store_id || ''} onChange={e => setEditForm({ ...editForm, store_id: e.target.value || null })} className="px-2 py-1 bg-white/5 border border-primary/50 rounded-lg text-foreground text-xs">
                                                        <option value="">Aucun magasin lié</option>
                                                        {(stores || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                )}
                                                {/* HOTFIX 32.1 : Inclure les rôles N1/N2/N3/N4 dans le filtre technique */}
                                                {editForm.role === 'TECHNICIEN' && (
      <select value={editForm.support_level || ''} onChange={e => setEditForm({ ...editForm, support_level: e.target.value || null })} className="px-2 py-1 bg-white/5 border border-purple-500/50 rounded-lg text-foreground text-xs mt-2">
        <option value="">[Obligatoire] Niveau de support</option>
        {['N1', 'N2', 'N3', 'N4'].map(l => <option key={l} value={l}>{l}</option>)}
      </select>
  )}
  {['SAV1', 'SAV2', 'DEV', 'ADMIN', 'TECHNICIEN'].includes(editForm.role) && (
                                                    <select value={editForm.support_level_id || ''} onChange={e => setEditForm({ ...editForm, support_level_id: e.target.value || null })} className="px-2 py-1 bg-white/5 border border-amber-500/50 rounded-lg text-foreground text-xs">
                                                        <option value="">Aucun niveau lié</option>
                                                        {(levels || []).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                    </select>
                                                )}
                                            </div>
                                        </td>
                                        {/* Spacer : aligne avec la colonne "Niveau Support" du thead */}
                                        <td className="py-2 px-3" />
                                        <td className="py-2 px-3 text-center">
                                            <button onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })} className={`px-2 py-1 rounded-lg text-xs font-bold ${editForm.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                                {editForm.is_active ? 'Oui' : 'Non'}
                                            </button>
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={saveEdit} disabled={saving} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"><Save className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="py-3 px-3 text-foreground font-medium">{p.last_name}</td>
                                        <td className="py-3 px-3 text-foreground/70">{p.first_name}</td>
                                        <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold tracking-wider text-muted-foreground">{p.role}</span></td>
                                        <td className="py-3 px-3">
                                            {p.support_level_id
                                                ? <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-300">{(levels || []).find((l: any) => l.id === p.support_level_id)?.name ?? '—'}</span>
                                                : <span className="text-foreground/20 text-xs">—</span>
                                            }
                                        </td>
                                        <td className="py-3 px-3 text-center">{p.is_active ? <CheckCircle className="w-4 h-4 text-emerald-400 inline" /> : <XCircle className="w-4 h-4 text-rose-400 inline" />}</td>
                                        <td className="py-3 px-3 text-center">
                                            <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-primary/80 hover:bg-primary/10 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

// ═══════════════════════════════════════
// TAB 3: TICKETS EXPLORER
// ═══════════════════════════════════════
function TicketsExplorerTab() {
    const queryClient = useQueryClient()
    const [editTicketId, setEditTicketId] = useState<string | null>(null)
    const [editTicketForm, setEditTicketForm] = useState<any>({})
    const [saving, setSaving] = useState(false)

    const { data: tickets, isLoading } = useQuery({
        queryKey: ['admin-recent-tickets'],
        queryFn: async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('tickets')
                .select('id, title, status, priority, category, escalation_level, support_level_id, assignee_id, created_at, assignee:profiles!tickets_assignee_id_fkey(first_name, last_name)')
                .order('created_at', { ascending: false })
                .limit(100)
            return (data || []).map((t: any) => ({
                ...t,
                assignee: Array.isArray(t.assignee) ? t.assignee[0] || null : t.assignee,
            })) as TicketRow[]
        },
    })

    const { data: levels } = useSupportLevels()

    const { data: allUsers } = useQuery({
        queryKey: ['admin-all-users-for-assign'],
        queryFn: async () => {
            const supabase = createClient()
            const { data } = await supabase.from('profiles').select('id, first_name, last_name, role').eq('is_active', true).order('last_name')
            return data || []
        },
    })

    const openEdit = (t: any) => {
        setEditTicketId(t.id)
        setEditTicketForm({ status: t.status, priority: t.priority, category: t.category, escalation_level: t.escalation_level, support_level_id: t.support_level_id || '', assignee_id: t.assignee_id || '' })
    }

    const saveTicket = async () => {
        if (!editTicketId) return
        setSaving(true)
        const updates: any = { ...editTicketForm }
        if (updates.assignee_id === '') updates.assignee_id = null
        const res = await adminForceEditTicket(editTicketId, updates)
        if (res.error) alert(res.error)
        else { queryClient.invalidateQueries({ queryKey: ['admin-recent-tickets'] }); setEditTicketId(null) }
        setSaving(false)
    }

    const statusColors: Record<string, string> = {
        nouveau: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        assigne: 'bg-primary/15 text-primary/80 border-primary/30',
        en_cours: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        attente_client: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
        resolu: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        ferme: 'bg-white/5 text-muted-foreground border-white/10',
        suspendu: 'bg-primary/15 text-primary/80 border-primary/30',
    }

    return (
        <>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.07] backdrop-blur-md overflow-x-auto">
                {isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                                <th className="pb-3 px-3">Titre</th>
                                <th className="pb-3 px-3">Statut</th>
                                <th className="pb-3 px-3">Priorité</th>
                                <th className="pb-3 px-3">Catégorie</th>
                                <th className="pb-3 px-3">Niv.</th>
                                <th className="pb-3 px-3">Assigné</th>
                                <th className="pb-3 px-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {(tickets || []).map(t => (
                                <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                                    <td className="py-3 px-3 text-foreground font-medium max-w-[250px] truncate">{t.title}</td>
                                    <td className="py-3 px-3"><span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${statusColors[t.status] || 'bg-white/5 text-muted-foreground'}`}>{t.status}</span></td>
                                    <td className="py-3 px-3 text-muted-foreground text-xs">{t.priority}</td>
                                    <td className="py-3 px-3 text-muted-foreground text-xs">{t.category}</td>
                                    <td className="py-3 px-3 text-muted-foreground text-xs text-center">N{t.escalation_level}</td>
                                    <td className="py-3 px-3 text-muted-foreground text-xs">{t.assignee ? `${t.assignee.first_name} ${t.assignee.last_name}` : '—'}</td>
                                    <td className="py-3 px-3 text-center">
                                        <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-primary/80 hover:bg-primary/10 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Force Edit Modal */}
            <Dialog open={!!editTicketId} onOpenChange={(open) => { if (!open) setEditTicketId(null) }}>
                <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-foreground max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <Pencil className="w-4 h-4 text-primary/80" /> Force Edit — Ticket
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Statut</label>
                            <select value={editTicketForm.status || ''} onChange={e => setEditTicketForm({ ...editTicketForm, status: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-foreground text-sm">
                                {['nouveau', 'assigne', 'en_cours', 'attente_client', 'resolu', 'ferme', 'suspendu'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Priorité</label>
                            <select value={editTicketForm.priority || ''} onChange={e => setEditTicketForm({ ...editTicketForm, priority: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-foreground text-sm">
                                {['basse', 'normale', 'haute', 'critique'].map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Catégorie</label>
                            <select value={editTicketForm.category || ''} onChange={e => setEditTicketForm({ ...editTicketForm, category: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-foreground text-sm">
                                {['HL', 'COMMERCE', 'SAV1', 'SAV2', 'FORMATION', 'DEV'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Niveau d'escalade (Legacy)</label>
                            <select value={editTicketForm.escalation_level || 1} onChange={e => setEditTicketForm({ ...editTicketForm, escalation_level: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-foreground text-sm">
                                {[1, 2, 3, 4].map(n => <option key={n} value={n}>Niveau {n}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Support Grade (SPRINT 26.1)</label>
                            <select value={editTicketForm.support_level_id || ''} onChange={e => setEditTicketForm({ ...editTicketForm, support_level_id: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-foreground text-sm">
                                <option value="">Choisir un grade...</option>
                                {(levels || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Assigné à</label>
                            <select value={editTicketForm.assignee_id || ''} onChange={e => setEditTicketForm({ ...editTicketForm, assignee_id: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-foreground text-sm">
                                <option value="">Non assigné</option>
                                {(allUsers || []).map(u => <option key={u.id} value={u.id}>{u.last_name} {u.first_name} ({u.role})</option>)}
                            </select>
                        </div>
                        <button onClick={saveTicket} disabled={saving} className="w-full py-3 rounded-xl bg-primary hover:bg-primary text-primary-foreground font-bold transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Appliquer les modifications</>}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ═══════════════════════════════════════
// TAB 4: SLA POLICIES
// ═══════════════════════════════════════
function SlaPoliciesTab() {
    const queryClient = useQueryClient()
    const [editingPriority, setEditingPriority] = useState<string | null>(null)
    const [editHours, setEditHours] = useState<number>(0)
    const [saving, setSaving] = useState(false)

    const { data: policies, isLoading } = useQuery({
        queryKey: ['admin-sla-policies'],
        queryFn: async () => {
            const supabase = createClient()
            const { data } = await supabase.from('sla_policies').select('*').order('hours', { ascending: true })
            return data || []
        },
    })

    const handleSave = async (priority: string) => {
        setSaving(true)
        const res = await updateSlaPolicy(priority, editHours)
        if (res.error) alert(res.error)
        else {
            queryClient.invalidateQueries({ queryKey: ['admin-sla-policies'] })
            setEditingPriority(null)
        }
        setSaving(false)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
                <div className="col-span-2 flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
                (policies || []).map((policy) => (
                    <div key={policy.id} className="p-6 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center justify-between group hover:border-amber-500/30 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold capitalize text-foreground">{policy.priority}</h3>
                                <p className="text-sm text-muted-foreground">Délai contractuel : <span className="text-amber-300 font-mono">{policy.hours}h</span></p>
                            </div>
                        </div>

                        {editingPriority === policy.priority ? (
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    value={editHours} 
                                    onChange={(e) => setEditHours(parseInt(e.target.value))}
                                    className="w-20 px-2 py-1 bg-white/5 border border-amber-500/50 rounded-lg text-foreground font-mono text-center"
                                />
                                <button 
                                    onClick={() => handleSave(policy.priority)}
                                    disabled={saving}
                                    className="p-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </button>
                                <button 
                                    onClick={() => setEditingPriority(null)}
                                    className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => { setEditingPriority(policy.priority); setEditHours(policy.hours) }}
                                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white/5 text-muted-foreground hover:text-amber-300 hover:bg-amber-500/10 transition-all"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))
            )}
        </div>
    )
}
