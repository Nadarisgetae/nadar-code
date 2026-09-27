const fs = require('fs');
let appTsx = fs.readFileSync('apps/desktop/src/App.tsx', 'utf8');

appTsx = appTsx.replace(
  "const [activeFile, setActiveFile] = useState<string | null>(null);",
  "const [activeFile, setActiveFile] = useState<string | null>(null);\n  const [splitView, setSplitView] = useState(false);\n  const [showProposal, setShowProposal] = useState(true);"
);

appTsx = appTsx.replace(
  '<div className="ai-inline-pill">AI Inline <span className="hotkey">Ctrl+K</span></div>',
  '<div className="ai-inline-pill" onClick={() => setShowProposal(p => !p)}>AI Inline <span className="hotkey">Ctrl+K</span></div>'
);

appTsx = appTsx.replace(
  '<span className="split-icon">◫</span>',
  '<span className="split-icon" onClick={() => setSplitView(s => !s)}>◫</span>'
);

appTsx = appTsx.replace(
  '<Editor filePath={activeFile} />',
  '<Editor filePath={activeFile} splitView={splitView} showProposal={showProposal} onAccept={() => setShowProposal(false)} onReject={() => setShowProposal(false)} />'
);

fs.writeFileSync('apps/desktop/src/App.tsx', appTsx);
console.log("App.tsx updated for split view");
