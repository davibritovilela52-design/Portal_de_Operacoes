import type {
  AccessUserRecord,
  AgendaEventRecord,
  AgendaEventType,
  MaintenanceCategory,
  MaintenanceSystem,
  MaintenanceCostRecord,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceTicketRecord,
  AssetModality,
  PortalRole
} from './portal-model';
import type { MaintenanceCommentRecord } from './maintenance-comments';

export type NavigationItem = {
  href: string;
  label: string;
  icon:
    | 'dashboard'
    | 'agenda'
    | 'maintenance'
    | 'audit'
    | 'access'
    | 'cutover';
};

export type TopbarTab = {
  href: string;
  label: string;
};

export type AssetRecord = {
  id: string;
  name: string;
  modality: AssetModality;
  status: 'available' | 'restricted' | 'unavailable';
  location: string;
  nextWindow: string;
};

export type MaintenanceDetailRecord = Omit<MaintenanceTicketRecord, 'thirdParty'> & {
  assetTag: string;
  description: string;
  notes: string;
  comments: MaintenanceCommentRecord[];
  maintenanceSystem: MaintenanceSystem;
  substeps: Array<{ label: string; status: 'done' | 'current' | 'pending' }>;
  evidenceChecklist: Array<{ label: string; status: 'complete' | 'missing' | 'pending' }>;
  budget: {
    preliminary: string;
    current: string;
    deltaLabel: string;
    ownership: string;
  };
  thirdParty: {
    involved: boolean;
    supplier: string;
    strategy: string;
    centralValidation: string;
  };
  freezeHistory: Array<{ reason: string; at: string; by: string }>;
  auditTrail: Array<{ title: string; at: string; actor: string; note: string }>;
};

export type AuditRecord = {
  id: string;
  type: 'decision_memo' | 'rectification' | 'override' | 'authorization_failure';
  title: string;
  assetId: string;
  assetName: string;
  actor: string;
  at: string;
  summary: string;
  aggregateType: string;
  aggregateId: string;
  status: string;
  recordId: string;
  sourceVersion: number;
  targetVersion: number;
};

export type CutoverGateRecord = {
  id: string;
  label: string;
  status: 'ready' | 'blocked' | 'in_review';
  owner: string;
  detail: string;
};

export const portalContext = {
  brand: 'Portal de Operações',
  phase: 'Fase 1 Yachts',
  tenantLabel: 'Prime You',
  vesselId: 'YACHTS-OPS',
  commandWindow: 'Orquestração ativa 24/7'
};

export const navigationItems: NavigationItem[] = [
  { href: '/dashboard', label: 'Painel', icon: 'dashboard' },
  { href: '/agenda', label: 'Agenda', icon: 'agenda' },
  { href: '/maintenance', label: 'Manutenção', icon: 'maintenance' },
  { href: '/aviation', label: 'Aviation', icon: 'maintenance' },
  { href: '/improvements', label: 'Melhorias', icon: 'maintenance' },
  { href: '/access', label: 'Acessos', icon: 'access' }
];

export const topbarTabs: TopbarTab[] = [
  { href: '/dashboard', label: 'Yachts' },
  { href: '/aviation', label: 'Aviation' }
];

export const fleetAssets: AssetRecord[] = [
  {
    id: 'yacht-001',
    name: 'Yacht Aurora',
    modality: 'yachts',
    status: 'restricted',
    location: 'Angra dos Reis',
    nextWindow: 'Bloqueio técnico até 14 Mai, 18:00'
  },
  {
    id: 'yacht-002',
    name: 'Yacht Boreal',
    modality: 'yachts',
    status: 'available',
    location: 'Paraty',
    nextWindow: 'Livre para utilização amanhã'
  },
  {
    id: 'yacht-003',
    name: 'Yacht Cobalt',
    modality: 'yachts',
    status: 'unavailable',
    location: 'Itajaí',
    nextWindow: 'Inspeção corretiva em execução'
  }
];

