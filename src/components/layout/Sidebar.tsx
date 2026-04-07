'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Ticket, Users, Settings, Inbox, Plus, Code2, FileText, FileCode, Eye, ShieldAlert, ChevronDown, BarChart3, HardDrive, Lock, Award, GitMerge, BookOpen, MessageSquare, Monitor } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { CreateTicketModal } from '@/features/tickets/components/CreateTicketModal'
import { useRiftStore } from '@/hooks/useRiftStore'
import { VersionIndicator } from '@/components/layout/VersionIndicator'

const navigation = [
    { name: 'Dashboard Personnel', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Incidents (File)', href: '/incidents', icon: Inbox, hideForClient: true, htmlId: 'sidebar-queue' },
    { name: 'Portail SD', href: '/sd', icon: Code2, hideForClient: true },
    { name: 'Parc Matériel', href: '/cmdb', icon: HardDrive, allowedRoles: ['ADMIN', 'SAV1', 'SAV2', 'COM'] },
    { name: 'Documentation', href: '/documentation', icon: FileText, hideForClient: true },
    { name: 'Commerce & Ventes', href: '/commerce', icon: FileText, onlyFor: ['ADMIN'], lockedForOthers: true },
    { name: 'Patch Notes', href: '/patch-notes', icon: FileCode, hideForClient: true },
    { name: 'Wiki', href: '/wiki', icon: BookOpen, hideForClient: true },
    { name: 'Clients', href: '/clients', icon: Users, hideForClient: true },
    { name: 'Rift', href: '/rift', icon: MessageSquare, hideForClient: true },
    { name: 'Paramètres', href: '/parametres', icon: Settings },
]

const adminNav = [
    { name: 'Règles de Routage', href: '/admin/routing', icon: GitMerge },
    { name: 'Grades & Niveaux', href: '/admin/grades', icon: Award },
    { name: 'God Mode (Debug)', href: '/admin/debug', icon: ShieldAlert },
    { name: 'Analytics (God\'s Eye)', href: '/admin/analytics', icon: BarChart3, htmlId: 'godseye-nav' },
    { name: 'Wallboard TV', href: '/wallboard', icon: Monitor },
]

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
    const pathname = usePathname()
    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [adminOpen, setAdminOpen] = useState(true)
    const riftTotalUnread = useRiftStore(s => s.totalUnread)
    const { data: profile } = useQuery({
        queryKey: ['my-profile-sidebar'],
        queryFn: async () => {
            const { createClient } = await import('@/utils/supabase/client')
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            return data
        },
        staleTime: 1000 * 60 * 5 // 5 minutes cache
    })

    return (
        <div className={`${mobile ? 'flex' : 'hidden md:flex'} flex-col w-64 h-full bg-black/40 backdrop-blur-xl border-r border-white/10 text-foreground shrink-0 z-50`}>
            <div className="flex items-center justify-center h-20 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary shadow-lg shadow-primary/20 flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-foreground" />
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        Basilisk Support ERP
                    </span>
                </div>
            </div>

            <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                {/* Bouton Nouveau Ticket → ouvre la modale (accessible à tous, y compris CLIENT) */}
                {profile?.role && (
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group w-full bg-gradient-to-r from-primary/20 to-primary/20 border border-primary/30 text-foreground hover:from-primary/30 hover:to-primary/30 hover:border-primary/50"
                    >
                        <Plus className="w-5 h-5 text-primary/80" />
                        <span className="font-semibold text-sm">Nouveau Ticket</span>
                    </button>
                )}

                {navigation.filter(item => {
                    if ((item as any).hideForClient && profile?.role === 'CLIENT') return false
                    if ((item as any).hideForStandard && profile?.role === 'STANDARD') return false
                    if ((item as any).onlyFor && (!profile?.role || !(item as any).onlyFor.includes(profile.role as any))) return false
                    if ((item as any).allowedRoles && (!profile?.role || !(item as any).allowedRoles.includes(profile.role))) return false
                    return true
                }).map((item) => {
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            id={(item as any).htmlId || undefined}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-white/10 text-foreground shadow-sm ring-1 ring-white/20'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary/80' : 'text-muted-foreground group-hover:text-foreground/70'}`} />
                                <span className="font-medium text-sm">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {item.href === '/rift' && riftTotalUnread > 0 && (
                                    <span className="min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-foreground shadow-lg shadow-primary/30">
                                        {riftTotalUnread > 99 ? '99+' : riftTotalUnread}
                                    </span>
                                )}
                                {(item as any).lockedForOthers && <Lock className="w-4 h-4 text-amber-500/70" />}
                            </div>
                        </Link>
                    )
                })}

                {/* ═══ Section ADMIN ═══ */}
                {profile?.role === 'ADMIN' && (
                    <div className="pt-3">
                        <div className="h-px bg-white/5 mb-3" />
                        <button
                            onClick={() => setAdminOpen(!adminOpen)}
                            className="flex items-center justify-between w-full px-4 py-2 text-rose-400/60 hover:text-rose-400 transition-colors"
                        >
                            <span className="text-[10px] font-black tracking-[0.2em] uppercase">Administration</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {adminOpen && (
                            <div className="space-y-1 mt-1">
                                {adminNav.map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            id={(item as any).htmlId || undefined}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                                ? 'bg-rose-500/10 text-rose-300 shadow-sm ring-1 ring-rose-500/20'
                                                : 'text-white/40 hover:text-rose-300 hover:bg-rose-500/5'
                                                }`}
                                        >
                                            <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-rose-400' : 'text-muted-foreground group-hover:text-rose-400'}`} />
                                            <span className="font-medium text-sm">{item.name}</span>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modale de création globale */}
            <CreateTicketModal open={createModalOpen} onOpenChange={setCreateModalOpen} />

            {/* Profile & Role Badge */}
            <div className="p-4 border-t border-white/5">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/10 border border-white/5 backdrop-blur-md flex flex-col gap-2 relative overflow-hidden group">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex flex-shrink-0 items-center justify-center text-foreground font-bold shadow-xl">
                            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                        </div>
                        <div className="flex flex-col truncate">
                            <span className="text-sm font-semibold text-foreground truncate">
                                {profile?.first_name} {profile?.last_name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider border ${(profile?.role === 'TECHNICIEN' && profile?.support_level === 'N4')
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                                    : 'bg-primary/20 text-primary/80 border-primary/50'
                                    }`}>
                                    {profile?.role === 'TECHNICIEN' ? (profile?.support_level === 'N4' ? 'ADMIN N4' : `TECH ${profile?.support_level}`) : `NIVEAU ${profile?.role}`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <VersionIndicator />
            </div>
        </div>
    )
}
