import { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, ChevronDown, FileJson, FileCode2, FileType, FileText, Image as ImageIcon } from 'lucide-react';

interface FileNode {
  name: string;
  isDirectory: boolean;
  path: string;
}

interface ExplorerProps {
  cwd: string;
  onFileSelect: (path: string) => void;
}

function TreeNode({ node, onFileSelect, depth }: { node: FileNode; onFileSelect: (path: string) => void; depth: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileNode[]>([]);
  const nadar = (window as any).nadar;

  const handleClick = async () => {
    if (node.isDirectory) {
      if (!isOpen) {
        const items = await nadar.listDir(node.path);
        setChildren(items);
      }
      setIsOpen(!isOpen);
    } else {
      onFileSelect(node.path);
    }
  };

  return (
    <div>
      <div 
        className="tree-node"
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 12 + 10}px`, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', paddingBottom: 4, paddingTop: 4, paddingRight: '10px' }}
      >
        <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>
          {node.isDirectory ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : <span style={{width: 14}}/>}
        </span>
        {node.isDirectory ? <Folder size={14} color="var(--accent)" /> : (() => {
          const ext = node.name.split('.').pop()?.toLowerCase();
          if (ext === 'json') return <FileJson size={14} color="var(--yellow)" />;
          if (ext === 'ts' || ext === 'tsx') return <FileType size={14} color="var(--blue, #58a6ff)" />;
          if (ext === 'js' || ext === 'jsx') return <FileCode2 size={14} color="var(--yellow)" />;
          if (ext === 'md') return <FileText size={14} color="var(--text-1)" />;
          if (['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext || '')) return <ImageIcon size={14} color="var(--green)" />;
          return <File size={14} color="var(--text-2)" />;
        })()}
        <span style={{ fontSize: 13, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.name}
        </span>
      </div>
      {isOpen && node.isDirectory && (
        <div>
          {children.map(child => (
            <TreeNode key={child.path} node={child} onFileSelect={onFileSelect} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Explorer({ cwd, onFileSelect }: ExplorerProps) {
  const [items, setItems] = useState<FileNode[]>([]);
  const nadar = (window as any).nadar;

  useEffect(() => {
    if (cwd && nadar) {
      nadar.listDir(cwd).then(setItems);
    }
  }, [cwd]);

  return (
    <div style={{ overflowY: 'auto', overflowX: 'hidden', height: '100%', paddingTop: 10 }}>
      {items.map(item => (
        <TreeNode key={item.path} node={item} onFileSelect={onFileSelect} depth={0} />
      ))}
    </div>
  );
}
