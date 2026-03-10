'use client'

import { BacklogAgingPoint } from '@/features/admin/analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Loader2, Hourglass } from 'lucide-react'

const PRIORITY_COLORS = {
    Basse: '#6366f1',
    Normale: '#06b6d4',
    Haute: '#f59e0b',
    Critique: '#ef4444',
}

interface Props {
    data: BacklogAgingPoint[] | undefined
    isLoading: boolean
}

export function BacklogAgingChart({ data, isLoading }: Props) {
    return (
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
            <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-5 flex items-center gap-2">
                <Hourglass className="w-3.5 h-3.5 text-amber-400" />
                Vieillissement du Backlog
            </h3>
            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-6 h-6 animate-spin text-foreground/20" />
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={data || []} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="bucket"
                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
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
                        <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
                        <Bar dataKey="Basse" name="Basse" stackId="a" fill={PRIORITY_COLORS.Basse} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Normale" name="Normale" stackId="a" fill={PRIORITY_COLORS.Normale} />
                        <Bar dataKey="Haute" name="Haute" stackId="a" fill={PRIORITY_COLORS.Haute} />
                        <Bar dataKey="Critique" name="Critique" stackId="a" fill={PRIORITY_COLORS.Critique} radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}
