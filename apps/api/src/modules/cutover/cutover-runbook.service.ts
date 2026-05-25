import { Injectable } from '@nestjs/common';

@Injectable()
export class CutoverRunbookService {
  buildRunbook(input: {
    freezeHours: number;
    checkpointHours: number[];
    futureAgendaDaysMigrated: number;
  }): {
    freezeHours: number;
    checkpoints: string[];
    futureAgendaDaysMigrated: number;
    ready: boolean;
  } {
    return {
      freezeHours: input.freezeHours,
      checkpoints: input.checkpointHours.map((hour) => `T+${hour}h`),
      futureAgendaDaysMigrated: input.futureAgendaDaysMigrated,
      ready:
        input.freezeHours >= 12 &&
        input.futureAgendaDaysMigrated >= 90 &&
        input.checkpointHours.join(',') === '1,4,24'
    };
  }
}
