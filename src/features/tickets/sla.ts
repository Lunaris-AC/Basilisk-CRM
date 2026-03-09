/**
 * ============================================================
 * SPRINT 32 : CONSTANTES ET UTILITAIRES DU MOTEUR SLA
 * ============================================================
 */

/**
 * Délais SLA en heures selon la priorité du ticket.
 * - critique : 2h  (SLA d'urgence)
 * - haute    : 8h  (1 jour ouvré)
 * - normale  : 48h (2 jours ouvrés)
 * - basse    : 120h (1 semaine)
 */
export const SLA_HOURS: Record<string, number> = {
    critique: 2,
    haute: 8,
    normale: 48,
    basse: 120,
}

/**
 * Retourne une nouvelle Date décalée de `hours` heures dans le futur.
 * Utilise du JS natif pour éviter toute dépendance supplémentaire.
 */
export function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

/**
 * Retourne une nouvelle Date décalée de `minutes` minutes dans le futur.
 */
export function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000)
}

/**
 * Calcule la différence en minutes entre deux dates (end - start).
 * Retourne toujours un nombre positif (arrondi à la minute inférieure).
 */
export function diffInMinutes(start: Date, end: Date): number {
    return Math.floor(Math.abs(end.getTime() - start.getTime()) / (1000 * 60))
}
