import { Mode, NadarConfig, ToolDefinition } from "./types.js";
import { ApprovalProvider } from "./events.js";

const alwaysApproved = new Set<string>();

export function resetSessionApprovals(): void {
  alwaysApproved.clear();
}

/**
 * Decides whether a tool call needs interactive confirmation, and if so, asks.
 * Returns true if the tool call should proceed.
 */
export async function checkApproval(
  approvalProvider: ApprovalProvider,
  mode: Mode,
  tool: ToolDefinition,
  config: NadarConfig,
  argsSummary: string
): Promise<boolean> {
  if (!tool.mutating) return true;
  if (mode === "auto") return true;
  if (mode === "plan") return false; // model shouldn't call these; safety net
  if (config.autoApproveTools.includes(tool.name)) return true;
  if (alwaysApproved.has(tool.name)) return true;

  const answer = await approvalProvider.request(tool.name, argsSummary);

  if (answer === "always") {
    alwaysApproved.add(tool.name);
    return true;
  }
  return answer === "yes";
}
