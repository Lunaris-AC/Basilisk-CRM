'use client'

import { TopOffenderItem } from '@/features/admin/analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Loader2, Store, Cpu } from 'lucide-react'

const NEON_COLORS = ['#ef4444', '#f59e0b', '#06b6d4', '#a855f7', '#10b981']

interface Props {
    storeData: TopOffenderItem[] | undefined
    equipmentData: TopOffenderItem[] | undefined
    isLoadingStores: boolean
    isLoadingEquipments: boolean
}

function HorizontalBarSection({ data, isLoading, title, icon: Icon }: {
    data: TopOffenderItem[] | undefined
    isLoading: boolean
    title: string
    icon: React.ComponentType<{ className?: string }>
}) {
    return (
        <div className="flex-1 min-w-0">
            <h4 className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-4 flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-orange-400" />
                {title}
            </h4>
            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-6 h-6 animate-spin text-foreground/20" />
                </div>
            ) : !data || data.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-foreground/20 text-sm">
                    Aucune donnée ce mois-ci
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis
                            type="number"
                            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={140}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(0,0,0,0.85)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 12,
                                color: '#fff',
                                fontSize: 12,
                            }}
                        />
                        <Bar dataKey="count" name="Tickets" radius={[0, 6, 6, 0]} maxBarSize={26}>
                            {data.map((_, i) => (
                                <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}

export function TopOffendersChart({ storeData, equipmentData, isLoadingStores, isLoadingEquipments }: Props) {
    return (
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
            <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-5 flex items-center gap-2">
                🔥 Top Offenders — Ce Mois
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HorizontalBarSection
                    data={storeData}
                    isLoading={isLoadingStores}
                    title="Top 5 Magasins"
                    icon={Store}
                />
                <HorizontalBarSection
                    data={equipmentData}
                    isLoading={isLoadingEquipments}
                    title="Top 5 Équipements"
                    icon={Cpu}
                />
            </div>
        </div>
    )
}
