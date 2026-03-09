import { getQuotes, QuoteStatus, getCommercialCatalogue } from '@/features/commerce/actions'
import { CommerceTable } from '@/features/commerce/components/CommerceTable'
import { CatalogueManager } from '@/features/commerce/components/CatalogueManager'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function CommercePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'COM' && profile?.role !== 'ADMIN') {
        redirect('/dashboard')
    }

    const [quotes, catalogue] = await Promise.all([
        getQuotes(),
        getCommercialCatalogue()
    ])

    // const catalogue = ... (conservé, log retiré)

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-br from-primary to-black relative">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" />

            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="p-6 lg:p-10 pb-0">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                        <div className="space-y-2">
                            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground drop-shadow-md">
                                Espace Commerce
                            </h1>
                            <p className="text-rose-200/80 text-lg max-w-2xl leading-relaxed">
                                Gestion des devis, facturations et cycle de vente B2B.
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link
                                href="/commerce/nouveau"
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-foreground rounded-xl shadow-lg shadow-rose-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-500/40 font-semibold"
                            >
                                <Plus className="w-5 h-5 text-foreground" />
                                Nouveau Devis
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="px-6 lg:px-10 pb-10 flex-1 flex flex-col">
                    <Tabs defaultValue="devis" className="flex-1 flex flex-col">
                        <TabsList className="bg-black/40 border border-white/10 w-fit p-1 rounded-xl mb-6">
                            <TabsTrigger
                                value="devis"
                                className="px-6 py-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500/20 data-[state=active]:to-orange-500/20 data-[state=active]:text-rose-300 text-muted-foreground transition-all font-semibold"
                            >
                                Devis
                            </TabsTrigger>
                            <TabsTrigger
                                value="catalogue"
                                className="px-6 py-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-primary/20 data-[state=active]:text-primary/80 text-muted-foreground transition-all font-semibold"
                            >
                                Catalogue des Prix
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="devis" className="flex-1 m-0">
                            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 lg:p-8 h-full">
                                <CommerceTable quotes={quotes} />
                            </div>
                        </TabsContent>

                        <TabsContent value="catalogue" className="flex-1 m-0">
                            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 lg:p-8 h-full">
                                <CatalogueManager catalogue={catalogue} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
