/* Street Goose 034 — intro hero loader.
   Overlay fullscreen só no carregamento inicial; o router é 100% client-side
   no mesmo document, então isso nunca reaparece em navegação interna. O
   vídeo toca UMA ÚNICA VEZ, do início ao fim — sem loop. Pular, erro,
   travamento de rede ou timeout de segurança sempre liberam a landing —
   nunca deixamos o usuário preso numa tela preta. Dispara "sg:intro-complete"
   no fim, que popup.js (gatilho do drop) e music-player.js escutam.

   Sincronização de áudio: o áudio interno do MP4 toca baixo (10%) desde o
   início; no instante exato em que Kibão aperta o rádio (8.000s de vídeo —
   INTRO_MUSIC_CUE_SECONDS), a trilha global (window.SG.music) dispara e o
   áudio do MP4 sofre ducking pra ~4-5%. O relógio do vídeo é a fonte de
   verdade (requestVideoFrameCallback/rAF lendo video.currentTime), nunca
   setTimeout, pra não dessincronizar com buffering/perda de frame.

   O <script> síncrono logo depois do markup em index.html já trata "Pular
   intro" independente deste módulo (a cadeia de import() dinâmico do
   bootstrap pode demorar segundos numa rede lenta, competindo com o próprio
   vídeo — o botão não pode esperar por isso). Esse script inline seta
   window.__sgIntroSkipRequested; este módulo só precisa checar essa flag
   ANTES de travar o scroll, senão travaria a rolagem de um usuário que já
   saiu da intro há segundos, só porque este módulo acabou de chegar. */
