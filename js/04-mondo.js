/* ---------- collisioni ---------- */
const staticCols = [];
let colliders = [];
const addCol = (x0,x1,z0,z1,tag) => staticCols.push({x0,x1,z0,z1,tag});
/* volumi solidi per la telecamera (evita che entri negli edifici) */
const camBoxes = [];
let hillH = null;
const addCam = (x0,x1,y0,y1,z0,z1) => camBoxes.push({x0,x1,y0,y1,z0,z1});
function camBlocked(x,y,z){
  if (y < .25) return true;
  if (hillH && Math.max(Math.abs(x),Math.abs(z)) > 54 && y < hillH(Math.floor(x), Math.floor(z)) + .2) return true;
  for (const b of camBoxes) if (x>b.x0 && x<b.x1 && y>b.y0 && y<b.y1 && z>b.z0 && z<b.z1) return true;
  return false;
}
function blockedAt(x,z,r){
  if (Math.abs(x)>CONFIG.WORLD || Math.abs(z)>CONFIG.WORLD) return true;
  for (const b of colliders){ if (b.off || (b.door && slideDoor.open > .72)) continue; if (x+r>b.x0 && x-r<b.x1 && z+r>b.z0 && z-r<b.z1) return true; }
  return false;
}
function reserved(x,z,m=0){
  return (x>-15-m && x<15+m && z>-13-m && z<13+m) ||
         (x>-23-m && x<-1+m && z>-23-m && z<-9+m) ||
         (x>11-m && x<36+m && z>-16-m && z<12+m) ||
         (x>5.5-m && x<11-m+1 && z>15-m && z<21+m) ||
         (x>-11-m && x<-7+m && z>14-m && z<19+m) ||
         (Math.abs(x)<3.5+m && z>9-m && z<40+m) ||
         (x>-9-m && x<9+m && z>34-m && z<51+m);
}

/* =====================================================================
   MONDO
   ===================================================================== */
// prato
{
  const gt = pixTex(16,16,drawGrass,[220,220]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220,220), L({map:gt}));
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);
}
// laboratorio LDMprint: pavimento in marmo bianco riflettente + muri bianchi
const WALL_H = 4;
function marbleCanvas(S){
  const c = mkCanvas(S,S), g = c.getContext('2d'), img = g.createImageData(S,S), d = img.data;
  const R = mulberry32(2024), N = 64, grid = new Float32Array(N*N);
  for (let i=0;i<grid.length;i++) grid[i] = R();
  const at = (x,y)=>grid[(((y%N)+N)%N)*N + (((x%N)+N)%N)];
  const vn = (x,y)=>{
    const xi = Math.floor(x), yi = Math.floor(y), xf = x-xi, yf = y-yi;
    const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
    const a = at(xi,yi), b = at(xi+1,yi), cc = at(xi,yi+1), dd = at(xi+1,yi+1);
    return a + (b-a)*u + (cc-a)*v + (a-b-cc+dd)*u*v;
  };
  const fbm = (x,y)=>{ let s = 0, a = .5; for (let o=0;o<5;o++){ s += a*vn(x,y); x *= 2; y *= 2; a *= .5; } return s; };
  const T = S/2, angs = [.6,-.45,1.15,.2];
  for (let y=0;y<S;y++) for (let x=0;x<S;x++){
    const tid = Math.floor(x/T) + 2*Math.floor(y/T), ang = angs[tid];
    const nx = x/T*3 + tid*13.7, ny = y/T*3 + tid*7.3;
    const n = fbm(nx, ny);
    const dc = (x*Math.cos(ang) + y*Math.sin(ang))/T*2.2;
    const vein = Math.pow(1 - Math.abs(Math.sin((dc + n*4.2)*Math.PI)), 10);
    const fine = Math.pow(1 - Math.abs(Math.sin((dc*2.6 + fbm(nx*2+5, ny*2)*5.5)*Math.PI)), 34);
    let v = 243 + (n-.5)*14 - vein*36 - fine*14;
    if (x % T < 1 || y % T < 1) v -= 34;                                    // fuga tra le piastrelle
    else if (x % T < 2 || y % T < 2) v -= 8;
    const i = (y*S + x)*4;
    d[i] = v - 1; d[i+1] = v; d[i+2] = v + 2; d[i+3] = 255;
  }
  g.putImageData(img,0,0);
  return c;
}
const marbleTex = new THREE.CanvasTexture(marbleCanvas(512));
marbleTex.wrapS = marbleTex.wrapT = THREE.RepeatWrapping;
marbleTex.repeat.set(6, 5);                       // piastrelle da 2 m
marbleTex.anisotropy = MAX_ANI;

