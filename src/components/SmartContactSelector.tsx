'use client'

import { useState, useEffect } from 'react'
import { searchContactByPhone, quickCreateContact } from '@/features/clients/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Phone, CheckCircle2 } from 'lucide-react'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Contact } from '@/features/clients/api/useClients'

interface SmartContactSelectorProps {
    value?: string | null
    onChange: (contactId: string | null) => void
    clientId?: string
    storeId?: string | null
    defaultPhone?: string // Useful if we try to prefill
}

export function SmartContactSelector({ value, onChange, clientId, storeId, defaultPhone = '' }: SmartContactSelectorProps) {
    const [phoneInput, setPhoneInput] = useState(defaultPhone)
    const [isSearching, setIsSearching] = useState(false)
    const [foundContact, setFoundContact] = useState<Contact | null>(null)
    const [searchedEmpty, setSearchedEmpty] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Modal state
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [jobTitle, setJobTitle] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    // Simple manual debounce to avoid adding a new hook file if not needed
    useEffect(() => {
        const timer = setTimeout(() => {
            if (phoneInput.length >= 8) {
                performSearch(phoneInput)
            } else {
                setFoundContact(null)
                setSearchedEmpty(false)
                if (!value || phoneInput === '') {
                    onChange(null) // Clear selection if user deletes phone
                }
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [phoneInput])

    const performSearch = async (queryPhone: string) => {
        setIsSearching(true)
        setSearchedEmpty(false)

        try {
            const { data, error } = await searchContactByPhone(queryPhone, clientId)
            if (error) {
                console.error(error)
                setFoundContact(null)
            } else if (data) {
                setFoundContact(data as Contact)
                onChange(data.id) // Auto select
            } else {
                setFoundContact(null)
                setSearchedEmpty(true)
                onChange(null)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsSearching(false)
        }
    }

    const handleCreateContact = async () => {
        if (!firstName || !lastName || !phoneInput) return

        setIsCreating(true)
        try {
            const res = await quickCreateContact({
                client_id: clientId || '',
                store_id: storeId || undefined,
                first_name: firstName,
                last_name: lastName,
                email: email || undefined,
                phone: phoneInput,
                job_title: jobTitle || undefined
            })

            if (res.success && res.data) {
                setFoundContact(res.data as Contact)
                onChange(res.data.id)
                setIsModalOpen(false)
                // reset form
                setFirstName('')
                setLastName('')
                setEmail('')
                setJobTitle('')
                setSearchedEmpty(false)
            } else {
                alert(res.error || 'Erreur lors de la création')
            }
        } catch (err) {
            console.error(err)
            alert('Erreur serveur.')
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-white/40" />
                </div>
                <Input
                    type="tel"
                    placeholder="Tapez un numéro de téléphone..."
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="pl-10 bg-black/40 border-white/10 text-white placeholder-white/30 focus:ring-indigo-500/50"
                />
                {isSearching && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                    </div>
                )}
            </div>

            {/* Notifications and Actions */}
            <div className="min-h-[2rem]">
                {foundContact ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Contact auto-sélectionné : <strong>{foundContact.first_name} {foundContact.last_name}</strong></span>
                    </div>
                ) : searchedEmpty && phoneInput.length >= 8 ? (
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-amber-400/80">Aucun contact trouvé pour ce numéro.</p>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="w-fit flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg border border-indigo-500/30 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Créer ce nouveau contact
                        </button>
                    </div>
                ) : null}
            </div>

            {/* Modal Glassmorphism de création */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md bg-black/60 border border-white/10 backdrop-blur-xl shadow-[0_0_50px_rgba(99,102,241,0.15)] text-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                            Nouveau Contact
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="f_name" className="text-white/70">Prénom <span className="text-rose-400">*</span></Label>
                                <Input id="f_name" value={firstName} onChange={e => setFirstName(e.target.value)} className="bg-white/5 border-white/10" autoFocus />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="l_name" className="text-white/70">Nom <span className="text-rose-400">*</span></Label>
                                <Input id="l_name" value={lastName} onChange={e => setLastName(e.target.value)} className="bg-white/5 border-white/10" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="c_phone" className="text-white/70">Téléphone</Label>
                            <Input id="c_phone" value={phoneInput} readOnly className="bg-white/5 border-white/10 text-white/50 cursor-not-allowed" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="c_email" className="text-white/70">Email (Optionnel)</Label>
                            <Input id="c_email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-white/5 border-white/10" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="c_job" className="text-white/70">Rôle / Fonction (Optionnel)</Label>
                            <Input id="c_job" placeholder="ex: Directeur, Manager..." value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="bg-white/5 border-white/10" />
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateContact}
                            disabled={!firstName || !lastName || isCreating}
                            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold disabled:opacity-50 flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Créer et Sélectionner
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
