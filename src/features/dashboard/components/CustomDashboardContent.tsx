'use client'

import React, { useState, useEffect } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { SortableWidget } from './SortableWidget'

// Widget Components
import { UrgentTicketsWidget } from './widgets/UrgentTicketsWidget'
import { TicketStatsWidget } from './widgets/TicketStatsWidget'
import { ClockWidget } from './widgets/ClockWidget'
import { ShortcutsWidget } from './widgets/ShortcutsWidget'

const INITIAL_WIDGETS = [
    { id: 'stats', component: <TicketStatsWidget />, title: 'Météo des Tickets' },
    { id: 'urgent', component: <UrgentTicketsWidget />, title: 'Tickets Urgents' },
    { id: 'clock', component: <ClockWidget />, title: 'Horloges Mondiales' },
    { id: 'shortcuts', component: <ShortcutsWidget />, title: 'Accès Rapides' },
]

export function CustomDashboardContent() {
    const [items, setItems] = useState<{ id: string; component: React.ReactNode; title: string }[]>([])
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const savedOrder = localStorage.getItem('basilisk-dashboard-layout')
        if (savedOrder) {
            try {
                const orderIds = JSON.parse(savedOrder) as string[]
                const orderedItems = orderIds
                    .map(id => INITIAL_WIDGETS.find(w => w.id === id))
                    .filter(Boolean) as typeof INITIAL_WIDGETS

                // Add any missing widgets (newly introduced)
                const missing = INITIAL_WIDGETS.filter(w => !orderIds.includes(w.id))
                setItems([...orderedItems, ...missing])
            } catch (e) {
                setItems(INITIAL_WIDGETS)
            }
        } else {
            setItems(INITIAL_WIDGETS)
        }
    }, [])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Start drag after 5px movement to allow clicking inside
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id)
                const newIndex = items.findIndex((i) => i.id === over.id)

                const newArray = arrayMove(items, oldIndex, newIndex)
                localStorage.setItem('basilisk-dashboard-layout', JSON.stringify(newArray.map(w => w.id)))
                return newArray
            })
        }
    }

    if (!mounted) return null

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">Tableau de Bord Personnalisé</h1>
                <p className="text-muted-foreground font-medium">Réorganisez vos widgets en les glissant (Drag & Drop).</p>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToWindowEdges]}
            >
                <SortableContext
                    items={items.map(i => i.id)}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 auto-rows-min">
                        {items.map((widget) => (
                            <SortableWidget key={widget.id} id={widget.id} title={widget.title}>
                                {widget.component}
                            </SortableWidget>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    )
}
