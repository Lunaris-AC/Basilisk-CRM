'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Mail, Lock } from 'lucide-react'

export function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    // Utilisation de notre utilitaire SSR client pour interagir avec Supabase
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError) {
            setError('Identifiants incorrects. Veuillez réessayer.')
            setLoading(false)
            return
        }

        // Auth resussie, redirection vers le tableau de bord (protege par le middleware)
        router.push('/dashboard')
        router.refresh()
    }

    return (
        <div className="w-full max-w-md p-8 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Bienvenue</h1>
                <p className="text-white/60 text-sm">Connectez-vous à votre espace support</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-white/40 group-focus-within:text-white/80 transition-colors" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Adresse e-mail"
                            required
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium"
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-white/40 group-focus-within:text-white/80 transition-colors" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mot de passe"
                            required
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium"
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm text-center font-medium">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 focus:bg-white/20 active:scale-[0.98] text-white font-medium rounded-xl border border-white/10 transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Se connecter'}
                </button>
            </form>
        </div>
    )
}
