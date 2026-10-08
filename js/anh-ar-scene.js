/* Three.js camera overlays. All geometry and textures are created locally. */
import * as THREE from './vendor/three/three.module.min.js';

const clamp = THREE.MathUtils.clamp;
const smooth = (a,b,x) => THREE.MathUtils.smoothstep(x,a,b);

function seededRandom(seed=18102026) {
  return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
function canvasTexture(width,height,draw) {
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;draw(canvas.getContext('2d'),width,height);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function roundedBox(w,h,d,r=.035) {
  const geometry=new THREE.BoxGeometry(w,h,d,4,4,4),position=geometry.attributes.position,normal=geometry.attributes.normal;
  const core=new THREE.Vector3(),p=new THREE.Vector3();
  const bevelCoordinate=(value,extent)=>Math.abs(value)<1e-7?0:Math.abs(value)<extent*.999?Math.sign(value)*(extent-r):value;
  // Analytic bevel normals agree at duplicated face vertices, including thin ribbons.
  // Place the inner edge vertices at the bevel boundary so the broad faces stay flat.
  for(let i=0;i<position.count;i++){p.fromBufferAttribute(position,i);p.set(bevelCoordinate(p.x,w/2),bevelCoordinate(p.y,h/2),bevelCoordinate(p.z,d/2));core.set(clamp(p.x,-w/2+r,w/2-r),clamp(p.y,-h/2+r,h/2-r),clamp(p.z,-d/2+r,d/2-r));p.sub(core).normalize();normal.setXYZ(i,p.x,p.y,p.z);p.multiplyScalar(r).add(core);position.setXYZ(i,p.x,p.y,p.z);}
  return geometry;
}
function buildGift(scene) {
  const random=seededRandom(91919);
  const grain=canvasTexture(256,256,(ctx,w,h)=>{ctx.fillStyle='#fafafa';ctx.fillRect(0,0,w,h);for(let i=0;i<22000;i++){const v=238+Math.floor(random()*15);ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(random()*w,random()*h,1,1);}});
  grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(2,2);
  // Fine paper grain lives in the color map, avoiding noisy derivative-based bump normals on phone GPUs.
  const paper=new THREE.MeshStandardMaterial({color:0xc29da9,roughness:.72,metalness:0,map:grain});
  const inner=new THREE.MeshStandardMaterial({color:0xe3cebc,roughness:.88,map:grain});
  const ribbon=new THREE.MeshStandardMaterial({color:0xcbae75,metalness:.55,roughness:.31});
  const ribbonLight=new THREE.MeshStandardMaterial({color:0xe6cb97,metalness:.35,roughness:.4});
  const group=new THREE.Group();scene.add(group);
  function box(parent,w,h,d,mat,x=0,y=0,z=0,r=.028){const m=new THREE.Mesh(roundedBox(w,h,d,Math.min(r,w/3,h/3,d/3)),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  box(group,1.6,.095,1.36,paper,0,-.51,0);
  box(group,1.6,1,.085,paper,0,0,.65);box(group,1.6,1,.085,paper,0,0,-.65);
  box(group,.085,1,1.22,paper,-.76,0);box(group,.085,1,1.22,paper,.76,0);
  box(group,1.42,.035,1.18,inner,0,-.44);
  // Separate thin interior walls make the opened box visibly hollow.
  box(group,1.42,.89,.015,inner,0,0,.6,.005);box(group,1.42,.89,.015,inner,0,0,-.6,.005);
  box(group,.016,.89,1.18,inner,-.704,0,0,.004);box(group,.016,.89,1.18,inner,.704,0,0,.004);
  box(group,.21,1.025,.018,ribbon,0,0,.698,.006);box(group,.21,1.025,.018,ribbon,0,0,-.698,.006);
  box(group,.018,1.025,.2,ribbon,-.808,0,0,.006);box(group,.018,1.025,.2,ribbon,.808,0,0,.006);
  const lid=new THREE.Group();lid.position.set(0,.55,-.69);group.add(lid);
  box(lid,1.72,.16,1.49,paper,0,.04,.69);
  box(lid,1.58,.024,1.35,inner,0,-.05,.69,.01);
  box(lid,.22,.012,1.5,ribbon,0,.127,.69,.004);box(lid,1.72,.012,.22,ribbon,0,.133,.69,.004);
  box(lid,.23,.18,.018,ribbon,0,.04,1.443,.004);box(lid,.018,.18,.22,ribbon,-.866,.04,.69,.004);box(lid,.018,.18,.22,ribbon,.866,.04,.69,.004);
  function ribbonLoop(side) {
    const vertices=[],indices=[],segments=56,width=.09;
    for(let i=0;i<=segments;i++){const t=i/segments*Math.PI*2;const x=side*(.085+.35*(1-Math.cos(t))*.5),y=.2+.15*Math.sin(t),z=.69+.1*Math.sin(t)*Math.cos(t);
      vertices.push(x,y,z-width,x,y,z+width);if(i<segments){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    const material=ribbon.clone();material.side=THREE.DoubleSide;const m=new THREE.Mesh(g,material);m.castShadow=true;lid.add(m);
  }
  ribbonLoop(-1);ribbonLoop(1);box(lid,.18,.14,.19,ribbonLight,0,.18,.69,.05);
  const letterTexture=canvasTexture(512,640,(ctx,w,h)=>{
    ctx.fillStyle='#f1e2c7';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#b69b7166';ctx.lineWidth=2;ctx.strokeRect(24,24,w-48,h-48);
    ctx.fillStyle='#877354';ctx.textAlign='center';ctx.font='18px Georgia';ctx.fillText('GỬI EM',w/2,105);
    ctx.fillStyle='#514030';ctx.font='36px Georgia';['Chúc mừng','sinh nhật','của bé be'].forEach((s,i)=>ctx.fillText(s,w/2,225+i*62));ctx.font='55px Georgia';ctx.fillStyle='#a27969';ctx.fillText('♡',w/2,485);
    for(let i=0;i<5000;i++){ctx.fillStyle='#89755108';ctx.fillRect(random()*w,random()*h,1,1);}
  });
  const letter=new THREE.Mesh(new THREE.BoxGeometry(.76,.97,.018),[inner,inner,inner,inner,new THREE.MeshStandardMaterial({map:letterTexture,roughness:.91}),inner]);
  letter.position.set(0,-.24,.1);letter.rotation.x=-Math.PI/2;letter.castShadow=true;group.add(letter);
  // A restrained floral detail inside the box, visible only after the lid rises.
  const petalMat=new THREE.MeshStandardMaterial({color:0xdcb4ac,roughness:.85,side:THREE.DoubleSide});
  for(let n=0;n<5;n++){
    const flower=new THREE.Group();flower.position.set((random()-.5)*1.05,-.25,(random()-.5)*.8);
    for(let i=0;i<5;i++){const petal=new THREE.Mesh(new THREE.SphereGeometry(.105,12,8),petalMat);petal.scale.set(.6,.3,1.2);petal.position.set(Math.sin(i*1.256)*.065,.01,Math.cos(i*1.256)*.065);petal.rotation.y=i*1.256;flower.add(petal);}group.add(flower);
  }
  const shadowTexture=canvasTexture(128,128,(ctx,w,h)=>{const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#0009');g.addColorStop(.5,'#0004');g.addColorStop(1,'#0000');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);});
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.6,2.7),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.58;group.add(shadow);
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.ShadowMaterial({opacity:.15}));plane.rotation.x=-Math.PI/2;plane.position.y=-.575;plane.receiveShadow=true;group.add(plane);
  const glow=new THREE.PointLight(0xffdaa0,0,3,2);glow.position.set(0,0,0);group.add(glow);
  const sparks=[];const sparkGeometry=new THREE.SphereGeometry(.008,6,4),sparkMat=new THREE.MeshBasicMaterial({color:0xffdb9c,transparent:true});
  for(let i=0;i<24;i++){const m=new THREE.Mesh(sparkGeometry,sparkMat.clone());m.position.set((random()-.5)*1.1,random()*.5,(random()-.5)*.8);group.add(m);sparks.push({mesh:m,seed:random()*5,x:m.position.x,z:m.position.z});}
  sparks.forEach(s=>{s.mesh.visible=false;});
  return {group,lid,letter,glow,sparks,grain,letterTexture,shadowTexture};
}
function lighting(scene,renderer) {
  scene.add(new THREE.HemisphereLight(0xf1e5d9,0x514b6c,.95));
  const key=new THREE.DirectionalLight(0xffedcf,3.2);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-3;key.shadow.camera.right=3;key.shadow.camera.top=3;key.shadow.camera.bottom=-3;key.shadow.camera.near=.5;key.shadow.camera.far=12;key.shadow.normalBias=.035;key.shadow.bias=-.0002;key.shadow.radius=3;scene.add(key);
  const fill=new THREE.DirectionalLight(0xb0c8ff,.8);fill.position.set(4,2,-3);scene.add(fill);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const environment=canvasTexture(256,128,(ctx,w,h)=>{
    const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#f3e8d9');g.addColorStop(.35,'#797f96');g.addColorStop(.55,'#e6ddd5');g.addColorStop(1,'#3e3541');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.fillStyle='#fff6e6';ctx.fillRect(w*.1,15,35,42);ctx.fillStyle='#afc3ed';ctx.fillRect(w*.65,20,30,25);
  });environment.mapping=THREE.EquirectangularReflectionMapping;scene.environment=environment;return environment;
}
function buildSky(scene) {
  const random=seededRandom(10092026);
  const count=6500,positions=[],sizes=[],phases=[],brightness=[],colors=[];
  const color=new THREE.Color();
  for(let i=0;i<count;i++){
    // Distant sphere: rotate the view rather than making stars fly past the viewer.
    const azimuth=random()*Math.PI*2,vertical=2*random()-1,radius=90;
    const horizon=Math.sqrt(1-vertical*vertical);positions.push(radius*horizon*Math.sin(azimuth),radius*vertical,-radius*horizon*Math.cos(azimuth));
    sizes.push(.85+Math.pow(random(),5)*5.8);phases.push(random()*6.28);brightness.push(.28+Math.pow(random(),2)*.72);
    const tint=random();color.set(tint>.9?0xf4d5aa:tint<.2?0xc6d9ff:0xe7ecf3);colors.push(color.r,color.g,color.b);
  }
  // A subtle concentration of tiny stars hints at a Milky Way, without loud nebula colors.
  for(let i=0;i<3200;i++){
    const a=random()*Math.PI*2,b=(random()+random()+random()-1.5)*.085;
    const v=new THREE.Vector3(Math.cos(a)*Math.cos(b),Math.sin(b),Math.sin(a)*Math.cos(b));v.applyAxisAngle(new THREE.Vector3(0,0,1),.58).multiplyScalar(91);
    positions.push(v.x,v.y,v.z);sizes.push(.65+random()*.9);phases.push(random()*6.28);brightness.push(.08+random()*.22);colors.push(.65,.71,.83);
  }
  function starsGeometry(p,s,phase,b,c){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('aSize',new THREE.Float32BufferAttribute(s,1));g.setAttribute('aPhase',new THREE.Float32BufferAttribute(phase,1));g.setAttribute('aBrightness',new THREE.Float32BufferAttribute(b,1));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return g;}
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,blending:THREE.AdditiveBlending,toneMapped:false,
    uniforms:{uTime:{value:0},uDpr:{value:1},uReveal:{value:1},uReduced:{value:0}},
    vertexShader:`attribute float aSize; attribute float aPhase; attribute float aBrightness;
      uniform float uDpr; varying vec3 vColor; varying float vPhase; varying float vBrightness;varying float vSize;
      void main(){vColor=color;vPhase=aPhase;vBrightness=aBrightness;vSize=aSize;vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=max(1.4,aSize*uDpr);}`,
    fragmentShader:`uniform float uTime;uniform float uReveal;uniform float uReduced;varying vec3 vColor;varying float vPhase;varying float vBrightness;varying float vSize;
      void main(){vec2 p=gl_PointCoord-.5;float d=length(p)*2.0;float core=exp(-d*d*9.0);float halo=exp(-d*d*3.8)*.32;float rays=(exp(-abs(p.x)*44.0)*exp(-abs(p.y)*10.0)+exp(-abs(p.y)*44.0)*exp(-abs(p.x)*10.0))*.12*smoothstep(4.5,7.5,vSize);float twinkle=mix(.79+.14*sin(uTime*.85+vPhase)+.07*sin(uTime*2.4+vPhase*2.0),1.0,uReduced);float a=(core+halo+rays)*vBrightness*twinkle*uReveal;gl_FragColor=vec4(vColor,a);
      #include <colorspace_fragment>
      }`
  });
  const field=new THREE.Points(starsGeometry(positions,sizes,phases,brightness,colors),material);scene.add(field);
  const heartPositions=[],heartColors=[],heartSizes=[],heartPhases=[],heartBright=[];
  for(let i=0;i<40;i++){const t=i/40*Math.PI*2;heartPositions.push(16*Math.sin(t)**3*.42,(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*.42,-25);heartColors.push(1,.89,.75);heartSizes.push(i%5===0?8:4.7);heartPhases.push(random()*6.28);heartBright.push(1);}
  const heartMaterial=material.clone();heartMaterial.uniforms.uReveal.value=0;
  const heart=new THREE.Points(starsGeometry(heartPositions,heartSizes,heartPhases,heartBright,heartColors),heartMaterial);scene.add(heart);
  const linePositions=[];for(let i=0;i<40;i++){linePositions.push(...heartPositions.slice(i*3,i*3+3),...heartPositions.slice(((i+1)%40)*3,((i+1)%40)*3+3));}
  const linesGeometry=new THREE.BufferGeometry();linesGeometry.setAttribute('position',new THREE.Float32BufferAttribute(linePositions,3));linesGeometry.setDrawRange(0,0);
  const lines=new THREE.LineSegments(linesGeometry,new THREE.LineBasicMaterial({color:0xb4c7e5,transparent:true,opacity:.36,depthWrite:false}));scene.add(lines);
  const hazeTexture=canvasTexture(1024,512,(ctx,w,h)=>{
    for(let i=0;i<450;i++){
      const x=random()*w,y=h*(.5+.2*Math.sin(x/w*Math.PI*2+.5))+(random()-.5)*55,r=15+random()*55;
      const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%4?'#b5bac607':'#e2d6c608');g.addColorStop(1,'#889cc000');ctx.fillStyle=g;ctx.save();ctx.translate(x,y);ctx.scale(1,.4);ctx.translate(-x,-y);ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
    }
    // Small dark lanes interrupt the galactic haze instead of a flat luminous strip.
    ctx.globalCompositeOperation='destination-out';for(let i=0;i<100;i++){const x=random()*w,y=h*(.5+.2*Math.sin(x/w*Math.PI*2+.5));const g=ctx.createRadialGradient(x,y,0,x,y,20);g.addColorStop(0,'#0007');g.addColorStop(1,'#0000');ctx.fillStyle=g;ctx.fillRect(x-20,y-20,40,40);}
  });
  const haze=new THREE.Mesh(new THREE.SphereGeometry(110,48,24),new THREE.MeshBasicMaterial({map:hazeTexture,side:THREE.BackSide,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));haze.rotation.y=.5;scene.add(haze);
  return {field,material,heart,heartMaterial,lines,haze};
}
function disposeScene(scene,renderer) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  scene.traverse(object=>{object.shadow?.dispose();if(object.geometry)geometries.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));});
  materials.forEach(m=>{Object.values(m).forEach(value=>{if(value?.isTexture)textures.add(value);});m.dispose();});
  if(scene.environment)textures.add(scene.environment);textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());renderer.dispose();renderer.forceContextLoss();
}
export function createScene({canvas,mode,reduced=false,onReveal}) {
  // iOS can drop the transparent WebGL layer above accelerated camera video after rotation.
  // Render the same 3D scene offscreen, then present its pixels in a regular transparent canvas.
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const renderCanvas=mode==='gift-box'&&isIOS?document.createElement('canvas'):canvas;
  const presenter=renderCanvas!==canvas?canvas.getContext('2d',{alpha:true}):null;
  canvas.dataset.presentation=presenter?'canvas2d':'webgl';
  const context=renderCanvas.getContext('webgl2',{alpha:true,antialias:true,depth:true,powerPreference:'default'});
  if(!context)throw new Error('WebGL2 unavailable');
  const renderer=new THREE.WebGLRenderer({canvas:renderCanvas,context,alpha:true,antialias:true,depth:true,precision:'highp',powerPreference:'default'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  const world=new THREE.Scene();const camera=new THREE.PerspectiveCamera(mode==='star-sky'?52:35,1,.05,150);
  if(mode!=='star-sky'){camera.position.set(0,1.7,5.7);camera.lookAt(0,.25,0);}
  let gift=null,sky=null;
  if(mode==='gift-box'){lighting(world,renderer);gift=buildGift(world);gift.group.rotation.y=-.3;gift.group.visible=false;}
  else if(mode==='star-sky')sky=buildSky(world);
  let active=false,disposed=false,frame=0,last=0,time=0,openTime=null,skyRevealTime=0,announced=false,placed=false;
  let yaw=0,pitch=0,orientationYaw=0,orientationPitch=0,night=true;
  let width=0,height=0,pixelRatio=renderer.getPixelRatio();
  const stage=canvas.parentElement;
  const raycaster=new THREE.Raycaster();
  function syncSurfaceSize() {
    // Match the displayed canvas, rather than its intrinsic dimensions or a stale observer entry.
    const rect=canvas.getBoundingClientRect(),w=Math.round(rect.width),h=Math.round(rect.height),dpr=Math.min(devicePixelRatio||1,2);
    if(!w || !h)return false;
    if(w===width && h===height && dpr===pixelRatio)return false;
    width=w;height=h;pixelRatio=dpr;
    renderer.setDrawingBufferSize(width,height,pixelRatio);camera.aspect=width/height;
    if(presenter){canvas.width=renderCanvas.width;canvas.height=renderCanvas.height;}
    if(gift){camera.fov=height<280?43:35;camera.position.z=Math.max(5.7,4.5/camera.aspect);camera.lookAt(0,.25,0);}
    if(sky){camera.fov=52;const aspectScale=Math.min(1,camera.aspect/.95);sky.heart.scale.setScalar(aspectScale);sky.lines.scale.setScalar(aspectScale);}
    camera.updateProjectionMatrix();
    return true;
  }
  function resize() {
    // Resizing clears the drawing buffer; repaint immediately even while the animation runs.
    if(syncSurfaceSize())renderFrame(0);
  }
  function renderFrame(dt) {
    // Safari's toolbar/orientation resize can arrive between ResizeObserver notifications.
    syncSurfaceSize();
    time+=dt;
    if(gift){
      if(placed && openTime===null){gift.group.rotation.y=-.3+(reduced?0:Math.sin(time*.25)*.065);}
      if(openTime!==null){const p=reduced?1:clamp((time-openTime)/2.5,0,1),lid=smooth(0,.68,p);gift.lid.rotation.x=-1.82*lid;const rise=smooth(.25,1,p);gift.letter.position.y=-.24+rise*1.7;gift.letter.position.z=.1+rise*.42;gift.letter.rotation.x=-Math.PI/2+rise*(Math.PI/2-.13);gift.glow.intensity=.45*rise;
        gift.sparks.forEach(s=>{s.mesh.visible=p>.25;s.mesh.position.y=-.05+((time*.16+s.seed)%1.25);s.mesh.position.x=s.x+Math.sin(time*.5+s.seed)*.035;s.mesh.material.opacity=(.5+.5*Math.sin(time+s.seed))*rise*.6;});
        if(p===1&&!announced){announced=true;onReveal?.();}}
    }
    if(sky){
      const t=reduced?10:time-skyRevealTime;sky.material.uniforms.uTime.value=reduced?0:time;sky.material.uniforms.uReveal.value=smooth(0,2,t);sky.material.uniforms.uDpr.value=renderer.getPixelRatio();sky.material.uniforms.uReduced.value=Number(reduced);
      sky.heartMaterial.uniforms.uTime.value=reduced?0:time;sky.heartMaterial.uniforms.uDpr.value=renderer.getPixelRatio();sky.heartMaterial.uniforms.uReveal.value=smooth(2,5,t);sky.heartMaterial.uniforms.uReduced.value=Number(reduced);sky.lines.geometry.setDrawRange(0,Math.floor(smooth(3,8,t)*40)*2);
      const targetYaw=clamp(yaw+orientationYaw,-1.1,1.1),targetPitch=clamp(pitch+orientationPitch,-.65,.65);
      camera.rotation.order='YXZ';camera.rotation.y=reduced?targetYaw:THREE.MathUtils.damp(camera.rotation.y,targetYaw,7,Math.max(dt,.001));camera.rotation.x=reduced?targetPitch:THREE.MathUtils.damp(camera.rotation.x,targetPitch,7,Math.max(dt,.001));
      sky.haze.material.opacity=(night ? .6 : .12)*smooth(0,3,t);
      if(t>=8.1&&!announced){announced=true;onReveal?.();}
      // Heart stays discoverable after looking around; a replay recenters the view.
    }
    renderer.render(world,camera);
    if(presenter){presenter.clearRect(0,0,canvas.width,canvas.height);presenter.drawImage(renderCanvas,0,0);}
  }
  function tick(now) {
    // Keep the opening duration independent of GPU frame rate; tab resumes reset last.
    if(!active || disposed)return;const dt=last?Math.max((now-last)/1000,0):0;last=now;renderFrame(dt);if(!reduced)frame=requestAnimationFrame(tick);
  }
  const observer=new ResizeObserver(resize);observer.observe(stage);resize();
  window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
  const contextLost=event=>{event.preventDefault();active=false;cancelAnimationFrame(frame);stage.dispatchEvent(new CustomEvent('anh-context-lost'));};renderCanvas.addEventListener('webglcontextlost',contextLost);
  return {
    setActive(value){active=value;last=0;cancelAnimationFrame(frame);if(value&&!disposed)frame=requestAnimationFrame(tick);},
    setReduced(value){reduced=value;if(active){cancelAnimationFrame(frame);frame=requestAnimationFrame(tick);}},
    setNight(value){night=value;stage.dataset.night=String(night);if(reduced)renderFrame(0);},
    setOrientation(y,p){orientationYaw=-y;orientationPitch=clamp(-p,-.65,.65);if(reduced)renderFrame(0);},
    pan(x,y){yaw=clamp(yaw-x*1.5,-1.1,1.1);pitch=clamp(pitch-y*1.1,-.65,.65);if(reduced)renderFrame(0);},
    place(point){if(!gift)return;placed=true;gift.group.visible=true;gift.group.position.x=point?clamp((point.x-.5)*2.4,-.7,.7):0;if(reduced)renderFrame(0);},
    open(immediate=false){if(!gift || openTime!==null)return;openTime=time-(immediate?3:0);gift.sparks.forEach(s=>{s.mesh.visible=true;});if(reduced)renderFrame(0);},
    reveal(immediate=false){if(!sky)return;skyRevealTime=time-(immediate?10:3);yaw=pitch=orientationYaw=orientationPitch=0;if(reduced)renderFrame(0);},
    hitGift(x,y){if(!gift)return false;const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),camera);return raycaster.intersectObject(gift.group,true).length>0;},
    reset(){announced=false;openTime=null;placed=false;skyRevealTime=time;yaw=pitch=orientationYaw=orientationPitch=0;if(gift){gift.group.visible=false;gift.lid.rotation.x=0;gift.letter.position.set(0,-.24,.1);gift.letter.rotation.x=-Math.PI/2;gift.glow.intensity=0;gift.sparks.forEach(s=>{s.mesh.visible=false;});}if(active){cancelAnimationFrame(frame);frame=requestAnimationFrame(tick);}},
    dispose(){disposed=true;active=false;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);renderCanvas.removeEventListener('webglcontextlost',contextLost);disposeScene(world,renderer);}
  };
}

export function drawGiftPreview(target) {
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');target.appendChild(canvas);
  if(!canvas.getContext('webgl2',{alpha:true,antialias:true})){canvas.remove();return ()=>{};}
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,30);camera.position.set(0,2.1,5.6);camera.lookAt(0,.15,0);lighting(scene,renderer);const gift=buildGift(scene);gift.group.rotation.y=-.4;gift.sparks.forEach(s=>s.mesh.visible=false);
  const draw=()=>{const w=target.clientWidth,h=target.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);};
  const observer=new ResizeObserver(draw);observer.observe(target);draw();
  const art=target.querySelector('.anh-preview-gift');if(art)art.hidden=true;
  return ()=>{observer.disconnect();disposeScene(scene,renderer);canvas.remove();if(art)art.hidden=false;};
}
