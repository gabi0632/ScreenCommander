import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { getSettings, updateSettings } from './settings.service';

const scryptAsync = promisify(scrypt);

const SCRYPT_KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const DEFAULT_PASSWORD = 'admin';

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const storedKey = Buffer.from(hashHex, 'hex');
  const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}

export async function verifyKioskPassword(
  password: string
): Promise<{ valid: boolean }> {
  const settings = await getSettings();
  const { adminPasswordHash } = settings.kiosk;

  // First use: no hash stored yet, accept default password and persist hash
  if (adminPasswordHash === '') {
    if (password === DEFAULT_PASSWORD) {
      const newHash = await hashPassword(DEFAULT_PASSWORD);
      await updateSettings({
        ...settings,
        kiosk: { ...settings.kiosk, adminPasswordHash: newHash },
      });
      return { valid: true };
    }
    return { valid: false };
  }

  const valid = await verifyPassword(password, adminPasswordHash);
  return { valid };
}

export async function changeKioskPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean }> {
  const { valid } = await verifyKioskPassword(currentPassword);
  if (!valid) {
    return { success: false };
  }

  const settings = await getSettings();
  const newHash = await hashPassword(newPassword);
  await updateSettings({
    ...settings,
    kiosk: { ...settings.kiosk, adminPasswordHash: newHash },
  });

  return { success: true };
}
