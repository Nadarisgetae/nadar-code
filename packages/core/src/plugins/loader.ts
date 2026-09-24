import fs from "node:fs";
import path from "node:path";
import { McpClientManager } from "../mcp/client.js";
import { EventBus } from "../events.js";

export interface PluginManifest {
  name: string;
  version?: string;
  mcpServers?: Record<string, { command: string; args: string[]; env?: Record<string, string> }>;
}

export interface LoadedPlugin {
  name: string;
  path: string;
  skills: string[]; // contents of SKILL.md files
}

export class PluginLoader {
  public loadedPlugins: LoadedPlugin[] = [];

  constructor(
    private mcpManager: McpClientManager,
    private pluginsDir: string,
    private eventBus: EventBus
  ) {}

  async loadAll() {
    this.loadedPlugins = [];
    if (!fs.existsSync(this.pluginsDir)) return;

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await this.loadPlugin(entry.name, path.join(this.pluginsDir, entry.name));
      }
    }
  }

  private async loadPlugin(pluginName: string, pluginPath: string) {
    const claudeDir = path.join(pluginPath, ".claude-plugin");
    const manifestPath = path.join(claudeDir, "plugin.json");
    
    if (!fs.existsSync(manifestPath)) return;

    try {
      const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      
      // 1. Load MCP Servers
      if (manifest.mcpServers) {
        for (const [serverName, config] of Object.entries(manifest.mcpServers)) {
          const uniqueName = `${pluginName}_${serverName}`;
          this.eventBus.emit({ type: "system:message", message: `Starting plugin MCP server: ${uniqueName}` });
          await this.mcpManager.startServer(uniqueName, config.command, config.args, config.env);
        }
      }

      // 2. Load Skills
      const skills: string[] = [];
      const skillsDir = path.join(claudeDir, "skills");
      if (fs.existsSync(skillsDir)) {
        const skillEntries = fs.readdirSync(skillsDir, { withFileTypes: true });
        for (const skill of skillEntries) {
          if (skill.isFile() && skill.name === "SKILL.md") {
             const content = fs.readFileSync(path.join(skillsDir, skill.name), "utf-8");
             skills.push(content);
          } else if (skill.isDirectory()) {
             const subSkillPath = path.join(skillsDir, skill.name, "SKILL.md");
             if (fs.existsSync(subSkillPath)) {
                 skills.push(fs.readFileSync(subSkillPath, "utf-8"));
             }
          }
        }
      }

      this.loadedPlugins.push({
        name: manifest.name || pluginName,
        path: pluginPath,
        skills
      });

    } catch (err: any) {
      this.eventBus.emit({ type: "system:error", message: `Failed to load plugin ${pluginName}: ${err.message}` });
    }
  }

  getAllSkills(): string[] {
    return this.loadedPlugins.flatMap(p => p.skills);
  }
}