export const maintenanceTickets: MaintenanceTicketRecord[] = [
  createTicket({
    id: 'mtn-8829',
    ticketNumber: 'mtn-8829',
    assetId: 'yacht-001',
    assetName: 'Yacht Aurora',
    title: 'Troca de filtros de óleo - motor bombordo',
    category: 'inspection',
    priority: 'P1',
    status: 'pending',
    owner: 'Coordenação técnica',
    openedBy: 'carlos.medina@primeyou.com',
    openedAt: '2026-05-14T08:30:00.000Z',
    frozenCount: 0,
    thirdParty: false,
    kanbanSubstatus: 'call_opening',
    evidenceCompleteness: 0.25,
    slaProgress: 0.98
  }),
  createTicket({
    id: 'mtn-8815',
    ticketNumber: 'mtn-8815',
    assetId: 'yacht-001',
    assetName: 'Yacht Aurora',
    title: 'Falha de sensor de pressão - deck B',
    category: 'corrective',
    priority: 'P1',
    status: 'reopened',
    owner: 'Embarcações',
    openedBy: 'marina.lopes@primeyou.com',
    openedAt: '2026-05-13T16:10:00.000Z',
    frozenCount: 1,
    thirdParty: false,
    kanbanSubstatus: 'ticket_qualification',
    evidenceCompleteness: 0.6,
    slaProgress: 0.42
  }),
  createTicket({
    id: 'mtn-8712',
    ticketNumber: 'mtn-8712',
    assetId: 'yacht-002',
    assetName: 'Yacht Boreal',
    title: 'Calibração de injetores',
    category: 'improvement',
    priority: 'P2',
    status: 'in_progress',
    owner: 'Coordenação técnica',
    openedBy: 'renata.serra@primeyou.com',
    openedAt: '2026-05-12T10:00:00.000Z',
    frozenCount: 0,
    thirdParty: true,
    kanbanSubstatus: 'service_execution',
    evidenceCompleteness: 0.72,
    slaProgress: 0.45
  }),
  createTicket({
    id: 'mtn-8705',
    ticketNumber: 'mtn-8705',
    assetId: 'yacht-003',
    assetName: 'Yacht Cobalt',
    title: 'Troca de selos hidráulicos',
    category: 'corrective',
    priority: 'P2',
    status: 'payment',
    owner: 'Operação central',
    openedBy: 'paulo.braga@primeyou.com',
    openedAt: '2026-05-11T14:20:00.000Z',
    frozenCount: 0,
    thirdParty: true,
    kanbanSubstatus: 'payment_request',
    evidenceCompleteness: 0.85,
    slaProgress: 0.91
  }),
  createTicket({
    id: 'mtn-8699',
    ticketNumber: 'mtn-8699',
    assetId: 'yacht-003',
    assetName: 'Yacht Cobalt',
    title: 'Limpeza de dutos externos',
    category: 'inspection',
    priority: 'P3',
    status: 'frozen',
    owner: 'Operação central',
    openedBy: 'paulo.braga@primeyou.com',
    openedAt: '2026-05-10T09:00:00.000Z',
    frozenCount: 2,
    thirdParty: false,
    kanbanSubstatus: 'accounts_freeze',
    evidenceCompleteness: 0.5,
    slaProgress: 0.8
  }),
  createTicket({
    id: 'mtn-8650',
    ticketNumber: 'mtn-8650',
    assetId: 'yacht-002',
    assetName: 'Yacht Boreal',
    title: 'Manutenção preventiva trimestral',
    category: 'preventive',
    priority: 'P3',
    status: 'completed',
    owner: 'Embarcações',
    openedBy: 'marina.lopes@primeyou.com',
    openedAt: '2026-05-07T10:30:00.000Z',
    frozenCount: 0,
    thirdParty: false,
    kanbanSubstatus: 'closed_files',
    evidenceCompleteness: 1,
    slaProgress: 1
  })
];

