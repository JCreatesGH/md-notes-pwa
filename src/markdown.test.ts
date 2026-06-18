import { describe, it, expect } from "vitest";
import { renderMarkdown, inlineMd } from "./markdown";

describe("markdown", () => {
  it("renders headings, lists and inline styles", () => {
    const html = renderMarkdown("# Title\n\n- **bold** item\n- `code`");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<code>code</code>");
  });
  it("escapes html to prevent injection", () => {
    expect(inlineMd("<img src=x onerror=alert(1)>")).not.toContain("<img");
  });
  it("links open safely", () => {
    expect(inlineMd("[t](https://x.com)")).toContain('rel="noopener"');
  });
  it("blocks javascript: URLs in links", () => {
    const out = inlineMd("[x](javascript:alert(1))");
    expect(out).toContain('href="#"');
    expect(out).not.toContain("javascript");
  });
  it("escapes a quote in a URL so it can't break out of the attribute", () => {
    const out = inlineMd('[x](http://e" onx=y)');
    expect(out).toContain("&quot;");
    expect(out).not.toMatch(/href="http:\/\/e" onx/);
  });
  it("keeps Markdown inside inline code literal", () => {
    expect(inlineMd("`[x](javascript:bad)`")).toBe("<code>[x](javascript:bad)</code>");
  });
  it("renders images with sanitized URLs", () => {
    expect(inlineMd("![a](/x.png)")).toBe('<img src="/x.png" alt="a">');
    expect(inlineMd("![a](javascript:bad)")).toContain('src="#"');
  });
  it("renders ordered lists and blockquotes", () => {
    expect(renderMarkdown("1. one\n2. two")).toContain("<ol>");
    expect(renderMarkdown("> quoted")).toContain("<blockquote>");
  });
});
