import { resolve } from 'path';

/** packages/backend root */
export const BACKEND_ROOT = resolve(__dirname, '..', '..');

/** Project root (monorepo) */
export const PROJECT_ROOT = resolve(BACKEND_ROOT, '..', '..');

/** scripts/ directory at project root */
export const SCRIPTS_DIR = resolve(PROJECT_ROOT, 'scripts');
