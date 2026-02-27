'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { acceptQuote } from '@/features/commerce/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface AcceptQuoteButtonProps {
    quoteId: string
    signerId: string
}

export function AcceptQuoteButton({ quoteId, signerId }: AcceptQuoteButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleAccept = async () => {
        setIsLoading(true)
        try {
            const result = await acceptQuote(quoteId, signerId)

            if (result.error) {
                toast.error('Erreur', {
                    description: result.error,
                })
            } else {
                toast.success('Succès', {
                    description: 'Devis accepté et matériel commandé !',
                })
                router.refresh()
            }
        } catch (error) {
            console.error('Erreur acceptation:', error)
            toast.error('Erreur', {
                description: 'Une erreur inattendue est survenue.',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleAccept}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <CheckCircle2 className="w-5 h-5" />
            )}
            {isLoading ? 'Acceptation en cours...' : 'Accepter et Générer la Commande'}
        </button>
    )
}
