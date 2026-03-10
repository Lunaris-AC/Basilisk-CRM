'use client'

import { CategoryStatusItem } from '@/features/admin/analytics'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { Loader2, LayoutGrid } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
    HL: '#6366f1',
    COMMERCE: '#06b6d4',
    SAV: '#f59e0b',
    FORMATION: '#a855f7',
    DEV: '#10b981',
}

const STATUS_LABELS: Record<string, string> = {
    nouveau: 'Nouveau',
    assigne: 'Assigné',
    en_cours: 'En Cours',
    attente_client: 'Attente Client',
    resolu: 'Résolu',
    ferme: 'Fermé',
}

interface Props {
    data: CategoryStatusItem[] | undefined
    isLoading: boolean
}

// Custom content renderer for Treemap cells
function CustomTreemapContent(props: any) {
    const { x, y, width, height, name, category, size } = props

    if (width < 30 || height < 20) return null

    const fill = CATEGORY_COLORS[category] || '#6366f1'
    const showLabel = width > 60 && height > 35

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={6}
                fill={fill}
                fillOpacity={0.7}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={2}
                style={{ transition: 'fill-opacity 0.2s' }}
            />
            {showLabel && (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - 6}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={width > 100 ? 11 : 9}
                        fontWeight={700}
                        dominantBaseline="middle"
                    >
                        {name?.split(' · ')[0] || ''}
                    </text>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 10}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.6)"
                        fontSize={width > 100 ? 10 : 8}
                        dominantBaseline="middle"
                    >
                        {STATUS_LABELS[name?.split(' · ')[1]] || name?.split(' · ')[1] || ''} ({size})
                    </text>
                </>
            )}
        </g>
    )
}

export function TicketsByPriorityAndStatus({ data, isLoading }: Props) {
    return (
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
            <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-5 flex items-center gap-2">
                <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
                Matrice Catégorie × Statut
            </h3>
            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-6 h-6 animate-spin text-foreground/20" />
                </div>
            ) : !data || data.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-foreground/20 text-sm">
                    Aucune donnée disponible
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={320}>
                    <Treemap
                        data={data as any}
                        dataKey="size"
                        stroke="none"
                        content={<CustomTreemapContent />}
                    >
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(0,0,0,0.85)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 12,
                                color: '#fff',
                                fontSize: 12,
                            }}
                            formatter={(value: any, _: any, entry: any) => {
                                const item = entry?.payload
                                return [`${value} tickets`, `${item?.category || ''} — ${STATUS_LABELS[item?.status] || item?.status || ''}`]
                            }}
                        />
                    </Treemap>
                </ResponsiveContainer>
            )}
        </div>
    )
}
