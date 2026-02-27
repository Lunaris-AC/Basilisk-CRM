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
        .not('status', 'in', '("resolu","ferme","suspendu")')

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

    const BLOCKED_ROLES = ['N1', 'N2', 'N3']
    if (!profile || BLOCKED_ROLES.includes(profile.role)) {
        return { error: 'Action non autorisée. Utilisez le bouton Piocher.' }
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
export async function escalateTicket(ticketId: string, direction: 'up' | 'down', currentRank: number, justification: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    // SPRINT 26.1 : Gestion dynamique des niveaux
    const { data: allLevels } = await supabase
        .from('support_levels')
        .select('id, name, rank')
        .eq('is_active', true)
        .order('rank', { ascending: true })

    if (!allLevels || allLevels.length === 0) {
        return { error: 'Aucun niveau de support configuré.' }
    }

    const currentIndex = allLevels.findIndex(l => l.rank === currentRank)
    if (currentIndex === -1) return { error: 'Niveau actuel introuvable.' }

    let nextIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1
    nextIndex = Math.max(0, Math.min(allLevels.length - 1, nextIndex))

    const targetLevel = allLevels[nextIndex]

    // Force la désassignation et la remise en file d'attente à chaque changement de niveau
    const updates: any = {
        escalation_level: targetLevel.rank,
        support_level_id: targetLevel.id,
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
    await addComment(ticketId, `${prefix} ${allLevels[currentIndex].name} -> ${targetLevel.name}. Motif : ${justification}`, true)

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
export async function createTicket(formData: FormData, assignToMe: boolean = false) {
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

    // Champs spécifiques DEV
    const sdType = formData.get('sd_type') as string || null
    const reproductionSteps = formData.get('reproduction_steps') as string || null
    const sdImpact = formData.get('sd_impact') as string || null
    const needDescription = formData.get('need_description') as string || null
    const expectedProcess = formData.get('expected_process') as string || null

    // SPRINT 23 : Liaison optionnelle à un équipement CMDB
    const equipmentId = formData.get('equipment_id') as string || null

    const attachments = formData.getAll('attachments') as File[]

    // 3. Validation basique
    if (!title || !description) {
        return { error: 'Veuillez remplir le titre et la description.' }
    }

    // Pour les tickets non-DEV, client et magasin sont obligatoires
    if (category !== 'DEV' && (!clientId || !storeId)) {
        return { error: 'Veuillez remplir tous les champs obligatoires (Client, Magasin).' }
    }

    // Contrôle de rôle pour la catégorie DEV
    if (category === 'DEV') {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        const allowedRoles = ['N4', 'DEV', 'COM', 'ADMIN']
        if (!profile || !allowedRoles.includes(profile.role)) {
            return { error: 'Vous n\'avez pas les droits pour créer un SD.' }
        }
    }

    // 4. Insertion du ticket (statut nouveau ou en_cours si auto-assignation)
    // SPRINT 26.1 : Récupérer le niveau par défaut (Rank 1)
    const { data: firstLevel } = await supabase
        .from('support_levels')
        .select('id')
        .eq('rank', 1)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

    const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
            title,
            description,
            problem_location: problemLocation,
            priority,
            contact_id: contactId,
            creator_id: user.id,
            status: assignToMe ? 'en_cours' : 'nouveau',
            assignee_id: assignToMe ? user.id : null,
            escalation_level: 1, // Compatibilité
            support_level_id: firstLevel?.id || null, // Dynamique
            category,
            ...(category !== 'DEV' ? { client_id: clientId, store_id: storeId } : {}),
            ...(equipmentId ? { equipment_id: equipmentId } : {}),
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
    } else if (category === 'DEV' && sdType) {
        const { error: extError } = await supabase.from('ticket_dev_details').insert({
            ticket_id: ticket.id,
            type: sdType,
            reproduction_steps: reproductionSteps,
            impact: sdImpact,
            need_description: needDescription,
            expected_process: expectedProcess,
        })
        if (extError) console.error("Erreur insertion dev_details:", extError)
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
    revalidatePath('/sd')

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

// ============== SPRINT 17 : ACTIONS SD (BUGS & ÉVOLUTIONS DEV) ==============

/**
 * Server Action : Assigner un SD au dev connecté.
 * Vérifie que l'utilisateur a le rôle 'DEV' ou 'ADMIN'.
 */
export async function assignSD(ticketId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['DEV', 'ADMIN'].includes(profile.role)) {
        return { error: 'Seuls les développeurs et administrateurs peuvent s\'assigner un SD.' }
    }

    const { error: updateError } = await supabase
        .from('tickets')
        .update({
            assignee_id: user.id,
            status: 'en_cours'
        })
        .eq('id', ticketId)
        .eq('category', 'DEV')

    if (updateError) {
        console.error('Erreur assignSD:', updateError)
        return { error: 'Impossible de s\'assigner ce SD.' }
    }

    revalidatePath('/sd')
    revalidatePath(`/tickets/${ticketId}`)
    return { success: true }
}

/**
 * Server Action : Mettre à jour les détails métier d'un SD (ex: complexité).
 */
export async function updateDevDetails(ticketId: string, data: { complexity?: string, reproduction_steps?: string, impact?: string, need_description?: string, expected_process?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const updateData: Record<string, any> = {}
    if (data.complexity !== undefined) updateData.complexity = data.complexity || null
    if (data.reproduction_steps !== undefined) updateData.reproduction_steps = data.reproduction_steps || null
    if (data.impact !== undefined) updateData.impact = data.impact || null
    if (data.need_description !== undefined) updateData.need_description = data.need_description || null
    if (data.expected_process !== undefined) updateData.expected_process = data.expected_process || null

    const { error } = await supabase
        .from('ticket_dev_details')
        .update(updateData)
        .eq('ticket_id', ticketId)

    if (error) {
        console.error('Erreur updateDevDetails:', error)
        return { error: 'Erreur lors de la mise à jour des détails SD.' }
    }

    await addComment(ticketId, `[MISE À JOUR] Les détails SD ont été modifiés.`, true)
    revalidatePath(`/tickets/${ticketId}`)
    return { success: true }
}

// ============== SPRINT 21 : LIAISON HL ↔ SD ==============

/**
 * Server Action : Lier un ticket HL (incident) à un ticket SD (DEV).
 * Met à jour le champ `linked_sd_id` sur le ticket HL.
 */
export async function linkTicketToSD(hlTicketId: string, sdTicketId: string | null) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { error } = await supabase
        .from('tickets')
        .update({ linked_sd_id: sdTicketId })
        .eq('id', hlTicketId)

    if (error) {
        console.error('Erreur linkTicketToSD:', error)
        return { error: 'Impossible de lier le ticket au SD.' }
    }

    if (sdTicketId) {
        await addComment(hlTicketId, `[LIAISON SD] Ce ticket a été rattaché au SD #${sdTicketId.slice(0, 8)}.`, true)
    } else {
        await addComment(hlTicketId, `[LIAISON SD] Le lien vers le SD a été supprimé.`, true)
    }

    revalidatePath(`/tickets/${hlTicketId}`)
    return { success: true }
}

// ============== SPRINT 22 : RÉSOLUTION EN CASCADE SD → HL ==============

/**
 * Server Action : Résoudre un SD et (optionnellement) clôturer tous ses tickets HL liés.
 * Insère un commentaire automatique dans chaque ticket HL fermé en cascade.
 */
export async function resolveSD(sdId: string, resolutionMessage: string, closeLinkedTickets: boolean) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    // 1. Passer le SD en "résolu"
    const { error: sdError } = await supabase
        .from('tickets')
        .update({ status: 'resolu' })
        .eq('id', sdId)
        .eq('category', 'DEV')

    if (sdError) {
        console.error('Erreur resolveSD:', sdError)
        return { error: 'Impossible de résoudre ce SD.' }
    }

    // Commentaire de résolution sur le SD
    await addComment(sdId, `[RÉSOLUTION SD] ${resolutionMessage}`, false)

    // Audit log pour le SD
    await supabase.from('ticket_audit_logs').insert({
        ticket_id: sdId,
        user_id: user.id,
        action: 'resolved',
        details: { message: resolutionMessage, cascade: closeLinkedTickets }
    })

    // 2. Clôture en cascade si demandé
    if (closeLinkedTickets) {
        // Récupérer tous les tickets HL liés
        const { data: linkedTickets } = await supabase
            .from('tickets')
            .select('id')
            .eq('linked_sd_id', sdId)
            .neq('status', 'ferme')

        if (linkedTickets && linkedTickets.length > 0) {
            const hlIds = linkedTickets.map(t => t.id)

            // UPDATE massif : passer tous les HL en "résolu"
            await supabase
                .from('tickets')
                .update({ status: 'resolu' })
                .in('id', hlIds)

            // Insérer un commentaire automatique dans chaque HL
            for (const hlId of hlIds) {
                await addComment(
                    hlId,
                    `[RÉSOLUTION AUTOMATIQUE] Le bug logiciel associé (SD #${sdId.slice(0, 8)}) a été corrigé. Motif du dev : ${resolutionMessage}`,
                    false
                )

                // Audit log pour chaque HL
                await supabase.from('ticket_audit_logs').insert({
                    ticket_id: hlId,
                    user_id: user.id,
                    action: 'resolved_cascade',
                    details: { sd_id: sdId, message: resolutionMessage }
                })
            }
        }
    }

    revalidatePath(`/tickets/${sdId}`)
    revalidatePath('/sd')
    revalidatePath('/dashboard')
    revalidatePath('/incidents')

    return { success: true }
}

// ============== SPRINT 22 : RECHERCHE GLOBALE (OMNIBAR) ==============

/**
 * Server Action : Recherche globale dans les tickets et contacts.
 * Utilisée par l'Omnibar (Cmd+K).
 */
export async function searchOmnibar(query: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { tickets: [], contacts: [] }

    if (!query || query.trim().length < 2) return { tickets: [], contacts: [] }

    const term = `%${query.trim()}%`

    // Recherche dans les tickets (par titre)
    const { data: ticketsByTitle } = await supabase
        .from('tickets')
        .select('id, title, status, priority, category')
        .ilike('title', term)
        .order('created_at', { ascending: false })
        .limit(8)

    // Recherche dans les contacts (prénom ou nom) — deux requêtes pour éviter .or()
    const [{ data: contactsByFirst }, { data: contactsByLast }] = await Promise.all([
        supabase
            .from('contacts')
            .select('id, first_name, last_name, email, phone')
            .ilike('first_name', term)
            .order('last_name', { ascending: true })
            .limit(8),
        supabase
            .from('contacts')
            .select('id, first_name, last_name, email, phone')
            .ilike('last_name', term)
            .order('last_name', { ascending: true })
            .limit(8),
    ])

    // Dédupliquer les contacts
    const contactMap = new Map<string, any>()
    for (const c of [...(contactsByFirst || []), ...(contactsByLast || [])]) {
        contactMap.set(c.id, c)
    }

    return {
        tickets: ticketsByTitle || [],
        contacts: [...contactMap.values()].slice(0, 8)
    }
}

