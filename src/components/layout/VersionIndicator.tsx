'use client'

import { useState, useEffect } from 'react'
import { ArrowUpCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import ReactMarkdown from 'react-markdown'

interface GithubRelease {
    tag_name: string
    body: string
    html_url: string
}

const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

function normalizeVersion(tag: string): string {
    return tag.replace(/^v/i, '').toLowerCase()
}

export function VersionIndicator() {
    const [release, setRelease] = useState<GithubRelease | null>(null)
    const [hasUpdate, setHasUpdate] = useState(false)

    useEffect(() => {
        const controller = new AbortController()

        fetch('https://api.github.com/repos/Lunaris-AC/Basilisk-CRM/releases?per_page=1', {
            signal: controller.signal,
            headers: { Accept: 'application/vnd.github+json' },
        })
            .then(res => {
                if (!res.ok) return null
                return res.json()
            })
            .then((data: GithubRelease[] | null) => {
                const latest = data?.[0]
                if (!latest?.tag_name) return
                setRelease(latest)
                const remote = normalizeVersion(latest.tag_name)
                const local = normalizeVersion(CURRENT_VERSION)
                if (remote !== local) {
                    setHasUpdate(true)
                }
            })
            .catch(() => { /* silently ignore network errors */ })

        return () => controller.abort()
    }, [])

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors w-full"
                >
                    <span className="font-mono">v.{CURRENT_VERSION}</span>
                    {hasUpdate && (
                        <ArrowUpCircle className="w-4 h-4 text-primary animate-pulse" />
                    )}
                </button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Notes de mise à jour</DialogTitle>
                </DialogHeader>

                {release ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Dernière release : <span className="font-semibold text-foreground">{release.tag_name}</span>
                            </span>
                            <a
                                href={release.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline"
                            >
                                Voir sur GitHub ↗
                            </a>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{release.body ?? 'Aucun changelog disponible.'}</ReactMarkdown>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Aucune release trouvée ou impossible de contacter GitHub.
                    </p>
                )}

                <div className="pt-2 border-t border-white/10 mt-4">
                    <p className="text-xs text-muted-foreground">
                        Version locale : <span className="font-mono font-semibold">v.{CURRENT_VERSION}</span>
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
