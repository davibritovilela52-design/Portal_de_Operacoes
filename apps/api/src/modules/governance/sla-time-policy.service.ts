import { Injectable } from '@nestjs/common';

@Injectable()
export class SlaTimePolicyService {
  captureSnapshot(input: { openedAt: Date; timezone: string }): {
    openedAt: Date;
    timezone: string;
  } {
    return {
      openedAt: input.openedAt,
      timezone: input.timezone
    };
  }

  evaluateAgainstSnapshot(
    snapshot: { openedAt: Date; timezone: string },
    input: { currentTimezone: string; thresholdHours: number }
  ): {
    timezoneUsed: string;
    thresholdHours: number;
  } {
    return {
      timezoneUsed: snapshot.timezone,
      thresholdHours: input.thresholdHours
    };
  }
}
