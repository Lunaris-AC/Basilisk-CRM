'use client'

import { Suggestion } from '../types'
import { SuggestionCard } from './SuggestionCard'
import { Trophy, Lightbulb, CheckCircle2 } from 'lucide-react'

interface SuggestionListProps {
    suggestions: Suggestion[]
    isAdmin: boolean
}

export function SuggestionList({ suggestions, isAdmin }: SuggestionListProps) {
    // Separate active (votable) from decided (archived)
    const activeSuggestions = suggestions.filter(s => s.status === 'PENDING' || s.status === 'DEFERRED')
    const archivedSuggestions = suggestions.filter(s => s.status === 'APPROVED' || s.status === 'REFUSED')

    // Top 3 most voted among active suggestions
    const topThree = activeSuggestions
        .slice()
        .sort((a, b) => b.votes_count - a.votes_count)
        .slice(0, 3)
    
    // Others among active suggestions
    const otherActive = activeSuggestions.filter(s => !topThree.some(t => t.id === s.id))

    if (suggestions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Lightbulb className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground font-medium">Aucune idée pour le moment. Soyez le premier à en proposer une !</p>
            </div>
        )
    }

    return (
        <div className="space-y-16">
            {/* Active Suggestions Section */}
            {activeSuggestions.length > 0 ? (
                <div className="space-y-12">
                    {/* Top 3 Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Trophy className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-black tracking-tight uppercase">Top 3 des Idées</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {topThree.map(suggestion => (
                                <SuggestionCard 
                                    key={suggestion.id} 
                                    suggestion={suggestion} 
                                    isAdmin={isAdmin}
                                    isTopThree
                                />
                            ))}
                        </div>
                    </div>

                    {/* Other Active Suggestions */}
                    {otherActive.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Lightbulb className="w-5 h-5 text-muted-foreground" />
                                <h2 className="text-xl font-black tracking-tight uppercase text-muted-foreground">Propositions en cours</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {otherActive.map(suggestion => (
                                    <SuggestionCard 
                                        key={suggestion.id} 
                                        suggestion={suggestion} 
                                        isAdmin={isAdmin}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-10 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-muted-foreground">Toutes les suggestions ont été traitées !</p>
                </div>
            )}

            {/* Archived/Decided Suggestions Section */}
            {archivedSuggestions.length > 0 && (
                <div className="space-y-6 pt-10 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500/50" />
                        <h2 className="text-xl font-black tracking-tight uppercase text-muted-foreground/80">Idées Approuvées ou Refusées</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 grayscale-[0.5] hover:grayscale-0 transition-all duration-500">
                        {archivedSuggestions.map(suggestion => (
                            <SuggestionCard 
                                key={suggestion.id} 
                                suggestion={suggestion} 
                                isAdmin={isAdmin}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
