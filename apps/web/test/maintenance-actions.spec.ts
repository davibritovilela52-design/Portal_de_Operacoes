import { afterEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

const revalidatePathMock = vi.fn();
const registerMaintenanceCommentMock = vi.fn();
const requirePortalSessionMock = vi.fn(async () => ({
  token: 'test-session-token',
  claims: {
    version: 1,
    userId: 'central-1',
    tenantId: 'prime-you',
    role: 'central_operations',
    assetIds: [],
    displayName: 'Operacoes',
    email: 'central@primeyou.com',
    mfaVerified: true,
    expiresAt: '2026-05-18T08:49:25.591Z'
  },
  actor: {
    userId: 'central-1',
    tenantId: 'prime-you',
    role: 'central_operations' as const,
    assetIds: []
  },
  operatorLabel: 'Operacoes'
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
  attachMaintenanceEvidence: vi.fn(),
  createDecisionMemo: vi.fn(),
  createMaintenanceTicket: vi.fn(),
  createRectification: vi.fn(),
  deleteAgendaEvent: vi.fn(),
  evaluateCutoverRun: vi.fn(),
  fetchPortalOperationsSnapshot: vi.fn(),
  recordCutoverCheckpoint: vi.fn(),
  recordCutoverDecision: vi.fn(),
  registerMaintenanceComment: registerMaintenanceCommentMock,
  revokeAccessAssignment: vi.fn(),
  rescheduleAgendaEvent: vi.fn(),
  scheduleAgendaEvent: vi.fn(),
  transitionMaintenanceTicket: vi.fn(),
  upsertAccessAssignment: vi.fn(),
  upsertCutoverRun: vi.fn()
}));

describe('maintenance server actions', () => {
  afterEach(() => {
    redirectMock.mockClear();
    revalidatePathMock.mockClear();
    registerMaintenanceCommentMock.mockReset();
    requirePortalSessionMock.mockClear();
  });

  it('registers a comment and returns to the originating popup', async () => {
    registerMaintenanceCommentMock.mockResolvedValueOnce({ registered: true });
    const { registerMaintenanceCommentAction } = await import('../app/(portal)/operations-actions');
    const formData = new FormData();

    formData.set('ticketId', 'mt-1');
    formData.set('assetId', 'yacht-002');
    formData.set('returnTo', '/improvements?ticketId=mt-1');
    formData.set('comment', 'Validacao do fornecedor solicitada.');

    await expect(registerMaintenanceCommentAction(formData)).rejects.toThrow(
      'REDIRECT:/improvements?ticketId=mt-1&notice=Comentario+registrado+com+sucesso.'
    );
    expect(registerMaintenanceCommentMock).toHaveBeenCalledTimes(1);
    expect(registerMaintenanceCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: 'mt-1',
        input: expect.objectContaining({
          message: 'Validacao do fornecedor solicitada.',
          commentedBy: 'Operacoes'
        })
      }),
      {
        sessionToken: 'test-session-token'
      }
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/improvements');
    expect(revalidatePathMock).toHaveBeenCalledWith('/improvements?ticketId=mt-1');
  });
});
