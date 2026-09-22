/* =====================================================================
   STAZIONI DEL LABORATORIO
   ===================================================================== */
const ST = {
  computer: {x:-8, z:-19.25},
  pack: {x:-11.5, z:4},
  label: {x:-11.5, z:7.5},
  filament: {x:11.5, z:6},
};
// casse in tre zone: vicino all'imballaggio (spedizioni), accanto all'ingresso della farm e nella farm (operatori)
const CHEST_SLOTS_POS = [
  ...[-6,-4.9,-3.8,-2.7,-1.6,-0.5,-7.1].map(z=>({x:-11.5, z, r:Math.PI/2, zone:'ship'})),
  ...[-0.8,0.3,1.4,2.5].map(z=>({x:11.5, z, r:-Math.PI/2, zone:'mid'})),
  ...[0,1,2,3,4,5,6,7,8].map(k=>({x:32.4, z:-0.5 + k*1.1, r:-Math.PI/2, zone:'farm'})),
];

// etichette fluttuanti
const allSprites = [];
function makeTextSprite(text, color, w=2.6){
  const c = mkCanvas(512,96);
  const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false}));
  sp.scale.set(w, w*96/512, 1);
  sp.userData = {c, tex, last:null};
  setSpriteText(sp, text, color); allSprites.push(sp);
  return sp;
}
// cartellino fisso da parete (stessa interfaccia delle scritte fluttuanti)
function makeWallTag(text, color='#ffffff', w=1.4){
  const c = mkCanvas(512,96);
  const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter; tex.anisotropy = MAX_ANI;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w*96/512),
    new THREE.MeshStandardMaterial({map:tex, roughness:.45, metalness:.25, emissive:0xffffff, emissiveMap:tex, emissiveIntensity:.3}));
  m.receiveShadow = true;
  m.userData = {c, tex, last:null, plate:true};
  setSpriteText(m, text, color); allSprites.push(m);
  return m;
}
function setSpriteText(sp, text, color='#ffffff'){
  const key = text + '|' + color;
  if (sp.userData.last === key) return;
  sp.userData.last = key; sp.userData.text = text; sp.userData.color = color;
  const {c, tex} = sp.userData, g = c.getContext('2d');
  g.clearRect(0,0,c.width,c.height);
  const plate = sp.userData.plate, maxW = plate ? 430 : 480;
  let size = plate ? 50 : 56; g.font = `${size}px VT323, monospace`;
  let tw = g.measureText(text).width;
  if (tw > maxW){ size = Math.floor(size*maxW/tw); g.font = `${size}px VT323, monospace`; tw = g.measureText(text).width; }
  if (plate){
    const gr = g.createLinearGradient(0,0,0,96); gr.addColorStop(0,'#252c38'); gr.addColorStop(1,'#11151c');
    g.fillStyle = gr; g.fillRect(0,0,512,96);
    g.strokeStyle = '#9aa6b8'; g.lineWidth = 6; g.strokeRect(3,3,506,90);
    g.fillStyle = '#b8c0cc';
    for (const [x,y] of [[20,20],[492,20],[20,76],[492,76]]){ g.beginPath(); g.arc(x,y,5,0,Math.PI*2); g.fill(); }
  } else {
    const bw = Math.min(510, tw + 28);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect((512-bw)/2, 14, bw, 68);
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#1b1b1b'; g.fillText(text, 259, 51);
  g.fillStyle = color; g.fillText(text, 256, 48);
  tex.needsUpdate = true;
}
function redrawAllText(){
  allSprites.forEach(s=>{ const t=s.userData.text, c=s.userData.color; s.userData.last=null; setSpriteText(s,t,c); });
  boardRedraws.forEach(f=>f());
}
if (document.fonts && document.fonts.load){
  Promise.all([document.fonts.load('40px VT323'), document.fonts.load('20px "Press Start 2P"')]).then(redrawAllText).catch(()=>{});
}

// muri bianchi intonacati + UFFICIO collegato al laboratorio
const OFFICE = {x0:-12, x1:-4, z0:-20, z1:-11};            // interno dell'ufficio
const DOOR_B = {x0:-10, x1:-7.6, cx:-8.8, z:-10.5, h:2.4};  // porta scorrevole tra laboratorio e ufficio
const slideDoor = {open:0, target:0, L:null, R:null, led:null, col:null};
const serverLeds = [];
const officeRefs = {};
{
  const pc = mkCanvas(256,256), g = pc.getContext('2d');
  g.fillStyle = '#f6f5f1'; g.fillRect(0,0,256,256);
  for (let i=0;i<5000;i++){ g.fillStyle = `rgba(${TR()<.5?'120,115,105':'255,255,255'},${TR()*.05})`; g.fillRect(TR()*256|0, TR()*256|0, 2, 2); }
  const plaster = new THREE.CanvasTexture(pc);
  plaster.wrapS = plaster.wrapT = THREE.RepeatWrapping; plaster.repeat.set(6, 1.5); plaster.anisotropy = MAX_ANI;
  const wallMat = new THREE.MeshStandardMaterial({color:0xf4f3f0, map:plaster, roughness:.95, emissive:0x2a2a28});
  const trimMat = new THREE.MeshStandardMaterial({color:0xcfd2d6, roughness:.5, metalness:.1});
  const paintMat = new THREE.MeshStandardMaterial({color:0xf4f3f0, map:plaster, roughness:.95, emissive:0x1e1e1c});
  officeRefs.paintMat = paintMat;
  const H = WALL_H;
  const slab = (mat, x0,x1,y0,y1,z0,z1, noShadow) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1-x0, y1-y0, z1-z0), mat);
    m.position.set((x0+x1)/2, (y0+y1)/2, (z0+z1)/2); m.castShadow = !noShadow; m.receiveShadow = true; scene.add(m); return m;
  };
  officeRefs.slab = slab;
  // pareti del laboratorio (quella di fondo ha il passaggio per l'ufficio)
  slab(wallMat, -13,-10, 0,H, -11,-10);
  slab(wallMat, -7.6,13, 0,H, -11,-10);
  slab(wallMat, -10,-7.6, DOOR_B.h,H, -11,-10);
  slab(wallMat, -13,-12, 0,H, -10,10);
  slab(wallMat, 12,13, 0,H, -10,-8.6);
  slab(wallMat, 12,13, 0,H, -1.4,10);
  slab(wallMat, 12,13, 3.0,H, -8.6,-1.4);
  slab(wallMat, -13,-2, 0,H, 10,11);
  slab(wallMat, 2,13, 0,H, 10,11);
  slab(wallMat, -2,2, 2.3,H, 10,11);
  // pareti dell'ufficio
  slab(wallMat, -21,-3, 0,H, -21,-20);
  slab(wallMat, -21,-20, 0,H, -20,-11);
  slab(wallMat, -21,-12, 0,H, -11,-10);
  slab(wallMat, -4,-3, 0,H, -20,-11);
  // tinta interna dell'ufficio (personalizzabile)
  slab(paintMat, -12,-4, 0,H, -20,-19.985, true);
  slab(paintMat, -20,-19.985, 0,H, -20,-11, true);
  slab(paintMat, -20,-12, 0,H, -11.015,-11, true);
  slab(paintMat, -20,-4, 0,H, -20,-19.985, true);
  slab(paintMat, -4.015,-4, 0,H, -20,-11, true);
  slab(paintMat, -12,-10, 0,H, -11.015,-11, true);
  slab(paintMat, -7.6,-4, 0,H, -11.015,-11, true);
  slab(paintMat, -10,-7.6, DOOR_B.h,H, -11.015,-11, true);
  // bordi superiori e battiscopa
  for (const [x0,x1,z0,z1] of [[-13.05,13.05,-11.05,-9.95],[-13.05,-11.95,-10,10],[11.95,13.05,-10,10],[-13.05,-1.95,9.95,11.05],[1.95,13.05,9.95,11.05],[-2,2,9.95,11.05],
    [-13.05,-2.95,-21.05,-19.95],[-13.05,-11.95,-20,-11],[-4.05,-2.95,-20,-11]])
    slab(trimMat, x0,x1, H, H+.08, z0,z1);
  for (const [x0,x1,z0,z1] of [[-12,-10,-10,-9.97],[-7.6,12,-10,-9.97],[-12,-11.97,-10,10],[11.97,12,-10,-8.6],[11.97,12,-1.4,10],[-12,-2,9.97,10],[2,12,9.97,10],
    [-12,-4,-19.985,-19.955],[-11.985,-11.955,-20,-11],[-4.045,-4.015,-20,-11],[-12,-10,-11.045,-11.015],[-7.6,-4,-11.045,-11.015]])
    slab(trimMat, x0,x1, 0, .12, z0,z1, true);
  // stipiti delle porte
  slab(trimMat, -2.08,-1.92, 0,2.38, 9.95,11.05); slab(trimMat, 1.92,2.08, 0,2.38, 9.95,11.05); slab(trimMat, -2.08,2.08, 2.3,2.38, 9.95,11.05);
  const alu = new THREE.MeshStandardMaterial({color:0x3b4250, roughness:.35, metalness:.6});
  slab(alu, -10.1,-10, 0,DOOR_B.h+.08, -11.03,-9.97); slab(alu, -7.6,-7.5, 0,DOOR_B.h+.08, -11.03,-9.97);
  slab(alu, -10.1,-7.5, DOOR_B.h,DOOR_B.h+.08, -11.03,-9.97);
  slab(alu, -10,-7.6, 0,.03, -11,-10, true);                              // soglia
  // porta doppia scorrevole a scomparsa nel muro, con vetro satinato e logo
  const glass = new THREE.MeshStandardMaterial({color:0xd6eaf7, roughness:.12, metalness:.1, transparent:true, opacity:.5, depthWrite:false});
  const makeLeaf = side => {
    const lg = new THREE.Group(); scene.add(lg);
    const w = 1.24, h = DOOR_B.h - .02;
    for (const [bw,bh,bx,by] of [[w,.07,0,h-.035],[w,.07,0,.035],[.07,h,-w/2+.035,h/2],[.07,h,w/2-.035,h/2]]){
      const f = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,.06), alu); f.position.set(bx,by,0); f.castShadow = true; lg.add(f);
    }
    const gp = new THREE.Mesh(new THREE.BoxGeometry(w-.12, h-.12, .02), glass); gp.position.set(0, h/2, 0); lg.add(gp);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(.025,.5,.08), alu); handle.position.set(-side*(w/2-.14), 1.05, 0); lg.add(handle);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(.34,.29), LOGO_DECAL_MAT);
    logo.position.set(side*.1, 1.45, .012); lg.add(logo);
    const logoB = logo.clone(); logoB.rotation.y = Math.PI; logoB.position.z = -.012; lg.add(logoB);
    return lg;
  };
  slideDoor.L = makeLeaf(-1); slideDoor.R = makeLeaf(1);
  slideDoor.led = new THREE.Mesh(new THREE.BoxGeometry(.3,.05,.04), new THREE.MeshBasicMaterial({color:0xff4040}));
  slideDoor.led.position.set(DOOR_B.cx, DOOR_B.h + .2, -9.97); scene.add(slideDoor.led);
  const led2 = slideDoor.led.clone(); led2.material = slideDoor.led.material; led2.position.z = -11.03; scene.add(led2);
  slideDoor.place = () => {
    const o = slideDoor.open * 1.2;
    slideDoor.L.position.set(DOOR_B.cx - .6 - o, 0, DOOR_B.z);
    slideDoor.R.position.set(DOOR_B.cx + .6 + o, 0, DOOR_B.z);
  };
  slideDoor.place();
  slideDoor.col = {x0:DOOR_B.x0, x1:DOOR_B.x1, z0:DOOR_B.z-.15, z1:DOOR_B.z+.15, door:true};
  staticCols.push(slideDoor.col);
  const doorSign = makeWallTag('Ufficio · computer', '#ffd23f', 1.8); doorSign.position.set(DOOR_B.cx, DOOR_B.h + .45, -9.965); scene.add(doorSign);
  const doorSign2 = makeWallTag('Laboratorio', '#ffffff', 1.4); doorSign2.position.set(DOOR_B.cx, DOOR_B.h + .45, -11.035); doorSign2.rotation.y = Math.PI; scene.add(doorSign2);
  // lampade
  instBlocks([[-13,H,-11],[12,H,-11],[-13,H,10],[12,H,10],[-13,H,-21],[-4,H,-21]], MAT.glow);
  // collisioni
  addCol(-13,-10,-11,-10); addCol(-7.6,13,-11,-10); addCol(-13,-2,10,11); addCol(2,13,10,11); addCol(-13,-12,-11,11); addCol(-21,-20,-21,-10); addCol(-21,-12,-11,-10); addCol(12,13,-11,-8.6); addCol(12,13,-1.4,11);
  addCol(-13,-3,-21,-20); addCol(-4,-3,-21,-11);
  const W = .15, CH = H + .2;
  addCam(-13-W,13+W,0,CH,-11-W,-10+W); addCam(-13-W,-2+W,0,CH,10-W,11+W); addCam(2-W,13+W,0,CH,10-W,11+W);
  addCam(-2,2,2.2,CH,10-W,11+W); addCam(-13-W,-12+W,0,CH,-11,11); addCam(12-W,13+W,0,CH,-11,-8.6); addCam(12-W,13+W,0,CH,-1.4,11); addCam(12-W,13+W,2.9,CH,-8.6,-1.4);
  addCam(-13-W,-3+W,0,CH,-21-W,-20+W); addCam(-4-W,-3+W,0,CH,-21,-11);
  // il logo sulle pareti del laboratorio
  logoPanel(1.95, 1.5, 1.6, 3.1, -9.96, 0);
  logoPanel(3.0, 2.3, 6.9, 1.95, 9.96, Math.PI);

  // armadio server nell'angolo (non intralcia)
  {
    const sg = new THREE.Group(); sg.position.set(-11.45, 0, -19.45); sg.rotation.y = Math.PI/2; scene.add(sg);
    const body = new THREE.MeshStandardMaterial({color:0x15181d, roughness:.45, metalness:.5});
    const unit = new THREE.MeshStandardMaterial({color:0x2a2f38, roughness:.4, metalness:.6});
    const cab = new THREE.Mesh(new THREE.BoxGeometry(.8, 2.1, 1.0), body); cab.position.y = 1.05; cab.castShadow = true; sg.add(cab);
    for (let u=0; u<11; u++){
      const y = .25 + u*.16;
      const m = new THREE.Mesh(new THREE.BoxGeometry(.68, .12, .04), unit); m.position.set(0, y, .49); sg.add(m);
      for (let k=0;k<4;k++){
        const led = new THREE.Mesh(new THREE.BoxGeometry(.018,.018,.01), new THREE.MeshBasicMaterial({color:[0x33ff66,0x33aaff,0x33ff66,0xffaa22][k]}));
        led.position.set(-.28 + k*.035, y, .516); sg.add(led); serverLeds.push(led);
      }
      const vent = new THREE.Mesh(new THREE.BoxGeometry(.3, .05, .01), new THREE.MeshBasicMaterial({color:0x0b0d10})); vent.position.set(.15, y, .516); sg.add(vent);
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(.78, 2.0, .02), new THREE.MeshStandardMaterial({color:0x223344, roughness:.1, transparent:true, opacity:.28, depthWrite:false}));
    door.position.set(0, 1.05, .52); sg.add(door);
    const top = makeWallTag('Server LDMprint', '#7fd0ff', 1.0); top.position.set(0, 2.4, -.54); sg.add(top);
    addCol(-12, -10.9, -20, -19.0);
    addCam(-12, -10.9, 0, 2.2, -20, -19.0);
  }
}

