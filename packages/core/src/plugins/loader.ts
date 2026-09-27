import fs from "node:fs";
import path from "node:path";
import { McpClientManager } from "../mcp/client.js";
import { EventBus } from "../events.js";

export interface PluginManifest {
  name: string;
  version?: string;
  mcpServers?: Record<string, { command: string; args: string[]; env?: Record<string, string> }>;
  [key: string]: any;
}

export interface LoadedPlugin {
  name: string;
  path: string;
  skills: string[]; // contents of SKILL.md files
  commands: { cmd: string; desc: string }[];
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
      const commands: { cmd: string; desc: string }[] = [];
      
      const commandsDir = path.join(pluginPath, "commands");
      if (fs.existsSync(commandsDir)) {
        const cmdEntries = fs.readdirSync(commandsDir, { withFileTypes: true });
        for (const entry of cmdEntries) {
          if (entry.isFile() && entry.name.endsWith(".md")) {
            const cmdName = entry.name.replace(".md", "");
            const content = fs.readFileSync(path.join(commandsDir, entry.name), "utf-8");
            const firstLine = content.split("\n").find(l => l.trim().length > 0)?.trim().replace(/^#+\s*/, "");
            commands.push({ cmd: cmdName, desc: firstLine || `Plugin command: ${cmdName}` });
          }
        }
      }
      
      if (manifest.commands && Array.isArray(manifest.commands)) {
        for (const cmd of manifest.commands) {
          if (!commands.find(c => c.cmd === cmd.name)) {
            commands.push({ cmd: cmd.name.replace(/^\//, ''), desc: cmd.description || "" });
          }
        }
      } else if (manifest.slashCommands && Array.isArray(manifest.slashCommands)) {
        for (const cmd of manifest.slashCommands) {
          const cmdName = cmd.command.replace(/^\//, '');
          if (!commands.find(c => c.cmd === cmdName)) {
            commands.push({ cmd: cmdName, desc: cmd.description || "" });
          }
        }
      }

      const skillsDir = path.join(pluginPath, "skills");
      
      const findSkills = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            findSkills(path.join(dir, entry.name));
          } else if (entry.isFile() && entry.name === "SKILL.md") {
            skills.push(fs.readFileSync(path.join(dir, entry.name), "utf-8"));
          }
        }
      };
      
      findSkills(skillsDir);

      this.loadedPlugins.push({
        name: manifest.name || pluginName,
        path: pluginPath,
        skills,
        commands
      });

    } catch (err: any) {
      this.eventBus.emit({ type: "system:error", message: `Failed to load plugin ${pluginName}: ${err.message}` });
    }
  }

  getAllSkills(): string[] {
    return this.loadedPlugins.flatMap(p => p.skills);
  }

  getAllCommands(): { cmd: string; desc: string }[] {
    return this.loadedPlugins.flatMap(p => p.commands);
  }

  getLoadedPlugins(): { name: string; path: string; skillCount: number; commandCount: number }[] {
    return this.loadedPlugins.map(p => ({
      name: p.name,
      path: p.path,
      skillCount: p.skills.length,
      commandCount: p.commands.length
    }));
  }
}
