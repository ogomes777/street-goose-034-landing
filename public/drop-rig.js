/* SG 034: continuous textured mesh articulation, one GPU draw per motion tick.
   Boots stay planted while the knees bend. The throwing arm has its own joint.
   No pose swaps, sprite playback, video download or independent render loop. */
(function () {
  'use strict';
  // Canvas fallback uses cached transparent parts and a small deformation mesh.
  // It redraws only during authored motion; there is no background RAF loop.
  function canvasRig(host, lite) {
    var canvas=document.createElement('canvas');canvas.className='sg-drop-rig';canvas.setAttribute('aria-hidden','true');
    var ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return null;
    var image=new Image(),body,arm,ready=false,last={crouch:0,arm:0,lean:0};
    var poly=[[.02,.30],[.43,.27],[.50,.36],[.38,.46],[.18,.56],[.02,.51]];
    function bodyPoint(p,s){
      var c=s.crouch||0,l=s.lean||0;
      function smooth(a,b,v){var t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);}
      var hip=1-smooth(.58,.92,p.y),knee=Math.sin(Math.max(0,Math.min(1,(p.y-.58)/.34))*Math.PI);
      var x=p.x+.015*c*hip+(p.x<.52?-.09:.08)*c*knee,y=p.y+.125*c*hip;
      var w=1-smooth(.55,.78,p.y),angle=l*w,dx=x-.53,dy=y-(.59+.125*c);
      return {x:x+dx*Math.cos(angle)-dy*Math.sin(angle)-dx,y:y+dx*Math.sin(angle)+dy*Math.cos(angle)-dy};
    }
    function hand(s){var pivot=bodyPoint({x:.43,y:.32},s),a=(s.arm||0)+(s.lean||0),vx=-.27,vy=.12;return{x:pivot.x+vx*Math.cos(a)-vy*Math.sin(a),y:pivot.y+vx*Math.sin(a)+vy*Math.cos(a)};}
    function cachedPart(isArm){
      var c=document.createElement('canvas');c.width=image.width/4;c.height=image.height;var g=c.getContext('2d'),path=new Path2D();
      if(!isArm)path.rect(0,0,c.width,c.height);
      poly.forEach(function(p,i){if(!i)path.moveTo(p[0]*c.width,p[1]*c.height);else path.lineTo(p[0]*c.width,p[1]*c.height);});path.closePath();g.clip(path,isArm?'nonzero':'evenodd');
      g.drawImage(image,c.width*3,0,c.width,c.height,0,0,c.width,c.height);return c;
    }
    host.appendChild(canvas);
    function render(s){
      last=s;if(!ready)return;
      var dpr=Math.min(window.devicePixelRatio||1,1.25),gw=host.clientWidth*dpr,gh=host.clientHeight*dpr;if(!gw||!gh)return;
      var width=Math.round(gw*1.6),height=Math.round(gh*1.4);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);
      if(Math.abs(s.crouch||0)+Math.abs(s.lean||0)<.001){ctx.drawImage(body,.3*gw,.2*gh,gw,gh);}
      else {
        // Torso is one cached draw; only knees and legs need the deformation grid.
        ctx.save();ctx.translate(.53*gw+.3*gw,(.59+.125*(s.crouch||0)) *gh+.2*gh);ctx.scale(gw,gh);ctx.rotate(s.lean||0);ctx.translate(.015*(s.crouch||0)-.53,-.59);ctx.drawImage(body,0,0,body.width,body.height*.55,0,0,1,.55);ctx.restore();
        var cols=lite?6:8,rows=lite?6:8;
        var points=[];
        for(var y=0;y<=rows;y++)for(var x=0;x<=cols;x++){var p=bodyPoint({x:x/cols,y:.55+.45*y/rows},s);points.push({x:(p.x+.3)*gw,y:(p.y+.2)*gh});}
        function triangle(indices,src,box){
          var q=indices.map(function(i){return points[i];});
          var sx=src[0].x,sy=src[0].y,ux=src[1].x-sx,uy=src[1].y-sy,vx=src[2].x-sx,vy=src[2].y-sy,det=ux*vy-vx*uy;
          var dx1=q[1].x-q[0].x,dy1=q[1].y-q[0].y,dx2=q[2].x-q[0].x,dy2=q[2].y-q[0].y;
          var a=(dx1*vy-dx2*uy)/det,b=(dy1*vy-dy2*uy)/det,c=(dx2*ux-dx1*vx)/det,d=(dy2*ux-dy1*vx)/det;
          ctx.save();ctx.beginPath();var mx=(q[0].x+q[1].x+q[2].x)/3,my=(q[0].y+q[1].y+q[2].y)/3;
          q.forEach(function(p,i){var xx=mx+(p.x-mx)*1.008,yy=my+(p.y-my)*1.008;if(!i)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);});ctx.closePath();ctx.clip();
          ctx.setTransform(a,b,c,d,q[0].x-a*sx-c*sy,q[0].y-b*sx-d*sy);
          ctx.drawImage(body,box.x,box.y,box.w,box.h,box.x,box.y,box.w,box.h);ctx.restore();
        }
        for(var j=0;j<rows;j++)for(var i=0;i<cols;i++){
          var n=j*(cols+1)+i,x0=i/cols*body.width,y0=(.55+.45*j/rows)*body.height,x1=(i+1)/cols*body.width,y1=(.55+.45*(j+1)/rows)*body.height;
          var box={x:x0,y:y0,w:x1-x0,h:y1-y0};
          triangle([n,n+1,n+cols+1],[{x:x0,y:y0},{x:x1,y:y0},{x:x0,y:y1}],box);
          triangle([n+1,n+cols+2,n+cols+1],[{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}],box);
        }
      }
      var pivot=bodyPoint({x:.43,y:.32},s);
      ctx.save();ctx.translate((pivot.x+.3)*gw,(pivot.y+.2)*gh);ctx.scale(gw,gh);ctx.rotate((s.arm||0)+(s.lean||0));ctx.drawImage(arm,-.43,-.32,1,1);ctx.restore();
    }
    image.decoding='async';image.fetchPriority='high';image.onload=function(){body=cachedPart(false);arm=cachedPart(true);ready=true;render(last);host.classList.add('has-rig');host.dataset.rigStatus='canvas';};image.onerror=function(){canvas.remove();};image.src='/brand/drop-goose-poses-034.webp';
    return {render:render,hand:hand,resize:function(){render(last);},ready:function(){return ready;}};
  }
  window.SGDropRig = function (host, lite) {
    var canvas = document.createElement('canvas');
    canvas.className = 'sg-drop-rig';
    canvas.setAttribute('aria-hidden', 'true');
    var gl;
    try { gl = canvas.getContext('webgl', {alpha:true, antialias:false, depth:false, stencil:false, premultipliedAlpha:false, powerPreference:'low-power'}); } catch (_) {}
    if (!gl) return canvasRig(host, lite);
    var vertex = 'precision mediump float; attribute vec3 a; varying vec2 uv; varying float part; uniform float crouch; uniform float arm; uniform float lean; '+
      'vec2 body(vec2 p){ float originalY=p.y; float hip=1.-smoothstep(.58,.92,p.y); float knee=sin(clamp((p.y-.58)/.34,0.,1.)*3.14159265); '+
      'p.x+=.015*crouch*hip + (p.x<.52?-.09:.08)*crouch*knee; p.y+=.125*crouch*hip; '+
      'float w=1.-smoothstep(.55,.78,originalY); vec2 d=p-vec2(.53,.59+.125*crouch); float angle=lean*w; '+
      'p+=vec2(d.x*cos(angle)-d.y*sin(angle),d.x*sin(angle)+d.y*cos(angle))-d; return p; } '+
      'void main(){uv=a.xy;part=a.z;vec2 p=body(a.xy); '+
      'if(a.z>.5){vec2 pivot=body(vec2(.43,.32));vec2 v=a.xy-vec2(.43,.32); '+
      'float angle=arm+lean; p=pivot+vec2(v.x*cos(angle)-v.y*sin(angle),v.x*sin(angle)+v.y*cos(angle));} '+
      'gl_Position=vec4((p.x+.3)/1.6*2.-1.,1.-(p.y+.2)/1.4*2.,0.,1.); }';
    var fragment = 'precision mediump float; varying vec2 uv; varying float part; uniform sampler2D tex; '+
      'float edge(vec2 a,vec2 b,vec2 p){return (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);} '+
      'void main(){ vec2 p=uv; bool inArm=edge(vec2(.02,.30),vec2(.43,.27),p)>=0. '+
      '&&edge(vec2(.43,.27),vec2(.50,.36),p)>=0. &&edge(vec2(.50,.36),vec2(.38,.46),p)>=0. '+
      '&&edge(vec2(.38,.46),vec2(.18,.56),p)>=0. &&edge(vec2(.18,.56),vec2(.02,.51),p)>=0. '+
      '&&edge(vec2(.02,.51),vec2(.02,.30),p)>=0.; '+
      'if((part>.5 && !inArm)||(part<.5 && inArm))discard; '+
      'gl_FragColor=texture2D(tex,vec2((uv.x+3.)/4.,uv.y)); }';
    function shader(type, source) {
      var s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)||'Rig shader failed');return s;
    }
    var program;
    try {
      program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    } catch(error){host.dataset.rigStatus='fallback';return canvasRig(host, lite);}
    gl.useProgram(program);
    var cols=lite?12:20,rows=lite?18:28,vertices=[];
    for(var part=0;part<2;part++) for(var y=0;y<rows;y++) for(var x=0;x<cols;x++) {
      [[x,y],[x+1,y],[x,y+1],[x+1,y],[x+1,y+1],[x,y+1]].forEach(function(p){vertices.push(p[0]/cols,p[1]/rows,part);});
    }
    var buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    var attr=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,0,0);
    var loc={crouch:gl.getUniformLocation(program,'crouch'),arm:gl.getUniformLocation(program,'arm'),lean:gl.getUniformLocation(program,'lean')};
    var tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    var ready=false,failed=false,last={crouch:0,arm:0,lean:0};
    host.appendChild(canvas);
    function render(state) {
      last=state;
      if(!ready||failed) return;
      var dpr=Math.min(window.devicePixelRatio||1,lite?1:1.5);
      var w=Math.round(host.clientWidth*1.6*dpr),h=Math.round(host.clientHeight*1.4*dpr);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
      gl.uniform1f(loc.crouch,state.crouch||0);gl.uniform1f(loc.arm,state.arm||0);gl.uniform1f(loc.lean,state.lean||0);
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,vertices.length/3);
    }
    var img=new Image();img.decoding='async';img.fetchPriority='high';
    img.onload=function(){
      if(failed)return;
      gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      ready=true;render(last);host.classList.add('has-rig');host.dataset.rigStatus='ready';
    };
    img.onerror=function(){failed=true;canvas.remove();};
    img.src='/brand/drop-goose-poses-034.webp';
    canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();failed=true;host.classList.remove('has-rig');});
    // Match the vertex shader's shoulder and hand deformation exactly.
    function hand(state) {
      var c=state.crouch||0,l=state.lean||0,angle=(state.arm||0)+l;
      var px=.43+.015*c,py=.32+.125*c;
      var dx=px-.53,dy=py-(.59+.125*c);
      var pivotX=.53+dx*Math.cos(l)-dy*Math.sin(l),pivotY=.59+.125*c+dx*Math.sin(l)+dy*Math.cos(l);
      var vx=.16-.43,vy=.44-.32;
      return {x:pivotX+vx*Math.cos(angle)-vy*Math.sin(angle),y:pivotY+vx*Math.sin(angle)+vy*Math.cos(angle)};
    }
    return {render:render,hand:hand,resize:function(){render(last);},ready:function(){return ready&&!failed;}};
  };
})();
