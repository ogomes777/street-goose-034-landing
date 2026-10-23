// Street Goose 034: zero-credential release invariants.
// This is a regression tripwire, NOT a penetration test or proof of live RLS.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const config = JSON.parse(read("vercel.json"));
const allHeaders = config.headers?.find((entry) => entry.source === "/(.*)")?.headers || [];
const header = (name) => allHeaders.find((item) => item.key.toLowerCase() === name.toLowerCase())?.value || "";
const csp = header("Content-Security-Policy");

assert.match(csp, /default-src\s+'self'/, "CSP must default to self");
assert.match(csp, /object-src\s+'none'/, "Object embeds must stay disabled");
assert.match(csp, /frame-ancestors\s+'none'/, "Clickjacking must remain blocked");
assert.match(csp, /base-uri\s+'self'/, "Base URI must be constrained");
assert.doesNotMatch(csp, /script-src\s+[^;]*'unsafe-inline'/, "Do not enable unsafe-inline scripts");
assert.match(header("Strict-Transport-Security"), /max-age=\d+/, "HSTS required");
assert.equal(header("X-Content-Type-Options"), "nosniff");
assert.equal(header("X-Frame-Options"), "DENY");
assert.match(header("Referrer-Policy"), /strict-origin|no-referrer/);
assert.ok(config.headers?.some(({source,headers}) =>
  source.includes("admin") && headers?.some(h => h.key === "X-Robots-Tag" && h.value.includes("noindex"))
), "Private routes must stay noindex");

const migration = read("supabase/migrations/20261022153000_admin_mfa_enforcement.sql");
assert.match(migration, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.is_admin\s*\(\)/i);
assert.match(migration, /public\.is_admin_identity\s*\(\)/i);
assert.match(migration, /auth\.jwt\s*\(\)\s*->>\s*'aal'/i);
assert.match(migration, /=\s*'aal2'/i, "Admin DB authorization must require AAL2");

const gate = read("js/admin-mfa-gate.js");
assert.match(gate, /supabase\.auth\.mfa\.challenge\(/);
assert.match(gate, /supabase\.auth\.mfa\.verify\(/);
assert.match(gate, /currentLevel\s*!==\s*"aal2"/, "Do not unlock the panel without verified MFA");
assert.match(read("src/services/AdminService.ts"), /is_admin_identity/, "Admin lookup must use server role check");
assert.doesNotMatch(read("src/lib/supabase.ts"), /VITE_SUPABASE_SERVICE_ROLE|VITE_SUPABASE_SECRET_KEY/, "Never expose service-role credentials to frontend");

console.log("SG034 security invariants: PASS (static config only; live RLS must be tested separately).");
