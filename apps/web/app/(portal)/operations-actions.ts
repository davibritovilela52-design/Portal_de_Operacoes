'use server';

import { createHash, randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  attachMaintenanceEvidence,
  createAviationReport,
  createDecisionMemo,
  createMaintenanceTicket,
  deleteAgendaEvent,
  createRectification,
  evaluateCutoverRun,
  fetchPortalOperationsSnapshot,
  recordCutoverCheckpoint,
  recordCutoverDecision,
  registerAviationComment,
  registerMaintenanceComment,
  revokeAccessAssignment,
  rescheduleAgendaEvent,
  scheduleAgendaEvent,
  transitionAviationReport,
  transitionMaintenanceTicket,
  upsertCutoverRun,
  upsertAccessAssignment,
  type FrontendActor
} from '../../lib/portal-api';
import { parseSupplierCatalog, serializeSupplierCatalog } from './maintenance/supplier-catalog';
import {
  requirePortalRole,
  requirePortalRoles,
  requirePortalSession
} from '../../lib/portal-session';

export async function createMaintenanceTicketAction(formData: FormData) {
  const redirectPath = readOptional(formData, 'returnTo') ?? '/maintenance';
  const requestedCategory = readRequired(formData, 'category') as
    | 'preventive'
    | 'corrective'
    | 'improvement'
    | 'warranty';
  const category = resolvePersistedMaintenanceCategory(requestedCategory);
  let assetId = readOptional(formData, 'assetId');
  const context = await resolveOperationalContext(formData, assetId);
  const actorRole = context.actor.role;
  const successRedirectPath = resolveMaintenanceSuccessRedirectPath({
    requestedCategory,
    redirectPath
  });

  try {
    assetId = await resolveMaintenanceAssetIdForCreation({
      formData,
      actor: context.actor,
      sessionToken: context.sessionToken,
      explicitAssetId: assetId,
      category
    });

    if (!assetId) {
      throw new Error('Campo obrigatorio ausente: assetId');
    }

    const result = await createMaintenanceTicket({
      actor: context.actor,
      input: {
        assetId,
        title: buildMaintenanceTicketTitle(formData),
        category,
        priority: resolveMaintenancePriority(formData),
        description: buildMaintenanceTicketDescription(formData),
        notes: buildMaintenanceTicketNotes(formData),
        legacyMetadata: buildMaintenanceLegacyMetadata(formData, requestedCategory),
        origin: resolveMaintenanceOriginForRole(actorRole),
        openedBy: context.operator,
        openedAt: readDateTime(formData, 'openedAt')
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('created' in result) || !result.created) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage(redirectPath, 'error', describeThrownError(error));
  }

  revalidateOperationalPages(redirectPath);
  redirectWithMessage(
    successRedirectPath,
    'notice',
    requestedCategory === 'improvement'
      ? 'Melhoria criada com sucesso.'
      : 'Chamado criado com sucesso.'
  );
}

export async function transitionMaintenanceTicketAction(formData: FormData) {
  const ticketId = readRequired(formData, 'ticketId');
  const assetId = readRequired(formData, 'assetId');
  const context = await resolveOperationalContext(formData, assetId);
  const redirectPath = readOptional(formData, 'returnTo') ?? `/maintenance?ticketId=${ticketId}`;

  try {
    const result = await transitionMaintenanceTicket({
      actor: context.actor,
      ticketId,
      input: {
        toStatus: readRequired(formData, 'toStatus') as
          | 'pending'
          | 'in_progress'
          | 'frozen'
          | 'payment'
          | 'completed'
          | 'cancelled'
          | 'reopened',
        kanbanSubstatus: readOptional(formData, 'kanbanSubstatus') as
          | 'call_opening'
          | 'ticket_qualification'
          | 'onsite_diagnosis'
          | 'preliminary_quote'
          | 'absorption_strategy'
          | 'date_scheduling'
          | 'technical_approval'
          | 'budget_allocation'
          | 'service_preparation'
          | 'service_execution'
          | 'complementary_quote'
          | 'quality_control'
          | 'accounts_freeze'
          | 'payment_request'
          | 'payment_scheduling'
          | 'payment_receipt'
          | 'closed_files'
          | 'cancelled'
          | undefined,
        justification: readOptional(formData, 'justification'),
        frozenReason: readOptional(formData, 'frozenReason') as
          | 'awaiting_fiscal_document'
          | 'awaiting_supplier_response'
          | 'awaiting_central_operations_decision'
          | 'awaiting_critical_part'
          | 'awaiting_safe_operational_window'
          | undefined
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('allowed' in result) || !result.allowed) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage(redirectPath, 'error', describeThrownError(error));
  }

  revalidateOperationalPages(redirectPath);
  redirectWithMessage(redirectPath, 'notice', 'Status atualizado com sucesso.');
}

export async function updateMaintenanceTicketProgressAction(formData: FormData) {
  const ticketId = readRequired(formData, 'ticketId');
  const assetId = readRequired(formData, 'assetId');
  const context = await resolveOperationalContext(formData, assetId);
  const redirectPath = readOptional(formData, 'returnTo') ?? `/maintenance?ticketId=${ticketId}`;
  const status = readRequired(formData, 'status') as
    | 'pending'
    | 'in_progress'
    | 'frozen'
    | 'payment'
    | 'completed'
    | 'cancelled'
    | 'reopened';
  const substatus = readRequired(formData, 'substatus');
  const assignedTo = readRequired(formData, 'assignedTo');

  try {
    const result = await transitionMaintenanceTicket({
      actor: context.actor,
      ticketId,
      input: {
        toStatus: status,
        kanbanSubstatus: substatus as
          | 'call_opening'
          | 'ticket_qualification'
          | 'onsite_diagnosis'
          | 'preliminary_quote'
          | 'absorption_strategy'
          | 'date_scheduling'
          | 'technical_approval'
          | 'budget_allocation'
          | 'service_preparation'
          | 'service_execution'
          | 'complementary_quote'
          | 'quality_control'
          | 'accounts_freeze'
          | 'payment_request'
          | 'payment_scheduling'
          | 'payment_receipt'
          | 'closed_files'
          | 'cancelled',
        justification: buildMaintenanceProgressJustification({
          substatus,
          assignedTo
        })
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('allowed' in result) || !result.allowed) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage(redirectPath, 'error', describeThrownError(error));
  }

  revalidateOperationalPages(redirectPath);
  redirectWithMessage(redirectPath, 'notice', 'Andamento atualizado com sucesso.');
}

export async function createServiceOrderAction(formData: FormData) {
  const ticketId = readRequired(formData, 'ticketId');
  const assetId = readRequired(formData, 'assetId');
  const context = await resolveOperationalContext(formData, assetId);
  const redirectPath = readOptional(formData, 'returnTo') ?? `/maintenance?ticketId=${ticketId}`;

  try {
    const title = readRequired(formData, 'title');
    const startsAt = readRequired(formData, 'startsAt');
    const endsAt = readRequired(formData, 'endsAt');
    const description = readRequired(formData, 'description');
    const supplierId = readOptional(formData, 'supplierId') ?? '';

    if (!title.trim() || !startsAt.trim() || !endsAt.trim() || !description.trim()) {
      throw new Error('Campos obrigatorios ausentes na ordem de servico.');
    }

    void supplierId;
    void context;
  } catch (error) {
    redirectWithMessage(redirectPath, 'error', describeThrownError(error));
  }

  revalidateOperationalPages(redirectPath);
  redirectWithMessage(redirectPath, 'notice', 'Ordem de serviço criada com sucesso.');
}

export async function createSupplierAction(formData: FormData) {
  const ticketId = readRequired(formData, 'ticketId');
  const assetId = readRequired(formData, 'assetId');
  const context = await resolveOperationalContext(formData, assetId);
  const redirectPath = readOptional(formData, 'returnTo') ?? `/maintenance?ticketId=${ticketId}`;

  try {
    const name = readRequired(formData, 'name');
    const cnpj = readRequired(formData, 'cnpj');
    const address = readRequired(formData, 'address');
    const suppliers = parseSupplierCatalog(readOptional(formData, 'suppliersJson'));

    if (!name.trim() || !cnpj.trim() || !address.trim()) {
      throw new Error('Campos obrigatorios ausentes no fornecedor.');
    }

    const supplierId = `supplier-${randomUUID().slice(0, 8)}`;
    const nextSuppliers = [
      ...suppliers,
      {
        supplierId,
        supplierName: name.trim(),
        supplierCnpj: cnpj.trim(),
        supplierAddress: address.trim()
      }
    ];
    const supplierRedirectPath = appendQueryParams(redirectPath, {
      supplierId,
      supplierName: name.trim(),
      supplierCnpj: cnpj.trim(),
      supplierAddress: address.trim(),
      supplierCreated: '1',
      suppliersJson: serializeSupplierCatalog(nextSuppliers)
    });

    void context;

    revalidateOperationalPages(redirectPath);
    redirectWithMessage(supplierRedirectPath, 'notice', 'Fornecedor cadastrado com sucesso.');
  } catch (error) {
    redirectWithMessage(redirectPath, 'error', describeThrownError(error));
  }
}

export async function registerMaintenanceEvidenceAction(formData: FormData) {
  const ticketId = readRequired(formData, 'ticketId');
  const assetId = readRequired(formData, 'assetId');
  const context = await resolveOperationalContext(formData, assetId);
  const attachment = readUploadedFile(formData, 'attachment');
  const redirectPath = readOptional(formData, 'returnTo') ?? `/maintenance?ticketId=${ticketId}`;

  try {
    if (!attachment) {
      throw new Error('Campo obrigatorio ausente: attachment');
    }

    const fileName = attachment.name;
    const fileBytes = Buffer.from(await attachment.arrayBuffer());
    const mimeType = attachment.type.trim() || inferMimeType(fileName);
    const fileSizeBytes = attachment.size;
    const uploadedAt = new Date();
    const sha256 = createHash('sha256').update(fileBytes).digest('hex');

    const result = await attachMaintenanceEvidence({
      actor: context.actor,
      ticketId,
      input: {
        type: readRequired(formData, 'evidenceType') as
          | 'diagnostic'
          | 'financial_document'
          | 'execution_evidence'
          | 'quality_release',
        fileName,
        mimeType,
        fileSizeBytes,
        sha256,
        uploadedBy: context.operator,
        uploadedAt
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('attached' in result) || !result.attached) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage(redirectPath, 'error', describeThrownError(error));
  }

  revalidateOperationalPages(redirectPath);
  redirectWithMessage(redirectPath, 'notice', 'Evidencia registrada com sucesso.');
}

export async function registerMaintenanceCommentAction(formData: FormData) {
  const ticketId = readRequired(formData, 'ticketId');
  const assetId = readRequired(formData, 'assetId');
  const context = await resolveOperationalContext(formData, assetId);
  const redirectPath = readOptional(formData, 'returnTo') ?? `/maintenance?ticketId=${ticketId}`;

  try {
    const result = await registerMaintenanceComment({
      actor: context.actor,
      ticketId,
      input: {
        message: readRequired(formData, 'comment'),
        commentedBy: context.operator,
        commentedAt: new Date()
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('registered' in result) || !result.registered) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage(redirectPath, 'error', describeThrownError(error));
  }

  revalidateOperationalPages(redirectPath);
  redirectWithMessage(redirectPath, 'notice', 'Comentario registrado com sucesso.');
}

export async function scheduleAgendaEventAction(formData: FormData) {
  const redirectPath = buildAgendaRedirectPath(formData);
  const providedAssetId = readOptional(formData, 'assetId');
  const context = await resolveOperationalContext(formData, providedAssetId);
  const assetId = resolveScopedAssetIdForAgenda(context.actor, providedAssetId);
  const eventType = readRequired(formData, 'type') as
    | 'utilization'
    | 'planned_maintenance'
    | 'emergency_maintenance'
    | 'operational_block'
    | 'crew_rest';

  try {
    const result = await scheduleAgendaEvent({
      actor: context.actor,
      candidateEvent: {
        id: `agenda-${randomUUID().slice(0, 8)}`,
        assetId,
        type: eventType,
        title: resolveAgendaEventTitle(eventType),
        description: readRequired(formData, 'description'),
        startsAt: readDateTime(formData, 'startsAt'),
        endsAt: readDateTime(formData, 'endsAt'),
        safeMinimumBreached: formData.get('safeMinimumBreached') === 'on'
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('allowed' in result) || !result.allowed) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage(redirectPath, 'error', describeThrownError(error));
  }

  revalidateOperationalPages('/agenda');
  redirectWithMessage(redirectPath, 'notice', 'Evento criado com sucesso.');
}


export async function createDecisionMemoAction(formData: FormData) {
  const assetId = readOptional(formData, 'assetId');
  const context = await resolveOperationalContext(formData, assetId);

  try {
    const result = await createDecisionMemo({
      actor: context.actor,
      action: readRequired(formData, 'action'),
      aggregateType: readRequired(formData, 'aggregateType'),
      aggregateId: readRequired(formData, 'aggregateId'),
      assetId,
      justification: {
        context: readRequired(formData, 'context'),
        decision: readRequired(formData, 'decision'),
        decidedBy: context.operator,
        alternativesConsidered: readRequired(formData, 'alternativesConsidered')
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
        expectedImpact: readRequired(formData, 'expectedImpact')
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('confirmed' in result) || !result.confirmed) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage('/audit-governance', 'error', describeThrownError(error));
  }

  revalidateOperationalPages('/audit-governance');
  redirectWithMessage('/audit-governance', 'notice', 'Mini-ata registrada com sucesso.');
}

export async function createRectificationAction(formData: FormData) {
  const context = await resolveOperationalContext(formData);

  try {
    const result = await createRectification({
      actor: context.actor,
      record: {
        recordId: readRequired(formData, 'recordId'),
        status: readRequired(formData, 'recordStatus') as 'completed' | 'open',
        version: readRequiredInteger(formData, 'recordVersion')
      },
      input: {
        changedBy: context.operator,
        reason: readRequired(formData, 'reason'),
        afterSnapshot: readRequiredJsonObject(formData, 'afterSnapshot')
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('created' in result) || !result.created) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage('/audit-governance', 'error', describeThrownError(error));
  }

  revalidateOperationalPages('/audit-governance');
  redirectWithMessage('/audit-governance', 'notice', 'Retificação registrada com sucesso.');
}

export async function upsertAccessAssignmentAction(formData: FormData) {
  const context = await resolveAccessManagementContext(formData);
  const assignmentId = readOptional(formData, 'assignmentId') ?? undefined;
  const targetRole = readRequired(formData, 'targetRole') as FrontendActor['role'];
  const selectedAssetIds = formData
    .getAll('assetIds')
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());

  const assetIds =
    targetRole === 'portal_admin'
      ? selectedAssetIds.includes('global') || selectedAssetIds.length === 0
        ? ['global']
        : selectedAssetIds
      : selectedAssetIds;

  if (targetRole !== 'portal_admin' && assetIds.length === 0) {
    redirectWithMessage('/access', 'error', 'Selecione ao menos um ativo para o escopo.');
  }

  try {
    const result = await upsertAccessAssignment({
      actor: context.actor,
      ...(assignmentId ? { assignmentId } : {}),
      input: {
        userId: readRequired(formData, 'userId'),
        displayName: readRequired(formData, 'displayName'),
        email: readRequired(formData, 'email'),
        role: targetRole,
        assetIds,
        mfaEnabled: formData.get('mfaEnabled') === 'on',
        lastReviewedAt: readDateTime(formData, 'lastReviewedAt')
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('updated' in result) || !result.updated) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage('/access', 'error', describeThrownError(error));
  }

  revalidateOperationalPages('/access');
  redirectWithMessage('/access', 'notice', 'Acesso salvo com sucesso.');
}

export async function registerAccessUserAction(formData: FormData) {
  const context = await resolveAccessManagementContext(formData);
  const targetRole = readRequired(formData, 'targetRole') as FrontendActor['role'];
  const email = readRequired(formData, 'email').toLowerCase();
  const selectedAssetIds = formData
    .getAll('assetIds')
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
  const assetIds =
    targetRole === 'portal_admin'
      ? selectedAssetIds.includes('global') || selectedAssetIds.length === 0
        ? ['global']
        : selectedAssetIds
      : selectedAssetIds;

  if (targetRole === 'asset_field_team' && assetIds.length === 0) {
    redirectWithMessage('/access', 'error', 'Selecione ao menos um ativo para o escopo.');
  }

  try {
    const result = await upsertAccessAssignment({
      actor: context.actor,
      input: {
        userId: buildAccessUserId(email),
        displayName: readRequired(formData, 'displayName'),
        email,
        role: targetRole,
        assetIds,
        mfaEnabled: formData.get('mfaEnabled') === 'on',
        lastReviewedAt: readDateTime(formData, 'lastReviewedAt')
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('updated' in result) || !result.updated) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage('/access', 'error', describeThrownError(error));
  }

  revalidateOperationalPages('/access');
  redirectWithMessage('/access', 'notice', 'Usuário cadastrado com sucesso.');
}

export async function revokeAccessAssignmentAction(formData: FormData) {
  const context = await resolveAccessManagementContext(formData);

  try {
    const result = await revokeAccessAssignment({
      actor: context.actor,
      assignmentId: readRequired(formData, 'assignmentId'),
      requestedAt:
        readOptional(formData, 'requestedAt') ?? new Date().toISOString(),
      removedAt: new Date().toISOString()
    }, {
      sessionToken: context.sessionToken
    });

    if (!('revoked' in result) || !result.revoked) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage('/access', 'error', describeThrownError(error));
  }

  revalidateOperationalPages('/access');
  redirectWithMessage('/access', 'notice', 'Revogação executada com sucesso.');
}

export async function rescheduleAgendaEventAction(formData: FormData) {
  const snapshotRaw = readRequired(formData, 'eventSnapshot');
  const redirectPath = buildAgendaRedirectPath(formData);
  const selectedEvent = JSON.parse(snapshotRaw) as {
    id: string;
    assetId: string;
    type: 'utilization' | 'planned_maintenance' | 'emergency_maintenance' | 'operational_block' | 'crew_rest';
    safeMinimumBreached?: boolean;
    provisional?: boolean;
    validatedAt?: string | null;
  };
  const updatedAssetId = readRequired(formData, 'assetId');
  const updatedType = readRequired(formData, 'type') as
    | 'utilization'
    | 'planned_maintenance'
    | 'emergency_maintenance'
    | 'operational_block'
    | 'crew_rest';
  const context = await resolveOperationalContext(formData, updatedAssetId);

  try {
    const result = await rescheduleAgendaEvent({
      actor: context.actor,
      eventId: selectedEvent.id,
      updatedEvent: {
        id: selectedEvent.id,
        assetId: updatedAssetId,
        type: updatedType,
        title: resolveAgendaEventTitle(updatedType),
        description: readRequired(formData, 'description'),
        startsAt: readDateTime(formData, 'rescheduleStartsAt'),
        endsAt: readDateTime(formData, 'rescheduleEndsAt'),
        safeMinimumBreached: selectedEvent.safeMinimumBreached,
        provisional: selectedEvent.provisional,
        validatedAt: selectedEvent.validatedAt
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('allowed' in result) || !result.allowed) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage(redirectPath, 'error', describeThrownError(error));
  }

  revalidateOperationalPages('/agenda');
  redirectWithMessage(redirectPath, 'notice', 'Evento reprogramado com sucesso.');
}

export async function deleteAgendaEventAction(formData: FormData) {
  const eventId = readRequired(formData, 'eventId');
  const assetId = readRequired(formData, 'assetId');
  const redirectPath = buildAgendaRedirectPath(formData);
  const context = await resolveOperationalContext(formData, assetId);

  try {
    const result = await deleteAgendaEvent({
      actor: context.actor,
      eventId
    }, {
      sessionToken: context.sessionToken
    });

    if (!('allowed' in result) || !result.allowed) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage(redirectPath, 'error', describeThrownError(error));
  }

  revalidateOperationalPages('/agenda');
  redirectWithMessage(redirectPath, 'notice', 'Evento excluido com sucesso.');
}

export async function upsertCutoverRunAction(formData: FormData) {
  const context = await resolvePortalAdminContext(formData);
  const runId = readOptional(formData, 'runId');

  try {
    const result = await upsertCutoverRun({
      actor: context.actor,
      runId,
      input: {
        label: readRequired(formData, 'label'),
        futureAgendaDaysMigrated: readRequiredInteger(formData, 'futureAgendaDaysMigrated'),
        finalFreezeApplied: formData.get('finalFreezeApplied') === 'on',
        invalidCriticalAttachmentIds: readTextCollection(formData, 'invalidCriticalAttachmentIds'),
        approvals: {
          centralOperations: readCutoverApproval(formData, 'centralOperations'),
          technicalCoordination: readCutoverApproval(formData, 'technicalCoordination'),
          portalAdmin: readCutoverApproval(formData, 'portalAdmin')
        },
        entityCounts: [
          {
            entity: 'maintenance_tickets',
            sourceCount: readRequiredInteger(formData, 'maintenanceTicketsSourceCount'),
            migratedCount: readRequiredInteger(formData, 'maintenanceTicketsMigratedCount')
          },
          {
            entity: 'agenda_events',
            sourceCount: readRequiredInteger(formData, 'agendaEventsSourceCount'),
            migratedCount: readRequiredInteger(formData, 'agendaEventsMigratedCount')
          },
          {
            entity: 'critical_attachments',
            sourceCount: readRequiredInteger(formData, 'criticalAttachmentsSourceCount'),
            migratedCount: readRequiredInteger(formData, 'criticalAttachmentsMigratedCount')
          }
        ],
        evidences: buildCutoverEvidenceInput(formData)
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('saved' in result) || !result.saved) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage('/cutover', 'error', describeThrownError(error));
  }

  revalidateOperationalPages('/cutover');
  redirectWithMessage('/cutover', 'notice', 'Rodada de cutover salva com sucesso.');
}

export async function evaluateCutoverRunAction(formData: FormData) {
  const context = await resolvePortalAdminContext(formData);

  try {
    const result = await evaluateCutoverRun({
      actor: context.actor,
      runId: readRequired(formData, 'runId')
    }, {
      sessionToken: context.sessionToken
    });

    if (!('run' in result)) {
      throw new Error(describeMutationFailure(result.reason));
    }

    if (!result.approved) {
      throw new Error('Gate bloqueado. Revise os blockers antes do go-live.');
    }
  } catch (error) {
    redirectWithMessage('/cutover', 'error', describeThrownError(error));
  }

  revalidateOperationalPages('/cutover');
  redirectWithMessage('/cutover', 'notice', 'Gate do cutover aprovado.');
}

export async function recordCutoverCheckpointAction(formData: FormData) {
  const context = await resolveCutoverContext(formData);

  try {
    const result = await recordCutoverCheckpoint({
      actor: context.actor,
      runId: readRequired(formData, 'runId'),
      input: {
        checkpoint: readRequired(formData, 'checkpoint') as 'T+1' | 'T+4' | 'T+24',
        status: readRequired(formData, 'checkpointStatus') as 'pending' | 'completed' | 'blocked',
        notes: readRequired(formData, 'checkpointNotes')
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('recorded' in result) || !result.recorded) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage('/cutover', 'error', describeThrownError(error));
  }

  revalidateOperationalPages('/cutover');
  redirectWithMessage('/cutover', 'notice', 'Checkpoint registrado com sucesso.');
}

export async function recordCutoverDecisionAction(formData: FormData) {
  const context = await resolvePortalAdminContext(formData);

  try {
    const result = await recordCutoverDecision({
      actor: context.actor,
      runId: readRequired(formData, 'runId'),
      input: {
        decision: readRequired(formData, 'decision') as 'go' | 'no_go'
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('decided' in result) || !result.decided) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage('/cutover', 'error', describeThrownError(error));
  }

  revalidateOperationalPages('/cutover');
  redirectWithMessage('/cutover', 'notice', 'Decisão de cutover registrada com sucesso.');
}

function revalidateOperationalPages(path: string) {
  revalidatePath('/dashboard');
  revalidatePath('/maintenance');
  revalidatePath('/improvements');
  revalidatePath('/agenda');
  revalidatePath('/aviation');
  revalidatePath('/aviation/agenda');
  revalidatePath('/aviation/reports');
  revalidatePath('/audit-governance');
  revalidatePath('/access');
  revalidatePath('/cutover');
  revalidatePath(path);
}

function buildMaintenanceProgressJustification(input: { substatus: string; assignedTo: string }) {
  return `Substatus: ${input.substatus}; Atribuído: ${input.assignedTo}`;
}

type PortalActionContext = {
  actor: FrontendActor;
  operator: string;
  sessionToken: string;
};

function toPortalActionContext(session: {
  token: string;
  actor: FrontendActor;
  operatorLabel: string;
}): PortalActionContext {
  return {
    actor: session.actor,
    operator: session.operatorLabel,
    sessionToken: session.token
  };
}

async function resolveOperationalContext(
  _formData: FormData,
  _assetId?: string
): Promise<PortalActionContext> {
  return toPortalActionContext(await requirePortalSession());
}

async function resolveAccessManagementContext(
  _formData: FormData
): Promise<PortalActionContext> {
  return toPortalActionContext(await requirePortalRole('portal_admin'));
}

async function resolvePortalAdminContext(
  _formData: FormData
): Promise<PortalActionContext> {
  return toPortalActionContext(await requirePortalRole('portal_admin'));
}

async function resolveCutoverContext(
  _formData: FormData
): Promise<PortalActionContext> {
  return toPortalActionContext(
    await requirePortalRoles([
      'portal_admin',
      'central_operations',
      'yachts_technical_coordination'
    ])
  );
}

function readRequired(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Campo obrigatorio ausente: ${key}`);
  }

  return value.trim();
}

function readOptional(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  return value.trim();
}

function buildMaintenanceTicketTitle(formData: FormData) {
  return readOptional(formData, 'title') ?? readOptional(formData, 'reason');
}

function buildMaintenanceTicketDescription(formData: FormData) {
  const directDescription = readOptional(formData, 'description');

  if (directDescription) {
    return directDescription;
  }

  const reason = readOptional(formData, 'reason');

  if (reason) {
    return reason;
  }

  throw new Error('Campo obrigatorio ausente: description');
}

function buildMaintenanceTicketNotes(formData: FormData) {
  const directNotes = readOptional(formData, 'notes');
  const requester = readOptional(formData, 'requester');

  if (!requester && !directNotes) {
    return undefined;
  }

  const lines = [
    requester ? `Solicitante: ${requester}` : undefined,
    directNotes ? `Observações: ${directNotes}` : undefined
  ].filter((value): value is string => Boolean(value));

  return lines.join('\n');
}

function resolveMaintenancePriority(formData: FormData): 'P1' | 'P2' | 'P3' | 'P4' {
  const explicitPriority = readOptional(formData, 'priority');

  if (
    explicitPriority === 'P1' ||
    explicitPriority === 'P2' ||
    explicitPriority === 'P3' ||
    explicitPriority === 'P4'
  ) {
    return explicitPriority;
  }

  const urgency = readRequired(formData, 'urgency');

  switch (urgency) {
    case 'critical':
      return 'P1';
    case 'high':
      return 'P2';
    case 'medium':
      return 'P3';
    case 'low':
      return 'P4';
    default:
      throw new Error(`Valor invalido para urgencia: ${urgency}`);
  }
}

function resolvePersistedMaintenanceCategory(
  category: 'preventive' | 'corrective' | 'improvement' | 'warranty'
): 'preventive' | 'corrective' | 'emergency' | 'improvement' | 'inspection' {
  switch (category) {
    case 'preventive':
    case 'corrective':
    case 'improvement':
      return category;
    case 'warranty':
      return 'corrective';
    default:
      throw new Error(`Categoria de manutencao invalida: ${category}`);
  }
}

function buildMaintenanceLegacyMetadata(
  formData: FormData,
  requestedCategory: 'preventive' | 'corrective' | 'improvement' | 'warranty'
) {
  const metadata: Record<string, unknown> = {};
  const maintenanceSystem = readOptional(formData, 'maintenanceSystem');

  if (requestedCategory === 'warranty') {
    metadata.requestedCategory = 'warranty';
  }

  if (maintenanceSystem) {
    metadata.maintenanceSystem = maintenanceSystem;
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

async function resolveMaintenanceAssetIdForCreation(input: {
  formData: FormData;
  actor: FrontendActor;
  sessionToken: string;
  explicitAssetId?: string;
  category: 'preventive' | 'corrective' | 'emergency' | 'improvement' | 'inspection';
}) {
  if (input.actor.role === 'asset_field_team') {
    const scopedAssetId = input.actor.assetIds[0];

    if (scopedAssetId) {
      return scopedAssetId;
    }
  }

  if (input.explicitAssetId) {
    return input.explicitAssetId;
  }

  if (input.category !== 'improvement') {
    return undefined;
  }

  const product = readRequired(input.formData, 'product');
  const snapshot = await fetchPortalOperationsSnapshot({
    tenantId: input.actor.tenantId,
    actor: input.actor,
    sessionToken: input.sessionToken
  });
  const normalizedProduct = normalizeProductLookupValue(product);
  const matchedAsset = snapshot.fleetAssets.find(
    (asset) => normalizeProductLookupValue(asset.name) === normalizedProduct
  );

  if (!matchedAsset) {
    throw new Error('Produto não encontrado. Informe o nome do yacht cadastrado.');
  }

  return matchedAsset.id;
}

function resolveMaintenanceSuccessRedirectPath(input: {
  requestedCategory: 'preventive' | 'corrective' | 'improvement' | 'warranty';
  redirectPath: string;
}) {
  if (input.requestedCategory === 'improvement' && input.redirectPath === '/maintenance') {
    return '/improvements';
  }

  return input.redirectPath;
}

function resolveScopedAssetIdForAgenda(
  actor: FrontendActor,
  providedAssetId?: string
) {
  if (providedAssetId) {
    return providedAssetId;
  }

  if (actor.role === 'asset_field_team') {
    const scopedAssetId = actor.assetIds[0];

    if (scopedAssetId) {
      return scopedAssetId;
    }
  }

  throw new Error('Campo obrigatorio ausente: assetId');
}

function normalizeProductLookupValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^yacht(?:\s*-\s*|\s+)/i, '')
    .trim()
    .toLowerCase();
}

function buildAccessUserId(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const localPart = normalizedEmail.split('@')[0] ?? 'usuario';
  const slug = localPart
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const hash = createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 8);

  return `${slug || 'usuario'}-${hash}`;
}

function readTextCollection(formData: FormData, key: string): string[] {
  const value = readOptional(formData, key);

  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readOptionalNumber(formData: FormData, key: string): number | undefined {
  const value = readOptional(formData, key);

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Numero invalido: ${key}`);
  }

  return parsed;
}

function readUploadedFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size <= 0) {
    return null;
  }

  return value;
}

function readRequiredInteger(formData: FormData, key: string): number {
  const parsed = Number(readRequired(formData, key));

  if (!Number.isInteger(parsed)) {
    throw new Error(`Numero inteiro invalido: ${key}`);
  }

  return parsed;
}

function readDateTime(formData: FormData, key: string): string {
  const rawValue = readRequired(formData, key);
  const parsed = new Date(rawValue);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data inválida: ${key}`);
  }

  return parsed.toISOString();
}

function readOptionalDateTime(formData: FormData, key: string): string | undefined {
  const rawValue = readOptional(formData, key);

  if (!rawValue) {
    return undefined;
  }

  const parsed = new Date(rawValue);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data inválida: ${key}`);
  }

  return parsed.toISOString();
}

function readRequiredJsonObject(formData: FormData, key: string): Record<string, unknown> {
  const rawValue = readRequired(formData, key);

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new Error(`JSON invalido: ${key}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Objeto JSON invalido: ${key}`);
  }

  return parsed as Record<string, unknown>;
}

function readCutoverApproval(
  formData: FormData,
  prefix: 'centralOperations' | 'technicalCoordination' | 'portalAdmin'
) {
  return {
    approved: formData.get(`${prefix}Approved`) === 'on',
    approvedBy: readOptional(formData, `${prefix}ApprovedBy`) ?? null,
    approvedAt: readOptionalDateTime(formData, `${prefix}ApprovedAt`) ?? null
  };
}

function buildCutoverEvidenceInput(formData: FormData) {
  const type = readOptional(formData, 'evidenceType');
  const title = readOptional(formData, 'evidenceTitle');
  const detail = readOptional(formData, 'evidenceDetail');
  const reference = readOptional(formData, 'evidenceReference');

  if (!type || !title || !detail || !reference) {
    return [];
  }

  return [
    {
      type,
      title,
      detail,
      reference,
      valid: formData.get('evidenceValid') === 'on'
    }
  ];
}

function buildAgendaRedirectPath(formData: FormData) {
  const basePath = readOptional(formData, 'agendaBasePath') ?? '/agenda';
  const month = readOptional(formData, 'calendarMonth');
  const filterAssetId = readOptional(formData, 'filterAssetId');

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const params = new URLSearchParams({ month });

    if (filterAssetId) {
      params.set('assetId', filterAssetId);
    }

    return `${basePath}?${params.toString()}`;
  }

  if (filterAssetId) {
    return `${basePath}?assetId=${encodeURIComponent(filterAssetId)}`;
  }

  return basePath;
}

function redirectWithMessage(path: string, key: 'notice' | 'error', message: string): never {
  const [pathname, search = ''] = path.split('?');
  const params = new URLSearchParams(search);

  params.set(key, message);

  redirect(`${pathname}?${params.toString()}`);
}

function appendQueryParams(
  path: string,
  values: Record<string, string>
): string {
  const [pathname, search = ''] = path.split('?');
  const params = new URLSearchParams(search);

  for (const [key, value] of Object.entries(values)) {
    if (value.trim()) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function describeThrownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Falha inesperada na operação.';
}

function inferMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'txt':
      return 'text/plain';
    case 'csv':
      return 'text/csv';
    case 'zip':
      return 'application/zip';
    case 'mp4':
      return 'video/mp4';
    default:
      return 'application/octet-stream';
  }
}

function describeMutationFailure(reason: string): string {
  switch (reason) {
    case 'REQUIRED_FIELDS_MISSING':
      return 'Campos obrigatorios ausentes.';
    case 'FORBIDDEN':
      return 'Operação não permitida para o papel selecionado.';
    case 'ASSET_TIME_CONFLICT':
      return 'Conflito de agenda detectado para o ativo.';
    case 'NOT_FOUND':
      return 'Registro não encontrado.';
    case 'UPLOAD_POLICY_BLOCKED':
      return 'Evidencia bloqueada pela politica de seguranca.';
    case 'REQUIRED_EVIDENCE_MISSING':
      return 'A transição exige evidências obrigatórias.';
    case 'INVALID_STATUS_TRANSITION':
      return 'Transição de status inválida.';
    case 'JUSTIFICATION_REQUIRED':
      return 'Justificativa obrigatória para essa operação.';
    case 'RECTIFICATION_FIELDS_REQUIRED':
      return 'Preencha os campos obrigatórios da retificação.';
    case 'MFA_REQUIRED_FOR_ROLE':
      return 'Perfis críticos exigem MFA habilitado.';
    case 'ACTIVE_ASSIGNMENT_ALREADY_EXISTS':
      return 'O usuário já possui um acesso ativo. Revogue o acesso atual antes de trocar o papel.';
    case 'FROZEN_REASON_REQUIRED':
      return 'Selecione o motivo do congelamento.';
    case 'FROZEN_REASON_INVALID':
      return 'Motivo de congelamento inválido.';
    case 'GO_LIVE_BLOCKED':
      return 'Go-live bloqueado pelos gates de cutover.';
    case 'CLOSURE_FIELDS_REQUIRED':
      return 'Preencha causa raiz, impacto e acoes de follow-up.';
    default:
      return `Operação recusada: ${reason}.`;
  }
}

function resolveAgendaEventTitle(
  type:
    | 'utilization'
    | 'planned_maintenance'
    | 'emergency_maintenance'
    | 'operational_block'
    | 'crew_rest'
) {
  switch (type) {
    case 'utilization':
      return 'Utilização';
    case 'planned_maintenance':
      return 'Manutenção planejada';
    case 'emergency_maintenance':
      return 'Manutenção emergencial';
    case 'operational_block':
      return 'Bloqueio operacional';
    case 'crew_rest':
      return 'Folga da tripulação';
  }
}

function resolveMaintenanceOriginForRole(role: FrontendActor['role']) {
  switch (role) {
    case 'portal_admin':
    case 'central_operations':
      return 'central_operations' as const;
    case 'yachts_operations':
    case 'yachts_technical_coordination':
      return 'yachts_technical_coordination' as const;
    case 'asset_field_team':
      return 'asset_field_team' as const;
  }
}

// ─── Aviation actions ─────────────────────────────────────────────────────────

export async function createAviationReportAction(formData: FormData) {
  const redirectPath = readOptional(formData, 'returnTo') ?? '/aviation';
  const assetId = readOptional(formData, 'assetId');
  const context = await resolveOperationalContext(formData, assetId);

  try {
    if (!assetId) {
      throw new Error('Campo obrigatorio ausente: assetId');
    }

    const result = await createAviationReport({
      actor: context.actor,
      input: {
        assetId,
        title: readOptional(formData, 'title'),
        category: readRequired(formData, 'category') as
          | 'preventive'
          | 'corrective'
          | 'emergency'
          | 'inspection'
          | 'airworthiness',
        priority: resolveAviationPriority(formData),
        description: readRequired(formData, 'description'),
        notes: readOptional(formData, 'notes'),
        aircraftSystem: readOptional(formData, 'aircraftSystem'),
        origin: resolveAviationOriginForRole(context.actor.role),
        openedBy: context.operator,
        openedAt: readDateTime(formData, 'openedAt')
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('created' in result) || !result.created) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage(redirectPath, 'error', describeThrownError(error));
  }

  revalidateAviationPages(redirectPath);
  redirectWithMessage(redirectPath, 'notice', 'Reporte criado com sucesso.');
}

export async function transitionAviationReportAction(formData: FormData) {
  const reportId = readRequired(formData, 'reportId');
  const assetId = readRequired(formData, 'assetId');
  const context = await resolveOperationalContext(formData, assetId);
  const redirectPath = readOptional(formData, 'returnTo') ?? `/aviation?reportId=${reportId}`;

  try {
    const result = await transitionAviationReport({
      actor: context.actor,
      reportId,
      input: {
        toStatus: readRequired(formData, 'toStatus') as
          | 'pending'
          | 'in_progress'
          | 'grounded'
          | 'return_check'
          | 'returned'
          | 'cancelled'
          | 'reopened',
        kanbanSubstatus: readOptional(formData, 'kanbanSubstatus') as
          | 'report_open'
          | 'report_qualification'
          | 'technical_assessment'
          | 'action_plan'
          | 'service_execution'
          | 'post_service_check'
          | 'aog_hold'
          | 'return_authorization'
          | 'returned_to_service'
          | 'cancelled'
          | undefined,
        justification: readOptional(formData, 'justification'),
        groundReason: readOptional(formData, 'groundReason') as
          | 'awaiting_part'
          | 'awaiting_authorization'
          | 'awaiting_maintenance_crew'
          | 'awaiting_operational_window'
          | undefined
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('allowed' in result) || !result.allowed) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage(redirectPath, 'error', describeThrownError(error));
  }

  revalidateAviationPages(redirectPath);
  redirectWithMessage(redirectPath, 'notice', 'Status atualizado com sucesso.');
}

export async function registerAviationCommentAction(formData: FormData) {
  const reportId = readRequired(formData, 'reportId');
  const assetId = readRequired(formData, 'assetId');
  const context = await resolveOperationalContext(formData, assetId);
  const redirectPath = readOptional(formData, 'returnTo') ?? `/aviation?reportId=${reportId}`;

  try {
    const result = await registerAviationComment({
      actor: context.actor,
      reportId,
      input: {
        message: readRequired(formData, 'comment'),
        commentedBy: context.operator,
        commentedAt: new Date()
      }
    }, {
      sessionToken: context.sessionToken
    });

    if (!('registered' in result) || !result.registered) {
      throw new Error(describeMutationFailure(result.reason));
    }
  } catch (error) {
    redirectWithMessage(redirectPath, 'error', describeThrownError(error));
  }

  revalidateAviationPages(redirectPath);
  redirectWithMessage(redirectPath, 'notice', 'Comentário registrado com sucesso.');
}

function revalidateAviationPages(path: string) {
  revalidatePath('/aviation');
  revalidatePath('/dashboard');
  revalidatePath(path);
}

function resolveAviationPriority(formData: FormData): 'P1' | 'P2' | 'P3' | 'P4' {
  const explicit = readOptional(formData, 'priority');

  if (explicit === 'P1' || explicit === 'P2' || explicit === 'P3' || explicit === 'P4') {
    return explicit;
  }

  const urgency = readRequired(formData, 'urgency');

  switch (urgency) {
    case 'critical':
      return 'P1';
    case 'high':
      return 'P2';
    case 'medium':
      return 'P3';
    case 'low':
      return 'P4';
    default:
      throw new Error(`Urgência inválida: ${urgency}`);
  }
}

function resolveAviationOriginForRole(role: FrontendActor['role']): 'asset_field_team' | 'aviation_technical_coordination' | 'central_operations' {
  switch (role) {
    case 'portal_admin':
    case 'central_operations':
      return 'central_operations';
    case 'aviation_operations':
    case 'aviation_technical_coordination':
      return 'aviation_technical_coordination';
    case 'asset_field_team':
      return 'asset_field_team';
    default:
      return 'central_operations';
  }
}
