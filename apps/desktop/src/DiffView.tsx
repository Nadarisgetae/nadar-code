import { useMemo } from 'react';

interface Props {
  before: string;
  after: string;
}

export default function DiffView({ before, after }: Props) {
  const lines = useMemo(() => {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    const result: { type: 'ctx' | 'del' | 'add'; text: string }[] = [];

    // Simple line-by-line diff using LCS-lite
    let bi = 0;
    let ai = 0;
    const maxLines = 80;
    let shown = 0;

    while ((bi < beforeLines.length || ai < afterLines.length) && shown < maxLines) {
      const bLine = beforeLines[bi];
      const aLine = afterLines[ai];

      if (bi >= beforeLines.length) {
        result.push({ type: 'add', text: `+ ${aLine}` });
        ai++; shown++;
      } else if (ai >= afterLines.length) {
        result.push({ type: 'del', text: `- ${bLine}` });
        bi++; shown++;
      } else if (bLine === aLine) {
        // Show context lines only near changes
        result.push({ type: 'ctx', text: `  ${bLine}` });
        bi++; ai++; shown++;
      } else {
        result.push({ type: 'del', text: `- ${bLine}` });
        result.push({ type: 'add', text: `+ ${aLine}` });
        bi++; ai++; shown += 2;
      }
    }
    return result;
  }, [before, after]);

  // Collapse unchanged context — only show lines near changes
  const rendered = useMemo(() => {
    const CONTEXT = 2;
    const changeIdxs = new Set<number>();
    lines.forEach((l, i) => { if (l.type !== 'ctx') changeIdxs.add(i); });
    const visible = new Set<number>();
    changeIdxs.forEach(ci => {
      for (let i = Math.max(0, ci - CONTEXT); i <= Math.min(lines.length - 1, ci + CONTEXT); i++) {
        visible.add(i);
      }
    });
    const out: { type: string; text: string }[] = [];
    let lastShown = -1;
    for (let i = 0; i < lines.length; i++) {
      if (visible.has(i)) {
        if (lastShown >= 0 && i > lastShown + 1) {
          out.push({ type: 'ctx', text: `  @@ ... @@` });
        }
        out.push(lines[i]);
        lastShown = i;
      }
    }
    return out;
  }, [lines]);

  if (rendered.length === 0) return null;

  return (
    <div className="diff-block">
      {rendered.map((l, i) => (
        <div key={i} className={`diff-line ${l.type}`}>{l.text}</div>
      ))}
    </div>
  );
}
