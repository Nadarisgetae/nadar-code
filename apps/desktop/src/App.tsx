import { useState, useEffect, useRef, useCallback } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import './index.css';
import DiffView from './DiffView';
import Explorer from './components/Explorer';

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
  const [activeSettingsTab, setActiveSettingsTab] = useState<'models' | 'appearance' | 'advanced' | 'plugins'>('models');
  const [config, setConfig] = useState<AppConfig>({ mode: 'manual', model: '', cwd: '', keyCount: 0 });
  const [installedPlugins, setInstalledPlugins] = useState<{name: string, path: string, skillCount: number, commandCount: number}[]>([]);

  const [keyStatusData, setKeyStatusData] = useState<any[]>([]);
  const [keyRefreshing, setKeyRefreshing] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const [pluginCommands, setPluginCommands] = useState<any[]>([]);
  const [customCommands, setCustomCommands] = useState<{name: string, description: string}[]>(() => {
    try { return JSON.parse(localStorage.getItem('nadar-custom-commands') || '[]'); } catch { return []; }
  });
  const [addingCommand, setAddingCommand] = useState(false);
  const [newCmd, setNewCmd] = useState({name: '', description: ''});
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<{id: string, title: string, timestamp: number}[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [workflows, setWorkflows] = useState<{id: string, name: string, steps: string[]}[]>(() => {
    try { return JSON.parse(localStorage.getItem('nadar-workflows') || '[]'); } catch { return []; }
  });
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<{id: string, name: string, steps: string[]} | null>(null);
  const [terminalTabs, setTerminalTabs] = useState([{ id: 1, name: 'PowerShell' }]);
  const [activeTermId, setActiveTermId] = useState(1);
  const [splitView, setSplitView] = useState(false);
  const [showProposal, setShowProposal] = useState(true);
  const [theme] = useState<string>(localStorage.getItem('app-theme') || 'dark');
  const [customAccent] = useState<string>(localStorage.getItem('app-custom-accent') || '');
  const [customTextColor] = useState<string>(localStorage.getItem('app-custom-text') || '');
  const transcriptRef = useRef<HTMLDivElement>(null);

  // ── IPC Subscriptions ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!nadar) return;

    // Load initial config and history
    nadar.getConfig().then(setConfig);
    nadar.loadHistory().then((history: Msg[]) => {
      if (history?.length) setMessages(history);
    });
    const loadChats = async () => {
      const chats = await nadar.listChats();
      setChatHistory(chats);
      if (chats.length > 0) setActiveChatId(chats[0].id);
    };
    loadChats();

    const loadPlugins = async () => {
      const plugins = await nadar.getLoadedPlugins();
      if (plugins) setInstalledPlugins(plugins);
      const cmds = await nadar.getPluginCommands();
      if (cmds) setPluginCommands(cmds);
    };
    loadPlugins();

    const refreshKeys = () => {
      nadar.getKeyStatusData().then(setKeyStatusData);
    };
    refreshKeys();
    const keyInt = setInterval(refreshKeys, 5000);

    const cleanupCoreEvent = nadar.onCoreEvent((event: any) => {
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

    const cleanupApproval = nadar.onApprovalRequest((req: any) => setApprovalReq(req));
    const cleanupConfig = nadar.onConfigUpdate((update: Partial<AppConfig>) => setConfig(c => ({ ...c, ...update })));
    const cleanupProject = nadar.onProjectChanged(({ cwd }: { cwd: string }) => {
      setConfig(c => ({ ...c, cwd }));
      setMessages([]);
    });

    return () => {
      clearInterval(keyInt);
      if (typeof cleanupCoreEvent === 'function') cleanupCoreEvent();
      if (typeof cleanupApproval === 'function') cleanupApproval();
      if (typeof cleanupConfig === 'function') cleanupConfig();
      if (typeof cleanupProject === 'function') cleanupProject();
    };
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
  // ── Commands ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (showCommandsModal) {
      nadar?.getPluginCommands().then(cmds => {
        if (cmds) setPluginCommands(cmds);
      });
    }
  }, [showCommandsModal]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    let text = input.trim();
    if (activeWorkflowId) {
      const wf = workflows.find(w => w.id === activeWorkflowId);
      if (wf && wf.steps.length > 0) {
        text += `\n\nPlease follow this task workflow step-by-step:\n` + wf.steps.filter((s: string) => s.trim() !== '').map((s: string, i: number) => `${i+1}. ${s}`).join('\n');
      }
    }
    if (!text || busy) return;
    const userMsg: Msg = { id: uid(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setBusy(true);
    await nadar?.sendMessage(text);
    const chats = await nadar?.listChats();
    setChatHistory(chats || []);
    if (activeChatId === 'new' && chats && chats.length > 0) setActiveChatId(chats[0].id);

    // Auto-detect and load any new plugins/commands that AI might have installed
    const newCmds = await nadar?.reloadPlugins();
    if (newCmds) setPluginCommands(newCmds);
    const newPlugins = await nadar?.getLoadedPlugins();
    if (newPlugins) setInstalledPlugins(newPlugins);
  }, [input, busy, activeChatId, activeWorkflowId, workflows]);

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
  
  const handleRefreshKeys = async () => {
    setKeyRefreshing(true);
    await nadar?.refreshKeysCheck();
    const data = await nadar?.getKeyStatusData();
    setKeyStatusData(data || []);
    setKeyRefreshing(false);
  };
  
  const handleChooseProject = async () => {
    const chosen = await nadar?.chooseProject();
    if (chosen) setConfig(c => ({ ...c, cwd: chosen }));
  };
  const handleClearHistory = async () => {
    if (confirm('Clear current chat?')) {
      await nadar?.clearHistory();
      setMessages([]);
      const chats = await nadar?.listChats();
      setChatHistory(chats || []);
      if (chats && chats.length > 0) setActiveChatId(chats[0].id);
    }
  };

  const handleNewChat = async () => {
    if (!nadar) return;
    const msgs = await nadar.newChat();
    setMessages(msgs);
    setActiveChatId('new');
  };

  const handleSwitchChat = async (id: string) => {
    if (!nadar) return;
    const msgs = await nadar.switchChat(id);
    setMessages(msgs);
    setActiveChatId(id);
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
      {/* 1. Title Bar */}
      <div className="titlebar">
        <div className="titlebar-left" style={{ gap: '24px' }}>
          <span className="titlebar-brand">⬡ NadarCode</span>
          <div className="workspace-pill" onClick={handleChooseProject}>
            <span className="folder-icon">📁</span> {config.cwd ? config.cwd.split(/[\\/]/).pop() : 'No Project'}
            <span className="separator">|</span>
            <span className="git-branch">⑂ main</span>
          </div>
        </div>
        <div className="titlebar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="settings-trigger" onClick={() => setShowSettings(true)} style={{ cursor: 'pointer', color: 'var(--text-1)', fontSize: '12px', padding: '4px 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }} title="Settings">
            ⚙ Settings
          </div>
          <div className="mode-switcher">
            <button className={`mode-btn ${config.mode === 'manual' ? 'active' : ''}`} onClick={() => handleModeChange('manual')}>Manual</button>
            <button className={`mode-btn ${config.mode === 'plan' ? 'active' : ''}`} onClick={() => handleModeChange('plan')}>Plan</button>
            <button className={`mode-btn ${config.mode === 'auto' ? 'active' : ''}`} onClick={() => handleModeChange('auto')}>
              <span className={`status-dot ${config.mode === 'auto' ? 'green' : 'dim'}`}></span> Auto Agent
            </button>
          </div>
          <div style={{ display: 'flex' }}>
            <button className="window-btn minimize" onClick={() => nadar?.minimizeWindow()}>—</button>
            <button className="window-btn maximize" onClick={() => nadar?.maximizeWindow()}>▢</button>
            <button className="window-btn close" onClick={() => nadar?.closeWindow()}>✕</button>
          </div>
        </div>
      </div>

      {/* 3. Main Body */}
      <div className="main">
        <Allotment>
          {/* Pane 1: Left Nav */}
          <Allotment.Pane preferredSize={250} minSize={200}>
            <div className="sidebar">
              <Allotment vertical>
                <Allotment.Pane preferredSize={200}>
                  <div className="sidebar-section goals-section" style={{ paddingTop: '16px' }}>
                    <div className="sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      CHAT HISTORY 
                      <div>
                        <span style={{ cursor: 'pointer', fontSize: '14px', marginRight: '10px' }} onClick={handleNewChat} title="New Chat">+</span>
                        <span className="badge" style={{ marginRight: '6px' }}>{chatHistory.length}</span>
                        <span style={{ cursor: 'pointer', fontSize: '12px', opacity: 0.7 }} onClick={handleClearHistory} title="Clear Current Chat">🗑</span>
                      </div>
                    </div>
                    {chatHistory.map(chat => (
                      <div 
                        key={chat.id} 
                        className={`thread-item ${activeChatId === chat.id ? 'active' : ''}`}
                        onClick={() => handleSwitchChat(chat.id)}
                      >
                        <span className="thread-icon">✧</span> {chat.title}
                        {activeChatId === chat.id && <span className="thread-badge run">RUN</span>}
                      </div>
                    ))}
                    {chatHistory.length === 0 && (
                      <div style={{ color: 'var(--text-2)', fontSize: '12px', padding: '8px 12px' }}>No previous chats</div>
                    )}
                  </div>
                </Allotment.Pane>
                <Allotment.Pane>
                  <div className="sidebar-section explorer-section">
                    <div className="sidebar-title explorer-title">
                      EXPLORER
                      <div className="explorer-actions">
                        <span>📄</span><span>📁</span><span>🔄</span>
                      </div>
                    </div>
                    <Explorer cwd={config.cwd} onFileSelect={handleFileSelect} />
                  </div>
                </Allotment.Pane>
              </Allotment>
            </div>
          </Allotment.Pane>

          {/* Pane 2: Center Editor & Terminal */}
          <Allotment.Pane minSize={300}>
            <Allotment vertical>
              <Allotment.Pane minSize={150}>
                <div className="editor-container">
                  <div className="editor-tabs-bar">
                    <div className="editor-tabs">
                      {openFiles.map(file => (
                        <div 
                          key={file} 
                          className={`editor-tab ${activeFile === file ? 'active' : ''}`}
                          onClick={() => setActiveFile(file)}
                        >
                          <span className="file-icon">📄</span> {file.split(/[\\/]/).pop()}
                          <button className="close-tab" onClick={(e) => handleCloseTab(file, e)}>✕</button>
                        </div>
                      ))}
                      {openFiles.length === 0 && <span style={{ padding: '0 12px', opacity: 0.5 }}>welcome.ts</span>}
                    </div>
                    <div className="editor-tools">
                      <div className="ai-inline-pill" onClick={() => setShowProposal(p => !p)}>AI Inline <span className="hotkey">Ctrl+K</span></div>
                      <span className="split-icon" onClick={() => setSplitView(s => !s)}>◫</span>
                    </div>
                  </div>
                  <div className="editor-content">
                    <Editor filePath={activeFile} splitView={splitView} showProposal={showProposal} onAccept={() => setShowProposal(false)} onReject={() => setShowProposal(false)} />
                  </div>
                </div>
              </Allotment.Pane>
              
              <Allotment.Pane preferredSize={250} minSize={100}>
                <div className="terminal-container">
                  <div className="terminal-tabs-bar">
                    <div style={{display: 'flex', height: '100%'}}>
                      {terminalTabs.map(t => (
                        <div key={t.id} className={`terminal-tab ${activeTermId === t.id ? 'active' : ''}`} onClick={() => setActiveTermId(t.id)}>
                          <span className="term-icon">›_</span> {t.name}
                          {activeTermId === t.id && <span className="term-badge">ACTIVE</span>}
                        </div>
                      ))}
                    </div>
                    <div className="terminal-tools">
                      <span className="term-info">Windows Terminal NT</span>
                      <span className="term-btn" onClick={() => setTerminalTabs([...terminalTabs, {id: Date.now(), name: 'pwsh'}])}>+</span>
                      <span className="term-btn" onClick={() => terminalTabs.length > 1 && setTerminalTabs(terminalTabs.filter(t => t.id === activeTermId ? false : true))}>🗑</span>
                    </div>
                  </div>
                  <div className="terminal-banner">
                    PowerShell 7.4.2 x64 • Conda • DirectML GPU Acceleration Enabled
                  </div>
                  <div className="terminal-content-wrapper">
                    <TerminalPane cwd={config.cwd} />
                  </div>
                </div>
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>

          {/* Pane 3: Right Copilot */}
          <Allotment.Pane preferredSize={380} minSize={300}>
            <div className="copilot-container">
              <div className="copilot-header">
                <div className="copilot-title">
                  <span className="status-dot green pulse"></span> NadarCode
                </div>
                <div className="token-usage"></div>
              </div>

              <div className="copilot-body" ref={transcriptRef}>



                {/* Messages & Tool Cards */}
                {messages.length === 0 && (
                  <div className="empty-state">Your AI coding agent is ready.</div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`msg ${m.role}`}>
                    {m.role === 'tool' ? (
                      <ToolCard msg={m} />
                    ) : m.role === 'user' ? (
                      <div className="msg-bubble user-bubble">
                        <MarkdownRenderer content={m.content} />
                      </div>
                    ) : (
                      <div className="msg-bubble">
                        <MarkdownRenderer content={m.content} />
                      </div>
                    )}
                  </div>
                ))}

                {/* CoT & Checklist when thinking */}
                {thinking && (
                  <>
                    <div className="cot-card">
                      <div className="cot-header">
                        <span className="cot-icon">🔄</span> CoT Reasoning & Strategy <span className="cot-time">0.8s</span>
                      </div>
                      <div className="cot-body">
                        Examining codebase and preparing autonomous execution strategy...
                        <div className="thinking"><span /><span /><span /></div>
                      </div>
                    </div>
                    <div className="checklist-card">
                      <div className="chk-header">
                        <span className="chk-icon">📋</span> Execution Checklist <span className="chk-progress">0 / 3 Completed</span>
                      </div>
                      <div className="chk-body">
                        <div className="chk-item pending"><span className="chk-box"></span> Analyze user directive</div>
                        <div className="chk-item pending"><span className="chk-box"></span> Formulate plan</div>
                        <div className="chk-item pending"><span className="chk-box"></span> Execute actions</div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="copilot-input-area">
                <div className="quick-commands" style={{ display: 'flex', gap: '8px' }}>
                  <button className="new-task-btn" onClick={() => setShowWorkflowModal(true)} style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', flexShrink: 0 }}>⚙ Task Workflows</button>
                  <button className="new-task-btn" onClick={() => setShowCommandsModal(true)} style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', flexShrink: 0 }}>/ Commands</button>
                  {activeWorkflowId && (
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-3)', padding: '0 8px', borderRadius: '6px', fontSize: '11px', color: 'var(--text-0)', border: '1px solid var(--accent)' }}>
                      Active: {workflows.find(w => w.id === activeWorkflowId)?.name}
                      <span style={{ marginLeft: '8px', cursor: 'pointer', color: 'var(--red)', fontWeight: 'bold' }} onClick={() => setActiveWorkflowId(null)}>✕</span>
                    </div>
                  )}
                </div>
                <SlashMenu input={input} onSelect={(cmd) => setInput(cmd + ' ')} onClose={() => setInput('')} />
                <div className="input-box">
                  <textarea 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask Nadar anything..."
                    disabled={busy}
                    rows={3}
                  />
                  <div className="input-actions">
                    <div className="input-actions-left">
                      <span className="attach-icon">📎</span>
                    </div>
                    <button className="send-btn" onClick={handleSend} disabled={busy || !input.trim()}>Send ➤</button>
                  </div>
                </div>
              </div>
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>

      {/* 4. Bottom Status Bar */}
      <div className="statusbar">
        <div className="status-left">
          <span className="status-item"><span className="status-dot green"></span> Win11 DirectML</span>
          <span className="status-item branch">⑂ main</span>
          <span className="status-item success">✓ 0 Errors, 0 Warnings</span>
        </div>
        <div className="status-right">
          <span className="status-item" style={{ color: 'var(--accent)', fontWeight: 500 }}>🤖 {config.model || 'No Model Selected'}</span>
          <span className="status-item">UTF-8</span>
          <span className="status-item">CRLF</span>
          <span className="status-item">PowerShell</span>
          <span className="status-item">Python 3.11</span>
          <span className="status-item agent-state"><span className="status-dot green"></span> Auto-Agent: RUNNING</span>
        </div>
      </div>
      
      {/* ── Settings Panel ── */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <button className="settings-close-page" onClick={() => setShowSettings(false)}>✕</button>
            <div className="settings-sidebar">
              <div className={`settings-nav-item ${activeSettingsTab === 'models' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('models')}>AI Models & Keys</div>
              <div className={`settings-nav-item ${activeSettingsTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('appearance')}>Appearance</div>
              <div className={`settings-nav-item ${activeSettingsTab === 'advanced' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('advanced')}>Advanced</div>
              <div className={`settings-nav-item ${activeSettingsTab === 'plugins' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('plugins')}>Plugins & Skills</div>
            </div>
            <div className="settings-content">
              <h1>Settings</h1>
            
            {activeSettingsTab === 'models' && (
              <>
            <div className="settings-section">
              <h2>OpenRouter Configuration</h2>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div>Active Keys: <span className="green">{keyStatusData.filter(k => k.ready).length}</span> / {keyStatusData.length}</div>
                <button 
                  onClick={handleRefreshKeys} 
                  disabled={keyRefreshing} 
                  style={{ 
                    padding: '4px 12px', background: 'var(--bg-3)', border: '1px solid var(--border)', 
                    color: 'var(--text-0)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px',
                    opacity: keyRefreshing ? 0.7 : 1
                  }}
                >
                  {keyRefreshing ? '🔄 Checking Limits...' : '🔄 Refresh Limits'}
                </button>
              </div>
              {keyStatusData.length > 0 && (
                <div className="key-pool-card" style={{ margin: 0, maxWidth: '500px' }}>
                  <div className="kpc-header">
                    <span className="kpc-icon">🗝</span> Key Pool Matrix
                    <span className="kpc-stats"><span className="green">{keyStatusData.filter(k => k.ready).length} Ready</span> • {keyStatusData.filter(k => k.cooldownSecs > 0).length} Cooldown</span>
                  </div>
                  <div className="kpc-grid">
                    {keyStatusData.map((k, i) => (
                      <div key={i} className={`kpc-bar ${k.ready ? 'ready' : k.disabled ? 'disabled' : 'cooldown'} ${k.isCurrent ? 'current' : ''}`} title={k.masked + (k.cooldownSecs > 0 ? ` (Cooldown: ${k.cooldownSecs}s)` : k.disabled ? ' (Disabled)' : ' (Ready)')}></div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="settings-section">
              <h2>Model Selection</h2>
              <div className="model-selector" style={{ display: 'inline-flex', marginBottom: '16px', cursor: 'default' }}>
                <span className="status-dot purple"></span> {config.model || 'Select Model'}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <button className="settings-btn" onClick={handleFetchModels} disabled={loadingModels} style={{ padding: '8px 16px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-0)', cursor: 'pointer' }}>
                  {loadingModels ? 'Fetching...' : '🔄 Fetch Free Models from OpenRouter'}
                </button>
              </div>
              {availableModels.length > 0 && (
                <div className="models-list" style={{ maxHeight: '300px', maxWidth: '500px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '6px', overflowY: 'auto' }}>
                  {availableModels.map(m => (
                      <div key={m.id} className={`model-item ${m.id === config.model ? 'selected' : ''}`} onClick={() => handleModelSelect(m.id)} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--bg-0)' }}>
                        <span className="model-name">{m.name || m.id}</span>
                      </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeSettingsTab === 'appearance' && (
              <div className="settings-section">
                <h2>Appearance</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-1)' }}>Coming soon: Theme customization and layout preferences.</p>
              </div>
            )}

            {activeSettingsTab === 'advanced' && (
              <div className="settings-section">
                <h2>Advanced</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-1)' }}>Coming soon: Advanced developer toggles.</p>
              </div>
            )}

            {activeSettingsTab === 'plugins' && (
              <div className="settings-section">
                <h2>Plugins & Skills</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-1)', marginBottom: '16px' }}>
                  NadarCode is highly extensible. You can manually install custom agent skills, plugins, and commands by placing them in your <code>~/.nadar-code/plugins/</code> directory.
                </p>
                <div style={{ padding: '16px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-0)' }}>How to add a plugin:</h3>
                  <ol style={{ fontSize: '13px', color: 'var(--text-1)', margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>Navigate to your home directory (e.g. <code>C:\Users\Username\.nadar-code\plugins</code>).</li>
                    <li>Create a new folder for your plugin.</li>
                    <li>Add your <code>plugin.json</code> or <code>SKILL.md</code> definitions.</li>
                    <li>Restart the NadarCode application.</li>
                  </ol>
                </div>
                <div style={{ padding: '16px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-0)' }}>Automatic Installation (AI)</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      id="plugin-url-input"
                      placeholder="https://github.com/username/plugin-repo" 
                      style={{ flex: 1, padding: '8px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-0)' }} 
                    />
                    <button 
                      onClick={async () => {
                        const inputEl = document.getElementById('plugin-url-input') as HTMLInputElement;
                        const url = inputEl?.value;
                        if (url && url.trim() !== '') {
                          setShowSettings(false);
                          const cmdText = `Please clone and install the plugin from ${url} into my ~/.nadar-code/plugins/ directory. Make sure it's set up correctly.`;
                          const userMsg = { id: Date.now().toString(), role: 'user', content: cmdText };
                          setMessages(prev => [...prev, userMsg]);
                          setBusy(true);
                          inputEl.value = '';
                          await nadar?.sendMessage(cmdText);
                          
                          // Auto-detect loaded plugins
                          const cmds = await nadar?.reloadPlugins();
                          if (cmds) setPluginCommands(cmds);
                          const plugins = await nadar?.getLoadedPlugins();
                          if (plugins) setInstalledPlugins(plugins);

                          const chats = await nadar?.listChats();
                          setChatHistory(chats || []);
                          if (activeChatId === 'new' && chats && chats.length > 0) setActiveChatId(chats[0].id);
                        }
                      }} 
                      style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      + Install
                    </button>
                  </div>
                </div>

                <div style={{ padding: '16px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-0)' }}>Installed Plugins & Skills</h3>
                  {installedPlugins.length === 0 ? (
                    <div style={{ color: 'var(--text-1)', fontSize: '13px' }}>No custom plugins installed yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {installedPlugins.map((p, i) => (
                        <div key={i} style={{ padding: '10px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)' }}>{p.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-1)', marginTop: '4px' }}>{p.path}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                            <span style={{ padding: '2px 6px', background: 'var(--bg-3)', borderRadius: '4px' }}>{p.skillCount} Skills</span>
                            <span style={{ padding: '2px 6px', background: 'var(--bg-3)', borderRadius: '4px' }}>{p.commandCount} Cmds</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={async () => {
                      const cmds = await nadar?.reloadPlugins();
                      if (cmds) setPluginCommands(cmds);
                      const plugins = await nadar?.getLoadedPlugins();
                      if (plugins) setInstalledPlugins(plugins);
                      alert("Plugins and skills reloaded successfully!");
                    }} 
                    style={{ padding: '8px 16px', background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-0)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    🔄 Reload Installed Plugins
                  </button>
                </div>
              </div>
            )}

            </div>
          </div>
        </div>
      )}
      
      {/* ── Workflow Modal ── */}
      {showWorkflowModal && (
        <div className="settings-overlay" onClick={() => setShowWorkflowModal(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()} style={{ width: '700px', height: '550px' }}>
            <button className="settings-close-page" onClick={() => setShowWorkflowModal(false)}>✕</button>
            <div className="settings-sidebar" style={{ width: '220px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '13px' }}>Saved Workflows</div>
              <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
                <button className="settings-btn" onClick={() => setEditingWorkflow({ id: '', name: 'New Workflow', steps: [''] })} style={{ width: '100%', marginBottom: '12px' }}>+ Create New</button>
                {workflows.map(wf => (
                  <div key={wf.id} style={{ padding: '8px', cursor: 'pointer', borderRadius: '6px', background: wf.id === activeWorkflowId ? 'var(--accent-dim)' : 'transparent', border: wf.id === activeWorkflowId ? '1px solid var(--accent)' : '1px solid transparent', marginBottom: '8px' }} onClick={() => setActiveWorkflowId(wf.id)}>
                    <div style={{ fontWeight: 600, fontSize: '12px', color: wf.id === activeWorkflowId ? 'var(--accent)' : 'var(--text-0)' }}>{wf.name}</div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-1)' }} onClick={(e) => { e.stopPropagation(); setEditingWorkflow(wf); }}>✏ Edit</span>
                      <span style={{ fontSize: '10px', color: 'var(--red)' }} onClick={(e) => { e.stopPropagation(); const next = workflows.filter(w => w.id !== wf.id); setWorkflows(next); localStorage.setItem('nadar-workflows', JSON.stringify(next)); if(activeWorkflowId === wf.id) setActiveWorkflowId(null); if(editingWorkflow?.id === wf.id) setEditingWorkflow(null); }}>🗑 Delete</span>
                    </div>
                  </div>
                ))}
                {workflows.length === 0 && <div style={{ fontSize: '11px', color: 'var(--text-2)', textAlign: 'center', marginTop: '20px' }}>No workflows saved yet.</div>}
              </div>
            </div>
            <div className="settings-content" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column' }}>
              {editingWorkflow ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <h2 style={{ marginBottom: '20px', fontSize: '16px', color: 'var(--text-0)' }}>{editingWorkflow.id ? 'Edit Workflow' : 'Create New Workflow'}</h2>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>Workflow Name</label>
                    <input type="text" value={editingWorkflow.name} onChange={e => setEditingWorkflow({...editingWorkflow, name: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-0)', borderRadius: '6px', fontSize: '13px' }} placeholder="e.g. Code Review Checklist" />
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>Tasks / Linear Graph</label>
                    {editingWorkflow.steps.map((step: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ background: 'var(--bg-3)', padding: '10px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-1)', minWidth: '32px', textAlign: 'center', border: '1px solid var(--border)' }}>{i+1}</div>
                        <input type="text" value={step} onChange={e => {
                          const steps = [...editingWorkflow.steps];
                          steps[i] = e.target.value;
                          setEditingWorkflow({...editingWorkflow, steps});
                        }} style={{ flex: 1, padding: '10px', background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-0)', borderRadius: '6px', fontSize: '13px' }} placeholder={`Task step ${i+1}`} />
                        <button onClick={() => {
                          const steps = editingWorkflow.steps.filter((_: any, idx: number) => idx !== i);
                          setEditingWorkflow({...editingWorkflow, steps});
                        }} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--red)', padding: '0 12px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => setEditingWorkflow({...editingWorkflow, steps: [...editingWorkflow.steps, '']})} className="settings-btn" style={{ marginTop: '8px', fontSize: '12px', padding: '8px 16px', background: 'var(--bg-2)' }}>+ Add Step</button>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    <button className="new-task-btn" style={{ width: 'auto', padding: '8px 24px' }} onClick={() => {
                      if (!editingWorkflow.name.trim()) return alert('Please enter a workflow name.');
                      const wf = editingWorkflow;
                      let next;
                      if (!wf.id) { wf.id = uid(); next = [...workflows, wf]; }
                      else { next = workflows.map(w => w.id === wf.id ? wf : w); }
                      setWorkflows(next);
                      localStorage.setItem('nadar-workflows', JSON.stringify(next));
                      setEditingWorkflow(null);
                      if (!activeWorkflowId) setActiveWorkflowId(wf.id);
                    }}>Save Workflow</button>
                    <button onClick={() => setEditingWorkflow(null)} className="settings-btn" style={{ width: 'auto', padding: '8px 24px' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '13px' }}>
                  {activeWorkflowId ? 'Click Edit on the left to modify this workflow.' : 'Create a new workflow or select one to active it.'}
                </div>
              )}
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
            <div className="approval-actions">
              <button className="approval-btn btn-yes" onClick={() => handleApproval('yes')}>✓ Yes</button>
              <button className="approval-btn btn-no" onClick={() => handleApproval('no')}>✕ No</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Commands Modal ── */}
      {showCommandsModal && (
        <div className="modal-overlay" onClick={() => setShowCommandsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Slash Commands</h2>
              <button className="icon-btn" onClick={() => setShowCommandsModal(false)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ color: 'var(--text-1)', fontSize: '13px', margin: 0 }}>Available /commands from plugins, built-ins, and manual additions.</p>
              <button 
                onClick={() => setAddingCommand(!addingCommand)} 
                style={{ padding: '6px 12px', background: 'var(--accent)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                {addingCommand ? 'Cancel' : '+ Add Command'}
              </button>
            </div>
            
            {addingCommand && (
              <div style={{ padding: '16px', background: 'var(--bg-2)', borderRadius: '6px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-1)', marginBottom: '4px' }}>Command Name</label>
                  <input type="text" value={newCmd.name} onChange={e => setNewCmd({...newCmd, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')})} placeholder="e.g. format" style={{ width: '100%', padding: '8px', background: 'var(--bg-1)', border: '1px solid var(--border)', color: 'var(--text-0)', borderRadius: '4px' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-1)', marginBottom: '4px' }}>Description</label>
                  <input type="text" value={newCmd.description} onChange={e => setNewCmd({...newCmd, description: e.target.value})} placeholder="What does this do?" style={{ width: '100%', padding: '8px', background: 'var(--bg-1)', border: '1px solid var(--border)', color: 'var(--text-0)', borderRadius: '4px' }} />
                </div>
                <button onClick={() => {
                  if(!newCmd.name) return;
                  const next = [...customCommands, {name: newCmd.name, description: newCmd.description}];
                  setCustomCommands(next);
                  localStorage.setItem('nadar-custom-commands', JSON.stringify(next));
                  setNewCmd({name: '', description: ''});
                  setAddingCommand(false);
                }} style={{ padding: '6px 12px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Save Command</button>
              </div>
            )}

            <div className="commands-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { name: 'goal', description: 'Run a long-running task overnight without stopping until fully achieved.' },
                { name: 'plan', description: 'Create a careful step-by-step plan for a complex task before executing.' },
                { name: 'grill-me', description: 'Align on a plan through an interactive interview to resolve design decisions.' },
                { name: 'schedule', description: 'Run an instruction on a recurring schedule or set a one-time timer.' },
                { name: 'learn', description: 'Persist learned behavior for future tasks after solving a complex setup.' },
                ...pluginCommands.map(c => ({ name: c.cmd, description: c.desc })),
                ...customCommands
              ].map((cmd, i) => (
                  <div key={i} style={{ padding: '12px', background: 'var(--bg-1)', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'left', position: 'relative' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '4px' }}>/{cmd.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-1)' }}>{cmd.description}</div>
                    {customCommands.some(c => c.name === cmd.name) && (
                      <button onClick={() => {
                        const next = customCommands.filter(c => c.name !== cmd.name);
                        setCustomCommands(next);
                        localStorage.setItem('nadar-custom-commands', JSON.stringify(next));
                      }} style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>✕</button>
                    )}
                  </div>
              ))}
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
    <div className="tool-card-new">
      <div className="tcn-header" onClick={() => setExpanded(e => !e)}>
        <div className="tcn-title">
          <span className="tcn-icon">◳</span> Tool: <span className="tcn-name">{name}</span>
        </div>
        {extra?.ok !== undefined && (
          <span className={`tcn-pill ${extra.ok ? 'success' : 'fail'}`}>exit: {extra.ok ? '0' : '1'}</span>
        )}
      </div>
      {expanded && extra?.args && (
        <div className="tcn-payload">
          $ {typeof extra.args.command === 'string' ? extra.args.command : typeof extra.args.path === 'string' ? extra.args.path : JSON.stringify(extra.args)}
        </div>
      )}
      {expanded && extra?.diff && <div className="tcn-diff"><DiffView before={extra.diff.before} after={extra.diff.after} /></div>}
      {expanded && extra?.result && (
        <div className="tcn-result">
          {extra.result.slice(0, 300)}{extra.result.length > 300 ? '...' : ''}
        </div>
      )}
    </div>
  );
}
