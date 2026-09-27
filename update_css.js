const fs = require('fs');

const css = `
/* ── Fonts ── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg-0: #0a0a0c;
  --bg-1: #101014;
  --bg-2: #16161a;
  --bg-3: #1e1e24;
  --bg-4: #282830;
  --border: #2a2a32;
  --border-light: #3a3a44;
  --accent: #7c6afb;
  --accent-dim: #7c6afb22;
  --accent-hover: #9585ff;
  --green: #2ea043;
  --green-dim: #2ea04322;
  --red: #f85149;
  --yellow: #d29922;
  --text-0: #f0f0f5;
  --text-1: #b0b0bb;
  --text-2: #75757f;
}

body {
  font-family: 'Inter', -apple-system, sans-serif;
  background: var(--bg-0);
  color: var(--text-0);
  height: 100vh;
  overflow: hidden;
  font-size: 13px;
}

#root { height: 100%; }

/* ── Layout ── */
.app { display: flex; flex-direction: column; height: 100%; }
.main { display: flex; flex: 1; overflow: hidden; }

/* ── Status Dots ── */
.status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; }
.status-dot.green { background: var(--green); box-shadow: 0 0 6px var(--green); }
.status-dot.purple { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
.status-dot.dim { background: var(--text-2); }
@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
.status-dot.pulse { animation: pulse 1.5s infinite; }

/* ── 1. Title Bar ── */
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 36px;
  background: var(--bg-1);
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
  user-select: none;
}
.titlebar-left, .titlebar-center, .titlebar-right {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}
.titlebar-brand { font-weight: 700; color: var(--text-0); margin-right: 16px; font-size: 14px; }
.titlebar-menus span { padding: 4px 10px; font-size: 12px; color: var(--text-1); cursor: pointer; border-radius: 4px; }
.titlebar-menus span:hover { background: var(--bg-3); color: var(--text-0); }
.workspace-pill {
  display: flex; align-items: center; gap: 8px; padding: 4px 12px;
  background: var(--bg-2); border: 1px solid var(--border); border-radius: 6px;
  font-size: 12px; color: var(--text-1); cursor: pointer;
}
.workspace-pill:hover { border-color: var(--border-light); }
.folder-icon { color: var(--yellow); }
.git-branch { color: var(--text-2); }
.separator { color: var(--border); }
.window-btn { background: transparent; border: none; color: var(--text-1); width: 40px; height: 36px; cursor: pointer; }
.window-btn:hover { background: var(--bg-3); }
.window-btn.close:hover { background: var(--red); color: white; }

/* ── 2. Secondary Toolbar ── */
.secondary-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 16px; height: 44px; background: var(--bg-0); border-bottom: 1px solid var(--border);
}
.sec-left, .sec-center, .sec-right { display: flex; align-items: center; gap: 12px; }
.sec-label { font-size: 11px; font-weight: 600; color: var(--text-2); text-transform: uppercase; }
.mode-switcher { display: flex; background: var(--bg-2); border: 1px solid var(--border); border-radius: 6px; padding: 2px; }
.mode-btn { 
  background: transparent; border: none; padding: 4px 12px; border-radius: 4px; 
  color: var(--text-1); font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; 
}
.mode-btn.active { background: var(--bg-4); color: var(--text-0); box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
.model-selector {
  display: flex; align-items: center; gap: 8px; padding: 4px 12px;
  background: var(--bg-2); border: 1px solid var(--border); border-radius: 6px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px; cursor: pointer;
}
.model-selector:hover { border-color: var(--border-light); }
.telemetry-pill {
  display: flex; align-items: center; gap: 8px; padding: 4px 12px;
  border: 1px solid var(--green); border-radius: 6px; background: var(--green-dim);
  color: var(--green); font-size: 12px; font-weight: 500;
}
.token-usage {
  display: flex; align-items: center; gap: 4px; padding: 4px 10px;
  background: var(--bg-2); border: 1px solid var(--border); border-radius: 6px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--yellow);
}

/* ── 3. Main Body - Sidebar ── */
.sidebar { height: 100%; background: var(--bg-1); display: flex; flex-direction: column; border-right: 1px solid var(--border); }
.sidebar-action { padding: 16px; }
.new-task-btn {
  width: 100%; padding: 10px; background: var(--accent); color: white;
  border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;
  box-shadow: 0 2px 8px var(--accent-dim);
}
.new-task-btn:hover { background: var(--accent-hover); }
.sidebar-section { padding: 0 16px 16px; display: flex; flex-direction: column; height: 100%; }
.sidebar-title { 
  font-size: 11px; font-weight: 600; color: var(--text-2); margin-bottom: 12px; 
  display: flex; justify-content: space-between; align-items: center; letter-spacing: 0.5px;
}
.badge { background: var(--bg-3); padding: 2px 6px; border-radius: 12px; font-size: 10px; }
.thread-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-radius: 6px; border: 1px solid transparent;
  font-size: 12px; cursor: pointer; color: var(--text-1);
}
.thread-item.active { background: var(--bg-2); border-color: var(--accent); color: var(--text-0); }
.thread-badge.run { background: var(--green); color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
.explorer-title { margin-top: 16px; }
.explorer-actions { display: flex; gap: 8px; }
.explorer-actions span { cursor: pointer; color: var(--text-1); }
.explorer-actions span:hover { color: var(--text-0); }

/* ── Editor ── */
.editor-container { height: 100%; display: flex; flex-direction: column; background: var(--bg-0); }
.editor-tabs-bar {
  display: flex; justify-content: space-between; align-items: center;
  height: 36px; background: var(--bg-1); border-bottom: 1px solid var(--border); padding-right: 12px;
}
.editor-tabs { display: flex; height: 100%; }
.editor-tab {
  display: flex; align-items: center; gap: 8px; padding: 0 16px;
  background: var(--bg-2); border-right: 1px solid var(--border); border-top: 2px solid transparent;
  color: var(--text-1); cursor: pointer; font-size: 12px;
}
.editor-tab.active { background: var(--bg-0); border-top-color: var(--accent); color: var(--text-0); }
.close-tab { background: none; border: none; color: var(--text-2); cursor: pointer; }
.close-tab:hover { color: var(--red); }
.editor-tools { display: flex; align-items: center; gap: 12px; }
.ai-inline-pill {
  display: flex; align-items: center; gap: 6px; padding: 4px 8px;
  background: var(--accent-dim); border: 1px solid var(--accent); border-radius: 4px;
  color: var(--accent-hover); font-size: 11px; font-weight: 600; cursor: pointer;
}
.hotkey { background: var(--bg-4); color: var(--text-0); padding: 2px 4px; border-radius: 4px; font-size: 10px; }
.split-icon { color: var(--text-1); cursor: pointer; }
.editor-content { flex: 1; min-height: 0; }

/* ── Terminal ── */
.terminal-container { height: 100%; display: flex; flex-direction: column; background: var(--bg-0); border-top: 1px solid var(--border); }
.terminal-tabs-bar {
  display: flex; justify-content: space-between; align-items: center;
  height: 32px; background: var(--bg-1); border-bottom: 1px solid var(--border); padding-right: 12px;
}
.terminal-tab {
  display: flex; align-items: center; gap: 8px; padding: 0 16px; height: 100%;
  border-right: 1px solid var(--border); color: var(--text-1); font-size: 12px; cursor: pointer;
}
.terminal-tab.active { background: var(--bg-0); color: var(--text-0); border-bottom: 1px solid var(--bg-0); margin-bottom: -1px; }
.term-badge { background: var(--green); color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
.terminal-tools { display: flex; align-items: center; gap: 12px; }
.term-info { font-size: 11px; color: var(--text-2); }
.term-btn { cursor: pointer; color: var(--text-1); }
.term-btn:hover { color: var(--text-0); }
.terminal-banner {
  padding: 6px 12px; background: var(--bg-2); border-bottom: 1px solid var(--border);
  font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-2);
}
.terminal-content-wrapper { flex: 1; min-height: 0; }

/* ── Copilot ── */
.copilot-container { height: 100%; display: flex; flex-direction: column; background: var(--bg-1); border-left: 1px solid var(--border); }
.copilot-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
}
.copilot-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; }
.copilot-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.empty-state { text-align: center; color: var(--text-2); margin-top: 50px; }
.msg { max-width: 90%; }
.msg.user { align-self: flex-end; }
.msg.assistant { align-self: flex-start; }
.msg-bubble {
  padding: 12px 16px; border-radius: 12px; line-height: 1.5; font-size: 13px;
}
.msg.user .msg-bubble { background: var(--accent); color: white; border-radius: 12px 12px 2px 12px; }
.msg.assistant .msg-bubble { background: var(--bg-2); border: 1px solid var(--border); border-radius: 2px 12px 12px 12px; }
.copilot-input-area { padding: 16px; border-top: 1px solid var(--border); background: var(--bg-1); }
.quick-commands { display: flex; gap: 8px; margin-bottom: 12px; }
.quick-commands span {
  padding: 4px 10px; background: var(--bg-3); border: 1px solid var(--border);
  border-radius: 16px; font-size: 11px; color: var(--text-1); cursor: pointer;
}
.quick-commands span:hover { background: var(--bg-4); color: var(--text-0); }
.input-box {
  background: var(--bg-2); border: 1px solid var(--border); border-radius: 8px;
  display: flex; flex-direction: column; padding: 1px;
}
.input-box:focus-within { border-color: var(--accent); }
.input-box textarea {
  width: 100%; background: transparent; border: none; outline: none;
  padding: 12px; color: var(--text-0); font-family: 'Inter', sans-serif; font-size: 13px; resize: none;
}
.input-actions {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; background: var(--bg-1); border-top: 1px solid var(--border); border-radius: 0 0 8px 8px;
}
.input-actions-left { display: flex; align-items: center; gap: 12px; }
.attach-icon { cursor: pointer; color: var(--text-1); }
.provider-info { font-size: 11px; color: var(--text-2); font-family: 'JetBrains Mono', monospace; }
.send-btn {
  background: var(--accent); color: white; border: none; padding: 6px 14px;
  border-radius: 6px; font-weight: 600; cursor: pointer;
}
.send-btn:hover { background: var(--accent-hover); }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── 4. Bottom Status Bar ── */
.statusbar {
  display: flex; justify-content: space-between; align-items: center;
  height: 24px; background: var(--bg-1); border-top: 1px solid var(--border);
  padding: 0 12px; font-size: 11px; color: var(--text-2); font-family: 'Inter', sans-serif;
}
.status-left, .status-right { display: flex; align-items: center; gap: 16px; }
.status-item { display: flex; align-items: center; gap: 6px; }
.status-item.branch { font-family: 'JetBrains Mono', monospace; }
.status-item.success { color: var(--green); }
.status-item.agent-state { color: var(--green); font-weight: 600; font-family: 'JetBrains Mono', monospace; }
.status-item.keys-state { color: var(--yellow); }

/* Settings */
.settings-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; }
.settings-panel { background: var(--bg-2); border: 1px solid var(--border); border-radius: 12px; width: 400px; }
.settings-header { padding: 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; }
.settings-close { background: none; border: none; color: white; cursor: pointer; }
.settings-body { padding: 16px; }
.models-list { margin-top: 10px; max-height: 200px; overflow-y: auto; background: var(--bg-1); border-radius: 6px; }
.model-item { padding: 8px 12px; cursor: pointer; }
.model-item:hover { background: var(--bg-3); }
.model-item.selected { background: var(--accent-dim); color: var(--accent); }

/* Tool Card */
.tool-card { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--bg-1); margin: 8px 0; }
.tool-card-header { padding: 8px 12px; background: var(--bg-2); font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-1); display: flex; justify-content: space-between; cursor: pointer; }
.tool-card-body { padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 11px; }
`;

fs.writeFileSync('apps/desktop/src/index.css', css);
console.log("index.css updated");
