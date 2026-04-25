'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { evaluateTicketRouting } from './actions/routing'
import { SLA_HOURS, addHours, addMinutes, diffInMinutes } from './sla'
import { getDynamicSlaHours } from './sla-server'

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

    // 1.5 VÉRIFICATION SPRINT 6.1 : Flux tendu (1 ticket max)
    // HOTFIX 32.1 : Correction de la syntaxe du filtre Supabase "not in"
    const { count: activeTicketsCount, error: countError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', user.id)
        .not('status', 'in', '(resolu,ferme,suspendu)')

    if (countError) {
        return { error: 'Erreur lors de la vérification de vos tickets actifs.' }
    }

    if (activeTicketsCount && activeTicketsCount > 0) {
        return { error: 'Vous avez déjà un ticket actif. Terminez-le avant de piocher.' }
    }

    // 2. Appeler la fonction RPC transactionnelle (HOTFIX 32.1 : version corrigée)
    const { data: ticketId, error: rpcError } = await supabase.rpc('pick_ticket', {
        p_user_id: user.id
    })

    if (rpcError) {
        console.error("Erreur RPC pick_ticket:", rpcError)
        return { error: `Erreur technique lors de la pioche : ${rpcError.message}` }
    }

    // HOTFIX 32.1 : Retourner une vraie propriété 'error' pour que l'UI affiche le toast
    if (!ticketId) {
        return { success: false, error: 'Aucun ticket disponible pour votre niveau de support.' }
    }

    // 3. Revalider les chemins pour mettre à jour l'UI en temps réel
    revalidatePath('/dashboard')
    revalidatePath('/incidents')

    return { success: true, ticketId }
}

/**
 * Server Action : Assigner un ticket manuellement.
 * Désormais ouvert aux ADMIN et STANDARD (pour réassigner).
 * targetUserId : Optionnel, si non fourni assigne à soi-même.
 */
