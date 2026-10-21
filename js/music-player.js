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
  var mobilePlayback = window.matchMedia("(pointer: coarse)").matches && navigator.maxTouchPoints > 0;
  // A edição mobile (96 kbps, gerada e versionada pelo CI) reduz tráfego
  // e libera o decoder mais cedo em aparelhos modestos. Desktop preserva
  // a trilha original. Em falha de rede do arquivo mobile, volta ao original.
  var fallbackThemeSource = audio.src;
  var usingMobileTheme = mobilePlayback;
  var mobileThemeFallbackTried = false;
  if (usingMobileTheme) audio.src = "/assets/street-goose-theme-mobile.mp3";

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
  var playWatchdog = null;
  var playRequestId = 0;

  function hideIcon(icon, hidden) {
    if (!icon) return;
    if (hidden) icon.setAttribute("hidden", "");
    else icon.removeAttribute("hidden");
  }

  function syncUI() {
    var isPaused = audio.paused;
    hideIcon(iconPlay, !isPaused);
    hideIcon(iconPause, isPaused);
    // HTMLAudioElement.paused=false NÃO garante som se o AudioContext
    // do iPhone tiver sido suspenso pelo sistema.
    var mixerSuspended = Boolean(mixer && mixer.ready() && !mixer.isRunning());
    var showCta = autoplayBlocked || mixerSuspended || audio.muted || volume() === 0;
    var status = mediaError ? "Tentar novamente" : showCta ? "Ativar som" :
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

  function attemptPlay(force) {
    if (playPending && !force) return;
    var id = ++playRequestId;
    if (playWatchdog) clearTimeout(playWatchdog);
    playPending = true;
    mediaError = false;
    syncUI();
    // Dispositivos lentos podem deixar play() pendente indefinidamente.
    // Não prender o CTA numa Promise que nunca resolve.
    playWatchdog = setTimeout(function () {
      if (id !== playRequestId) return;
      playPending = false;
      if (audio.paused) autoplayBlocked = true;
      buffering = !audio.paused && audio.readyState < 3;
      syncUI();
    }, 7000);
    function settled(accepted) {
      if (id !== playRequestId) return;
      clearTimeout(playWatchdog);
      playWatchdog = null;
      playPending = false;
      autoplayBlocked = !accepted;
      if (accepted) buffering = audio.readyState < 3;
      syncUI();
    }
    try {
      var p = audio.play();
      if (p && p.then) p.then(function () { settled(true); }, function () { settled(false); });
      else settled(true);
    } catch (e) { settled(false); }
  }

  function activateSound() {
    // Importante: resume() precisa acontecer sincronamente no gesto humano.
    // Não confiar no estado do <audio> se o Web Audio estiver suspenso.
    if (mixer) { mixer.unlock(); if (cueTriggered) mixer.cue(); }
    if (audio.error) audio.load();
    userPaused = false;
    userWantsMuted = false;
    audio.muted = false;
    saveMuted(false);
    if (volume() === 0) { setVolume(DEFAULT_VOLUME); saveVolume(volume()); }
    autoplayBlocked = false;
    attemptPlay(true);
  }

  function play() {
    autoplayBlocked = false;
    attemptPlay();
  }

  if (mixer && mixer.setOnStateChange) mixer.setOnStateChange(syncUI);
  audio.addEventListener("play", syncUI);
  audio.addEventListener("playing", function () {
    buffering = false;
    playPending = false;
    if (playWatchdog) clearTimeout(playWatchdog);
    playWatchdog = null;
    // Não confundir som suspenso com som desbloqueado.
    if (!mixer || mixer.isRunning()) autoplayBlocked = false;
    syncUI();
  });
  audio.addEventListener("waiting", function () { buffering = true; syncUI(); });
  audio.addEventListener("canplay", function () { buffering = false; syncUI(); });
  audio.addEventListener("error", function () {
    if (usingMobileTheme && !mobileThemeFallbackTried) {
      // Recuperação sem perder o play/pause nem o volume salvo.
      mobileThemeFallbackTried = true;
      mediaError = false;
      ++playRequestId;
      playPending = false;
      if (playWatchdog) clearTimeout(playWatchdog);
      playWatchdog = null;
      audio.src = fallbackThemeSource;
      audio.load();
      if (cueTriggered && !userPaused && !userWantsMuted) attemptPlay(true);
      syncUI();
      return;
    }
    mediaError = true;
    playPending = false;
    buffering = false;
    syncUI();
  });
  audio.addEventListener("pause", syncUI);
  audio.addEventListener("volumechange", syncUI);

  playBtn && playBtn.addEventListener("click", function () {
    // Primeiro toque recupera WebAudio suspenso / buffering travado.
    // Antes, "paused=false" fazia o clique PAUSAR um áudio silencioso;
    // só o segundo clique retomava e liberava o som.
    if (audio.paused || audio.muted || volume() === 0 || autoplayBlocked ||
        mediaError || buffering || (mixer && mixer.ready() && !mixer.isRunning())) {
      activateSound();
    } else {
      userPaused = true;
      ++playRequestId;
      if (playWatchdog) clearTimeout(playWatchdog);
      playWatchdog = null;
      playPending = false;
      audio.pause();
      syncUI();
    }
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
    if (!cueTriggered || userWantsMuted || userPaused) return;
    // pointerdown/keydown é gesto válido. Pode reanimar o mixer mesmo quando
    // o elemento HTML ainda diz "playing" mas o dispositivo está em silêncio.
    // Um gesto também precisa recuperar um mixer que não conseguiu ser
    // inicializado no primeiro toque. O contexto pode existir e estar
    // suspenso mesmo quando <audio>.paused é false.
    if (mixer) mixer.unlock();
    if (audio.paused || autoplayBlocked || mediaError || buffering) attemptPlay(true);
    else syncUI();
  }

  // Retry inside a real gesture, including after the intro has closed.
  document.addEventListener("pointerdown", function (event) {
    if (!root.contains(event.target) &&
        (autoplayBlocked || buffering || (mixer && mixer.ready() && !mixer.isRunning()))) retryIfBlocked();
  }, true);
  document.addEventListener("keydown", function (event) {
    if (!root.contains(event.target) &&
        (autoplayBlocked || (mixer && mixer.ready() && !mixer.isRunning()))) retryIfBlocked();
  }, true);

  // Unlock this audio element during a real intro gesture, keeping it silent
  // until the radio cue. Once play resolves, pause it at zero if still pre-cue.
  function unlockForIntro() {
    if (cueTriggered) { retryIfBlocked(); return; }
    if (userWantsMuted) return;
    // Um gesto de ativação não deve ser ignorado só porque play() anterior
    // ficou pendente na rede. Reabrir o contexto imediatamente no gesto.
    if (mixer) mixer.unlock();
    if (playPending) return;
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

  document.addEventListener("visibilitychange", function () {
    // iOS pode suspender o contexto durante bloqueio de tela/alternância.
    // Não retomar à força sem gesto: mostrar "Ativar som" e preservar
    // o desejo de pausa do visitante.
    if (!document.hidden) syncUI();
  });

  window.SG.music = {
    audio: audio,
    unlockForIntro: unlockForIntro,
    activateIntroSound: activateIntroSound,
    triggerCue: triggerCue,
    pauseForResync: pauseForResync,
    resumeFromResync: resumeFromResync,
    retryIfBlocked: retryIfBlocked,
    mobilePlayback: mobilePlayback,
    isOutputRunning: function () { return !mixer || !mixer.ready() || mixer.isRunning(); },
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
