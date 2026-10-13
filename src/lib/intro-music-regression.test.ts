import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {expect,it,vi} from 'vitest';
function player(mobile:boolean){
 const listeners:Record<string,()=>void>={},seeks:number[]=[];let position=0;
 const audio={volume:.35,muted:false,paused:true,preload:'none',error:null,load:vi.fn(),addEventListener:vi.fn(),get currentTime(){return position;},set currentTime(value:number){position=value;seeks.push(value);},play:vi.fn(()=>{audio.paused=false;return Promise.resolve();}),pause:vi.fn(()=>{audio.paused=true;})};
 const intro={hidden:false},root={hidden:true,dataset:{},contains:()=>false,querySelector:(selector:string)=>selector==='[data-music-audio]'?audio:null};
 const window={SG:{} as any,matchMedia:()=>({matches:mobile})};
 const document={querySelector:(selector:string)=>selector==='[data-music-player]'?root:selector==='[data-intro-loader]'?intro:null,addEventListener:(event:string,fn:()=>void)=>{listeners[event]=fn;}};
 const code=readFileSync(new URL('../../js/music-player.js',import.meta.url),'utf8').replace(/^import .*;\n/m,'').replace('export {};','');
 vm.runInNewContext(code,{window,document,navigator:{maxTouchPoints:mobile?1:0},localStorage:{getItem:()=>null,setItem:()=>{}},Promise});
 return {music:window.SG.music,audio,seeks,complete:listeners['sg:intro-complete']};
}
it('mobile video stalls neither pause nor repeatedly seek the already cued song',()=>{const p=player(true);p.music.triggerCue();p.music.pauseForResync();p.music.resumeFromResync(2);p.music.resumeFromResync(3);expect(p.audio.pause).not.toHaveBeenCalled();expect(p.seeks).toEqual([0]);p.complete();expect(p.seeks).toEqual([0]);});
it('preserves desktop resynchronization and does not reset the song when intro closes',()=>{const p=player(false);p.music.triggerCue();p.music.pauseForResync();expect(p.audio.pause).toHaveBeenCalledOnce();p.music.resumeFromResync(2);expect(p.seeks).toEqual([0,2]);p.complete();expect(p.seeks).toEqual([0,2]);});
