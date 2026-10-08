import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

function copyLegacyWebAssets(): Plugin {
  // Product URLs still come from the legacy data model at runtime, so Vite cannot
  // fingerprint them through static analysis yet. Other assets are referenced by
  // HTML/React and are handled by Vite normally.
  const webAssetGroups = ["products"];
  const runtimeHeroAssets = ["curadoria-01.webp", "performance-run.webp", "night-mode.webp"];

  return {
    name: "street-goose-copy-web-assets",
    closeBundle() {
      for (const group of webAssetGroups) {
        const source = fileURLToPath(new URL(`./assets/${group}/web`, import.meta.url));
        const destination = fileURLToPath(new URL(`./dist/assets/${group}/web`, import.meta.url));

        if (!existsSync(source)) continue;
        mkdirSync(destination, { recursive: true });
        cpSync(source, destination, { recursive: true });
      }

      const heroDestination = fileURLToPath(new URL("./dist/assets/heroes/web", import.meta.url));
      mkdirSync(heroDestination, { recursive: true });
      for (const asset of runtimeHeroAssets) {
        const source = fileURLToPath(new URL(`./assets/heroes/web/${asset}`, import.meta.url));
        const destination = fileURLToPath(new URL(`./dist/assets/heroes/web/${asset}`, import.meta.url));
        if (existsSync(source)) copyFileSync(source, destination);
      }
    },
  };
}

// Cabeçalhos de segurança: fonte única em vercel.json (produção). O preview
// local aplica os mesmos, então `npm run preview` já pega violação de CSP.
const vercelConfig = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8")) as {
  headers?: { source: string; headers: { key: string; value: string }[] }[];
};
const securityHeaders: Record<string, string> = Object.fromEntries(
  (vercelConfig.headers?.find((h) => h.source === "/(.*)")?.headers ?? []).map((h) => [h.key, h.value]),
);

// Falha o build se um <script> inline do index.html não tiver o hash na CSP —
// senão o script seria bloqueado em produção sem ninguém perceber.
function verifyCspInlineHashes(): Plugin {
  return {
    name: "street-goose-verify-csp",
    closeBundle() {
      const csp = securityHeaders["Content-Security-Policy"] ?? "";
      const html = readFileSync(fileURLToPath(new URL("./dist/index.html", import.meta.url)), "utf8");
      for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
        const hash = "sha256-" + createHash("sha256").update(m[1], "utf8").digest("base64");
        if (!csp.includes(hash)) {
          throw new Error(`CSP: script inline sem hash em vercel.json (script-src) — adicione '${hash}'`);
        }
      }
    },
  };
}

export default defineConfig({
  root: projectRoot,
  plugins: [react(), copyLegacyWebAssets(), verifyCspInlineHashes()],
  build: {
    target: "es2020",
    // sem source map em produção: não publica o código-fonte original
    sourcemap: false,
  },
  preview: {
    headers: securityHeaders,
  },
});
