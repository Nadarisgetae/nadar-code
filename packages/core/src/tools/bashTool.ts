import { exec } from "node:child_process";
import { ToolResult } from "../types.js";

const MAX_OUTPUT_CHARS = 8000;

export function runBash(cwd: string, command: string, timeoutMs: number): Promise<ToolResult> {
  return new Promise((resolve) => {
    exec(
      command,
      { cwd, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024, shell: process.platform === "win32" ? undefined : "/bin/bash" },
      (error, stdout, stderr) => {
        let output = "";
        if (stdout) output += stdout;
        if (stderr) output += (output ? "\n--- stderr ---\n" : "") + stderr;
        if (output.length > MAX_OUTPUT_CHARS) {
          output = output.slice(0, MAX_OUTPUT_CHARS) + `\n... (truncated, ${output.length - MAX_OUTPUT_CHARS} more chars)`;
        }
        if (error) {
          const timedOut = (error as { killed?: boolean; signal?: string }).signal === "SIGTERM";
          resolve({
            ok: false,
            output: `${timedOut ? `Command timed out after ${timeoutMs}ms.\n` : ""}Exit code ${error.code ?? "?"}\n${output}`,
          });
        } else {
          resolve({ ok: true, output: output || "(no output)" });
        }
      }
    );
  });
}
