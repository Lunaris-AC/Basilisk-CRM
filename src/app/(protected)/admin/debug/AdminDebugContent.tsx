'use client'

import { useState } from 'react'
import { forceChangeUserRole, unassignAllUserTickets, softDeleteOldClosedTickets } from '@/features/admin/actions'
import { ShieldAlert, UserCog, Trash2, Flame, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type UserProfile = {
    id: string
    first_name: string
    last_name: string
    role: string
}

export function AdminDebugContent({ users }: { users: UserProfile[] }) {
    const router = useRouter()
    const [isLoadingRole, setIsLoadingRole] = useState(false)
    const [isLoadingPurge, setIsLoadingPurge] = useState(false)
    const [isLoadingNuke, setIsLoadingNuke] = useState(false)

    // States for Usurpation
    const [selectedUserForRole, setSelectedUserForRole] = useState('')
    const [selectedRole, setSelectedRole] = useState('N1')

    // States for Purge
    const [selectedUserForPurge, setSelectedUserForPurge] = useState('')

    const handleRoleChange = async () => {
        if (!selectedUserForRole) return alert("Sélectionnez un utilisateur")
        setIsLoadingRole(true)
        const res = await forceChangeUserRole(selectedUserForRole, selectedRole)
        if (res.error) alert(res.error)
        else {
            alert("Rôle modifié avec succès !")
            router.refresh()
        }
        setIsLoadingRole(false)
    }

    const handlePurge = async () => {
        if (!selectedUserForPurge) return alert("Sélectionnez un utilisateur")
        if (!confirm("Voulez-vous vraiment désassigner tous les tickets de cet utilisateur ?")) return

        setIsLoadingPurge(true)
        const res = await unassignAllUserTickets(selectedUserForPurge)
        if (res.error) alert(res.error)
        else {
            alert(res.message)
            router.refresh()
        }
        setIsLoadingPurge(false)
    }

    const handleNuke = async () => {
        if (!confirm("ATTENTION : Cette action va archiver (soft delete) TOUS les tickets fermés depuis plus de 30 jours. Êtes-vous absolument sûr ?")) return

        setIsLoadingNuke(true)
        const res = await softDeleteOldClosedTickets()
        if (res.error) alert(res.error)
        else {
            alert(`Nuke terminé. ${res.count} tickets archivés.`)
            router.refresh()
        }
        setIsLoadingNuke(false)
    }

    return (
        <div className="space-y-8 pb-10">
            {/* EN-TÊTE DANGER */}
            <div className="p-8 rounded-3xl bg-rose-500/10 border-2 border-rose-500/50 backdrop-blur-xl shadow-[0_0_50px_rgba(244,63,94,0.15)] relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50" />
                <div className="flex items-start gap-6 relative z-10">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* BLOC 1 : USURPATION DE RÔLE */}
                <div className="p-6 rounded-2xl bg-black/60 border border-rose-500/20 backdrop-blur-md shadow-2xl relative group hover:border-rose-500/40 transition-all">
                    <div className="flex items-center gap-3 mb-6">
                        <UserCog className="w-6 h-6 text-rose-400" />
                        <h2 className="text-xl font-bold text-white">Changement de Grade</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-1.5">Utilisateur cible</label>
                            <select
                                value={selectedUserForRole}
                                onChange={(e) => setSelectedUserForRole(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-rose-500/50"
                            >
                                <option value="">Choisir un utilisateur...</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.last_name} {u.first_name} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-1.5">Nouveau Rôle</label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-rose-500/50"
                            >
                                <option value="STANDARD">Standard</option>
                                <option value="COM">Commercial (COM)</option>
                                <option value="SAV1">SAV Niveau 1 (SAV1)</option>
                                <option value="SAV2">SAV Niveau 2 (SAV2)</option>
                                <option value="N1">Niveau 1 (N1)</option>
                                <option value="N2">Niveau 2 (N2)</option>
                                <option value="N3">Niveau 3 (N3)</option>
                                <option value="N4">Expert (N4)</option>
                                <option value="ADMIN">Administrateur (ADMIN)</option>
                                <option value="FORMATEUR">Formateur</option>
                            </select>
                        </div>
                        <button
                            onClick={handleRoleChange}
                            disabled={isLoadingRole || !selectedUserForRole}
                            className="w-full py-3 mt-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isLoadingRole ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Forcer la mutation'}
                        </button>
                    </div>
                </div>

                {/* BLOC 2 : PURGE DES TICKETS */}
                <div className="p-6 rounded-2xl bg-black/60 border border-orange-500/20 backdrop-blur-md shadow-2xl relative group hover:border-orange-500/40 transition-all">
                    <div className="flex items-center gap-3 mb-6">
                        <Trash2 className="w-6 h-6 text-orange-400" />
                        <h2 className="text-xl font-bold text-white">Purge d'Assignation</h2>
                    </div>
                    <p className="text-sm text-white/40 mb-6">Retire tous les tickets actuellement assignés à l'utilisateur sélectionné. Ils repasseront en file d'attente (incidents).</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-1.5">Utilisateur à purger</label>
                            <select
                                value={selectedUserForPurge}
                                onChange={(e) => setSelectedUserForPurge(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
                            >
                                <option value="">Choisir un utilisateur...</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.last_name} {u.first_name} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handlePurge}
                            disabled={isLoadingPurge || !selectedUserForPurge}
                            className="w-full py-3 mt-2 rounded-xl bg-orange-600/20 border border-orange-500/50 text-orange-400 hover:bg-orange-500/30 hover:text-orange-300 font-bold transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isLoadingPurge ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Désassigner tous ses tickets'}
                        </button>
                    </div>
                </div>

                {/* BLOC 3 : NUKE */}
                <div className="lg:col-span-2 p-8 rounded-2xl bg-gradient-to-r from-red-950/80 to-black border border-red-500/30 backdrop-blur-md shadow-[0_0_30px_rgba(220,38,38,0.1)] mt-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <Flame className="w-8 h-8 text-red-500 animate-pulse" />
                                <h2 className="text-2xl font-black text-red-500 tracking-wider">PROTOCOLE NUKE</h2>
                            </div>
                            <p className="text-red-200/50 font-medium">
                                Archiver (soft delete) absolument tous les tickets dont le statut est "Fermé" depuis plus de 30 jours calendaires. Cette action est irréversible depuis l'interface client.
                            </p>
                        </div>
                        <button
                            onClick={handleNuke}
                            disabled={isLoadingNuke}
                            className="px-8 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 w-full md:w-auto shrink-0"
                        >
                            {isLoadingNuke ? <Loader2 className="w-6 h-6 animate-spin" /> : 'LANCER LE NUKE'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
