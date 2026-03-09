'use client'

import { useAuthUser } from '@/features/tickets/api/useTickets'
import { updateMyProfile } from '@/features/profiles/actions'
import { createClient } from '@/utils/supabase/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Save, ShieldCheck, Mail, Calendar } from 'lucide-react'
import { toast } from 'sonner'

const profileSchema = z.object({
    first_name: z.string().min(2, "Le prénom est trop court"),
    last_name: z.string().min(2, "Le nom est trop court"),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function ProfilPage() {
    const { data: user } = useAuthUser()
    const queryClient = useQueryClient()

    const { data: profile, isLoading: isProfileLoading } = useQuery({
        queryKey: ['my-profile-settings'],
        queryFn: async () => {
            const supabase = createClient()
            if (!user?.id) return null
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            return data
        },
        enabled: !!user?.id
    })

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        values: profile ? {
            first_name: profile.first_name,
            last_name: profile.last_name,
        } : undefined
    })

    const onSubmit = async (values: ProfileFormValues) => {
        const res = await updateMyProfile(values)
        if (res.success) {
            toast.success('Profil mis à jour avec succès')
            queryClient.invalidateQueries({ queryKey: ['my-profile-settings'] })
            queryClient.invalidateQueries({ queryKey: ['my-profile-sidebar'] })
        } else {
            toast.error(res.error || 'Une erreur est survenue')
        }
    }

    if (isProfileLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* User Summary Card */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/10 opacity-50" />

                        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                            <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-3xl font-black text-foreground shadow-2xl shadow-primary/20">
                                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-foreground">{profile?.first_name} {profile?.last_name}</h3>
                                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-[10px] font-black tracking-widest text-primary/80 uppercase">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    {profile?.role === 'N4' ? 'ADMIN N4' : `NIVEAU ${profile?.role}`}
                                </div>
                            </div>

                            <div className="w-full pt-6 border-t border-white/5 space-y-3">
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs truncate">{user?.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs">Membre depuis {new Date(profile?.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 backdrop-blur-md flex gap-4">
                        <div className="p-2 h-fit rounded-lg bg-amber-500/20">
                            <ShieldCheck className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-200">Sécurité du Compte</h4>
                            <p className="text-xs text-amber-200/50 mt-1 leading-relaxed">
                                Votre niveau d'accès est synchronisé avec les politiques de Basilisk Support ERP.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Edit Form Card */}
                <div className="xl:col-span-2">
                    <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                        <h3 className="text-lg font-bold text-foreground mb-6">Informations Personnelles</h3>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-muted-foreground ml-1">Prénom</label>
                                    <input
                                        {...register('first_name')}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-foreground placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                    {errors.first_name && <p className="text-xs text-rose-400 mt-1 ml-1">{errors.first_name.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-muted-foreground ml-1">Nom</label>
                                    <input
                                        {...register('last_name')}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-foreground placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                    {errors.last_name && <p className="text-xs text-rose-400 mt-1 ml-1">{errors.last_name.message}</p>}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-8 py-4 bg-primary hover:bg-primary/20 text-primary-foreground font-black uppercase tracking-wider text-sm rounded-2xl transition-all shadow-lg shadow-primary/30 flex items-center gap-3 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Sauvegarder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
