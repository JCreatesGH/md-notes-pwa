// Minimal safe Markdown -> HTML (escapes input first).
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
export function renderMarkdown(md: string): string {
  const out: string[] = [];
  let inList = false, inCode = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  for (const raw of md.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (line.trim().startsWith("```")) {
      if (!inCode) { closeList(); out.push("<pre><code>"); inCode = true; }
      else { out.push("</code></pre>"); inCode = false; }
      continue;
    }
    if (inCode) { out.push(esc(raw)); continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { closeList(); out.push(`<h${h[1].length}>${inlineMd(h[2])}</h${h[1].length}>`); continue; }
    const li = /^[-*]\s+(.*)$/.exec(line);
    if (li) { if (!inList) { out.push("<ul>"); inList = true; } out.push(`<li>${inlineMd(li[1])}</li>`); continue; }
    if (line.trim() === "") { closeList(); continue; }
    closeList(); out.push(`<p>${inlineMd(line)}</p>`);
  }
  closeList(); if (inCode) out.push("</code></pre>");
  return out.join("\n");
}
export function inlineMd(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
