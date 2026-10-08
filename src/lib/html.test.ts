import { describe, expect, it } from "vitest";
import { escapeHtml } from "./html";

describe("escapeHtml", () => {
  it("neutralizes tags and attribute breakouts", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(escapeHtml("a' onmouseover='x")).toBe("a&#39; onmouseover=&#39;x");
    expect(escapeHtml("Rock & roll")).toBe("Rock &amp; roll");
  });

  it("handles empty and non-string values", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(42)).toBe("42");
  });

  it("leaves accents and emoji untouched", () => {
    expect(escapeHtml("Rolê de domingo 🕶️")).toBe("Rolê de domingo 🕶️");
  });
});
