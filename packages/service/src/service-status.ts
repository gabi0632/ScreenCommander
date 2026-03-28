import { exec } from 'child_process';

interface ServiceInfo {
  Status: number;
  Name: string;
  DisplayName: string;
}

const SERVICE_NAME = 'screencommanderbackend';

const STATUS_MAP: Record<number, string> = {
  1: 'Stopped',
  2: 'StartPending',
  3: 'StopPending',
  4: 'Running',
  5: 'ContinuePending',
  6: 'PausePending',
  7: 'Paused',
};

function getStatusLabel(code: number): string {
  return STATUS_MAP[code] ?? `Unknown (${String(code)})`;
}

const psCommand = [
  `Get-Service -Name '${SERVICE_NAME}' -ErrorAction SilentlyContinue`,
  `| Select-Object Status, Name, DisplayName`,
  `| ConvertTo-Json`,
].join(' ');

console.log('=== ScreenCommander Service Status ===');
console.log('');

exec(
  `powershell -NoProfile -Command "${psCommand}"`,
  (error, stdout, stderr) => {
    if (error) {
      console.error('[ERROR] Failed to query service status:', error.message);
      if (stderr) {
        console.error('stderr:', stderr);
      }
      process.exit(1);
    }

    const trimmed = stdout.trim();

    if (!trimmed) {
      console.log('[INFO] Service not installed.');
      console.log(`No Windows service found with name "${SERVICE_NAME}".`);
      console.log('');
      console.log('To install the service, run:');
      console.log('  pnpm --filter @screen-commander/service install-service');
      process.exit(0);
    }

    try {
      const info = JSON.parse(trimmed) as ServiceInfo;
      const statusLabel = getStatusLabel(info.Status);

      console.log(`Service Name:    ${info.Name}`);
      console.log(`Display Name:    ${info.DisplayName}`);
      console.log(`Status:          ${statusLabel}`);
      console.log('');

      if (info.Status === 4) {
        console.log('The ScreenCommander backend is running as a Windows service.');
      } else if (info.Status === 1) {
        console.log('The service is installed but currently stopped.');
        console.log('You can start it from Services (services.msc) or by reinstalling.');
      } else {
        console.log(`The service is in a transitional state: ${statusLabel}`);
      }
    } catch (parseError: unknown) {
      const message = parseError instanceof Error ? parseError.message : String(parseError);
      console.error('[ERROR] Failed to parse service info:', message);
      console.error('Raw output:', trimmed);
      process.exit(1);
    }
  },
);
