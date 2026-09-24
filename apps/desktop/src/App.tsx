import { useState, useEffect, useRef, useCallback } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import './index.css';
import DiffView from './DiffView';
import Explorer from './components/Explorer';
import RecentChats from './components/RecentChats';
import Editor from './components/Editor';
import TerminalPane from './components/TerminalPane';
import SlashMenu from './components/SlashMenu';
import MarkdownRenderer from './components/MarkdownRenderer';

// ── Types ────────────────────────────────────────────────────────────────────
type Role = 'user' | 'assistant' | 'tool' | 'system';

interface ToolExtra {
  args?: any;
  result?: string;
  ok?: boolean;
  diff?: { before: string; after: string };
}

interface Msg {
  id: string;
  role: Role;
  content: string;
  extra?: ToolExtra;
  isThinking?: boolean;
}

interface AppConfig {
  mode: string;
  model: string;
  cwd: string;
  keyCount: number;
}

interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const nadar = (window as any).nadar ?? null;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);


// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [approvalReq, setApprovalReq] = useState<{ toolName: string; argsSummary: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<AppConfig>({ mode: 'manual', model: '', cwd: '', keyCount: 0 });
  const [keyStatus, setKeyStatus] = useState('');
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>(localStorage.getItem('app-theme') || 'dark');
  const [customAccent, setCustomAccent] = useState<string>(localStorage.getItem('app-custom-accent') || '');
  const [customTextColor, setCustomTextColor] = useState<string>(localStorage.getItem('app-custom-text') || '');
  const transcriptRef = useRef<HTMLDivElement>(null);

  // ── IPC Subscriptions ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!nadar) return;

    // Load initial config and history
    nadar.getConfig().then(setConfig);
    nadar.loadHistory().then((history: Msg[]) => {
      if (history?.length) setMessages(history);
    });
    nadar.getKeyStatus().then(setKeyStatus);

    nadar.onCoreEvent((event: any) => {
      if (event.type === 'agent:thinking') {
        setThinking(true);
        return;
      }
      setThinking(false);

      setMessages(prev => {
        const next = [...prev];
        if (event.type === 'agent:message') {
          next.push({ id: uid(), role: 'assistant', content: event.content });
        } else if (event.type === 'tool:call') {
          next.push({ id: uid(), role: 'tool', content: event.name, extra: { args: event.args } });
        } else if (event.type === 'tool:diff') {
          const last = next.findLast(m => m.role === 'tool');
          if (last) last.extra = { ...last.extra, diff: { before: event.before, after: event.after } };
        } else if (event.type === 'tool:result') {
          const last = next.findLast(m => m.role === 'tool');
          if (last) last.extra = { ...last.extra, result: event.output, ok: event.ok };
        } else if (event.type === 'system:error') {
          next.push({ id: uid(), role: 'system', content: `⚠ ${event.message}` });
          setBusy(false);
          setThinking(false);
        } else if (event.type === 'system:message') {
          next.push({ id: uid(), role: 'system', content: event.message });
        } else if (event.type === 'agent:done') {
          setBusy(false);
          setThinking(false);
        }
        return next;
      });
    });

    nadar.onApprovalRequest((req: any) => setApprovalReq(req));
    nadar.onConfigUpdate((update: Partial<AppConfig>) => setConfig(c => ({ ...c, ...update })));
    nadar.onProjectChanged(({ cwd }: { cwd: string }) => {
      setConfig(c => ({ ...c, cwd }));
      setMessages([]);
    });
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  // ── Theming ───────────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.className = theme === 'dark' ? '' : `theme-${theme}`;
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (customAccent) {
      document.documentElement.style.setProperty('--accent', customAccent);
      localStorage.setItem('app-custom-accent', customAccent);
    } else {
      document.documentElement.style.removeProperty('--accent');
      localStorage.removeItem('app-custom-accent');
    }
  }, [customAccent]);

  useEffect(() => {
    if (customTextColor) {
      document.documentElement.style.setProperty('--text-0', customTextColor);
      localStorage.setItem('app-custom-text', customTextColor);
    } else {
      document.documentElement.style.removeProperty('--text-0');
      localStorage.removeItem('app-custom-text');
    }
  }, [customTextColor]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || busy) return;
    const userMsg: Msg = { id: uid(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setBusy(true);
    nadar?.sendMessage(text);
  }, [input, busy]);

  // ── Approval ──────────────────────────────────────────────────────────────
  const handleApproval = (decision: string) => {
    setApprovalReq(null);
    nadar?.sendApprovalResponse(decision);
  };

  // ── Settings ──────────────────────────────────────────────────────────────
  const handleModeChange = (mode: string) => {
    setConfig(c => ({ ...c, mode }));
    nadar?.setMode(mode);
  };
  const handleModelSelect = (model: string) => {
    setConfig(c => ({ ...c, model }));
    nadar?.setModel(model);
  };
  const handleFetchModels = async () => {
    setLoadingModels(true);
    const models = await nadar?.fetchModels();
    setAvailableModels(models ?? []);
    setLoadingModels(false);
  };
  const handleChooseProject = async () => {
    const chosen = await nadar?.chooseProject();
    if (chosen) setConfig(c => ({ ...c, cwd: chosen }));
  };
  const handleClearHistory = () => {
    nadar?.clearHistory();
    setMessages([]);
  };

  const handleFileSelect = (filePath: string) => {
    if (!openFiles.includes(filePath)) {
      setOpenFiles(prev => [...prev, filePath]);
    }
    setActiveFile(filePath);
  };

  const handleCloseTab = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFiles = openFiles.filter(f => f !== filePath);
    setOpenFiles(newFiles);
    if (activeFile === filePath) {
      setActiveFile(newFiles.length > 0 ? newFiles[newFiles.length - 1] : null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* ── Top Bar ── */}
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-brand">⬡ Nadar Code</span>
          <button className="topbar-btn" onClick={handleChooseProject}>
            📁 {config.cwd ? config.cwd.split(/[\\/]/).pop() : 'Open Project'}
          </button>
        </div>
        <div className="topbar-right">
          <span className={`mode-badge ${config.mode}`}>
            {config.mode === 'manual' ? '🔒' : config.mode === 'auto' ? '⚡' : '📋'} {config.mode}
          </span>
          <button className="topbar-btn" onClick={() => setShowSettings(true)}>⚙ Settings</button>
          <button className="topbar-btn" onClick={handleClearHistory}>🗑 Clear</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="main">
        <Allotment>
          {/* ── Pane 1: Explorer & Chats ── */}
          <Allotment.Pane preferredSize={250} minSize={200}>
            <Allotment vertical>
              <Allotment.Pane preferredSize={300} minSize={150}>
                <div className="sidebar" style={{ width: '100%', height: '100%', borderRight: 'none', borderBottom: '1px solid var(--border)' }}>
                  <RecentChats 
                    cwd={config.cwd} 
                    onChatSwitch={(history) => setMessages(history || [])} 
                  />
                </div>
              </Allotment.Pane>
              <Allotment.Pane minSize={150}>
                <div className="sidebar" style={{ width: '100%', height: '100%', borderRight: 'none' }}>
                  <div className="sidebar-section" style={{ paddingBottom: 8 }}>
                    <div className="sidebar-title">Explorer</div>
                  </div>
                  <Explorer cwd={config.cwd} onFileSelect={handleFileSelect} />
                </div>
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>

          {/* ── Pane 2 & Terminal ── */}
          <Allotment.Pane minSize={300}>
            <Allotment vertical>
              {/* ── Editor ── */}
              <Allotment.Pane minSize={150}>
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-0)' }}>
                  <div className="editor-tabs" style={{ display: 'flex', height: '36px', background: 'var(--bg-1)', borderBottom: '1px solid var(--border)', alignItems: 'center', fontSize: 13, color: 'var(--text-1)', overflowX: 'auto' }}>
                    {openFiles.map(file => (
                      <div 
                        key={file} 
                        onClick={() => setActiveFile(file)}
                        style={{ 
                          padding: '0 12px', height: '100%', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                          background: activeFile === file ? 'var(--bg-0)' : 'transparent',
                          borderRight: '1px solid var(--border)',
                          borderTop: activeFile === file ? '2px solid var(--accent)' : '2px solid transparent'
                        }}
                      >
                        <span>{file.split(/[\\/]/).pop()}</span>
                        <button onClick={(e) => handleCloseTab(file, e)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                    {openFiles.length === 0 && <span style={{ padding: '0 12px' }}>welcome.ts</span>}
                  </div>
                  <div className="editor-content" style={{ flex: 1 }}>
                    <Editor filePath={activeFile} />
                  </div>
                </div>
              </Allotment.Pane>
              
              {/* ── Terminal ── */}
              <Allotment.Pane preferredSize={200} minSize={100}>
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-0)', borderTop: '1px solid var(--border)' }}>
                  <div className="editor-tabs" style={{ display: 'flex', height: '30px', background: 'var(--bg-1)', borderBottom: '1px solid var(--border)', alignItems: 'center', padding: '0 10px', fontSize: 12, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Terminal
                  </div>
                  <div style={{ flex: 1 }}>
                    <TerminalPane />
                  </div>
                </div>
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>

          {/* ── Pane 3: Chat & Status ── */}
          <Allotment.Pane preferredSize={380} minSize={300}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', borderLeft: '1px solid var(--border)' }}>
              {/* Top status bar of chat */}
              <div style={{ display: 'flex', padding: '10px 14px', background: 'var(--bg-1)', borderBottom: '1px solid var(--border)', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <div className="sidebar-title" style={{ margin: 0, padding: 0, marginBottom: 4 }}>Model</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{config.model || 'not set'}</div>
                </div>
                <div>
                  <div className="sidebar-title" style={{ margin: 0, padding: 0, marginBottom: 4 }}>Keys ({config.keyCount})</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {keyStatus.split('\n').slice(0, 5).map((line, i) => {
                      const isDisabled = line.includes('disabled');
                      const isCooling = line.includes('cooling');
                      return <div key={i} className={`key-dot ${isDisabled ? 'disabled' : isCooling ? 'cooling' : 'ready'}`} title={line} />;
                    })}
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="chat" style={{ flex: 1, minHeight: 0 }}>
                <div className="transcript" ref={transcriptRef}>
                  {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-2)', marginTop: '80px' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
                <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-1)' }}>Nadar Code</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Your AI coding agent. Ask anything.</div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`msg ${m.role}`}>
                {m.role === 'tool' ? (
                  <ToolCard msg={m} />
                ) : (
                  <div className="msg-bubble">
                    <MarkdownRenderer content={m.content} />
                  </div>
                )}
              </div>
            ))}

            {thinking && (
              <div className="msg assistant">
                <div className="msg-bubble" style={{ padding: '14px 18px' }}>
                  <div className="thinking">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="input-area" style={{ position: 'relative' }}>
            <SlashMenu 
              input={input} 
              onSelect={(cmd) => setInput(cmd + ' ')} 
              onClose={() => setInput('')} 
            />
            <div className="input-wrap">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask Nadar anything..."
                disabled={busy}
              />
            </div>
            <button className="send-btn" onClick={handleSend} disabled={busy || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
        </div>
      </Allotment.Pane>
      </Allotment>
      </div>

      {/* ── Settings Panel ── */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h2>Settings</h2>
              <button className="settings-close" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="settings-body">

              <div className="settings-field">
                <label>Mode</label>
                <select value={config.mode} onChange={e => handleModeChange(e.target.value)}>
                  <option value="manual">Manual — ask before every tool call</option>
                  <option value="auto">Auto — run tools automatically</option>
                  <option value="plan">Plan — read-only, propose changes only</option>
                </select>
              </div>

              <div className="settings-field">
                <label>Current Model</label>
                <input type="text" value={config.model} onChange={e => handleModelSelect(e.target.value)} placeholder="e.g. qwen/qwen3-coder:free" />
              </div>

              <div className="settings-field">
                <label>Available Free Models</label>
                <button className="settings-btn" onClick={handleFetchModels} disabled={loadingModels}>
                  {loadingModels ? 'Fetching...' : '🔄 Fetch Free Models from OpenRouter'}
                </button>
                {availableModels.length > 0 && (
                  <div className="models-list">
                    {availableModels.map(m => {
                      const isSelected = m.id === config.model;
                      const ctx = m.context_length
                        ? m.context_length >= 1_000_000
                          ? `${(m.context_length / 1_000_000).toFixed(0)}M ctx`
                          : `${Math.round(m.context_length / 1000)}k ctx`
                        : null;
                      // Truncate description: first sentence, max 100 chars
                      const desc = m.description
                        ? m.description.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split(/\.\s/)[0].trim().slice(0, 100)
                        : null;
                      return (
                        <div
                          key={m.id}
                          className={`model-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleModelSelect(m.id)}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="model-name">{m.name || m.id}</span>
                              {ctx && <span className="model-ctx">{ctx}</span>}
                              <span className="model-free-badge">FREE</span>
                            </div>
                            <div className="model-id">{m.id}</div>
                            {desc && <div className="model-desc">{desc}.</div>}
                          </div>
                          {isSelected && <span style={{ color: 'var(--accent)', fontSize: 16 }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="settings-field">
                <label>API Key Status</label>
                <div className="key-status-block">{keyStatus || 'Loading...'}</div>
              </div>

              <div className="settings-field">
                <label>Theme</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className={`settings-btn ${theme === 'dark' ? 'primary' : ''}`} onClick={() => setTheme('dark')}>Dark</button>
                  <button className={`settings-btn ${theme === 'light' ? 'primary' : ''}`} onClick={() => setTheme('light')}>Light</button>
                  <button className={`settings-btn ${theme === 'eye-saver' ? 'primary' : ''}`} onClick={() => setTheme('eye-saver')}>Eye Saver</button>
                </div>
              </div>

              <div className="settings-field">
                <label>Custom Accent Color</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="color" value={customAccent || '#7c6afb'} onChange={e => setCustomAccent(e.target.value)} style={{ width: 40, height: 40, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                  <button className="settings-btn" onClick={() => setCustomAccent('')} disabled={!customAccent}>Reset Default</button>
                </div>
              </div>

              <div className="settings-field">
                <label>Custom Text Color</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="color" value={customTextColor || '#f0f0f5'} onChange={e => setCustomTextColor(e.target.value)} style={{ width: 40, height: 40, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                  <button className="settings-btn" onClick={() => setCustomTextColor('')} disabled={!customTextColor}>Reset Default</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="settings-btn" onClick={handleClearHistory}>🗑 Clear Chat History</button>
                <button className="settings-btn primary" onClick={() => setShowSettings(false)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Approval Modal ── */}
      {approvalReq && (
        <div className="approval-overlay">
          <div className="approval-card">
            <h3>Tool Approval Required</h3>
            <div className="approval-tool">{approvalReq.toolName}</div>
            {approvalReq.argsSummary && <div className="approval-args">{approvalReq.argsSummary}</div>}
            <div className="approval-actions">
              <button className="approval-btn btn-yes" onClick={() => handleApproval('yes')}>✓ Yes</button>
              <button className="approval-btn btn-no" onClick={() => handleApproval('no')}>✕ No</button>
              <button className="approval-btn btn-always" onClick={() => handleApproval('always')}>∞ Always</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tool Card ─────────────────────────────────────────────────────────────────
function ToolCard({ msg }: { msg: Msg }) {
  const [expanded, setExpanded] = useState(false);
  const { content: name, extra } = msg;

  return (
    <div className="tool-card">
      <div className="tool-card-header" onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer' }}>
        <span>&gt; {name}</span>
        {extra?.ok !== undefined && (
          <span style={{ color: extra.ok ? 'var(--green)' : 'var(--red)', fontSize: 11 }}>
            {extra.ok ? 'ok' : 'failed'}
          </span>
        )}
      </div>

      {expanded && (
        <div className="tool-card-body">
          {extra?.args && (
            <div className="tool-args">{JSON.stringify(extra.args, null, 2)}</div>
          )}
          {extra?.diff && <DiffView before={extra.diff.before} after={extra.diff.after} />}
          {extra?.result && (
            <div className={`tool-result ${extra.ok ? 'ok' : 'fail'}`}>
              {extra.result.slice(0, 300)}{extra.result.length > 300 ? '...' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
