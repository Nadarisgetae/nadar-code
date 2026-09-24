import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export default function TerminalPane() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#0d0d0f',
        foreground: '#f0f0f5',
        cursor: '#7c6afb',
        black: '#141416',
        red: '#f85149',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b0b0bb',
      },
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      cursorBlink: true,
      convertEol: true, // Needed since we use raw child_process.spawn
    });
    
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(terminalRef.current);
    fit.fit();
    
    termInstance.current = term;
    fitAddon.current = fit;

    const nadar = (window as any).nadar;
    if (nadar) {
      nadar.spawnTerminal();

      // Listen to output from the main process
      nadar.onTerminalData((data: string) => {
        term.write(data);
      });

      // Send keystrokes to the main process
      term.onData((data: string) => {
        nadar.writeTerminal(data);
      });

      const handleResize = () => {
        fit.fit();
        nadar.resizeTerminal(term.cols, term.rows);
      };
      
      window.addEventListener('resize', handleResize);
      // Give UI time to layout before first fit
      setTimeout(handleResize, 100);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        term.dispose();
      };
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', padding: '8px' }}>
      <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
