/* Rules for every new password (sign-up, recovery, account change).
   Supabase's own leaked-password check is a paid-plan feature; this does the
   same lookup from the browser against HaveIBeenPwned's free k-anonymity API:
   only the first 5 characters of the password's SHA-1 leave the device, and
   the match happens here. If the service can't be reached in time the leak
   check is skipped, so a slow network never blocks a sign-up. */
export const PWNED_RANGE_URL = "https://api.pwnedpasswords.com/range/";

export function passwordRuleProblem(password: string): string | null {
  if (password.length < 12) return "Use pelo menos 12 caracteres.";
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) return "Use letras e números na senha.";
  return null;
}

async function sha1Hex(text: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = await subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** true = found in known leaks, false = not found, null = could not check. */
export async function isLeakedPassword(password: string, fetchImpl: typeof fetch = fetch, timeoutMs = 3500): Promise<boolean | null> {
  try {
    const hash = await sha1Hex(password);
    if (!hash) return null;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : 0;
    try {
      const res = await fetchImpl(PWNED_RANGE_URL + hash.slice(0, 5), { headers: { "Add-Padding": "true" }, signal: controller?.signal });
      if (!res.ok) return null;
      const suffix = hash.slice(5);
      return (await res.text()).split("\n").some((line) => {
        const [candidate, count] = line.trim().split(":");
        return candidate === suffix && Number(count) > 0;
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

/** The message to show for a new password, or null when it can be used. */
export async function newPasswordProblem(password: string, fetchImpl?: typeof fetch): Promise<string | null> {
  const rule = passwordRuleProblem(password);
  if (rule) return rule;
  if (await isLeakedPassword(password, fetchImpl)) return "Essa senha já apareceu em vazamentos de dados na internet. Escolha outra.";
  return null;
}
