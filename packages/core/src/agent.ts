import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { KeyManager } from "./keyManager.js";
import { chatCompletion, RotationExhaustedError } from "./openrouter.js";
import { toolsForMode, getToolDef, executeTool } from "./tools/index.js";
import { checkApproval } from "./modes.js";
import { buildSystemPrompt } from "./systemPrompt.js";
import { ChatMessage, NadarConfig, OpenRouterToolCall } from "./types.js";
import { ApprovalProvider, EventBus } from "./events.js";
import { McpClientManager } from "./mcp/client.js";
import { PluginLoader } from "./plugins/loader.js";

export class Agent {
  private messages: ChatMessage[] = [];
  private cwd: string;
  public mcpManager: McpClientManager;
  public pluginLoader: PluginLoader;

  constructor(
    private keyManager: KeyManager,
    public config: NadarConfig,
    cwd: string,
    private eventBus: EventBus,
    private approvalProvider: ApprovalProvider
  ) {
    this.cwd = cwd;
    this.mcpManager = new McpClientManager();
    const pluginsDir = path.join(os.homedir(), ".nadar-code", "plugins");
    this.pluginLoader = new PluginLoader(this.mcpManager, pluginsDir, this.eventBus);
  }

  async init(): Promise<void> {
    await this.pluginLoader.loadAll();
    this.resetSystemPrompt();
  }

  resetSystemPrompt(): void {
    const notesPath = path.join(this.cwd, "NADAR.md");
    const notes = fs.existsSync(notesPath) ? fs.readFileSync(notesPath, "utf-8") : null;
    let systemPrompt = buildSystemPrompt(this.config.mode, this.cwd, notes);
    
    const skills = this.pluginLoader.getAllSkills();
    if (skills.length > 0) {
      systemPrompt += "\n\n# Loaded Skills:\n" + skills.join("\n\n---\n\n");
    }
    const rest = this.messages.filter((m) => m.role !== "system");
    this.messages = [{ role: "system", content: systemPrompt }, ...rest];
  }

  getHistory(): ChatMessage[] {
    return this.messages;
  }

  setHistory(history: ChatMessage[]): void {
    this.messages = history;
    this.resetSystemPrompt();
  }

  clearHistory(): void {
    this.messages = [];
    this.resetSystemPrompt();
  }

  async runTurn(userInput: string): Promise<void> {
    this.messages.push({ role: "user", content: userInput });

    const builtinTools = toolsForMode(this.config.mode);
    const mcpTools = this.config.mode === "plan" ? [] : this.mcpManager.getMcpTools();
    const tools = [...builtinTools, ...mcpTools];

    for (let iteration = 0; iteration < this.config.maxToolIterationsPerTurn; iteration++) {
      this.eventBus.emit({ type: "agent:thinking" });
      
      let response;
      try {
        response = await chatCompletion(
          this.keyManager,
          this.config.model,
          this.messages,
          tools,
          this.config.siteUrl,
          this.config.appName
        );
      } catch (err) {
        if (err instanceof RotationExhaustedError) {
          this.eventBus.emit({ type: "system:error", message: err.message + "\nAdd more keys to keys.txt, or wait for cooldowns to clear." });
        } else {
          this.eventBus.emit({ type: "system:error", message: (err as Error).message });
        }
        return;
      }

      const choice = response.choices?.[0];
      if (!choice) {
        this.eventBus.emit({ type: "system:error", message: "Empty response from OpenRouter." });
        return;
      }

      const msg = choice.message;
      const toolCalls = msg.tool_calls ?? [];

      if (toolCalls.length === 0) {
        if (msg.content) {
            this.eventBus.emit({ type: "agent:message", content: msg.content });
        }
        this.messages.push({ role: "assistant", content: msg.content ?? "" });
        return;
      }

      // Assistant message that requested tool calls
      this.messages.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: toolCalls,
      });

      if (msg.content && msg.content.trim()) {
        this.eventBus.emit({ type: "agent:message", content: msg.content });
      }

      for (const call of toolCalls) {
        await this.handleToolCall(call);
      }
      // loop continues, feeding tool results back to the model
    }

    this.eventBus.emit({ type: "system:message", message: `(stopped after ${this.config.maxToolIterationsPerTurn} tool iterations -- ask a follow-up to continue)` });
  }

  private async handleToolCall(call: OpenRouterToolCall): Promise<void> {
    const name = call.function.name;
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.function.arguments || "{}");
    } catch {
      const err = `Could not parse arguments as JSON: ${call.function.arguments}`;
      this.eventBus.emit({ type: "system:error", message: err });
      this.pushToolResult(call.id, name, err);
      return;
    }

    const isMcp = name.startsWith("mcp__");
    const toolDef = isMcp 
        ? this.mcpManager.getMcpTools().find(t => t.name === name) 
        : getToolDef(name);

    if (!toolDef) {
      const err = `Unknown tool: ${name}`;
      this.eventBus.emit({ type: "system:error", message: err });
      this.pushToolResult(call.id, name, err);
      return;
    }

    this.eventBus.emit({ type: "tool:call", name, args });

    const argsSummary = typeof args.path === "string" ? args.path : typeof args.command === "string" ? args.command : "";
    const approved = await checkApproval(this.approvalProvider, this.config.mode, toolDef, this.config, argsSummary);
    if (!approved) {
      this.pushToolResult(call.id, name, "User declined to run this tool call.");
      this.eventBus.emit({ type: "system:message", message: "  (skipped)" });
      return;
    }

    // Capture before-state for a nice diff on file edits.
    let before: string | null = null;
    if ((name === "edit_file" || name === "write_file") && typeof args.path === "string") {
      const abs = path.isAbsolute(args.path) ? args.path : path.join(this.cwd, args.path);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        before = fs.readFileSync(abs, "utf-8");
      }
    }

    let ok = true;
    let output = "";
    
    try {
      if (isMcp) {
        output = await this.mcpManager.callTool(name, args);
      } else {
        const result = await executeTool(name, args, { cwd: this.cwd, config: this.config });
        ok = result.ok;
        output = result.output;
      }
    } catch (err: any) {
      ok = false;
      output = err.message || String(err);
    }

    if (before !== null && ok && typeof args.path === "string") {
      const abs = path.isAbsolute(args.path) ? args.path : path.join(this.cwd, args.path);
      const after = fs.existsSync(abs) ? fs.readFileSync(abs, "utf-8") : "";
      this.eventBus.emit({ type: "tool:diff", before, after });
    }

    this.eventBus.emit({ type: "tool:result", ok, output });
    this.pushToolResult(call.id, name, output);
  }

  private pushToolResult(toolCallId: string, name: string, content: string): void {
    this.messages.push({ role: "tool", content, tool_call_id: toolCallId, name });
  }
}
