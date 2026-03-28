import { exec } from 'child_process';

export function execPowerShell(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${script}"`,
      { maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`PowerShell error: ${stderr || error.message}`));
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}
