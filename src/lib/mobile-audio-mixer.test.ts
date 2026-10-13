import {expect,it,vi} from 'vitest';
import {createMobileAudioMixer} from '../../js/mobile-audio-mixer.js';
function fixture(){
 const gains:{gain:{value:number};connect:ReturnType<typeof vi.fn>}[]=[];
 const resume=vi.fn().mockResolvedValue(undefined),source=vi.fn(()=>({connect:vi.fn()}));
 class Context{destination={};resume=resume;createMediaElementSource=source;createGain(){const node={gain:{value:1},connect:vi.fn()};gains.push(node);return node;}}
 const music={volume:.35,currentTime:0,paused:false,pause:vi.fn()},intro={volume:.1};
 return {mixer:createMobileAudioMixer(music,intro,Context),gains,resume,source,music};
}
it('keeps the authorized music stream silent until the cue without pausing it',()=>{const f=fixture();expect(f.mixer.unlock()).toBe(true);expect(f.gains[0].gain.value).toBe(0);f.mixer.cue();expect(f.gains[0].gain.value).toBe(.35);expect(f.music.pause).not.toHaveBeenCalled();expect(f.music.currentTime).toBe(0);});
it('reuses one context and two streaming sources across gestures',()=>{const f=fixture();f.mixer.unlock();f.mixer.unlock();expect(f.source).toHaveBeenCalledTimes(2);expect(f.resume).toHaveBeenCalledTimes(2);});
it('applies music volume and intro ducking independently',()=>{const f=fixture();f.mixer.unlock();f.mixer.setMusicVolume(.2);expect(f.gains[0].gain.value).toBe(0);f.mixer.cue();f.mixer.setIntroVolume(.045);expect(f.gains[0].gain.value).toBe(.2);expect(f.gains[1].gain.value).toBe(.045);});
