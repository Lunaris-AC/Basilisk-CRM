'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Server Action : Piocher un ticket aléatoire selon le niveau du technicien.
 * Utilise la fonction RPC transactionnelle "pick_ticket" dans Supabase.
 */
export async function pickRandomTicket() {
    const supabase = await createClient()

    // 1. Récupérer l'utilisateur connecté
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return { error: 'Non authentifié.' }
    }

    // 2. Récupérer son profil (pour avoir son rôle)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile) {
        return { error: 'Profil introuvable.' }
    }

    // 2.5 VÉRIFICATION SPRINT 6.1 : Flux tendu (1 ticket max)
    const { count: activeTicketsCount, error: countError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', user.id)
        .not('status', 'in', '("resolu","ferme")')

    if (countError) {
        return { error: 'Erreur lors de la vérification de vos tickets actifs.' }
    }

    if (activeTicketsCount && activeTicketsCount > 0) {
        return { error: 'Terminez d\'abord votre ticket en cours.' }
    }

    // 3. Appeler la fonction RPC transactionnelle
    const { data: ticketId, error: rpcError } = await supabase.rpc('pick_ticket', {
        p_user_id: user.id,
        p_user_role: profile.role,
    })

    if (rpcError) {
        console.error("Erreur RPC pick_ticket:", rpcError)
        return { error: 'Erreur lors de l\'assignation du ticket.' }
    }

    if (!ticketId) {
        return { success: false, message: 'La file d\'attente est vide pour votre niveau.' }
    }

    // 4. Revalider les chemins pour mettre à jour l'UI en temps réel
    revalidatePath('/dashboard')
    revalidatePath('/incidents')

    return { success: true, ticketId }
}

/**
 * Server Action : Assigner un ticket manuellement.
 * Réservé aux N4 et ADMIN.
 */
export async function assignTicketManually(ticketId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['ADMIN', 'N4'].includes(profile.role)) {
        return { error: 'Action non autorisée. Réservé aux administrateurs et experts N4.' }
    }

    const { error: updateError } = await supabase
        .from('tickets')
        .update({
            assignee_id: user.id,
            status: 'assigne'
        })
        .eq('id', ticketId)
        .is('assignee_id', null) // S'assure qu'il n'est pas déjà pris entre temps

    if (updateError) {
        return { error: 'Impossible d\'assigner ce ticket manuellement.' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/incidents')

    return { success: true }
}

// ============== SPRINT 7 : ACTIONS DÉTAIL TICKET ==============

/**
 * Server Action : Ajouter un commentaire dans le fil d'un ticket.
 */
export async function addComment(ticketId: string, content: string, isInternal: boolean = false) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { error: insertError } = await supabase
        .from('ticket_comments')
        .insert({
            ticket_id: ticketId,
            author_id: user.id,
            content: content,
            is_internal: isInternal
        })

    if (insertError) {
        console.error("Erreur addComment:", insertError)
        return { error: 'Impossible d\'ajouter le message.' }
    }

    // Le trigger audit ne loguera pas directement le message,
    // mais on met à jour l'en-tête du ticket pour modifier son updated_at.
    await supabase.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticketId)

    revalidatePath(`/tickets/${ticketId}`)
    return { success: true }
}

/**
 * Server Action : Mettre à jour le statut d'un ticket.
 * Utilisé pour Nouveau, Assigné, En Cours, Attente Client.
 */
export async function updateTicketStatus(ticketId: string, newStatus: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId)

    if (error) {
        console.error("Erreur updateTicketStatus:", error)
        return { error: 'Impossible de changer le statut.' }
    }

    revalidatePath(`/tickets/${ticketId}`)
    revalidatePath('/dashboard')

    return { success: true }
}

/**
 * Server Action : Suspendre un ticket.
 */
