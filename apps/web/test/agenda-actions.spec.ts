import { afterEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

const revalidatePathMock = vi.fn();
const scheduleAgendaEventMock = vi.fn();
const rescheduleAgendaEventMock = vi.fn();
const deleteAgendaEventMock = vi.fn();
const requirePortalSessionMock = vi.fn(async () => ({
  token: 'test-session-token',
  claims: {
    version: 1,
    userId: 'portal-admin-1',
    tenantId: 'prime-you',
    role: 'portal_admin',
    assetIds: [],
    displayName: 'Portal Admin',
    email: 'portal.admin@primeyou.com',
    mfaVerified: true,
    expiresAt: '2026-05-18T08:49:25.591Z'
  },
  actor: {
    userId: 'portal-admin-1',
    tenantId: 'prime-you',
    role: 'portal_admin' as const,
    assetIds: []
  },
  operatorLabel: 'Portal Admin'
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock
}));

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock
}));

vi.mock('../lib/portal-session', () => ({
  requirePortalSession: requirePortalSessionMock,
  requirePortalRole: requirePortalSessionMock,
  requirePortalRoles: requirePortalSessionMock
}));

vi.mock('../lib/portal-api', () => ({
  scheduleAgendaEvent: scheduleAgendaEventMock,
  rescheduleAgendaEvent: rescheduleAgendaEventMock,
  deleteAgendaEvent: deleteAgendaEventMock,
  createMaintenanceTicket: vi.fn(),
  transitionMaintenanceTicket: vi.fn(),
  attachMaintenanceEvidence: vi.fn(),
  registerMaintenanceComment: vi.fn(),
  createDecisionMemo: vi.fn(),
  createRectification: vi.fn(),
  fetchPortalOperationsSnapshot: vi.fn(),
  evaluateCutoverRun: vi.fn(),
  recordCutoverCheckpoint: vi.fn(),
  recordCutoverDecision: vi.fn(),
  revokeAccessAssignment: vi.fn(),
  upsertCutoverRun: vi.fn(),
  upsertAccessAssignment: vi.fn()
}));

describe('agenda server actions', () => {
  afterEach(() => {
    redirectMock.mockClear();
    revalidatePathMock.mockClear();
    scheduleAgendaEventMock.mockReset();
    rescheduleAgendaEventMock.mockReset();
    deleteAgendaEventMock.mockReset();
    requirePortalSessionMock.mockClear();
  });

  it('creates an event and redirects with notice', async () => {
    scheduleAgendaEventMock.mockResolvedValueOnce({ allowed: true });
    const { scheduleAgendaEventAction } = await import('../app/(portal)/operations-actions');
    const formData = new FormData();

    formData.set('calendarMonth', '2026-05');
    formData.set('type', 'utilization');
    formData.set('assetId', 'yacht-mondebleu');
    formData.set('filterAssetId', 'yacht-mondebleu');
    formData.set('description', 'Reserva de teste');
    formData.set('startsAt', '2026-05-18T09:00');
    formData.set('endsAt', '2026-05-18T11:00');

    await expect(scheduleAgendaEventAction(formData)).rejects.toThrow(
      'REDIRECT:/agenda?month=2026-05&assetId=yacht-mondebleu&notice=Evento+criado+com+sucesso.'
    );
    expect(scheduleAgendaEventMock).toHaveBeenCalledTimes(1);
    expect(scheduleAgendaEventMock).toHaveBeenCalledWith(expect.any(Object), {
      sessionToken: 'test-session-token'
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/agenda');
  });

  it('reschedules an event only after explicit edit submission', async () => {
    rescheduleAgendaEventMock.mockResolvedValueOnce({ allowed: true });
    const { rescheduleAgendaEventAction } = await import('../app/(portal)/operations-actions');
    const formData = new FormData();

    formData.set('calendarMonth', '2026-05');
    formData.set(
      'eventSnapshot',
      JSON.stringify({
        id: 'agenda-1',
        assetId: 'yacht-mondebleu',
        type: 'utilization',
        safeMinimumBreached: false,
        provisional: false,
        validatedAt: null
      })
    );
    formData.set('assetId', 'yacht-mondebleu');
    formData.set('filterAssetId', 'yacht-mondebleu');
    formData.set('type', 'operational_block');
    formData.set('description', 'Evento reprogramado');
    formData.set('rescheduleStartsAt', '2026-05-18T12:00');
    formData.set('rescheduleEndsAt', '2026-05-18T14:00');

    await expect(rescheduleAgendaEventAction(formData)).rejects.toThrow(
      'REDIRECT:/agenda?month=2026-05&assetId=yacht-mondebleu&notice=Evento+reprogramado+com+sucesso.'
    );
    expect(rescheduleAgendaEventMock).toHaveBeenCalledTimes(1);
    expect(rescheduleAgendaEventMock).toHaveBeenCalledWith(expect.any(Object), {
      sessionToken: 'test-session-token'
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/agenda');
  });

  it('deletes a selected event and redirects with notice', async () => {
    deleteAgendaEventMock.mockResolvedValueOnce({ allowed: true });
    const { deleteAgendaEventAction } = await import('../app/(portal)/operations-actions');
    const formData = new FormData();

    formData.set('calendarMonth', '2026-05');
    formData.set('eventId', 'agenda-1');
    formData.set('assetId', 'yacht-mondebleu');
    formData.set('filterAssetId', 'yacht-mondebleu');

    await expect(deleteAgendaEventAction(formData)).rejects.toThrow(
      'REDIRECT:/agenda?month=2026-05&assetId=yacht-mondebleu&notice=Evento+excluido+com+sucesso.'
    );
    expect(deleteAgendaEventMock).toHaveBeenCalledTimes(1);
    expect(deleteAgendaEventMock).toHaveBeenCalledWith(expect.any(Object), {
      sessionToken: 'test-session-token'
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/agenda');
  });
});
