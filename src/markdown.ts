// Minimal safe Markdown -> HTML (escapes input first).
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// `&<>` are already escaped before a URL reaches an attribute; only the quote
// can still break out, so escape it too.
function escQuote(s: string): string {
  return s.replace(/"/g, "&quot;");
}
// Block executable / data URLs (XSS); allow http(s), mailto, anchors, relative.
function safeUrl(url: string): string {
  return /^\s*(javascript|data|vbscript|file):/i.test(url) ? "#" : url;
}

export function renderMarkdown(md: string): string {
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let inCode = false, inQuote = false;
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const closeQuote = () => { if (inQuote) { out.push("</blockquote>"); inQuote = false; } };
  for (const raw of md.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (line.trim().startsWith("```")) {
      if (!inCode) { closeList(); closeQuote(); out.push("<pre><code>"); inCode = true; }
      else { out.push("</code></pre>"); inCode = false; }
      continue;
    }
    if (inCode) { out.push(esc(raw)); continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { closeList(); closeQuote(); out.push(`<h${h[1].length}>${inlineMd(h[2])}</h${h[1].length}>`); continue; }
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ul || ol) {
      closeQuote();
      const want = ul ? "ul" : "ol";
      if (list !== want) { closeList(); out.push(`<${want}>`); list = want; }
      out.push(`<li>${inlineMd((ul || ol)![1])}</li>`);
      continue;
    }
    const q = /^>\s?(.*)$/.exec(line);
    if (q) { closeList(); if (!inQuote) { out.push("<blockquote>"); inQuote = true; } out.push(`<p>${inlineMd(q[1])}</p>`); continue; }
    if (line.trim() === "") { closeList(); closeQuote(); continue; }
    closeList(); closeQuote(); out.push(`<p>${inlineMd(line)}</p>`);
  }
  closeList(); closeQuote(); if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

export function inlineMd(s: string): string {
  // Split on inline code spans so Markdown inside them stays literal.
  return s.split(/(`[^`]+`)/g).map((part) => {
    if (part.length >= 2 && part.startsWith("`") && part.endsWith("`")) {
      return `<code>${esc(part.slice(1, -1))}</code>`;
    }
    let t = esc(part);
    t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) =>
      `<img src="${escQuote(safeUrl(url))}" alt="${escQuote(alt)}">`);
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, txt, url) =>
      `<a href="${escQuote(safeUrl(url))}" target="_blank" rel="noopener">${txt}</a>`);
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    return t;
  }).join("");
}
