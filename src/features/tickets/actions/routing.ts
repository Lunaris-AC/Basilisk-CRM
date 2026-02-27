'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { RuleCondition, RuleNode, RoutingEvaluationResult, TicketRoutingRule } from '../types/routing'

/**
 * Fonction récursive pour évaluer un noeud de condition JSONB
 * par rapport aux données d'un ticket.
 */
function evaluateNode(node: RuleNode | RuleCondition, ticketData: any): boolean {
    // Si c'est un RuleNode (qui contient un opérateur logique)
    if ('logical_operator' in node) {
        const { logical_operator, conditions } = node;

        if (!conditions || conditions.length === 0) return false;

        if (logical_operator === 'AND') {
            return conditions.every(cond => evaluateNode(cond, ticketData));
        } else if (logical_operator === 'OR') {
            return conditions.some(cond => evaluateNode(cond, ticketData));
        }
        return false;
    }

    // Sinon, c'est une RuleCondition
    const { field, operator, value } = node as RuleCondition;

    // Si le champ n'existe pas dans le ticket, ou qu'il est null/undefined (selon les cas d'utilisation, on pourrait ajuster)
    const ticketValue = ticketData[field];

    switch (operator) {
        case 'EQUALS':
            return ticketValue === value;
        case 'NOT_EQUALS':
            return ticketValue !== value;
        case 'CONTAINS':
            if (typeof ticketValue === 'string' && typeof value === 'string') {
                return ticketValue.toLowerCase().includes(value.toLowerCase());
            }
            if (Array.isArray(ticketValue)) {
                return (ticketValue as any[]).includes(value);
            }
            return false;
        case 'IN':
            if (Array.isArray(value)) {
                return (value as any[]).includes(ticketValue);
            }
            return false;
        case 'NOT_IN':
            if (Array.isArray(value)) {
                return !(value as any[]).includes(ticketValue);
            }
            return false;
        default:
            console.warn(`Opérateur non supporté: ${operator}`);
            return false;
    }
}

/**
 * Evalue toutes les règles de routage actives pour un ticket donné
 * et retourne la première règle qui correspond.
 * Utile juste après la création d'un ticket ou lors de sa requalification.
 */
export async function evaluateTicketRouting(ticketId: string): Promise<RoutingEvaluationResult> {
    try {
        const supabase = await createClient();

        // 1. Récupérer les informations du ticket complet
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (ticketError || !ticket) {
            console.error("Erreur lors de la récupération du ticket pour routage:", ticketError);
            return { match: false };
        }

        // 2. Récupérer les règles actives, triées par ordre d'exécution (1 = priorité max)
        const { data: rules, error: rulesError } = await supabase
            .from('ticket_routing_rules')
            .select('*')
            .eq('is_active', true)
            .order('execution_order', { ascending: true });

        if (rulesError) {
            console.error("Erreur lors de la récupération des règles de routage:", rulesError);
            return { match: false };
        }

        if (!rules || rules.length === 0) {
            return { match: false };
        }

        // 3. Evaluer chaque règle par rapport aux données du ticket
        for (const rule of rules as TicketRoutingRule[]) {
            const conditions = rule.conditions;

            // Protection basique contre un JSON malformé sans logical_operator à la racine
            if (!conditions || typeof conditions !== 'object' || !('logical_operator' in conditions)) {
                console.warn(`Règle ID ${rule.id} a un format de conditions invalide.`);
                continue;
            }

            const isMatch = evaluateNode(conditions, ticket);

            if (isMatch) {
                return {
                    match: true,
                    ruleName: rule.name,
                    assignToLevelId: rule.target_support_level_id || undefined,
                    assignToUserId: rule.target_user_id || undefined
                };
            }
        }

        // Aucune règle ne correspond
        return { match: false };
    } catch (error) {
        console.error("Erreur inattendue dans evaluateTicketRouting:", error);
        return { match: false };
    }
}

/**
 * CRUD: Récupérer toutes les règles de routage
 */
export async function getRoutingRules() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('ticket_routing_rules')
        .select(`
            *,
            target_support_level:support_levels(name),
            target_user:profiles(first_name, last_name)
        `)
        .order('execution_order', { ascending: true });

    if (error) {
        console.error("Erreur getRoutingRules:", error);
        return [];
    }
    return data;
}

/**
 * CRUD: Récupérer une règle par ID
 */
export async function getRoutingRuleById(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('ticket_routing_rules')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error("Erreur getRoutingRuleById:", error);
        return null;
    }
    return data;
}

/**
 * CRUD: Créer une règle de routage
 */
export async function createRoutingRule(data: Partial<TicketRoutingRule>) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('ticket_routing_rules')
        .insert({
            name: data.name,
            is_active: data.is_active ?? true,
            execution_order: data.execution_order,
            conditions: data.conditions,
            target_support_level_id: data.target_support_level_id || null,
            target_user_id: data.target_user_id || null
        });

    if (error) {
        console.error("Erreur createRoutingRule:", error);
        return { error: 'Impossible de créer la règle de routage.' };
    }

    revalidatePath('/admin/routing');
    return { success: true };
}

/**
 * CRUD: Mettre à jour une règle de routage
 */
export async function updateRoutingRule(id: string, data: Partial<TicketRoutingRule>) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('ticket_routing_rules')
        .update({
            name: data.name,
            is_active: data.is_active,
            execution_order: data.execution_order,
            conditions: data.conditions,
            target_support_level_id: data.target_support_level_id || null,
            target_user_id: data.target_user_id || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error("Erreur updateRoutingRule:", error);
        return { error: 'Impossible de mettre à jour la règle de routage.' };
    }

    revalidatePath('/admin/routing');
    return { success: true };
}

/**
 * CRUD: Supprimer une règle de routage
 */
export async function deleteRoutingRule(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('ticket_routing_rules')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Erreur deleteRoutingRule:", error);
        return { error: 'Impossible de supprimer la règle de routage.' };
    }

    revalidatePath('/admin/routing');
    return { success: true };
}
