import { rmSync } from 'node:fs';
import path from 'node:path';

const mode = (process.argv[2] ?? 'all').toLowerCase();
const projectRoot = process.cwd();
const repoRoot = path.normalize(projectRoot).endsWith(`${path.sep}apps${path.sep}web`) ||
  path.normalize(projectRoot).endsWith(`${path.sep}apps${path.sep}api`)
  ? path.resolve(projectRoot, '..', '..')
  : projectRoot;

const targets = {
  api: [path.resolve(repoRoot, 'apps/api/dist')],
  web: [path.resolve(repoRoot, 'apps/web/.next')],
  all: [
    path.resolve(repoRoot, 'apps/api/dist'),
    path.resolve(repoRoot, 'apps/web/.next')
  ]
};

const paths = targets[mode] ?? targets.all;

for (const targetPath of paths) {
  try {
    rmSync(targetPath, { recursive: true, force: true });
    console.log(`[clean-dev-artifacts] removed ${targetPath}`);
  } catch (error) {
    console.error(`[clean-dev-artifacts] failed to remove ${targetPath}`);
    console.error(error);
    process.exitCode = 1;
  }
}
