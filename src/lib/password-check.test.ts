import { describe, expect, it, vi } from "vitest";
import { isLeakedPassword, newPasswordProblem, passwordRuleProblem, PWNED_RANGE_URL } from "./password-check";

// SHA-1("password1password1") = 2CFEC11BC6024A9AC3D39A56323A2161B69C989F
const LEAKED = "password1password1";
const PREFIX = "2CFEC";
const SUFFIX = "11BC6024A9AC3D39A56323A2161B69C989F";
const SAFE = "ganso034rua2026";
const rangeWith = (lines: string) => vi.fn(async () => new Response(lines, { status: 200 }));

describe("password rules", () => {
  it("requires 12+ characters with letters and numbers for new passwords", () => {
    expect(passwordRuleProblem("ab1")).toMatch(/12 caracteres/);
    expect(passwordRuleProblem("777 admin")).toMatch(/12 caracteres/);
    expect(passwordRuleProblem("ganso034rua")).toMatch(/12 caracteres/);
    expect(passwordRuleProblem("aaaaaaaaaaaa")).toMatch(/letras e números/);
    expect(passwordRuleProblem("123456789012")).toMatch(/letras e números/);
    expect(passwordRuleProblem(SAFE)).toBeNull();
  });
});

describe("leaked password check (client-side defense in depth)", () => {
  it("sends only the 5-character hash prefix and matches the suffix locally", async () => {
    const fetchImpl = rangeWith(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${SUFFIX}:2413945\r\n`);
    expect(await isLeakedPassword(LEAKED, fetchImpl as unknown as typeof fetch)).toBe(true);
    const [url] = fetchImpl.mock.calls[0] as unknown as [string];
    expect(url).toBe(PWNED_RANGE_URL + PREFIX);
    expect(url).not.toContain(LEAKED);
  });
  it("ignores padding entries with a zero count", async () => {
    const fetchImpl = rangeWith(`${SUFFIX}:0\r\n`);
    expect(await isLeakedPassword(LEAKED, fetchImpl as unknown as typeof fetch)).toBe(false);
  });
  it("reports unavailable leak service rather than claiming a clean password", async () => {
    const fetchImpl = vi.fn(async () => { throw new Error("offline"); });
    expect(await isLeakedPassword(LEAKED, fetchImpl as unknown as typeof fetch)).toBeNull();
    // Client-only protection is fail-open for availability: native Supabase Auth
    // leaked-password rejection must be configured server-side on a Pro plan.
    expect(await newPasswordProblem(SAFE, fetchImpl as unknown as typeof fetch)).toBeNull();
  });
  it("explains a leaked password", async () => {
    expect(await newPasswordProblem(LEAKED, rangeWith(`${SUFFIX}:5\r\n`) as unknown as typeof fetch)).toMatch(/vazamentos/);
  });
});
