// Stream both existing files through one lightweight output. No full MP3 decoding.
export function createMobileAudioMixer(music, intro, Context) {
 let context, musicGain, introGain, sourceMusic, sourceIntro, primed=false;
 let musicVolume=music.volume, introVolume=intro?.volume ?? .1;
 function unlock(){
  try {
   if(!context){
    context=new Context();musicGain=context.createGain();musicGain.gain.value=primed?musicVolume:0;
    sourceMusic=context.createMediaElementSource(music);sourceMusic.connect(musicGain);musicGain.connect(context.destination);music.volume=1;
    if(intro){introGain=context.createGain();introGain.gain.value=introVolume;sourceIntro=context.createMediaElementSource(intro);sourceIntro.connect(introGain);introGain.connect(context.destination);intro.volume=1;}
   }
   const resumed=context.resume();resumed?.catch(()=>{});return true;
  }catch(_){return false;}
 }
 return {
  unlock,
  ready:()=>Boolean(context&&musicGain),
  cue(){primed=true;if(musicGain)musicGain.gain.value=musicVolume;},
  getMusicVolume:()=>musicVolume,
  setMusicVolume(value){musicVolume=value;if(musicGain)musicGain.gain.value=primed?value:0;else music.volume=value;},
  setIntroVolume(value){introVolume=value;if(introGain)introGain.gain.value=value;else if(intro)intro.volume=value;},
 };
}
