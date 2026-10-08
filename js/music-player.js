/* Street Goose 034 — player de música global.
   Uma única instância de <audio>, persistente entre "rotas" (o router troca
   overlays no mesmo document — o elemento nunca é remontado). Autoplay
   bloqueado pelo navegador nunca vira erro de console — vira o botão
   "Ativar som" no próprio play/pause.

   O disparo da faixa NÃO é mais "quando a intro termina": js/intro-loader.js
   chama window.SG.music.triggerCue() no instante exato em que Kibão aperta o
   rádio (~8s de vídeo), sincronizado pelo relógio do próprio vídeo. Este
   módulo só expõe essa API + o fallback de reexibir o player quando a intro
   acaba (afterIntro) — sem nunca chamar play()/resetar currentTime uma
   segunda vez se a faixa já estiver tocando. */
(function () {
  "use strict";

  var root = document.querySelector("[data-music-player]");
  if (!root) return;

  var audio = root.querySelector("[data-music-audio]");
  if (!audio) return;

  var orb = root.querySelector("[data-music-orb]");
  var panel = root.querySelector("[data-music-panel]");
  var playBtn = root.querySelector("[data-music-playpause]");
  var iconPlay = playBtn && playBtn.querySelector("[data-icon-play]");
  var iconPause = playBtn && playBtn.querySelector("[data-icon-pause]");
  var label = playBtn && playBtn.querySelector("[data-music-label]");
  var muteBtn = root.querySelector("[data-music-mute]");
  var iconVolHigh = muteBtn && muteBtn.querySelector("[data-icon-vol-high]");
  var iconVolMute = muteBtn && muteBtn.querySelector("[data-icon-vol-mute]");
  var volumeSlider = root.querySelector("[data-music-volume]");
  var minimizeBtn = root.querySelector("[data-music-minimize]");

  var VOL_KEY = "sgMusicVolume";
  var MUTE_KEY = "sgMusicMuted";
  var DEFAULT_VOLUME = 0.35;

  function readVolume() {
    try {
      var saved = localStorage.getItem(VOL_KEY);
      if (saved === null) return DEFAULT_VOLUME;
      var n = parseFloat(saved);
      return isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_VOLUME;
    } catch (e) { return DEFAULT_VOLUME; }
  }
  function readMuted() {
    try { return localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { return false; }
  }
  function saveVolume(v) { try { localStorage.setItem(VOL_KEY, String(v)); } catch (e) {} }
  function saveMuted(m) { try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch (e) {} }

  audio.volume = readVolume();
  audio.muted = readMuted();

  // vontade explícita do usuário — só ele pode religar o som depois de mutar;
  // autoplayBlocked (navegador) nunca deve ser confundido com isso
  var userWantsMuted = audio.muted;
  var autoplayBlocked = false;
  var cueTriggered = false;

  function syncUI() {
    var isPaused = audio.paused;
    if (iconPlay) iconPlay.hidden = !isPaused;
    if (iconPause) iconPause.hidden = isPaused;
    var showCta = autoplayBlocked && isPaused;
    if (label) { label.hidden = !showCta; label.textContent = "Ativar som"; }
    if (playBtn) {
      playBtn.classList.toggle("is-cta", showCta);
      playBtn.setAttribute("aria-pressed", isPaused ? "false" : "true");
      playBtn.setAttribute("aria-label", showCta ? "Ativar som" : (isPaused ? "Tocar música" : "Pausar música"));
    }
    if (iconVolHigh) iconVolHigh.hidden = audio.muted;
    if (iconVolMute) iconVolMute.hidden = !audio.muted;
    if (muteBtn) {
      muteBtn.setAttribute("aria-pressed", audio.muted ? "true" : "false");
      muteBtn.setAttribute("aria-label", audio.muted ? "Desmutar" : "Mutar");
    }
    if (volumeSlider) volumeSlider.value = String(Math.round(audio.volume * 100));
  }

  function attemptPlay() {
    var p = audio.play();
    if (p && p.catch) {
      p.catch(function () {
        autoplayBlocked = true;
        syncUI();
      });
    }
  }

  function play() {
    autoplayBlocked = false;
    attemptPlay();
  }

  audio.addEventListener("play", syncUI);
  audio.addEventListener("pause", syncUI);
  audio.addEventListener("volumechange", syncUI);

  playBtn && playBtn.addEventListener("click", function () {
    if (audio.paused) play(); else audio.pause();
  });

  muteBtn && muteBtn.addEventListener("click", function () {
    audio.muted = !audio.muted;
    userWantsMuted = audio.muted;
    saveMuted(userWantsMuted);
    if (!audio.muted && audio.paused && autoplayBlocked) play();
    syncUI();
  });

  volumeSlider && volumeSlider.addEventListener("input", function () {
    var v = Math.min(100, Math.max(0, parseInt(volumeSlider.value, 10) || 0)) / 100;
    audio.volume = v;
    saveVolume(v);
    if (v > 0 && audio.muted) { audio.muted = false; userWantsMuted = false; saveMuted(false); }
    syncUI();
  });

  minimizeBtn && minimizeBtn.addEventListener("click", function () {
    audio.pause(); // currentTime não é tocado — retomar preserva o ponto exato
    if (orb) { orb.hidden = false; orb.focus(); }
    if (panel) panel.hidden = true;
  });

  orb && orb.addEventListener("click", function () {
    orb.hidden = true;
    if (panel) panel.hidden = false;
    if (!userWantsMuted) play();
    playBtn && playBtn.focus();
  });

  // ---- API usada pelo intro-loader (cue nos 8s do vídeo) ----

  // Dispara a faixa do zero exatamente uma vez por ciclo de intro. Chamado
  // no cue dos 8s (fluxo normal), ou como fallback quando a intro termina
  // sem ter disparado o cue (reduced-motion, bypass de teste, pular antes
  // dos 8s, ou timeout/erro do vídeo).
  function triggerCue() {
    if (cueTriggered) return;
    cueTriggered = true;
    try { audio.currentTime = 0; } catch (e) {}
    if (!userWantsMuted) play();
  }

  // Vídeo entrou em waiting/stalled ou pausou involuntariamente depois do
  // cue — pausa a faixa pra ela não correr sozinha na frente do vídeo.
  function pauseForResync() {
    if (!cueTriggered || audio.paused) return;
    audio.pause();
  }

  // Vídeo voltou a tocar depois de um stall — realinha se o desvio for
  // perceptível (>150ms) e retoma.
  function resumeFromResync(expectedTime) {
    if (!cueTriggered) return;
    if (isFinite(expectedTime) && expectedTime >= 0) {
      var diff = Math.abs(audio.currentTime - expectedTime);
      if (diff > 0.15) { try { audio.currentTime = expectedTime; } catch (e) {} }
    }
    if (audio.paused && !userWantsMuted) play();
  }

  // Gesto real do usuário aconteceu depois (ex: "Ativar som" da intro) —
  // tenta tocar de novo sem reiniciar a posição.
  function retryIfBlocked() {
    if (!cueTriggered || !audio.paused || userWantsMuted) return;
    play();
  }

  window.SG.music = {
    audio: audio,
    triggerCue: triggerCue,
    pauseForResync: pauseForResync,
    resumeFromResync: resumeFromResync,
    retryIfBlocked: retryIfBlocked,
  };

  // Um cue pode ter sido pedido antes deste módulo carregar (rede lenta) —
  // intro-loader.js seta essa flag nesse caso em vez de chamar direto.
  if (window.SG.musicCuePending) {
    window.SG.musicCuePending = false;
    triggerCue();
  }

  // Fim da intro: só garante que a faixa tenha começado (fallback pros
  // caminhos que nunca chegaram ao cue) e reexibe o player — nunca toca
  // currentTime nem chama play() de novo se o cue já rodou.
  function afterIntro() {
    if (!cueTriggered) triggerCue();
    root.hidden = false;
    syncUI();
  }

  // window.SG.introComplete cobre o caso em que a intro já terminou (ou foi
  // pulada via bypass de teste) antes deste import assíncrono rodar — só
  // escutar o evento perderia esse disparo síncrono anterior.
  if (window.SG.introComplete || !document.querySelector("[data-intro-loader]")) {
    afterIntro();
  } else {
    document.addEventListener("sg:intro-complete", afterIntro, { once: true });
  }
})();

export {};
