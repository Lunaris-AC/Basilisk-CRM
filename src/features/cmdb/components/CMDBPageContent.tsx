'use client'

import { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Server, Key, Plus, HardDrive } from 'lucide-react'
import { EquipmentTable } from './EquipmentTable'
import { LicenseTable } from './LicenseTable'
import { CatalogueTable } from './CatalogueTable'
import { AddEquipmentDialog } from './AddEquipmentDialog'
import { AddLicenseDialog } from './AddLicenseDialog'
import { AddCatalogueDialog } from './AddCatalogueDialog'
import type { Equipment, SoftwareLicense, EquipmentCatalogue } from '../actions'

interface Store {
    id: string
    name: string
    client?: { company: string } | null
}

interface CMDBPageContentProps {
    initialEquipments: Equipment[]
    initialLicenses: SoftwareLicense[]
    catalogues: EquipmentCatalogue[]
    stores: Store[]
}

export function CMDBPageContent({ initialEquipments, initialLicenses, catalogues, stores }: CMDBPageContentProps) {
    const [addEquipmentOpen, setAddEquipmentOpen] = useState(false)
    const [addLicenseOpen, setAddLicenseOpen] = useState(false)
    const [addCatalogueOpen, setAddCatalogueOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('materiel')

    const expiringCount = useMemo(() => {
        const now = Date.now()
        const in30Days = now + 30 * 24 * 60 * 60 * 1000
        return initialLicenses.filter(l => {
            if (!l.expiration_date) return false
            const exp = new Date(l.expiration_date).getTime()
            return exp <= in30Days
        }).length
    }, [initialLicenses])

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-primary/30 border border-cyan-500/20 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                        <HardDrive className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Parc Matériel</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {initialEquipments.length} équipement{initialEquipments.length !== 1 ? 's' : ''} · {initialLicenses.length} licence{initialLicenses.length !== 1 ? 's' : ''}
                            {expiringCount > 0 && (
                                <span className="ml-2 text-amber-400 font-semibold">⚠ {expiringCount} licence{expiringCount > 1 ? 's' : ''} à renouveler</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Glassmorphism card with Tabs */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center justify-between px-6 pt-5 pb-0 border-b border-white/5">
                        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
                            <TabsTrigger
                                value="materiel"
                                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-500/30 data-[state=active]:shadow-none rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-all gap-2"
                            >
                                <Server className="w-4 h-4" />
                                Matériel
                                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-muted-foreground">
                                    {initialEquipments.length}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="licences"
                                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary/80 data-[state=active]:border-primary/30 data-[state=active]:shadow-none rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-all gap-2"
                            >
                                <Key className="w-4 h-4" />
                                Licences
                                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${expiringCount > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/60'}`}>
                                    {initialLicenses.length}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="catalogue"
                                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary/80 data-[state=active]:border-primary/30 data-[state=active]:shadow-none rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-all gap-2"
                            >
                                <HardDrive className="w-4 h-4" />
                                Catalogue
                                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-muted-foreground">
                                    {catalogues.length}
                                </span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Contextual action button */}
                        {activeTab === 'materiel' && (
                            <button
                                onClick={() => setAddEquipmentOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-300 text-sm font-medium transition-all duration-200"
                            >
                                <Plus className="w-4 h-4" />
                                Ajouter un équipement
                            </button>
                        )}
                        {activeTab === 'licences' && (
                            <button
                                onClick={() => setAddLicenseOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary/80 text-sm font-medium transition-all duration-200"
                            >
                                <Plus className="w-4 h-4" />
                                Ajouter une licence
                            </button>
                        )}
                        {activeTab === 'catalogue' && (
                            <button
                                onClick={() => setAddCatalogueOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary/80 text-sm font-medium transition-all duration-200"
                            >
                                <Plus className="w-4 h-4" />
                                Nouveau Modèle
                            </button>
                        )}
                    </div>

                    <TabsContent value="materiel" className="mt-0 p-0">
                        <EquipmentTable equipments={initialEquipments} stores={stores} />
                    </TabsContent>

                    <TabsContent value="licences" className="mt-0 p-0">
                        <LicenseTable licenses={initialLicenses} stores={stores} />
                    </TabsContent>

                    <TabsContent value="catalogue" className="mt-0 p-0">
                        <CatalogueTable catalogues={catalogues} />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modals */}
            <AddEquipmentDialog
                open={addEquipmentOpen}
                onOpenChange={setAddEquipmentOpen}
                catalogues={catalogues}
                stores={stores}
            />
            <AddLicenseDialog
                open={addLicenseOpen}
                onOpenChange={setAddLicenseOpen}
                stores={stores}
            />
            <AddCatalogueDialog
                open={addCatalogueOpen}
                onOpenChange={setAddCatalogueOpen}
            />
        </div>
    )
}
