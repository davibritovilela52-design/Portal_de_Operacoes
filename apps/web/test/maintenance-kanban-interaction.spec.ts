import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('maintenance kanban interaction', () => {
  it('supports drag and drop status transitions from the kanban board', () => {
    const boardSource = readFileSync(
      resolve(
        __dirname,
        '../app/(portal)/maintenance/maintenance-kanban-board.tsx'
      ),
      'utf8'
    );

    expect(boardSource).toContain('transitionMaintenanceTicketAction');
    expect(boardSource).toContain('handlePointerDragStart');
    expect(boardSource).toContain("window.addEventListener('pointermove'");
    expect(boardSource).toContain("window.addEventListener('pointerup'");
    expect(boardSource).toContain('handleWindowPointerMove');
    expect(boardSource).toContain('handleWindowPointerEnd');
    expect(boardSource).toContain('draggable={canDragTicket(ticket.status)}');
    expect(boardSource).toContain('handleNativeDragStart');
    expect(boardSource).toContain('handleColumnDragOver');
    expect(boardSource).toContain('handleColumnDrop');
    expect(boardSource).toContain('buildMaintenanceKanbanColumns');
    expect(boardSource).toContain('kanbanStorageKey');
    expect(boardSource).toContain('kanban-board-shell');
    expect(boardSource).toContain('kanban-column__eyebrow');
    expect(boardSource).toContain('kanban-column__count');
    expect(boardSource).toContain('kanban-card__meta');
    expect(boardSource).toContain('kanban-card__footer');
    expect(boardSource).toContain('kanban-card__drag-cue');
    expect(boardSource).toContain('data-kanban-column-key={column.key}');
    expect(boardSource).toContain('data-kanban-status={column.status}');
    expect(boardSource).toContain('ticket.ticketNumber');
    expect(boardSource).toContain('document.elementFromPoint');
    expect(boardSource).toContain("url.searchParams.set('ticketId', ticketId)");
    expect(boardSource).toContain('openTicketModal(dragSnapshot.ticket.id)');
    expect(boardSource).toContain('requestSubmit()');
    expect(boardSource).toContain('name="toStatus"');
    expect(boardSource).toContain('name="ticketId"');
    expect(boardSource).toContain('name="assetId"');
    expect(boardSource).toContain('name="returnTo"');
    expect(boardSource).toContain('value={returnTo}');
  });

  it('keeps horizontal kanban scrolling usable in the board itself and auto-scroll during drag', () => {
    const scrollSource = readFileSync(
      resolve(__dirname, '../components/horizontal-scroll-surface.tsx'),
      'utf8'
    );
    const boardSource = readFileSync(
      resolve(
        __dirname,
        '../app/(portal)/maintenance/maintenance-kanban-board.tsx'
      ),
      'utf8'
    );
    const globalsSource = readFileSync(
      resolve(__dirname, '../app/globals.css'),
      'utf8'
    );

    expect(boardSource).toContain('maybeAutoScrollSurface');
    expect(boardSource).not.toContain('kanban-card__drag-handle');
    expect(boardSource).not.toContain('kanban-scrollbar-proxy');
    expect(boardSource).not.toContain('kanban-scrollbar-proxy__spacer');
    expect(boardSource).not.toContain('handleProxyPointerDown');
    expect(boardSource).toContain('use a rolagem lateral do quadro');
    expect(globalsSource).toContain('.kanban-surface');
    expect(globalsSource).toContain('.horizontal-scroll-surface');
    expect(globalsSource).toContain('.kanban-drag-layer');
    expect(globalsSource).toContain('.kanban-card--pointer-dragging');
    expect(globalsSource).toContain('.kanban-board-shell');
    expect(globalsSource).toContain('.kanban-board-head');
    expect(globalsSource).toContain('.kanban-column__eyebrow');
    expect(globalsSource).toContain('.kanban-column__count');
    expect(globalsSource).toContain('.kanban-card__id');
    expect(globalsSource).toContain('.kanban-card__meta');
    expect(globalsSource).toContain('.kanban-card__footer');
    expect(globalsSource).toContain('.kanban-card__asset-label');
    expect(globalsSource).toContain('.kanban-card__drag-cue');
    expect(globalsSource).toContain('min-height: 132px');
    expect(globalsSource).toContain('-webkit-line-clamp: 2');
    expect(globalsSource).toContain('align-content: start');
    expect(globalsSource).toContain('grid-auto-rows: max-content');
    expect(globalsSource).not.toContain('.kanban-card--priority-p1::before');
    expect(globalsSource).toContain('touch-action: pan-x');
    expect(globalsSource).toContain('scrollbar-gutter: stable');
    expect(globalsSource).toContain('::-webkit-scrollbar');
    expect(globalsSource).toContain('min-width: max-content');
    expect(globalsSource).toContain('overflow-y: auto');
    expect(scrollSource).toContain('interactiveSelector');
    expect(scrollSource).toContain('shouldPreserveVerticalWheel');
    expect(scrollSource).toContain('findScrollableVerticalAncestor');
    expect(scrollSource).toContain("overflowY === 'auto' || overflowY === 'scroll'");
  });

  it('allows maintenance transitions to redirect back to the board after a drop action', () => {
    const actionsSource = readFileSync(
      resolve(__dirname, '../app/(portal)/operations-actions.ts'),
      'utf8'
    );

    expect(actionsSource).toContain("readOptional(formData, 'returnTo')");
    expect(actionsSource).toContain('const redirectPath =');
    expect(actionsSource).toContain('revalidateOperationalPages(redirectPath)');
  });

  it('allows evidence uploads to redirect back to the originating maintenance or improvements modal', () => {
    const actionsSource = readFileSync(
      resolve(__dirname, '../app/(portal)/operations-actions.ts'),
      'utf8'
    );

    expect(actionsSource).toContain(
      "const redirectPath = readOptional(formData, 'returnTo') ?? `/maintenance?ticketId=${ticketId}`"
    );
    expect(actionsSource).toContain("redirectWithMessage(redirectPath, 'error', describeThrownError(error))");
    expect(actionsSource).toContain("redirectWithMessage(redirectPath, 'notice', 'Evidencia registrada com sucesso.')");
  });
});
