const fs = require('fs');

let appTsx = fs.readFileSync('apps/desktop/src/App.tsx', 'utf8');

// 1. Add keyStatusData state
appTsx = appTsx.replace(
  "const [keyStatus, setKeyStatus] = useState('');",
  "const [keyStatus, setKeyStatus] = useState('');\n  const [keyStatusData, setKeyStatusData] = useState<any[]>([]);"
);

// 2. Update useEffect for key data polling
const useEffOld = `    nadar.getKeyStatus().then(setKeyStatus);

    nadar.onCoreEvent((event: any) => {`;
const useEffNew = `    const refreshKeys = () => {
      nadar.getKeyStatus().then(setKeyStatus);
      nadar.getKeyStatusData().then(setKeyStatusData);
    };
    refreshKeys();
    const keyInt = setInterval(refreshKeys, 5000);

    nadar.onCoreEvent((event: any) => {`;
appTsx = appTsx.replace(useEffOld, useEffNew);

// Add cleanup for interval
appTsx = appTsx.replace(
  "    nadar.onProjectChanged(({ cwd }: { cwd: string }) => {\n      setConfig(c => ({ ...c, cwd }));\n      setMessages([]);\n    });\n  }, []);",
  "    nadar.onProjectChanged(({ cwd }: { cwd: string }) => {\n      setConfig(c => ({ ...c, cwd }));\n      setMessages([]);\n    });\n    return () => clearInterval(keyInt);\n  }, []);"
);

// 3. Replace Copilot body
const copilotBodyOld = `<div className="copilot-body" ref={transcriptRef}>
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
              </div>`;

const copilotBodyNew = `<div className="copilot-body" ref={transcriptRef}>
                {/* Key Pool Matrix */}
                {keyStatusData.length > 0 && (
                  <div className="key-pool-card">
                    <div className="kpc-header">
                      <span className="kpc-icon">🗝</span> OpenRouter Key Pool (keys.txt) 
                      <span className="kpc-stats"><span className="green">{keyStatusData.filter(k => k.ready).length} Ready</span> • {keyStatusData.filter(k => k.cooldownSecs > 0).length} Cooldown</span>
                    </div>
                    <div className="kpc-grid">
                      {keyStatusData.map((k, i) => (
                        <div key={i} className={\`kpc-bar \${k.ready ? 'ready' : k.disabled ? 'disabled' : 'cooldown'} \${k.isCurrent ? 'current' : ''}\`} title={k.masked}></div>
                      ))}
                    </div>
                  </div>
                )}

                {/* User Directive (mocking first user message as directive) */}
                {messages.length > 0 && (
                  <div className="directive-card">
                    <div className="dir-label">USER DIRECTIVE</div>
                    <div className="dir-content">{messages.find(m => m.role === 'user')?.content || ''}</div>
                  </div>
                )}

                {/* Messages & Tool Cards */}
                {messages.length === 0 && (
                  <div className="empty-state">Your AI coding agent is ready.</div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={\`msg \${m.role}\`}>
                    {m.role === 'tool' ? (
                      <ToolCard msg={m} />
                    ) : m.role === 'user' ? null : (
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
              </div>`;

appTsx = appTsx.replace(copilotBodyOld, copilotBodyNew);

// 4. Update Tool Card
const toolCardOldStart = `// ── Tool Card ─────────────────────────────────────────────────────────────────`;
const toolCardOldEnd = `    </div>\n  );\n}\n`;

const toolCardOldIdx = appTsx.indexOf(toolCardOldStart);
if (toolCardOldIdx !== -1) {
  const toolCardNew = `// ── Tool Card ─────────────────────────────────────────────────────────────────
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
          <span className={\`tcn-pill \${extra.ok ? 'success' : 'fail'}\`}>exit: {extra.ok ? '0' : '1'}</span>
        )}
      </div>
      {extra?.args && (
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
`;
  appTsx = appTsx.substring(0, toolCardOldIdx) + toolCardNew;
}

fs.writeFileSync('apps/desktop/src/App.tsx', appTsx);
console.log("App.tsx updated for copilot");

// Update index.css
let css = fs.readFileSync('apps/desktop/src/index.css', 'utf8');
const newCss = `
/* ── Phase 2 Copilot Styles ── */
.key-pool-card { background: var(--bg-1); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
.kpc-header { display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace; margin-bottom: 10px; }
.kpc-icon { color: var(--yellow); margin-right: 4px; }
.kpc-stats { color: var(--text-2); }
.kpc-stats .green { color: var(--green); }
.kpc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.kpc-bar { height: 6px; border-radius: 3px; background: var(--bg-3); }
.kpc-bar.ready { background: var(--green); }
.kpc-bar.cooldown { background: var(--yellow); }
.kpc-bar.disabled { background: var(--red); }
.kpc-bar.current { box-shadow: 0 0 4px var(--accent); border: 1px solid var(--accent); }

.directive-card { background: var(--accent-dim); border: 1px solid var(--accent); border-radius: 8px; padding: 12px; }
.dir-label { font-size: 10px; font-weight: 700; color: var(--text-2); margin-bottom: 6px; letter-spacing: 0.5px; }
.dir-content { font-size: 13px; color: var(--text-0); line-height: 1.5; }

.cot-card, .checklist-card { background: var(--bg-1); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.cot-header, .chk-header { padding: 10px 12px; background: var(--bg-2); font-size: 11px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
.cot-icon, .chk-icon { margin-right: 6px; color: var(--text-1); }
.cot-time { color: var(--text-2); font-family: 'JetBrains Mono', monospace; }
.chk-progress { color: var(--green); }
.cot-body { padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-1); line-height: 1.6; }
.chk-body { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.chk-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-1); }
.chk-box { width: 14px; height: 14px; border: 1px solid var(--border); border-radius: 3px; display: inline-block; }
.chk-item.done .chk-box { background: var(--green); border-color: var(--green); }
.chk-item.done { color: var(--text-0); text-decoration: line-through; }

.tool-card-new { background: var(--bg-1); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.tcn-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; cursor: pointer; }
.tcn-title { font-size: 12px; color: var(--text-2); font-family: 'JetBrains Mono', monospace; }
.tcn-name { color: var(--text-0); font-weight: 600; }
.tcn-pill { padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.tcn-pill.success { background: var(--green); color: white; }
.tcn-pill.fail { background: var(--red); color: white; }
.tcn-payload { padding: 10px 12px; background: var(--bg-0); font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-1); border-top: 1px solid var(--border); }
.tcn-result { padding: 10px 12px; background: var(--bg-2); font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-1); border-top: 1px dashed var(--border); }
.tcn-diff { padding: 10px 12px; border-top: 1px dashed var(--border); }

/* Remove old tool card styles */
`;

fs.appendFileSync('apps/desktop/src/index.css', newCss);
console.log("index.css updated for copilot");