/* ---------- pavimenti riflettenti (laboratorio e ufficio) ---------- */
function reflectiveMat(map, color, rough, k0, k1){
  const m = new THREE.MeshStandardMaterial({map, color, roughness:rough, metalness:0});
  m.userData.k = {value:new THREE.Vector2(k0, k1)};
  m.onBeforeCompile = sh => {
    sh.uniforms.tReflect = {value:mirror.rt.texture};
    sh.uniforms.reflectMatrix = {value:mirror.tm};
    sh.uniforms.reflectOn = mirror.on;
    sh.uniforms.reflectTexel = mirror.texel;
    sh.uniforms.reflectK = m.userData.k;
    sh.vertexShader = 'uniform mat4 reflectMatrix;\nvarying vec4 vReflUv;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvReflUv = reflectMatrix * modelMatrix * vec4( transformed, 1.0 );');
    sh.fragmentShader = 'uniform sampler2D tReflect;\nuniform float reflectOn;\nuniform vec2 reflectTexel;\nuniform vec2 reflectK;\nvarying vec4 vReflUv;\n' +
      sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', `
	if ( reflectK.x + reflectK.y > 0.0 ) {
		vec2 ruv = vReflUv.xy / vReflUv.w;
		vec2 o = reflectTexel * 1.6;
		vec3 refl = ( texture2D( tReflect, ruv ).rgb * 2.0
			+ texture2D( tReflect, ruv + vec2( o.x, 0.0 ) ).rgb + texture2D( tReflect, ruv - vec2( o.x, 0.0 ) ).rgb
			+ texture2D( tReflect, ruv + vec2( 0.0, o.y ) ).rgb + texture2D( tReflect, ruv - vec2( 0.0, o.y ) ).rgb ) / 6.0;
		float fres = pow( 1.0 - clamp( dot( normalize( vViewPosition ), normal ), 0.0, 1.0 ), 3.0 );
		outgoingLight = mix( outgoingLight, refl, reflectOn * ( reflectK.x + reflectK.y * fres ) );
	}
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );`);
  };
  return m;
}
labFloor.material = reflectiveMat(marbleTex, 0x959593, .22, .16, .22);
// ufficio: marmo, parquet o moquette
const parquetTex = (()=>{
  const c = mkCanvas(512,512), g = c.getContext('2d'), R = mulberry32(77);
  const pw = 64;
  for (let col=0; col<8; col++){
    let y = -Math.floor(R()*200);
    while (y < 512){
      const len = 150 + R()*170, base = 150 + R()*40;
      g.fillStyle = `rgb(${base+40|0},${base-5|0},${base-60|0})`; g.fillRect(col*pw, y, pw, len);
      for (let k=0;k<26;k++){ g.strokeStyle = `rgba(80,45,15,${.05+R()*.12})`; g.lineWidth = 1+R()*1.5; const x = col*pw + 3 + R()*(pw-6); g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x+(R()-.5)*8, y+len*.3, x+(R()-.5)*8, y+len*.6, x+(R()-.5)*4, y+len); g.stroke(); }
      g.fillStyle = 'rgba(40,20,5,.55)'; g.fillRect(col*pw, y, pw, 2); g.fillRect(col*pw, y, 2, len);
      y += len;
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2.25); t.anisotropy = MAX_ANI; return t;
})();
const carpetTex = (()=>{
  const c = mkCanvas(256,256), g = c.getContext('2d');
  g.fillStyle = '#2f4f86'; g.fillRect(0,0,256,256);
  for (let i=0;i<9000;i++){ g.fillStyle = `rgba(${TR()<.5?'10,20,50':'140,170,230'},${TR()*.18})`; g.fillRect(TR()*256|0, TR()*256|0, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4.5); t.anisotropy = MAX_ANI; return t;
})();
const OFFICE_FLOORS = {
  marble:  {name:'Marmo bianco', mat: labFloor.material},
  parquet: {name:'Parquet di rovere', mat: reflectiveMat(parquetTex, 0xcfcfcf, .38, .06, .14)},
  carpet:  {name:'Moquette blu', mat: reflectiveMat(carpetTex, 0xffffff, .95, 0, 0)},
};
const officeFloor = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), labFloor.material);
{
  const uv = officeFloor.geometry.attributes.uv;
  officeFloor.userData.uvBase = uv.array.slice();
  officeFloor.rotation.x = -Math.PI/2; officeFloor.position.set(-12, .015, -15.5); officeFloor.receiveShadow = true; scene.add(officeFloor);
}
function setOfficeFloor(id){
  const f = OFFICE_FLOORS[id] || OFFICE_FLOORS.marble;
  officeFloor.material = f.mat;
  // il marmo usa la stessa scala delle piastrelle del laboratorio
  const uv = officeFloor.geometry.attributes.uv, base = officeFloor.userData.uvBase;
  const sx = id === 'marble' || !OFFICE_FLOORS[id] ? 8/24 : 1, sz = id === 'marble' || !OFFICE_FLOORS[id] ? 9/20 : 1;
  for (let i=0;i<uv.count;i++){ uv.setXY(i, base[i*2]*sx, base[i*2+1]*sz); }
  uv.needsUpdate = true;
}
setOfficeFloor('marble');
const OFFICE_WALLS = {
  white:      {name:'Bianco', color:0xf4f3f0, cost:0},
  sage:       {name:'Verde salvia', color:0xb4c4a8, cost:400},
  terracotta: {name:'Terracotta', color:0xc98a6c, cost:500},
  navy:       {name:'Blu notte', color:0x34507e, cost:600},
  anthracite: {name:'Antracite', color:0x50555e, cost:600},
};
function setOfficeWall(id){ officeRefs.paintMat.color.setHex((OFFICE_WALLS[id] || OFFICE_WALLS.white).color); }

/* ---------- arredi e addobbi acquistabili ---------- */
const SPH_O = new THREE.SphereGeometry(1, 16, 12);
const DM = (color, rough=.6, extra={}) => new THREE.MeshStandardMaterial(Object.assign({color, roughness:rough, metalness:0}, extra));
function part3(g, geo, mat, x, y, z, shadow=true){ const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); if (shadow) m.castShadow = true; m.receiveShadow = true; g.add(m); return m; }
const BOX = (w,h,d) => new THREE.BoxGeometry(w,h,d);
const officeAnim = {clock:null, fish:[], lampLight:null};
const DECOR = [
  {id:'plant', name:'Pianta Monstera', icon:'🪴', cost:180, desc:'Una pianta grande che porta un po\' di verde.', col:[-5.1,-4.3,-12.2,-11.4], build(){
    const g = new THREE.Group(); g.position.set(-4.7, 0, -11.8);
    part3(g, new THREE.CylinderGeometry(.3,.22,.55,20), DM(0xb5653d,.8), 0,.275,0);
    part3(g, new THREE.CylinderGeometry(.28,.28,.03,20), DM(0x3b2a1c,1), 0,.53,0, false);
    const leaf = DM(0x2f7d3a,.55, {side:THREE.DoubleSide}), stem = DM(0x3f6b2a,.7), R = mulberry32(11);
    for (let i=0;i<11;i++){
      const a = i/11*Math.PI*2 + R()*.4, h = .9 + R()*.9, r = .25 + R()*.35;
      const st = part3(g, new THREE.CylinderGeometry(.012,.016,h,5), stem, Math.cos(a)*r*.4, .55+h/2, Math.sin(a)*r*.4, false);
      st.rotation.set(Math.sin(a)*.35, 0, -Math.cos(a)*.35);
      const lf = part3(g, SPH_O, leaf, Math.cos(a)*r, .5+h, Math.sin(a)*r);
      lf.scale.set(.22, .02, .16); lf.rotation.set(R()*.6-.3, -a, .5 + R()*.4);
    }
    return g; }},
  {id:'rug', name:'Tappeto LDM', icon:'🟦', cost:250, desc:'Tappeto con i colori del marchio al centro dello studio.', col:null, build(){
    const c = mkCanvas(512,346), x = c.getContext('2d');
    x.fillStyle = '#1d2c52'; x.fillRect(0,0,512,346);
    x.strokeStyle = '#c8ccd4'; x.lineWidth = 14; x.strokeRect(22,22,468,302);
    x.strokeStyle = '#5b79b8'; x.lineWidth = 4; x.strokeRect(46,46,420,254);
    for (let i=0;i<4000;i++){ x.fillStyle = `rgba(255,255,255,${Math.random()*.05})`; x.fillRect(Math.random()*512, Math.random()*346, 2, 2); }
    const t = new THREE.CanvasTexture(c); t.anisotropy = MAX_ANI;
    const draw = ()=>{ if (logoImg.naturalWidth){ x.globalAlpha = .55; x.drawImage(logoImg, 256-95, 173-81, 190, 162); x.globalAlpha = 1; t.needsUpdate = true; } };
    onLogo(draw);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.3), DM(0xffffff, .95, {map:t}));
    m.rotation.x = -Math.PI/2; m.position.set(-8, .03, -15.3); m.receiveShadow = true;
    const g = new THREE.Group(); g.add(m); return g; }},
  {id:'painting', name:'Quadro col logo', icon:'🖼️', cost:350, desc:'Una stampa artistica del logo LDMprint sopra la scrivania.', col:null, build(){
    const g = new THREE.Group(); g.position.set(-8.15, 2.85, -19.94);
    part3(g, BOX(1.7,1.2,.06), DM(0x1a1a1a,.4), 0,0,0);
    const c = mkCanvas(512,352), x = c.getContext('2d'), t = new THREE.CanvasTexture(c);
    const draw = ()=>{ const gr = x.createRadialGradient(256,176,20,256,176,300); gr.addColorStop(0,'#f5f1e8'); gr.addColorStop(1,'#c9d3e6'); x.fillStyle = gr; x.fillRect(0,0,512,352);
      if (logoImg.naturalWidth) x.drawImage(logoImg, 256-130, 176-110, 260, 221); t.needsUpdate = true; };
    draw(); onLogo(draw);
    part3(g, new THREE.PlaneGeometry(1.56,1.06), DM(0xffffff,.8,{map:t}), 0,0,.032, false);
    return g; }},
  {id:'clock', name:'Orologio da parete', icon:'🕰️', cost:150, desc:'Segna l\'ora vera del tuo computer.', col:null, build(){
    const g = new THREE.Group(); g.position.set(-11.94, 3.05, -15.4); g.rotation.y = Math.PI/2;
    part3(g, new THREE.CylinderGeometry(.34,.34,.05,32), DM(0x2b2f36,.4,{metalness:.4}), 0,0,0).rotation.x = Math.PI/2;
    const c = mkCanvas(256,256), x = c.getContext('2d');
    x.fillStyle = '#fbfbf8'; x.beginPath(); x.arc(128,128,126,0,Math.PI*2); x.fill();
    x.fillStyle = '#222';
    for (let i=0;i<60;i++){ const a = i/60*Math.PI*2, r0 = i%5 ? 112 : 100; x.save(); x.translate(128,128); x.rotate(a); x.fillRect(-(i%5?1:3), -122, i%5?2:6, 122-r0); x.restore(); }
    x.font = 'bold 20px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#1d2c52'; x.fillText('LDMprint', 128, 180);
    const face = part3(g, new THREE.CircleGeometry(.31, 32), DM(0xffffff,.6,{map:new THREE.CanvasTexture(c)}), 0,0,.027, false);
    const hand = (len, w, color, z) => { const p = new THREE.Group(); p.position.z = z; g.add(p); part3(p, BOX(w, len, .006), DM(color,.5), 0, len/2 - .03, 0, false); return p; };
    officeAnim.clock = {h:hand(.17,.022,0x1a1a1a,.034), m:hand(.25,.014,0x1a1a1a,.04), s:hand(.27,.006,0xd63a2e,.046)};
    return g; }},
  {id:'lamp', name:'Lampada da terra', icon:'💡', cost:300, desc:'Luce calda accanto al divano.', col:[-4.9,-4.3,-17.6,-17.0], build(){
    const g = new THREE.Group(); g.position.set(-4.6, 0, -17.3);
    const metal = DM(0x2c2c2c,.35,{metalness:.7});
    part3(g, new THREE.CylinderGeometry(.18,.2,.04,24), metal, 0,.02,0);
    part3(g, new THREE.CylinderGeometry(.015,.015,1.55,8), metal, 0,.8,0);
    part3(g, new THREE.CylinderGeometry(.16,.24,.3,24,1,true), DM(0xf3e6c8,.9,{side:THREE.DoubleSide, emissive:0xffcf7a, emissiveIntensity:.55}), 0,1.62,0);
    part3(g, new THREE.SphereGeometry(.05,10,8), new THREE.MeshBasicMaterial({color:0xfff2cc}), 0,1.56,0, false);
    return g; }},
  {id:'bookshelf', name:'Libreria', icon:'📚', cost:600, desc:'Manuali di stampa 3D, design e marketing.', col:[-12,-11.5,-16.35,-14.45], build(){
    const g = new THREE.Group(); g.position.set(-11.78, 0, -15.4); g.rotation.y = Math.PI/2;
    const wood = DM(0x6e4a2c,.7);
    part3(g, BOX(1.9,2.2,.04), wood, 0,1.1,-.2);
    for (const x of [-.93,.93]) part3(g, BOX(.04,2.2,.44), wood, x,1.1,0);
    const R = mulberry32(21), cols = [0x1d2c52,0xc0392b,0x2e86de,0xf1c40f,0x16a085,0x8e44ad,0xe67e22,0x7f8c8d,0xecf0f1];
    for (let s=0;s<5;s++){
      const y = .05 + s*.52;
      part3(g, BOX(1.82,.04,.42), wood, 0,y,0);
      if (s === 4) break;
      let x = -.86;
      while (x < .8){
        const w = .03 + R()*.05, h = .28 + R()*.16;
        if (R() < .12){ x += .08; continue; }
        const b = part3(g, BOX(w, h, .26 + R()*.08), DM(cols[R()*cols.length|0], .8), x + w/2, y + .02 + h/2, .03, false);
        if (R() < .08) b.rotation.z = .25;
        x += w + .005;
      }
    }
    return g; }},
  {id:'coffee', name:'Macchina del caffè', icon:'☕', cost:700, desc:'Indispensabile per le giornate di produzione.', col:[-12,-11.1,-12.85,-11.75], build(){
    const g = new THREE.Group(); g.position.set(-11.55, 0, -12.3);
    part3(g, BOX(.9,.95,1.05), DM(0xe8e4dc,.6), 0,.475,0);
    part3(g, BOX(.92,.04,1.08), DM(0x2d2d2d,.3), 0,.97,0);
    const body = DM(0x1c1c1c,.3,{metalness:.5}), steel = DM(0xbfc4ca,.25,{metalness:.8});
    part3(g, BOX(.38,.42,.3), body, 0,1.2,-.15);
    part3(g, BOX(.34,.06,.26), steel, .02,1.02,-.13);
    part3(g, new THREE.CylinderGeometry(.03,.03,.08,10), steel, .02,1.16,.02);
    part3(g, new THREE.CylinderGeometry(.04,.032,.08,14), DM(0xffffff,.3), .02,1.05,.02);
    part3(g, BOX(.1,.02,.01), new THREE.MeshBasicMaterial({color:0x44ddff}), 0,1.34,.001);
    part3(g, new THREE.CylinderGeometry(.045,.04,.1,14), DM(0xc0392b,.4), .2,1.04,.3);
    return g; }},
  {id:'table', name:'Tavolino in vetro', icon:'🫖', cost:400, desc:'Tavolino basso davanti al divano.', col:[-6.45,-5.55,-15.9,-14.5], build(){
    const g = new THREE.Group(); g.position.set(-6, 0, -15.2);
    part3(g, BOX(.85,.03,1.3), DM(0xcfe6f2,.08,{transparent:true, opacity:.45, depthWrite:false}), 0,.42,0);
    const metal = DM(0x222222,.3,{metalness:.7});
    for (const [x,z] of [[-.38,-.6],[.38,-.6],[-.38,.6],[.38,.6]]) part3(g, BOX(.03,.42,.03), metal, x,.21,z);
    part3(g, new THREE.TorusKnotGeometry(.06,.02,48,8), DM(0xff8a1f,.35), 0,.52,.2);
    part3(g, BOX(.22,.03,.3), DM(0x1d2c52,.6), -.1,.45,-.25);
    return g; }},
  {id:'sofa', name:'Divano', icon:'🛋️', cost:1200, desc:'Per le pause tra una stampa e l\'altra.', col:[-5.05,-4,-16.4,-14.0], build(){
    const g = new THREE.Group(); g.position.set(-4.55, 0, -15.2); g.rotation.y = -Math.PI/2;
    const fab = DM(0x55606e,.95), leg = DM(0x2a1f16,.6), cush = DM(0x626e7d,.95);
    part3(g, BOX(2.3,.28,.9), fab, 0,.3,0);
    part3(g, BOX(2.3,.55,.22), fab, 0,.72,-.34);
    for (const x of [-1.07,1.07]) part3(g, BOX(.2,.45,.9), fab, x,.5,0);
    for (const x of [-.48,.48]){ const c = part3(g, BOX(.94,.14,.62), cush, x,.51,.08); c.scale.y = 1; part3(g, BOX(.92,.42,.14), cush, x,.8,-.2).rotation.x = -.12; }
    for (const [x,z] of [[-1.05,-.35],[1.05,-.35],[-1.05,.35],[1.05,.35]]) part3(g, new THREE.CylinderGeometry(.03,.02,.16,8), leg, x,.08,z);
    part3(g, BOX(.36,.3,.12), DM(0xff8a1f,.9), -.72,.72,-.1).rotation.set(-.2,.2,.1);
    return g; }},
  {id:'whiteboard', name:'Lavagna dei progetti', icon:'📝', cost:300, desc:'Idee e schizzi dei prossimi prodotti.', col:null, build(){
    const g = new THREE.Group(); g.position.set(-5.9, 1.65, -19.95);
    part3(g, BOX(1.5,1.0,.04), DM(0xb8bec6,.4,{metalness:.5}), 0,0,0);
    const c = mkCanvas(384,256), x = c.getContext('2d');
    x.fillStyle = '#fbfbfb'; x.fillRect(0,0,384,256);
    x.font = 'bold 22px sans-serif'; x.fillStyle = '#1d2c52'; x.fillText('Idee LDMprint', 16, 34);
    x.strokeStyle = '#2e86de'; x.lineWidth = 3; x.strokeRect(24,60,80,80); x.beginPath(); x.moveTo(24,60); x.lineTo(54,40); x.lineTo(134,40); x.lineTo(104,60); x.moveTo(134,40); x.lineTo(134,120); x.lineTo(104,140); x.stroke();
    x.strokeStyle = '#c0392b'; x.beginPath(); x.ellipse(250,100,50,30,0,0,Math.PI*2); x.stroke(); x.beginPath(); x.moveTo(200,100); x.lineTo(210,180); x.lineTo(290,180); x.lineTo(300,100); x.stroke();
    x.font = '18px sans-serif'; x.fillStyle = '#333'; x.fillText('✓ portachiavi', 20, 190); x.fillText('✓ supporti', 20, 214); x.fillText('→ vasi low-poly', 20, 238);
    x.fillStyle = '#16a085'; x.fillText('+30% vendite!', 220, 232);
    part3(g, new THREE.PlaneGeometry(1.42,.92), DM(0xffffff,.3,{map:new THREE.CanvasTexture(c)}), 0,0,.022, false);
    part3(g, BOX(1.3,.03,.08), DM(0x9aa0a6,.4,{metalness:.5}), 0,-.52,.05);
    return g; }},
  {id:'showcase', name:'Vetrina stampe 3D', icon:'🏆', cost:1800, desc:'Espone i tuoi pezzi migliori.', col:[-12,-11.45,-18.35,-17.05], build(){
    const g = new THREE.Group(); g.position.set(-11.72, 0, -17.7); g.rotation.y = Math.PI/2;
    const frame = DM(0x1e1e1e,.4,{metalness:.5});
    part3(g, BOX(1.2,.1,.5), frame, 0,.05,0); part3(g, BOX(1.2,.05,.5), frame, 0,1.95,0);
    for (const x of [-.58,.58]) part3(g, BOX(.04,1.9,.5), frame, x,.98,0);
    part3(g, BOX(1.12,1.85,.02), frame, 0,.98,-.24);
    const R = mulberry32(31), cols = [0xff7a1a,0x2ec4b6,0xe84393,0x6c5ce7,0x20bf6b,0xf7b731,0x3867d6];
    for (const y of [.5,1.0,1.5]){
      part3(g, BOX(1.12,.02,.44), DM(0xdff1fb,.05,{transparent:true, opacity:.5, depthWrite:false}), 0,y,0, false);
      for (let k=0;k<4;k++){
        const mat = DM(cols[R()*cols.length|0], .45);
        const geo = [new THREE.ConeGeometry(.07,.2,6), new THREE.TorusKnotGeometry(.05,.018,40,6), new THREE.DodecahedronGeometry(.08), new THREE.CylinderGeometry(.05,.08,.18,6)][k%4];
        const m = part3(g, geo, mat, -.4 + k*.27, y + .12, 0, false); m.rotation.y = R()*3;
      }
    }
    const glassF = part3(g, BOX(1.12,1.85,.01), DM(0xdff1fb,.05,{transparent:true, opacity:.18, depthWrite:false}), 0,.98,.245, false);
    return g; }},
  {id:'neon', name:'Insegna al neon', icon:'✨', cost:2500, desc:'La scritta LDMprint luminosa sulla parete.', col:null, build(){
    const g = new THREE.Group(); g.position.set(-4.03, 2.7, -15.2); g.rotation.y = -Math.PI/2;
    const c = mkCanvas(768,192), x = c.getContext('2d'), t = new THREE.CanvasTexture(c);
    const draw = ()=>{
      x.clearRect(0,0,768,192);
      if (logoImg.naturalWidth){ x.shadowColor = '#6fa8ff'; x.shadowBlur = 18; x.drawImage(logoImg, 20, 26, 164, 140); }
      x.font = 'bold 96px sans-serif'; x.textBaseline = 'middle';
      x.shadowColor = '#ff8a1f'; x.shadowBlur = 30; x.fillStyle = '#ffd9b0';
      for (let k=0;k<3;k++) x.fillText('LDMprint', 210, 100);
      t.needsUpdate = true;
    };
    draw(); onLogo(draw);
    part3(g, new THREE.PlaneGeometry(2.4,.6), new THREE.MeshBasicMaterial({map:t, transparent:true, depthWrite:false}), 0,0,.02, false);
    part3(g, BOX(2.3,.5,.02), DM(0x0e1116,.2,{transparent:true, opacity:.35}), 0,0,0, false);
    return g; }},
  {id:'aquarium', name:'Acquario', icon:'🐠', cost:4000, desc:'Pesci tropicali che nuotano davvero.', col:[-4.9,-4,-19.65,-17.95], build(){
    const g = new THREE.Group(); g.position.set(-4.55, 0, -18.8); g.rotation.y = -Math.PI/2;
    part3(g, BOX(1.6,.75,.55), DM(0x1c1c1c,.4), 0,.375,0);
    part3(g, BOX(1.5,.7,.45), DM(0x3a8fd6,.05,{transparent:true, opacity:.32, depthWrite:false}), 0,1.12,0, false);
    part3(g, BOX(1.52,.04,.47), DM(0x111111,.4), 0,1.49,0);
    part3(g, BOX(1.48,.06,.43), DM(0xd9c79a,.9), 0,.8,0, false);
    const R = mulberry32(41);
    for (let k=0;k<7;k++){
      const pl = part3(g, new THREE.ConeGeometry(.03,.3 + R()*.25,5), DM(0x2e8b57,.8), -.65 + R()*1.3, .98, -.15 + R()*.3, false);
      pl.rotation.z = (R()-.5)*.3;
    }
    for (let k=0;k<6;k++){
      const f = new THREE.Group(); g.add(f);
      const col = [0xff7f27,0xffd23f,0x3cb4ff,0xff4d6d][k%4];
      const b = part3(f, SPH_O, DM(col,.35), 0,0,0, false); b.scale.set(.05,.03,.018);
      const tl = part3(f, new THREE.ConeGeometry(.022,.04,4), DM(col,.35), -.06,0,0, false); tl.rotation.z = Math.PI/2;
      officeAnim.fish.push({f, r:.4 + R()*.25, y:.95 + R()*.35, s:.4 + R()*.6, p:R()*6, z:(R()-.5)*.25});
    }
    return g; }},
  {id:'boardroom', name:'Tavolo riunioni da 8', icon:'🪑', cost:25000, desc:'Il tavolo dove si chiudono i contratti grossi.', col:[-18.2,-14.8,-18.6,-16.4], build(){
    const g = new THREE.Group(); g.position.set(-16.5, 0, -17.5); scene.add(g);
    const wood = new THREE.MeshStandardMaterial({color:0x4a3526, roughness:.35, metalness:.1});
    const seat = new THREE.MeshStandardMaterial({color:0x1d2430, roughness:.6});
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, .1, 1.9), wood); top.position.y = .74; top.castShadow = true; g.add(top);
    for (const s of [-1,1]){ const b = new THREE.Mesh(new THREE.BoxGeometry(.25, .72, 1.2), wood); b.position.set(s*1.2, .37, 0); g.add(b); }
    for (const s of [-1,1]) for (let k=0;k<4;k++){
      const c = new THREE.Group(); c.position.set(-1.2 + k*.8, 0, s*1.35); g.add(c);
      const st = new THREE.Mesh(new THREE.BoxGeometry(.5,.08,.5), seat); st.position.y = .45; st.castShadow = true; c.add(st);
      const bk = new THREE.Mesh(new THREE.BoxGeometry(.5,.6,.08), seat); bk.position.set(0,.75,-s*.22); c.add(bk);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,.45,10), seat); p.position.y = .22; c.add(p);
    }
    return g;
  }},
  {id:'pool', name:'Biliardo', icon:'🎱', cost:60000, desc:'Una partita tra una stampa e l\'altra.', col:[-18,-15,-14.6,-12.6], build(){
    const g = new THREE.Group(); g.position.set(-16.5, 0, -13.6); scene.add(g);
    const felt = new THREE.MeshStandardMaterial({color:0x1d6b3a, roughness:.95});
    const wood = new THREE.MeshStandardMaterial({color:0x5a3218, roughness:.4});
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.6,.25,1.5), wood); b.position.y = .72; b.castShadow = true; g.add(b);
    const f = new THREE.Mesh(new THREE.BoxGeometry(2.4,.04,1.3), felt); f.position.y = .86; g.add(f);
    for (const s of [-1,1]) for (const t of [-1,1]){ const l = new THREE.Mesh(new THREE.BoxGeometry(.18,.7,.18), wood); l.position.set(s*1.15,.35,t*.6); g.add(l); }
    const ball = new THREE.SphereGeometry(.05, 12, 10);
    [0xffffff,0xd9b310,0xb03a2e,0x2d5bd1,0x2a2a2a].forEach((c,k)=>{ const m = new THREE.Mesh(ball, new THREE.MeshStandardMaterial({color:c, roughness:.15})); m.position.set(-.6 + k*.22, .91, (k%2?.1:-.1)); m.castShadow = true; g.add(m); });
    return g;
  }},
  {id:'fireplace', name:'Camino di design', icon:'🔥', cost:150000, desc:'Fuoco vero dietro il vetro, per le serate in ufficio.', col:[-19.9,-19.2,-16.6,-14.4], build(){
    const g = new THREE.Group(); g.position.set(-19.6, 0, -15.5); scene.add(g);
    const stone = new THREE.MeshStandardMaterial({color:0x2c2f36, roughness:.7});
    const base = new THREE.Mesh(new THREE.BoxGeometry(.5,1.7,2.1), stone); base.position.y = .85; base.castShadow = true; g.add(base);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(.06,.8,1.5), new THREE.MeshStandardMaterial({color:0x11151c, roughness:.05, metalness:.4}));
    glass.position.set(.26,.75,0); g.add(glass);
    const fire = new THREE.Mesh(new THREE.BoxGeometry(.1,.5,1.2), new THREE.MeshBasicMaterial({color:0xff8a1f})); fire.position.set(.2,.62,0); g.add(fire);
    officeAnim.fire = fire;
    return g;
  }},
  {id:'cinema', name:'Home cinema', icon:'🎬', cost:400000, desc:'Schermo gigante e poltrone reclinabili.', col:[-14.4,-12.6,-19.6,-17.4], build(){
    const g = new THREE.Group(); g.position.set(-13.4, 0, -18.5); scene.add(g);
    const dark = new THREE.MeshStandardMaterial({color:0x15181e, roughness:.5});
    const scr = new THREE.Mesh(new THREE.BoxGeometry(.12,1.5,2.6), dark); scr.position.set(0,1.6,0); scr.castShadow = true; g.add(scr);
    const img = new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.35), new THREE.MeshBasicMaterial({color:0x2a4a8a})); img.position.set(-.07,1.6,0); img.rotation.y = -Math.PI/2; g.add(img);
    for (const z of [-.7,.7]){ const s = new THREE.Mesh(new THREE.BoxGeometry(.9,.55,.9), new THREE.MeshStandardMaterial({color:0x4a1f25, roughness:.85})); s.position.set(-1.5,.3,z); s.castShadow = true; g.add(s);
      const bk = new THREE.Mesh(new THREE.BoxGeometry(.25,.8,.9), new THREE.MeshStandardMaterial({color:0x4a1f25, roughness:.85})); bk.position.set(-1.9,.65,z); g.add(bk); }
    return g;
  }},
  {id:'piano', name:'Pianoforte a coda', icon:'🎹', cost:1000000, desc:'Nero lucido, sotto le vetrate.', col:[-10.4,-8.0,-14.6,-12.8], build(){
    const g = new THREE.Group(); g.position.set(-9.2, 0, -13.7); g.rotation.y = .5; scene.add(g);
    const black = new THREE.MeshStandardMaterial({color:0x0b0d10, roughness:.12, metalness:.5});
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5,.22,2.1), black); body.position.y = .82; body.castShadow = true; g.add(body);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.4,.05,1.9), black); lid.position.set(-.1,1.15,0); lid.rotation.z = -.35; g.add(lid);
    const keys = new THREE.Mesh(new THREE.BoxGeometry(.28,.06,1.3), new THREE.MeshStandardMaterial({color:0xf4f2ec, roughness:.3})); keys.position.set(.66,.9,0); g.add(keys);
    for (const [x,z] of [[-.55,-.85],[.55,-.85],[0,.9]]){ const l = new THREE.Mesh(new THREE.CylinderGeometry(.06,.05,.8,10), black); l.position.set(x,.4,z); g.add(l); }
    return g;
  }},
  {id:'art', name:'Scultura d\'autore in oro', icon:'🗿', cost:5000000, desc:'Il pezzo che fa capire a tutti come è andata.', col:[-19.6,-18.4,-19.6,-18.4], build(){
    const g = new THREE.Group(); g.position.set(-19, 0, -19); scene.add(g);
    const gold = new THREE.MeshStandardMaterial({color:0xd8ac3a, roughness:.15, metalness:1});
    const base = new THREE.Mesh(new THREE.BoxGeometry(1,.9,1), new THREE.MeshStandardMaterial({color:0x1b1b1b, roughness:.3}));
    base.position.y = .45; base.castShadow = true; g.add(base);
    for (let k=0;k<5;k++){ const t = new THREE.Mesh(new THREE.TorusKnotGeometry(.22 - k*.03, .05, 48, 8), gold); t.position.y = 1.15 + k*.28; t.rotation.set(k*.4, k*.7, 0); t.castShadow = true; g.add(t); }
    return g;
  }},
  {id:'trophy', name:'Trofeo Maker dell\'anno', icon:'🥇', cost:8000, desc:'Un premio dorato per il tuo successo.', col:[-11.0,-10.4,-12.65,-12.05], build(){
    const g = new THREE.Group(); g.position.set(-10.7, 0, -12.35);
    part3(g, BOX(.55,1.0,.55), DM(0xf2f2f2,.4), 0,.5,0);
    const gold = DM(0xf5c542,.22,{metalness:.9, emissive:0x3a2a00, emissiveIntensity:.4});
    part3(g, new THREE.CylinderGeometry(.14,.16,.08,20), DM(0x1a1a1a,.4), 0,1.04,0);
    part3(g, new THREE.CylinderGeometry(.03,.05,.2,12), gold, 0,1.18,0);
    part3(g, new THREE.CylinderGeometry(.17,.06,.26,24,1,true), gold, 0,1.41,0);
    for (const s of [-1,1]){ const h = part3(g, new THREE.TorusGeometry(.07,.015,8,16,Math.PI), gold, s*.18,1.43,0); h.rotation.z = -s*Math.PI/2; }
    return g; }},
];
DECOR.forEach(d=>{ d.obj = d.build(); d.obj.visible = false; scene.add(d.obj); });
// la lampada da terra illumina davvero (luce sempre presente, accesa solo se acquistata)
officeAnim.lampLight = new THREE.PointLight(0xffd6a0, 0, 7, 2);
officeAnim.lampLight.position.set(-4.6, 1.55, -17.3); scene.add(officeAnim.lampLight);

// scrivania moderna con computer e sedia da ufficio
{
  const g = new THREE.Group(); g.position.set(ST.computer.x,0,ST.computer.z); scene.add(g);
  const top = DM(0xb88a5a,.5), metal = DM(0x2b2f36,.35,{metalness:.6});
  part3(g, BOX(2.6,.06,1.15), top, 0,.9,0);
  for (const x of [-1.2,1.2]){ part3(g, BOX(.08,.87,.9), metal, x,.44,0); }
  part3(g, BOX(2.3,.35,.03), metal, 0,.6,-.5);
  box(1.1,.7,.08,[MAT.black,MAT.black,MAT.black,MAT.black,MAT.screen,MAT.black],0,1.45,-.25,g);
  part3(g, BOX(.08,.3,.08), metal, 0,1.08,-.3);
  part3(g, BOX(.3,.02,.22), metal, 0,.94,-.3);
  part3(g, BOX(.7,.03,.24), DM(0x1c1c1c,.5), 0,.945,.2);
  part3(g, BOX(.12,.03,.18), DM(0x1c1c1c,.5), .55,.945,.2);
  part3(g, BOX(.3,.02,.25), DM(0x333b48,.8), .55,.93,.2);
  box(.35,.7,.8,MAT.pcTower,-1.55,.35,-.05,g);
  box(.02,.5,.04,MAT.orangeGlow,-1.37,.35,.35,g);
  const lab = makeWallTag('Computer — progetti & vendite','#ffd23f',2.0); lab.position.set(0,2.05,-.735); g.add(lab);
  const aiGlow = new THREE.Mesh(new THREE.BoxGeometry(.02,.5,.04), new THREE.MeshBasicMaterial({color:0x35e0ff}));
  aiGlow.position.set(-1.37,.35,.35); aiGlow.visible = false; g.add(aiGlow); officeRefs.aiGlow = aiGlow;
  const aiTag = makeWallTag('AI attiva', '#35e0ff', .7); aiTag.position.set(-1.55,.8,.415); aiTag.scale.setScalar(.5); aiTag.visible = false; g.add(aiTag); officeRefs.aiTag = aiTag;
  addCol(ST.computer.x-1.75, ST.computer.x+1.3, ST.computer.z-.6, ST.computer.z+.58);
  // sedia girata di lato, fuori dal passaggio
  const ch = new THREE.Group(); ch.position.set(ST.computer.x + 1.95, 0, ST.computer.z + .8); ch.rotation.y = -2.2; scene.add(ch);
  const blk = DM(0x1f2329,.6), mesh5 = DM(0x2a2f38,.9);
  for (let k=0;k<5;k++){ const a = k/5*Math.PI*2; const leg = part3(ch, BOX(.04,.03,.3), metal, Math.sin(a)*.15,.06,Math.cos(a)*.15); leg.rotation.y = a;
    part3(ch, new THREE.SphereGeometry(.03,8,6), blk, Math.sin(a)*.3,.03,Math.cos(a)*.3, false); }
  part3(ch, new THREE.CylinderGeometry(.03,.03,.38,8), metal, 0,.28,0);
  part3(ch, BOX(.5,.08,.48), blk, 0,.5,0);
  part3(ch, BOX(.46,.62,.05), mesh5, 0,.9,-.24).rotation.x = -.1;
  for (const s of [-1,1]) part3(ch, BOX(.04,.2,.3), blk, s*.26,.64,0);
  addCol(ST.computer.x + 1.65, ST.computer.x + 2.25, ST.computer.z + .5, ST.computer.z + 1.1);
}
// TETTO DELLO STUDIO: cartongesso, travi di legno, lucernario e faretti
{
  const slab = officeRefs.slab;
  const ceil = new THREE.MeshStandardMaterial({color:0xf2f1ee, roughness:.95, emissive:0x1c1c1a});
  const beamM = new THREE.MeshStandardMaterial({color:0x7a5333, roughness:.8});
  const glassM = new THREE.MeshStandardMaterial({color:0xd4ecff, roughness:.05, metalness:.1, transparent:true, opacity:.16, depthWrite:false, side:THREE.DoubleSide});
  const grp = new THREE.Group(); scene.add(grp); officeRefs.ceil = grp;
  const add = m => { grp.add(m); return m; };
  const panel = (x0, x1, z0, z1) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1-x0, .16, z1-z0), ceil);
    m.position.set((x0+x1)/2, 3.48, (z0+z1)/2); m.receiveShadow = true; add(m);
  };
  panel(-20, -14.2, -20, -11); panel(-9.8, -4, -20, -11);
  panel(-14.2, -9.8, -20, -18.6); panel(-14.2, -9.8, -12.4, -11);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 6.2), glassM);
  sky.rotation.x = Math.PI/2; sky.position.set(-12, 3.46, -15.5); add(sky);          // lucernario
  for (const z of [-18.6, -12.4]) add(new THREE.Mesh(new THREE.BoxGeometry(4.6, .18, .16), beamM)).position.set(-12, 3.42, z);
  for (const x of [-14.3, -9.7]) add(new THREE.Mesh(new THREE.BoxGeometry(.16, .18, 6.4), beamM)).position.set(x, 3.42, -15.5);
  for (let z = -19.2; z < -11; z += 1.55) add(new THREE.Mesh(new THREE.BoxGeometry(16, .14, .18), beamM)).position.set(-12, 3.34, z);
  const spotM = new THREE.MeshBasicMaterial({color:0xf6f2e2});
  const ringM = new THREE.MeshStandardMaterial({color:0xdadde2, roughness:.4, metalness:.5});
  const spots = [];
  for (const x of [-18.4, -16.2, -7.8, -5.6]) for (const z of [-18.4, -15.5, -12.6]){
    add(new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .04, 16), ringM)).position.set(x, 3.38, z);
    const d = add(new THREE.Mesh(new THREE.CircleGeometry(.085, 16), spotM)); d.rotation.x = Math.PI/2; d.position.set(x, 3.355, z); spots.push(d);
  }
  officeRefs.ceilSpots = spots;
  officeRefs.ceilLights = [];
  for (const [x, z] of [[-16.5, -15.5], [-7.5, -15.5]]){
    const l = new THREE.PointLight(0xffe9c4, 0, 16, 1.6); l.position.set(x, 3.1, z); scene.add(l); officeRefs.ceilLights.push(l);
  }
  addCam(-20.2, -3.8, 3.3, 3.7, -20.2, -10.8);
}
// PRINT FARM su più piani: sala grande a destra del laboratorio, 100 stampanti per piano
const FARM = {x0:13, x1:33, z0:-13, z1:9, aisleX:14.3};
const FARM_OPEN = {z0:-8.6, z1:-1.4};
const FARM_BANDS = [{z0:-11.7, z1:-9.9, c:-10.8}, {z0:-7.4, z1:-5.6, c:-6.5}, {z0:-3.1, z1:-1.3, c:-2.2}, {z0:1.2, z1:3.0, c:2.1}, {z0:5.5, z1:7.3, c:6.4}];
const FARM_ROWS = [
  {z:-12.3, f:1, tag:-.695}, {z:-9.3, f:-1, tag:-.625}, {z:-8.0, f:1, tag:-.625},
  {z:-5.0, f:-1, tag:-.625}, {z:-3.7, f:1, tag:-.625}, {z:-0.7, f:-1, tag:-.625},
  {z:0.6, f:1, tag:-.625}, {z:3.6, f:-1, tag:-.625}, {z:4.9, f:1, tag:-.625}, {z:7.9, f:-1, tag:-.695},
];
const FARM_DIV = [-8.65, -4.35, -0.05, 4.25];
const LIFT = {x:13.9, z:8.1};
const FLOOR_SIZE = 100, MAX_FLOOR = 2;                      // 2 piani da 100 stampanti + lo studio panoramico
{
  const H = WALL_H, W = .15, CH = H + .2;
  const wallMat = new THREE.MeshStandardMaterial({color:0xf4f3f0, roughness:.95, emissive:0x2a2a28});
  const trimMat = new THREE.MeshStandardMaterial({color:0xcfd2d6, roughness:.5, metalness:.1});
  const slab = officeRefs.slab;
  slab(wallMat, 13,34, 0,H, -14,-13);
  slab(wallMat, 33,34, 0,H, -13,10);
  slab(wallMat, 13,34, 0,H, 9,10);
  for (const [x0,x1,z0,z1] of [[12.95,34.05,-14.05,-12.95],[32.95,34.05,-13,10],[12.95,34.05,8.95,10.05]]) slab(trimMat, x0,x1, H, H+.08, z0,z1);
  for (const [x0,x1,z0,z1] of [[13,33,-13,-12.97],[32.97,33,-13,9],[13,33,8.97,9]]) slab(trimMat, x0,x1, 0, .12, z0,z1, true);
  // la parete destra del laboratorio chiude solo fino a z 10: il resto è la farm
  slab(wallMat, 12,13, 0,H, -13,-10);
  slab(trimMat, 11.95,13.05, 0,3.08, FARM_OPEN.z0-.08, FARM_OPEN.z0); slab(trimMat, 11.95,13.05, 0,3.08, FARM_OPEN.z1, FARM_OPEN.z1+.08);
  slab(trimMat, 11.95,13.05, 3.0,3.08, FARM_OPEN.z0, FARM_OPEN.z1);
  instBlocks([[33,H,-14],[33,H,9]], MAT.glow);
  addCol(13,34,-14,-13); addCol(33,34,-14,10); addCol(12,34,9,10); addCol(12,13,-13,-10);
  addCam(13-W,34+W,0,CH,-14-W,-13+W); addCam(33-W,34+W,0,CH,-14,10); addCam(12,34+W,0,CH,9-W,10+W);
  // pavimento industriale con corsie gialle
  const FW = FARM.x1 - FARM.x0, FD = FARM.z1 - FARM.z0;
  const c = mkCanvas(1024, 1024), g = c.getContext('2d');
  const sx = 1024/FW, sz = 1024/FD;
  g.fillStyle = '#9ea3a8'; g.fillRect(0,0,1024,1024);
  for (let i=0;i<30000;i++){ g.fillStyle = `rgba(${TR()<.5?'40,45,50':'255,255,255'},${TR()*.08})`; g.fillRect(TR()*1024|0, TR()*1024|0, 2, 2); }
  g.fillStyle = '#e8b923';
  const line = (x0,z0,x1,z1) => g.fillRect((x0-FARM.x0)*sx, (z0-FARM.z0)*sz, Math.max(3,(x1-x0)*sx), Math.max(3,(z1-z0)*sz));
  for (const b of FARM_BANDS){ line(15, b.z0+.05, 30.6, b.z0+.12); line(15, b.z1-.12, 30.6, b.z1-.05); }
  line(14.75, -13, 14.82, 8.9);
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center';
  g.fillText('PRINT FARM LDMprint', (23-FARM.x0)*sx, (-1.5-FARM.z0)*sz);
  const ft = new THREE.CanvasTexture(c); ft.anisotropy = MAX_ANI;
  const farmFloor = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), reflectiveMat(ft, 0xb9bcc0, .3, .1, .2));
  farmFloor.rotation.x = -Math.PI/2; farmFloor.position.set((FARM.x0+FARM.x1)/2, .015, (FARM.z0+FARM.z1)/2); farmFloor.receiveShadow = true; scene.add(farmFloor);
  officeRefs.farmFloor = farmFloor;
  // divisori con le targhette
  const peg = mkCanvas(128,128), pg = peg.getContext('2d');
  pg.fillStyle = '#c9ccd1'; pg.fillRect(0,0,128,128); pg.fillStyle = '#8d9299';
  for (let y=8;y<128;y+=16) for (let x=8;x<128;x+=16){ pg.beginPath(); pg.arc(x,y,2.2,0,Math.PI*2); pg.fill(); }
  const pegT = new THREE.CanvasTexture(peg); pegT.wrapS = pegT.wrapT = THREE.RepeatWrapping; pegT.repeat.set(20, 3);
  const pegM = new THREE.MeshStandardMaterial({map:pegT, roughness:.6, metalness:.3});
  const steel = new THREE.MeshStandardMaterial({color:0x5b6470, roughness:.4, metalness:.6});
  const ledM = new THREE.MeshBasicMaterial({color:0xeaf4ff});
  const FARM_EQUIP = new THREE.Group(); scene.add(FARM_EQUIP); officeRefs.farmEquip = FARM_EQUIP;
  const sceneAdd = o => FARM_EQUIP.add(o);
  for (const z of FARM_DIV){
    const p = new THREE.Mesh(new THREE.BoxGeometry(16.2, 2.4, .04), pegM); p.position.set(22.6, 1.2, z); p.receiveShadow = true; sceneAdd(p);
    for (const x of [14.6, 22.6, 30.6]){ const post = new THREE.Mesh(new THREE.BoxGeometry(.08, 2.6, .08), steel); post.position.set(x, 1.3, z); post.castShadow = true; sceneAdd(post); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(16.2, .06, .3), steel); bar.position.set(22.6, 2.6, z); sceneAdd(bar);
    for (const s of [-1,1]){ const l = new THREE.Mesh(new THREE.BoxGeometry(16, .03, .05), ledM); l.position.set(22.6, 2.56, z + s*.12); sceneAdd(l); }
    addCol(14.6, 30.6, z-.05, z+.05);
  }
  for (const z of [-12.93, 8.93]){ const wl = new THREE.Mesh(new THREE.BoxGeometry(16, .05, .08), ledM); wl.position.set(22.6, 2.7, z); sceneAdd(wl); }
  const t1 = makeWallTag('Print farm · 10 piani da 100 stampanti', '#7fd0ff', 2.8); t1.position.set(11.985, 3.45, (FARM_OPEN.z0+FARM_OPEN.z1)/2); t1.rotation.y = -Math.PI/2; sceneAdd(t1);
  const t2 = makeWallTag('Print farm', '#7fd0ff', 1.8); t2.position.set(13.015, 3.45, (FARM_OPEN.z0+FARM_OPEN.z1)/2); t2.rotation.y = Math.PI/2; sceneAdd(t2);
  logoPanel(2.4, 1.8, 32.96, 2.2, -2, -Math.PI/2);
  // ASCENSORE per i piani
  const lg = new THREE.Group(); lg.position.set(LIFT.x, 0, LIFT.z); scene.add(lg);
  const cab = new THREE.MeshStandardMaterial({color:0x7d8794, roughness:.35, metalness:.75});
  const doorM = new THREE.MeshStandardMaterial({color:0xb9c2cc, roughness:.25, metalness:.85});
  const pb = (w,h,d,m,x,y,z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); b.position.set(x,y,z); b.castShadow = true; b.receiveShadow = true; lg.add(b); return b; };
  pb(1.5,2.6,.12,cab,0,1.3,.52);
  for (const s of [-1,1]) pb(.12,2.6,1.1,cab,s*.69,1.3,0);
  pb(1.5,.12,1.1,cab,0,2.56,0);
  for (const s of [-1,1]) pb(.66,2.3,.08,doorM,s*.34,1.15,-.52);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(.22,.4,.05), new THREE.MeshStandardMaterial({color:0x1b2230, roughness:.3, emissive:0x102030}));
  panel.position.set(.85,1.4,-.4); lg.add(panel);
  officeRefs.liftSign = makeWallTag('Ascensore · piano 1', '#ffd23f', 1.4);
  officeRefs.liftSign.position.set(0, 2.85, -.56); officeRefs.liftSign.rotation.y = Math.PI; lg.add(officeRefs.liftSign);
  addCol(LIFT.x-.78, LIFT.x+.78, LIFT.z-.62, LIFT.z+.62);
  addCam(LIFT.x-.8, LIFT.x+.8, 0, 2.7, LIFT.z-.62, LIFT.z+.62);
  // cartello grande del piano sulla parete di fondo
  officeRefs.floorSign = makeWallTag('PIANO 1', '#7fd0ff', 3.2);
  officeRefs.floorSign.position.set(22.6, 3.5, -12.96); scene.add(officeRefs.floorSign);
}
// 100 postazioni per piano: 10 file da 10
const PRINTER_SLOTS = [];
for (const row of FARM_ROWS) for (let i=0;i<10;i++)
  PRINTER_SLOTS.push({x:15.4 + i*1.6, z:row.z, f:row.f, r:row.f > 0 ? 0 : Math.PI, tag:row.tag});
// BANCO CONTROLLO QUALITÀ (si compra nel Negozio)
const QA_POS = {x:8, z:-9.35};
const qaObj = (()=>{
  const g = new THREE.Group(); g.position.set(QA_POS.x, 0, QA_POS.z); g.visible = false; scene.add(g);
  const top = new THREE.MeshStandardMaterial({color:0xdfe4ea, roughness:.3, metalness:.4});
  const leg = new THREE.MeshStandardMaterial({color:0x3b4250, roughness:.4, metalness:.6});
  const pb = (w,h,d,m,x,y,z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); b.position.set(x,y,z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  pb(1.6,.06,.9,top,0,.92,0);
  for (const [x,z] of [[-.75,-.4],[.75,-.4],[-.75,.4],[.75,.4]]) pb(.06,.9,.06,leg,x,.45,z);
  pb(1.5,.03,.8,leg,0,.25,0);
  // lampada con lente d'ingrandimento
  pb(.04,.6,.04,leg,-.5,1.25,-.3);
  const arm = pb(.5,.04,.04,leg,-.3,1.55,-.2); arm.rotation.y = -.5;
  const lens = new THREE.Mesh(new THREE.TorusGeometry(.12,.02,8,24), leg); lens.position.set(-.08,1.5,-.05); lens.rotation.x = Math.PI/2.4; g.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(.11,24), new THREE.MeshStandardMaterial({color:0xcfe8ff, transparent:true, opacity:.35, roughness:.05})); glass.position.copy(lens.position); glass.rotation.x = -Math.PI/2 + .3; g.add(glass);
  // pezzi da controllare, calibro e cestino degli scarti
  const cols = [0xff7a1a, 0x2ec4b6, 0xe84393];
  cols.forEach((c,k)=>pb(.12,.1,.12,new THREE.MeshStandardMaterial({color:c, roughness:.5}), .1 + k*.18, 1.0, .15));
  pb(.3,.02,.05,new THREE.MeshStandardMaterial({color:0xc0c6cf, roughness:.2, metalness:.9}), .45, .96, -.2);
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(.22,.18,.5,16,1,true), new THREE.MeshStandardMaterial({color:0xb03a2e, roughness:.6, side:THREE.DoubleSide}));
  bin.position.set(1.1,.25,.1); g.add(bin);
  const tag = makeWallTag('Controllo qualità', '#9be89b', 1.3); tag.position.set(0, 2.0, -.625); g.add(tag);
  return g;
})();
const QA_COL = {x0:QA_POS.x-.85, x1:QA_POS.x+1.35, z0:QA_POS.z-.5, z1:-9.95 + 1.0};

// BANCONE RITIRI IN SEDE (clienti di Subito che passano a prendere il pacco)
const COUNTER = {x:3.4, z:9.35};
const counterObj = (()=>{
  const g = new THREE.Group(); g.position.set(COUNTER.x, 0, COUNTER.z); scene.add(g);
  const wood = new THREE.MeshStandardMaterial({color:0xb88a5a, roughness:.5});
  const front = new THREE.MeshStandardMaterial({color:0x1d3f86, roughness:.4});
  const pb = (w,h,d,m,x,y,z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); b.position.set(x,y,z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  pb(1.4,1.0,.55,front,0,.5,0);
  pb(1.5,.05,.62,wood,0,1.02,0);
  const boxes = [];
  for (let k=0;k<3;k++){ const b = pb(.3,.24,.3,MAT.cardboard,-.45 + k*.45,1.17,0); b.visible = false; boxes.push(b); }
  g.userData.boxes = boxes;
  const tag = makeWallTag('Ritiro in sede', '#ffd23f', 1.1); tag.position.set(0, 1.85, .63); tag.rotation.y = Math.PI; g.add(tag);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(.05,12,8,0,Math.PI*2,0,Math.PI/2), new THREE.MeshStandardMaterial({color:0xd8b24a, roughness:.2, metalness:.9}));
  bell.position.set(.6,1.045,-.18); g.add(bell);
  addCol(COUNTER.x-.72, COUNTER.x+.72, COUNTER.z-.3, 10);
  return g;
})();

// PIOGGIA: gocce vicino alla telecamera e scie sulle vetrate
const RAIN = {level:0, lines:null, n:1400, pos:null, speed:null};
{
  const n = RAIN.n, pos = new Float32Array(n*6), sp = new Float32Array(n);
  for (let i=0;i<n;i++){ sp[i] = 16 + Math.random()*6; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:0xaec8e6, transparent:true, opacity:0, depthWrite:false}));
  m.frustumCulled = false; m.visible = false; scene.add(m);
  RAIN.lines = m; RAIN.pos = pos; RAIN.speed = sp;
}
const rainTex = (()=>{
  const c = mkCanvas(256,256), g = c.getContext('2d');
  g.clearRect(0,0,256,256);
  for (let i=0;i<160;i++){
    const x = Math.random()*256, y = Math.random()*256, l = 6 + Math.random()*26;
    g.strokeStyle = `rgba(255,255,255,${.25 + Math.random()*.4})`; g.lineWidth = 1 + Math.random();
    g.beginPath(); g.moveTo(x,y); g.lineTo(x + (Math.random()-.5)*3, y + l); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(x + (Math.random()-.5)*3, y + l, 1.4, 0, Math.PI*2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
  return t;
})();
const underRoof = (x, z) => (x > -13 && x < 32 && z > -11 && z < 11 && !(x > 13 && z > 8));
function updateRain(dt, cx, cz, level){
  RAIN.level = level;
  RAIN.lines.visible = level > .02;
  RAIN.lines.material.opacity = .75 * level;
  if (!RAIN.lines.visible) return;
  const P = RAIN.pos, n = RAIN.n, active = Math.floor(n * level);
  for (let i=0;i<n;i++){
    const o = i*6;
    if (i >= active){ P[o+1] = P[o+4] = -50; continue; }
    let x = P[o], y = P[o+1], z = P[o+2];
    const floor = underRoof(x, z) ? WALL_H + .15 : 0;
    y -= RAIN.speed[i]*dt;
    if (y < floor || Math.abs(x - cx) > 26 || Math.abs(z - cz) > 26 || P[o+1] < -40){
      x = cx + (Math.random()-.5)*50; z = cz + (Math.random()-.5)*50; y = 8 + Math.random()*14;
    }
    P[o] = x; P[o+1] = y; P[o+2] = z;
    P[o+3] = x + .02; P[o+4] = y + .55; P[o+5] = z + .02;
  }
  RAIN.lines.geometry.attributes.position.needsUpdate = true;
}

// STUDIO PANORAMICO: l'ultimo piano della torre è un solo grande ufficio
const STUDIO = {group:null, wall:null, col:{x0:12, x1:13, z0:FARM_OPEN.z0, z1:FARM_OPEN.z1, off:true}};
{
  const g = new THREE.Group(); g.visible = false; scene.add(g); STUDIO.group = g;
  const cx = (FARM.x0 + FARM.x1)/2, cz = (FARM.z0 + FARM.z1)/2, FW = FARM.x1 - FARM.x0, FD = FARM.z1 - FARM.z0;
  // parquet su tutto il piano
  const pc = mkCanvas(512, 512), pg2 = pc.getContext('2d');
  pg2.fillStyle = '#8a5a2e'; pg2.fillRect(0,0,512,512);
  for (let r=0;r<8;r++) for (let c=0;c<4;c++){
    const x = c*128 + (r%2 ? 64 : 0), y = r*64;
    pg2.fillStyle = `rgba(${150+Math.random()*40|0},${95+Math.random()*30|0},${50+Math.random()*25|0},1)`;
    pg2.fillRect(x+1, y+1, 126, 62);
    for (let k=0;k<24;k++){ pg2.strokeStyle = `rgba(90,55,25,${Math.random()*.25})`; pg2.beginPath(); pg2.moveTo(x+2, y+Math.random()*62); pg2.lineTo(x+126, y+Math.random()*62); pg2.stroke(); }
  }
  const pt = new THREE.CanvasTexture(pc); pt.wrapS = pt.wrapT = THREE.RepeatWrapping; pt.repeat.set(FW/4, FD/4); pt.anisotropy = MAX_ANI;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), reflectiveMat(pt, 0xbda27f, .18, .35, .25));
  floor.rotation.x = -Math.PI/2; floor.position.set(cx, .025, cz); floor.receiveShadow = true; g.add(floor);
  const M = {
    wood: new THREE.MeshStandardMaterial({color:0x6b4426, roughness:.55}),
    dark: new THREE.MeshStandardMaterial({color:0x22262e, roughness:.5}),
    steel: new THREE.MeshStandardMaterial({color:0xb9c2cc, roughness:.3, metalness:.8}),
    fabric: new THREE.MeshStandardMaterial({color:0x33415a, roughness:.95}),
    fabric2: new THREE.MeshStandardMaterial({color:0x7d8fa6, roughness:.95}),
    rug: new THREE.MeshStandardMaterial({color:0x1d3f86, roughness:.98}),
    leaf: new THREE.MeshStandardMaterial({color:0x2f7d3a, roughness:.85}),
    glass: new THREE.MeshStandardMaterial({color:0xcfe8ff, roughness:.05, metalness:.1, transparent:true, opacity:.2, depthWrite:false, side:THREE.DoubleSide}),
  };
  const bx = (w,h,d,m,x,y,z,p) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); b.position.set(x,y,z); b.castShadow = true; b.receiveShadow = true; (p||g).add(b); return b; };
  const cols = [];
  const furn = (x0,x1,z0,z1) => cols.push({x0, x1, z0, z1});
  // vetrate panoramiche sulle pareti est e sud
  for (let z = FARM.z0 + 1.5; z < FARM.z1 - 3.2; z += 3){
    const cz2 = z + 1.5;
    if (Math.abs(cz2 + 2) < 2.6) continue;                       // lascia libero il logo LDMprint
    bx(.08, 2.9, 2.7, M.steel, FARM.x1 - .12, 1.5, z);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), M.glass); w.rotation.y = -Math.PI/2; w.position.set(FARM.x1 - .06, 1.6, cz2); g.add(w);
  }
  // zona direzionale: scrivania grande, poltrona e libreria
  bx(3.2, .1, 1.5, M.wood, cx + 6, .78, FARM.z0 + 3.2); furn(cx + 4.3, cx + 7.7, FARM.z0 + 2.3, FARM.z0 + 4.1);
  for (const sx of [-1.4, 1.4]) bx(.12, .78, 1.3, M.dark, cx + 6 + sx, .39, FARM.z0 + 3.2);
  bx(.7, .12, .7, M.dark, cx + 6, .45, FARM.z0 + 4.4); bx(.7, .8, .14, M.fabric, cx + 6, .85, FARM.z0 + 4.75);
  bx(4, 2.2, .4, M.wood, cx - 6, 1.1, FARM.z0 + .5); furn(cx - 8, cx - 4, FARM.z0 + .25, FARM.z0 + .8);
  for (let k=0;k<4;k++) bx(3.8, .06, .36, M.dark, cx - 6, .45 + k*.5, FARM.z0 + .5);
  // tavolo riunioni con otto sedie
  bx(4.6, .12, 1.8, M.wood, cx, .76, cz - 3); furn(cx - 2.5, cx + 2.5, cz - 4.1, cz - 1.9);
  bx(.5, .74, 1.4, M.dark, cx, .37, cz - 3);
  for (const sz of [-1.35, 1.35]) for (const sx of [-1.6, -.55, .55, 1.6]){
    bx(.45, .08, .45, M.fabric, cx + sx, .45, cz - 3 + sz);
    bx(.45, .5, .08, M.fabric, cx + sx, .72, cz - 3 + sz + (sz > 0 ? .2 : -.2));
  }
  // salotto con tappeto e divani
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), M.rug); rug.rotation.x = -Math.PI/2; rug.position.set(cx - 2.5, .035, cz + 4); g.add(rug);
  for (const [dx, dz, rot] of [[-2.2, -1.8, 0], [-2.2, 1.8, Math.PI], [-4.4, 0, Math.PI/2]]){
    const so = new THREE.Group(); so.position.set(cx - 2.5 + dx*.9, 0, cz + 4 + dz); so.rotation.y = rot; g.add(so);
    bx(2.4, .42, .9, M.fabric, 0, .28, 0, so); bx(2.4, .55, .22, M.fabric2, 0, .72, -.4, so);
    furn(so.position.x - 1.3, so.position.x + 1.3, so.position.z - .6, so.position.z + .6);
  }
  bx(1.4, .1, .8, M.wood, cx - 2.5, .42, cz + 4); furn(cx - 3.3, cx - 1.7, cz + 3.5, cz + 4.5);
  // bar e piante
  bx(2.6, 1.1, .8, M.wood, cx + 6, .55, cz + 5); furn(cx + 4.6, cx + 7.4, cz + 4.5, cz + 5.5);
  bx(2.8, .08, .9, M.steel, cx + 6, 1.14, cz + 5);
  for (const [x, z] of [[FARM.x0 + 2, FARM.z1 - 2], [FARM.x1 - 1.6, FARM.z0 + 1.2], [cx + 2, cz + 6], [FARM.x0 + 2, cz]]){
    bx(.5, .5, .5, M.dark, x, .25, z);
    const p2 = new THREE.Mesh(new THREE.SphereGeometry(.65, 12, 10), M.leaf); p2.position.set(x, 1.1, z); p2.scale.y = 1.25; p2.castShadow = true; g.add(p2);
    furn(x - .45, x + .45, z - .45, z + .45);
  }
  const sign = makeWallTag('Studio panoramico · LDMprint', '#ffd23f', 3.4); sign.position.set(cx, 3.2, FARM.z0 + .04); g.add(sign);
  STUDIO.cols = cols;
  // parete che chiude il passaggio verso il laboratorio quando sei al piano studio
  const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 3, FARM_OPEN.z1 - FARM_OPEN.z0),
    new THREE.MeshStandardMaterial({color:0xf4f3f0, roughness:.95, emissive:0x2a2a28}));
  wall.position.set(12.5, 1.5, (FARM_OPEN.z0 + FARM_OPEN.z1)/2); wall.receiveShadow = true; g.add(wall);
  STUDIO.wall = wall;
}
// ALTALENA in giardino: due cavalletti a A uniti dalla trave, seduta appesa che dondola avanti e indietro
const SWING = {x:-9, z:16.5, obj:null, seat:null, ropes:[], angle:0, vel:0, rider:false, sat:0};
{
  const g = new THREE.Group(); g.position.set(SWING.x, 0, SWING.z); scene.add(g); SWING.obj = g;
  const wood = new THREE.MeshStandardMaterial({color:0x9a6b3f, roughness:.8});
  const woodD = new THREE.MeshStandardMaterial({color:0x6f4726, roughness:.85});
  const rope = new THREE.MeshStandardMaterial({color:0xcbb289, roughness:.95});
  const steel = new THREE.MeshStandardMaterial({color:0x8d96a3, roughness:.4, metalness:.7});
  const pb = (w,h,d,m,x,y,z,p) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); b.position.set(x,y,z); b.castShadow = true; b.receiveShadow = true; (p||g).add(b); return b; };
  // due cavalletti a A, uno per lato: le gambe si aprono avanti e indietro (lungo z)
  for (const sx of [-1, 1]){
    for (const sz of [-1, 1]){
      const leg = pb(.13, 2.62, .13, wood, sx*1.12, 1.3, sz*.82);
      leg.rotation.x = -sz*.32;
    }
    pb(.1, .1, 1.25, woodD, sx*1.12, .95, 0);                 // traversa del cavalletto
  }
  pb(2.6, .15, .15, woodD, 0, 2.5, 0);                        // trave superiore, lungo x
  for (const sx of [-1, 1]) pb(.2, .12, .2, steel, sx*.27, 2.44, 0);   // ganci
  // seduta appesa: ruota attorno alla trave (asse x), quindi dondola avanti e indietro
  const pivot = new THREE.Group(); pivot.position.set(0, 2.44, 0); g.add(pivot); SWING.seat = pivot;
  for (const sx of [-1, 1]) SWING.ropes.push(pb(.03, 1.5, .03, rope, sx*.27, -.75, 0, pivot));
  pb(.62, .07, .42, woodD, 0, -1.52, 0, pivot);               // asse della seduta
  pb(.62, .05, .06, woodD, 0, -1.46, -.2, pivot);             // bordo anteriore
  const tag = makeWallTag('Altalena', '#ffd23f', .9); tag.position.set(0, 2.82, 0); g.add(tag);
  // collisioni solo sulle gambe: il centro resta libero per sedersi
  for (const sx of [-1, 1]){
    addCol(SWING.x + sx*1.12 - .3, SWING.x + sx*1.12 + .3, SWING.z - 1.2, SWING.z + 1.2);
    addCam(SWING.x + sx*1.12 - .3, SWING.x + sx*1.12 + .3, 0, 2.6, SWING.z - 1.2, SWING.z + 1.2);
  }
}
// cuccia di Jarvis nel giardino
const KENNEL = {x:9.2, z:17};
const DOG_BOWLS = {food:{x:7.3, z:18.9}, water:{x:7.3, z:19.75}};
const DOG_YARD = {x0:5, x1:21, z0:13, z1:31};
{
  const g = new THREE.Group(); g.position.set(KENNEL.x, 0, KENNEL.z); g.rotation.y = -Math.PI/2; scene.add(g);
  const wood = new THREE.MeshStandardMaterial({color:0xb07a45, roughness:.8});
  const woodD = new THREE.MeshStandardMaterial({color:0x8a5a2e, roughness:.8});
  const roofM = new THREE.MeshStandardMaterial({color:0xb03a2e, roughness:.6});
  const dark = new THREE.MeshStandardMaterial({color:0x140e0a, roughness:1});
  const pb = (w,h,d,m,x,y,z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); b.position.set(x,y,z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  pb(1.3,.08,1.5,woodD,0,.04,0);
  pb(1.3,.95,.06,wood,0,.55,-.72);
  pb(.06,.95,1.5,wood,-.62,.55,0); pb(.06,.95,1.5,wood,.62,.55,0);
  // facciata con apertura ad arco
  pb(.38,.95,.06,wood,-.46,.55,.72); pb(.38,.95,.06,wood,.46,.55,.72); pb(.54,.28,.06,wood,0,.88,.72);
  const tri = new THREE.Shape(); tri.moveTo(-.68,0); tri.lineTo(.68,0); tri.lineTo(0,.55); tri.lineTo(-.68,0);
  for (const zz of [.72,-.72]){ const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(tri,{depth:.06, bevelEnabled:false}), wood); gm.position.set(0,1.02,zz-.03); gm.castShadow = true; g.add(gm); }
  const arch = new THREE.Mesh(new THREE.CircleGeometry(.27, 24, 0, Math.PI), dark); arch.position.set(0,.74,.755); g.add(arch);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(.54,.66), dark); hole.position.set(0,.41,.755); g.add(hole);
  for (const s of [-1,1]){ const r = pb(.95,.06,1.7,roofM,s*.36,1.3,0); r.rotation.z = -s*.68; }
  pb(.08,.08,1.72,woodD,0,1.58,0);
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.1,20), new THREE.MeshStandardMaterial({color:0x2e5aa8, roughness:.95})); cushion.position.set(0,.13,.05); cushion.scale.z = 1.2; g.add(cushion);
  // targhetta col nome fissata sopra la porta
  const tag = makeWallTag('🐾 JARVIS', '#ffd23f', .9); tag.position.set(0, 1.2, .76); g.add(tag);
  addCol(KENNEL.x-.78, KENNEL.x+.78, KENNEL.z-.68, KENNEL.z+.68);
  addCam(KENNEL.x-.78, KENNEL.x+.78, 0, 1.7, KENNEL.z-.68, KENNEL.z+.68);
  // ciotole e osso
  const steel = new THREE.MeshStandardMaterial({color:0xd5dae2, roughness:.3, metalness:.35});
  for (const [k, b] of Object.entries(DOG_BOWLS)){
    const bw = new THREE.Mesh(new THREE.CylinderGeometry(.2,.15,.1,28), steel); bw.position.set(b.x,.05,b.z); bw.castShadow = true; scene.add(bw);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.2,.014,8,28), steel); rim.rotation.x = Math.PI/2; rim.position.set(b.x,.1,b.z); scene.add(rim);
    if (k === 'food'){
      const kib = new THREE.MeshStandardMaterial({color:0x7a4a22, roughness:.8}), R = mulberry32(9), sg = new THREE.SphereGeometry(1,6,5);
      for (let i=0;i<46;i++){ const a = R()*6.28, d = Math.sqrt(R())*.15; const m = new THREE.Mesh(sg, kib); m.scale.setScalar(.017); m.position.set(b.x+Math.cos(a)*d, .095+R()*.015, b.z+Math.sin(a)*d); scene.add(m); }
    } else {
      const wat = new THREE.Mesh(new THREE.CircleGeometry(.18,28), new THREE.MeshStandardMaterial({color:0x5aa9e6, roughness:.05, transparent:true, opacity:.75}));
      wat.rotation.x = -Math.PI/2; wat.position.set(b.x,.092,b.z); scene.add(wat);
    }
  }
  const bone = new THREE.Group(); bone.position.set(11.5,.05,15.2); bone.rotation.y = .7; scene.add(bone);
  const boneM = new THREE.MeshStandardMaterial({color:0xf2ead8, roughness:.6});
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.3,10), boneM); shaft.rotation.z = Math.PI/2; bone.add(shaft);
  for (const x of [-.16,.16]) for (const z of [-.035,.035]){ const k = new THREE.Mesh(new THREE.SphereGeometry(.045,10,8), boneM); k.position.set(x,0,z); bone.add(k); }
}
// unisce più parti in poche mesh (una per materiale) per reggere tante stampanti
function mergeBoxes(parts){
  const byMat = new Map();
  for (const p of parts){
    const g = new THREE.BoxGeometry(p[0], p[1], p[2]).toNonIndexed();
    g.translate(p[3], p[4], p[5]);
    if (p[7] != null){
      const col = new THREE.Color(p[7]), n = g.attributes.position.count, arr = new Float32Array(n*3);
      for (let k=0;k<n;k++){ arr[k*3] = col.r; arr[k*3+1] = col.g; arr[k*3+2] = col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }
    if (!byMat.has(p[6])) byMat.set(p[6], []);
    byMat.get(p[6]).push(g);
  }
  const out = [];
  for (const [mat, geos] of byMat){
    let total = 0; for (const g of geos) total += g.attributes.position.count;
    const merged = new THREE.BufferGeometry();
    for (const name of ['position','normal','uv','color']){
      if (!geos[0].attributes[name]) continue;
      const size = geos[0].attributes[name].itemSize, arr = new Float32Array(total*size);
      let o = 0; for (const g of geos){ arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
      merged.setAttribute(name, new THREE.BufferAttribute(arr, size));
    }
    merged.computeBoundingSphere();
    out.push({geo:merged, mat});
  }
  return out;
}
// TETTO A VETRATE e PLAFONIERE AL NEON (laboratorio e farm)
const NEON = {on:false, level:0, flick:0, tubes:null, lights:[], matOn:null, matOff:null};
{
  const Y = WALL_H + .1;
  const glass = new THREE.MeshStandardMaterial({color:0xd4ecff, roughness:.05, metalness:.1, transparent:true, opacity:.14, depthWrite:false, side:THREE.DoubleSide});
  NEON.glass = glass;
  for (const [w, d, x, z] of [[26, 22, 0, 0], [22, 25, 23.5, -1.5]]){
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), glass);
    g.rotation.x = -Math.PI/2; g.position.set(x, Y + .03, z); g.renderOrder = 2; scene.add(g);
  }
  // struttura in acciaio: travi e montanti delle vetrate
  const steel = new THREE.MeshStandardMaterial({color:0x6f7985, roughness:.35, metalness:.7});
  const beams = [];
  const grid = (x0, x1, z0, z1, sx, sz) => {
    for (let x = x0; x <= x1 + .01; x += sx) beams.push([.09, .12, z1 - z0, x, Y, (z0 + z1)/2, steel]);
    for (let z = z0; z <= z1 + .01; z += sz) beams.push([x1 - x0, .08, .07, (x0 + x1)/2, Y + .02, z, steel]);
    beams.push([x1 - x0, .22, .14, (x0 + x1)/2, Y - .06, (z0 + z1)/2, steel]);          // trave di colmo
  };
  grid(-13, 13, -11, 11, 2.6, 2.2);
  grid(12.5, 34, -14, 10, 2.5, 2);
  for (const part of mergeBoxes(beams)){ const m = new THREE.Mesh(part.geo, part.mat); m.castShadow = true; scene.add(m); }
  // plafoniere
  const housing = new THREE.MeshStandardMaterial({color:0xe8ebef, roughness:.4, metalness:.3});
  NEON.matOff = new THREE.MeshStandardMaterial({color:0xb8c0c8, roughness:.3});
  NEON.matOn = new THREE.MeshBasicMaterial({color:0xf4fbff});
  const fixtures = [];
  for (const z of [-6, -1, 4]) for (const x of [-9, -4, 1, 6]) fixtures.push([x, z]);
  for (const z of [-10.8, -6.5, -2.2, 2.1, 6.4]) for (const x of [16.5, 21, 25.5, 30]) fixtures.push([x, z]);
  const hs = [], ts = [];
  for (const [x, z] of fixtures){
    hs.push([1.7, .07, .26, x, 3.86, z, housing]);
    hs.push([.02, Y - 3.88, .02, x - .7, (Y + 3.88)/2, z, housing], [.02, Y - 3.88, .02, x + .7, (Y + 3.88)/2, z, housing]);
    ts.push([1.56, .05, .06, x, 3.81, z - .06, NEON.matOff], [1.56, .05, .06, x, 3.81, z + .06, NEON.matOff]);
  }
  for (const part of mergeBoxes(hs)){ scene.add(new THREE.Mesh(part.geo, part.mat)); }
  NEON.tubes = new THREE.Mesh(mergeBoxes(ts)[0].geo, NEON.matOff); scene.add(NEON.tubes);
  // luci vere (sempre presenti, accese solo la sera)
  for (const [x, z] of [[-6, -2], [5, 2], [18, -8], [21, 1], [29, -4]]){
    const l = new THREE.PointLight(0xeaf4ff, 0, 18, 1.6); l.position.set(x, 3.5, z); scene.add(l); NEON.lights.push(l);
  }
}

// NASTRO TRASPORTATORE sospeso: dalla farm alle casse del magazzino
const BELT = {
  pts: [{x:13.9, z:-12.4}, {x:13.9, z:-8.2}, {x:-11.2, z:-8.2}, {x:-11.2, z:-0.3}],
  y: 2.7, speed: 2.2, hopper:{x:13.9, z:-12.4},
  group: null, tex: null, boxes: [], col: {x0:13.55, x1:14.25, z0:-12.85, z1:-11.95, off:true}, posts: [],
};
{
  let tot = 0; BELT.seg = [];
  for (let i=0;i<BELT.pts.length-1;i++){ const a = BELT.pts[i], b = BELT.pts[i+1], l = Math.hypot(b.x-a.x, b.z-a.z); BELT.seg.push({a, b, l, s:tot}); tot += l; }
  BELT.len = tot;
}
function beltPos(d){
  for (const sg of BELT.seg){
    if (d <= sg.s + sg.l){ const k = clamp((d - sg.s)/sg.l, 0, 1); return {x:sg.a.x + (sg.b.x-sg.a.x)*k, z:sg.a.z + (sg.b.z-sg.a.z)*k}; }
  }
  const e = BELT.pts[BELT.pts.length-1]; return {x:e.x, z:e.z};
}
// distanza lungo il nastro fino alla cassa ci
const beltDistTo = ci => BELT.seg[0].l + BELT.seg[1].l + clamp(CHEST_SLOTS_POS[ci].z - BELT.pts[2].z, 0, BELT.seg[2].l);
{
  const g = new THREE.Group(); g.visible = false; scene.add(g); BELT.group = g;
  const c = mkCanvas(64,64), x = c.getContext('2d');
  x.fillStyle = '#23262b'; x.fillRect(0,0,64,64); x.fillStyle = '#3a3f47'; for (let i=0;i<64;i+=8) x.fillRect(i,0,3,64);
  BELT.tex = new THREE.CanvasTexture(c); BELT.tex.wrapS = BELT.tex.wrapT = THREE.RepeatWrapping;
  const steel = new THREE.MeshStandardMaterial({color:0x8d96a3, roughness:.35, metalness:.7});
  const yellow = new THREE.MeshStandardMaterial({color:0xe8b923, roughness:.5, metalness:.3});
  for (const sg of BELT.seg){
    const mx = (sg.a.x+sg.b.x)/2, mz = (sg.a.z+sg.b.z)/2, ang = Math.atan2(sg.b.z-sg.a.z, sg.b.x-sg.a.x);
    const t = BELT.tex.clone(); t.needsUpdate = true; t.repeat.set(sg.l/.5, 1); sg.tex = t;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(sg.l + .45, .06, .45), [steel, steel, new THREE.MeshStandardMaterial({map:t, roughness:.8}), steel, steel, steel]);
    belt.position.set(mx, BELT.y, mz); belt.rotation.y = -ang; belt.castShadow = true; g.add(belt);
    for (const s of [-1,1]){
      const rail = new THREE.Mesh(new THREE.BoxGeometry(sg.l + .45, .12, .04), yellow);
      rail.position.set(mx - Math.sin(ang)*.24*s, BELT.y + .06, mz + Math.cos(ang)*.24*s); rail.rotation.y = -ang; g.add(rail);
    }
  }
  // sostegni: colonne nel laboratorio, staffe sul muro sopra le casse
  for (const px of [10.5, 5.5, 0.5, -4.5]){
    const post = new THREE.Mesh(new THREE.BoxGeometry(.09, BELT.y, .09), steel); post.position.set(px, BELT.y/2, -8.2); post.castShadow = true; g.add(post);
    BELT.posts.push({x0:px-.06, x1:px+.06, z0:-8.26, z1:-8.14, off:true});
  }
  for (let z = -7.5; z <= -.5; z += 2.3){ const br = new THREE.Mesh(new THREE.BoxGeometry(.8, .05, .06), steel); br.position.set(-11.6, BELT.y - .06, z); g.add(br); }
  // tramoggia ed elevatore nella farm
  const H = BELT.hopper;
  const hb = new THREE.Mesh(new THREE.BoxGeometry(.7, .9, .7), yellow); hb.position.set(H.x, .45, H.z); hb.castShadow = true; g.add(hb);
  const fun = new THREE.Mesh(new THREE.CylinderGeometry(.45, .28, .3, 4, 1, true), new THREE.MeshStandardMaterial({color:0x8d96a3, roughness:.35, metalness:.7, side:THREE.DoubleSide}));
  fun.position.set(H.x, 1.05, H.z); fun.rotation.y = Math.PI/4; g.add(fun);
  const lift = new THREE.Mesh(new THREE.BoxGeometry(.3, BELT.y - .9, .3), steel); lift.position.set(H.x, .9 + (BELT.y-.9)/2, H.z - .2); g.add(lift);
  const tag = makeWallTag('Nastro → magazzino', '#e8b923', 1.2); tag.position.set(H.x, 1.75, -12.965); g.add(tag);
  // scatole che viaggiano sul nastro
  for (let i=0;i<24;i++){ const b = new THREE.Mesh(new THREE.BoxGeometry(.32,.26,.32), MAT.cardboard); b.visible = false; b.castShadow = true; g.add(b); BELT.boxes.push(b); }
}

// FURGONE DEL CORRIERE e scaffale del punto ritiro
const VAN = {park:{x:-5, z:13.8}, far:{x:-5, z:36}, obj:null, wheels:[], col:{x0:-6.05, x1:-3.95, z0:11.6, z1:16.2, off:true}};
const PICKUP = {x:-3.3, z:9.5};
const pickupObj = (()=>{
  const g = new THREE.Group(); g.position.set(PICKUP.x, 0, PICKUP.z); g.rotation.y = Math.PI; g.visible = false; scene.add(g);
  const steel = new THREE.MeshStandardMaterial({color:0x5b6470, roughness:.4, metalness:.6});
  for (const x of [-.68,.68]) for (const z of [-.22,.22]){ const p = new THREE.Mesh(new THREE.BoxGeometry(.05,1.6,.05), steel); p.position.set(x,.8,z); g.add(p); }
  const boxes = [];
  for (const [li, y] of [[0,.1],[1,.62],[2,1.14]]){
    const sh = new THREE.Mesh(new THREE.BoxGeometry(1.42,.04,.5), steel); sh.position.set(0,y,0); sh.receiveShadow = true; g.add(sh);
    for (let k=0;k<4;k++){ const b = new THREE.Mesh(new THREE.BoxGeometry(.3,.26,.34), MAT.cardboard); b.position.set(-.5+k*.33, y+.15, 0); b.visible = false; b.castShadow = true; g.add(b); boxes.push(b); }
  }
  const tag = makeWallTag('Ritiro corriere', '#7fd0ff', 1.2); tag.position.set(0, 1.95, .265); tag.rotation.y = 0; g.add(tag);
  g.userData.boxes = boxes;
  return g;
})();
const PICKUP_COL = {x0:PICKUP.x-.75, x1:PICKUP.x+.75, z0:PICKUP.z-.28, z1:10, off:true};
{
  const g = new THREE.Group(); g.visible = false; scene.add(g); VAN.obj = g;
  const white = new THREE.MeshStandardMaterial({color:0xf2f4f7, roughness:.35, metalness:.2});
  const navy = new THREE.MeshStandardMaterial({color:0x1d3f86, roughness:.4, metalness:.3});
  const dark = new THREE.MeshStandardMaterial({color:0x14171c, roughness:.2, metalness:.5});
  const tire = new THREE.MeshStandardMaterial({color:0x111111, roughness:.9});
  const pb = (w,h,d,m,x,y,z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); b.position.set(x,y,z); b.castShadow = true; g.add(b); return b; };
  pb(1.9,1.75,3.1,white,0,1.2,.55);
  pb(1.9,1.15,1.3,white,0,.92,-1.6);
  pb(1.86,.5,1.1,dark,0,1.52,-1.45).rotation.x = -.35;
  pb(1.94,.25,4.5,navy,0,.42,-.1);
  pb(1.7,.12,.05,new THREE.MeshBasicMaterial({color:0xfff6d0}),0,.95,-2.27);
  for (const s of [-.72,.72]) pb(.3,.18,.05,new THREE.MeshBasicMaterial({color:0xfff6d0}),s,1.02,-2.27);
  for (const s of [-.72,.72]) pb(.3,.14,.05,new THREE.MeshBasicMaterial({color:0xff3030}),s,1.0,2.12);
  const c = mkCanvas(512,256), x = c.getContext('2d'), t = new THREE.CanvasTexture(c);
  const draw = ()=>{ x.fillStyle = '#f2f4f7'; x.fillRect(0,0,512,256);
    if (logoImg.naturalWidth) x.drawImage(logoImg, 24, 40, 180, 153);
    x.fillStyle = '#1d3f86'; x.font = 'bold 54px sans-serif'; x.fillText('LDMprint', 220, 120);
    x.fillStyle = '#e8590c'; x.font = 'bold 38px sans-serif'; x.fillText('EXPRESS', 222, 170); t.needsUpdate = true; };
  draw(); onLogo(draw);
  for (const s of [-1,1]){ const d = new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.3), new THREE.MeshStandardMaterial({map:t, roughness:.4})); d.position.set(s*.956,1.25,.55); d.rotation.y = s*Math.PI/2; g.add(d); }
  for (const [wx,wz] of [[-.9,-1.45],[.9,-1.45],[-.9,1.3],[.9,1.3]]){
    const w = new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.28,18), tire); w.rotation.z = Math.PI/2; w.position.set(wx,.38,wz); w.castShadow = true; g.add(w); VAN.wheels.push(w);
  }
  g.position.set(VAN.far.x, 0, VAN.far.z);
}

// CIELO NOTTURNO
const stars = (()=>{
  const n = 900, pos = new Float32Array(n*3), R = mulberry32(5150);
  for (let i=0;i<n;i++){ const a = R()*Math.PI*2, e = .12 + R()*1.4, r = 160; pos[i*3] = Math.cos(a)*Math.cos(e)*r; pos[i*3+1] = Math.sin(e)*r; pos[i*3+2] = Math.sin(a)*Math.cos(e)*r; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({color:0xffffff, size:1.6, sizeAttenuation:false, transparent:true, opacity:0, fog:false, depthWrite:false}));
  m.frustumCulled = false; scene.add(m);
  return m;
})();

// tavolo imballaggio
{
  const g = new THREE.Group(); g.position.set(ST.pack.x,0,ST.pack.z); g.rotation.y = Math.PI/2; scene.add(g);
  box(2.4,.12,1,MAT.planks,0,.9,0,g);
  for (const [x,z] of [[-1.1,-.4],[1.1,-.4],[-1.1,.4],[1.1,.4]]) box(.12,.9,.12,MAT.planks,x,.45,z,g);
  box(.5,.35,.4,MAT.cardboard,-.7,1.14,0,g);
  box(.4,.3,.35,MAT.cardboard,-.72,1.48,0,g);
  box(.6,.06,.45,L({color:0xd8b27a}),.3,.99,.05,g);
  const tape = new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.08,12), L({color:0xc9a063})); tape.position.set(.85,1.0,-.1); g.add(tape);
  const lab = makeWallTag('Tavolo imballaggio','#ffffff',1.6); lab.position.set(0,2.0,-.49); g.add(lab);
  addCol(ST.pack.x-.5, ST.pack.x+.5, ST.pack.z-1.2, ST.pack.z+1.2);
}
// stampante etichette
{
  const g = new THREE.Group(); g.position.set(ST.label.x,0,ST.label.z); g.rotation.y = Math.PI/2; scene.add(g);
  box(1.2,.12,1,MAT.planks,0,.9,0,g);
  for (const [x,z] of [[-.5,-.4],[.5,-.4],[-.5,.4],[.5,.4]]) box(.1,.9,.1,MAT.planks,x,.45,z,g);
  box(.6,.3,.45,MAT.white,0,1.11,-.05,g);
  box(.5,.04,.2,MAT.dark,0,1.27,-.1,g);
  const paper = box(.36,.02,.3,MAT.white,0,1.0,.3,g,true);
  const lab = makeWallTag('Stampante etichette','#ffffff',1.4); lab.position.set(0,1.85,-.49); g.add(lab);
  addCol(ST.label.x-.5, ST.label.x+.5, ST.label.z-.6, ST.label.z+.6);
  ST.label.paper = paper;
}
// scaffale filamenti: le bobine visibili seguono le scorte
const shelfSpools = [];
{
  const F = ST.filament;
  const wood = MAT.planks;
  box(.08,2.1,5,wood,F.x+.36,1.05,F.z);                       // schienale
  for (const dz of [-2.45,2.45]) box(.72,2.1,.1,wood,F.x,1.05,F.z+dz);
  for (const y of [.12,.7,1.28,1.86]) box(.72,.06,5,wood,F.x,y,F.z);
  const cols = [0xff7a1a,0x2ec4b6,0xf1f2f6,0x2d3436,0xe84393,0x6c5ce7,0x20bf6b,0xf7b731,0xeb3b5a,0x3867d6];
  const spoolGeo = new THREE.CylinderGeometry(.19,.19,.11,20);
  const hubGeo = new THREE.CylinderGeometry(.075,.075,.125,12);
  const hubMat = L({color:0x1d1d1d});
  let k = 0;
  for (const y of [.36,.94,1.52,2.1]) for (let j=0;j<5;j++){
    const g = new THREE.Group(); g.position.set(F.x-.05, y, F.z-1.9+j*.95); scene.add(g);
    const sp = new THREE.Mesh(spoolGeo, L({color:cols[k%cols.length]})); sp.rotation.z = Math.PI/2; sp.castShadow = true; g.add(sp);
    const hb = new THREE.Mesh(hubGeo, hubMat); hb.rotation.z = Math.PI/2; g.add(hb);
    shelfSpools.push(g); k++;
  }
  const lab = makeWallTag('Scaffale filamenti','#ffffff',1.6); lab.position.set(11.985,2.55,F.z); lab.rotation.y = -Math.PI/2; scene.add(lab);
  addCol(11,12,3.5,8.5);
  addCam(11.1,12,0,2.2,3.5,8.5);
  box(.5,.6,.5,L({color:0x7a4a25}),-11.5,.3,-8.2);
  box(.7,.7,.7,MAT.leaves,-11.5,.95,-8.2);
  addCol(-11.8,-11.2,-8.5,-7.9);
}
