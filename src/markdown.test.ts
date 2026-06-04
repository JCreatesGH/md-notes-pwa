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
});
