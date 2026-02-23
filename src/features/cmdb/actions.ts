'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================================
// TYPES
// ============================================================

export type EquipmentStatus =
    | 'EN_SERVICE'
    | 'EN_PANNE'
    | 'EN_REPARATION_INTERNE'
    | 'RMA_FOURNISSEUR'
    | 'REBUT'

export interface EquipmentCatalogue {
    id: string
    category: string
    brand: string
    model_name: string
    custom_fields_schema: Record<string, string> // {"key": "string"|"number"|"boolean"|"date"}
    created_at: string
    updated_at: string
}

export interface Equipment {
    id: string
    catalogue_id: string
    store_id: string
    serial_number: string
    status: EquipmentStatus
    purchase_date: string | null
    warranty_end_date: string | null
    rma_tracking_number: string | null
    custom_fields_data: Record<string, unknown>
    notes: string | null
    created_at: string
    updated_at: string
    // Joined
    catalogue?: EquipmentCatalogue
    store?: { id: string; name: string; client?: { company: string } }
}

export interface SoftwareLicense {
    id: string
    store_id: string
    software_name: string
    license_key: string
    seat_count: number
    activation_date: string | null
    expiration_date: string | null
    is_active: boolean
    notes: string | null
    created_at: string
    updated_at: string
    // Joined
    store?: { id: string; name: string; client?: { company: string } }
}

// ============================================================
// GETTERS
// ============================================================

/**
 * Retourne tous les modèles du catalogue matériel.
 */
export async function getCatalogues(): Promise<EquipmentCatalogue[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('equipment_catalogue')
        .select('*')
        .order('category')
        .order('brand')

    if (error) {
        console.error('Erreur getCatalogues:', error)
        return []
    }
    return data ?? []
}

/**
 * Retourne tous les équipements physiques (parc matériel).
 * Jointure avec le catalogue et le magasin.
 * Filtre optionnel par store_id.
 */
export async function getEquipments(storeId?: string): Promise<Equipment[]> {
    const supabase = await createClient()

    let query = supabase
        .from('equipments')
        .select(`
            *,
            catalogue:equipment_catalogue(id, category, brand, model_name, custom_fields_schema),
            store:stores(id, name, client:clients(company))
        `)
        .order('created_at', { ascending: false })

    if (storeId) {
        query = query.eq('store_id', storeId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Erreur getEquipments:', error)
        return []
    }
    return (data as Equipment[]) ?? []
}

/**
 * Retourne un équipement précis avec ses infos complètes.
 */
export async function getEquipmentById(equipmentId: string): Promise<Equipment | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('equipments')
        .select(`
            *,
            catalogue:equipment_catalogue(id, category, brand, model_name, custom_fields_schema),
            store:stores(id, name, client:clients(company))
        `)
        .eq('id', equipmentId)
        .single()

    if (error) {
        console.error('Erreur getEquipmentById:', error)
        return null
    }
    return data as Equipment
}

/**
 * Retourne les tickets liés à un équipement précis.
 */
export async function getEquipmentTickets(equipmentId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('tickets')
        .select('id, title, status, priority, created_at, assignee_id')
        .eq('equipment_id', equipmentId)
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Erreur getEquipmentTickets:', error)
        return []
    }
    return data ?? []
}

/**
 * Retourne toutes les licences logicielles.
 * Filtre optionnel par store_id.
 */
export async function getLicenses(storeId?: string): Promise<SoftwareLicense[]> {
    const supabase = await createClient()

    let query = supabase
        .from('software_licenses')
        .select(`
            *,
            store:stores(id, name, client:clients(company))
        `)
        .order('software_name')

    if (storeId) {
        query = query.eq('store_id', storeId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Erreur getLicenses:', error)
        return []
    }
    return (data as SoftwareLicense[]) ?? []
}

// ============================================================
// CRUD ÉQUIPEMENTS
// ============================================================

/**
 * Crée un nouvel équipement dans le parc matériel.
 */
export async function createEquipment(formData: {
    catalogue_id: string
    store_id: string
    serial_number: string
    status?: EquipmentStatus
    purchase_date?: string | null
    warranty_end_date?: string | null
    custom_fields_data?: Record<string, unknown>
    notes?: string | null
}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['DEV', 'COM', 'SAV1', 'SAV2', 'ADMIN'].includes(profile.role)) {
        return { error: 'Droits insuffisants pour ajouter un équipement.' }
    }

    const { data, error } = await supabase
        .from('equipments')
        .insert({
            catalogue_id: formData.catalogue_id,
            store_id: formData.store_id,
            serial_number: formData.serial_number,
            status: formData.status ?? 'EN_SERVICE',
            purchase_date: formData.purchase_date || null,
            warranty_end_date: formData.warranty_end_date || null,
            custom_fields_data: formData.custom_fields_data ?? {},
            notes: formData.notes || null,
        })
        .select('id')
        .single()

    if (error) {
        console.error('Erreur createEquipment:', error)
        if (error.code === '23505') {
            return { error: 'Ce numéro de série existe déjà dans le système.' }
        }
        return { error: 'Impossible de créer l\'équipement.' }
    }

    revalidatePath('/cmdb')
    return { success: true, id: data.id }
}

