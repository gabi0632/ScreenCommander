import minimist from 'minimist';
import { z } from 'zod';
import type { PlayerConfig } from '@screen-commander/shared';
import { DEFAULTS } from '@screen-commander/shared';

const cliSchema = z.object({
  'display-id': z.string().min(1),
  'monitor-index': z.coerce.number().int().min(0),
  'backend-url': z.string().min(1).default(DEFAULTS.WS_URL),
  fullscreen: z.coerce.boolean().default(true),
  'no-cursor': z.coerce.boolean().default(true),
  kiosk: z.coerce.boolean().default(true),
  debug: z.coerce.boolean().default(false),
});

export function parseCliArgs(argv: string[]): PlayerConfig {
  // electron-vite passes args after '--', find them
  const separatorIndex = argv.indexOf('--');
  const args = separatorIndex >= 0 ? argv.slice(separatorIndex + 1) : argv.slice(2);
  const raw = minimist(args);
  const parsed = cliSchema.parse(raw);

  return {
    displayId: parsed['display-id'],
    monitorIndex: parsed['monitor-index'],
    backendUrl: parsed['backend-url'],
    fullscreen: parsed.fullscreen,
    noCursor: parsed['no-cursor'],
    kiosk: parsed.kiosk,
    debug: parsed.debug,
  };
}
