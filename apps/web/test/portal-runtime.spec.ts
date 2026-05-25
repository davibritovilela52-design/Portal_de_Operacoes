import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('portal runtime rendering', () => {
  it('forces runtime rendering for operational pages backed by live API data', () => {
    const layoutSource = readFileSync(
      resolve(__dirname, '../app/(portal)/layout.tsx'),
      'utf8'
    );

    expect(layoutSource).toContain("export const dynamic = 'force-dynamic'");
  });
});
