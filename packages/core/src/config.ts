import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { NadarConfig } from "./types.js";

export const HOME_DIR = path.join(os.homedir(), ".nadar-code");
export const DEFAULT_KEYS_PATH = path.join(HOME_DIR, "keys.txt");
export const DEFAULT_CONFIG_PATH = path.join(HOME_DIR, "config.json");

const DEFAULT_CONFIG: NadarConfig = {
  // Coding-oriented free model as of build time. Free model slugs on OpenRouter
  // change often -- run `/models` inside Nadar Code to fetch the live list and
  // `/model <slug>` to switch.
  model: "qwen/qwen3-coder:free",
  mode: "manual",
  maxToolIterationsPerTurn: 25,
  bashTimeoutMs: 60_000,
  autoApproveTools: ["read_file", "list_dir", "glob_search", "grep_search"],
  siteUrl: "https://github.com/nadar-code/nadar-code",
  appName: "Nadar Code",
};

function ensureHomeDir(): void {
  if (!fs.existsSync(HOME_DIR)) {
    fs.mkdirSync(HOME_DIR, { recursive: true });
  }
}

/**
 * Resolve where the keys file lives, in priority order:
 *   1. $NADAR_KEYS_FILE env var
 *   2. ./keys.txt in the current project directory
 *   3. ~/.nadar-code/keys.txt (created with a template if missing)
 */
export function resolveKeysPath(cwd: string): string {
  if (process.env.NADAR_KEYS_FILE && fs.existsSync(process.env.NADAR_KEYS_FILE)) {
    return process.env.NADAR_KEYS_FILE;
  }
  const local = path.join(cwd, "keys.txt");
  if (fs.existsSync(local)) return local;

  ensureHomeDir();
  if (!fs.existsSync(DEFAULT_KEYS_PATH)) {
    fs.writeFileSync(
      DEFAULT_KEYS_PATH,
      [
        "# Nadar Code -- OpenRouter API keys, one per line.",
        "# Lines starting with # are ignored. Blank lines are ignored.",
        "# Get keys at https://openrouter.ai/keys -- you can add several",
        "# (e.g. from different free accounts) and Nadar Code will rotate",
        "# to the next one automatically whenever one hits a rate limit,",
        "# runs out of credits, or is rejected.",
        "#",
        "# sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      ].join("\n") + "\n"
    );
  }
  return DEFAULT_KEYS_PATH;
}

export function loadKeys(keysPath: string): string[] {
  if (!fs.existsSync(keysPath)) return [];
  const lines = fs.readFileSync(keysPath, "utf-8").split(/\r?\n/);
  return lines
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}

export function loadConfig(): NadarConfig {
  ensureHomeDir();
  if (!fs.existsSync(DEFAULT_CONFIG_PATH)) {
    fs.writeFileSync(DEFAULT_CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(DEFAULT_CONFIG_PATH, "utf-8"));
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: NadarConfig): void {
  ensureHomeDir();
  fs.writeFileSync(DEFAULT_CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}
