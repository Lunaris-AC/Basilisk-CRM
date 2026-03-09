'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripHorizontal } from 'lucide-react'

interface Props {
    id: string
    title: string
    children: React.ReactNode
}

export function SortableWidget({ id, title, children }: Props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.8 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex flex-col h-[400px] rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl transition-shadow ${isDragging ? 'shadow-primary/20 ring-2 ring-primary border-primary' : 'hover:border-white/20'}`}
        >
            <div
                {...attributes}
                {...listeners}
                className="h-12 border-b border-white/5 bg-white/5 flex items-center justify-between px-4 cursor-grab active:cursor-grabbing group"
            >
                <h3 className="text-sm font-bold text-foreground tracking-wide uppercase">{title}</h3>
                <GripHorizontal className="w-5 h-5 text-foreground/20 group-hover:text-muted-foreground transition-colors" />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {children}
            </div>
        </div>
    )
}