export const maintenanceDetails: MaintenanceDetailRecord[] = [
  {
    ...maintenanceTickets[0],
    assetTag: 'MAR-2024',
    maintenanceSystem: 'mechanical',
    description:
      'Variação atípica de pressão no motor bombordo durante inspeção de rotina. Coordenação técnica determinou validação imediata, coleta diagnóstica e reserva de janela segura antes da próxima utilização.',
    notes: 'Sem observações adicionais no momento.',
    comments: [],
    substeps: [
      { label: 'Qualificação do chamado', status: 'done' },
      { label: 'Diagnóstico presencial', status: 'current' },
      { label: 'Orçamento preliminar', status: 'pending' },
      { label: 'Estratégia de absorção', status: 'pending' },
      { label: 'Programação de datas', status: 'pending' },
      { label: 'Controle de qualidade', status: 'pending' }
    ],
    evidenceChecklist: [
      { label: 'Evidência diagnóstica', status: 'missing' },
      { label: 'Documento financeiro', status: 'pending' },
      { label: 'Evidência de execução', status: 'pending' },
      { label: 'Liberação de qualidade', status: 'pending' }
    ],
    budget: {
      preliminary: 'R$ 12.500',
      current: 'R$ 12.500',
      deltaLabel: 'Sem variação aprovada',
      ownership: 'Coordenação técnica define absorção; operação central confirma pagamento'
    },
    thirdParty: {
      involved: false,
      supplier: 'Não aplicável',
      strategy: 'Execução interna da equipe técnica',
      centralValidation: 'Não aplicável no estágio atual'
    },
    freezeHistory: [],
    auditTrail: [
      {
        title: 'Chamado aberto',
        at: '2026-05-14T08:30:00.000Z',
        actor: 'Coordenação técnica',
        note: 'Abertura imediata após alarme de risco operacional.'
      },
      {
        title: 'Janela de agenda bloqueada',
        at: '2026-05-14T08:42:00.000Z',
        actor: 'Coordenação técnica',
        note: 'Bloqueio provisório aplicado para evitar utilização insegura.'
      }
    ]
  },
  {
    ...maintenanceTickets[2],
    assetTag: 'BOR-218',
    maintenanceSystem: 'mechanical',
    description:
      'Melhoria em performance de combustão com fornecedor terceiro habilitado e governança financeira acompanhada pela operação central.',
    notes: 'Sem observações adicionais no momento.',
    comments: [],
    substeps: [
      { label: 'Qualificação do chamado', status: 'done' },
      { label: 'Diagnóstico presencial', status: 'done' },
      { label: 'Orçamento preliminar', status: 'done' },
      { label: 'Estratégia de absorção', status: 'done' },
      { label: 'Programação de datas', status: 'current' },
      { label: 'Controle de qualidade', status: 'pending' }
    ],
    evidenceChecklist: [
      { label: 'Evidência diagnóstica', status: 'complete' },
      { label: 'Documento financeiro', status: 'pending' },
      { label: 'Evidência de execução', status: 'pending' },
      { label: 'Liberação de qualidade', status: 'pending' }
    ],
    budget: {
      preliminary: 'R$ 34.000',
      current: 'R$ 36.900',
      deltaLabel: '+8,5% dentro da tolerância atual',
      ownership: 'Fornecedor Alfa Marine com validação técnica concluída'
    },
    thirdParty: {
      involved: true,
      supplier: 'Alfa Marine Services',
      strategy: 'Execução terceirizada supervisionada',
      centralValidation: 'Pagamento programado após documento fiscal'
    },
    freezeHistory: [
      {
        reason: 'Aguardando resposta do fornecedor',
        at: '2026-05-13T18:20:00.000Z',
        by: 'Operação central'
      }
    ],
    auditTrail: [
      {
        title: 'Fornecedor acionado',
        at: '2026-05-12T16:00:00.000Z',
        actor: 'Coordenação técnica',
        note: 'Estratégia terceirizada escolhida após diagnóstico.'
      },
      {
        title: 'Pagamento aguardando confirmação',
        at: '2026-05-13T17:10:00.000Z',
        actor: 'Operação central',
        note: 'Documento fiscal aguardado para transição de pagamento.'
      }
    ]
  }
];

export const maintenanceCosts: MaintenanceCostRecord[] = [
  {
    id: 'cost-aurora-1',
    assetId: 'yacht-001',
    ticketId: 'mtn-8829',
    description: 'Diagnóstico inicial e deslocamento técnico',
    amount: 3200,
    currency: 'BRL',
    registeredAt: '2026-05-14T12:30:00.000Z'
  },
  {
    id: 'cost-boreal-1',
    assetId: 'yacht-002',
    ticketId: 'mtn-8712',
    description: 'Mão de obra especializada terceirizada',
    amount: 18600,
    currency: 'BRL',
    supplierId: 'supplier-alfa-marine',
    registeredAt: '2026-05-13T17:30:00.000Z'
  },
  {
    id: 'cost-cobalt-1',
    assetId: 'yacht-003',
    ticketId: 'mtn-8705',
    description: 'Peças hidráulicas e vedação',
    amount: 9400,
    currency: 'BRL',
    supplierId: 'supplier-ocean-drive',
    registeredAt: '2026-05-12T09:15:00.000Z'
  }
];

