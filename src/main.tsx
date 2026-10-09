import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { InteractiveCharacterHero } from "./components/interactive-character/InteractiveCharacterHero";

type StreetGooseWindow = Window &
  typeof globalThis & {
    gsap: typeof import("gsap")["gsap"];
    ScrollTrigger: typeof import("gsap/ScrollTrigger")["ScrollTrigger"];
    THREE: typeof import("three");
  };

async function bootstrap() {
  const heroRoot = document.getElementById("interactive-character-root");
  if (heroRoot) {
    createRoot(heroRoot).render(
      <StrictMode>
        <InteractiveCharacterHero />
      </StrictMode>,
    );
  }

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
  const legacyWindow = window as StreetGooseWindow;
  legacyWindow.gsap = gsap;
  legacyWindow.ScrollTrigger = ScrollTrigger;

  await import("../js/motion.js");
  await import("../js/config.js");
  await import("../js/theme.js");
  await import("../js/i18n.js");
  await import("../js/settings-menu.js");
  await import("../js/auth-modal.js");
  await import("../js/account-menu.js");
  await import("../js/toast.js");
  await import("../js/data.js");
  await import("../js/catalog.js");
  // produtos do banco (/admin → Produtos) antes de qualquer coisa que leia o
  // catálogo — ver js/catalog-sync.js (cache na hora, 1ª visita espera ≤1,5s)
  const { catalogReady } = await import("../js/catalog-sync.js");
  await catalogReady;
  await import("../js/price-sync.js");
  // sacola e favoritos antes do router: ele monta a rota da URL na hora em
  // que carrega, e /checkout lê window.SG.cart no mount (deep link ou F5 em
  // /checkout mostrava "sacola vazia" com itens). Os dois só dependem do
  // catálogo; corações renderizados depois são sincronizados pelos
  // MutationObservers do wishlist.js.
  await import("../js/cart.js");
  await import("../js/wishlist.js");
  await import("../js/category-portals.js");
  await import("../js/router.js");
  await import("../js/nav-routes.js");
  await import("../js/hero.js");
  await import("../js/products.js");
  await import("../js/scroll-film.js");
  await import("../js/hero3d-film.js");
  await import("../js/product-universe.js");
  await import("../js/drift-product.js");
  await import("../js/popup.js");
  await import("../js/checkout.js");
  await import("../js/community-home.js");
  await import("../js/main.js");
  await import("../js/final-act-motion.js");
  await import("../js/payment-terminal.js");

  // sg-perf-low nasce de navigator.hardwareConcurrency/deviceMemory + innerWidth
  // < 720 — ou seja, praticamente todo celular (Safari nem expõe deviceMemory,
  // então cai no fallback e qualquer iPhone mais antigo com <=4 núcleos batia
  // aqui). Usar essa classe pra decidir SE a cena carrega era, na prática, um
  // "if (isMobile) não carregue Three.js" disfarçado — o tier continua servindo
  // pra reduzir densidade de partícula/DPR dentro de cada cena, nunca pra
  // decidir se a cena existe. Só prefers-reduced-motion (preferência real do
  // usuário, não palpite de capacidade do aparelho) pode pular o carregamento.
  const loadThreeScenes = async () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const three = await import("three");
    legacyWindow.THREE = three;
    await import("../js/scene.js");
  };

  const threeTargets = document.querySelectorAll("[data-hero-canvas], [data-film-canvas]");
  if ("IntersectionObserver" in window && threeTargets.length) {
    const sceneObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        sceneObserver.disconnect();
        void loadThreeScenes();
      },
      { rootMargin: "1000px 0px" },
    );
    threeTargets.forEach((target) => sceneObserver.observe(target));
  } else {
    globalThis.setTimeout(() => void loadThreeScenes(), 900);
  }

  // Payment Terminal, final-act e newsletter compartilham um único
  // WebGLRenderer/canvas/RAF via webgl-director.js (ver arquivo) — nunca três
  // contextos GPU simultâneos. THREE só carrega uma vez (reaproveita o do
  // hero se já estiver pronto); o director carrega uma vez também.
  let directorPromise: Promise<void> | null = null;
  const ensureDirector = () => {
    if (directorPromise) return directorPromise;
    directorPromise = (async () => {
      if (!legacyWindow.THREE) {
        const three = await import("three");
        legacyWindow.THREE = three;
      }
      await import("../js/webgl-director.js");
    })();
    return directorPromise;
  };

  // window.SG.paymentTerminal só existe depois que payment-terminal.js
  // resolve seu import assíncrono do PaymentService — sem essa espera, a
  // cena 3D pode rodar seu check inicial antes do dado existir e desistir
  // silenciosamente (corrida real, não hipotética: aconteceu em teste local)
  const waitForPaymentData = () =>
    new Promise<void>((resolve) => {
      const legacy = window as unknown as { SG?: { paymentTerminal?: unknown } };
      let attempts = 0;
      const poll = () => {
        if (legacy.SG?.paymentTerminal || attempts > 100) { resolve(); return; }
        attempts += 1;
        setTimeout(poll, 50);
      };
      poll();
    });

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced && "IntersectionObserver" in window) {
    const sceneGates: Array<[string, () => Promise<unknown>]> = [
      ["[data-final-act]", () => import("../js/final-act-scene.js")],
      ["[data-payment-terminal]", () => waitForPaymentData().then(() => import("../js/payment-terminal-scene.js"))],
      ["[data-newsletter-canvas]", () => import("../js/newsletter-scene.js")],
    ];
    sceneGates.forEach(([selector, loader]) => {
      const el = document.querySelector(selector);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          obs.disconnect();
          void ensureDirector().then(loader);
        },
        { rootMargin: "500px 0px" },
      );
      obs.observe(el);
    });
  }
}

void bootstrap().catch((error) => {
  console.error("Street Goose bootstrap failed", error);
});
