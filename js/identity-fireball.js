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