// specchio planare (tecnica del Reflector di three.js) per riflessi leggeri sul pavimento
const mirror = {
  rt: new THREE.WebGLRenderTarget(256, 256, {minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, format:THREE.RGBAFormat}),
  cam: new THREE.PerspectiveCamera(),
  tm: new THREE.Matrix4(),
  on: {value:0}, texel: {value:new THREE.Vector2(1/256, 1/256)},
  enabled: true, scale: .5,
  bg: new THREE.Color(0xcfd0cf),
};
const floorMat = new THREE.MeshStandardMaterial({map:marbleTex, color:0x959593, roughness:.22, metalness:0});
const labFloor = new THREE.Mesh(new THREE.PlaneGeometry(24,20), floorMat);
labFloor.rotation.x = -Math.PI/2; labFloor.position.y = .015; labFloor.receiveShadow = true; scene.add(labFloor);

function resizeMirror(){
  const s = renderer.getDrawingBufferSize(new THREE.Vector2());
  const w = Math.max(64, Math.round(s.x*mirror.scale)), h = Math.max(64, Math.round(s.y*mirror.scale));
  mirror.rt.setSize(w, h); mirror.texel.value.set(1/w, 1/h);
}
resizeMirror();
addEventListener('resize', resizeMirror);
const MV = {rp:new THREE.Vector3(), cp:new THREE.Vector3(), rot:new THREE.Matrix4(), n:new THREE.Vector3(), view:new THREE.Vector3(),
  look:new THREE.Vector3(), target:new THREE.Vector3(), plane:new THREE.Plane(), clip:new THREE.Vector4(), q:new THREE.Vector4(),
  frustum:new THREE.Frustum(), pm:new THREE.Matrix4(), box:new THREE.Box3(new THREE.Vector3(-21,0,-20), new THREE.Vector3(33,.05,10))};
