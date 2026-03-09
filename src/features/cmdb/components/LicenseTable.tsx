'use client'

import { useMemo, useState } from 'react'
import type { SoftwareLicense } from '../actions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, isPast, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Key, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Store {
    id: string
    name: string
    client?: { company: string } | null
}

interface LicenseTableProps {
    licenses: SoftwareLicense[]
    stores: Store[]
}

function ExpirationCell({ date }: { date: string | null }) {
    if (!date) {
        return <span className="text-xs text-emerald-400/70 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Perpétuelle</span>
    }
    const d = new Date(date)
    const expired = isPast(d)
    const daysLeft = differenceInDays(d, new Date())

    if (expired) {
        return (
            <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                    <AlertTriangle className="w-3 h-3" /> EXPIRÉE
                </span>
                <div className="text-[10px] text-muted-foreground mt-0.5">{format(d, 'dd MMM yyyy', { locale: fr })}</div>
            </div>
        )
    }

    if (daysLeft <= 30) {
        return (
            <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> {daysLeft}j restants
                </span>
                <div className="text-[10px] text-muted-foreground mt-0.5">{format(d, 'dd MMM yyyy', { locale: fr })}</div>
            </div>
        )
    }

    return (
        <div>
            <span className="text-sm text-muted-foreground">{format(d, 'dd MMM yyyy', { locale: fr })}</span>
            <div className="text-[10px] text-muted-foreground mt-0.5">{daysLeft} jours</div>
        </div>
    )
}

export function LicenseTable({ licenses, stores }: LicenseTableProps) {
    const [selectedStore, setSelectedStore] = useState<string>('all')

    const filtered = useMemo(() => {
        if (selectedStore === 'all') return licenses
        return licenses.filter(lic => lic.store_id === selectedStore)
    }, [licenses, selectedStore])

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            // Expired/expiring first
            const now = Date.now()
            const in30d = now + 30 * 24 * 60 * 60 * 1000
            const aExp = a.expiration_date ? new Date(a.expiration_date).getTime() : Infinity
            const bExp = b.expiration_date ? new Date(b.expiration_date).getTime() : Infinity
            const aCritical = aExp <= in30d
            const bCritical = bExp <= in30d
            if (aCritical && !bCritical) return -1
            if (!aCritical && bCritical) return 1
            return aExp - bExp
        })
    }, [licenses])

    if (licenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <Key className="w-6 h-6 text-foreground/20" />
                </div>
                <p className="text-muted-foreground font-medium">Aucune licence enregistrée</p>
                <p className="text-foreground/25 text-sm mt-1">Cliquez sur « Ajouter une licence » pour commencer.</p>
            </div>
        )
    }

    return (
        <>
            <div className="px-6 py-4 flex items-center justify-end border-b border-white/5 bg-white/[0.01]">
                <div className="w-64">
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-foreground/70">
                            <SelectValue placeholder="Tous les magasins" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les magasins</SelectItem>
                            {stores.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="text-left text-muted-foreground font-medium text-xs tracking-widest uppercase px-6 py-4">Logiciel</th>
                            <th className="text-left text-muted-foreground font-medium text-xs tracking-widest uppercase px-4 py-4">Clé de licence</th>
                            <th className="text-left text-muted-foreground font-medium text-xs tracking-widest uppercase px-4 py-4">Magasin</th>
                            <th className="text-left text-muted-foreground font-medium text-xs tracking-widest uppercase px-4 py-4">Sièges</th>
                            <th className="text-left text-muted-foreground font-medium text-xs tracking-widest uppercase px-4 py-4">Expiration</th>
                            <th className="text-left text-muted-foreground font-medium text-xs tracking-widest uppercase px-4 py-4">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                    Aucune licence pour ce magasin
                                </td>
                            </tr>
                        ) : sorted.map((lic, i) => {
                            const isExpired = lic.expiration_date ? isPast(new Date(lic.expiration_date)) : false
                            const isExpiringSoon = !isExpired && lic.expiration_date
                                ? differenceInDays(new Date(lic.expiration_date), new Date()) <= 30
                                : false

                            const rowClass = isExpired
                                ? 'border-l-2 border-l-red-500/60 bg-red-500/[0.04]'
                                : isExpiringSoon
                                    ? 'border-l-2 border-l-amber-500/60 bg-amber-500/[0.04]'
                                    : i % 2 === 0 ? '' : 'bg-white/[0.01]'

                            return (
                                <tr
                                    key={lic.id}
                                    className={`group border-b border-white/[0.03] transition-all duration-150 hover:bg-white/[0.04] ${rowClass}`}
                                >
                                    <td className="px-6 py-3.5">
                                        <div className="font-medium text-foreground/90">{lic.software_name}</div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className="font-mono text-xs text-muted-foreground bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 select-all">
                                            {lic.license_key.length > 28 ? lic.license_key.slice(0, 28) + '…' : lic.license_key}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="text-foreground/70">{lic.store?.name}</div>
                                        {lic.store?.client && (
                                            <div className="text-muted-foreground text-xs">{lic.store.client.company}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3.5 text-center">
                                        <span className="text-sm font-bold text-foreground/80">{lic.seat_count}</span>
                                        <div className="text-[10px] text-muted-foreground">siège{lic.seat_count > 1 ? 's' : ''}</div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <ExpirationCell date={lic.expiration_date} />
                                    </td>
                                    <td className="px-4 py-3.5">
                                        {lic.is_active ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/15 text-primary/80 border border-primary/30">
                                                Inactive
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </>
    )
}