export async function assignTicketManually(ticketId: string, targetUserId?: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, support_level')
        .eq('id', user.id)
        .single()

    // SPRINT 50 : On autorise ADMIN et STANDARD à réassigner manuellement
    const ALLOWED_ROLES = ['ADMIN', 'STANDARD']
    
    // On garde aussi l'accès pour les techniciens N4
    const isN4 = profile?.role === 'TECHNICIEN' && profile?.support_level === 'N4'

    if (!profile || (!ALLOWED_ROLES.includes(profile.role) && !isN4)) {
        return { error: 'Action non autorisée. Votre rôle ne permet pas l\'assignation manuelle.' }
    }

    const finalAssigneeId = targetUserId || user.id

    const { error: updateError } = await supabase
        .from('tickets')
        .update({
            assignee_id: finalAssigneeId,
            status: 'assigne'
        })
        .eq('id', ticketId)

    if (updateError) {
        return { error: 'Impossible d\'assigner ce ticket manuellement.' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/incidents')
    revalidatePath(`/tickets/${ticketId}`)

    return { success: true }
}

/**
 * Server Action : Migrer un ticket vers un autre service (catégorie).
 */
export async function migrateTicketCategory(ticketId: string, newCategory: 'COMMERCE' | 'SAV1' | 'SAV2' | 'FORMATION' | 'HL' | 'DEV') {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, support_level')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return { error: 'Profil introuvable.' }
    }

    try {
        const { error: updateError } = await supabase
            .from('tickets')
            .update({
                category: newCategory,
                assignee_id: null,
                status: 'nouveau'
            })
            .eq('id', ticketId)

        if (updateError) {
            console.error('Erreur migration ticket (SQL):', updateError)
            return { error: `Impossible de migrer ce ticket (SQL) : ${updateError.message}` }
        }

        await addComment(ticketId, `[MIGRATION] Ticket migré vers le service ${newCategory}. Désassigné et remis en file d'attente.`, true)

        revalidatePath('/dashboard')
        revalidatePath('/incidents')
        revalidatePath(`/tickets/${ticketId}`)

        return { success: true }
    } catch (e: any) {
        console.error('Erreur migration ticket (Exception):', e)
        return { error: `Erreur inattendue lors de la migration : ${e.message}` }
    }
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

    // SPRINT 32 : Fetch du ticket actuel pour la logique SLA
    const { data: currentTicket } = await supabase
        .from('tickets')
        .select('status, sla_paused_at, sla_deadline_at, sla_elapsed_minutes')
        .eq('id', ticketId)
        .single()

    const now = new Date()
    const slaUpdates: Record<string, unknown> = {}

    if (currentTicket) {
        const wasPaused = currentTicket.sla_paused_at !== null

        if (newStatus === 'attente_client' && !wasPaused) {
            // Mise en PAUSE du SLA
            slaUpdates.sla_paused_at = now.toISOString()
        } else if (wasPaused && newStatus !== 'attente_client') {
            // REPRISE du SLA : on rattrape le temps d'attente client
            const pausedAt = new Date(currentTicket.sla_paused_at as string)
            const deltaMinutes = diffInMinutes(pausedAt, now)
            const previousElapsed = currentTicket.sla_elapsed_minutes ?? 0
            const previousDeadline = currentTicket.sla_deadline_at
                ? new Date(currentTicket.sla_deadline_at)
                : null

            slaUpdates.sla_paused_at = null
            slaUpdates.sla_elapsed_minutes = previousElapsed + deltaMinutes
            if (previousDeadline) {
                slaUpdates.sla_deadline_at = addMinutes(previousDeadline, deltaMinutes).toISOString()
            }
        }
    }

    const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus, ...slaUpdates })
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
    let clientId = formData.get('client_id') as string || null
    let storeId = formData.get('store_id') as string || null
    const problemLocation = formData.get('problem_location') as string || null
    let priority = formData.get('priority') as string || 'normale'
    let contactId = formData.get('contact_id') as string || null
    let category = formData.get('category') as string || 'HL'

    // SPRINT 29.3 : Override de sécurité pour le rôle CLIENT
    // HOTFIX 29.5 : Override de sécurité pour le rôle CLIENT
    const { data: profile } = await supabase.from('profiles').select('role, contact_id, store_id').eq('id', user.id).single()
    if (profile?.role === 'CLIENT') {
        category = 'HL'
        priority = 'normale'
        contactId = profile.contact_id || null

        if (!profile.store_id) {
            return { error: 'Aucun magasin n\'est associé à votre profil.' }
        }

        // ÉTAPE 1 : Récupère le magasin pour avoir l'entreprise
        const { data: store } = await supabase.from('stores').select('client_id').eq('id', profile.store_id).single()

        if (!store?.client_id) {
            return { error: 'Magasin invalide ou société parente introuvable.' }
        }

        // Écrase le payload avant l'insertion
        storeId = profile.store_id
        clientId = store.client_id
    }

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

    const nowInsert = new Date()
    const effectivePriority = priority || 'normale'
    const dynamicSlaHours = await getDynamicSlaHours()
    const slaHours = dynamicSlaHours[effectivePriority] ?? dynamicSlaHours['normale']

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
            // SPRINT 32 : Initialisation du SLA selon la priorité
            sla_start_at: nowInsert.toISOString(),
            sla_deadline_at: addHours(nowInsert, slaHours).toISOString(),
            sla_elapsed_minutes: 0,
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
    } else if (category === 'SAV1' || category === 'SAV2') {
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

    // --- SPRINT 27: BRANCHEMENT DU MOTEUR DE ROUTAGE ---
    const routingResult = await evaluateTicketRouting(ticketId);
    if (routingResult.match) {
        const updateData: any = {};
        if (routingResult.assignToLevelId) updateData.support_level_id = routingResult.assignToLevelId;
        if (routingResult.assignToUserId) updateData.assignee_id = routingResult.assignToUserId;

        if (Object.keys(updateData).length > 0) {
            const { error: rtError } = await supabase
                .from('tickets')
                .update(updateData)
                .eq('id', ticketId);

            if (!rtError) {
                await addComment(ticketId, `[ROUTAGE AUTOMATIQUE] Ticket routé automatiquement par la règle : ${routingResult.ruleName}`, true);
            } else {
                console.error("Erreur lors de l'application du routage:", rtError);
            }
        }
    }
    // ---------------------------------------------------

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
        .select('role, support_level')
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

// ─── Merge / Deduplication ──────────────────────────────────────────────────

/**
 * Recherche de tickets candidats à la fusion (ouverts uniquement).
 * Exclut le ticket courant.
 */
export async function searchMergeCandidates(currentTicketId: string, query: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    if (!query || query.trim().length < 2) return { tickets: [] }

    const closedStatuses = ['ferme']
    const term = `%${query.trim()}%`

    // Recherche par titre
    const { data: byTitle } = await supabase
        .from('tickets')
        .select('id, title, status, priority, category, created_at')
        .ilike('title', term)
        .not('id', 'eq', currentTicketId)
        .not('status', 'in', `(${closedStatuses.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(10)

    // Recherche par ID partiel (si la query ressemble à un nombre)
    let byId: typeof byTitle = []
    if (/^\d+/.test(query.trim())) {
        const { data } = await supabase
            .from('tickets')
            .select('id, title, status, priority, category, created_at')
            .ilike('id', term)
            .not('id', 'eq', currentTicketId)
            .not('status', 'in', `(${closedStatuses.join(',')})`)
            .limit(5)
        byId = data || []
    }

    // Dédupliquer
    const map = new Map<string, any>()
    for (const t of [...(byTitle || []), ...byId]) map.set(t.id, t)

    return { tickets: [...map.values()].slice(0, 10) }
}

/**
 * Fusionne un ticket doublon dans un ticket principal.
 * - Ajoute un commentaire de liaison sur le ticket principal
 * - Ajoute un commentaire de fermeture sur le doublon
 * - Ferme le ticket doublon (status → 'ferme')
 */
export async function mergeTickets(primaryId: string, duplicateId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non authentifié' }

    // Vérifier le rôle — seuls N1+ et ADMIN peuvent fusionner
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, support_level')
        .eq('id', user.id)
        .single()

    const allowedRoles = ['N1', 'N2', 'N3', 'N4', 'ADMIN']
    if (!profile || !allowedRoles.includes(profile.role)) {
        return { error: 'Permissions insuffisantes pour fusionner des tickets' }
    }

    // Vérifier que les deux tickets existent et que le doublon n'est pas déjà fermé
    const [{ data: primary }, { data: duplicate }] = await Promise.all([
        supabase.from('tickets').select('id, title, status').eq('id', primaryId).single(),
        supabase.from('tickets').select('id, title, status').eq('id', duplicateId).single(),
    ])

    if (!primary) return { error: 'Ticket principal introuvable' }
    if (!duplicate) return { error: 'Ticket doublon introuvable' }
    if (duplicate.status === 'ferme') return { error: 'Le ticket doublon est déjà fermé' }

    const shortPrimary = primaryId.slice(0, 8)
    const shortDuplicate = duplicateId.slice(0, 8)

    // Commentaire sur le ticket principal
    const { error: errPrimary } = await supabase.from('ticket_comments').insert({
        ticket_id: primaryId,
        author_id: user.id,
        content: `🔗 **Fusion :** Le ticket #${shortDuplicate} ("${duplicate.title}") a été marqué comme doublon et fusionné ici.`,
        is_internal: true,
    })
    if (errPrimary) return { error: 'Impossible d\'ajouter le commentaire au ticket principal' }

    // Commentaire sur le doublon
    const { error: errDuplicate } = await supabase.from('ticket_comments').insert({
        ticket_id: duplicateId,
        author_id: user.id,
        content: `🔒 **Fermé (Doublon) :** Ce ticket a été fusionné avec le ticket #${shortPrimary} ("${primary.title}").`,
        is_internal: true,
    })
    if (errDuplicate) return { error: 'Impossible d\'ajouter le commentaire au ticket doublon' }

    // Fermer le doublon
    const { error: errClose } = await supabase
        .from('tickets')
        .update({ status: 'ferme' })
        .eq('id', duplicateId)

    if (errClose) return { error: 'Impossible de fermer le ticket doublon' }

    revalidatePath(`/tickets/${primaryId}`)
    revalidatePath(`/tickets/${duplicateId}`)
    revalidatePath('/tickets')

    return {
        success: true,
        message: `Ticket #${shortDuplicate} fusionné dans #${shortPrimary}`,
    }
}
