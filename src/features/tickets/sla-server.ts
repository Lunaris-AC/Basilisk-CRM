import { createClient } from '@/utils/supabase/server'
import { DEFAULT_SLA_HOURS } from './sla'

/**
 * ============================================================
 * SPRINT 32 : LOGIQUE SERVEUR POUR LES SLA DYNAMIQUES
 * ============================================================
 */

/**
 * Récupère les délais SLA depuis la base de données (Serveur uniquement).
 * Cette fonction est asynchrone et utilise createClient serveur.
 */
export async function getDynamicSlaHours(): Promise<Record<string, number>> {
    const supabase = await createClient()
    const { data, error } = await supabase.from('sla_policies').select('priority, hours')
    
    if (error || !data || data.length === 0) {
        return DEFAULT_SLA_HOURS
    }

    const policies: Record<string, number> = {}
    data.forEach(p => {
        policies[p.priority] = p.hours
    })
    return policies
}
