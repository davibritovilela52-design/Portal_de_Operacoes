import { formatDateLabel } from '../../../lib/portal-model';
import type { MaintenanceCommentRecord } from '../../../lib/maintenance-comments';
import { registerMaintenanceCommentAction } from '../operations-actions';

type MaintenanceTicketCommentsProps = {
  assetId: string;
  ticketId: string;
  returnTo: string;
  notes?: string;
  comments?: MaintenanceCommentRecord[];
};

export function MaintenanceTicketComments({
  assetId,
  ticketId,
  returnTo,
  notes,
  comments
}: MaintenanceTicketCommentsProps) {
  const initialNotes = notes?.trim();
  const persistedComments = comments ?? [];

  return (
    <section className="maintenance-comments">
      <div className="panel-title">
        <span>Comentarios</span>
      </div>

      {initialNotes ? (
        <div className="maintenance-comments__context">
          <strong>Contexto inicial</strong>
          <div className="maintenance-comments__message">
            {initialNotes.split(/\r?\n/).map((line, index) => (
              <p key={`note-line-${index}`}>{line}</p>
            ))}
          </div>
        </div>
      ) : null}

      {persistedComments.length > 0 ? (
        <div className="maintenance-comments__list">
          {persistedComments.map((comment) => (
            <article key={comment.id} className="maintenance-comments__item">
              <div className="maintenance-comments__meta">
                <strong>{comment.author}</strong>
                <span>{formatDateLabel(comment.at)}</span>
              </div>
              <div className="maintenance-comments__message">
                {comment.message.split(/\r?\n/).map((line, index) => (
                  <p key={`${comment.id}-line-${index}`}>{line}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="maintenance-comments__empty">Nenhum comentario registrado.</p>
      )}

      <form action={registerMaintenanceCommentAction} className="action-form">
        <input name="ticketId" type="hidden" value={ticketId} />
        <input name="assetId" type="hidden" value={assetId} />
        <input name="returnTo" type="hidden" value={returnTo} />

        <label className="form-field form-field--full">
          <span>Novo comentario</span>
          <textarea
            name="comment"
            rows={3}
            placeholder="Registre um comentario operacional para este chamado."
            required
          />
        </label>

        <div className="form-actions form-actions--end">
          <button className="action-button" type="submit">
            Adicionar comentario
          </button>
        </div>
      </form>
    </section>
  );
}
