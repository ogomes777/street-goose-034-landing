/**
 * Street Goose 034 — envio server-side ao IndexNow (Node 20+).
 *
 * Rode somente após publicação de conteúdo indexável.
 * INDEXNOW_SCOPE=categories node scripts/indexnow-notify.mjs
 * INDEXNOW_SCOPE=all node scripts/indexnow-notify.mjs
 *
 * Não executa no navegador; não usa cookies nem envia dados de clientes.
 */
const HOST = "www.streetgoose034.com.br";
const ORIGIN = "https://" + HOST;
const KEY = "989f03f4d0umc4d1eb85921719848c87c";
const KEY_PATH = "/" + KEY + ".txt";
const API = "https://api.indexnow.org/indexnow";
const SCOPE = process.env.INDEXNOW_SCOPE || "all";

if (!["categories", "all"].includes(SCOPE)) {
  throw new Error("INDEXNOW_SCOPE deve ser 'categories' ou 'all'.");
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getPublic(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "StreetGoose034-IndexNow/1.0" },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(url + " retornou HTTP " + response.status);
  return response.text();
}

async function ensureKeyPublished() {
  // Vercel publica após o push: aguardar a chave visível no domínio real.
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      const body = (await getPublic(ORIGIN + KEY_PATH)).trim();
      if (body === KEY) {
        console.log("Chave IndexNow validada no domínio oficial.");
        return;
      }
      console.log("Chave publicada com conteúdo diferente; aguardando deploy.");
    } catch (error) {
      console.log("Aguardando chave no domínio (" + attempt + "/12): " + error.message);
    }
    if (attempt < 12) await pause(15000);
  }
  throw new Error("Chave não disponível no domínio oficial. Nenhuma URL enviada.");
}

function getSitemapUrls(xml) {
  const matches = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)];
  const urls = [];
  for (const [, value] of matches) {
    const url = new URL(value.replaceAll("&amp;", "&"));
    if (url.origin !== ORIGIN || url.username || url.password || url.search || url.hash) {
      throw new Error("URL suspeita ou fora do host no sitemap: " + value);
    }
    if (SCOPE === "categories" && !url.pathname.startsWith("/categoria/")) continue;
    urls.push(url.href);
  }
  return [...new Set(urls)];
}

async function main() {
  await ensureKeyPublished();

  const xml = await getPublic(ORIGIN + "/sitemap.xml");
  const urlList = getSitemapUrls(xml);
  if (urlList.length === 0) throw new Error("Nenhuma URL indexável encontrada no sitemap.");
  if (urlList.length > 10000) throw new Error("Lote grande demais para IndexNow.");

  const response = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: ORIGIN + KEY_PATH,
      urlList,
    }),
    signal: AbortSignal.timeout(30000),
  });
  const detail = (await response.text()).slice(0, 800);
  if (![200, 202].includes(response.status)) {
    throw new Error("IndexNow HTTP " + response.status + ": " + detail);
  }
  console.log("IndexNow recebeu " + urlList.length + " URLs (HTTP " + response.status + ").");
  console.log("Recebimento não é garantia de rastreamento nem de indexação.");
  for (const url of urlList) console.log("  " + url);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
