import { ToolDefinition, ToolExecutionContext, ToolResult } from "../types.js";
import { readFile, writeFile, editFile, listDir, globSearch, grepSearch } from "./fileTools.js";
import { runBash } from "./bashTool.js";
import { searchWeb, fetchUrl } from "./webTools.js";

export const TOOL_DEFS: ToolDefinition[] = [
  {
    name: "read_file",
    description: "Read a text file from disk, with line numbers. Use before editing a file.",
    mutating: false,
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file, relative to the project root or absolute." },
        offset: { type: "number", description: "1-based line number to start from. Default 1." },
        limit: { type: "number", description: "Max lines to return. Default 2000." },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create a new file or overwrite an existing file with the given full content.",
    mutating: true,
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file to write." },
        content: { type: "string", description: "Full text content of the file." },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description:
      "Replace an exact snippet of text in an existing file with new text. old_str must match exactly once in the file -- include enough surrounding context (e.g. a full line or two) to make it unique. Prefer this over write_file for small changes.",
    mutating: true,
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file to edit." },
        old_str: { type: "string", description: "Exact existing text to replace. Must appear exactly once." },
        new_str: { type: "string", description: "Text to replace it with." },
      },
      required: ["path", "old_str", "new_str"],
    },
  },
  {
    name: "list_dir",
    description: "List files and subdirectories at a given path.",
    mutating: false,
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path. Default is the project root." },
      },
    },
  },
  {
    name: "glob_search",
    description: "Find files by glob pattern (supports * and **), e.g. '**/*.ts'.",
    mutating: false,
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Glob pattern to match relative file paths against." },
        path: { type: "string", description: "Directory to search from. Default is the project root." },
      },
      required: ["pattern"],
    },
  },
  {
    name: "grep_search",
    description: "Search file contents for a regex pattern, recursively.",
    mutating: false,
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regular expression to search for." },
        path: { type: "string", description: "Directory to search from. Default is the project root." },
      },
      required: ["pattern"],
    },
  },
  {
    name: "run_bash",
    description:
      "Run a shell command in the project directory. Use for running tests, builds, git, installing packages, etc. Avoid destructive commands unless explicitly asked.",
    mutating: true,
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "The shell command to run." },
      },
      required: ["command"],
    },
  },
  {
    name: "search_web",
    description: "Search the web for information using DuckDuckGo. Returns titles, descriptions, and URLs of the top results.",
    mutating: false,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query." },
      },
      required: ["query"],
    },
  },
  {
    name: "fetch_url",
    description: "Fetch the main text content of a webpage.",
    mutating: false,
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL of the webpage to fetch." },
      },
      required: ["url"],
    },
  }
];

export function getToolDef(name: string): ToolDefinition | undefined {
  return TOOL_DEFS.find((t) => t.name === name);
}

/** Tool set available to the model given the current mode. Plan mode strips out mutating tools entirely. */
export function toolsForMode(mode: string): ToolDefinition[] {
  if (mode === "plan") return TOOL_DEFS.filter((t) => !t.mutating);
  return TOOL_DEFS;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  switch (name) {
    case "read_file":
      return readFile(ctx.cwd, String(args.path), Number(args.offset) || 1, Number(args.limit) || 2000);
    case "write_file":
      return writeFile(ctx.cwd, String(args.path), String(args.content ?? ""));
    case "edit_file":
      return editFile(ctx.cwd, String(args.path), String(args.old_str ?? ""), String(args.new_str ?? ""));
    case "list_dir":
      return listDir(ctx.cwd, String(args.path ?? "."));
    case "glob_search":
      return globSearch(ctx.cwd, String(args.pattern), String(args.path ?? "."));
    case "grep_search":
      return grepSearch(ctx.cwd, String(args.pattern), String(args.path ?? "."));
    case "run_bash":
      return runBash(ctx.cwd, String(args.command), ctx.config.bashTimeoutMs);
    case "search_web":
      return searchWeb(String(args.query));
    case "fetch_url":
      return fetchUrl(String(args.url));
    default:
      return { ok: false, output: `Unknown tool: ${name}` };
  }
}
