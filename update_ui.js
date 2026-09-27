const fs = require('fs');

let appTsx = fs.readFileSync('apps/desktop/src/App.tsx', 'utf8');

const renderStart = appTsx.indexOf('  // ── Render ────────────────────────────────────────────────────────────────');
const renderEnd = appTsx.indexOf('  );\n}\n\n// ── Tool Card ─────────────────────────────────────────────────────────────────');

if (renderStart === -1 || renderEnd === -1) {
  console.error("Could not find render boundaries in App.tsx");
  process.exit(1);
}

const newRender = `  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* 1. Title Bar */}
      <div className="titlebar">
        <div className="titlebar-left">
          <span className="titlebar-brand">⬡ NadarCode</span>
          <div className="titlebar-menus">
            <span>File</span><span>Edit</span><span>Selection</span><span>View</span><span>Go</span><span>Run</span><span>Terminal</span><span>Help</span>
          </div>
        </div>
        <div className="titlebar-center">
          <div className="workspace-pill" onClick={handleChooseProject}>
            <span className="folder-icon">📁</span> {config.cwd ? config.cwd.split(/[\\\\/]/).pop() : 'No Project'}
            <span className="separator">|</span>
            <span className="git-branch">⑂ main</span>
          </div>
        </div>
        <div className="titlebar-right">
          <button className="window-btn minimize">—</button>
          <button className="window-btn maximize">▢</button>
          <button className="window-btn close">✕</button>
        </div>
      </div>

      {/* 2. Secondary Toolbar */}
      <div className="secondary-bar">
        <div className="sec-left">
          <span className="sec-label">MODE:</span>
          <div className="mode-switcher">
            <button className={\`mode-btn \${config.mode === 'manual' ? 'active' : ''}\`} onClick={() => handleModeChange('manual')}>Manual</button>
            <button className={\`mode-btn \${config.mode === 'plan' ? 'active' : ''}\`} onClick={() => handleModeChange('plan')}>Plan</button>
            <button className={\`mode-btn \${config.mode === 'auto' ? 'active' : ''}\`} onClick={() => handleModeChange('auto')}>
              <span className={\`status-dot \${config.mode === 'auto' ? 'green' : 'dim'}\`}></span> Auto Agent
            </button>
          </div>
        </div>
        <div className="sec-center">
          <span className="sec-label">Model:</span>
          <div className="model-selector" onClick={() => setShowSettings(true)}>
            <span className="status-dot purple"></span> {config.model || 'Select Model'} ⌄
          </div>
        </div>
        <div className="sec-right">
          <div className="telemetry-pill">
            <span className="status-dot green"></span> OpenRouter: {config.keyCount}/{config.keyCount} Active Keys — Healthy
          </div>
          <div className="token-usage">
            ⚡ 34.2k tok
          </div>
        </div>
      </div>

      {/* 3. Main Body */}
      <div className="main">
        <Allotment>
          {/* Pane 1: Left Nav */}
          <Allotment.Pane preferredSize={250} minSize={200}>
            <div className="sidebar">
              <div className="sidebar-action">
                <button className="new-task-btn" onClick={handleClearHistory}>+ New Autonomous Task</button>
              </div>
              <Allotment vertical>
                <Allotment.Pane preferredSize={200}>
                  <div className="sidebar-section goals-section">
                    <div className="sidebar-title">ACTIVE GOAL THREADS <span className="badge">1</span></div>
                    <div className="thread-item active">
                      <span className="thread-icon">✧</span> Analyse codebase <span className="thread-badge run">RUN</span>
                    </div>
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
                          className={\`editor-tab \${activeFile === file ? 'active' : ''}\`}
                          onClick={() => setActiveFile(file)}
                        >
                          <span className="file-icon">📄</span> {file.split(/[\\\\/]/).pop()}
                          <button className="close-tab" onClick={(e) => handleCloseTab(file, e)}>✕</button>
                        </div>
                      ))}
                      {openFiles.length === 0 && <span style={{ padding: '0 12px', opacity: 0.5 }}>welcome.ts</span>}
                    </div>
                    <div className="editor-tools">
                      <div className="ai-inline-pill">AI Inline <span className="hotkey">Ctrl+K</span></div>
                      <span className="split-icon">◫</span>
                    </div>
                  </div>
                  <div className="editor-content">
                    <Editor filePath={activeFile} />
                  </div>
                </div>
              </Allotment.Pane>
              
              <Allotment.Pane preferredSize={250} minSize={100}>
                <div className="terminal-container">
                  <div className="terminal-tabs-bar">
                    <div className="terminal-tab active">
                      <span className="term-icon">›_</span> PowerShell <span className="term-badge">ACTIVE</span>
                    </div>
                    <div className="terminal-tools">
                      <span className="term-info">Windows Terminal NT</span>
                      <span className="term-btn">+</span><span className="term-btn">🗑</span>
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
                  <span className="status-dot green pulse"></span> Autonomous Copilot
                </div>
                <div className="token-usage">34.2k tok</div>
              </div>

              <div className="copilot-body" ref={transcriptRef}>
                {messages.length === 0 && (
                  <div className="empty-state">Your AI coding agent is ready.</div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={\`msg \${m.role}\`}>
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
                    <div className="msg-bubble"><div className="thinking"><span /><span /><span /></div></div>
                  </div>
                )}
              </div>

              <div className="copilot-input-area">
                <div className="quick-commands">
                  <span onClick={() => setInput('/goal ')}>/goal</span>
                  <span onClick={() => setInput('/plan ')}>/plan</span>
                  <span onClick={() => setInput('/fix ')}>/fix</span>
                  <span onClick={() => setInput('/key-rotate ')}>/key-rotate</span>
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
                      <span className="provider-info">@ OpenRouter: {config.model ? config.model.split('/').pop() : 'Model'}</span>
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
          <span className="status-item">UTF-8</span>
          <span className="status-item">CRLF</span>
          <span className="status-item">PowerShell</span>
          <span className="status-item">Python 3.11</span>
          <span className="status-item agent-state"><span className="status-dot green"></span> Auto-Agent: RUNNING</span>
          <span className="status-item keys-state">🗝 Keys: {config.keyCount}/{config.keyCount} OK</span>
        </div>
      </div>
      
      {/* ── Settings Panel ── */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h2>Settings</h2>
              <button className="settings-close" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="settings-body">
              <div className="settings-field">
                <label>Available Free Models</label>
                <button className="settings-btn" onClick={handleFetchModels} disabled={loadingModels}>
                  {loadingModels ? 'Fetching...' : '🔄 Fetch Free Models from OpenRouter'}
                </button>
                {availableModels.length > 0 && (
                  <div className="models-list">
                    {availableModels.map(m => (
                        <div key={m.id} className={\`model-item \${m.id === config.model ? 'selected' : ''}\`} onClick={() => handleModelSelect(m.id)}>
                          <span className="model-name">{m.name || m.id}</span>
                        </div>
                    ))}
                  </div>
                )}
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
            <div className="approval-actions">
              <button className="approval-btn btn-yes" onClick={() => handleApproval('yes')}>✓ Yes</button>
              <button className="approval-btn btn-no" onClick={() => handleApproval('no')}>✕ No</button>
            </div>
          </div>
        </div>
      )}
`;

appTsx = appTsx.substring(0, renderStart) + newRender + appTsx.substring(renderEnd);
fs.writeFileSync('apps/desktop/src/App.tsx', appTsx);
console.log("App.tsx updated");
