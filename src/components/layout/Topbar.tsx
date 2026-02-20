'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { LogOut, User } from 'lucide-react'
import { useEffect, useState } from 'react'

interface UserProfile {
    first_name: string
    last_name: string
    role: string
}

export function Topbar() {
    const router = useRouter()
    const supabase = createClient()
    const [profile, setProfile] = useState<UserProfile | null>(null)

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Fetch role and name from profiles table
                const { data } = await supabase
                    .from('profiles')
                    .select('first_name, last_name, role')
                    .eq('id', user.id)
                    .single()

                if (data) {
                    setProfile(data)
                }
            }
        }

        fetchProfile()
    }, [supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <header className="h-20 w-full flex items-center justify-end px-8 bg-black/20 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
            <div className="flex items-center gap-6">

                {profile ? (
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium text-white">{profile.first_name} {profile.last_name}</p>
                            <p className="text-xs text-indigo-400 font-semibold tracking-wider">{profile.role}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-white/70" />
                        </div>
                    </div>
                ) : (
                    <div className="w-32 h-10 rounded-lg bg-white/5 animate-pulse" />
                )}

                <div className="w-px h-8 bg-white/10" />

                <button
                    onClick={handleLogout}
                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    title="Se déconnecter"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    )
}