export async function suspendTicket(ticketId: string, resumeAtDate: string, justification: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('tickets')
        .update({ status: 'suspendu', resume_at: resumeAtDate })
        .eq('id', ticketId)

    if (error) {
        console.error("Erreur suspendTicket:", error)
        return { error: 'Impossible de suspendre le ticket.' }
    }

    await addComment(ticketId, `[SUSPENSION] ${justification}`, true)

    revalidatePath(`/tickets/${ticketId}`)
    revalidatePath('/dashboard')

    return { success: true }
}

/**
 * Server Action : Clôturer un ticket.
 */
export async function closeTicket(ticketId: string, justification: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('tickets')
        .update({ status: 'ferme', resume_at: null })
        .eq('id', ticketId)

    if (error) {
        console.error("Erreur closeTicket:", error)
        return { error: 'Impossible de clôturer le ticket.' }
    }

    await addComment(ticketId, `[CLÔTURE] ${justification}`, false)

    revalidatePath(`/tickets/${ticketId}`)
    revalidatePath('/dashboard')

    return { success: true }
}

/**
 * Server Action : Escalader un ticket (Niveau supérieur ou retour) avec justification.
 * Direction: 'up' (escalader) ou 'down' (rétrograder).
 */
export async function escalateTicket(ticketId: string, direction: 'up' | 'down', currentLevel: number, justification: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const newLevel = direction === 'up' ? Math.min(4, currentLevel + 1) : Math.max(1, currentLevel - 1)

    // Force la désassignation et la remise en file d'attente à chaque changement de niveau
    const updates: any = {
        escalation_level: newLevel,
        escalated_by_id: user.id,
        assignee_id: null,
        status: 'nouveau'
    }

    const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)

    if (error) {
        console.error("Erreur escalateTicket:", error)
        return { error: 'Impossible d\'escalader le ticket.' }
    }

    const prefix = direction === 'up' ? '[ESCALADE]' : '[DÉSESCALADE]'
    await addComment(ticketId, `${prefix} Niveau ${currentLevel} -> ${newLevel}. Motif : ${justification}`, true)

    revalidatePath(`/tickets/${ticketId}`)
    revalidatePath('/dashboard')
    revalidatePath('/incidents')

    return { success: true }
}

/**
 * Server Action : Réactiver un ticket fermé.
 */
export async function reopenTicket(ticketId: string, justification: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('tickets')
        .update({ status: 'en_cours', resume_at: null })
        .eq('id', ticketId)

    if (error) {
        console.error("Erreur reopenTicket:", error)
        return { error: 'Impossible de réactiver le ticket.' }
    }

    await addComment(ticketId, `[RÉACTIVATION] ${justification}`, true)

    revalidatePath(`/tickets/${ticketId}`)
    revalidatePath('/dashboard')
    revalidatePath('/incidents')

    return { success: true }
}

/**
 * Server Action : Créer un nouveau ticket avec pièces jointes.
 */
