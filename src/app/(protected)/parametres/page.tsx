'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ParametresPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/parametres/profil')
    }, [router])

    return null
}
