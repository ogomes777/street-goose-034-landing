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

  // O router mantém seu próprio lock local; não há window.SG.lockScroll
  // global. O inline já pode ter travado o body para cobrir o carregamento
  // assíncrono deste módulo, então reaproveitamos a posição registrada.
  var introScrollY = typeof window.__sgIntroScrollY === "number"
    ? window.__sgIntroScrollY
    : (window.scrollY || window.pageYOffset || 0);
  var introScrollLocked = false;
  function lockIntroScroll() {
    if (typeof window.__sgIntroScrollY !== "number") {
      window.__sgIntroScrollY = introScrollY;
      document.body.style.position = "fixed";
      document.body.style.top = "-" + introScrollY + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    }
    introScrollLocked = true;
  }
  function unlockIntroScroll() {
    if (!introScrollLocked) return;
    var savedY = typeof window.__sgIntroScrollY === "number" ? window.__sgIntroScrollY : introScrollY;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    try { delete window.__sgIntroScrollY; } catch (e) { window.__sgIntroScrollY = undefined; }
    introScrollLocked = false;
    window.scrollTo({ top: savedY, left: 0, behavior: "instant" });
  }

  var video = introEl.querySelector("[data-intro-video]");
  var introAudio = introEl.querySelector("[data-intro-audio]");
  var skipBtn = introEl.querySelector("[data-intro-skip]");
  var reduced = window.SG.prefersReducedMotion();
  if (window.__sgIntroSkipRequested === true || window.SG.introComplete === true) {
    introEl.hidden = true;
    notifyComplete();
    return;
  }
  if (navigator.webdriver === true) {
    introEl.hidden = true;
    notifyComplete();
    return;
  }

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

  lockIntroScroll();

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(safetyTimer);
    clearTimeout(stallTimer);
    stopCueMonitor();
    teardownVideoTracking();
    detachGlobalAudioUnlock();
    try { video && video.pause(); } catch (e) {}
    try { introAudio && introAudio.pause(); } catch (e) {}
    try { sessionStorage.setItem("sgIntroSeen", "1"); } catch (e) {}
    window.__sgIntroSkipRequested = true;
    // Destrava scroll e avisa popup/música JÁ, de forma síncrona — essa parte
    // é funcional, não pode depender de transitionend nem de um setTimeout
    // (rede real com o vídeo grande concorrendo por thread principal já
    // mostrou atrasar os dois por vários segundos; popup e música não podem
    // ficar reféns disso). O que resta abaixo é puramente cosmético: a
    // classe já deixa o overlay invisível e sem pointer-events na hora,
    // então remover do layout de fato (hidden=true) pode esperar o fade.
    unlockIntroScroll();
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

  // A faixa de abertura é um arquivo separado do vídeo. Ela também funciona
  // como relógio de fallback enquanto o MP4 não está disponível no checkout;
  // com vídeo presente, o relógio do vídeo continua sendo a fonte de verdade.
  if (!video && introAudio) {
    var audioIntroCueFired = false;
    function fireAudioIntroCue() {
      if (audioIntroCueFired || finished || introAudio.currentTime < INTRO_MUSIC_CUE_SECONDS) return;
      audioIntroCueFired = true;
      var startVolume = introAudio.volume;
      var startedAt = null;
      function duckIntroAudio(ts) {
        if (startedAt === null) startedAt = ts;
        var progress = Math.min(1, (ts - startedAt) / DUCK_MS);
        introAudio.volume = startVolume + (MP4_DUCKED_VOLUME - startVolume) * progress;
        if (progress < 1 && !finished) requestAnimationFrame(duckIntroAudio);
      }
      requestAnimationFrame(duckIntroAudio);
      if (window.SG.music && window.SG.music.triggerCue) window.SG.music.triggerCue();
      else window.SG.musicCuePending = true;
    }
    introAudio.volume = MP4_VOLUME;
    introAudio.addEventListener("timeupdate", fireAudioIntroCue);
    introAudio.addEventListener("ended", finish, { once: true });
    introAudio.addEventListener("error", finish, { once: true });
    safetyTimer = setTimeout(finish, SAFETY_MS);
    var introPlayback = introAudio.play();
    if (introPlayback && introPlayback.catch) introPlayback.catch(function () {
      // Autoplay com áudio pode ser bloqueado; o botão de pular segue ativo e
      // a faixa principal tenta tocar no gesto de clique que conclui a intro.
    });
    return;
  }

  if (reduced || !video) {
    if (!video) {
      // Sem o MP4 da intro, o script inline controla o botão e o timeout.
      // Evita que o módulo chegue depois e encerre a abertura imediatamente.
      return;
    }
    finish();
    return;
  }

  // ---------------- Cue de música: relógio do vídeo, não timer ----------------
  function duckVideoAudio() {
    var track = introAudio || video;
    if (!track || track.muted) return;
    var startVol = track.volume;
    var targetVol = MP4_DUCKED_VOLUME;
    var t0 = null;
    function tick(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / DUCK_MS);
      track.volume = startVol + (targetVol - startVol) * p;
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
    if (introAudio) introAudio.pause();
    if (!cueFired || finished) return;
    var music = window.SG.music;
    if (music) music.pauseForResync();
  }
  function onVideoPauseMaybeStall() {
    if (finished || video.ended) return;
    if (introAudio) introAudio.pause();
    if (!cueFired) return;
    var music = window.SG.music;
    if (music) music.pauseForResync();
  }
  function onVideoResumed() {
    if (introAudio && !finished) {
      var drift = Math.abs(introAudio.currentTime - video.currentTime);
      if (drift > 0.15) { try { introAudio.currentTime = video.currentTime; } catch (e) {} }
      if (introAudio.paused && !introAudio.muted) introAudio.play().catch(function () { attachGlobalAudioUnlock(); });
    }
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
    if (!video) return;
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
    video.volume = 0;
    if (introAudio) {
      introAudio.muted = true;
      introAudio.volume = MP4_VOLUME;
    }
    attachGlobalAudioUnlock();
    var p = video.play();
    if (p && p.then) p.then(function () {
      clearTimeout(stallTimer);
      if (introAudio) introAudio.play().catch(function () {});
    }, finish); // nem mudo tocou — libera a landing
  }

  function tryPlayWithSound() {
    // O MP4 recebido é silencioso; sua reprodução muda libera autoplay no
    // navegador, enquanto o MP3 separado fornece a trilha da abertura.
    video.muted = true;
    video.volume = 0;
    var p = video.play();
    if (p && p.then) p.then(function () {
      clearTimeout(stallTimer);
      if (!introAudio) return;
      introAudio.muted = false;
      introAudio.volume = MP4_VOLUME;
      try { introAudio.currentTime = video.currentTime; } catch (e) {}
      var audioPlay = introAudio.play();
      if (audioPlay && audioPlay.catch) audioPlay.catch(function () {
        introAudio.muted = true;
        attachGlobalAudioUnlock();
      });
    }, fallbackToMuted);
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
    if (finished) return;
    if (introAudio && introAudio.muted) {
      introAudio.muted = false;
      introAudio.volume = cueFired ? MP4_DUCKED_VOLUME : MP4_VOLUME;
      var audioPlay = introAudio.play();
      if (audioPlay && audioPlay.catch) audioPlay.catch(function () {});
    }
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
