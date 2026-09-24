# Nadar Code — Masterplan (CLI + Desktop, personal build)

**Goal:** one engine, two front ends — a terminal tool (done) and a native desktop app — both running on your machine, both using your OpenRouter keys, both yours only.

**Core idea that makes this easy:** don't build two separate apps. Build one **engine** (agent loop, key rotation, tools, OpenRouter client) as a shared package, then put a thin **CLI shell** on one side and a thin **Desktop shell** on the other. You already built the engine last time — it just needs to be pulled out of `src/index.ts` so both shells can call it.

---

## 1. Architecture

```
nadar-code/                     (monorepo)
├─ packages/
│  └─ core/                     the brain — no terminal code, no UI code
│     ├─ agent.ts               tool-call loop
│     ├─ keyManager.ts          key rotation
│     ├─ openrouter.ts          API client
│     ├─ tools/                 read/write/edit/bash/grep/glob
│     ├─ modes.ts               manual/auto/plan rules
│     └─ approval.ts            NEW: an interface, not a readline prompt (see §3)
├─ apps/
│  ├─ cli/                      today's terminal app, now just imports core
│  └─ desktop/                  Electron app: main process imports core,
│                                 renderer is the chat UI (React)
└─ package.json                 npm workspaces tying it together
```

Why this matters: right now `agent.ts` calls `rl.question()` directly to ask "allow this edit?" — that only works in a terminal. Pulling that into an **ApprovalProvider interface** is the one real refactor that makes a GUI possible at all. Everything else in your existing code (tools, key manager, OpenRouter client, system prompt) is already UI-agnostic and can move over almost unchanged.

## 2. Desktop shell: Electron, not Tauri (for now)

| | Electron | Tauri |
|---|---|---|
| Reuses your existing TS/Node core | Yes, directly | Needs a Node sidecar process |
| Setup time | Low | Higher (Rust toolchain) |
| App size | ~150–200MB | ~10–20MB |
| Best for | Getting a working app fast | Optimizing later |

Recommendation: **Electron for v1.** Your core is Node/TypeScript — Electron's main process *is* Node, so `agent.ts`, `keyManager.ts`, tool execution all run there completely unchanged. The renderer (the window you see) is just a React chat UI talking to the main process over IPC. If disk size or startup time bugs you later, porting to Tauri is a phase-5 optimization, not a rewrite.

## 3. The one hard problem: approval prompts in a GUI

Terminal: `rl.question("Allow edit_file? y/n")` — blocks until you type.
Desktop: there's no terminal. You need a **modal in the window** with Allow/Deny buttons, and the agent loop needs to *pause* until you click one.

Solution — define this interface in `core/approval.ts`:

```ts
export interface ApprovalProvider {
  request(toolName: string, argsSummary: string): Promise<"yes" | "no" | "always">;
}
```

- **CLI implementation:** wraps `rl.question()` (what you already have).
- **Desktop implementation:** sends an IPC event to the renderer (`"approval:request"`), renderer shows a modal, resolves the promise when you click a button, sends the answer back over IPC.

The agent loop calls `approvalProvider.request(...)` and doesn't care which one it's talking to. This single interface is what lets one engine drive both a terminal and a window.

## 4. Streaming events, not console.log

Your CLI prints tool calls and diffs straight to `stdout`. The desktop app instead needs each event pushed to the renderer as it happens:

- `agent:thinking` → show a spinner
- `agent:message` → append assistant text to the chat pane
- `tool:call` → show a card ("running edit_file on utils.ts")
- `tool:diff` → render the before/after (reuse the `diff` package, render as colored HTML instead of ANSI codes)
- `tool:result` → show success/failure
- `approval:request` / `approval:response` → the modal flow from §3

Practically: define an `EventBus` (a tiny `EventEmitter`) in core that `agent.ts` emits to. CLI subscribes and does `console.log`. Desktop's main process subscribes and forwards each event over `ipcMain` → `ipcRenderer` → React state.

## 5. Shared config, shared brain

Keep `~/.nadar-code/keys.txt` and `~/.nadar-code/config.json` exactly as they are. Both the CLI and the desktop app read/write the *same* files, so:
- add a key once, both apps see it
- switch models in the desktop settings screen, the CLI picks it up next launch
- no syncing logic needed — the filesystem is the shared state

## 6. Desktop UI layout (v1, keep it simple)

```
┌─────────────────────────────────────────────┐
│ [Project: ~/my-app ▾]     [Mode: Manual ▾]   │  ← top bar
├───────────────┬───────────────────────────────┤
│  File tree     │  Chat transcript              │
│  (read-only    │   - your messages              │
│   viewer,      │   - assistant text              │
│   optional     │   - tool-call cards + diffs     │
│   v1.1)        │   - approve/deny buttons        │
│                │                                 │
│  Key status    │                                 │
│  ● key 1 ready │                                 │
│  ○ key 2 cool  │                                 │
├───────────────┴───────────────────────────────┤
│  [ type a message...                    ▶ ]   │  ← input bar
└─────────────────────────────────────────────┘
```

Cut the file tree from v1 if it slows you down — everything works without it, it's a nice-to-have.

## 7. Phased build order

**Phase 0 — done.** CLI prototype: agent loop, tools, key rotation, modes. (This is what you already have.)

**Phase 1 — extract the core.**
Move everything except `index.ts`/`commands.ts` into `packages/core`. Add the `ApprovalProvider` interface and `EventBus`. Update the CLI to implement both via terminal I/O. *Checkpoint: CLI still works exactly as before, just restructured.*

