/* Animação decorativa isolada. Nunca escreve nos campos ou no estado da conta. */
export function mountOnboardingMascot(dialog,figure) {
  const header=dialog.querySelector('header');
  const form=dialog.querySelector('form');
  const image=figure.querySelector('img');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const gsap=window.gsap;
  let disposed=false,visible=true,entered=false,gesture=null;
  const paused=()=>disposed||!visible||document.hidden||reduced.matches;
  function syncPause(){figure.classList.toggle('is-paused',paused());}
  function enter(){
    if(disposed||entered||!image.complete||!image.naturalWidth)return;
    entered=true;
    if(!gsap||reduced.matches)return;
    gsap.fromTo(figure,{opacity:.35,x:20,rotationY:-12},{opacity:1,x:0,rotationY:0,transformPerspective:700,duration:.85,ease:'power3.out',clearProps:'opacity'});
  }
  const turnX=gsap?.quickTo(figure,'rotationX',{duration:.55,ease:'power3.out'});
  const turnY=gsap?.quickTo(figure,'rotationY',{duration:.55,ease:'power3.out'});
  function pointer(event){
    if(paused()||!fine.matches||!gsap)return;
    const bounds=header.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    turnY(((event.clientX-bounds.left)/bounds.width-.5)*10);
    turnX(-((event.clientY-bounds.top)/bounds.height-.5)*5);
  }
  function reset(){if(disposed||!gsap)return;turnX(0);turnY(0);}
  function guide(){
    if(paused()||!gsap)return;
    gesture?.kill();
    gesture=gsap.timeline().to(figure,{rotationY:-5,duration:.28,ease:'power2.out'}).to(figure,{rotationY:0,duration:.5,ease:'power3.out'});
  }
  function fail(){if(disposed)return;figure.hidden=true;header.classList.add('sg-mascot-unavailable');}
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
    visible=entries[0]?.isIntersecting||false;syncPause();if(!visible)reset();
  },{root:dialog,threshold:.05}):null;
  observer?.observe(figure);
  header.addEventListener('pointermove',pointer,{passive:true});
  header.addEventListener('pointerleave',reset);
  form.addEventListener('focusin',guide);
  image.addEventListener('load',enter);
  image.addEventListener('error',fail);
  document.addEventListener('visibilitychange',syncPause);
  reduced.addEventListener('change',syncPause);
  syncPause();enter();
  return()=>{
    disposed=true;observer?.disconnect();gesture?.kill();
    gsap?.killTweensOf(figure);
    header.removeEventListener('pointermove',pointer);
    header.removeEventListener('pointerleave',reset);
    form.removeEventListener('focusin',guide);
    image.removeEventListener('load',enter);image.removeEventListener('error',fail);
    document.removeEventListener('visibilitychange',syncPause);
    reduced.removeEventListener('change',syncPause);
  };
}
