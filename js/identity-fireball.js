/* Originkit Toon Fireball adapted for SG034's scrub-driven Identity Film.
   Lightweight single-pass WebGL with fiery core, polar plasma and flame tail. */
export function createIdentityFireball(host, perfTier) {
  if (!host) return null;
  const canvas = host.querySelector("canvas");
  const mobile = matchMedia("(max-width:720px)").matches;
  const interval = 1000 / (mobile ? 24 : perfTier === "low" ? 20 : 42);
  let gl, program, locations, vertexBuffer, active = false, visible = false;
  let available = true, ready = false, frameId = 0, lastFrame = 0;
  let begin = 0, blue = 0, energy = 0, impact = 0;
  const vert = `
attribute vec2 xy;
varying vec2 uv;
void main(){uv=xy*.5+.5;gl_Position=vec4(xy,0.,1.);}
`;
  const frag = `
precision highp float;
varying vec2 uv;
uniform vec2 res;
uniform float tim, cool, power, burst;
float hash(vec2 v){return fract(sin(dot(v,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
 mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
float turbulence(vec2 p) {
 float n=0., w=.5;
 for(int j=0;j<3;j++){n+=w*noise(p);p*=2.07;w*=.5;}
 return n;
}
void main(){
 vec2 p=(uv-.5)*vec2(res.x/res.y,1.);
 p.x+=.07;
 float d=length(p),a=atan(p.y,p.x);
 float flow=turbulence(vec2(a*2.+tim*.16,d*12.-tim*1.7));
 float billow=turbulence(p*12.+vec2(tim*.30,-tim*.58));
 float distorted=d+(flow-.5)*.085+(billow-.5)*.035;
 float sphere=1.-smoothstep(.245,.31,distorted);
 float rim=(1.-smoothstep(.25,.40,distorted))*smoothstep(.12,.26,d);
 float z=sqrt(max(0.,1.-pow(min(d/.32,1.),2.)));
 float spec=pow(max(dot(normalize(vec3(p*2.,z)),normalize(vec3(-.55,.66,1.))),0.),5.);
 float tailX=max(p.x,0.);
 float wave=sin(p.x*14.-tim*2.7)*.05+(flow-.5)*.09;
 float tail=exp(-pow((p.y-wave)/(.10+tailX*.31),2.))*
 smoothstep(-.10,.15,p.x)*(1.-smoothstep(.2,.82,p.x))*
 smoothstep(.24,.67,billow+flow*.34);
 float flame=(1.-smoothstep(.27,.45+flow*.10,distorted))*
 smoothstep(.16,.77,flow+billow*.32);
 float alpha=clamp(sphere*(.5+spec*.4)+rim*.45+flame*.69+
 tail*.88+(1.-smoothstep(.26,.60,d))*.16,0.,1.);
 vec3 orange=mix(vec3(1.,.22,.014),vec3(1.,.82,.25),clamp(z*.55+spec,0.,1.));
 vec3 cobalt=mix(vec3(.07,.25,.97),vec3(.52,.87,1.),clamp(z*.52+spec,0.,1.));
 vec3 color=mix(orange,cobalt,cool);
 color=mix(color,mix(vec3(1.,.85,.59),vec3(.95,.99,1.),cool),
 clamp(spec*.44+burst*.17,0.,.6));
 gl_FragColor=vec4(color,alpha*power);
}
`;
  function makeShader(type,code){
    const s=gl.createShader(type);
    gl.shaderSource(s,code);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
      throw Error(gl.getShaderInfoLog(s)||"Shader invalid");
    }
    return s;
  }
  function init(){
    if(ready||!available)return ready;
    try{
      gl=canvas.getContext("webgl",{alpha:true,antialias:false,depth:false,
        premultipliedAlpha:false,powerPreference:"low-power"});
      if(!gl){available=false;return false;}
      const vs=makeShader(gl.VERTEX_SHADER,vert);
      const fs=makeShader(gl.FRAGMENT_SHADER,frag);
      program=gl.createProgram();
      gl.attachShader(program,vs);gl.attachShader(program,fs);
      gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error("WebGL link");
      vertexBuffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([
        -1,-1,1,-1,-1,1,-1,1,1,-1,1,1
      ]),gl.STATIC_DRAW);
      locations={
        pos:gl.getAttribLocation(program,"xy"),
        res:gl.getUniformLocation(program,"res"),
        tim:gl.getUniformLocation(program,"tim"),
        cool:gl.getUniformLocation(program,"cool"),
        power:gl.getUniformLocation(program,"power"),
        burst:gl.getUniformLocation(program,"burst")
      };
      ready=true;host.classList.add("is-webgl");
    }catch(e){available=false;console.warn("[SG034] Fireball CSS fallback",e);}
    return ready;
  }
  function render(now){
    frameId=0;
    if(!active||!visible||document.hidden)return;
    if(lastFrame&&now-lastFrame<interval){frameId=requestAnimationFrame(render);return;}
    lastFrame=now;
    if(!init())return;
    const box=canvas.getBoundingClientRect();
    const dpr=mobile?.82:Math.min(devicePixelRatio||1,1.25);
    const w=Math.max(2,Math.round(box.width*dpr));
    const h=Math.max(2,Math.round(box.height*dpr));
    if(w!==canvas.width||h!==canvas.height){
      canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);
    }
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
    gl.enableVertexAttribArray(locations.pos);
    gl.vertexAttribPointer(locations.pos,2,gl.FLOAT,false,0,0);
    gl.uniform2f(locations.res,w,h);
    gl.uniform1f(locations.tim,(now-begin)/1000);
    gl.uniform1f(locations.cool,blue);
    gl.uniform1f(locations.power,energy);
    gl.uniform1f(locations.burst,impact);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES,0,6);
    frameId=requestAnimationFrame(render);
  }
  function sync(){
    const run=active&&visible&&!document.hidden&&available;
    if(run&&!frameId)frameId=requestAnimationFrame(render);
    if(!run&&frameId){cancelAnimationFrame(frameId);frameId=0;}
  }
