"use client"

import { useState, useMemo } from "react"
import { useClientsAndStores } from "@/features/tickets/api/useClientsAndStores"
import { CommercialCatalogueItem, createQuote } from "@/features/commerce/actions"
import { useRouter } from "next/navigation"
import { CalendarIcon, PlusCircle, Trash2, CheckCircle, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

// Helper types
type QuoteBuilderLine = {
    id: string
    catalogue_item_id: string | null
    designation: string
    quantity: number
    unit_price: number
    tax_rate: number
}

interface QuoteBuilderProps {
    catalogue: CommercialCatalogueItem[]
}

export function QuoteBuilder({ catalogue }: QuoteBuilderProps) {
    const router = useRouter()
    const { data, isLoading } = useClientsAndStores()

    // Form state
    const [clientId, setClientId] = useState<string>("")
    const [storeId, setStoreId] = useState<string>("")
    const [validUntil, setValidUntil] = useState<string>("")
    const [lines, setLines] = useState<QuoteBuilderLine[]>([
        { id: crypto.randomUUID(), catalogue_item_id: null, designation: "", quantity: 1, unit_price: 0, tax_rate: 20 }
    ])

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Derived data
    const clients = data?.clients || []
    const stores = data?.stores || []
    const availableStores = stores.filter(s => s.client_id === clientId)

    // Helpers
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
    }

    // Totals calculation
    const totals = useMemo(() => {
        let ht = 0
        let ttc = 0

        lines.forEach(line => {
            const lineHt = (line.quantity || 0) * (line.unit_price || 0)
            const lineTtc = lineHt * (1 + (line.tax_rate || 20) / 100)
            ht += lineHt
            ttc += lineTtc
        })

        return { ht, tva: ttc - ht, ttc }
    }, [lines])

    // Handlers
    const addLine = () => {
        setLines([...lines, { id: crypto.randomUUID(), catalogue_item_id: null, designation: "", quantity: 1, unit_price: 0, tax_rate: 20 }])
    }

    const removeLine = (id: string) => {
        if (lines.length > 1) {
            setLines(lines.filter(l => l.id !== id))
        }
    }

    const updateLine = (id: string, field: keyof QuoteBuilderLine, value: any) => {
        setLines(lines.map(l => {
            if (l.id === id) {
                const updatedLine = { ...l, [field]: value }

                // Si on a sélectionné un article du catalogue, on auto-remplit les champs
                if (field === "catalogue_item_id" && value !== "custom") {
                    const item = catalogue.find(c => c.id === value)
                    if (item) {
                        updatedLine.designation = item.name
                        updatedLine.unit_price = item.default_price
                        updatedLine.tax_rate = item.tax_rate
                    }
                } else if (field === "catalogue_item_id" && value === "custom") {
                    updatedLine.catalogue_item_id = null
                }

                return updatedLine
            }
            return l
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!clientId || !storeId) {
            setError("Veuillez sélectionner un client et un magasin.")
            return
        }

        if (lines.length === 0 || lines.some(l => !l.designation || l.unit_price < 0 || l.quantity < 1)) {
            setError("Vérifiez les lignes du devis (désignation requise, quantité > 0, prix valide).")
            return
        }

        setIsSubmitting(true)

        const payloadLines = lines.map(l => ({
            catalogue_item_id: l.catalogue_item_id,
            designation: l.designation,
            quantity: l.quantity,
            unit_price: l.unit_price,
            tax_rate: l.tax_rate
        }))

        try {
            const res = await createQuote(
                { store_id: storeId, client_id: clientId, valid_until: validUntil || null },
                payloadLines
            )

            if (res.error) {
                setError(res.error)
                setIsSubmitting(false)
            } else {
                router.push('/commerce')
                router.refresh()
            }
        } catch (err) {
            console.error(err)
            setError("Une erreur inattendue est survenue.")
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement des données...</div>
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-12">
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {/* SELECTION CLIENT & MAGASIN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <div className="space-y-2">
                    <Label className="text-foreground/80">Client <span className="text-red-400">*</span></Label>
                    <Select value={clientId} onValueChange={(val) => {
                        setClientId(val)
                        const clientStores = stores.filter(s => s.client_id === val)
                        if (clientStores.length === 1) {
                            setStoreId(clientStores[0].id)
                        } else {
                            setStoreId("")
                        }
                    }}>
                        <SelectTrigger className="bg-black/20 border-white/10 text-foreground focus:ring-emerald-500/50">
                            <SelectValue placeholder="Sélectionner un client..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-foreground max-h-[300px]">
                            {clients.map(c => (
                                <SelectItem key={c.id} value={c.id} className="hover:bg-white/10 cursor-pointer">
                                    {c.company}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-foreground/80">Magasin <span className="text-red-400">*</span></Label>
                    <Select value={storeId} onValueChange={setStoreId} disabled={!clientId}>
                        <SelectTrigger className="bg-black/20 border-white/10 text-foreground focus:ring-emerald-500/50 disabled:opacity-50">
                            <SelectValue placeholder={clientId ? "Sélectionner un magasin..." : "Choisissez un client d'abord"} />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-foreground max-h-[300px]">
                            {availableStores.map(s => (
                                <SelectItem key={s.id} value={s.id} className="hover:bg-white/10 cursor-pointer">
                                    {s.name} {s.city ? `(${s.city})` : ''}
                                </SelectItem>
                            ))}
                            {availableStores.length === 0 && clientId && (
                                <div className="p-2 text-sm text-muted-foreground text-center">Aucun magasin lié à ce client</div>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 md:col-span-2 md:w-1/2">
                    <Label className="text-foreground/80">Date de validité (optionnelle)</Label>
                    <div className="relative">
                        <Input
                            type="date"
                            className="bg-black/20 border-white/10 text-foreground focus:ring-emerald-500/50 pl-10 block w-full [color-scheme:dark]"
                            value={validUntil}
                            onChange={(e) => setValidUntil(e.target.value)}
                        />
                        <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* LIGNES DU DEVIS */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground/90">Lignes du devis</h2>
                    <Button type="button" variant="outline" size="sm" onClick={addLine} className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Ajouter une ligne
                    </Button>
                </div>

                <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 custom-scrollbar overflow-x-auto">
                    <table className="w-full text-sm text-left text-foreground/80 min-w-[800px]">
                        <thead className="text-xs text-muted-foreground uppercase border-b border-white/10">
                            <tr>
                                <th scope="col" className="px-2 py-3 w-[45%] font-medium">Désignation</th>
                                <th scope="col" className="px-2 py-3 w-[10%] font-medium text-center">Qté</th>
                                <th scope="col" className="px-2 py-3 w-[15%] font-medium text-right">P.U HT (€)</th>
                                <th scope="col" className="px-2 py-3 w-[10%] font-medium text-center">TVA (%)</th>
                                <th scope="col" className="px-2 py-3 w-[10%] font-medium text-right">Total HT</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {lines.map((line, index) => (
                                <tr key={line.id} className="group transition-colors">
                                    <td className="px-2 py-4 flex flex-col gap-2">
                                        <Select
                                            value={line.catalogue_item_id || "custom"}
                                            onValueChange={(val) => updateLine(line.id, "catalogue_item_id", val)}
                                        >
                                            <SelectTrigger className="bg-black/20 border-white/10 text-foreground w-full h-8 text-xs">
                                                <SelectValue placeholder="Piocher dans le catalogue..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card border-white/10 text-foreground max-w-sm">
                                                <SelectItem value="custom" className="text-emerald-400 font-medium text-xs">-- Ligne Libre --</SelectItem>
                                                {catalogue.map(c => (
                                                    <SelectItem key={c.id} value={c.id} className="text-xs">
                                                        {c.name} ({formatCurrency(c.default_price)})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            value={line.designation}
                                            onChange={(e) => updateLine(line.id, "designation", e.target.value)}
                                            placeholder="Description..."
                                            className="bg-black/20 border-white/10 text-foreground"
                                        />
                                    </td>
                                    <td className="px-2 py-4">
                                        <Input
                                            type="number"
                                            min="1"
                                            value={line.quantity || ''}
                                            onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                                            className="bg-black/20 border-white/10 text-foreground text-center"
                                        />
                                    </td>
                                    <td className="px-2 py-4">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={line.unit_price || ''}
                                            onChange={(e) => updateLine(line.id, "unit_price", parseFloat(e.target.value) || 0)}
                                            className="bg-black/20 border-white/10 text-foreground text-right font-mono"
                                        />
                                    </td>
                                    <td className="px-2 py-4">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={line.tax_rate || ''}
                                            onChange={(e) => updateLine(line.id, "tax_rate", parseFloat(e.target.value) || 0)}
                                            className="bg-black/20 border-white/10 text-foreground text-center"
                                        />
                                    </td>
                                    <td className="px-2 py-4 text-right font-mono font-medium text-foreground/90">
                                        {formatCurrency((line.quantity || 0) * (line.unit_price || 0))}
                                    </td>
                                    <td className="px-2 py-4 text-right">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeLine(line.id)}
                                            disabled={lines.length === 1}
                                            className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RÉSUMÉ ET SOUMISSION */}
            <div className="flex flex-col md:flex-row justify-end items-end gap-6 pt-6">
                <div className="w-full md:w-80 space-y-3 p-6 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/5 shadow-inner">
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Total HT</span>
                        <span className="font-mono">{formatCurrency(totals.ht)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>TVA</span>
                        <span className="font-mono">{formatCurrency(totals.tva)}</span>
                    </div>
                    <div className="h-px w-full bg-white/10 my-2" />
                    <div className="flex justify-between text-lg font-bold text-foreground">
                        <span>Total TTC</span>
                        <span className="font-mono text-emerald-400">{formatCurrency(totals.ttc)}</span>
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 py-6 px-10 rounded-xl text-lg font-semibold transition-all"
                >
                    {isSubmitting ? (
                        <div className="flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                            Création en cours...
                        </div>
                    ) : (
                        <div className="flex items-center">
                            <Calculator className="mr-2 h-5 w-5" />
                            Générer le Devis
                        </div>
                    )}
                </Button>
            </div>
        </form>
    )
}