export async function createTicket(formData: FormData) {
    const supabase = await createClient()

    // 1. Authentification
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Non autorisé. Veuillez vous connecter.' }
    }

    // 2. Extraction des champs
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const clientId = formData.get('client_id') as string || null
    const storeId = formData.get('store_id') as string || null
    const problemLocation = formData.get('problem_location') as string || null
    const priority = formData.get('priority') as string || 'normale'
    const contactId = formData.get('contact_id') as string || null
    const category = formData.get('category') as string || 'HL'

    // Champs spécifiques par catégorie
    const quoteNumber = formData.get('quote_number') as string || null
    const invoiceNumber = formData.get('invoice_number') as string || null
    const serviceType = formData.get('service_type') as string || null

    const serialNumber = formData.get('serial_number') as string || null
    const productReference = formData.get('product_reference') as string || null
    const hardwareStatus = formData.get('hardware_status') as string || null

    const travelDate = formData.get('travel_date') as string || null
    const trainingLocation = formData.get('training_location') as string || null
    const trainingType = formData.get('training_type') as string || null

    const attachments = formData.getAll('attachments') as File[]

    // 3. Validation basique
    if (!title || !description || !clientId || !storeId) {
        return { error: 'Veuillez remplir tous les champs obligatoires (Titre, Description, Client, Magasin).' }
    }

    // 4. Insertion du ticket (statut nouveau, non assigné)
    const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
            title,
            description,
            client_id: clientId,
            store_id: storeId,
            problem_location: problemLocation,
            priority,
            contact_id: contactId,
            creator_id: user.id,
            status: 'nouveau',
            escalation_level: 1,
            category,
        })
        .select('id')
        .single()

    if (ticketError || !ticket) {
        console.error("Erreur createTicket:", ticketError)
        return { error: 'Impossible de créer le ticket.' }
    }

    // 5. Insertion des métadonnées spécifiques selon la catégorie
    if (category === 'COMMERCE') {
        const { error: extError } = await supabase.from('ticket_commerce_details').insert({
            ticket_id: ticket.id,
            quote_number: quoteNumber,
            invoice_number: invoiceNumber,
            service_type: serviceType,
        })
        if (extError) console.error("Erreur insertion commerce_details:", extError)
    } else if (category === 'SAV') {
        const { error: extError } = await supabase.from('ticket_sav_details').insert({
            ticket_id: ticket.id,
            serial_number: serialNumber,
            product_reference: productReference,
            hardware_status: hardwareStatus,
        })
        if (extError) console.error("Erreur insertion sav_details:", extError)
    } else if (category === 'FORMATION') {
        const { error: extError } = await supabase.from('ticket_formateur_details').insert({
            ticket_id: ticket.id,
            travel_date: travelDate ? new Date(travelDate).toISOString() : null,
            training_location: trainingLocation,
            training_type: trainingType,
        })
        if (extError) console.error("Erreur insertion formateur_details:", extError)
    }

    // 6. Upload des pièces jointes si présentes et sauvegarde des métadonnées
    const ticketId = ticket.id
    for (const file of attachments) {
        if (file && file.size > 0) {
            const fileName = `${ticketId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
            const { error: uploadError } = await supabase.storage
                .from('ticket_attachments')
                .upload(fileName, file)

            if (uploadError) {
                console.error("Erreur upload pièce jointe:", uploadError)
                continue // On log mais on ne bloque pas la création finale du ticket
            }

            // Récupérer l'URL publique
            const { data } = supabase.storage
                .from('ticket_attachments')
                .getPublicUrl(fileName)

            // Insérer la métadonnée dans la table
            await supabase.from('ticket_attachments').insert({
                ticket_id: ticketId,
                file_name: file.name,
                file_url: data.publicUrl,
                file_type: file.type || 'application/octet-stream',
                file_size: file.size,
                uploaded_by: user.id
            })
        }
    }

    // 7. Invalidation du cache pour rafraîchir les listes
    revalidatePath('/dashboard')
    revalidatePath('/incidents')

    return { success: true, ticketId }
}

/**
 * Server Action : Ajouter une ou plusieurs pièces jointes à un ticket existant.
 */
export async function uploadAttachments(ticketId: string, formData: FormData) {
    const supabase = await createClient()

    // 1. Authentification
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Non autorisé. Veuillez vous connecter.' }
    }

    // 2. Récupération des fichiers
    const attachments = formData.getAll('attachments') as File[]
    if (!attachments || attachments.length === 0) {
        return { error: 'Aucun fichier sélectionné.' }
    }

    let uploadedCount = 0

    // 3. Upload des fichiers
    for (const file of attachments) {
        if (file && file.size > 0) {
            const fileName = `${ticketId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
            const { error: uploadError } = await supabase.storage
                .from('ticket_attachments')
                .upload(fileName, file)

            if (uploadError) {
                console.error("Erreur upload pièce jointe existante:", uploadError)
            } else {
                // Récupérer l'URL publique
                const { data } = supabase.storage
                    .from('ticket_attachments')
                    .getPublicUrl(fileName)

                // Insérer la métadonnée dans la table
                await supabase.from('ticket_attachments').insert({
                    ticket_id: ticketId,
                    file_name: file.name,
                    file_url: data.publicUrl,
                    file_type: file.type || 'application/octet-stream',
                    file_size: file.size,
                    uploaded_by: user.id
                })

                uploadedCount++
            }
        }
    }

    if (uploadedCount === 0) {
        return { error: 'Échec de l\'upload des fichiers.' }
    }

    // Ajout d'un commentaire système discret
    await addComment(ticketId, `[PIÈCES JOINTES] L'utilisateur a ajouté ${uploadedCount} pièce(s) jointe(s).`, true)

    revalidatePath(`/tickets/${ticketId}`)

    return { success: true }
}

