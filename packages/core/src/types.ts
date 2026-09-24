export type Mode = "manual" | "auto" | "plan";

export interface NadarConfig {
  model: string;
  mode: Mode;
  maxToolIterationsPerTurn: number;
  bashTimeoutMs: number;
  autoApproveTools: string[]; // tool names that never need confirmation, even in manual mode
  siteUrl: string;
  appName: string;
}

export interface ToolParamSchema {
  type: string;
  properties: Record<string, unknown>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParamSchema;
  mutating: boolean; // true if it can change the filesystem or run arbitrary commands
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: OpenRouterToolCall[];
}

export interface OpenRouterToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenRouterChoice {
  message: {
    role: string;
    content: string | null;
    tool_calls?: OpenRouterToolCall[];
  };
  finish_reason: string;
}

export interface OpenRouterResponse {
  id?: string;
  choices: OpenRouterChoice[];
  error?: { message: string; code?: number | string };
}

export interface ToolExecutionContext {
  cwd: string;
  config: NadarConfig;
}

export interface ToolResult {
  ok: boolean;
  output: string;
}
