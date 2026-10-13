/* Street Goose 034 — player de música global.
   Uma única instância de <audio>, persistente entre "rotas" (o router troca
   overlays no mesmo document — o elemento nunca é remontado). Autoplay
   bloqueado pelo navegador nunca vira erro de console — vira o botão
   "Ativar som" no próprio play/pause.

   O disparo da faixa NÃO é mais "quando a intro termina": js/intro-loader.js
   chama window.SG.music.triggerCue() pouco antes de Kibão apertar o rádio
   (~9,5s de vídeo), sincronizado pelo relógio do próprio vídeo. Este
   módulo só expõe essa API + o fallback de reexibir o player quando a intro
   acaba (afterIntro) — sem nunca chamar play()/resetar currentTime uma
   segunda vez se a faixa já estiver tocando. */
import {createMobileAudioMixer} from './mobile-audio-mixer.js';
(function () {
  "use strict";

  var root = document.querySelector("[data-music-player]");
  if (!root) return;

  var audio = root.querySelector("[data-music-audio]");
  if (!audio) return;

  // A intro dura menos de 19 s; começar a buscar a trilha enquanto o vídeo
  // roda evita que o carregamento de 11 MB atrase o cue dos 9,5 s. Não baixa
  // a faixa em visitas nas quais a intro já foi dispensada.
  var introLoader = document.querySelector("[data-intro-loader]");
  if (introLoader && !introLoader.hidden && !window.__sgIntroSkipRequested) {
    audio.preload = "auto";
    audio.load();
  }

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
  var mobilePlayback = window.matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0;
  var MobileContext = window.AudioContext || window.webkitAudioContext;
  var mixer = mobilePlayback && MobileContext ? createMobileAudioMixer(audio, document.querySelector('[data-intro-audio]'), MobileContext) : null;
  function volume(){return mixer?mixer.getMusicVolume():audio.volume;}
  function setVolume(value){if(mixer)mixer.setMusicVolume(value);else audio.volume=value;}

  // vontade explícita do usuário — só ele pode religar o som depois de mutar;
  // autoplayBlocked (navegador) nunca deve ser confundido com isso
  var userWantsMuted = audio.muted;
  var autoplayBlocked = false;
  var cueTriggered = false;
  var playPending = false;
  var userPaused = false;
  var buffering = false;
  var mediaError = false;

  function hideIcon(icon, hidden) {
    if (!icon) return;
    if (hidden) icon.setAttribute("hidden", "");
    else icon.removeAttribute("hidden");
  }

  function syncUI() {
    var isPaused = audio.paused;
    hideIcon(iconPlay, !isPaused);
    hideIcon(iconPause, isPaused);
    var showCta = autoplayBlocked || audio.muted || volume() === 0;
    var status = showCta ? "Ativar som" : mediaError ? "Tentar novamente" :
      (playPending || buffering) ? "Carregando…" : isPaused ? "Pausado" : "Tocando";
    if (label) { label.hidden = false; label.textContent = status; }
    root.dataset.musicState = showCta ? "blocked" : mediaError ? "error" :
      (playPending || buffering) ? "loading" : isPaused ? "paused" : "playing";
    if (playBtn) {
      playBtn.classList.toggle("is-cta", showCta);
      playBtn.setAttribute("aria-pressed", isPaused ? "false" : "true");
      playBtn.setAttribute("aria-label", showCta ? "Ativar som" : (isPaused ? "Tocar música" : "Pausar música"));
    }
    hideIcon(iconVolHigh, audio.muted);
    hideIcon(iconVolMute, !audio.muted);
    if (muteBtn) {
      muteBtn.setAttribute("aria-pressed", audio.muted ? "true" : "false");
      muteBtn.setAttribute("aria-label", audio.muted ? "Desmutar" : "Mutar");
    }
    if (volumeSlider) volumeSlider.value = String(Math.round(volume() * 100));
  }

  function attemptPlay() {
    if (playPending) return;
    playPending = true;
    mediaError = false;
    syncUI();
    var p;
    try { p = audio.play(); } catch (e) { playPending = false; autoplayBlocked = true; syncUI(); return; }
    if (p && p.then) p.then(function () {
      playPending = false;
      autoplayBlocked = false;
      syncUI();
    }, function () {
      playPending = false;
      autoplayBlocked = true;
      syncUI();
    });
    else playPending = false;
  }

  function activateSound() {
    if(mixer){mixer.unlock();mixer.cue();}
    if (audio.error) audio.load();
    userPaused = false;
    userWantsMuted = false;
    audio.muted = false;
    saveMuted(false);
    if (volume() === 0) { setVolume(DEFAULT_VOLUME); saveVolume(volume()); }
    play();
  }

  function play() {
    autoplayBlocked = false;
    attemptPlay();
  }

  audio.addEventListener("play", syncUI);
  audio.addEventListener("playing", function () { buffering = false; autoplayBlocked = false; syncUI(); });
  audio.addEventListener("waiting", function () { buffering = true; syncUI(); });
  audio.addEventListener("canplay", function () { buffering = false; syncUI(); });
  audio.addEventListener("error", function () { mediaError = true; playPending = false; buffering = false; syncUI(); });
  audio.addEventListener("pause", syncUI);
  audio.addEventListener("volumechange", syncUI);

  playBtn && playBtn.addEventListener("click", function () {
    if (audio.paused || audio.muted || volume() === 0) activateSound();
    else { userPaused = true; audio.pause(); }
  });

  muteBtn && muteBtn.addEventListener("click", function () {
    audio.muted = !audio.muted;
    userWantsMuted = audio.muted;
    saveMuted(userWantsMuted);
    if (!audio.muted && audio.paused) { userPaused = false; play(); }
    syncUI();
  });

  volumeSlider && volumeSlider.addEventListener("input", function () {
    var v = Math.min(100, Math.max(0, parseInt(volumeSlider.value, 10) || 0)) / 100;
    setVolume(v);
    saveVolume(v);
    if (v > 0 && audio.muted) { audio.muted = false; userWantsMuted = false; saveMuted(false); }
    syncUI();
  });

  minimizeBtn && minimizeBtn.addEventListener("click", function () {
    userPaused = true;
    audio.pause(); // currentTime não é tocado — retomar preserva o ponto exato
    if (orb) { orb.hidden = false; orb.focus(); }
    if (panel) panel.hidden = true;
  });

  orb && orb.addEventListener("click", function () {
    orb.hidden = true;
    if (panel) panel.hidden = false;
    userPaused = false;
    activateSound();
    playBtn && playBtn.focus();
  });

  // ---- API usada pelo intro-loader (cue nos 9,5s do vídeo) ----

  // Dispara a faixa do zero exatamente uma vez por ciclo de intro. Chamado
  // no cue dos 9,5s (fluxo normal), ou como fallback quando a intro termina
  // sem ter disparado o cue (reduced-motion, bypass de teste, pular antes
  // dos 8s, ou timeout/erro do vídeo).
  function triggerCue() {
    if (cueTriggered) return;
    cueTriggered = true;
    try { audio.currentTime = 0; } catch (e) {}
    if(mixer)mixer.cue();
    if (!userWantsMuted) play();
  }

  // Vídeo entrou em waiting/stalled ou pausou involuntariamente depois do
  // cue — pausa a faixa pra ela não correr sozinha na frente do vídeo.
  function pauseForResync() {
    if(mobilePlayback)return;
    if (!cueTriggered || audio.paused) return;
    audio.pause();
  }

  // Vídeo voltou a tocar depois de um stall — realinha se o desvio for
  // perceptível (>150ms) e retoma.
  function resumeFromResync(expectedTime) {
    if (!cueTriggered) return;
    if(mobilePlayback){if(audio.paused&&!userWantsMuted&&!userPaused&&!autoplayBlocked)play();return;}
    if (isFinite(expectedTime) && expectedTime >= 0) {
      var diff = Math.abs(audio.currentTime - expectedTime);
      if (diff > 0.15) { try { audio.currentTime = expectedTime; } catch (e) {} }
    }
    if (audio.paused && !userWantsMuted && !userPaused && !autoplayBlocked) play();
  }

  // Gesto real do usuário aconteceu depois (ex: "Ativar som" da intro) —
  // tenta tocar de novo sem reiniciar a posição.
  function retryIfBlocked() {
    if (!cueTriggered || !audio.paused || userWantsMuted || userPaused) return;
    play();
  }

  // Retry inside a real gesture, including after the intro has closed.
  document.addEventListener("pointerdown", function (event) {
    if (!root.contains(event.target) && autoplayBlocked) retryIfBlocked();
  }, true);
  document.addEventListener("keydown", function (event) {
    if (!root.contains(event.target) && autoplayBlocked) retryIfBlocked();
  }, true);

  // Unlock this audio element during a real intro gesture, keeping it silent
  // until the radio cue. Once play resolves, pause it at zero if still pre-cue.
  function unlockForIntro() {
    if (cueTriggered) { retryIfBlocked(); return; }
    if (userWantsMuted || playPending) return;
    if(mixer&&mixer.unlock()){
      playPending=true;
      var mobilePlay;
      try{mobilePlay=audio.play();}catch(_){playPending=false;autoplayBlocked=true;return;}
      Promise.resolve(mobilePlay).then(function(){playPending=false;autoplayBlocked=false;if(cueTriggered)mixer.cue();syncUI();},function(){playPending=false;autoplayBlocked=true;syncUI();});
      return; // Keep the authorized stream running silently until the cue.
    }
    var savedVolume = audio.volume;
    audio.volume = 0;
    playPending = true;
    var p = audio.play();
    if (p && p.then) p.then(function () {
      playPending = false;
      if (!cueTriggered) { audio.pause(); try { audio.currentTime = 0; } catch (e) {} }
      audio.volume = savedVolume;
    }, function () {
      playPending = false;
      audio.volume = savedVolume;
    });
  }

  function activateIntroSound() {
    if(mixer)mixer.unlock();
    userWantsMuted = false;
    userPaused = false;
    audio.muted = false;
    saveMuted(false);
    if (volume() === 0) { setVolume(DEFAULT_VOLUME); saveVolume(volume()); }
    unlockForIntro();
  }

  window.SG.music = {
    audio: audio,
    unlockForIntro: unlockForIntro,
    activateIntroSound: activateIntroSound,
    triggerCue: triggerCue,
    pauseForResync: pauseForResync,
    resumeFromResync: resumeFromResync,
    retryIfBlocked: retryIfBlocked,
    mobilePlayback: mobilePlayback,
    setIntroVolume: function(value){if(mixer)mixer.setIntroVolume(value);else {var track=document.querySelector('[data-intro-audio]');if(track)track.volume=value;}},
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
    else if (audio.paused && !userPaused && !userWantsMuted) play();
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
