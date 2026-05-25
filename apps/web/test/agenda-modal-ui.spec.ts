import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('agenda modal operável', () => {
  it('opens create and edit flows with modal-oriented fields and explicit edit activation', () => {
    const agendaSource = readFileSync(
      resolve(__dirname, '../app/(portal)/agenda/page.tsx'),
      'utf8'
    );

    expect(agendaSource).toContain('Nome do evento');
    expect(agendaSource).toContain('Descrição');
    expect(agendaSource).toContain("mode: 'edit'");
    expect(agendaSource).toContain("intent: 'edit'");
    expect(agendaSource).toContain('aria-label="Mes anterior"');
    expect(agendaSource).toContain('aria-label="Proximo mes"');
    expect(agendaSource).toContain('calendarMonth');
    expect(agendaSource).toContain('filterAssetId');
    expect(agendaSource).toContain('modal-backdrop');
    expect(agendaSource).toContain('Editar');
    expect(agendaSource).toContain('Excluir');
    expect(agendaSource).not.toContain('Salvar edição');
    expect(agendaSource).not.toContain('Exclui o evento selecionado');
  });

  it('sends title, description and month context through the agenda server actions', () => {
    const actionSource = readFileSync(
      resolve(__dirname, '../app/(portal)/operations-actions.ts'),
      'utf8'
    );

    expect(actionSource).toContain('title: resolveAgendaEventTitle(eventType)');
    expect(actionSource).toContain('title: resolveAgendaEventTitle(updatedType)');
    expect(actionSource).toContain("description: readRequired(formData, 'description')");
    expect(actionSource).toContain('buildAgendaRedirectPath(formData)');
    expect(actionSource).toContain("readOptional(formData, 'calendarMonth')");
    expect(actionSource).toContain("readOptional(formData, 'filterAssetId')");
    expect(actionSource).toContain('deleteAgendaEventAction');
  });
});
