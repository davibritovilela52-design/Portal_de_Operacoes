export type PersistedMaintenanceComment = {
  id: string;
  author: string;
  message: string;
  at: string;
};

type SerializedMaintenanceComments = {
  version: 1;
  comments: PersistedMaintenanceComment[];
};

const maintenanceCommentsMarker = '[[OPS_PORTAL_COMMENTS_V1]]';

export function parseMaintenanceTicketNotes(notes?: string | null): {
  summary: string;
  comments: PersistedMaintenanceComment[];
} {
  if (!notes?.trim()) {
    return {
      summary: '',
      comments: []
    };
  }

  const markerIndex = notes.indexOf(maintenanceCommentsMarker);

  if (markerIndex === -1) {
    return {
      summary: notes.trim(),
      comments: []
    };
  }

  const summary = notes.slice(0, markerIndex).trim();
  const serializedPayload = notes
    .slice(markerIndex + maintenanceCommentsMarker.length)
    .trim();

  if (!serializedPayload) {
    return {
      summary,
      comments: []
    };
  }

  try {
    const parsed = JSON.parse(serializedPayload) as SerializedMaintenanceComments;

    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.comments)) {
      throw new Error('Invalid maintenance comments payload');
    }

    return {
      summary,
      comments: parsed.comments.filter(isPersistedMaintenanceComment)
    };
  } catch {
    return {
      summary: notes.trim(),
      comments: []
    };
  }
}

export function appendMaintenanceTicketComment(
  notes: string | null | undefined,
  comment: PersistedMaintenanceComment
): string {
  const parsed = parseMaintenanceTicketNotes(notes);

  return serializeMaintenanceTicketNotes(parsed.summary, [...parsed.comments, comment]);
}

function serializeMaintenanceTicketNotes(
  summary: string,
  comments: PersistedMaintenanceComment[]
): string {
  const trimmedSummary = summary.trim();

  if (comments.length === 0) {
    return trimmedSummary;
  }

  const serializedPayload = JSON.stringify({
    version: 1,
    comments
  } satisfies SerializedMaintenanceComments);

  return trimmedSummary
    ? `${trimmedSummary}\n\n${maintenanceCommentsMarker}\n${serializedPayload}`
    : `${maintenanceCommentsMarker}\n${serializedPayload}`;
}

function isPersistedMaintenanceComment(
  value: unknown
): value is PersistedMaintenanceComment {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.author === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.at === 'string'
  );
}
