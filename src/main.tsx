import '../js/copy-typography.css';
import '../js/landing-refinement.css';
import '../js/ranking-preview.css';
import '../js/gem-crystals.css';
import '../js/community-app.css';
import '../js/perf-budget.css';

type StreetGooseWindow = Window &
  typeof globalThis & {
    gsap: typeof import("gsap")["gsap"];
    ScrollTrigger: typeof import("gsap/ScrollTrigger")["ScrollTrigger"];
    THREE: typeof import("three");
  };

async function bootstrap() {
  void import('../js/landing-refinement.js').catch(() => {});
  // The character lives right after the hero. Reserve its height in
  // perf-budget.css, then mount it during idle time instead of during a
  // touch-scroll frame (that previously caused a large layout jump).
  const heroRoot = document.getElementById("interactive-character-root");
  let requestCharacter = () => {};
  if (heroRoot) {
    let requested = false;
    let quietTimer = 0;
    let lastScroll = 0;

    const mountCharacter = () => {
      if (requested) return;
      requested = true;
      window.removeEventListener("scroll", onScroll);
      void Promise.all([
        import("./components/interactive-character/InteractiveCharacterHero"),
        import("react"),
        import("react-dom/client"),
      ]).then(([{ InteractiveCharacterHero }, { createElement, StrictMode }, { createRoot }]) => {
        createRoot(heroRoot).render(
          createElement(StrictMode, null, createElement(InteractiveCharacterHero)),
        );
        requestAnimationFrame(() => requestAnimationFrame(() => (window as StreetGooseWindow).ScrollTrigger?.refresh()));
      }).catch((error) => {
        console.error("Street Goose interactive character failed", error);
        requested = false;
        window.addEventListener("scroll", onScroll, { passive: true });
      });
    };

    const scheduleWhenQuiet = () => {
      if (requested) return;
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(() => {
        const blocked = () => document.hidden ||
          document.body.classList.contains("sg-entry-popup-open") ||
          document.body.classList.contains("category-page-open");
        if (blocked() || performance.now() - lastScroll < 230) {
          scheduleWhenQuiet();
          return;
        }
        // Idle callbacks don't guarantee a quiet page at callback time:
        // check again before parsing React and decoding the character art.
        const run = () => {
          if (requested) return;
          if (blocked() || performance.now() - lastScroll < 230) {
            scheduleWhenQuiet();
            return;
          }
          mountCharacter();
        };
        if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 1700 });
        else window.setTimeout(run, 80);
      }, 300);
    };

    const onScroll = () => {
      lastScroll = performance.now();
      if (!requested && heroRoot.getBoundingClientRect().top < window.innerHeight + 850)
        scheduleWhenQuiet();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    requestCharacter = () => {
      if (heroRoot.getBoundingClientRect().top < window.innerHeight + 850)
        scheduleWhenQuiet();
    };
  }

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
  const legacyWindow = window as StreetGooseWindow;
  legacyWindow.gsap = gsap;
  legacyWindow.ScrollTrigger = ScrollTrigger;

  // Two grouped chunks instead of ~40 sequential round trips; evaluation
  // order is unchanged (see js/boot-core.js and js/boot-shop.js).
  await import("../js/boot-core.js");
  // produtos do banco (/admin → Produtos) antes de qualquer coisa que leia o
  // catálogo — ver js/catalog-sync.js (cache na hora, 1ª visita espera ≤2s no total)
  const { catalogReady } = await import("../js/catalog-sync.js");
  await catalogReady;
  await import("../js/boot-shop.js");
  // A intro é um vídeo prioritário. Não competir pelo decoder/rede com
  // a seção React até que o visitante tenha saído da abertura.
  const scheduleCharacter = () => {
    // Give the video/audio decoder a breather after the cinematic intro.
    // On phones, do not start React work in the middle of the first swipe.
    const delay = window.matchMedia("(pointer: coarse)").matches ? 1300 : 400;
    window.setTimeout(requestCharacter, delay);
  };
  const introDone = (window as unknown as { SG?: { introComplete?: boolean } }).SG?.introComplete;
  if (introDone) scheduleCharacter();
  else document.addEventListener("sg:intro-complete", scheduleCharacter, { once: true });

  // sg-perf-low nasce de navigator.hardwareConcurrency/deviceMemory + innerWidth
  // < 720 — ou seja, praticamente todo celular (Safari nem expõe deviceMemory,
  // então cai no fallback e qualquer iPhone mais antigo com <=4 núcleos batia
  // aqui). Usar essa classe pra decidir SE a cena carrega era, na prática, um
  // "if (isMobile) não carregue Three.js" disfarçado — o tier continua servindo
  // pra reduzir densidade de partícula/DPR dentro de cada cena, nunca pra
  // decidir se a cena existe. Só prefers-reduced-motion (preferência real do
  // usuário, não palpite de capacidade do aparelho) pode pular o carregamento.
  const lowTier = () => (window as unknown as { SG?: { perfTier?: string } }).SG?.perfTier === "low";
  const loadThreeScenes = async () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || lowTier()) return;
    const three = await import("three");
    legacyWindow.THREE = three;
    await import("../js/scene.js");
  };

  // A hero scene is geometrically visible even behind the fullscreen intro.
  // Delay its Three.js download/GPU work until the intro finishes, so mobile
  // decoders and the opening film get priority without removing the scene.
  const threeTargets = document.querySelectorAll("[data-hero-canvas], [data-film-canvas]");
  const observeThreeScenes = () => {
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
  };
  if ((window as unknown as { SG?: { introComplete?: boolean } }).SG?.introComplete) {
    observeThreeScenes();
  } else {
    document.addEventListener("sg:intro-complete", observeThreeScenes, { once: true });
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
          if (lowTier()) return;
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
