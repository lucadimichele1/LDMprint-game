/* =====================================================================
   RENDERER E SCENA
   ===================================================================== */
const gameEl = $('#game');
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
gameEl.prepend(renderer.domElement);
const canvas = renderer.domElement;
const scene = new THREE.Scene();
const SKY = 0x8cc8ff;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 48, 96);
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 300);
addEventListener('resize', ()=>{ renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); });

/* ---------- texture pixel-art procedurali ---------- */
function mkCanvas(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
const MAX_ANI = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
function texFrom(c, repeat){
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.anisotropy = MAX_ANI;
  if (repeat){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function pixTex(w,h,draw,repeat){ const c=mkCanvas(w,h); draw(c.getContext('2d'),w,h); return texFrom(c,repeat); }
function rgbShift(hex,a){
  const n=parseInt(hex.slice(1),16);
  const r=clamp(((n>>16)&255)+a*255,0,255)|0, g=clamp(((n>>8)&255)+a*255,0,255)|0, b=clamp((n&255)+a*255,0,255)|0;
  return `rgb(${r},${g},${b})`;
}
function noise(g,w,h,base,v){ for(let y=0;y<h;y++) for(let x=0;x<w;x++){ g.fillStyle=rgbShift(base,(TR()-.5)*v); g.fillRect(x,y,1,1); } }
const drawGrass = (g,w,h)=>noise(g,w,h,'#63a83c',.16);
const drawPlanks = (g,w,h)=>{ noise(g,w,h,'#b58b52',.08); g.fillStyle='#735431'; [3,7,11,15].forEach(y=>g.fillRect(0,y,w,1)); [[4,0],[12,4],[2,8],[9,12]].forEach(([x,y])=>g.fillRect(x,y,1,3)); };
const drawGravel = (g,w,h)=>noise(g,w,h,'#8e877f',.26);

const TX = {
  grassSide: pixTex(16,16,(g,w,h)=>{ noise(g,w,h,'#86593a',.14); for(let x=0;x<w;x++){ const d=2+(TR()*3|0); for(let y=0;y<d;y++){ g.fillStyle=rgbShift('#63a83c',(TR()-.5)*.16); g.fillRect(x,y,1,1);} } }),
  grassTop: pixTex(16,16,drawGrass),
  dirt: pixTex(16,16,(g,w,h)=>noise(g,w,h,'#86593a',.14)),
  logSide: pixTex(16,16,(g,w,h)=>{ noise(g,w,h,'#6b4f2e',.1); g.fillStyle='#4b3620'; for(let i=0;i<8;i++) g.fillRect(TR()*16|0,TR()*10|0,1,4+(TR()*5|0)); }),
  logTop: pixTex(16,16,(g,w,h)=>{ noise(g,w,h,'#a98352',.08); g.strokeStyle='#7b5a35'; g.lineWidth=1; for(let r=2;r<8;r+=2) g.strokeRect(8-r+.5,8-r+.5,r*2-1,r*2-1); g.strokeStyle='#5b4226'; g.strokeRect(.5,.5,15,15); }),
  leaves: pixTex(16,16,(g,w,h)=>{ noise(g,w,h,'#3f8a2a',.24); g.fillStyle='#2a641a'; for(let i=0;i<22;i++) g.fillRect(TR()*16|0,TR()*16|0,1,1); }),
  stoneBrick: pixTex(16,16,(g,w,h)=>{ noise(g,w,h,'#8f8f8f',.1); g.fillStyle='#5e5e5e'; g.fillRect(0,7,16,1); g.fillRect(0,15,16,1); g.fillRect(7,0,1,7); g.fillRect(15,0,1,7); g.fillRect(3,8,1,7); g.fillRect(11,8,1,7); }),
  plaster: pixTex(16,16,(g,w,h)=>{ noise(g,w,h,'#f2c230',.07); g.fillStyle='rgba(150,100,0,.25)'; g.fillRect(0,15,16,1); }),
  roof: pixTex(16,16,(g,w,h)=>{ noise(g,w,h,'#b83a2e',.1); g.fillStyle='#8a2a21'; [3,7,11,15].forEach(y=>g.fillRect(0,y,w,1)); }),
  chest: pixTex(16,16,(g,w,h)=>{ noise(g,w,h,'#a0692b',.08); g.fillStyle='#5a3a17'; g.fillRect(0,0,16,1); g.fillRect(0,15,16,1); g.fillRect(0,0,1,16); g.fillRect(15,0,1,16); g.fillStyle='#7a4f20'; [5,10].forEach(y=>g.fillRect(1,y,14,1)); }),
  plate: pixTex(16,16,(g,w,h)=>{ g.fillStyle='#2a2d33'; g.fillRect(0,0,w,h); g.fillStyle='#3d434d'; for(let i=0;i<16;i+=4){ g.fillRect(i,0,1,16); g.fillRect(0,i,16,1);} }),
  cardboard: pixTex(16,16,(g,w,h)=>{ noise(g,w,h,'#c49a61',.08); g.fillStyle='#e4d6b4'; g.fillRect(7,0,2,16); }),
  shelf: pixTex(16,16,(g,w,h)=>{ noise(g,w,h,'#b58b52',.08); const cols=['#e84393','#2ec4b6','#ff7a1a','#f1f2f6','#3867d6','#20bf6b']; g.fillStyle='#4a331b'; g.fillRect(1,1,14,6); g.fillRect(1,9,14,6); for(let r=0;r<2;r++) for(let k=0;k<3;k++){ const x=2+Math.floor(k*4.5), y=2+r*8; g.fillStyle=cols[(r*3+k)%cols.length]; g.fillRect(x,y,4,4); g.fillStyle='#222'; g.fillRect(x+1,y+1,2,2);} }),
  glow: pixTex(16,16,(g,w,h)=>{ noise(g,w,h,'#f6d27a',.14); g.fillStyle='#fff3c4'; for(let i=0;i<14;i++) g.fillRect(TR()*16|0,TR()*16|0,2,2); }),
  blueprint: pixTex(16,20,(g,w,h)=>{ g.fillStyle='#1d5fbf'; g.fillRect(0,0,w,h); g.fillStyle='#bfe0ff'; g.fillRect(0,0,w,1); g.fillRect(0,h-1,w,1); g.fillRect(0,0,1,h); g.fillRect(w-1,0,1,h); g.fillRect(3,4,10,1); g.fillRect(3,4,1,8); g.fillRect(12,4,1,8); g.fillRect(3,11,10,1); g.fillRect(5,14,6,1); g.fillRect(5,16,4,1); g.fillStyle='#ffd23f'; g.fillRect(6,7,4,2); }),
};
// schermo del computer
const scrC = mkCanvas(128,80); {
  const sg = scrC.getContext('2d');
  sg.fillStyle='#0d1b2a'; sg.fillRect(0,0,128,80);
  sg.fillStyle='#16324f'; for(let x=0;x<128;x+=8) sg.fillRect(x,16,1,64); for(let y=16;y<80;y+=8) sg.fillRect(0,y,128,1);
  sg.fillStyle='#1c2733'; sg.fillRect(0,0,128,14);
  sg.fillStyle='#ff8a1f'; sg.font='bold 11px monospace'; sg.fillText('LDM CAD',4,11);
  sg.strokeStyle='#ff9a1f'; sg.lineWidth=2; sg.beginPath();
  sg.moveTo(64,24); sg.lineTo(86,36); sg.lineTo(86,60); sg.lineTo(64,72); sg.lineTo(42,60); sg.lineTo(42,36); sg.closePath();
  sg.moveTo(42,36); sg.lineTo(64,48); sg.lineTo(86,36); sg.moveTo(64,48); sg.lineTo(64,72); sg.stroke();
}
TX.screen = texFrom(scrC); TX.screen.minFilter = THREE.LinearFilter;

const L = o => new THREE.MeshLambertMaterial(o);
const sideTop = (side, top, bottom) => [L({map:side}),L({map:side}),L({map:top}),L({map:bottom||top}),L({map:side}),L({map:side})];
const MAT = {
  grass: sideTop(TX.grassSide, TX.grassTop, TX.dirt),
  log: sideTop(TX.logSide, TX.logTop),
  leaves: L({map:TX.leaves}),
  stoneBrick: L({map:TX.stoneBrick}),
  planks: L({map:TX.planks = pixTex(16,16,drawPlanks)}),
  plaster: L({map:TX.plaster}),
  roof: L({map:TX.roof}),
  chest: L({map:TX.chest}),
  dark: L({color:0x2b2e33}),
  panel: L({color:0x3a3e45}),
  glass: L({color:0xbfe3ff, transparent:true, opacity:.2, depthWrite:false}),
  plate: L({map:TX.plate}),
  ams: L({color:0xd9dde3}),
  toolhead: L({color:0xeeeeee}),
  ledOff: L({color:0x444444}),
  ledBusy: L({color:0xff9a1f, emissive:0xff7a00, emissiveIntensity:.9}),
  ledDone: L({color:0x55ff55, emissive:0x22cc22, emissiveIntensity:.9}),
  metal: L({color:0x9aa0a6}),
  black: L({color:0x17191c}),
  white: L({color:0xf4f4f4}),
  red: L({color:0xd63a2e}),
  window: L({color:0x9fd3ff, emissive:0x1d3550}),
  door: L({color:0x5a3b1e}),
  cardboard: L({map:TX.cardboard}),
  shelf: L({map:TX.shelf}),
  glow: L({map:TX.glow, emissive:0xffcf70, emissiveIntensity:.7}),
  screen: L({map:TX.screen, emissive:0xffffff, emissiveMap:TX.screen}),
  pcTower: L({color:0x22262b}),
  orangeGlow: L({color:0xff8a1f, emissive:0xff6a00, emissiveIntensity:.8}),
  blueprint: L({map:TX.blueprint, emissive:0x1d4f9f, emissiveIntensity:.5}),
};