export const agendaEvents: AgendaEventRecord[] = [
  createAgendaEvent({
    id: 'ag-001',
    assetId: 'yacht-001',
    assetName: 'Yacht Aurora',
    type: 'utilization',
    title: 'Utilização owner A',
    owner: 'Operação central',
    startsAt: '2026-05-14T09:00:00.000Z',
    endsAt: '2026-05-14T12:00:00.000Z',
    provisional: false,
    validatedAt: null,
    safeMinimumBreached: false
  }),
  createAgendaEvent({
    id: 'ag-002',
    assetId: 'yacht-001',
    assetName: 'Yacht Aurora',
    type: 'operational_block',
    title: 'Bloqueio provisório por manutenção',
    owner: 'Coordenação técnica',
    startsAt: '2026-05-14T10:00:00.000Z',
    endsAt: '2026-05-14T13:30:00.000Z',
    provisional: true,
    validatedAt: null,
    safeMinimumBreached: false
  }),
  createAgendaEvent({
    id: 'ag-003',
    assetId: 'yacht-002',
    assetName: 'Yacht Boreal',
    type: 'planned_maintenance',
    title: 'Inspeção trimestral do gerador',
    owner: 'Embarcações',
    startsAt: '2026-05-14T08:00:00.000Z',
    endsAt: '2026-05-14T11:00:00.000Z',
    provisional: false,
    validatedAt: null,
    safeMinimumBreached: false
  }),
  createAgendaEvent({
    id: 'ag-004',
    assetId: 'yacht-002',
    assetName: 'Yacht Boreal',
    type: 'crew_rest',
    title: 'Folga da tripulação mínima segura',
    owner: 'Operação central',
    startsAt: '2026-05-14T13:00:00.000Z',
    endsAt: '2026-05-14T16:00:00.000Z',
    provisional: false,
    validatedAt: null,
    safeMinimumBreached: true
  }),
  createAgendaEvent({
    id: 'ag-005',
    assetId: 'yacht-003',
    assetName: 'Yacht Cobalt',
    type: 'emergency_maintenance',
    title: 'Correção emergencial no sistema de bordo',
    owner: 'Coordenação técnica',
    startsAt: '2026-05-14T07:00:00.000Z',
    endsAt: '2026-05-14T14:00:00.000Z',
    provisional: false,
    validatedAt: null,
    safeMinimumBreached: false
  })
];

export const accessUsers: AccessUserRecord[] = [
  createAccessUser({
    id: 'usr-001',
    displayName: 'Renata Serra',
    email: 'renata.serra@primeyou.com',
    role: 'central_operations',
    assetScopes: ['yacht-001', 'yacht-002', 'yacht-003'],
    mfaEnabled: true,
    status: 'active',
    lastReviewedAt: '2026-04-10T12:00:00.000Z'
  }),
  createAccessUser({
    id: 'usr-006',
    displayName: 'Operações - Real Estate e Yachts',
    email: 'operacoes.realestate.yachts@primeyou.com',
    role: 'central_operations',
    assetScopes: ['yacht-001', 'yacht-002', 'yacht-003'],
    mfaEnabled: true,
    status: 'active',
    lastReviewedAt: '2026-04-24T12:00:00.000Z'
  }),
  createAccessUser({
    id: 'usr-002',
    displayName: 'Carlos Medina',
    email: 'carlos.medina@primeyou.com',
    role: 'yachts_technical_coordination',
    assetScopes: ['yacht-001', 'yacht-002', 'yacht-003'],
    mfaEnabled: true,
    status: 'active',
    lastReviewedAt: '2026-03-12T12:00:00.000Z'
  }),
  createAccessUser({
    id: 'usr-003',
    displayName: 'Marina Lopes',
    email: 'marina.lopes@primeyou.com',
    role: 'asset_field_team',
    assetScopes: ['yacht-002'],
    mfaEnabled: false,
    status: 'active',
    lastReviewedAt: '2026-02-01T12:00:00.000Z'
  }),
  createAccessUser({
    id: 'usr-004',
    displayName: 'Paulo Braga',
    email: 'paulo.braga@primeyou.com',
    role: 'portal_admin',
    assetScopes: ['global'],
    mfaEnabled: true,
    status: 'blocked',
    lastReviewedAt: '2026-04-01T12:00:00.000Z'
  }),
  createAccessUser({
    id: 'usr-005',
    displayName: 'Equipe Operações Yachts',
    email: 'manutencaoyachts@primerealestate.com.br',
    role: 'yachts_operations',
    assetScopes: ['yacht-001', 'yacht-002', 'yacht-003'],
    mfaEnabled: true,
    status: 'active',
    lastReviewedAt: '2026-04-22T12:00:00.000Z'
  })
];

