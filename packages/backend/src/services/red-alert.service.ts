import { WS_EVENTS } from '@screen-commander/shared';
import { getIO } from '../ws/gateway';
import { createMessage } from './messages.service';
import { getSettings } from './settings.service';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';

// Known Pikud HaOref alert categories
const ALERT_CATEGORIES: Record<number, string> = {
  1: 'ירי רקטות וטילים',
  2: 'חדירת כלי טיס עוין',
  3: 'רעידת אדמה',
  4: 'צונאמי',
  5: 'חומרים מסוכנים',
  6: 'חדירת מחבלים',
  7: 'התרעה מקדימה',
  13: 'אירוע רדיולוגי',
  14: 'התרעה מקדימה',
};

// Categories that should trigger alerts
const ALERTABLE_CATEGORIES = new Set([1, 2, 6, 7, 14]);

const OREF_URL = 'https://www.oref.org.il/WarningMessages/alert/alerts.json';
const OREF_HEADERS = {
  'Referer': 'https://www.oref.org.il/',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const DEDUP_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface OrefAlert {
  id: string;
  cat: string;
  title: string;
  data: string[];
  desc: string;
}

interface RedAlertStatus {
  enabled: boolean;
  connected: boolean;
  lastAlertAt: string | null;
  alertCount: number;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let dedupCleanupTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let lastPollSuccess = false;

const processedAlerts = new Map<string, number>();
let lastAlertAt: string | null = null;
let alertCount = 0;

function cleanupDedup(): void {
  const now = Date.now();
  for (const [id, timestamp] of processedAlerts) {
    if (now - timestamp > DEDUP_TTL_MS) {
      processedAlerts.delete(id);
    }
  }
}

async function getTargetDisplayIds(configured: string[] | 'all'): Promise<string[]> {
  if (configured === 'all') {
    const displays = await prisma.display.findMany({
      where: { isEnabled: true, isPrimary: false },
      select: { id: true },
    });
    return displays.map((d) => d.id);
  }
  return configured;
}

async function handleAlert(alert: OrefAlert): Promise<void> {
  const cat = parseInt(alert.cat, 10);
  if (!ALERTABLE_CATEGORIES.has(cat)) return;

  // data can be a string[] or sometimes a single string
  const cities = Array.isArray(alert.data) ? alert.data : [alert.data];
  if (cities.length === 0) return;

  // Deduplication key: combine id + cities
  const dedupKey = alert.id ?? `${alert.cat}-${cities.join(',')}`;
  if (processedAlerts.has(dedupKey)) return;
  processedAlerts.set(dedupKey, Date.now());

  const settings = await getSettings();
  const config = settings.redAlert;
  if (!config?.enabled) return;

  // Filter for watched cities
  const matchedCities = cities.filter((city) =>
    config.watchedCities.some((watched) => city.includes(watched) || watched.includes(city)),
  );

  if (matchedCities.length === 0) return;

  const alertTitle = alert.title || ALERT_CATEGORIES[cat] || 'התרעה';
  logger.info(`Alert: ${alertTitle} for ${matchedCities.join(', ')}`);

  const text = config.messageTemplate
    .replace('{cities}', matchedCities.join(', '))
    .replace('{type}', alertTitle);

  const targetDisplayIds = await getTargetDisplayIds(config.targetDisplayIds);
  if (targetDisplayIds.length === 0) {
    logger.warn('Red Alert: no target displays available');
    return;
  }

  try {
    await createMessage({
      text,
      targetDisplayIds,
      position: config.position as 'top' | 'bottom' | 'center' | 'ticker',
      fontSize: config.fontSize,
      fontColor: config.fontColor,
      backgroundColor: config.backgroundColor,
      animation: config.animation as 'fade-in' | 'slide-up' | 'slide-left' | 'typewriter',
      displayDuration: config.displayDuration,
      priority: 'emergency',
      source: 'red-alert',
      imageSize: 50,
    });

    lastAlertAt = new Date().toISOString();
    alertCount++;

    const io = getIO();
    io.to('dashboard').emit(WS_EVENTS.RED_ALERT_TRIGGERED, {
      cities: matchedCities,
      alertType: alertTitle,
      category: String(cat),
      timestamp: lastAlertAt,
    });

    logger.info(`Alert message sent to ${targetDisplayIds.length} displays`);
  } catch (err) {
    logger.error(`Alert: failed to create message — ${String(err)}`);
  }
}

async function pollAlerts(): Promise<void> {
  if (!isRunning) return;
  try {
    const response = await fetch(OREF_URL, { headers: OREF_HEADERS });

    if (!response.ok) {
      if (lastPollSuccess) logger.warn(`Oref API returned ${response.status}`);
      lastPollSuccess = false;
      return;
    }

    const text = await response.text();
    const trimmed = text.trim();

    // Empty response = no active alerts
    if (!trimmed || trimmed === '[]' || trimmed === '{}' || trimmed.length < 3) {
      lastPollSuccess = true;
      return;
    }

    let alerts: OrefAlert | OrefAlert[];
    try {
      alerts = JSON.parse(trimmed) as OrefAlert | OrefAlert[];
    } catch {
      logger.warn('Oref API returned non-JSON response');
      return;
    }

    lastPollSuccess = true;

    // The API returns either a single object or an array
    const alertList = Array.isArray(alerts) ? alerts : [alerts];

    for (const alert of alertList) {
      await handleAlert(alert);
    }
  } catch (err) {
    if (lastPollSuccess) logger.warn(`Oref poll error: ${String(err)}`);
    lastPollSuccess = false;
  }
}

export async function startRedAlertService(): Promise<void> {
  const settings = await getSettings();
  const config = settings.redAlert;

  if (!config?.enabled) {
    logger.info('Red Alert: service disabled');
    return;
  }

  isRunning = true;
  lastPollSuccess = true;

  // Start polling
  pollTimer = setInterval(() => void pollAlerts(), POLL_INTERVAL_MS);

  // Start dedup cleanup
  dedupCleanupTimer = setInterval(cleanupDedup, 5 * 60 * 1000);

  // Initial poll
  void pollAlerts();

  logger.info(`Red Alert: polling oref.org.il every ${POLL_INTERVAL_MS}ms, watching: ${config.watchedCities.join(', ')}`);
}

export function stopRedAlertService(): void {
  isRunning = false;

  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (dedupCleanupTimer) {
    clearInterval(dedupCleanupTimer);
    dedupCleanupTimer = null;
  }

  processedAlerts.clear();
  logger.info('Red Alert: service stopped');
}

export async function restartRedAlertService(): Promise<void> {
  stopRedAlertService();
  await startRedAlertService();
}

export function getRedAlertStatus(): RedAlertStatus {
  return {
    enabled: isRunning,
    connected: isRunning && lastPollSuccess,
    lastAlertAt,
    alertCount,
  };
}

export async function sendTestAlert(alertType?: string): Promise<void> {
  const settings = await getSettings();
  const config = settings.redAlert;

  const typeName = alertType ?? 'ירי רקטות וטילים';
  const text = (config?.messageTemplate ?? '🚨 {type}: {cities}')
    .replace('{cities}', config?.watchedCities.join(', ') ?? 'צפת')
    .replace('{type}', typeName);

  const targetDisplayIds = await getTargetDisplayIds(config?.targetDisplayIds ?? 'all');
  if (targetDisplayIds.length === 0) {
    throw new Error('No target displays available');
  }

  await createMessage({
    text,
    targetDisplayIds,
    position: (config?.position ?? 'top') as 'top' | 'bottom' | 'center' | 'ticker',
    fontSize: config?.fontSize ?? 48,
    fontColor: config?.fontColor ?? '#FFFFFF',
    backgroundColor: config?.backgroundColor ?? '#CC0000',
    animation: (config?.animation ?? 'fade-in') as 'fade-in' | 'slide-up' | 'slide-left' | 'typewriter',
    displayDuration: config?.displayDuration ?? 120,
    priority: 'emergency',
    source: 'red-alert',
    imageSize: 50,
  });

  const io = getIO();
  io.to('dashboard').emit(WS_EVENTS.RED_ALERT_TRIGGERED, {
    cities: config?.watchedCities ?? ['צפת'],
    alertType: typeName,
    timestamp: new Date().toISOString(),
    isTest: true,
  });
}