**Phase 2 — plugin & MCP layer.**
Add `packages/core/mcp` (MCP client) and `packages/core/plugins` (marketplace/plugin loader) — see §9. Build and test this entirely through the CLI first: `/plugin marketplace add`, `/plugin install`, real tool calls flowing in from a real MCP server. *Checkpoint: install a plugin from Anthropic's official marketplace and use its tools from the CLI.*

**Phase 3 — minimal desktop shell.**
`npx create-electron-app` (or Electron Forge) with a React renderer. Main process imports `packages/core` (plugins and all), wires up IPC for the 5 event types in §4, implements `ApprovalProvider` via a modal. One text input, one scrolling transcript. *Checkpoint: you can chat, approve edits, and use plugin tools from a window instead of a terminal.*

**Phase 4 — feature parity with the CLI.**
Settings screen (keys, mode, model, installed plugins — reading/writing the same config files), a "choose project folder" picker, colored diffs, `/models` live-fetch button, conversation persisted per project so closing the app doesn't lose history.

**Phase 5 — polish for daily personal use.**
`electron-builder` to produce a `.dmg`/`.exe`/`.AppImage` you can just double-click, an app icon, optionally a global hotkey to summon it, optionally a system-tray icon so it lives in the background.

**Phase 6 — optional.**
If Electron's footprint bothers you: port the shell to Tauri, keep the Node core running as a local sidecar process the Rust shell talks to over stdio/HTTP. Not necessary for personal use — only worth it if you want a snappier, lighter app.

## 8. Things to decide before Phase 3 (desktop shell) starts

- **Streaming text or not?** Non-streaming (current CLI) is simpler; streaming feels nicer in a GUI chat window but adds buffering complexity around tool-call JSON. Recommend: ship Phase 2 non-streaming, add streaming in Phase 4 once the rest works.
- **One project window or multiple?** Simplest v1: one window, one active project folder at a time, switch via the top bar. Multi-window/multi-project is a nice Phase 4+ upgrade, not a v1 requirement.
- **Auth/login?** None needed — it's local, single-user, your keys live in a file on your disk.

## 9. Making real Claude plugins work

Checked this against Anthropic's own plugin repos rather than guessing. A Claude Code plugin is just a folder with a `.claude-plugin/plugin.json` manifest, and it can bundle any mix of:

- **`mcpServers`** — a config pointing at one or more MCP servers (most run locally over stdio via `npx`/`uvx`). In Anthropic's own official marketplace, most plugins are thin wrappers around exactly this — e.g. the Airtable plugin is essentially the Airtable MCP server plus a description.
- **`skills`** — a folder of `SKILL.md` files (the same progressive-disclosure format used elsewhere in this system: short description always loaded, full instructions read on demand).
- **`commands`** — markdown files, each one becomes a slash command.
- **`agents`** — subagent definitions (their own system prompt + tool subset).
- **`hooks`** — a `hooks.json` of shell commands to run around tool calls.

`marketplace.json` is just an index of plugins by name + source repo, so a marketplace is nothing more than a git repo Claude Code knows how to browse.

**Because MCP is an open, published protocol, Nadar Code can be a real MCP client** — same as Claude Code, Cursor, or Cline. That's the single highest-leverage addition, since most plugins are mainly an MCP server underneath. Concretely:

- `packages/core/mcp/` — an `McpClient` that spawns a plugin's server process, does the MCP handshake, calls `tools/list`, and exposes `callTool(name, args)`. Discovered tools get namespaced `mcp__<server>__<tool>` (the same pattern already used for connectors in this very chat) and merged straight into the tool array the agent sends to OpenRouter — `modes.ts` treats them like any other mutating tool for approval purposes, since a third-party server can do anything.
- `packages/core/plugins/` — the loader:
  - `/plugin marketplace add <git-url-or-path>` clones the repo, reads `.claude-plugin/marketplace.json`.
  - `/plugin install <name>@<marketplace>` copies that plugin into `~/.nadar-code/plugins/<marketplace>/<name>/`, reads its `plugin.json`.
  - On load, for each installed plugin: start any declared MCP servers, load `skills/` the same way NADAR.md context already works, register `commands/*.md` as new slash commands.

**Sequencing:** MCP servers + skills + commands cover the large majority of real plugins and are the Phase 2 target above. `hooks` and `agents` are real parts of the format too but lower-value to build first — add them once the core three are working and you've actually tried installing plugins from `anthropics/claude-plugins-official` to see what you're missing.

**Caveat:** a plugin's MCP server is often just a bridge to some third-party service (Airtable, Gmail, etc.) — it'll work in Nadar Code exactly as well as it works anywhere, but you'll still need your own account/API access to whatever it's bridging to. That's unrelated to which model is answering your prompts.

## 10. Known risks (carried over from the CLI, unchanged)

- Free OpenRouter models vary a lot in tool-calling reliability — same caveat as before, `/models`/settings screen just needs to make switching painless.
- `run_bash` still has no sandboxing beyond a timeout. A GUI "Allow" button is not a security boundary — same trust model as the CLI's `auto` mode.
- Electron apps are large (~150–200MB) and use more RAM than a CLI. Fine for a personal daily-driver; matters if you ever wanted to distribute it.

## 11. What to say to me next

When you're ready to actually build, just tell me which phase to start on — realistically **"let's do Phase 1"** is the right next message: I'll refactor your existing `nadar-code` project into the `packages/core` + `apps/cli` split described in §1, with the `ApprovalProvider` and `EventBus` interfaces in place. That leaves you ready for **Phase 2** (MCP + plugins, §9) right after, and Electron (§2) after that.
