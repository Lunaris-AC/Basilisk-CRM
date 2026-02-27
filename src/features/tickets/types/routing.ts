/**
 * Types pour le moteur de routage des tickets (Profils de Pioche)
 */

export type RuleConditionField = 'client_id' | 'store_id' | 'priority' | 'status' | 'category' | 'equipment_id' | 'contact_id';
export type RuleConditionOperator = 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'IN' | 'NOT_IN';

export interface RuleCondition {
    field: RuleConditionField | string; // Permet de s'étendre aux champs custom
    operator: RuleConditionOperator;
    value: string | string[] | number | number[] | boolean | null;
}

export interface RuleNode {
    logical_operator: 'AND' | 'OR';
    conditions: (RuleCondition | RuleNode)[];
}

export interface TicketRoutingRule {
    id: string;
    name: string;
    is_active: boolean;
    execution_order: number;
    conditions: RuleNode;
    target_support_level_id: string | null;
    target_user_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface RoutingEvaluationResult {
    match: boolean;
    ruleName?: string;
    assignToLevelId?: string;
    assignToUserId?: string;
}