(function () {
  "use strict";

  var introEl = document.querySelector("[data-intro-loader]");
  if (!introEl) return;

  var INTRO_MUSIC_CUE_SECONDS = 8.0;
  var MP4_VOLUME = 0.10;
  var MP4_DUCKED_VOLUME = 0.045;
  var DUCK_MS = 300;
  var FADE_MS = 600;
  var SAFETY_MS = 30000; // vídeo tem ~18.4s — folga generosa, nunca deve disparar em uso normal
  var STALL_MS = 6000; // vídeo nunca começou a tocar (rede/arquivo com problema)

  function notifyComplete() {
    if (window.SG.introComplete) return; // script inline já avisou
    window.SG.introComplete = true;
    document.dispatchEvent(new CustomEvent("sg:intro-complete"));
  }

  // Suítes automatizadas (Playwright seta navigator.webdriver), o mesmo
  // sessionStorage flag usado por popup.js (sgPopupSeen), e um "Pular intro"
  // que já rodou por conta própria via script inline (rede lenta) — em
  // qualquer um desses casos o scroll nunca deve ser travado por este
  // módulo, e o vídeo nunca deve tentar tocar.
  var isAutomated = navigator.webdriver === true;
  var manualBypass = false;
  try { manualBypass = sessionStorage.getItem("sgIntroSeen") === "1"; } catch (e) {}
  var alreadySkipped = window.__sgIntroSkipRequested === true;
  if (isAutomated || manualBypass || alreadySkipped) {
    introEl.hidden = true;
    notifyComplete();
    return;
  }

  var video = introEl.querySelector("[data-intro-video]");
  var skipBtn = introEl.querySelector("[data-intro-skip]");
  var reduced = window.SG.prefersReducedMotion();

  var finished = false;
  var safetyTimer = null;
  var stallTimer = null;
  // Declaradas aqui (não só onde são atribuídas) porque finish() pode ser
  // chamado bem cedo pelo caminho de reduced-motion, antes da seção "cue de
  // música" mais abaixo — function declarations são hoisted, mas var sem
  // essa inicialização ficaria undefined (não null) até essa linha rodar,
  // o que quebraria a checagem "!== null" em stopCueMonitor().
  var cueFired = false;
  var rvfcHandle = null;
  var rafCueHandle = null;

  window.SG.lockScroll();

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(safetyTimer);
    clearTimeout(stallTimer);
    stopCueMonitor();
    teardownVideoTracking();
    detachGlobalAudioUnlock();
    try { video && video.pause(); } catch (e) {}
    // Destrava scroll e avisa popup/música JÁ, de forma síncrona — essa parte
    // é funcional, não pode depender de transitionend nem de um setTimeout
    // (rede real com o vídeo grande concorrendo por thread principal já
    // mostrou atrasar os dois por vários segundos; popup e música não podem
    // ficar reféns disso). O que resta abaixo é puramente cosmético: a
    // classe já deixa o overlay invisível e sem pointer-events na hora,
    // então remover do layout de fato (hidden=true) pode esperar o fade.
    window.SG.unlockScroll();
    notifyComplete();
    introEl.classList.add("is-leaving");
    var release = function () {
      introEl.removeEventListener("transitionend", release);
      introEl.hidden = true;
    };
    introEl.addEventListener("transitionend", release);
    // aba em segundo plano ou transição interrompida pode nunca disparar
    // transitionend — o release ainda precisa acontecer
    setTimeout(release, FADE_MS + 200);
  }

  // Chamado diretamente pelo script inline do botão quando este módulo já
  // tiver carregado a tempo do clique — nesse caso o clique passa pelo fade
  // normal (lockScroll já rodou logo acima, então o unlock em finish() bate certo).
  window.SG.skipIntro = finish;

  if (reduced || !video) {
    finish();
    return;
  }

  // ---------------- Cue de música: relógio do vídeo, não timer ----------------
  function duckVideoAudio() {
    if (video.muted) return; // nada pra abaixar se tá mudo
    var startVol = video.volume;
    var targetVol = MP4_DUCKED_VOLUME;
    var t0 = null;
    function tick(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / DUCK_MS);
      video.volume = startVol + (targetVol - startVol) * p;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function stopCueMonitor() {
    if (rvfcHandle !== null && video.cancelVideoFrameCallback) {
      video.cancelVideoFrameCallback(rvfcHandle);
    }
    rvfcHandle = null;
    if (rafCueHandle !== null) cancelAnimationFrame(rafCueHandle);
    rafCueHandle = null;
  }

  function fireCue() {
    if (cueFired) return;
    cueFired = true;
    stopCueMonitor();
    duckVideoAudio();
    if (window.SG.music && window.SG.music.triggerCue) {
      window.SG.music.triggerCue();
    } else {
      // música ainda não carregou (rede lenta) — ela mesma dispara ao chegar
      window.SG.musicCuePending = true;
    }
  }

  function startCueMonitor() {
    if (typeof video.requestVideoFrameCallback === "function") {
      var rvfcTick = function (now, metadata) {
        if (cueFired || finished) return;
        if (metadata.mediaTime >= INTRO_MUSIC_CUE_SECONDS) { fireCue(); return; }
        rvfcHandle = video.requestVideoFrameCallback(rvfcTick);
      };
      rvfcHandle = video.requestVideoFrameCallback(rvfcTick);
    } else {
      var rafTick = function () {
        if (cueFired || finished) return;
        if (video.currentTime >= INTRO_MUSIC_CUE_SECONDS) { fireCue(); return; }
        rafCueHandle = requestAnimationFrame(rafTick);
      };
      rafCueHandle = requestAnimationFrame(rafTick);
    }
  }

  // ---------------- Buffering: vídeo é a fonte de verdade ----------------
  function onVideoInterrupted() {
    if (!cueFired || finished) return;
    var music = window.SG.music;
    if (music) music.pauseForResync();
  }
  function onVideoPauseMaybeStall() {
    if (!cueFired || finished || video.ended) return;
    var music = window.SG.music;
    if (music) music.pauseForResync();
  }
  function onVideoResumed() {
    if (!cueFired) return;
    var music = window.SG.music;
    if (!music) return;
    music.resumeFromResync(video.currentTime - INTRO_MUSIC_CUE_SECONDS);
  }
  function onFirstPlaying() {
    clearTimeout(stallTimer);
  }
  function onEnded() {
    // regra: toca uma única vez, do início ao fim — nunca reinicia/faz loop
    finish();
  }

  video.addEventListener("waiting", onVideoInterrupted);
  video.addEventListener("stalled", onVideoInterrupted);
  video.addEventListener("pause", onVideoPauseMaybeStall);
  video.addEventListener("playing", onVideoResumed);
  video.addEventListener("playing", onFirstPlaying, { once: true });
  video.addEventListener("ended", onEnded);
  video.addEventListener("error", finish);

  function teardownVideoTracking() {
    video.removeEventListener("waiting", onVideoInterrupted);
    video.removeEventListener("stalled", onVideoInterrupted);
    video.removeEventListener("pause", onVideoPauseMaybeStall);
    video.removeEventListener("playing", onVideoResumed);
  }

  // ---------------- Áudio interno do MP4: tenta com som, cai pra mudo ----------------
  // O elemento tem o atributo autoplay (fallback nativo caso o JS demore a
  // carregar) — em alguns navegadores/flags isso já inicia o vídeo ANTES
  // deste módulo anexar o listener "playing" que zera o stallTimer, e o
  // evento nunca mais dispara de novo (já tocando). Por isso o clear de
  // verdade usa a Promise do NOSSO play(), que resolve mesmo se o vídeo já
  // estava tocando — não depende de pegar o evento no momento certo.
  function fallbackToMuted() {
    video.muted = true;
    video.volume = MP4_VOLUME; // mantido configurado pra quando desmutar depois
    attachGlobalAudioUnlock();
    var p = video.play();
    if (p && p.then) p.then(function () { clearTimeout(stallTimer); }, finish); // nem mudo tocou — libera a landing
  }

  function tryPlayWithSound() {
    video.muted = false;
    video.volume = MP4_VOLUME;
    var p = video.play();
    if (p && p.then) p.then(function () { clearTimeout(stallTimer); }, fallbackToMuted);
  }

  // Nenhum navegador libera áudio automático sem gesto do usuário (política
  // de segurança do próprio browser — nenhum código consegue contornar
  // isso). Sem um botão dedicado de "Ativar som", a alternativa real é
  // aproveitar QUALQUER interação genuína que já aconteça na página —
  // clique, toque ou tecla, em qualquer lugar, inclusive em "Pular intro" —
  // pra destravar o som do vídeo e reencaminhar a trilha, sem UI extra.
  var globalUnlockAttached = false;
  function attachGlobalAudioUnlock() {
    if (globalUnlockAttached) return;
    globalUnlockAttached = true;
    document.addEventListener("pointerdown", onGlobalUnlock, true);
    document.addEventListener("keydown", onGlobalUnlock, true);
  }
  function detachGlobalAudioUnlock() {
    if (!globalUnlockAttached) return;
    globalUnlockAttached = false;
    document.removeEventListener("pointerdown", onGlobalUnlock, true);
    document.removeEventListener("keydown", onGlobalUnlock, true);
  }
  function onGlobalUnlock() {
    detachGlobalAudioUnlock();
    if (finished || !video.muted) return;
    video.muted = false;
    video.volume = cueFired ? MP4_DUCKED_VOLUME : MP4_VOLUME;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
    if (window.SG.music && window.SG.music.retryIfBlocked) window.SG.music.retryIfBlocked();
  }

  // ---------------- Pular intro / foco ----------------
  if (skipBtn) {
    skipBtn.addEventListener("click", finish);
    // único controle focável do overlay — Tab não deve escapar para o
    // conteúdo (invisível, mas tecnicamente focável) atrás do vídeo
    skipBtn.addEventListener("keydown", function (e) {
      if (e.key === "Tab") { e.preventDefault(); skipBtn.focus(); }
    });
    skipBtn.focus();
  }

  safetyTimer = setTimeout(finish, SAFETY_MS);
  stallTimer = setTimeout(finish, STALL_MS);

  tryPlayWithSound();
  startCueMonitor();
})();

export {};