export const auditRecords: AuditRecord[] = [
  createAuditRecord({
    id: 'aud-1001',
    type: 'decision_memo',
    title: 'Override de conflito de agenda adiado',
    assetId: 'yacht-001',
    assetName: 'Yacht Aurora',
    actor: 'Operação central',
    at: '2026-05-14T09:30:00.000Z',
    summary: 'Decisão de preservar janela técnica e reprogramar utilização do owner.',
    aggregateType: 'agenda_event',
    aggregateId: 'ag-002',
    status: 'recorded',
    recordId: 'rec-1001',
    sourceVersion: 1,
    targetVersion: 2
  }),
  createAuditRecord({
    id: 'aud-1002',
    type: 'override',
    title: 'Validação de bloqueio provisório pendente',
    assetId: 'yacht-001',
    assetName: 'Yacht Aurora',
    actor: 'Coordenação técnica',
    at: '2026-05-14T08:42:00.000Z',
    summary: 'SLA de 24h iniciado para confirmação da operação central.',
    aggregateType: 'maintenance_ticket',
    aggregateId: 'mtn-8829',
    status: 'pending',
    recordId: 'rec-1002',
    sourceVersion: 2,
    targetVersion: 3
  }),
  createAuditRecord({
    id: 'aud-1003',
    type: 'authorization_failure',
    title: 'Negativa de acesso fora do escopo do ativo',
    assetId: 'yacht-002',
    assetName: 'Yacht Boreal',
    actor: 'Sistema',
    at: '2026-05-13T18:10:00.000Z',
    summary: 'Usuário tentou atualizar ticket de ativo não vinculado.',
    aggregateType: 'access_check',
    aggregateId: 'acc-009',
    status: 'blocked',
    recordId: 'rec-1003',
    sourceVersion: 1,
    targetVersion: 1
  })
];

export const cutoverGates: CutoverGateRecord[] = [
  {
    id: 'gate-entities',
    label: 'Conciliação de entidades',
    status: 'ready',
    owner: 'Operações yachts',
    detail: '100% das contagens do portal antigo conciliadas.'
  },
  {
    id: 'gate-attachments',
    label: 'Integridade de anexos críticos',
    status: 'in_review',
    owner: 'Coordenação técnica',
    detail: 'Hash validado para 98%; lote final em revisão.'
  },
  {
    id: 'gate-agenda',
    label: 'Migração mínima de 90 dias da agenda',
    status: 'blocked',
    owner: 'Operação central',
    detail: 'Dois ativos ainda sem janela futura reconciliada.'
  }
];

function createTicket(input: MaintenanceTicketRecord): MaintenanceTicketRecord {
  return input;
}

function createAgendaEvent(input: {
  id: string;
  assetId: string;
  assetName: string;
  type: AgendaEventType;
  title: string;
  owner: string;
  startsAt: string;
  endsAt: string;
  provisional: boolean;
  validatedAt: string | null;
  safeMinimumBreached: boolean;
}): AgendaEventRecord {
  return input;
}

function createAccessUser(input: {
  id: string;
  displayName: string;
  email: string;
  role: PortalRole;
  assetScopes: string[];
  mfaEnabled: boolean;
  status: 'active' | 'blocked' | 'revoked';
  lastReviewedAt: string;
}): AccessUserRecord {
  return input;
}

function createAuditRecord(input: AuditRecord): AuditRecord {
  return input;
}



