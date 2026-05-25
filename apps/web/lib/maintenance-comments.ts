export type MaintenanceCommentRecord = {
  id: string;
  author: string;
  message: string;
  at: string;
};

type SerializedMaintenanceComments = {
  version: 1;
  comments: MaintenanceCommentRecord[];
};

const maintenanceCommentsMarker = '[[OPS_PORTAL_COMMENTS_V1]]';

export function parseMaintenanceNotesDocument(notes?: string | null): {
  summary: string;
  comments: MaintenanceCommentRecord[];
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
      comments: parsed.comments.filter(isMaintenanceCommentRecord)
    };
  } catch {
    return {
      summary: notes.trim(),
      comments: []
    };
  }
}

function isMaintenanceCommentRecord(value: unknown): value is MaintenanceCommentRecord {
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