function updateMirror(){
  if (!mirror.enabled){ mirror.on.value = 0; return; }
  camera.updateMatrixWorld();
  MV.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  MV.frustum.setFromProjectionMatrix(MV.pm);
  if (!MV.frustum.intersectsBox(MV.box)) return;             // pavimento fuori vista: niente secondo rendering
  labFloor.updateMatrixWorld();
  const {rp, cp, rot, n, view, look, target, plane, clip, q} = MV, vc = mirror.cam;
  rp.setFromMatrixPosition(labFloor.matrixWorld);
  cp.setFromMatrixPosition(camera.matrixWorld);
  rot.extractRotation(labFloor.matrixWorld);
  n.set(0,0,1).applyMatrix4(rot);
  view.subVectors(rp, cp);
  if (view.dot(n) > 0) return;
  view.reflect(n).negate().add(rp);
  rot.extractRotation(camera.matrixWorld);
  look.set(0,0,-1).applyMatrix4(rot).add(cp);
  target.subVectors(rp, look).reflect(n).negate().add(rp);
  vc.position.copy(view);
  vc.up.set(0,1,0).applyMatrix4(rot).reflect(n);
  vc.lookAt(target);
  vc.near = camera.near; vc.far = camera.far;
  vc.updateMatrixWorld();
  vc.projectionMatrix.copy(camera.projectionMatrix);
  mirror.tm.set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1);
  mirror.tm.multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);
  // piano di taglio obliquo: nel riflesso non compare nulla che stia sotto il pavimento
  plane.setFromNormalAndCoplanarPoint(n, rp).applyMatrix4(vc.matrixWorldInverse);
  clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
  const e = vc.projectionMatrix.elements;
  q.set((Math.sign(clip.x) + e[8]) / e[0], (Math.sign(clip.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
  clip.multiplyScalar(2 / clip.dot(q));
  e[2] = clip.x; e[6] = clip.y; e[10] = clip.z + 1 - .003; e[14] = clip.w;
  const bg = scene.background, auto = renderer.shadowMap.autoUpdate;
  labFloor.visible = false; officeFloor.visible = false; if (officeRefs.farmFloor) officeRefs.farmFloor.visible = false; scene.background = mirror.bg; renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(mirror.rt);
  renderer.clear();
  renderer.render(scene, vc);
  renderer.setRenderTarget(null);
  renderer.shadowMap.autoUpdate = auto; scene.background = bg; labFloor.visible = true; officeFloor.visible = true; if (officeRefs.farmFloor) officeRefs.farmFloor.visible = true;
  mirror.on.value = 1;
}

// insegne (canvas)
const boardRedraws = [];
function makeBoard(w,h,draw){
  const c = mkCanvas(512, Math.round(512*h/w));
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
  const redraw = ()=>{ const g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height); draw(g,c.width,c.height); t.needsUpdate = true; };
  redraw(); boardRedraws.push(redraw);
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h), L({map:t, emissive:0x333333}));
}
{
  box(7.4,1.7,.2,MAT.planks,0,3.2,11.02);
  const sign = makeBoard(7,1.6,(g,w,h)=>{
    g.fillStyle='#1b1b1f'; g.fillRect(0,0,w,h);
    g.fillStyle='#ff8a1f'; g.fillRect(0,0,w,6); g.fillRect(0,h-6,w,6);
    g.textAlign='center'; g.textBaseline='middle';
    let cx = w/2;
    if (logoImg.naturalWidth){ const lh = h-24, lw = lh*LOGO_AR; g.drawImage(logoImg, 16, 12, lw, lh); cx = 16 + lw + (w - 16 - lw)/2; }
    const room = (w - cx) * 2 - 24;
    const fit = (txt, size, fam) => { let f = size; do { g.font = `${f}px ${fam}`; } while (g.measureText(txt).width > room && --f > 10); };
    fit('LDMprint', 36, '"Press Start 2P", monospace');
    g.fillStyle='#6b3300'; g.fillText('LDMprint',cx+4,h*.42+4);
    g.fillStyle='#ff8a1f'; g.fillText('LDMprint',cx,h*.42);
    const sub = 'stampa 3D · design · produzione';
    fit(sub, 24, 'VT323, monospace');
    g.fillStyle='#e8e8e8'; g.fillText(sub,cx,h*.8);
  });
  sign.position.set(0,3.2,11.13); scene.add(sign);
  onLogo(()=>boardRedraws.forEach(f=>f()));
  addCam(-3.8,3.8,2.3,4.1,10.8,11.3);
}
// sentiero, lampioni
{
  const pt = pixTex(16,16,drawGravel,[2,29]);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2,29), L({map:pt}));
  path.rotation.x = -Math.PI/2; path.position.set(0,.02,25.5); path.receiveShadow = true; scene.add(path);
  const posts = [];
  for (const z of [15,23,31]) for (const x of [-2,1]) { posts.push([x,0,z],[x,1,z]); addCol(x+.3,x+.7,z+.3,z+.7); }
  const fence = new THREE.InstancedMesh(new THREE.BoxGeometry(.25,1,.25), MAT.log, posts.length);
  const m = new THREE.Matrix4(); posts.forEach((p,i)=>{ m.makeTranslation(p[0]+.5,p[1]+.5,p[2]+.5); fence.setMatrixAt(i,m); });
  fence.castShadow = true; fence.frustumCulled = false; scene.add(fence);
  const lamps = []; for (const z of [15,23,31]) for (const x of [-2,1]) lamps.push([x,2,z]);
  const lm = new THREE.InstancedMesh(new THREE.BoxGeometry(.5,.5,.5), MAT.glow, lamps.length);
  lamps.forEach((p,i)=>{ m.makeTranslation(p[0]+.5,p[1]+.25,p[2]+.5); lm.setMatrixAt(i,m); });
  lm.frustumCulled = false; scene.add(lm);
}
// Ufficio Postale
const POST = {x:0, z:38.9};
{
  box(10,4.5,8,MAT.plaster,0,2.25,44);
  box(11,.6,9,MAT.roof,0,4.8,44);
  box(9,.5,7,MAT.roof,0,5.35,44);
  box(1.6,2.5,.1,MAT.door,0,1.25,39.97);
  box(1.6,1.2,.08,MAT.window,-3,2.1,39.97);
  box(1.6,1.2,.08,MAT.window,3,2.1,39.97);
  box(.6,1.1,.6,MAT.red,2.8,.55,39.2);
  box(.66,.12,.66,MAT.red,2.8,1.16,39.2);
  addCol(-5,5,40,48); addCol(2.5,3.1,38.9,39.5);
  addCam(-5.6,5.6,0,5.8,39.4,48.6);
  const ps = makeBoard(8,1.1,(g,w,h)=>{
    g.fillStyle='#f2c230'; g.fillRect(0,0,w,h);
    g.fillStyle='#1d3f8f'; g.fillRect(0,0,w,5); g.fillRect(0,h-5,w,5);
    g.textAlign='center'; g.textBaseline='middle'; g.font='30px "Press Start 2P", monospace';
    g.fillStyle='#1d3f8f'; g.fillText('UFFICIO POSTALE',w/2,h/2+2);
  });
  ps.rotation.y = Math.PI; ps.position.set(0,3.55,39.93); scene.add(ps);
}
// alberi
{
  const spots = [], logs = [], leaves = [];
  for (let t=0; spots.length<48 && t<3000; t++){
    const x = Math.floor((WR()*2-1)*50), z = Math.floor((WR()*2-1)*50);
    if (reserved(x+.5,z+.5,3) || (x > 2 && x < 25 && z > 10 && z < 34)) continue;
    if (spots.some(s=>Math.abs(s.x-x)<5 && Math.abs(s.z-z)<5)) continue;
    spots.push({x,z});
  }
  for (const s of spots){
    const h = 4 + (WR()*2|0);
    for (let y=0;y<h;y++) logs.push([s.x,y,s.z]);
    for (let y=h-2;y<h;y++) for (let dx=-2;dx<=2;dx++) for (let dz=-2;dz<=2;dz++){
      if (dx===0 && dz===0) continue;
      if (Math.abs(dx)===2 && Math.abs(dz)===2 && WR()<.7) continue;
      leaves.push([s.x+dx,y,s.z+dz]);
    }
    for (let dx=-1;dx<=1;dx++) for (let dz=-1;dz<=1;dz++){
      if (Math.abs(dx)+Math.abs(dz)===2 && WR()<.5) continue;
      leaves.push([s.x+dx,h,s.z+dz]);
    }
    leaves.push([s.x,h+1,s.z]);
    addCol(s.x,s.x+1,s.z,s.z+1);
    addCam(s.x-.1,s.x+1.1,0,h,s.z-.1,s.z+1.1);
    addCam(s.x-2.1,s.x+3.1,h-2,h+2.1,s.z-2.1,s.z+3.1);
  }
  instBlocks(logs, MAT.log); instBlocks(leaves, MAT.leaves);
}
// fiori
{
  const n = 140, pos = [];
  for (let t=0; pos.length<n && t<3000; t++){
    const x=(WR()*2-1)*50, z=(WR()*2-1)*50;
    if (reserved(x,z,.5)) continue; pos.push([x,z]);
  }
  const stems = new THREE.InstancedMesh(new THREE.BoxGeometry(.06,.36,.06), L({color:0x2f7d1f}), pos.length);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(.18,.14,.18), L({color:0xffffff}), pos.length);
  const m = new THREE.Matrix4(), cols = [0xff4d4d,0xffe14d,0xffffff,0x6fa8ff,0xff8ad8,0xff9f40];
  const col = new THREE.Color();
  pos.forEach(([x,z],i)=>{
    m.makeTranslation(x,.18,z); stems.setMatrixAt(i,m);
    m.makeTranslation(x,.42,z); heads.setMatrixAt(i,m);
    col.setHex(cols[i%cols.length]); heads.setColorAt(i,col);
  });
  stems.frustumCulled = heads.frustumCulled = false;
  scene.add(stems, heads);
}
// colline a blocchi ai bordi
{
  const inner = 55, outer = 72;
  const H = (x,z)=>{
    const d = Math.max(Math.abs(x+.5), Math.abs(z+.5));
    if (d < inner) return 0;
    const n = Math.sin(x*.19)*1.3 + Math.cos(z*.17)*1.3 + Math.sin((x+z)*.09)*1.1 + Math.cos((x-z)*.23)*.6;
    return clamp(Math.floor(2.5 + (d-inner)*.2 + n), 1, 10);
  };
  const list = [];
  for (let x=-outer; x<outer; x++) for (let z=-outer; z<outer; z++){
    const h = H(x,z); if (!h) continue;
    const lo = Math.min(h, H(x+1,z), H(x-1,z), H(x,z+1), H(x,z-1));
    for (let y=Math.min(lo,h-1); y<h; y++) list.push([x,y,z]);
  }
  instBlocks(list, MAT.grass);
  hillH = H;
}
// nuvole
const clouds = [];
{
  const cm = L({color:0xffffff, transparent:true, opacity:.92});
  for (let i=0;i<16;i++){
    const g = new THREE.Group();
    const w = 6+WR()*10, d = 4+WR()*7;
    g.add(new THREE.Mesh(new THREE.BoxGeometry(w,1.2,d), cm));
    const b = new THREE.Mesh(new THREE.BoxGeometry(w*.6,1.2,d*.6), cm); b.position.set(w*.2,.2,d*.3); g.add(b);
    g.position.set((WR()*2-1)*110, 38+WR()*8, (WR()*2-1)*110);
    scene.add(g); clouds.push(g);
  }
}
// luci
const hemi = new THREE.HemisphereLight(0xe2f2ff, 0x5b7a3a, .72); scene.add(hemi);
const ambient = new THREE.AmbientLight(0xffffff, .22); scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff2d8, .85);
sun.castShadow = true; sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera, {left:-34,right:34,top:34,bottom:-34,near:1,far:130});
sun.shadow.bias = -0.0006;
scene.add(sun); scene.add(sun.target);
