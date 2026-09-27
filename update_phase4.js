const fs = require('fs');
let appTsx = fs.readFileSync('apps/desktop/src/App.tsx', 'utf8');

// Add terminal tabs state
appTsx = appTsx.replace(
  "const [activeFile, setActiveFile] = useState<string | null>(null);",
  "const [activeFile, setActiveFile] = useState<string | null>(null);\n  const [terminalTabs, setTerminalTabs] = useState([{ id: 1, name: 'PowerShell' }]);\n  const [activeTermId, setActiveTermId] = useState(1);"
);

// Replace terminal tabs UI
const termTabsOld = `<div className="terminal-tabs-bar">
                    <div className="terminal-tab active">
                      <span className="term-icon">›_</span> PowerShell <span className="term-badge">ACTIVE</span>
                    </div>
                    <div className="terminal-tools">
                      <span className="term-info">Windows Terminal NT</span>
                      <span className="term-btn">+</span><span className="term-btn">🗑</span>
                    </div>
                  </div>`;
                  
const termTabsNew = `<div className="terminal-tabs-bar">
                    <div style={{display: 'flex', height: '100%'}}>
                      {terminalTabs.map(t => (
                        <div key={t.id} className={\`terminal-tab \${activeTermId === t.id ? 'active' : ''}\`} onClick={() => setActiveTermId(t.id)}>
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
                  </div>`;

appTsx = appTsx.replace(termTabsOld, termTabsNew);
fs.writeFileSync('apps/desktop/src/App.tsx', appTsx);
console.log("App.tsx updated for terminal tabs");

let css = fs.readFileSync('apps/desktop/src/index.css', 'utf8');
css += `
/* ── Phase 4 Explorer Badges ── */
.tree-node:hover { background: var(--bg-2); }
.git-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 0 4px;
  border-radius: 4px;
  margin-left: auto;
}
.git-badge.M { color: var(--blue, #58a6ff); background: rgba(88, 166, 255, 0.15); }
.git-badge.U { color: var(--green); background: rgba(46, 160, 67, 0.15); }

.explorer-container { overflow-y: auto; overflow-x: hidden; height: 100%; padding-top: 10px; padding-bottom: 20px; }
`;
fs.writeFileSync('apps/desktop/src/index.css', css);
console.log("index.css updated for explorer badges");
