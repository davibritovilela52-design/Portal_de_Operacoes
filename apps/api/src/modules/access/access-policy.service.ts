import { Injectable, Optional } from '@nestjs/common';

import { ObservabilityMetricsService } from '../observability/observability-metrics.service.js';

export type PortalRole =
  | 'portal_admin'
  | 'central_operations'
  | 'yachts_operations'
  | 'yachts_technical_coordination'
  | 'aviation_operations'
  | 'aviation_technical_coordination'
  | 'real_estate_operations'
  | 'real_estate_technical_coordination'
  | 'asset_field_team';

export type AccessDecisionReason =
  | 'ALLOWED'
  | 'TENANT_SCOPE_MISMATCH'
  | 'ASSET_SCOPE_MISMATCH'
  | 'ROLE_NOT_ALLOWED';

export type AccessAction =
  | 'structural_registry.manage'
  | 'agenda.event.search'
  | 'agenda.event.read'
  | 'agenda.event.create'
  | 'agenda.event.update'
  | 'agenda.event.delete'
  | 'agenda.conflict.override'
  | 'maintenance.ticket.search'
  | 'maintenance.ticket.read'
  | 'maintenance.ticket.create'
  | 'maintenance.ticket.comment'
  | 'maintenance.ticket.transition'
  | 'maintenance.evidence.attach'
  | 'maintenance.evidence.read'
  | 'maintenance.provisional_block.apply'
  | 'maintenance.provisional_block.validate'
  | 'maintenance.asset.release'
  | 'aviation.report.search'
  | 'aviation.report.read'
  | 'aviation.report.create'
  | 'aviation.report.transition'
  | 'cutover.run.read'
  | 'cutover.run.manage'
  | 'cutover.run.evaluate'
  | 'cutover.run.decide'
  | 'cutover.checkpoint.record'
  | 'audit.ledger.search'
  | 'audit.decision_memo.create'
  | 'audit.rectification.create'
  | 'aviation.report.search'
  | 'aviation.report.read'
  | 'aviation.report.create'
  | 'aviation.report.comment'
  | 'aviation.report.transition'
  | 'aviation.evidence.attach'
  | 'aviation.evidence.read'
  | 'real-estate.report.search'
  | 'real-estate.report.read'
  | 'real-estate.report.create'
  | 'real-estate.report.comment'
  | 'real-estate.report.transition'
  | 'real-estate.evidence.attach'
  | 'real-estate.evidence.read'
  | (string & {});

export type AccessActor = {
  userId: string;
  tenantId: string;
  role: PortalRole;
  assetIds: string[];
};

export type AccessSubject = {
  tenantId: string;
  assetId?: string;
};

export type AccessRequest = {
  actor: AccessActor;
  action: AccessAction;
  subject: AccessSubject;
};

export type AccessDecision = {
  allowed: boolean;
  reason: AccessDecisionReason;
};

