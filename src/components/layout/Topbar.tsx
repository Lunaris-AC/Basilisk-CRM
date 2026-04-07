'use client'
import { useRouter } from 'next/navigation'
import { LogOut, User, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { GlobalSearch } from '@/components/GlobalSearch'
import { WorldClock } from '@/components/layout/WorldClock'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { NetworkStatusIndicator } from '@/components/layout/NetworkStatusIndicator'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Sidebar } from '@/components/layout/Sidebar'
import { createClient } from '@/utils/supabase/client'

interface UserProfile {
    first_name: string
    last_name: string
    role: string;
  support_level?: string
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
        <header className="h-20 w-full flex items-center justify-between px-4 md:px-8 bg-black/20 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
            <div className="flex items-center gap-3 md:gap-4 flex-1 max-w-2xl">
                {/* Hamburger Mobile */}
                <Sheet>
                    <SheetTrigger asChild>
                        <button className="md:hidden p-2 text-foreground/70 hover:text-foreground hover:bg-white/10 rounded-lg transition-all">
                            <Menu className="w-6 h-6" />
                        </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 border-none w-64 bg-transparent outline-none">
                        <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
                        <Sidebar mobile />
                    </SheetContent>
                </Sheet>

                {/* Recherche "Google Style" & Horloge Mondiale */}
                <div className="flex-1">
                    <GlobalSearch />
                </div>
                <div className="hidden sm:block">
                    <WorldClock />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <NetworkStatusIndicator />
                <NotificationBell />

                {profile ? (
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium text-foreground">{profile.first_name} {profile.last_name}</p>
                            <p className="text-xs text-primary/80 font-semibold tracking-wider">{profile.role}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-foreground/70" />
                        </div>
                    </div>
                ) : (
                    <div className="w-32 h-10 rounded-lg bg-white/5 animate-pulse" />
                )}

                <div className="w-px h-8 bg-white/10" />

                <button
                    onClick={handleLogout}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-lg transition-all"
                    title="Se déconnecter"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    )
}
