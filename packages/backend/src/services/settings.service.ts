import type { AppSettings } from '@screen-commander/shared';
import { DEFAULT_SETTINGS } from '@screen-commander/shared';
import { prisma } from '../prisma';
import { restartRedAlertService } from './red-alert.service';

export async function getSettings(): Promise<AppSettings> {
  const record = await prisma.appSettings.findUnique({
    where: { id: 'singleton' },
  });

  if (!record) {
    // Create default settings
    await prisma.appSettings.create({
      data: {
        id: 'singleton',
        data: JSON.stringify(DEFAULT_SETTINGS),
      },
    });
    return DEFAULT_SETTINGS;
  }

  return { ...DEFAULT_SETTINGS, ...JSON.parse(record.data) } as AppSettings;
}

export async function updateSettings(settings: AppSettings): Promise<AppSettings> {
  await prisma.appSettings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      data: JSON.stringify(settings),
    },
    update: {
      data: JSON.stringify(settings),
    },
  });

  // Restart alert service if config may have changed
  void restartRedAlertService();

  return settings;
}

export async function exportSettings(): Promise<{
  settings: AppSettings;
  exportedAt: string;
  version: string;
}> {
  const settings = await getSettings();
  return {
    settings,
    exportedAt: new Date().toISOString(),
    version: '0.1.0',
  };
}

export async function importSettings(data: {
  settings: AppSettings;
}): Promise<AppSettings> {
  return updateSettings(data.settings);
}

export async function resetSettings(): Promise<AppSettings> {
  return updateSettings(DEFAULT_SETTINGS);
}
