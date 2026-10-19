import { describe, expect, it, vi } from "vitest";
import { isLeakedPassword, newPasswordProblem, passwordRuleProblem, PWNED_RANGE_URL } from "./password-check";

// SHA-1("password1") = E38AD214943DAAD1D64C102FAEC29DE4AFE9DA3D
const PREFIX = "E38AD";
const SUFFIX = "214943DAAD1D64C102FAEC29DE4AFE9DA3D";
const rangeWith = (lines: string) => vi.fn(async () => new Response(lines, { status: 200 }));

describe("password rules", () => {
  it("asks for 8+ characters with letters and numbers", () => {
    expect(passwordRuleProblem("ab1")).toMatch(/8 caracteres/);
    expect(passwordRuleProblem("abcdefgh")).toMatch(/letras e números/);
    expect(passwordRuleProblem("12345678")).toMatch(/letras e números/);
    expect(passwordRuleProblem("ganso034rua")).toBeNull();
  });
});

describe("leaked password check", () => {
  it("sends only the 5-character hash prefix and matches the suffix locally", async () => {
    const fetchImpl = rangeWith(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${SUFFIX}:2413945\r\n`);
    expect(await isLeakedPassword("password1", fetchImpl as unknown as typeof fetch)).toBe(true);
    const [url] = fetchImpl.mock.calls[0] as unknown as [string];
    expect(url).toBe(PWNED_RANGE_URL + PREFIX);
    expect(url).not.toContain("password1");
  });
  it("ignores padding entries with a zero count", async () => {
    const fetchImpl = rangeWith(`${SUFFIX}:0\r\n`);
    expect(await isLeakedPassword("password1", fetchImpl as unknown as typeof fetch)).toBe(false);
  });
  it("never blocks when the service is down", async () => {
    const fetchImpl = vi.fn(async () => { throw new Error("offline"); });
    expect(await isLeakedPassword("password1", fetchImpl as unknown as typeof fetch)).toBeNull();
    expect(await newPasswordProblem("ganso034rua", fetchImpl as unknown as typeof fetch)).toBeNull();
  });
  it("explains a leaked password", async () => {
    expect(await newPasswordProblem("password1", rangeWith(`${SUFFIX}:5\r\n`) as unknown as typeof fetch)).toMatch(/vazamentos/);
  });
});
