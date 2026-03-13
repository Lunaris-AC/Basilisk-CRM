'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { Ticket, FileText, BookOpen, ExternalLink, Loader2, Building2, Code2 } from 'lucide-react'
import { useState, useEffect } from 'react'

export function ClientDashboard() {
    const [mounted, setMounted] = useState(false)
    
    useEffect(() => {
        setMounted(true)
    }, [])

    // Fetch le contact_id du profil connecté, puis les tickets de son magasin
    const { data, isLoading } = useQuery({
        queryKey: ['client-dashboard'],
        queryFn: async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            // HOTFIX 29.5: Récupérer le profil avec son contact et directement son store_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('contact_id, store_id')
                .eq('id', user.id)
                .single()

            if (!profile?.store_id) return { storeTickets: [], linkedSDs: [], storeName: null }

            // Récupérer le nom du magasin et l'entreprise via le contact (optionnel)
            let storeName = 'Mon magasin'
            if (profile.contact_id) {
                const { data: contact } = await supabase
                    .from('contacts')
                    .select('stores(name), clients(company)')
                    .eq('id', profile.contact_id)
                    .single()
                storeName = (contact as any)?.stores?.name || (contact as any)?.clients?.company || 'Mon magasin'
            } else {
                const { data: storeDetails } = await supabase.from('stores').select('name').eq('id', profile.store_id).single()
                if (storeDetails?.name) storeName = storeDetails.name
            }

            // Tickets du magasin (filtrage direct via le store_id du profil)
            const ticketQuery = supabase
                .from('tickets')
                .select('id, title, status, priority, category, created_at, updated_at')
                .eq('store_id', profile.store_id)
                .order('created_at', { ascending: false })
                .limit(20)

            const { data: storeTickets } = await ticketQuery

            // Bugs liés — récupérer les SDs linkés aux tickets du magasin
            const sdIds = (storeTickets || [])
                .map((t: any) => t.linked_sd_id)
                .filter(Boolean)

            let linkedSDs: any[] = []
            if (sdIds.length > 0) {
                const { data: sds } = await supabase
                    .from('tickets')
                    .select('id, title, status, priority')
                    .in('id', sdIds)
                linkedSDs = sds || []
            }

            // Pour les SDs liés, on fait un 2ème fetch avec linked_sd_id
            const { data: ticketsWithSD } = await supabase
                .from('tickets')
                .select('id, title, status, linked_sd_id, linked_sd:tickets!tickets_linked_sd_id_fkey(id, title, status, priority)')
                .not('linked_sd_id', 'is', null)
                .order('created_at', { ascending: false })
                .limit(10)

            return {
                storeTickets: storeTickets || [],
                linkedSDs: (ticketsWithSD || []).filter((t: any) => t.linked_sd),
                storeName,
            }
        },
        staleTime: 60_000,
    })

    const statusColors: Record<string, string> = {
        nouveau: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        assigne: 'bg-primary/15 text-primary/80 border-primary/30',
        en_cours: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        attente_client: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
        resolu: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        ferme: 'bg-white/5 text-muted-foreground border-white/10',
        suspendu: 'bg-primary/15 text-primary/80 border-primary/30',
    }

    if (!mounted || isLoading) return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
    )

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2 flex items-center gap-3">
                    <Building2 className="w-9 h-9 text-cyan-400" />
                    {data?.storeName || 'Portail Client'}
                </h1>
                <p className="text-muted-foreground font-medium">Suivi de vos tickets et mises à jour logicielles.</p>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/documentation" className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl hover:bg-white/[0.05] transition-all group flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary/80" />
                    </div>
                    <div>
                        <p className="text-foreground font-bold">Documentation</p>
                        <p className="text-muted-foreground text-xs">Manuels, guides et procédures</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-foreground/20 ml-auto group-hover:text-primary/80 transition-colors" />
                </Link>
                <Link href="/patch-notes" className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl hover:bg-white/[0.05] transition-all group flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-foreground font-bold">Patch Notes</p>
                        <p className="text-muted-foreground text-xs">Dernières mises à jour logicielles</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-foreground/20 ml-auto group-hover:text-emerald-400 transition-colors" />
                </Link>
            </div>

            {/* Tickets du magasin */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-5 flex items-center gap-2">
                    <Ticket className="w-3.5 h-3.5 text-cyan-400" />
                    Tickets de votre magasin
                </h3>
                {(data?.storeTickets || []).length === 0 ? (
                    <p className="text-foreground/20 text-sm text-center py-8">Aucun ticket trouvé.</p>
                ) : (
                    <div className="space-y-2">
                        {(data?.storeTickets || []).map((t: any) => (
                            <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors group">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${statusColors[t.status] || 'bg-white/5 text-muted-foreground border-white/10'}`}>{t.status}</span>
                                <span className="text-foreground/70 text-xs truncate flex-1">{t.title}</span>
                                <span className="text-foreground/20 text-[10px] shrink-0">{t.category}</span>
                                <span className="text-foreground/15 text-[10px] shrink-0">{mounted ? new Date(t.created_at).toLocaleDateString('fr-FR') : '...'}</span>
                                <ExternalLink className="w-3 h-3 text-foreground/20 group-hover:text-cyan-400 transition-colors shrink-0" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Bugs Logiciels Associés */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-5 flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-primary/80" />
                    Bugs Logiciels en Cours
                </h3>
                {(data?.linkedSDs || []).length === 0 ? (
                    <p className="text-foreground/20 text-sm text-center py-8">Aucun bug logiciel rattaché à vos tickets.</p>
                ) : (
                    <div className="space-y-2">
                        {(data?.linkedSDs || []).map((t: any) => {
                            const sd = Array.isArray(t.linked_sd) ? t.linked_sd[0] : t.linked_sd
                            if (!sd) return null
                            return (
                                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-primary/[0.04] border border-primary/10">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${statusColors[sd.status] || 'bg-white/5 text-muted-foreground border-white/10'}`}>{sd.status}</span>
                                    <span className="text-muted-foreground text-xs truncate flex-1">{sd.title}</span>
                                    <span className={`text-[10px] font-bold ${sd.priority === 'critique' ? 'text-rose-400' : sd.priority === 'haute' ? 'text-orange-400' : 'text-muted-foreground'}`}>{sd.priority}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
