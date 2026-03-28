import { net } from 'electron';

interface BackendStatus {
  status: 'waiting' | 'ready' | 'error';
  message: string;
}

type StatusCallback = (status: BackendStatus) => void;

export async function waitForBackend(
  backendUrl: string,
  timeoutMs: number,
  onStatus?: StatusCallback,
): Promise<void> {
  const healthUrl = `${backendUrl}/api/system/health`;
  const pollIntervalMs = 2000;
  const startTime = Date.now();

  console.log(`[health] Polling ${healthUrl} (timeout: ${timeoutMs}ms)`);
  onStatus?.({ status: 'waiting', message: 'מחכה לשרת...' });

  while (Date.now() - startTime < timeoutMs) {
    try {
      const ok = await checkHealth(healthUrl);
      if (ok) {
        console.log('[health] Backend is ready!');
        onStatus?.({ status: 'ready', message: 'השרת מוכן' });
        return;
      }
    } catch (err) {
      console.log('[health] Poll failed:', (err as Error).message);
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    onStatus?.({
      status: 'waiting',
      message: `מחכה לשרת... (${elapsed} שניות)`,
    });

    await sleep(pollIntervalMs);
  }

  throw new Error(`Backend did not become ready within ${timeoutMs}ms`);
}

function checkHealth(url: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const request = net.request(url);
    const timeout = setTimeout(() => {
      request.abort();
      reject(new Error('Request timed out'));
    }, 5000);

    request.on('response', (response) => {
      clearTimeout(timeout);
      resolve(response.statusCode === 200);
      // Consume the response body to avoid memory leaks
      response.on('data', () => { /* drain */ });
    });

    request.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    request.end();
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
