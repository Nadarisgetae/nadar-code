import { useEffect, useState, useMemo } from 'react';

const nadar = (window as any).nadar ?? null;

export const COMMANDS = [
  // Antigravity commands
  { cmd: '/goal', desc: 'Run a long-running autonomous task without stopping.' },
  { cmd: '/schedule', desc: 'Run an instruction on a recurring schedule.' },
  { cmd: '/plan', desc: 'Careful step-by-step planning before execution.' },
  { cmd: '/research', desc: 'Perform extensive web research and output a comprehensive report.' },
  { cmd: '/grill-me', desc: 'Interactive interview to resolve design decisions.' },
  { cmd: '/learn', desc: 'Save a complex setup or behavior for future tasks.' },
  // Claude Code commands
  { cmd: '/compact', desc: 'Compress the conversation history.' },
  { cmd: '/clear', desc: 'Clear the current conversation.' },
  { cmd: '/help', desc: 'Show the help guide and available commands.' },
];

interface SlashMenuProps {
  input: string;
  onSelect: (cmd: string) => void;
  onClose: () => void;
}

export default function SlashMenu({ input, onSelect, onClose }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pluginCommands, setPluginCommands] = useState<{cmd: string, desc: string}[]>([]);

  useEffect(() => {
    if (nadar && nadar.getPluginCommands) {
      nadar.getPluginCommands().then((cmds: any) => {
        if (Array.isArray(cmds)) {
          setPluginCommands(cmds);
        }
      }).catch(console.error);
    }
  }, []);

  const allCommands = useMemo(() => {
    // Merge built-in commands with plugin commands
    return [...COMMANDS, ...pluginCommands];
  }, [pluginCommands]);

  // Match anything after the slash to filter
  const query = input.startsWith('/') ? input.slice(1).toLowerCase() : '';
  const filtered = allCommands.filter(c => c.cmd.toLowerCase().includes(query));

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].cmd);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (filtered.length === 0 || !input.startsWith('/')) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: 0,
      marginBottom: '10px',
      width: '350px',
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      zIndex: 100
    }}>
      <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-2)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Commands
      </div>
      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
        {filtered.map((c, i) => (
          <div
            key={c.cmd}
            onClick={() => onSelect(c.cmd)}
            style={{
              padding: '10px 12px',
              cursor: 'pointer',
              background: i === selectedIndex ? 'var(--accent-dim)' : 'transparent',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            <span style={{ color: i === selectedIndex ? 'var(--accent-hover)' : 'var(--text-0)', fontWeight: 600, fontSize: '13px' }}>
              {c.cmd}
            </span>
            <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{c.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
