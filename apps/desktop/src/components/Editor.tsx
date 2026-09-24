import { useState, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';

interface EditorProps {
  filePath: string | null;
}

export default function Editor({ filePath }: EditorProps) {
  const [content, setContent] = useState<string>('// Select a file to edit');
  const nadar = (window as any).nadar;

  useEffect(() => {
    if (!filePath || !nadar) {
      setContent('// Select a file to edit');
      return;
    }
    nadar.readFile(filePath).then(setContent).catch((err: any) => {
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

  return (
    <div style={{ flex: 1, width: '100%', height: '100%' }}>
      <MonacoEditor
        height="100%"
        language={language}
        theme="vs-dark"
        value={content}
        onChange={(val) => handleSave(val)}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16 }
        }}
      />
    </div>
  );
}
