// Mixer de volume para Safari/iOS e Android.
// O contexto de áudio só nasce em um gesto humano; nunca conecte elementos
// ao Web Audio antes desse gesto, pois um contexto suspenso produz silêncio
// mesmo quando HTMLMediaElement.paused === false.
export function createMobileAudioMixer(music, intro, Context) {
  let context = null, musicGain = null, introGain = null, primed = false;
  let musicVolume = music.volume, introVolume = intro?.volume ?? 0.1;
  let onStateChange = () => {};

  function unlock() {
    try {
      if (!context) {
        const next = new Context();
        const gainMusic = next.createGain();
        gainMusic.gain.value = primed ? musicVolume : 0;
        const sourceMusic = next.createMediaElementSource(music);
        sourceMusic.connect(gainMusic);
        gainMusic.connect(next.destination);
        music.volume = 1;
        if (intro) {
          const gainIntro = next.createGain();
          gainIntro.gain.value = introVolume;
          const sourceIntro = next.createMediaElementSource(intro);
          sourceIntro.connect(gainIntro);
          gainIntro.connect(next.destination);
          intro.volume = 1;
          introGain = gainIntro;
        }
        musicGain = gainMusic;
        context = next;
        context.addEventListener?.("statechange", onStateChange);
      }
      // Chamar diretamente no pointerdown/click/keydown. Se for rejeitado,
      // a UI permanece em "Ativar som"; não fingir que está tocando.
      if (context.state !== "running") {
        const attempt = context.resume();
        attempt?.then(onStateChange, onStateChange);
      }
      onStateChange();
      return true;
    } catch (_error) {
      onStateChange();
      return false;
    }
  }

  return {
    unlock,
    ready: () => Boolean(context && musicGain),
    isRunning: () => !context || context.state === "running",
    setOnStateChange(callback) {
      onStateChange = typeof callback === "function" ? callback : () => {};
      if (context) context.addEventListener?.("statechange", onStateChange);
    },
    cue() {
      primed = true;
      if (musicGain) musicGain.gain.value = musicVolume;
    },
    getMusicVolume: () => musicVolume,
    setMusicVolume(value) {
      musicVolume = value;
      if (musicGain) musicGain.gain.value = primed ? value : 0;
      else music.volume = value;
    },
    setIntroVolume(value) {
      introVolume = value;
      if (introGain) introGain.gain.value = value;
      else if (intro) intro.volume = value;
    },
  };
}
