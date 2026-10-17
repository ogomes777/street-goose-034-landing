import './interaction-guide.css';
// A small, lazy Three.js scene. It illustrates a click; it never dispatches one.
export function mountInteractionGuide(host){
 if(!host)return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let contextLost=false,visible=false,sceneState,loading=false,disposed=false,frame=0,last=0;
 const fallback=host.querySelector('.sg-guide-fallback');
 fallback.innerHTML='<svg viewBox="0 0 100 88" width="100" height="88" aria-hidden="true"><circle class="sg-guide-wave" cx="31" cy="24" r="11" fill="none" stroke="currentColor" stroke-width="1.5"/><path class="sg-guide-arrow" d="M31 19 L31 62 L43 51 L51 69 L59 65 L51 47 L66 47 Z" fill="currentColor" stroke="#7c5726" stroke-width="1"/><path class="sg-guide-highlight" d="M33 22 L33 56 L43 47 L52 47" fill="none" stroke="#ffe7ae" stroke-width="1.5"/></svg>';
 async function initialise(){
  // A whole WebGL context for a 100px cursor only pays off on strong devices;
  // everyone else keeps the animated SVG fallback.
  if(loading||sceneState||disposed||(window.SG&&window.SG.perfTier!=='high'))return;loading=true;
  try{
   const THREE=await import('three');if(disposed)return;
   const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(100,88);renderer.setClearColor(0,0);renderer.outputEncoding=THREE.sRGBEncoding;
   renderer.domElement.setAttribute('aria-hidden','true');
   const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,100/88,.1,30);camera.position.z=6;
   scene.add(new THREE.AmbientLight(0xffe9bf,.8));const key=new THREE.DirectionalLight(0xffdf91,1.6);key.position.set(-2,3,5);scene.add(key);const rim=new THREE.DirectionalLight(0xffffff,.9);rim.position.set(3,-1,2);scene.add(rim);
   const group=new THREE.Group(),shape=new THREE.Shape();
   shape.moveTo(-.5,.9);shape.lineTo(-.5,-.65);shape.lineTo(-.1,-.3);shape.lineTo(.17,-.86);shape.lineTo(.43,-.74);shape.lineTo(.15,-.2);shape.lineTo(.65,-.2);shape.closePath();
   const geometry=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelThickness:.05,bevelSize:.04,bevelSegments:2,steps:1});
   const material=new THREE.MeshStandardMaterial({color:0xd9ac55,metalness:.8,roughness:.3});const cursor=new THREE.Mesh(geometry,material);group.add(cursor);group.rotation.set(-.18,.28,-.15);scene.add(group);
   const ringGeometry=new THREE.RingGeometry(.35,.38,40),ringMaterial=new THREE.MeshBasicMaterial({color:0xd9ac55,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false});const ring=new THREE.Mesh(ringGeometry,ringMaterial);ring.position.set(-.45,.7,-.2);scene.add(ring);
   sceneState={renderer,scene,camera,group,ring,geometry,material,ringGeometry,ringMaterial};host.append(renderer.domElement);fallback.hidden=true;renderer.render(scene,camera);schedule();
   renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;stop();renderer.domElement.hidden=true;fallback.hidden=false;});
  }catch(_){fallback.hidden=false;}finally{loading=false;}
 }
 function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
 function schedule(){if(frame||contextLost||disposed||!sceneState||!visible||document.hidden||motion.matches)return;frame=requestAnimationFrame(tick);}
 function tick(time){frame=0;if(disposed||!visible||document.hidden||motion.matches)return;
  if(time-last>=1000/24){last=time;const t=time/1000,phase=t%4,press=phase>1.4&&phase<1.8?Math.sin((phase-1.4)/.4*Math.PI):0;const s=sceneState;
   s.group.position.set(Math.sin(t*.9)*.12,Math.sin(t*1.2)*.12-press*.12,0);s.group.rotation.y=.28+Math.sin(t*.8)*.18;s.group.scale.setScalar(1-press*.08);
   const wave=(phase-1.4+4)%4;s.ring.scale.setScalar(1+wave*.6);s.ringMaterial.opacity=wave<1.4?(1-wave/1.4)*.65:0;s.renderer.render(s.scene,s.camera);
  }schedule();
 }
 const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){initialise();schedule();}else stop();},{rootMargin:'40px'}):null;
 if(observer)observer.observe(host);else{visible=true;initialise();}
 function update(){stop();schedule();}document.addEventListener('visibilitychange',update);motion.addEventListener('change',update);
 window.addEventListener('pagehide',event=>{if(event.persisted){stop();return;}disposed=true;stop();observer?.disconnect();document.removeEventListener('visibilitychange',update);motion.removeEventListener('change',update);if(sceneState){const s=sceneState;for(const resource of [s.geometry,s.material,s.ringGeometry,s.ringMaterial,s.renderer])resource.dispose();}},{once:true});
 window.addEventListener('pageshow',()=>{if(!disposed)schedule();});
}
