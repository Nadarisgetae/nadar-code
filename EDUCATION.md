# 🧠 Nadar Code — Educational Deep Dive
### How Every Part Works — Logic, Reasoning, and Code Explained for Complete Beginners

---

> **Who is this for?** Anyone who wants to understand HOW this was built, WHY decisions were made, and be able to explain every part to someone else. No prior coding knowledge assumed. Every concept is explained from zero.

---

## 📖 Table of Contents

1. [The Big Picture — What Are We Actually Building?](#1-the-big-picture)
2. [How AI APIs Work (The Foundation)](#2-how-ai-apis-work)
3. [The Monorepo — Why One Folder?](#3-the-monorepo)
4. [The Core Engine — The Brain](#4-the-core-engine)
5. [The Agent Loop — How the AI "Thinks"](#5-the-agent-loop)
6. [Tools — How the AI Takes Actions](#6-tools)
7. [The Key Manager — API Rotation Logic](#7-the-key-manager)
8. [The EventBus — Broadcasting Without Wires](#8-the-eventbus)
9. [The ApprovalProvider — The Safety Gate](#9-the-approvalprovider)
10. [The MCP Client — Plugging In the World](#10-the-mcp-client)
11. [The Plugin Loader — Auto-Discovery](#11-the-plugin-loader)
12. [The CLI Shell — Terminal Interface Logic](#12-the-cli-shell)
13. [Electron — How a Website Becomes a Desktop App](#13-electron)
14. [The IPC Bridge — Backend Talks to Frontend](#14-the-ipc-bridge)
15. [React + EventBus — Real-time UI Updates](#15-react-and-the-eventbus)
16. [TypeScript — Why Types Matter](#16-typescript)
17. [The Build Pipeline — How Code Becomes an App](#17-the-build-pipeline)
18. [Design Decisions — Why We Built It This Way](#18-design-decisions)

---

## 1. The Big Picture

### What are we actually building?

Before writing a single line of code, you need to understand the problem.

**The problem:** AI models like Claude or GPT-4 are trapped inside a chat window. They can talk, but they can't DO anything on your computer. If you want code fixed, you have to copy-paste it out, paste in the suggestion, paste back the result. That's exhausting.

**The solution:** Build a **bridge** between the AI and your computer. The AI sends requests like "I want to read this file" → your program actually reads it → sends the contents back to the AI → AI continues working.

**The breakthrough insight:** Because we control both sides of the conversation, we can give the AI **any capability we want** — not just reading files but running commands, browsing the web (via MCP plugins), querying databases, anything.

### The Architecture in Plain English:

```
You type a message
       ↓
Nadar Code sends it to OpenRouter (with your API key)
       ↓
The AI model thinks and responds
       ↓
If the AI wants to use a tool → Nadar Code runs the tool on your machine
       ↓
The tool result goes back to the AI
       ↓
The AI keeps thinking until it has a final answer for you
       ↓
The final answer appears in your terminal or desktop window
```

This loop — **think → tool → think → tool → final answer** — is called an **agent loop**.

---

## 2. How AI APIs Work

### What is an API?

API stands for **Application Programming Interface**. Don't let the words scare you. It's just a way for two programs to talk to each other.

Analogy: Imagine a **restaurant**. You (the customer) don't go into the kitchen. Instead, you talk to a **waiter** (the API). You say "I want pasta" → waiter goes to kitchen → brings back pasta. The kitchen (the AI model) never talks to you directly.

### How does the AI API actually work?

When Nadar Code wants the AI to think, it sends an HTTP request — like how your browser loads a website, but instead of asking for a webpage, it's asking the AI to process a conversation.

Here's what gets sent (simplified):
```json
{
  "model": "qwen/qwen3-coder:free",
  "messages": [
    { "role": "system",  "content": "You are a helpful coding agent..." },
    { "role": "user",    "content": "Create a hello world file" },
    { "role": "tool",    "content": "File created successfully" }
  ],
  "tools": [
    { "name": "write_file", "description": "Creates a file", "parameters": {...} }
  ]
}
```

And the AI sends back:
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "I'll create that for you!",
      "tool_calls": [{
        "function": {
          "name": "write_file",
          "arguments": "{\"path\": \"hello.py\", \"content\": \"print('Hello World')\"}"
        }
      }]
    }
  }]
}
```

The AI said: "Use `write_file` with these arguments." Nadar Code reads this, actually runs the tool, and sends the result back to the AI to continue.

### What is OpenRouter?

Normally, to use Claude you need an Anthropic account. To use GPT-4 you need an OpenAI account. To use Gemini you need a Google account. Each has different pricing, different APIs, different formats.

OpenRouter is a **unified gateway**. You get ONE account, ONE API key, and ONE standard format — and you can access 200+ models from all companies. They translate everything for you behind the scenes.

For our purposes: it means you can switch from `qwen` to `gpt-4o` to `claude` with a single command in Nadar Code (`/model`).

---

## 3. The Monorepo

### What is it?

A monorepo is one Git repository that contains multiple separate programs that work together.

**Without monorepo (the old way):**
```
nadar-cli/        ← separate git repo
nadar-desktop/    ← separate git repo (they share nothing)
```

**With monorepo (our way):**
```
nadar-code/            ← one git repo
├── packages/core/     ← shared brain
├── apps/cli/          ← terminal app (imports core)
└── apps/desktop/      ← desktop app (imports core)
```

### Why monorepo?

The key insight: the CLI and Desktop do the **same thing** (talk to AI, run tools, rotate keys). The only difference is **how they display information** — one uses text in a terminal, the other uses a graphical window.

If we have two separate repos, any bug fix or new feature needs to be done twice. With a monorepo, you fix the core once and both apps benefit automatically.

### How does npm workspaces make this work?

In the root `package.json`:
```json
{
  "workspaces": ["packages/*", "apps/*"]
}
```

This tells npm: "These folders are all part of one project. Let them import from each other."

So `apps/cli` can write:
```typescript
import { Agent } from "@nadar-code/core";
```
...and npm finds it at `packages/core/` automatically. No copying files around.

---

## 4. The Core Engine

### File: `packages/core/src/`

The core is the **brain**. It has no knowledge of terminals or windows. It only knows how to:
- Talk to the AI (openrouter.ts)
- Manage keys (keyManager.ts)
- Use tools (tools/)
- Run the agent loop (agent.ts)
- Know what mode we're in (modes.ts)
- Build the right system prompt (systemPrompt.ts)

The genius of this design: **neither the terminal nor the window need to know HOW any of this works**. They just create an `Agent` object and say "run this message" — and the agent figures everything else out.

### The Types File (`types.ts`)

Before building anything, we defined what data looks like. This is like creating a **dictionary of shapes**:

```typescript
// A single message in the conversation
interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: OpenRouterToolCall[];
  tool_call_id?: string;
  name?: string;
}
```

Think of this like a template. Every message MUST have a `role` and `content`. It MAY have `tool_calls`. By defining this upfront, TypeScript will warn us if we forget something.

---

## 5. The Agent Loop

### File: `packages/core/src/agent.ts`

This is the heart of everything. Let's walk through it step by step.

### What is a "loop"?

A loop is when code runs repeatedly until a condition is met. Like:
```
While the conversation isn't done:
  → Ask the AI what to do next
  → If AI wants to use a tool → run the tool → tell AI the result
  → If AI is done → show the answer → exit loop
```

### The actual code logic (explained simply):

```typescript
async runTurn(userInput: string): Promise<void> {
  // Step 1: Add your message to the conversation history
  this.messages.push({ role: "user", content: userInput });

  // Step 2: Get all available tools based on current mode
  const tools = [...builtinTools, ...mcpTools];

  // Step 3: The main loop - repeat up to 25 times
  for (let iteration = 0; iteration < 25; iteration++) {
    
    // Step 4: Send everything to the AI and get a response
    const response = await chatCompletion(...);
    
    // Step 5: Check what the AI said
    const toolCalls = response.choices[0].message.tool_calls ?? [];
    
    // Step 6a: If no tool calls → AI is done! Show the answer and exit
    if (toolCalls.length === 0) {
      eventBus.emit({ type: "agent:message", content: response.content });
      return;  // ← EXIT the loop
    }
    
    // Step 6b: If there ARE tool calls → run each one
    for (const call of toolCalls) {
      await this.handleToolCall(call);  // run the tool
    }
    // Then the loop continues - go back to Step 4 with the tool results added
  }
}
```

**Why 25 iterations?** Safety valve. Without a limit, a buggy AI could keep calling tools forever and never stop (and use up all your credits).

### Why does the conversation "memory" work?

Notice `this.messages` — this is an array that grows with every message. When we send to the AI, we send the ENTIRE history:

```
[system prompt] [user: "fix my bug"] [tool: read_file result] [tool: edit_file result] [assistant: "Done!"]
```

The AI "remembers" everything because we keep sending it everything that happened. It's not truly "memory" — we're just resending the whole conversation each time.

---

## 6. Tools

### Folder: `packages/core/src/tools/`

### What is a tool?

A tool is a **function the AI is allowed to call**. The AI doesn't actually run code on your computer — it asks Nadar Code to run it. This is an important security boundary.

### How tools are defined:

Every tool has:
1. A **name** (the AI uses this to call it)
2. A **description** (the AI reads this to know WHEN to use it)
3. **Parameters** (what information the tool needs)
4. A **mutating** flag (does it change files? If yes → needs approval in manual mode)

```typescript
{
  name: "write_file",
  description: "Creates a new file or overwrites an existing one",
  mutating: true,          // ← changes your disk = needs your approval
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file" },
      content: { type: "string", description: "Content to write" }
    },
    required: ["path", "content"]
  }
}
```

### Why do we send tool definitions to the AI?

The AI doesn't know what tools Nadar Code has. We tell it! We send the list of tools in every request. The AI reads the descriptions and decides WHICH tool to call based on what you asked.

This is why descriptions matter — if you have a tool called `xyz_thing` with the description "does stuff", the AI won't know when to use it. Good descriptions = smarter AI decisions.

### Read-only vs Mutating tools:

| Tool | Mutating? | Why |
|---|---|---|
| `read_file` | ❌ No | Just reading — can't cause damage |
| `list_dir` | ❌ No | Just looking — safe |
| `grep_search` | ❌ No | Searching — safe |
| `write_file` | ✅ Yes | Creates/overwrites files — risky |
| `edit_file` | ✅ Yes | Modifies files — risky |
| `run_bash` | ✅ Yes | Runs ANY command — potentially dangerous |

In Plan mode, all mutating tools are removed from the list before sending to the AI. The AI literally doesn't know they exist, so it can't call them even if it tries.

---

## 7. The Key Manager

### File: `packages/core/src/keyManager.ts`

### The Problem

OpenRouter gives you free keys, but they have limits:
- **Rate limit (429):** "You're calling too fast, slow down"
- **Credit limit (402):** "You've used your free quota"
- **Invalid key (401):** "This key doesn't exist or was deleted"

With 1 key, any of these stops you. With 16 keys, you can keep going.

### The KeyState — tracking each key individually:

```typescript
interface KeyState {
  key: string;           // The actual sk-or-v1-... string
  masked: string;        // "sk-or-v1...xxxx" for display (hides middle)
  cooldownUntil: number; // Timestamp — 0 = ready, future = cooling
  disabled: boolean;     // true = permanently skip (invalid key)
  requests: number;      // How many times we've used this key
  failures: number;      // How many times it has failed
  lastFailure?: string;  // "rate_limited" | "out_of_credits" | "invalid"
  lastSuccess?: number;  // Timestamp of last successful call
}
```

### The `current()` method — finding the best key:

```typescript
current(): string {
  // Try each key starting from where we left off (cursor)
  for (let i = 0; i < this.keys.length; i++) {
    const idx = (this.cursor + i) % this.keys.length;  // wrap around
    if (this.usable(this.keys[idx])) {
      this.cursor = idx;           // remember where we are
      this.keys[idx].requests++;   // track usage
      return this.keys[idx].key;
    }
  }
  // All keys cooling → use the one that recovers soonest
  const soonest = keys.filter(k => !k.disabled)
                      .sort((a, b) => a.cooldownUntil - b.cooldownUntil)[0];
  return soonest.key;
}
```

The `% this.keys.length` trick (modulo) makes it wrap around: `(15 + 1) % 16 = 0`. So after the last key, we go back to key #0.

### Exponential Backoff — Getting Smarter Each Failure:

```typescript
markLimited(key: string, baseSeconds = 30): void {
  state.failures++;
  
  // Backoff formula: base × 2^(failures - 1)
  // Failure 1: 30 × 2^0 = 30 seconds
  // Failure 2: 30 × 2^1 = 60 seconds
  // Failure 3: 30 × 2^2 = 120 seconds
  // Failure 4: 30 × 2^3 = 240 seconds
  // Capped at 1 hour (3600s)
  
  const backoff = Math.min(baseSeconds * Math.pow(2, state.failures - 1), 3600);
  
  // Add jitter: ±10% random variation
  // Why? If 5 keys all recover at exactly the same time and all get rate-limited
  // again simultaneously, they'd all cool down together forever (thundering herd).
  // Jitter spreads them out so they recover at slightly different times.
  const jitter = backoff * 0.1 * (Math.random() * 2 - 1);
  
  state.cooldownUntil = Date.now() + (backoff + jitter) * 1000;
}
```

### Why separate handlers for each error type?

- **429 (Rate limited):** Temporary — the key will work again soon. Use `retry-after` header to know exactly how long.
- **402 (Out of credits):** Medium-term — credits won't replenish in minutes. 24h cooldown.
- **401 (Invalid):** Permanent — the key is wrong or deleted. Disable forever (for this session).
- **5xx (Server error):** OpenRouter's fault — short cooldown, try again soon.

Using the same cooldown for all of these would be wrong. A 401 key should NEVER be tried again — putting it on 30s cooldown means we'd keep failing on it 120 times a day.

### markSuccess() — The Reset Button:

```typescript
markSuccess(key: string): void {
  state.failures = 0;          // Reset failure count
  state.lastFailure = undefined;
  state.lastSuccess = Date.now();
  state.cooldownUntil = 0;     // No longer cooling
}
```

When a key works again after being rate-limited, we reset its failure count. This means the next time it gets limited, the backoff starts from 30s again instead of continuing to grow from where it was.

---

## 8. The EventBus

### File: `packages/core/src/events.ts`

### The Problem it Solves

The agent loop does lots of things: thinking, calling tools, getting results. The CLI wants to print these events as text. The Desktop wants to update the React UI.

If we put `console.log()` calls directly in `agent.ts`, it would only ever work in a terminal. If we put React state update calls there, it would only ever work in a browser.

### The Solution: The Observer Pattern

An EventBus is an implementation of the **Observer Pattern** (also called Publish/Subscribe). It works like a **radio station**:
- The core (agent.ts) is the **broadcaster** — it emits events without knowing who's listening
- The CLI and Desktop are **listeners** — they subscribe and react to events their own way

```typescript
export class EventBus {
  private listeners: ((event: EventType) => void)[] = [];

  subscribe(listener: (event: EventType) => void) {
    this.listeners.push(listener);
    // Returns an unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(event: EventType) {
    for (const listener of this.listeners) {
      listener(event);  // Call every subscriber with this event
    }
  }
}
```

### How it's used:

**In agent.ts (broadcaster):**
```typescript
this.eventBus.emit({ type: "agent:thinking" });
// ... later ...
this.eventBus.emit({ type: "agent:message", content: "Here's the fix..." });
```

**In CLI (listener):**
```typescript
eventBus.subscribe((event) => {
  if (event.type === "agent:message") {
    console.log(chalk.green(event.content));  // print to terminal
  }
});
```

**In Desktop (listener):**
```typescript
eventBus.subscribe((event) => {
  if (event.type === "agent:message") {
    setMessages(prev => [...prev, { role: "assistant", content: event.content }]);
    // ^ update React state → UI re-renders automatically
  }
});
```

**The agent never changes.** It always emits the same events. The listeners decide what to do with them. This is the power of decoupling.

---

## 9. The ApprovalProvider

### File: `packages/core/src/events.ts` + `modes.ts`

### The Problem

In Manual mode, before running a mutating tool, we need to ask: "Allow this?"

In a terminal, this is: `rl.question("Allow write_file? y/n")` — blocks until you type.

In a desktop GUI, there's no terminal to type in. We need a popup modal, and we need the code to wait until you click a button.

If we put readline code directly in `agent.ts`, it would crash in the desktop app (there's no terminal).

### The Solution: An Interface (a Contract)

An interface defines WHAT something must do, without saying HOW.

```typescript
export interface ApprovalProvider {
  request(toolName: string, argsSummary: string): Promise<"yes" | "no" | "always">;
}
```

This says: "Any approval provider must have a `request` function that returns a Promise resolving to yes, no, or always." That's the contract. How it does it is irrelevant.

### CLI Implementation:
```typescript
const approvalProvider: ApprovalProvider = {
  async request(toolName, argsSummary) {
    // Uses readline to ask in terminal
    const answer = await rl.question(`Allow "${toolName}"? [y/n/a]: `);
    if (answer === "a") return "always";
    if (answer === "y" || answer === "") return "yes";
    return "no";
  }
};
```

### Desktop Implementation:
```typescript
const approvalProvider: ApprovalProvider = {
  async request(toolName, argsSummary) {
    return new Promise((resolve) => {
      // Show the modal in the React window
      mainWindow.webContents.send("approval-request", { toolName, argsSummary });
      // Wait for the user to click a button
      ipcMain.once("approval-response", (_event, decision) => {
        resolve(decision);  // "yes", "no", or "always"
      });
    });
  }
};
```

The agent calls `approvalProvider.request(...)` and doesn't care which one it gets. This is called **polymorphism** — one interface, multiple implementations.

### Promises — What is `async/await`?

A `Promise` represents a value that isn't ready yet. Like ordering food — you don't get the food instantly, you get a "promise" that food will arrive. `await` means "wait here until the promise resolves."

```typescript
// Without await (wrong - continues immediately):
const answer = approvalProvider.request("write_file", "test.py"); // answer is a Promise, not a real value!

// With await (correct - waits for the click):
const answer = await approvalProvider.request("write_file", "test.py"); // answer is "yes", "no", or "always"
```

---

## 10. The MCP Client

### File: `packages/core/src/mcp/client.ts`

### What is MCP?

MCP (Model Context Protocol) is an **open standard** created by Anthropic. It defines how AI agents can connect to external tools and data sources in a standardized way.

Think of it like USB — before USB, every device had a different connector. After USB, everything just plugged in the same way. MCP does this for AI tools.

### How it works technically:

An MCP server is a **separate program** that:
1. Runs as its own process on your computer
2. Communicates over "stdio" (standard input/output — basically a two-way text pipe)
3. Follows the MCP protocol (a specific format of JSON messages)

Example: The `@modelcontextprotocol/server-memory` package is a Node.js program that provides "memory" tools. When started via `/mcp start memory npx -y @modelcontextprotocol/server-memory`, it runs as a child process, and Nadar Code talks to it through its text input/output.

### The MCP Handshake:

When we connect to an MCP server:
```
Nadar Code → server: "initialize" (who are we, what capabilities we support)
Server → Nadar Code: "initialized" (I'm ready)
Nadar Code → server: "tools/list" (what tools do you have?)
Server → Nadar Code: [list of tools with names and schemas]
```

We add these tools to the AI's tool list with namespacing: `mcp__memory__save_memory`. The `mcp__serverName__toolName` format prevents name collisions if two servers have tools with the same name.

### Tool Namespacing Example:
```
Built-in: read_file, write_file, run_bash
Memory MCP: mcp__memory__save_memory, mcp__memory__recall_memory
Browser MCP: mcp__browser__navigate, mcp__browser__screenshot
```

The AI sees ALL of these in one flat list and picks whichever is appropriate.

---

## 11. The Plugin Loader

### File: `packages/core/src/plugins/loader.ts`

### What is a plugin?

A plugin is a folder that extends Nadar Code with extra capabilities. The `.claude-plugin` format is what Anthropic uses for Claude Code plugins — by supporting the same format, Nadar Code is compatible with all official Claude plugins.

### Auto-discovery:

On startup, the `PluginLoader` scans `~/.nadar-code/plugins/`. For each subfolder, it looks for `.claude-plugin/plugin.json`. If found, it reads the manifest:

```json
{
  "name": "my-plugin",
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@my/mcp-server"]
    }
  }
}
```

It then automatically starts any declared MCP servers. The user doesn't need to run any `/mcp start` commands — just drop the plugin folder in place and restart.

### Skills injection:

Any `SKILL.md` files found in the plugin's `skills/` folder get appended to the system prompt:

```typescript
let systemPrompt = buildSystemPrompt(mode, cwd, notes);
const skills = pluginLoader.getAllSkills();
if (skills.length > 0) {
  systemPrompt += "\n\n# Loaded Skills:\n" + skills.join("\n\n---\n\n");
}
```

The AI now has extra knowledge injected invisibly. If your plugin teaches the AI how to use a specific API, those instructions are in the system prompt before the conversation even starts.

---

## 12. The CLI Shell

### Folder: `apps/cli/src/`

### index.ts — The Entry Point

This is the first file that runs when you type `npm start`. Its job:
1. Load config and keys
2. Create the `ApprovalProvider` (readline-based)
3. Create the `EventBus` and subscribe to it (to print events to terminal)
4. Create the `Agent` with these dependencies
5. Show a banner
6. Start the input loop

### The Input Loop:

```typescript
for (;;) {  // "for(;;)" means "loop forever" — same as while(true)
  const input = await rl.question(`\n[${config.mode}] nadar> `);
  
  if (!input.trim()) continue;  // blank line → skip
  
  // Is it a slash command? (/help, /mode, etc.)
  const commandResult = await handleCommand(input, ctx);
  if (commandResult === "exit") break;     // /exit → stop loop
  if (commandResult === "handled") continue; // command handled → next input
  
  // Not a command → send to the AI agent
  await agent.runTurn(input);
}
```

### commands.ts — The Slash Command Router

The `handleCommand` function checks if input starts with `/` and routes it to the right handler. Each `case` in the switch statement handles one command. This is a classic **router pattern** — common in web development too.

```typescript
switch (cmd) {
  case "help": console.log(HELP); return "handled";
  case "mode": /* change mode */ return "handled";
  case "model": /* change model */ return "handled";
  case "mcp": /* start MCP server */ return "handled";
  case "exit": return "exit";
  default: printError(`Unknown command: /${cmd}`); return "handled";
}
```

---

## 13. Electron

### Folder: `apps/desktop/electron/`

### What IS Electron?

Electron is a technology that lets you build **desktop applications using web technologies** (HTML, CSS, JavaScript). Apps like VS Code, Discord, Slack, and Figma are all built with Electron.

**How it works under the hood:**
Electron bundles two things together:
1. **Node.js** — a JavaScript runtime that can access your file system, network, OS
2. **Chromium** — the same browser engine used by Google Chrome

When you run an Electron app:
- Node.js runs your "main process" (the backend)
- Chromium renders your "renderer process" (the window you see)

The key benefit for us: **the main process IS Node.js** — which means it can directly import and run `packages/core` without any changes. The agent, key manager, MCP client — all of it runs in the main process just like it runs in the CLI.

### The Two Processes:

```
┌─────────────────────────────────────────────────┐
│                ELECTRON APP                      │
│                                                  │
│  ┌──────────────────┐   ┌───────────────────┐   │
│  │   Main Process   │   │ Renderer Process  │   │
│  │   (Node.js)      │   │   (Chromium)      │   │
│  │                  │   │                   │   │
│  │  - Agent         │←→│  - React UI       │   │
│  │  - KeyManager    │IPC│  - Chat window    │   │
│  │  - MCP Client    │   │  - Settings panel │   │
│  │  - File system   │   │  - Approval modal │   │
│  └──────────────────┘   └───────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Why the separation?

Security. The Chromium renderer is designed to be sandboxed (isolated) for web browsing. If a malicious website is open, it can't access your file system. We use this same isolation in our app — the React UI cannot directly call `fs.readFile()`.

Instead, the UI must ask the main process (the trusted Node.js backend) via IPC.

---

## 14. The IPC Bridge

### File: `apps/desktop/electron/preload.js`

IPC stands for **Inter-Process Communication** — the main process and renderer process are in separate isolated sandboxes, so they need a special bridge to talk.

### preload.js — The Bridge Builder

Electron runs `preload.js` in a special context that has access to BOTH worlds:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nadar', {
  // These functions are exposed to the React UI as window.nadar.*
  sendMessage: (msg) => ipcRenderer.invoke('send-message', msg),
  onCoreEvent: (callback) => ipcRenderer.on('core-event', (event, ...args) => callback(...args)),
});
```

`contextBridge.exposeInMainWorld('nadar', {...})` creates a `window.nadar` object in the browser window. The React app calls `window.nadar.sendMessage("hello")` → preload.js converts it to an IPC message → main process receives it → runs `agent.runTurn("hello")`.

### The Flow (step by step):

```
1. User types in React textarea and clicks Send
2. React calls: window.nadar.sendMessage("Fix my bug")
3. preload.js converts to: ipcRenderer.invoke('send-message', "Fix my bug")
4. Electron sends IPC message to main process
5. main.js receives: ipcMain.handle('send-message', (event, message) => {...})
6. main.js calls: agent.runTurn(message)
7. Agent emits EventBus events as it works
8. main.js's EventBus listener catches them: eventBus.subscribe(event => mainWindow.webContents.send('core-event', event))
9. Chromium receives IPC message in renderer
10. preload.js forwards to React: ipcRenderer.on('core-event', callback)
11. React callback updates state: setMessages([...prev, newMessage])
12. React re-renders → user sees the new message
```

### Two Types of IPC:

**`ipcMain.handle` + `ipcRenderer.invoke` → Request/Response:**
```javascript
// Main (backend):
ipcMain.handle('get-config', async () => { return config; });

// Renderer (frontend):
const config = await ipcRenderer.invoke('get-config');
```
Like a function call — you invoke, you get a result back.

**`ipcMain.send` + `ipcRenderer.on` → Fire and Forget:**
```javascript
// Main sends an event with no expectation of response:
mainWindow.webContents.send('core-event', { type: 'agent:thinking' });

// Renderer listens:
ipcRenderer.on('core-event', (event, data) => { /* update UI */ });
```
Like a radio broadcast — main sends, renderer listens.

---

## 15. React and the EventBus

### File: `apps/desktop/src/App.tsx`

### What is React?

React is a JavaScript library for building user interfaces. The key idea: instead of manually manipulating HTML, you describe **what the UI should look like** given the current data (state), and React automatically updates the screen when the data changes.

```typescript
const [messages, setMessages] = useState<Msg[]>([]);
// ^ messages = current list of chat messages
// ^ setMessages = function to update the list

// When setMessages is called, React re-renders the component automatically
setMessages(prev => [...prev, { role: 'assistant', content: "Hello!" }]);
// UI immediately shows the new message — no manual DOM manipulation
```

### The useEffect Hook — Setting Up Subscriptions:

```typescript
useEffect(() => {
  // This code runs ONCE when the component first appears on screen
  
  window.nadar.onCoreEvent((event) => {
    // Called every time the backend emits an event
    if (event.type === 'agent:message') {
      setMessages(prev => [...prev, { role: 'assistant', content: event.content }]);
    }
    // etc.
  });
  
}, []); // ← Empty array means "run this only once"
```

This connects the Electron IPC listener to React state. When the agent in the main process emits an event, it flows through IPC, through the preload bridge, to this callback, which calls `setMessages`, which makes React re-render, which shows the new message. All in milliseconds.

### The Approval Promise — Pausing the Backend for a UI Click:

The most elegant piece of the whole system:

```javascript
// In main.js (backend):
const approvalProvider = {
  async request(toolName, argsSummary) {
    return new Promise((resolve) => {
      // Set up a ONE-TIME listener for the user's response
      ipcMain.once('approval-response', (_event, decision) => {
        resolve(decision);  // "yes"/"no"/"always" → promise resolves → agent continues
      });
      // Tell the renderer to show the modal
      mainWindow.webContents.send('approval-request', { toolName, argsSummary });
      // The Promise is now PENDING — agent is paused waiting for resolve()
    });
  }
};
```

```typescript
// In App.tsx (frontend):
const handleApproval = (decision: string) => {
  setApprovalReq(null);                         // Hide the modal
  window.nadar.sendApprovalResponse(decision);  // Send "yes"/"no"/"always" to backend
};
// This triggers ipcMain.once('approval-response', ...) → resolve() → agent continues
```

The agent literally **stops executing** at `await approvalProvider.request(...)` until the user clicks a button in the UI. Promises make this possible — the await keyword suspends the function without blocking anything else.

---

## 16. TypeScript

### What is TypeScript and why use it?

JavaScript is a language where you can do this:
```javascript
const x = 5;
x.toUpperCase(); // Runtime error: "x.toUpperCase is not a function"
```
This crashes at runtime — meaning it only fails when the code actually runs, potentially in front of a user.

TypeScript adds types:
```typescript
const x: number = 5;
x.toUpperCase(); // TS Error at compile time: "Property 'toUpperCase' does not exist on type 'number'"
```
This fails before it ever runs. TypeScript is like a **spellchecker for code logic**.

### Interfaces — Defining Shapes:

```typescript
interface ApprovalProvider {
  request(toolName: string, argsSummary: string): Promise<"yes" | "no" | "always">;
}
```

This says: anything that claims to be an `ApprovalProvider` MUST have a `request` function taking a string and a string, returning a Promise of "yes", "no", or "always". If you forget to implement `request`, TypeScript tells you immediately.

### `"yes" | "no" | "always"` — Union Types:

Instead of accepting any string, the type is **exactly** one of these three values. If you try to return "maybe", TypeScript errors. This prevents bugs from typos like returning `"Yes"` (capital Y) when the code checks for `"yes"`.

---

## 17. The Build Pipeline

### Why can't we just run TypeScript directly?

Node.js doesn't understand TypeScript. Browsers don't understand TypeScript. We need to **compile** TypeScript to JavaScript first. This is the build step.

### Core package build:
```
packages/core/src/*.ts  
       ↓ (TypeScript compiler)
packages/core/dist/*.js + *.d.ts
```
- `.js` files → runnable JavaScript
- `.d.ts` files → type declarations (so TypeScript knows the types of exported things)

### CLI build:
```
apps/cli/src/*.ts
       ↓ (TypeScript compiler)
apps/cli/dist/*.js
```
These can import from `packages/core/dist/` because of npm workspaces.

### Desktop build:
```
apps/desktop/src/*.tsx (React components)
       ↓ (Vite → TypeScript compiler → bundler → optimizer)
apps/desktop/dist/index.html + assets/index.js + assets/index.css
```
Vite bundles all React components into a single minified JS file for performance.

### Then electron-builder:
```
apps/desktop/electron/*.js  (main process)
apps/desktop/dist/*         (renderer bundle)
       ↓ (electron-builder)
apps/desktop/release/Nadar Code Setup 1.0.0.exe
```
It wraps everything (Electron runtime + your code) into an installer.

---

## 18. Design Decisions — Why We Built It This Way

### Q: Why EventBus instead of calling UI functions directly?

**Direct approach (bad):**
```typescript
// In agent.ts:
import { updateReactState } from "../../../apps/desktop/src/App.tsx"; // Can't do this!
// The core would depend on the desktop — circular and wrong
```

**EventBus (good):**
The core emits generic events. Anyone can listen. The core doesn't know or care what happens to those events. This is called **loose coupling** — parts of the system can change independently without breaking each other.

### Q: Why separate ApprovalProvider from the agent?

If approval logic was baked into `agent.ts`, it would have terminal code (`readline`) mixed with UI code. You couldn't run it in both environments. Extracting it as an interface lets you **inject** the right implementation at the point of use.

This pattern is called **Dependency Injection** — a component declares what it NEEDS (an ApprovalProvider) without knowing what it IS. The calling code provides the implementation.

### Q: Why monorepo instead of just one big app?

At first glance, "two apps in one repo" feels redundant. But the alternative is copy-pasting the entire agent logic twice and maintaining it in two places. Every bug fix means two PRs. Every new feature means remembering to do it twice.

The monorepo with a shared `core` package means **one source of truth**. Fix a key rotation bug once → both CLI and Desktop benefit automatically.

### Q: Why Electron and not a native Windows app?

Our core is Node.js/TypeScript. Building a native Windows app (WPF, WinUI) would mean learning a completely different language (C#) and maintaining two separate codebases — one for the agent logic in Node, one for the UI in C#.

With Electron, **the main process IS Node.js** — we can `import { Agent } from "@nadar-code/core"` directly, with zero changes. The tradeoff is size (~150-200MB) and RAM usage (~150MB), which is acceptable for a developer tool you use for hours daily.

### Q: Why MCP instead of building our own plugin format?

MCP is an open standard created by Anthropic, already adopted by Claude Code, Cursor, Cline, and others. By being MCP-compatible, we get:
- Access to all existing MCP servers (hundreds already built by the community)
- Compatibility with the growing Claude plugin ecosystem
- No need to invent and maintain our own protocol

The cost was one weekend of implementation. The benefit is access to an entire ecosystem for free.

---

## Summary — The Complete Mental Model

```
keys.txt (your 16 keys)
    ↓
KeyManager (tracks usage, rotates on failure, exponential backoff)
    ↓
openrouter.ts (sends requests, handles HTTP errors per status code)
    ↓
Agent.runTurn() (the main loop: think → tool → think → done)
    ↓
tools/ + MCP + plugins (the actions the AI can take)
    ↓
EventBus (broadcasts what's happening without caring who listens)
    ↓
ApprovalProvider (asks user permission in whatever way fits the UI)
    ↓
[CLI listener] → console.log()
[Desktop listener] → IPC → React setState → re-render
```

Every design decision flows from one core principle: **the brain should be independent of the interface**. Build the brain once, attach any number of interfaces to it. That's what makes Nadar Code simultaneously a CLI, a desktop app, and (with some more work) potentially a web app or VS Code extension — all from the same core.

---

*Educational document for Nadar Code v1.0.0 — Written to explain every concept from first principles*
