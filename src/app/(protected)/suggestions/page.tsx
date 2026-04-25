import { createClient } from '@/utils/supabase/server'
import { getSuggestions } from '@/features/suggestions/actions'
import { SuggestionList } from '@/features/suggestions/components/SuggestionList'
import { NewSuggestionForm } from '@/features/suggestions/components/NewSuggestionForm'
import { Lightbulb } from 'lucide-react'
import { redirect } from 'next/navigation'

export const metadata = {
    title: 'Boîte à Idées | Basilisk CRM',
    description: 'Proposez et votez pour les améliorations du logiciel.',
}

export default async function SuggestionsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = profile?.role === 'ADMIN'
    const { data: suggestions, error } = await getSuggestions()

    return (
        <div className="w-full max-w-7xl mx-auto space-y-10 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-primary">
                        <Lightbulb className="w-8 h-8" />
                        <h1 className="text-4xl font-black tracking-tighter uppercase">Boîte à Idées</h1>
                    </div>
                    <p className="text-muted-foreground font-medium max-w-2xl">
                        Votre avis compte ! Proposez des fonctionnalités, votez pour vos préférées et aidez-nous à faire évoluer Basilisk CRM.
                    </p>
                </div>
                
                <NewSuggestionForm />
            </div>

            <hr className="border-white/5" />

            {/* List Area */}
            {error ? (
                <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-center">
                    Erreur : {error}
                </div>
            ) : (
                <SuggestionList 
                    suggestions={suggestions || []} 
                    isAdmin={isAdmin} 
                />
            )}
        </div>
    )
}
