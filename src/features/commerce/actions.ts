'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

// ============================================================
// TYPES
// ============================================================

export type ItemType = 'MATERIEL' | 'LICENCE' | 'SERVICE'
export type QuoteStatus = 'BROUILLON' | 'EN_ATTENTE' | 'ACCEPTE' | 'REFUSE' | 'FACTURE'

export interface CommercialCatalogueItem {
    id: string
    name: string
    type: ItemType
    default_price: number
    tax_rate: number
    description: string | null
    equipment_model_id: string | null
    equipment_model?: {
        id: string
        brand: string
        model_name: string
    } | null
    created_at: string
    updated_at: string
}

export interface QuoteLine {
    id: string
    quote_id: string
    catalogue_item_id: string | null
    designation: string
    quantity: number
    unit_price: number
    tax_rate: number
    line_total: number
    created_at: string
}

export interface Quote {
    id: string
    quote_number: string
    store_id: string
    client_id: string
    status: QuoteStatus
    total_ht: number
    total_ttc: number
    valid_until: string | null
    signature_hash: string | null
    signed_at: string | null
    created_at: string
    updated_at: string
    lines?: QuoteLine[]
    store?: { id: string; name: string; city?: string | null }
    client?: { id: string; first_name: string; last_name: string; company: string | null } | null
    creator?: { id: string; first_name: string; last_name: string }
}

// ============================================================
// CATALOGUE CRUD
// ============================================================

import { unstable_noStore as noStore } from 'next/cache'

export async function getCommercialCatalogue(): Promise<CommercialCatalogueItem[]> {
    noStore()
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('commercial_catalogue')
        .select(`
            *,
            equipment_model:equipment_catalogue(id, brand, model_name)
        `)
        .order('name')

    if (error) {
        console.error('Erreur getCommercialCatalogue:', error)
        return []
    }
    return data ?? []
}

export async function addCatalogueItem(formData: {
    name: string
    type: ItemType
    default_price: number
    tax_rate?: number
    description?: string | null
    equipment_model_id?: string | null
}) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('commercial_catalogue')
        .insert({
            name: formData.name,
            type: formData.type,
            default_price: formData.default_price,
            tax_rate: formData.tax_rate ?? 20.00,
            description: formData.description || null,
            equipment_model_id: formData.equipment_model_id || null
        })
        .select('id')
        .single()

    if (error) {
        console.error('Erreur addCatalogueItem:', error)
        return { error: 'Impossible de créer le modèle commercial.' }
    }

    revalidatePath('/commerce')
    return { success: true, id: data.id }
}

export async function updateCatalogueItem(id: string, updates: Partial<{
    name: string
    type: ItemType
    default_price: number
    tax_rate: number
    description: string | null
    equipment_model_id: string | null
}>) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('commercial_catalogue')
        .update(updates)
        .eq('id', id)

    if (error) {
        console.error('Erreur updateCatalogueItem:', error)
        return { error: 'Impossible de mettre à jour le modèle commercial.' }
    }

    revalidatePath('/commerce')
    return { success: true }
}

export async function deleteCatalogueItem(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('commercial_catalogue')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Erreur deleteCatalogueItem:', error)
        return { error: 'Impossible de supprimer ce modèle.' }
    }

    revalidatePath('/commerce')
    return { success: true }
}

// ============================================================
// QUOTES
// ============================================================

export async function getQuotes(status?: QuoteStatus): Promise<Quote[]> {
    const supabase = await createClient()

    let query = supabase
        .from('quotes')
        .select(`
            *,
            store:stores(id, name)
        `)
        .order('created_at', { ascending: false })

    if (status) {
        query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
        console.error('Erreur getQuotes:', error)
        return []
    }
    return data ?? []
}

export async function getQuoteById(quoteId: string): Promise<Quote | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('quotes')
        .select(`
            *,
            store:stores(*),
            client:profiles!client_id(*),
            lines:quote_lines(*)
        `)
        .eq('id', quoteId)
        .maybeSingle()

    if (error) {
        console.error('Erreur getQuoteById:', JSON.stringify(error, null, 2))
        return null
    }

    return data as Quote
}