/**
 * Met à jour les informations d'un équipement existant.
 */
export async function updateEquipment(equipmentId: string, updates: Partial<{
    status: EquipmentStatus
    purchase_date: string | null
    warranty_end_date: string | null
    rma_tracking_number: string | null
    custom_fields_data: Record<string, unknown>
    notes: string | null
}>) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { error } = await supabase
        .from('equipments')
        .update(updates)
        .eq('id', equipmentId)

    if (error) {
        console.error('Erreur updateEquipment:', error)
        return { error: 'Impossible de mettre à jour l\'équipement.' }
    }

    revalidatePath('/cmdb')
    return { success: true }
}

/**
 * Action spécifique RMA : passe le statut à RMA_FOURNISSEUR et enregistre le numéro de suivi.
 */
export async function sendToRMA(equipmentId: string, trackingNumber: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['DEV', 'COM', 'SAV1', 'SAV2', 'ADMIN'].includes(profile.role)) {
        return { error: 'Droits insuffisants pour initier un RMA.' }
    }

    if (!trackingNumber.trim()) {
        return { error: 'Le numéro de suivi RMA est obligatoire.' }
    }

    const { error } = await supabase
        .from('equipments')
        .update({
            status: 'RMA_FOURNISSEUR',
            rma_tracking_number: trackingNumber.trim(),
        })
        .eq('id', equipmentId)

    if (error) {
        console.error('Erreur sendToRMA:', error)
        return { error: 'Impossible d\'initier le retour RMA.' }
    }

    revalidatePath('/cmdb')
    return { success: true }
}

/**
 * Supprime un équipement (soft delete via statut REBUT plutôt que DELETE physique).
 */
export async function markAsRebut(equipmentId: string) {
    return updateEquipment(equipmentId, { status: 'REBUT', rma_tracking_number: null })
}

// ============================================================
// CRUD LICENCES
// ============================================================

/**
 * Crée une nouvelle licence logicielle.
 */
export async function createLicense(formData: {
    store_id: string
    software_name: string
    license_key: string
    seat_count: number
    activation_date?: string | null
    expiration_date?: string | null
    is_active?: boolean
    notes?: string | null
}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['DEV', 'COM', 'SAV1', 'SAV2', 'ADMIN'].includes(profile.role)) {
        return { error: 'Droits insuffisants pour ajouter une licence.' }
    }

    const { data, error } = await supabase
        .from('software_licenses')
        .insert({
            store_id: formData.store_id,
            software_name: formData.software_name,
            license_key: formData.license_key,
            seat_count: formData.seat_count,
            activation_date: formData.activation_date || null,
            expiration_date: formData.expiration_date || null,
            is_active: formData.is_active ?? true,
            notes: formData.notes || null,
        })
        .select('id')
        .single()

    if (error) {
        console.error('Erreur createLicense:', error)
        return { error: 'Impossible de créer la licence.' }
    }

    revalidatePath('/cmdb')
    return { success: true, id: data.id }
}

/**
 * Met à jour une licence existante.
 */
export async function updateLicense(licenseId: string, updates: Partial<{
    software_name: string
    license_key: string
    seat_count: number
    activation_date: string | null
    expiration_date: string | null
    is_active: boolean
    notes: string | null
}>) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { error } = await supabase
        .from('software_licenses')
        .update(updates)
        .eq('id', licenseId)

    if (error) {
        console.error('Erreur updateLicense:', error)
        return { error: 'Impossible de mettre à jour la licence.' }
    }

    revalidatePath('/cmdb')
    return { success: true }
}

/**
 * Supprime définitivement une licence logicielle.
 */
export async function deleteLicense(licenseId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['DEV', 'COM', 'SAV1', 'SAV2', 'ADMIN'].includes(profile.role)) {
        return { error: 'Droits insuffisants pour supprimer une licence.' }
    }

    const { error } = await supabase
        .from('software_licenses')
        .delete()
        .eq('id', licenseId)

    if (error) {
        console.error('Erreur deleteLicense:', error)
        return { error: 'Impossible de supprimer la licence.' }
    }

    revalidatePath('/cmdb')
    return { success: true }
}
