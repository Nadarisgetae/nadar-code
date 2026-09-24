# ⬡ Nadar Code

> Your personal autonomous AI coding agent — one brain, two front-ends (CLI & Desktop).

Nadar Code is an advanced, fully local AI coding assistant powered by your own OpenRouter API keys. It lives inside your computer, reads your codebase, executes terminal commands, searches the web, and writes code autonomously. 

No subscriptions. No telemetry. Switch between models instantly.

---

## 🌟 Key Features

- **Actual Execution**: Unlike normal chatbots, Nadar Code can read, write, and edit your files directly, and run terminal commands to test its changes.
- **Three Modes**:
  - `Plan`: The AI researches your codebase using read-only tools and outputs a step-by-step execution plan.
  - `Manual`: The AI asks for your approval before writing any code or executing any commands.
  - `Auto`: The AI operates fully autonomously until the task is complete.
- **Slash Commands**: Control the AI with powerful commands like `/goal` (run autonomously indefinitely), `/research` (perform extensive web research), and `/plan`.
- **Key Rotation**: Built-in support for rotating through multiple API keys to avoid rate limits, perfect for free-tier OpenRouter models.
- **MCP Support**: Extend the agent's capabilities with Model Context Protocol plugins.
- **Web Research Native**: Built-in tools (`search_web`, `fetch_url`) for the AI to dynamically look up documentation and research papers during a chat.
- **Persistent Memory**: The desktop app seamlessly saves your chat history per-folder, so the AI never forgets your past context.

---

## 🚀 Quick Start Tutorial

### Prerequisites
- Node.js ≥ 18.17
- Your OpenRouter API keys in `~/.nadar-code/keys.txt` (one per line). **Never commit this file to GitHub!**

### 1. Installation

Clone the repository and install the dependencies:
```bash
git clone https://github.com/Nadarisgetae/nadar-code.git
cd nadar-code
npm install
```

Since Nadar Code uses a monorepo structure, build the core brain first:
```bash
npm run build --prefix packages/core
```

### 2. Add Your API Keys

Create a file named `keys.txt` inside `~/.nadar-code/` (in your home directory, e.g., `C:\Users\YourName\.nadar-code\keys.txt` on Windows).
Paste your OpenRouter API keys inside, one per line:
```text
sk-or-v1-yourkey1
sk-or-v1-yourkey2
```
*Note: Nadar Code rotates through these automatically to prevent rate-limiting when using free models like `qwen/qwen-2.5-coder-32b-instruct`.*

### 3. Choose Your Front-End

Nadar Code comes with two ways to interact with the AI:

#### Option A: The Desktop IDE (Recommended)
A beautifully designed IDE with a built-in file explorer, terminal, and AI chat pane.
```bash
npm run desktop:dev
```
*Tip: The Desktop app automatically sets `C:\chats` as your default workspace if it exists, and persistently saves your chat history for each folder you open!*

#### Option B: The CLI
A blazing-fast terminal interface for quick edits.
```bash
npm run cli
```
*(To install globally, run `npm run cli:install`)*

---

## 🛠️ How to Talk to Nadar Code (Prompting Guide)

Nadar Code is an **Agent**, meaning you don't need to hand-hold it. 

**Bad Prompt (Normal AI style):**
> "How do I fix the bug in app.tsx?"

**Good Prompt (Agent style):**
> "Find the bug in app.tsx where the chat box doesn't scroll, and fix it. Run the linter when you're done."

### Slash Commands

Nadar Code supports built-in `/` commands to trigger specific behaviors:
- `/research [topic]` - Forces the AI to do a deep web search (using DuckDuckGo and scraping) to compile a heavily cited report before continuing.
- `/plan` - Forces the AI to stop, read the codebase, and present a numbered plan before writing a single line of code.
- `/goal [objective]` - Tells the AI to work autonomously in the background for as long as it takes to achieve the goal.
- `/grill-me` - Tells the AI to interview you with questions to clarify a complex architecture before starting.

---

## 🧩 Project Architecture (Monorepo)

Nadar Code is organized as a monorepo:
```text
nadar-code/
├── packages/
│   └── core/             ← The BRAIN (OpenRouter API, Agent logic, Tools)
├── apps/
│   ├── cli/              ← The TERMINAL front-end
│   └── desktop/          ← The DESKTOP GUI front-end (React + Electron)
```

### Core Built-in Tools
The brain (`packages/core`) gives the AI the following native abilities:
- `read_file`, `write_file`, `edit_file`
- `list_dir`, `grep_search`, `glob_search`
- `run_bash`
- `search_web`, `fetch_url`

---

## 🛡️ Safety & Privacy

- **100% Local Execution**: Your code never leaves your machine (except the snippets sent to the LLM via OpenRouter).
- **Manual Mode**: By default, or when using `Manual` mode, the AI will ask for your explicit approval before running any destructive bash commands or editing files.
- **Key Security**: Keys are stored outside the project folder (`~/.nadar-code/`) to prevent accidental git commits.

## License
MIT License