export async function createQuote(
    data: { store_id: string; client_id: string; valid_until?: string | null },
    lines: { catalogue_item_id?: string | null; designation: string; quantity: number; unit_price: number; tax_rate?: number }[]
) {
    console.log("PAYLOAD CRÉATION DEVIS :", data);
    const supabase = await createClient()

    // Retrieve a valid profile_id for this store or company
    // data.client_id is actually the company ID from the frontend's useClientsAndStores
    // quotes.client_id expects a profiles.id

    // First, try to find an active profile directly attached to this store via contact
    const { data: storeContacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('store_id', data.store_id);

    let targetProfileId = null;

    if (storeContacts && storeContacts.length > 0) {
        const contactIds = storeContacts.map((c: any) => c.id);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .in('contact_id', contactIds)
            .eq('role', 'CLIENT')
            .eq('is_active', true)
            .limit(1);

        if (profiles && profiles.length > 0) {
            targetProfileId = profiles[0].id;
        }
    }

    // Fallback: If no generic or store-specific profile, try finding any active client profile for this company
    if (!targetProfileId) {
        const { data: companyContacts } = await supabase
            .from('contacts')
            .select('id')
            .eq('client_id', data.client_id);

        if (companyContacts && companyContacts.length > 0) {
            const contactIds = companyContacts.map((c: any) => c.id);
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id')
                .in('contact_id', contactIds)
                .eq('role', 'CLIENT')
                .eq('is_active', true)
                .limit(1);

            if (profiles && profiles.length > 0) {
                targetProfileId = profiles[0].id;
            }
        }
    }

    // Note: To make the creation more robust if there are no registered client profiles yet, 
    // a common pattern is to either allow quotes.client_id to reference the `clients` table, 
    // or log an error and prevent quote creation unless a profile exists.
    if (!targetProfileId) {
        // To prevent crash, let's grab the creator's ID as a fallback, or fail gracefully.
        // But the schema expects a client_id. If no client profile exists, we can't create it.
        console.warn("No active client profile found for this company/store. Falling back to creator ID for devis creation.");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Non authentifié" };
        targetProfileId = user.id; // Usually quotes are linked to the buyer, but during admin creation this is a valid workaround if schema demands it.
    }

    // Server-side calculation
    let total_ht = 0;
    let total_ttc = 0;

    const computedLines = lines.map(line => {
        const qte = line.quantity || 1;
        const price = line.unit_price || 0;
        const tax = line.tax_rate ?? 20.00;
        const lineValHt = qte * price;
        const lineValTtc = lineValHt * (1 + tax / 100);

        total_ht += lineValHt;
        total_ttc += lineValTtc;

        return {
            ...line,
            quantity: qte,
            unit_price: price,
            tax_rate: tax,
            line_total: lineValHt
        }
    });

    // Auto-generate quote number (DEV-YYYY-XXXX)
    const year = new Date().getFullYear();
    const { count } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${year}-01-01T00:00:00.000Z`)

    const nextNum = (count || 0) + 1;
    const quoteNumber = `DEV-${year}-${String(nextNum).padStart(4, '0')}`;

    // Insert Quote
    const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
            quote_number: quoteNumber,
            store_id: data.store_id,
            client_id: targetProfileId,
            status: 'EN_ATTENTE',
            total_ht,
            total_ttc,
            valid_until: data.valid_until || null
        })
        .select('id')
        .single()

    if (quoteError) {
        console.error('Erreur createQuote:', quoteError)
        return { error: 'Erreur lors de la création du devis.' }
    }

    // Insert Lines
    const linesToInsert = computedLines.map(l => ({
        quote_id: quote.id,
        catalogue_item_id: l.catalogue_item_id || null,
        designation: l.designation,
        quantity: l.quantity,
        unit_price: l.unit_price,
        tax_rate: l.tax_rate,
        line_total: l.line_total
    }))

    const { error: linesError } = await supabase
        .from('quote_lines')
        .insert(linesToInsert)

    if (linesError) {
        console.error('Erreur createQuote (lignes):', linesError)
        // ideally rollback or just notify
        return { error: 'Erreur lors de la création des lignes du devis.' }
    }

    revalidatePath('/commerce')
    return { success: true, id: quote.id }
}

export async function acceptQuote(quoteId: string, signerId: string) {
    const supabase = await createClient()

    // Signer information check
    const { data: signer, error: signerError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', signerId)
        .single()

    if (signerError || !signer) {
        return { error: 'Signataire introuvable ou non autorisé.' }
    }

    // Fetch the quote and its lines with catalog details
    const { data: quote, error: fetchError } = await supabase
        .from('quotes')
        .select(`
            id,
            store_id,
            status,
            lines:quote_lines(
                id,
                quantity,
                catalogue_item:commercial_catalogue(
                    id,
                    type,
                    equipment_model_id
                )
            )
        `)
        .eq('id', quoteId)
        .maybeSingle()

    if (fetchError || !quote) {
        console.error('Erreur acceptQuote (fetch):', fetchError)
        return { error: 'Devis introuvable.' }
    }

    if (quote.status !== 'BROUILLON' && quote.status !== 'EN_ATTENTE') {
        return { error: 'Ce devis ne peut plus être accepté.' }
    }

    // Generate SHA-256 hash
    const dateStr = new Date().toISOString()
    const rawData = `${quoteId}-${signerId}-${dateStr}`;
    const signature_hash = crypto.createHash('sha256').update(rawData).digest('hex')

    // Begin the update and CMDB automation

    // 1. Update quote status to ACCEPTE
    const { error: updateError } = await supabase
        .from('quotes')
        .update({
            status: 'ACCEPTE',
            signed_at: dateStr,
            signature_hash
        })
        .eq('id', quoteId)

    if (updateError) {
        console.error('Erreur acceptQuote (update):', updateError)
        return { error: 'Erreur lors de l\'acceptation du devis.' }
    }

    // 2. CMDB Automation logic
    try {
        const equipmentsToInsert: any[] = []

        // Iterate through all quote lines
        if (quote.lines && quote.lines.length > 0) {
            for (const line of quote.lines as any[]) {
                const catItem = line.catalogue_item

                // Check if it's MATERIEL and linked to an equipment model
                if (catItem && catItem.type === 'MATERIEL' && catItem.equipment_model_id) {

                    // Add an equipment entry for each quantity unit
                    for (let i = 0; i < line.quantity; i++) {
                        // Generate a temporary unique serial number (since actual is unknown until delivery)
                        const tempSerial = `PENDING-${quoteId.substring(0, 8)}-${catItem.equipment_model_id.substring(0, 4)}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`

                        equipmentsToInsert.push({
                            catalogue_id: catItem.equipment_model_id,
                            store_id: quote.store_id,
                            serial_number: tempSerial,
                            status: 'COMMANDÉ_FOURNISSEUR',
                            notes: `Généré automatiquement suite à l'acceptation du devis ${quoteId}`,
                        })
                    }
                }
            }
        }

        // Batch insert the new equipments if there are any
        if (equipmentsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('equipments')
                .insert(equipmentsToInsert)

            if (insertError) {
                console.error('Erreur CMDB Bridge:', insertError)
                // We don't block the quote acceptance return but we log the error
            }
        }
    } catch (e) {
        console.error('Erreur CMDB Bridge Exception:', e)
    }

    revalidatePath('/commerce')
    revalidatePath('/commerce/catalogue')
    revalidatePath(`/commerce/${quoteId}`) // Also revalidate specific detail page
    return { success: true, signature_hash }
}

export async function getClientsForSelect() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.', data: [] }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, store_id')
        .eq('role', 'CLIENT')
        .order('last_name')

    if (error) {
        console.error("Erreur [getClientsForSelect]:", error)
        return { error: 'Échec de la récupération des clients.', data: [] }
    }

    return { success: true, data: data || [] }
}

export async function getEquipmentModelsForSelect() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('equipment_catalogue')
        .select('id, brand, model_name')
        .order('brand')

    if (error) {
        console.error("Erreur [getEquipmentModelsForSelect]:", error)
        return { error: 'Échec de la récupération des modèles techniques.', data: [] }
    }

    const formattedData = (data || []).map(m => ({
        id: m.id,
        label: `${m.brand} - ${m.model_name}`
    }))

    return { success: true, data: formattedData }
}

