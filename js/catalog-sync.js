/* Street Goose 034 — produtos do banco por cima do catálogo de fábrica.
   catalog.js monta as peças a partir das fotos do repositório; aqui a
   camada public.products (editada em /admin → Produtos) é aplicada nos
   mesmos objetos/arrays: nome, descrição, fotos, ocultar, esgotada, ordem e
   produtos novos. main.tsx espera `catalogReady` antes do router montar a
   rota da URL, então /categoria/... já nasce com a lista certa:
     - com cache local: aplica na hora e revalida em segundo plano;
     - sem cache (1ª visita): espera o banco por até 1,5s;
     - em qualquer caso, no máximo 2s no total (rede lenta).
   Se a revalidação mudar algo, "sg:catalog" avisa quem já está na tela
   (página de categoria, sacola, favoritos, preços). */
var CACHE_KEY = "sgCatalog";
var lastJson = null;
var service = null;

async function loadService() {
  if (!service) service = (await import("../src/services/CatalogService.ts")).CatalogService;
  return service;
}

function storageUrl(path) {
  return service ? service.storageUrl(path) : null;
}

function apply(rows) {
  window.SG.applyCatalogOverlay(rows, storageUrl);
}

async function refresh() {
  var svc = await loadService();
  var rows = await svc.fetchRows();
  if (!rows) return false; // sem resposta: mantém cache/fábrica, nunca esvazia a loja
  var json = JSON.stringify(rows);
  var changed = json !== lastJson;
  lastJson = json;
  if (changed) apply(rows);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ v: 1, at: Date.now(), rows: rows })); } catch (e) {}
  if (changed) window.dispatchEvent(new CustomEvent("sg:catalog"));
  return true;
}

var cachedRows = null;
try {
  var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  if (cached && cached.v === 1 && Array.isArray(cached.rows)) cachedRows = cached.rows;
} catch (e) {}

function timeout(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

// The whole wait is bounded: on a slow network the shop boots with the cache or
// the factory catalog, and anything that arrives later is announced through
// "sg:catalog" (pages, bag, favourites and prices already listen to it).
var released = false;
var sync = loadService().then(function () {
  if (cachedRows) {
    lastJson = JSON.stringify(cachedRows);
    apply(cachedRows);
    if (released) window.dispatchEvent(new CustomEvent("sg:catalog"));
    refresh().catch(function () {});
    return;
  }
  return Promise.race([refresh().catch(function () {}), timeout(1500)]);
}).catch(function () {});
export var catalogReady = Promise.race([sync, timeout(2000)]).then(function () { released = true; });

window.SG.catalog = { refresh: refresh };
