import { useState, useEffect } from 'react';
import MonacoEditor, { DiffEditor } from '@monaco-editor/react';
import { Allotment } from 'allotment';

interface EditorProps {
  filePath: string | null;
  splitView?: boolean;
  showProposal?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
}

export default function Editor({ filePath, splitView, showProposal, onAccept, onReject }: EditorProps) {
  const [content, setContent] = useState<string>('// Select a file to edit');
  const [content2, setContent2] = useState<string>('// Split View');
  const nadar = (window as any).nadar;

  useEffect(() => {
    if (!filePath || !nadar) {
      setContent('// Select a file to edit');
      setContent2('// Split View');
      return;
    }
    nadar.readFile(filePath).then((data: string) => {
        setContent(data);
        setContent2(data); // clone content for split view initially
    }).catch((err: any) => {
      setContent(`// Error loading file:\n${err.message}`);
    });
  }, [filePath]);

  const handleSave = (value: string | undefined) => {
    if (filePath && value !== undefined && nadar) {
      nadar.writeFile(filePath, value);
    }
  };

  // Determine language based on extension
  const ext = filePath?.split('.').pop() || 'text';
  let language = 'text';
  if (['ts', 'tsx'].includes(ext)) language = 'typescript';
  if (['js', 'jsx'].includes(ext)) language = 'javascript';
  if (['json'].includes(ext)) language = 'json';
  if (['md'].includes(ext)) language = 'markdown';
  if (['css'].includes(ext)) language = 'css';
  if (['html'].includes(ext)) language = 'html';

  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 16 }
  };

  const renderEditor = (val: string, onChange?: (val: string | undefined) => void) => (
    <MonacoEditor
      height="100%"
      language={language}
      theme="vs-dark"
      value={val}
      onChange={onChange}
      options={editorOptions}
    />
  );

  const originalMock = `// Original
function example() {
  console.log("Hello");
}
`;

  const modifiedMock = `// Autonomous Proposal
function example() {
  console.log("Hello, Nadar!");
  return true;
}
`;

  return (
    <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
      {splitView ? (
        <Allotment>
          <Allotment.Pane>
             {renderEditor(content, handleSave)}
          </Allotment.Pane>
          <Allotment.Pane>
             {renderEditor(content2, (v) => setContent2(v || ''))}
          </Allotment.Pane>
        </Allotment>
      ) : (
        renderEditor(content, handleSave)
      )}

      {/* Floating Inline Proposal Card */}
      {showProposal && (
        <div className="diff-card">
          <div className="dc-header">
            <span className="dc-title">✨ Autonomous Proposal: updateGreeting()</span>
            <div className="dc-actions">
              <button className="dc-btn dc-reject" onClick={onReject}>✕ Reject</button>
              <button className="dc-btn dc-accept" onClick={onAccept}>✓ Accept</button>
            </div>
          </div>
          <div className="dc-body">
            <DiffEditor
              height="200px"
              language={language}
              theme="vs-dark"
              original={originalMock}
              modified={modifiedMock}
              options={{
                ...editorOptions,
                readOnly: true,
                renderSideBySide: false,
                padding: { top: 8 }
              }}
            />
          </div>
          <div className="dc-footer">
            <span className="dc-stat add">+2 additions</span>
            <span className="dc-stat sub">-1 deletion</span>
          </div>
        </div>
      )}
    </div>
  );
}
