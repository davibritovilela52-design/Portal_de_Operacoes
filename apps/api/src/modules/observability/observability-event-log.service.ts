import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

export type ObservabilityEventRecord = {
  correlation_id: string;
  domain: string;
  action: string;
  entityId?: string;
  outcome: 'success' | 'blocked' | 'failure';
  metadata?: Record<string, unknown>;
  logged_at: Date;
};

export type ObservabilityEventInput = Omit<ObservabilityEventRecord, 'correlation_id' | 'logged_at'> & {
  correlation_id?: string;
};

@Injectable()
export class ObservabilityEventLogService {
  private readonly events: ObservabilityEventRecord[] = [];

  record(input: ObservabilityEventInput): ObservabilityEventRecord {
    const event: ObservabilityEventRecord = {
      ...input,
      correlation_id: input.correlation_id ?? randomUUID(),
      logged_at: new Date()
    };

    this.events.push(event);

    return event;
  }

  listRecentEvents(): ObservabilityEventRecord[] {
    return [...this.events];
  }
}
