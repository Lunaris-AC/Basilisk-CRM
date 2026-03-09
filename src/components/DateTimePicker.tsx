'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateTimePickerProps {
    value: string // ISO string or empty
    onChange: (isoString: string) => void
    placeholder?: string
    disabled?: boolean
    minDate?: Date
}

export function DateTimePicker({ value, onChange, placeholder = 'Sélectionner une date', disabled, minDate }: DateTimePickerProps) {
    const [open, setOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(value ? new Date(value) : undefined)
    const [hour, setHour] = useState(value ? new Date(value).getHours() : 9)
    const [minute, setMinute] = useState(value ? new Date(value).getMinutes() : 0)

    useEffect(() => {
        if (selectedDate) {
            const d = new Date(selectedDate)
            d.setHours(hour, minute, 0, 0)
            onChange(d.toISOString())
        }
    }, [selectedDate, hour, minute])

    const handleDateSelect = (date: Date | undefined) => {
        setSelectedDate(date)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left text-sm
                        ${selectedDate
                            ? 'bg-black/40 border-amber-500/30 text-foreground'
                            : 'bg-black/40 border-white/10 text-muted-foreground'
                        }
                        hover:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30
                        disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    <CalendarIcon className="w-4 h-4 text-amber-400 shrink-0" />
                    {selectedDate ? (
                        <span className="truncate">
                            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })} à {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                        </span>
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-primary/95 backdrop-blur-xl border-white/10 shadow-2xl shadow-black/50" align="start" sideOffset={8}>
                <div className="p-1">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        locale={fr}
                        disabled={minDate ? { before: minDate } : undefined}
                        className="rounded-xl"
                        classNames={{
                            months: "flex flex-col",
                            month: "space-y-3",
                            caption: "flex justify-center pt-1 relative items-center",
                            caption_label: "text-sm font-bold text-foreground",
                            nav: "flex items-center gap-1",
                            nav_button: "h-7 w-7 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center",
                            table: "w-full border-collapse",
                            head_row: "flex",
                            head_cell: "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem]",
                            row: "flex w-full mt-1",
                            cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                            day: "h-9 w-9 p-0 font-medium rounded-lg hover:bg-amber-500/20 hover:text-amber-300 transition-colors text-white/70 inline-flex items-center justify-center",
                            day_selected: "bg-amber-500 text-black hover:bg-amber-400 font-bold",
                            day_today: "bg-white/10 text-foreground font-bold",
                            day_outside: "text-foreground/20",
                            day_disabled: "text-foreground/10 hover:bg-transparent",
                        }}
                    />
                </div>

                {/* Sélecteur d'heure */}
                <div className="border-t border-white/10 p-4 flex items-center gap-3">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex items-center gap-2">
                        <select
                            value={hour}
                            onChange={(e) => setHour(parseInt(e.target.value))}
                            className="bg-black/60 border border-white/10 text-foreground rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 appearance-none cursor-pointer hover:border-amber-500/30 transition-colors"
                        >
                            {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i} className="bg-primary">
                                    {i.toString().padStart(2, '0')}
                                </option>
                            ))}
                        </select>
                        <span className="text-muted-foreground font-bold text-lg">:</span>
                        <select
                            value={minute}
                            onChange={(e) => setMinute(parseInt(e.target.value))}
                            className="bg-black/60 border border-white/10 text-foreground rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 appearance-none cursor-pointer hover:border-amber-500/30 transition-colors"
                        >
                            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                                <option key={m} value={m} className="bg-primary">
                                    {m.toString().padStart(2, '0')}
                                </option>
                            ))}
                        </select>
                    </div>
                    <span className="text-muted-foreground text-xs ml-auto">Heure de reprise</span>
                </div>
            </PopoverContent>
        </Popover>
    )
}
