import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { Agent, KeyManager, listFreeModels, shortDescription, formatContext, saveConfig, Mode, NadarConfig, listDir } from "@nadar-code/core";
import * as ui from "./ui.js";

const HELP = `
Commands:
  /help              Show this help
  /mode [name]        Show or set mode: manual | auto | plan
  /model [slug]        Show or set the OpenRouter model, e.g. /model qwen/qwen3-coder:free
  /models              Fetch and list currently available free (:free) models on OpenRouter
  /keys                Show status of your loaded API keys and which one is active
  /init                Scan the project and write NADAR.md with basic context for the agent
  /clear               Clear conversation history (keeps mode/model)
  /exit, /quit          Exit Nadar Code

Modes:
  manual  - asks for approval before file edits or shell commands (default, safest)
  auto    - runs tool calls automatically, no per-step confirmation
  plan    - read-only: the agent may only inspect the project and must propose a plan
`;

export interface CommandContext {
  agent: Agent;
  keyManager: KeyManager;
  config: NadarConfig;
  cwd: string;
}

/** Returns true if the input was handled as a command (whether or not it should exit). */
export async function handleCommand(input: string, ctx: CommandContext): Promise<"handled" | "exit" | false> {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return false;

  const [cmd, ...rest] = trimmed.slice(1).split(/\s+/);
  const arg = rest.join(" ").trim();

  switch (cmd) {
    case "help":
      console.log(HELP);
      return "handled";

    case "exit":
    case "quit":
      return "exit";

    case "clear":
      ctx.agent.clearHistory();
      ui.printSystem("Conversation history cleared.");
      return "handled";

    case "mode": {
      if (!arg) {
        ui.printSystem(`Current mode: ${ctx.config.mode}`);
        return "handled";
      }
      if (!["manual", "auto", "plan"].includes(arg)) {
        ui.printError(`Unknown mode "${arg}". Use manual, auto, or plan.`);
        return "handled";
      }
      ctx.config.mode = arg as Mode;
      ctx.agent.resetSystemPrompt();
      saveConfig(ctx.config);
      ui.printSystem(`Mode set to ${arg}.`);
      return "handled";
    }

    case "model": {
      if (!arg) {
        ui.printSystem(`Current model: ${ctx.config.model}`);
        return "handled";
      }
      ctx.config.model = arg;
      saveConfig(ctx.config);
      ui.printSystem(`Model set to ${arg}.`);
      return "handled";
    }

    case "models": {
      ui.printSystem("Fetching FREE models from OpenRouter (this may take a moment)...");
      try {
        const models = await listFreeModels();
        if (!models.length) {
          ui.printSystem("No free models returned. Check openrouter.ai/models manually.");
        } else {
          console.log("");
          for (const m of models) {
            const isCurrent = m.id === ctx.config.model;
            const prefix = isCurrent ? chalk.green("▶ ") : "  ";
            // Line 1: model name + id + context
            const namePart = m.name ? chalk.bold(m.name) : "";
            const idPart   = chalk.cyan(m.id);
            const ctxPart  = m.context_length ? chalk.dim(` · ${formatContext(m.context_length)}`) : "";
            const freeBadge = chalk.green(" [FREE]");
            console.log(`${prefix}${namePart}`);
            console.log(`     ${idPart}${ctxPart}${freeBadge}`);
            // Line 2: description (first sentence, max 100 chars)
            const desc = shortDescription(m.description);
            if (desc) {
              console.log(`     ${chalk.dim(desc)}`);
            }
            console.log("");
          }
          ui.printSystem(`${models.length} free models listed. Switch with: /model <slug>`);
          if (ctx.config.model) {
            ui.printSystem(`Current: ${ctx.config.model}`);
          }
        }
      } catch (err) {
        ui.printError((err as Error).message);
      }
      return "handled";
    }

    case "keys":
      console.log(ctx.keyManager.status());
      return "handled";

    case "init": {
      const listing = listDir(ctx.cwd, ".");
      let pkgInfo = "";
      const pkgPath = path.join(ctx.cwd, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
          pkgInfo = `\n\nName: ${pkg.name ?? "?"}\nDescription: ${pkg.description ?? "?"}\nMain deps: ${Object.keys(pkg.dependencies ?? {}).join(", ") || "none"}`;
        } catch {
          /* ignore malformed package.json */
        }
      }
      const content = `# Project notes for Nadar Code\n\nTop-level contents of ${ctx.cwd}:\n\n${listing.output}${pkgInfo}\n\n(Edit this file freely -- Nadar Code loads it as context on every run.)\n`;
      fs.writeFileSync(path.join(ctx.cwd, "NADAR.md"), content, "utf-8");
      ctx.agent.resetSystemPrompt();
      ui.printSystem("Wrote NADAR.md with basic project context.");
      return "handled";
    }

    case "mcp": {
      if (!arg.startsWith("start ")) {
        ui.printError("Usage: /mcp start <name> <command> [args...]");
        return "handled";
      }
      const parts = arg.slice(6).trim().split(/\s+/);
      const serverName = parts[0];
      const command = parts[1];
      const mcpArgs = parts.slice(2);
      
      if (!serverName || !command) {
        ui.printError("Usage: /mcp start <name> <command> [args...]");
        return "handled";
      }

      ui.printSystem(`Starting MCP server "${serverName}" via: ${command} ${mcpArgs.join(" ")}...`);
      try {
        await ctx.agent.mcpManager.startServer(serverName, command, mcpArgs);
        ui.printSystem(`MCP server "${serverName}" connected. Registered tools:`);
        const tools = ctx.agent.mcpManager.getMcpTools().filter(t => t.name.startsWith(`mcp__${serverName}__`));
        for (const t of tools) {
          console.log(`  - ${t.name}`);
        }
      } catch (err: any) {
        ui.printError(`Failed to start MCP server: ${err.message}`);
      }
      return "handled";
    }

    default:
      ui.printError(`Unknown command: /${cmd}. Try /help.`);
      return "handled";
  }
}
