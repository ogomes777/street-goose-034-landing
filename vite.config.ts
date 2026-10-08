import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
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

export default defineConfig({
  root: projectRoot,
  plugins: [react(), copyLegacyWebAssets()],
  build: {
    target: "es2020",
    sourcemap: true,
  },
});
