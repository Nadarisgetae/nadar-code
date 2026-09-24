# 🚀 Nadar Code — Complete Beginner's Tutorial
### From Absolute Zero to Expert — Everything You Need to Know

---

> **Who is this for?** You. Right now. Even if you've never used a coding tool, an AI, or a terminal in your life. We start from scratch. Every single term is explained. By the end, you'll know this tool inside out.

---

## 📖 Table of Contents

1. [What IS Nadar Code? (The Simple Explanation)](#1-what-is-nadar-code)
2. [Understanding the Key Concepts](#2-key-concepts-plain-english)
3. [Your Keys — What They Are and How They Work](#3-your-api-keys)
4. [First Launch — Step by Step](#4-first-launch)
5. [The Three Modes — Your Superpower Switch](#5-the-three-modes)
6. [Slash Commands — Your Control Panel](#6-slash-commands)
7. [How to Talk to the Agent — Prompting Guide](#7-how-to-talk-to-the-agent)
8. [MCP Plugins — Connecting Extra Powers](#8-mcp-plugins)
9. [The Desktop App Guide](#9-desktop-app)
10. [Key Rotation — Why You Have 16 Keys](#10-key-rotation)
11. [Troubleshooting — When Things Go Wrong](#11-troubleshooting)
12. [Tips From an Expert](#12-expert-tips)
13. [Glossary — Every Term Explained](#13-glossary)

---

## 1. What IS Nadar Code?

Imagine you hired the world's best programmer to sit next to you 24/7. You just tell them what you want in plain English, and they write code, fix bugs, read files, run commands — all on **your** computer. That's Nadar Code.

### The difference from ChatGPT or Claude.ai:

| Normal AI chatbot (ChatGPT etc.) | Nadar Code |
|---|---|
| You talk to it, it gives you text back | It **actually does the work** on your machine |
| Can't touch your files | Can read, write, and edit your files |
| Can't run commands | Can run terminal commands (npm install, git, etc.) |
| Has no memory of your project | Reads your project files and understands context |
| Costs $20/month subscription | **Free** — uses your own OpenRouter keys |

### The Big Idea in One Sentence:
> Nadar Code is an AI that **lives inside your computer** and can actually code, not just talk about coding.

---

## 2. Key Concepts — Plain English

### 🤖 What is an "Agent"?
An agent is an AI that can take **actions**, not just answer questions. Think of it like the difference between:
- A **regular AI**: You ask "How do I fix this bug?" → It tells you what to type
- An **agent (Nadar Code)**: You say "Fix this bug" → It finds the bug, edits the file, and confirms it's fixed

### 🔧 What are "Tools"?
Tools are the actions the agent can take. Nadar Code has these built-in:

| Tool Name | What it does | Example |
|---|---|---|
| `read_file` | Reads a file on your computer | "read my index.js file" |
| `write_file` | Creates a new file | "create a new utils.py file" |
| `edit_file` | Changes part of a file | "fix line 42 of app.ts" |
| `list_dir` | Shows what's in a folder | "what files are in /src?" |
| `grep_search` | Searches inside files for text | "find where I use useState" |
| `glob_search` | Finds files by pattern | "find all .tsx files" |
| `run_bash` | Runs a terminal command | "run npm install" |

### 🧠 What is a "Model"?
A model is the actual AI brain. Different companies make different models:
- `qwen/qwen3-coder:free` — Great at coding, **completely free**
- `claude-3.5-sonnet` — Very smart but costs money per use
- `gpt-4o` — OpenAI's flagship model

Think of models like different employees — some are free interns, some are paid experts. Nadar Code lets you switch between any of them instantly.

### 🌐 What is "OpenRouter"?
OpenRouter is like a **middleman shop** that connects you to all AI models. Instead of signing up separately for OpenAI, Anthropic, Google etc., you get one API key from OpenRouter and access everything. They have a free tier.

### 🔑 What is an "API Key"?
An API key is like a **password that proves you have an account** with OpenRouter. When Nadar Code talks to the AI, it shows this key to say "I'm allowed to use this service." Every request to the AI uses up a tiny bit of your key's credit.

### 📦 What is the "Monorepo"?
Your Nadar Code project is organized into a **monorepo** — one big folder containing multiple sub-projects:
```
nadar-code/               ← The main folder (monorepo)
├── packages/
│   └── core/             ← The BRAIN — shared by everything
├── apps/
│   ├── cli/              ← The TERMINAL app
│   └── desktop/          ← The DESKTOP GUI app
```
This means the same brain powers both the terminal and the visual app.

---

## 3. Your API Keys

### What you have in your `keys.txt` right now:
You added **16 OpenRouter keys**. That's excellent — the more keys, the longer you can use Nadar Code without interruption.

### ⚠️ One Key Has a Typo!
Key #3 in your file looks like this:
```
sk-or--39327f1ac704308968ef54818950221cd440c9c3c72f48ad2b344c0772a063ce
```
Notice the **double dash**: `sk-or--` instead of `sk-or-v1-`. This key will be rejected with a 401 error. To fix it:
1. Open `C:\Users\Aditya\.nadar-code\keys.txt`
2. Find the line with `sk-or--39327f...`
3. It should start with `sk-or-v1-` — check your OpenRouter dashboard for the correct key

### Where are my keys stored?
```
C:\Users\Aditya\.nadar-code\keys.txt
```
This is a plain text file. One key per line. Lines starting with `#` are ignored (they're comments/notes).

### How does key rotation work?
You have 16 keys. Imagine them as **16 fuel tanks** in a car:
1. Nadar Code uses Key #1 for requests
2. Key #1 hits its rate limit → instantly switches to Key #2
3. Key #2 hits limit → switches to Key #3
4. ...and so on through all 16
5. Key #1's cooldown expires → it becomes usable again
6. You basically never run out!

---

## 4. First Launch

### Using the CLI (Terminal App)

**Step 1:** Open PowerShell or Command Prompt

**Step 2:** Navigate to the CLI folder:
```powershell
cd C:\Nadar-code\apps\cli
```

**Step 3:** Build and start it:
```powershell
npm run build
npm start
```

**What you'll see:**
```
╔═══════════════════════════════════╗
║        Nadar Code  v0.1.0        ║
║  Model: qwen/qwen3-coder:free    ║
║  Mode:  manual  |  Keys: 16     ║
╚═══════════════════════════════════╝

[manual] nadar>
```

**Step 4:** Just type what you want! Example:
```
[manual] nadar> create a simple hello world Python file
```

The agent will:
1. Think about what you asked
2. Use the `write_file` tool
3. Ask you "Allow write_file? (y/n/always)"
4. You press `y` → file is created!

---

## 5. The Three Modes — Your Superpower Switch

This is one of the most important features. Think of modes as your **safety settings**.

### 🔒 Manual Mode (Default — Safest)
```
[manual] nadar>
```
- **Every** file edit or command asks for your permission first
- You see exactly what it wants to do before it happens
- You can say Yes, No, or Always (auto-approve this tool forever)
- **Best for:** When you're new, or working on important code

**Example flow:**
```
Agent: I'll create a new file called test.py
⚠ Allow "write_file" (test.py)? [y]es / [n]o / [a]lways: y
✓ Created test.py
```

### ⚡ Auto Mode (Powerful — No Interruptions)
```
[auto] nadar>
```
- The agent runs everything automatically without asking
- It goes from start to finish without stopping
- **Best for:** Trusted tasks like "set up this entire project" or "fix all my lint errors"
- **Warning:** It can make many file changes at once — make sure you have a git backup!

### 📋 Plan Mode (Read-Only — Inspector)
```
[plan] nadar>
```
- The agent can only **read** your files, never write or run commands
- It will tell you exactly what it would do, step by step
- Like asking "what WOULD you do?" without actually doing it
- **Best for:** Understanding your own codebase, planning big changes

### How to switch modes:
```
/mode manual    ← safest
/mode auto      ← fastest
/mode plan      ← read-only
```

---

## 6. Slash Commands — Your Control Panel

These are special commands that start with `/`. They control Nadar Code itself (not the AI).

### Full Command Reference:

| Command | What it does | Example |
|---|---|---|
| `/help` | Shows all commands | `/help` |
| `/mode` | See current mode | `/mode` |
| `/mode manual` | Switch to manual | `/mode auto` |
| `/model` | See current AI model | `/model` |
| `/model qwen/qwen3-coder:free` | Switch AI model | `/model gpt-4o` |
| `/models` | List all free models available | `/models` |
| `/keys` | See all your keys and their status | `/keys` |
| `/mcp start <name> <command>` | Connect an MCP plugin server | `/mcp start memory npx -y @modelcontextprotocol/server-memory` |
| `/init` | Scan project, create NADAR.md context file | `/init` |
| `/clear` | Clear conversation history | `/clear` |
| `/exit` | Quit Nadar Code | `/exit` |

### Pro tip — The `/init` command:
When you open a new project, always run `/init` first. It scans your project folder, reads your `package.json`, and creates a `NADAR.md` file that tells the AI what your project is about. This makes the AI much smarter about your specific project.

---

## 7. How to Talk to the Agent — Prompting Guide

This is where most people get stuck. Here's the secret: **be specific like you're talking to a real developer**.

### ❌ Bad prompts (vague):
```
fix my code
make it better
add feature
```

### ✅ Good prompts (specific):
```
Read my src/App.tsx file and fix the TypeScript error on line 47
Add a dark mode toggle button to my Header component in src/components/Header.tsx
Run npm test and fix any failing tests
Look at my package.json and install all missing dependencies
```

### The Golden Formula:
> **[Action]** + **[What file/thing]** + **[Specific detail]**

Examples:
- `"Read my README.md and rewrite it to be more professional"`
- `"Look at all files in /src and find any console.log statements I forgot to remove"`
- `"Create a new React component called UserProfile.tsx in src/components/ that shows a user's name and avatar"`

### Starting a new project from scratch:
```
I want to build a todo app with React and TypeScript. Set up the project structure, 
create the main components (TodoList, TodoItem, AddTodo), and make it look good 
with some basic CSS. Start by reading what's currently in my folder.
```

### Asking it to continue working:
```
Good, now add the ability to delete todos and mark them as complete
```

### When it makes a mistake:
```
That's not quite right. The button should be on the right side, not the left.
Also the color should be blue (#007acc), not green.
```

---

## 8. MCP Plugins — Connecting Extra Powers

MCP stands for **Model Context Protocol** — it's an open standard that lets you plug extra capabilities into any AI agent.

### What can MCP plugins do?
- Connect to databases
- Browse the web
- Access your email/calendar
- Read/write to Notion, Airtable, Google Sheets
- Search your local files even faster
- And hundreds more...

### How to use one (example — memory plugin):
```
/mcp start memory npx -y @modelcontextprotocol/server-memory
```

After running this, the AI gets new tools like `save_memory`, `recall_memory` etc. It can now **remember things between conversations**!

### Installing official Claude plugins:
Place a plugin folder in:
```
C:\Users\Aditya\.nadar-code\plugins\
```

The folder must have this structure:
```
my-plugin/
└── .claude-plugin/
    ├── plugin.json      ← The manifest (tells Nadar Code what to load)
    ├── skills/
    │   └── SKILL.md     ← Instructions/knowledge for the AI
    └── commands/
        └── my-command.md ← Adds a new /my-command slash command
```

Nadar Code will auto-discover and load it next time you start.

---

## 9. Desktop App Guide

The Desktop app is a graphical window version of the CLI. Same brain, better visuals.

### How to launch it (Super Easy):

You can launch it with **just 1 command** from your project folder:

```powershell
cd C:\Nadar-code
npm run desktop
```
> **What this does:** It automatically starts the pre-built desktop application in a sleek, native Windows window!

#### For Development Mode (Live reload while modifying UI):
```powershell
cd C:\Nadar-code
npm run desktop:dev
```
> This boots the Vite development server and hot-reloads any changes you make in real-time.

---

### How to Build a Standalone Windows Installer (`.exe`):

If you want a real Windows app with a desktop icon and Start Menu shortcut that you can launch like any normal application without opening terminal:

```powershell
cd C:\Nadar-code
npm run desktop:build
```

When it finishes, look inside:
```
C:\Nadar-code\apps\desktop\release\
```
You will find:
- **`Nadar Code Setup 1.0.0.exe`** — A standard Windows installer! Double-click it, click Install, and you now have **Nadar Code** on your Desktop and Start menu with its custom icon!

### What you'll see in the Desktop app:

```
┌──────────────────────────────────────────────────────┐
│ ⬡ Nadar Code  📁 my-project ▾        Manual ⚙ Clear │ ← Top bar
├──────────────┬───────────────────────────────────────┤
│ API Keys (16)│                                       │
│ ● key 1 ✓   │   Your chat messages appear here      │
│ ● key 2 ✓   │                                       │
│ ○ key 3 ⏳  │   [Tool cards fold open to show       │
│              │    exactly what the AI did]           │
│ Model:       │                                       │
│ qwen/qwen3.. │   When AI wants to edit a file:      │
│              │   ┌─────────────────────────┐        │
│              │   │ ✏️ Calling edit_file    │        │
│              │   │ utils.ts  ▼ (click)     │        │
│              │   │ -old line              │        │
│              │   │ +new line              │        │
│              │   └─────────────────────────┘        │
├──────────────┴───────────────────────────────────────┤
│  [ Type a message...                           ➤ ]  │ ← Input
└──────────────────────────────────────────────────────┘
```

### The Approval Modal:
When the AI wants to do something in Manual mode, a popup appears:

```
┌────────────────────────────────┐
│   Tool Approval Required       │
│   edit_file                    │
│   utils.ts                     │
│                                │
│  ✓ Yes   ✕ No   ∞ Always      │
└────────────────────────────────┘
```
- **Yes** — allow this one time
- **No** — skip this tool call
- **Always** — auto-approve this tool for the rest of the session

### Settings Panel (click ⚙):
- Switch between Manual / Auto / Plan mode
- See all your free models and click to switch
- See key status (which keys are ready, cooling, or disabled)
- Clear conversation history

---

## 10. Key Rotation — Why You Have 16 Keys

### The problem it solves:
Free OpenRouter keys have limits. If you're using the AI heavily, a key might hit its rate limit and say "slow down!" With only 1 key, you'd have to wait. With 16 keys, Nadar Code automatically switches to the next one — you never notice any interruption.

### What each status means:

| Status | Icon | Meaning |
|---|---|---|
| Ready | ✓ green dot | Key is working and available |
| Cooling | ⏳ yellow dot | Hit a rate limit, waiting to recover |
| Disabled | ✗ red dot | Key was rejected (probably invalid), won't be used |

### The backoff system (how smart it is):
When a key gets rate-limited repeatedly, Nadar Code waits **longer each time**:
- First fail: wait 30 seconds
- Second fail: wait 60 seconds  
- Third fail: wait 120 seconds
- (doubles each time, up to 1 hour max)

This prevents getting banned by sending too many requests too fast.

---

## 11. Troubleshooting — When Things Go Wrong

### "No API keys found"
**Cause:** Your `keys.txt` file is empty or doesn't exist  
**Fix:** Go to `C:\Users\Aditya\.nadar-code\keys.txt` and add your keys

### "All keys exhausted" error
**Cause:** All 16 keys are on cooldown at the same time  
**Fix:** Wait 1-5 minutes. Your keys will recover. Or add more keys.

### The AI keeps making wrong edits
**Fix:** Use `/mode plan` first — ask it to explain what it will do. Then switch to `/mode manual` and approve each step.

### "Model error: context length exceeded"
**Cause:** Your conversation is too long, the AI's memory is full  
**Fix:** Run `/clear` to start fresh, then re-explain what you need

### The Desktop app shows a blank screen
**Cause:** Vite dev server isn't running  
**Fix:** Make sure Terminal 1 has `npx vite` running first, then launch Electron

### A key has `sk-or--` (double dash)
**Cause:** Typo when pasting the key  
**Fix:** Open `keys.txt`, find the malformed key, get the correct one from openrouter.ai/keys

---

## 12. Expert Tips

### 🏆 Tip 1: Always run `/init` in a new project
The AI will know your project structure, dependencies, and context from the start.

### 🏆 Tip 2: Use NADAR.md as your project briefing
After `/init` creates `NADAR.md`, edit it to add important notes:
```markdown
# Project Notes
- This is a Next.js 14 app, not Create React App
- We use Tailwind CSS, not plain CSS
- The API is at /api/v2/, not /api/
- Never modify the legacy/ folder
```

### 🏆 Tip 3: Auto mode for big tasks, manual for risky ones
- Refactoring 50 files? Use `/mode auto`
- Touching your database schema? Use `/mode manual`

### 🏆 Tip 4: Chain prompts like a project manager
```
1. "Read all files and understand the structure"
2. "Now add user authentication"
3. "Run the tests and fix any failures"
4. "Update the README to document the new auth system"
```

### 🏆 Tip 5: The `/keys` command is your health check
Before a big coding session, run `/keys` to see all your keys are healthy.

### 🏆 Tip 6: Use Plan mode to audit your own codebase
```
/mode plan
What security vulnerabilities exist in this codebase?
What parts of this code are most confusing or need refactoring?
```
It can only read — so it gives you honest analysis with zero risk.

---

## 13. Glossary — Every Single Term Explained

| Term | Simple explanation |
|---|---|
| **Agent** | An AI that takes actions, not just answers questions |
| **API** | A way for programs to talk to each other (Application Programming Interface) |
| **API Key** | A password that proves you have access to a service |
| **Asar** | A compressed archive format Electron uses to bundle app files |
| **Backoff** | Waiting longer each time before retrying a failed request |
| **CLI** | Command Line Interface — a text-only app you use in a terminal |
| **Cooldown** | A waiting period before a rate-limited key can be used again |
| **Core Package** | The shared brain of Nadar Code used by both CLI and Desktop |
| **CWD** | Current Working Directory — which folder you're currently in |
| **Electron** | A technology for building desktop apps using web tech (HTML/JS/CSS) |
| **ESM** | ECMAScript Modules — the modern way JavaScript files import each other |
| **EventBus** | A system for broadcasting events from the core to any UI that's listening |
| **IPC** | Inter-Process Communication — how Electron's backend talks to its frontend |
| **Jitter** | Random small variation added to timers to prevent all keys from recovering at the same time |
| **JSON** | JavaScript Object Notation — a simple data format used for config files |
| **MCP** | Model Context Protocol — a standard for plugging tools into AI agents |
| **Model** | The actual AI brain (e.g. GPT-4, Claude, Qwen) |
| **Monorepo** | One git repository containing multiple related projects |
| **Mutating tool** | A tool that changes things (write file, run bash) — these need approval in Manual mode |
| **NADAR.md** | A project notes file the AI reads for context about your project |
| **npm workspaces** | An npm feature for managing multiple packages in one folder |
| **OpenRouter** | A service that lets you access many AI models with one API key |
| **Plugin** | Extra functionality you can add to Nadar Code via `.claude-plugin` folders |
| **Preload script** | In Electron, a bridge script that safely connects backend and frontend |
| **Prompt** | The message you send to the AI |
| **Rate limit** | The maximum number of requests a key can make per minute/hour |
| **React** | A JavaScript library for building user interfaces |
| **Renderer** | The visual part of an Electron app (the window you see) |
| **Rotation** | Automatically switching to the next API key when the current one fails |
| **Skill** | A `.md` file that gives the AI extra knowledge about a specific topic |
| **System prompt** | Hidden instructions given to the AI before your conversation starts |
| **Tool call** | When the AI decides to use one of its tools (read file, run bash, etc.) |
| **TypeScript** | JavaScript with types — catches errors before you run the code |
| **Vite** | A fast build tool for web applications |
| **Workspace** | In npm terms, one of the sub-packages inside the monorepo |

---

*Made with ❤️ — Nadar Code v1.0.0*
