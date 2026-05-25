import { Injectable } from '@nestjs/common';

@Injectable()
export class RetentionGovernanceService {
  evaluateRetention(input: {
    createdAt: Date;
    now: Date;
    hasLegalException: boolean;
  }): {
    action: 'ANONYMIZE' | 'RETAIN';
    retentionYears: 5;
  } {
    const elapsedYears =
      (input.now.getTime() - input.createdAt.getTime()) / (365 * 24 * 60 * 60 * 1000);
    const expired = elapsedYears >= 5;

    return {
      action: expired && !input.hasLegalException ? 'ANONYMIZE' : 'RETAIN',
      retentionYears: 5
    };
  }
}