/**
 * Server Action : Lier un contact à un ticket existant.
 */
export async function linkContactToTicket(ticketId: string, contactId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { error } = await supabase
        .from('tickets')
        .update({ contact_id: contactId })
        .eq('id', ticketId)

    if (error) {
        console.error('Error linking contact to ticket:', error)
        return { error: 'Erreur lors de la mise à jour de l\'interlocuteur.' }
    }

    revalidatePath(`/tickets/${ticketId}`)
    return { success: true }
}

// ============== SPRINT 14.1 : ACTIONS DE MISE À JOUR MULTI-SERVICES ==============

/**
 * Server Action : Mettre à jour les détails métier d'un ticket Commerce.
 */
export async function updateCommerceDetails(ticketId: string, data: { quote_number?: string, invoice_number?: string, service_type?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { error } = await supabase
        .from('ticket_commerce_details')
        .update({
            quote_number: data.quote_number || null,
            invoice_number: data.invoice_number || null,
            service_type: data.service_type || null
        })
        .eq('ticket_id', ticketId)

    if (error) {
        console.error('Erreur updateCommerceDetails:', error)
        return { error: 'Erreur lors de la mise à jour des détails Commerce.' }
    }

    await addComment(ticketId, `[MISE À JOUR] Les détails Commerce ont été modifiés.`, true)
    revalidatePath(`/tickets/${ticketId}`)
    return { success: true }
}

/**
 * Server Action : Mettre à jour les détails métier d'un ticket SAV.
 */
export async function updateSAVDetails(ticketId: string, data: { serial_number?: string, product_reference?: string, hardware_status?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { error } = await supabase
        .from('ticket_sav_details')
        .update({
            serial_number: data.serial_number || null,
            product_reference: data.product_reference || null,
            hardware_status: data.hardware_status || null
        })
        .eq('ticket_id', ticketId)

    if (error) {
        console.error('Erreur updateSAVDetails:', error)
        return { error: 'Erreur lors de la mise à jour des détails SAV.' }
    }

    await addComment(ticketId, `[MISE À JOUR] Les détails SAV ont été modifiés.`, true)
    revalidatePath(`/tickets/${ticketId}`)
    return { success: true }
}

/**
 * Server Action : Mettre à jour les détails métier d'un ticket Formateur.
 */
export async function updateFormateurDetails(ticketId: string, data: { travel_date?: string, training_location?: string, training_type?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { error } = await supabase
        .from('ticket_formateur_details')
        .update({
            travel_date: data.travel_date ? new Date(data.travel_date).toISOString() : null,
            training_location: data.training_location || null,
            training_type: data.training_type || null
        })
        .eq('ticket_id', ticketId)

    if (error) {
        console.error('Erreur updateFormateurDetails:', error)
        return { error: 'Erreur lors de la mise à jour des détails Formateur.' }
    }

    await addComment(ticketId, `[MISE À JOUR] Les détails Formateur ont été modifiés.`, true)
    revalidatePath(`/tickets/${ticketId}`)
    return { success: true }
}
