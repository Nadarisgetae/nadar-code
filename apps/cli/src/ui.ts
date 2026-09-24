import chalk from "chalk";
import { diffLines } from "diff";

export function banner(model: string, mode: string, keyCount: number): void {
  console.log(chalk.bold.cyan("\n  Nadar Code") + chalk.dim("  -- your own Claude-Code-style agent, on OpenRouter\n"));
  console.log(chalk.dim(`  model: `) + chalk.white(model));
  console.log(chalk.dim(`  mode:  `) + chalk.white(mode));
  console.log(chalk.dim(`  keys:  `) + chalk.white(String(keyCount)) + chalk.dim(" loaded"));
  console.log(chalk.dim("  type /help for commands, /mode to switch modes, /exit to quit\n"));
}

export function printAssistant(text: string): void {
  if (!text.trim()) return;
  console.log(chalk.greenBright("\nNadar") + chalk.dim(" > ") + text.trim() + "\n");
}

export function printToolCall(name: string, args: Record<string, unknown>): void {
  const summary = summarizeArgs(name, args);
  console.log(chalk.yellow(`\n  * ${name}`) + chalk.dim(summary ? `  ${summary}` : ""));
}

export function printToolResult(ok: boolean, output: string): void {
  const color = ok ? chalk.dim : chalk.red;
  const lines = output.split("\n");
  const preview = lines.slice(0, 12).join("\n");
  console.log(color(indent(preview)));
  if (lines.length > 12) console.log(chalk.dim(`    ... (${lines.length - 12} more lines)`));
}

export function printDiff(before: string, after: string): void {
  const parts = diffLines(before, after);
  for (const part of parts) {
    const color = part.added ? chalk.green : part.removed ? chalk.red : chalk.dim;
    const prefix = part.added ? "+ " : part.removed ? "- " : "  ";
    const text = part.value
      .split("\n")
      .filter((l, i, arr) => !(i === arr.length - 1 && l === ""))
      .map((l) => prefix + l)
      .join("\n");
    console.log(color(text));
  }
}

export function printError(msg: string): void {
  console.log(chalk.red(`\nError: ${msg}\n`));
}

export function printSystem(msg: string): void {
  console.log(chalk.dim(msg));
}

function indent(s: string): string {
  return s
    .split("\n")
    .map((l) => "    " + l)
    .join("\n");
}

function summarizeArgs(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "read_file":
    case "write_file":
    case "list_dir":
      return String(args.path ?? "");
    case "edit_file":
      return String(args.path ?? "");
    case "glob_search":
      return String(args.pattern ?? "");
    case "grep_search":
      return String(args.pattern ?? "");
    case "run_bash":
      return String(args.command ?? "");
    default:
      return "";
  }
}
