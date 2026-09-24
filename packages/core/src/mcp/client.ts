import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ToolDefinition } from "../types.js";

export class McpClientManager {
  private clients: Map<string, Client> = new Map();
  private tools: ToolDefinition[] = [];

  async startServer(serverName: string, command: string, args: string[], env?: Record<string, string>) {
    const mergedEnv: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
        if (v !== undefined) mergedEnv[k] = v;
    }
    if (env) {
        for (const [k, v] of Object.entries(env)) {
            mergedEnv[k] = v;
        }
    }

    const transport = new StdioClientTransport({
      command,
      args,
      env: mergedEnv
    });

    const client = new Client({ name: "nadar-code", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);

    this.clients.set(serverName, client);
    await this.refreshTools();
  }

  async refreshTools() {
    this.tools = [];
    for (const [serverName, client] of this.clients.entries()) {
      const result = await client.listTools();
      for (const t of result.tools) {
        // Namespace the tool to avoid collisions
        const mcpName = `mcp__${serverName}__${t.name}`;
        this.tools.push({
          name: mcpName,
          description: t.description ?? "",
          mutating: true, // MCP tools are treated as mutating for safety
          parameters: t.inputSchema as any
        });
      }
    }
  }

  getMcpTools(): ToolDefinition[] {
    return this.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const match = name.match(/^mcp__([^_]+)__(.+)$/);
    if (!match) throw new Error("Invalid MCP tool name");

    const [, serverName, toolName] = match;
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`MCP server not found: ${serverName}`);

    const result = await client.callTool({ name: toolName, arguments: args });
    const content = Array.isArray(result.content) ? result.content : [];
    
    if (result.isError) {
      throw new Error(`MCP Tool Error: ${content.map((c: any) => c.type === 'text' ? c.text : '').join('')}`);
    }

    return content.map((c: any) => c.type === 'text' ? c.text : '').join('\n');
  }

  async disconnectAll() {
    for (const client of this.clients.values()) {
      await client.close();
    }
    this.clients.clear();
    this.tools = [];
  }
}
