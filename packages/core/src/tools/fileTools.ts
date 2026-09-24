import fs from "node:fs";
import path from "node:path";
import { ToolResult } from "../types.js";

function resolveSafe(cwd: string, target: string): string {
  const abs = path.isAbsolute(target) ? target : path.join(cwd, target);
  return path.normalize(abs);
}

export function readFile(cwd: string, filePath: string, offset = 1, limit = 2000): ToolResult {
  const abs = resolveSafe(cwd, filePath);
  if (!fs.existsSync(abs)) return { ok: false, output: `File not found: ${filePath}` };
  if (fs.statSync(abs).isDirectory()) {
    return { ok: false, output: `${filePath} is a directory, not a file. Use list_dir.` };
  }
  const content = fs.readFileSync(abs, "utf-8");
  const lines = content.split("\n");
  const start = Math.max(0, offset - 1);
  const slice = lines.slice(start, start + limit);
  const numbered = slice.map((l, i) => `${start + i + 1}\t${l}`).join("\n");
  const truncated = start + limit < lines.length ? `\n... (${lines.length - start - limit} more lines)` : "";
  return { ok: true, output: numbered + truncated };
}

export function writeFile(cwd: string, filePath: string, content: string): ToolResult {
  const abs = resolveSafe(cwd, filePath);
  const existed = fs.existsSync(abs);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf-8");
  return { ok: true, output: `${existed ? "Overwrote" : "Created"} ${filePath} (${content.length} bytes)` };
}

export function editFile(
  cwd: string,
  filePath: string,
  oldStr: string,
  newStr: string
): ToolResult {
  const abs = resolveSafe(cwd, filePath);
  if (!fs.existsSync(abs)) return { ok: false, output: `File not found: ${filePath}` };
  const content = fs.readFileSync(abs, "utf-8");
  const occurrences = content.split(oldStr).length - 1;
  if (occurrences === 0) {
    return {
      ok: false,
      output: `old_str was not found in ${filePath}. Nothing was changed. Re-read the file to get exact text.`,
    };
  }
  if (occurrences > 1) {
    return {
      ok: false,
      output: `old_str matches ${occurrences} locations in ${filePath}. Include more surrounding context so it matches exactly once.`,
    };
  }
  const updated = content.replace(oldStr, newStr);
  fs.writeFileSync(abs, updated, "utf-8");
  return { ok: true, output: `Edited ${filePath}` };
}

export function listDir(cwd: string, dirPath: string): ToolResult {
  const abs = resolveSafe(cwd, dirPath || ".");
  if (!fs.existsSync(abs)) return { ok: false, output: `Directory not found: ${dirPath}` };
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  const lines = entries
    .filter((e) => e.name !== "node_modules" && e.name !== ".git")
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
    .sort();
  return { ok: true, output: lines.join("\n") || "(empty directory)" };
}

export function globSearch(cwd: string, pattern: string, dirPath = "."): ToolResult {
  const abs = resolveSafe(cwd, dirPath);
  const regex = globToRegex(pattern);
  const matches: string[] = [];

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const full = path.join(dir, e.name);
      const rel = path.relative(abs, full);
      if (e.isDirectory()) walk(full);
      else if (regex.test(rel)) matches.push(rel);
    }
  }
  walk(abs);
  return { ok: true, output: matches.length ? matches.join("\n") : "(no matches)" };
}

export function grepSearch(cwd: string, pattern: string, dirPath = ".", maxResults = 100): ToolResult {
  const abs = resolveSafe(cwd, dirPath);
  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch (e) {
    return { ok: false, output: `Invalid regex: ${(e as Error).message}` };
  }
  const results: string[] = [];

  function walk(dir: string) {
    if (results.length >= maxResults) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (results.length >= maxResults) return;
      if (e.name === "node_modules" || e.name === ".git") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else {
        let content: string;
        try {
          content = fs.readFileSync(full, "utf-8");
        } catch {
          continue; // binary or unreadable
        }
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            results.push(`${path.relative(abs, full)}:${i + 1}: ${lines[i].trim().slice(0, 200)}`);
            if (results.length >= maxResults) break;
          }
        }
      }
    }
  }
  walk(abs);
  return { ok: true, output: results.length ? results.join("\n") : "(no matches)" };
}

function globToRegex(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i++;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^$()[]{}|\\".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}
