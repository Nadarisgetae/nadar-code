import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const [copied, setCopied] = React.useState(false);

          const handleCopy = () => {
            navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          };

          return !inline && match ? (
            <div style={{ position: 'relative', marginTop: '12px', marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-3)', padding: '6px 12px', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-1)', fontFamily: 'Inter, sans-serif' }}>
                <span>{match[1]}</span>
                <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {copied ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <SyntaxHighlighter
                {...props}
                style={vscDarkPlus as any}
                language={match[1]}
                PreTag="div"
                customStyle={{ margin: 0, padding: '16px', background: 'var(--bg-1)', fontSize: '13px' }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code {...props} className={className} style={{ background: 'var(--bg-3)', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p style={{ marginBottom: '12px', lineHeight: '1.5' }}>{children}</p>;
        },
        a({ children, href }) {
          return <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{children}</a>;
        },
        ul({ children }) {
          return <ul style={{ paddingLeft: '24px', marginBottom: '12px' }}>{children}</ul>;
        },
        ol({ children }) {
          return <ol style={{ paddingLeft: '24px', marginBottom: '12px' }}>{children}</ol>;
        },
        li({ children }) {
          return <li style={{ marginBottom: '4px' }}>{children}</li>;
        },
        h1({ children }) { return <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '16px 0 8px 0', color: 'var(--text-0)' }}>{children}</h1>; },
        h2({ children }) { return <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '16px 0 8px 0', color: 'var(--text-0)' }}>{children}</h2>; },
        h3({ children }) { return <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '16px 0 8px 0', color: 'var(--text-0)' }}>{children}</h3>; },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
