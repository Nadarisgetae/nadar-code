const fs = require('fs');

const css = `
/* ── Phase 3 Editor Diff Card ── */
.diff-card {
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 500px;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  z-index: 100;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.dc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
}
.dc-title { font-weight: 600; font-size: 13px; color: var(--text-0); }
.dc-actions { display: flex; gap: 8px; }
.dc-btn {
  border: none; padding: 6px 12px; border-radius: 4px; font-weight: 600; font-size: 11px; cursor: pointer;
}
.dc-accept { background: var(--green); color: white; }
.dc-accept:hover { opacity: 0.9; }
.dc-reject { background: var(--bg-3); color: var(--text-0); border: 1px solid var(--border); }
.dc-reject:hover { background: var(--bg-4); }
.dc-body { border-bottom: 1px solid var(--border); }
.dc-footer {
  display: flex; gap: 12px; padding: 8px 16px; font-family: 'JetBrains Mono', monospace; font-size: 11px; background: var(--bg-1);
}
.dc-stat.add { color: var(--green); }
.dc-stat.sub { color: var(--red); }
`;

fs.appendFileSync('apps/desktop/src/index.css', css);
console.log("Appended Editor Diff Card css");