const rolePermissions: Record<PortalRole, ReadonlySet<string>> = {
  portal_admin: new Set([
    'structural_registry.manage',
    'agenda.event.search',
    'maintenance.ticket.search',
    'maintenance.ticket.read',
    'maintenance.ticket.comment',
    'aviation.report.search',
    'aviation.report.read',
    'real-estate.report.search',
    'real-estate.report.read',
    'cutover.run.read',
    'cutover.run.manage',
    'cutover.run.evaluate',
    'cutover.run.decide',
    'cutover.checkpoint.record',
    'audit.ledger.search'
  ]),
  central_operations: new Set([
    'structural_registry.manage',
    'agenda.event.search',
    'agenda.event.read',
    'agenda.event.create',
    'agenda.event.update',
    'agenda.event.delete',
    'agenda.conflict.override',
    'maintenance.ticket.search',
    'maintenance.ticket.read',
    'maintenance.ticket.create',
    'maintenance.ticket.comment',
    'maintenance.ticket.transition',
    'maintenance.evidence.attach',
    'maintenance.evidence.read',
    'maintenance.provisional_block.validate',
    'aviation.report.search',
    'aviation.report.read',
    'aviation.report.create',
    'aviation.report.comment',
    'aviation.report.transition',
    'aviation.evidence.attach',
    'aviation.evidence.read',
    'real-estate.report.search',
    'real-estate.report.read',
    'real-estate.report.create',
    'real-estate.report.comment',
    'real-estate.report.transition',
    'real-estate.evidence.attach',
    'real-estate.evidence.read',
    'cutover.run.read',
    'cutover.run.manage',
    'cutover.run.evaluate',
    'cutover.run.decide',
    'cutover.checkpoint.record',
    'audit.ledger.search',
    'audit.decision_memo.create',
    'audit.rectification.create'
  ]),
  yachts_operations: new Set([
    'structural_registry.manage',
    'agenda.event.search',
    'agenda.event.read',
    'agenda.event.create',
    'agenda.event.update',
    'agenda.event.delete',
    'agenda.conflict.override',
    'maintenance.ticket.search',
    'maintenance.ticket.read',
    'maintenance.ticket.create',
    'maintenance.ticket.comment',
    'maintenance.ticket.transition',
    'maintenance.evidence.attach',
    'maintenance.evidence.read',
    'maintenance.provisional_block.validate',
    'aviation.report.search',
    'aviation.report.read',
    'cutover.run.read',
    'cutover.run.manage',
    'cutover.run.evaluate',
    'cutover.run.decide',
    'cutover.checkpoint.record',
    'audit.ledger.search',
    'audit.decision_memo.create',
    'audit.rectification.create'
  ]),
  yachts_technical_coordination: new Set([
    'agenda.event.search',
    'agenda.event.read',
    'maintenance.ticket.search',
    'maintenance.ticket.read',
    'maintenance.ticket.create',
    'maintenance.ticket.comment',
    'maintenance.ticket.transition',
    'maintenance.evidence.attach',
    'maintenance.evidence.read',
    'maintenance.provisional_block.apply',
    'maintenance.asset.release',
    'aviation.report.search',
    'aviation.report.read',
    'cutover.run.read',
    'cutover.checkpoint.record',
    'audit.ledger.search',
    'audit.decision_memo.create'
  ]),
  aviation_operations: new Set([
    'structural_registry.manage',
    'agenda.event.search',
    'agenda.event.read',
    'agenda.event.create',
    'agenda.event.update',
    'agenda.event.delete',
    'agenda.conflict.override',
    'aviation.report.search',
    'aviation.report.read',
    'aviation.report.create',
    'aviation.report.comment',
    'aviation.report.transition',
    'aviation.evidence.attach',
    'aviation.evidence.read',
    'audit.ledger.search',
    'audit.decision_memo.create',
    'audit.rectification.create'
  ]),
  aviation_technical_coordination: new Set([
    'agenda.event.search',
    'agenda.event.read',
    'aviation.report.search',
    'aviation.report.read',
    'aviation.report.create',
    'aviation.report.comment',
    'aviation.report.transition',
    'aviation.evidence.attach',
    'aviation.evidence.read',
    'audit.ledger.search',
    'audit.decision_memo.create'
  ]),
  asset_field_team: new Set([
    'agenda.event.search',
    'agenda.event.read',
    'agenda.event.create',
    'agenda.event.update',
    'agenda.event.delete',
    'audit.ledger.search',
    'maintenance.ticket.search',
    'maintenance.ticket.read',
    'maintenance.ticket.create',
    'maintenance.ticket.comment',
    'maintenance.ticket.transition',
    'maintenance.evidence.attach',
    'maintenance.evidence.read',
    'aviation.report.search',
    'aviation.report.read',
    'aviation.report.create',
    'aviation.report.comment',
    'aviation.report.transition',
    'aviation.evidence.attach',
    'aviation.evidence.read',
    'real-estate.report.search',
    'real-estate.report.read',
    'real-estate.report.create',
    'real-estate.report.comment',
    'real-estate.report.transition',
    'real-estate.evidence.attach',
    'real-estate.evidence.read'
  ]),
  real_estate_operations: new Set([
    'structural_registry.manage',
    'agenda.event.search',
    'agenda.event.read',
    'agenda.event.create',
    'agenda.event.update',
    'agenda.event.delete',
    'agenda.conflict.override',
    'real-estate.report.search',
    'real-estate.report.read',
    'real-estate.report.create',
    'real-estate.report.comment',
    'real-estate.report.transition',
    'real-estate.evidence.attach',
    'real-estate.evidence.read',
    'audit.ledger.search',
    'audit.decision_memo.create',
    'audit.rectification.create'
  ]),
  real_estate_technical_coordination: new Set([
    'agenda.event.search',
    'agenda.event.read',
    'real-estate.report.search',
    'real-estate.report.read',
    'real-estate.report.create',
    'real-estate.report.comment',
    'real-estate.report.transition',
    'real-estate.evidence.attach',
    'real-estate.evidence.read',
    'audit.ledger.search',
    'audit.decision_memo.create'
  ])
};

const assetScopedActions = new Set([
  'agenda.event.read',
  'agenda.event.create',
  'agenda.event.update',
  'agenda.event.delete',
  'agenda.conflict.override',
  'maintenance.ticket.read',
  'maintenance.ticket.create',
  'maintenance.ticket.comment',
  'maintenance.ticket.transition',
  'maintenance.evidence.attach',
  'maintenance.evidence.read',
  'maintenance.provisional_block.apply',
  'maintenance.provisional_block.validate',
  'maintenance.asset.release',
  'aviation.report.read',
  'aviation.report.create',
  'aviation.report.comment',
  'aviation.report.transition',
  'aviation.evidence.attach',
  'aviation.evidence.read',
  'real-estate.report.read',
  'real-estate.report.create',
  'real-estate.report.comment',
  'real-estate.report.transition',
  'real-estate.evidence.attach',
  'real-estate.evidence.read'
]);

@Injectable()
export class AccessPolicyService {
  constructor(
    @Optional()
    private readonly observabilityMetricsService?: ObservabilityMetricsService
  ) {}

  authorize({ actor, action, subject }: AccessRequest): AccessDecision {
    if (actor.tenantId !== subject.tenantId) {
      return this.deny('TENANT_SCOPE_MISMATCH');
    }

    if (!rolePermissions[actor.role].has(action)) {
      return this.deny('ROLE_NOT_ALLOWED');
    }

    if (actor.role === 'asset_field_team' && assetScopedActions.has(action)) {
      if (!subject.assetId || !actor.assetIds.includes(subject.assetId)) {
        return this.deny('ASSET_SCOPE_MISMATCH');
      }
    }

    return {
      allowed: true,
      reason: 'ALLOWED'
    };
  }

  private deny(reason: Exclude<AccessDecisionReason, 'ALLOWED'>): AccessDecision {
    this.observabilityMetricsService?.recordAuthorizationFailure();

    return {
      allowed: false,
      reason
    };
  }
}
