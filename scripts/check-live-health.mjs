// Public and credential-free health probe for Street Goose 034.
// Scheduled by GitHub Actions. Never fetches customer pages or sensitive data.
import assert from "node:assert/strict";

const origin = "https://www.streetgoose034.com.br";
const checks = [
  { path: "/", type: /text\/html/i, security: true },
  { path: "/robots.txt", type: /text\/plain/i },
  { path: "/sitemap.xml", type: /(?:xml|text\/plain)/i },
  { path: "/admin", type: /text\/html/i, security: true, private: true },
];

async function request(path) {
  let error;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await fetch(origin + path, {
        redirect: "follow",
        cache: "no-store",
        headers: { "User-Agent": "StreetGoose034-GitHub-Health/1.0" },
        signal: AbortSignal.timeout(13000),
      });
    } catch (reason) {
      error = reason;
    }
  }
  throw new Error(`Request failed for ${path}: ${error instanceof Error ? error.message : "network_error"}`);
}

let failures = 0;
for (const check of checks) {
  try {
    const response = await request(check.path);
    assert.equal(response.status, 200, `${check.path}: unexpected HTTP status ${response.status}`);
    const url = new URL(response.url);
    assert.equal(url.protocol, "https:", "Insecure redirect");
    assert.equal(url.hostname, "www.streetgoose034.com.br", "Cross-domain redirect");
    assert.match(response.headers.get("content-type") || "", check.type, "Unexpected content type");
    if (check.security) {
      const csp = response.headers.get("content-security-policy") || "";
      assert.match(csp, /default-src\s+'self'/, "CSP missing default restriction");
      assert.match(csp, /frame-ancestors\s+'none'/, "Clickjacking protection missing");
      assert.match(response.headers.get("strict-transport-security") || "", /max-age=/i, "HSTS missing");
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.equal(response.headers.get("x-frame-options"), "DENY");
    }
    if (check.private) {
      assert.match(response.headers.get("x-robots-tag") || "", /noindex/i, "Admin noindex missing");
    }
    console.log(`PASS ${check.path}: HTTP ${response.status}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${check.path}: ${error instanceof Error ? error.message : "unknown_error"}`);
  }
}
if (failures) process.exitCode = 1;
