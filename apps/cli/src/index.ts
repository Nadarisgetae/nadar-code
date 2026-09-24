#!/usr/bin/env node
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import chalk from "chalk";
import { 
  loadConfig, loadKeys, resolveKeysPath, saveConfig, 
  KeyManager, Agent, ApprovalProvider, EventBus 
} from "@nadar-code/core";
import { handleCommand } from "./commands.js";
import * as ui from "./ui.js";

async function main() {
  const cwd = process.cwd();
  const config = loadConfig();
  const keysPath = resolveKeysPath(cwd);
  const rawKeys = loadKeys(keysPath);

  if (rawKeys.length === 0) {
    ui.printError(
      `No API keys found. Edit ${keysPath} and add at least one OpenRouter key (one per line), then restart.`
    );
    process.exit(1);
  }

  const keyManager = new KeyManager(rawKeys);
  const rl = readline.createInterface({ input: stdin, output: stdout });
  
  const approvalProvider: ApprovalProvider = {
    async request(toolName: string, argsSummary: string) {
      const answer = (
        await rl.question(
          chalk.yellow(`\nAllow "${toolName}"${argsSummary ? ` (${argsSummary})` : ""}? `) +
            chalk.dim("[y]es / [n]o / [a]lways for this session: ")
        )
      )
        .trim()
        .toLowerCase();
      
      if (answer === "a" || answer === "always") return "always";
      if (answer === "y" || answer === "yes" || answer === "") return "yes";
      return "no";
    }
  };

  const eventBus = new EventBus();
  eventBus.subscribe((event) => {
    switch (event.type) {
      case "agent:thinking":
        break; // could print a spinner here in future
      case "agent:message":
        ui.printAssistant(event.content);
        break;
      case "tool:call":
        ui.printToolCall(event.name, event.args);
        break;
      case "tool:diff":
        ui.printDiff(event.before, event.after);
        break;
      case "tool:result":
        ui.printToolResult(event.ok, event.output);
        break;
      case "system:message":
        ui.printSystem(event.message);
        break;
      case "system:error":
        ui.printError(event.message);
        break;
    }
  });

  const agent = new Agent(keyManager, config, cwd, eventBus, approvalProvider);
  await agent.init();

  ui.banner(config.model, config.mode, rawKeys.length);

  process.on("SIGINT", () => {
    console.log(chalk_dim("\nBye."));
    rl.close();
    process.exit(0);
  });

  for (;;) {
    let input: string;
    try {
      input = await rl.question(prompt(config.mode));
    } catch {
      break; // stdin closed
    }
    if (!input.trim()) continue;

    const commandResult = await handleCommand(input, { agent, keyManager, config, cwd });
    if (commandResult === "exit") break;
    if (commandResult === "handled") continue;

    await agent.runTurn(input);
  }

  saveConfig(config);
  rl.close();
}

function prompt(mode: string): string {
  const tag = mode === "plan" ? "plan" : mode === "auto" ? "auto" : "manual";
  return `\n[${tag}] nadar> `;
}

function chalk_dim(s: string): string {
  return `\x1b[2m${s}\x1b[0m`;
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
