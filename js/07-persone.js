/* =====================================================================
   PERSONAGGIO
   ===================================================================== */
/* =====================================================================
   PERSONE — corpo umanoide realistico con mani a 5 dita
   makeHuman() crea il modello, animateHuman() lo anima con transizioni morbide.
   ===================================================================== */
const SMOOTH = (color, rough=.75, map=null, extra={}) => new THREE.MeshStandardMaterial(Object.assign({color, roughness:rough, metalness:0, map}, extra));
function canvasTex(w, h, draw, repeat){
  const c = mkCanvas(w,h); draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}
function fabricNoise(g,w,h,base,amt,lines){
  g.fillStyle = base; g.fillRect(0,0,w,h);
  for (let i=0;i<w*h/6;i++){ g.fillStyle = `rgba(${TR()<.5?'0,0,0':'255,255,255'},${TR()*amt})`; g.fillRect(TR()*w|0, TR()*h|0, 1, 1); }
  if (lines){ g.strokeStyle = `rgba(0,0,0,${amt*.8})`; g.lineWidth = 1; for (let x=0;x<w;x+=3){ g.beginPath(); g.moveTo(x,0); g.lineTo(x+h*.3,h); g.stroke(); } }
}
const HTEX = {
  tee: canvasTex(128,128,(g,w,h)=>{
    fabricNoise(g,w,h,'#ffffff',.05);
    g.strokeStyle='rgba(0,0,0,.05)'; g.lineWidth=3;
    for (const [x,y,l] of [[22,70,30],[96,76,26],[50,98,22],[80,104,18]]){ g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(x+6,y+l*.5,x+2,y+l); g.stroke(); }
  }),
  denim: canvasTex(64,64,(g,w,h)=>fabricNoise(g,w,h,'#ffffff',.22,true)),
  hair: canvasTex(64,64,(g,w,h)=>{
    g.fillStyle='#ffffff'; g.fillRect(0,0,w,h);
    for (let i=0;i<260;i++){ const x=TR()*w, y=TR()*h; g.strokeStyle=`rgba(0,0,0,${.12+TR()*.25})`; g.lineWidth=1; g.beginPath(); g.moveTo(x,y); g.lineTo(x+(TR()-.5)*4, y+6+TR()*6); g.stroke(); }
  }, [3,3]),
  skin: canvasTex(64,64,(g,w,h)=>{ g.fillStyle='#ffffff'; g.fillRect(0,0,w,h); for (let i=0;i<500;i++){ g.fillStyle=`rgba(120,60,40,${TR()*.05})`; g.fillRect(TR()*w|0,TR()*h|0,1,1); } }),
  fur: canvasTex(128,128,(g,w,h)=>{
    g.fillStyle='#ffffff'; g.fillRect(0,0,w,h);
    for (let i=0;i<1400;i++){ const x=TR()*w, y=TR()*h; g.strokeStyle=`rgba(0,0,0,${.05+TR()*.12})`; g.lineWidth=1; g.beginPath(); g.moveTo(x,y); g.lineTo(x+(TR()-.5)*2, y+3+TR()*4); g.stroke(); }
  }, [4,4]),
};
// capsula affusolata che pende dal pivot verso il basso (lunghezza len); bulge = muscolo
function taperGeo(len, rTop, rBot, seg=14, bulgeAt=.62, bulge=1.06){
  const pts = [];
  for (let i=0;i<=5;i++){ const a = -Math.PI/2 + (i/5)*Math.PI/2; pts.push(new THREE.Vector2(Math.cos(a)*rBot, -len + Math.sin(a)*rBot)); }
  const rb = rBot + (rTop-rBot)*(1-bulgeAt);
  pts.push(new THREE.Vector2(rb*bulge, -len*bulgeAt));
  for (let i=0;i<=5;i++){ const a = (i/5)*Math.PI/2; pts.push(new THREE.Vector2(Math.cos(a)*rTop, Math.sin(a)*rTop)); }
  return new THREE.LatheGeometry(pts, seg);
}
function latheGeo(profile, seg=20){ return new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)), seg); }
function mesh(parent, geo, mat, x=0, y=0, z=0, shadow=true){
  const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z);
  if (shadow) m.castShadow = true;
  parent.add(m); return m;
}
const SPH_HI = new THREE.SphereGeometry(1, 32, 22);
const SPH = new THREE.SphereGeometry(1, 20, 14);
const SPH_LO = new THREE.SphereGeometry(1, 10, 8);
function blob(parent, mat, r, sx, sy, sz, x, y, z, shadow, lo){
  const m = mesh(parent, lo === 'hi' ? SPH_HI : lo ? SPH_LO : SPH, mat, x, y, z, shadow);
  m.scale.set(r*sx, r*sy, r*sz); return m;
}
const TORSO_GEO = latheGeo([[0.002,-0.02],[.15,-.015],[.172,.04],[.163,.14],[.151,.22],[.163,.32],[.19,.42],[.198,.5],[.19,.56],[.155,.604],[.09,.63],[.05,.64]], 32);
const PELVIS_GEO = latheGeo([[0.002,-.08],[.11,-.078],[.148,-.045],[.157,.01],[.158,.05],[.002,.06]], 24);
const THIGH_GEO = taperGeo(.43, .086, .056, 16, .7, 1.05);
const SHIN_GEO = taperGeo(.39, .055, .04, 16, .28, 1.13);          // polpaccio
const UPPER_ARM_GEO = taperGeo(.27, .048, .038, 14, .55, 1.08);    // bicipite
const FOREARM_GEO = taperGeo(.23, .042, .027, 14, .25, 1.1);
const NECK_GEO = new THREE.CylinderGeometry(.05, .057, .12, 16);
const SLEEVE_GEO = new THREE.CylinderGeometry(.056, .064, .17, 18, 1, true);
const HAIR_GEO = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI*2, 0, Math.PI*.56);
const COLLAR_GEO = new THREE.TorusGeometry(.064, .011, 8, 24);
const HEM_GEO = new THREE.TorusGeometry(.061, .007, 6, 20);
const SHIRT_HEM_GEO = new THREE.TorusGeometry(.141, .01, 8, 40);
const LIP_GEO = new THREE.TorusGeometry(.017, .0045, 6, 14, Math.PI);
const BROW_GEO = new THREE.BoxGeometry(.034, .006, .01);
const LASH_GEO = new THREE.TorusGeometry(.0152, .0012, 4, 12, Math.PI);
const LOGO_FRONT_GEO = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true, .12, .52);
const LOGO_BACK_GEO = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true, Math.PI - .55, 1.1);
// dita: [lunghezze delle falangi, raggio, posizione z sul palmo]
const FINGERS = [
  {seg:[.044,.027,.02], r:.0088, z:.0285},     // indice
  {seg:[.049,.031,.021], r:.0092, z:.0095},    // medio
  {seg:[.046,.029,.02], r:.0088, z:-.0095},    // anulare
  {seg:[.035,.022,.018], r:.0076, z:-.027},    // mignolo
];
const phalanxGeo = new Map();
function phalanx(len, r0, r1){
  const k = `${len}|${r0}|${r1}`;
  if (!phalanxGeo.has(k)) phalanxGeo.set(k, taperGeo(len, r0, r1, 8, .5, 1.02));
  return phalanxGeo.get(k);
}

function makeHand(parent, side, M, lite){
  const hand = new THREE.Group(); parent.add(hand);
  if (lite){
    blob(hand, M.skin, .048, .34, 1.0, .9, 0, -.047, .002, true);
    const fg = new THREE.Group(); fg.position.y = -.088; hand.add(fg);
    blob(fg, M.skin, .045, .3, 1.0, .85, 0, -.04, 0, false, true);
    const tg = new THREE.Group(); tg.position.set(-.006*side, -.03, .036); tg.rotation.set(-.55, 0, -.4*side); hand.add(tg);
    blob(tg, M.skin, .012, 1, 2.6, 1, 0, -.03, 0, false, true);
    return {hand, digits:[{joints:[fg], w:[1]}, {joints:[tg], w:[.5], thumb:true}]};
  }
  blob(hand, M.skin, .048, .34, 1.0, .9, 0, -.047, .002, true);                 // palmo
  blob(hand, M.skin, .02, .7, .9, .9, -.004*side, -.04, .026, false, true);    // eminenza del pollice
  blob(hand, M.skin, .045, .3, .2, .92, 0, -.088, 0, false, true);              // nocche
  const digits = [];
  FINGERS.forEach((f, k)=>{
    let par = new THREE.Group(); par.position.set(0, -.088, f.z); par.rotation.x = f.z*1.4; hand.add(par);
    const joints = [par];
    f.seg.forEach((len, j)=>{
      const r0 = f.r*(1 - j*.12), r1 = f.r*(1 - (j+1)*.12);
      mesh(par, phalanx(len, r0, r1), M.skin, 0, 0, 0, false);
      if (j === f.seg.length-1){                                                   // unghia
        const nail = blob(par, M.nail, r1*1.05, .35, 1.6, .85, side*r1*.55, -len*.62, 0, false, true);
      } else {
        const nx = new THREE.Group(); nx.position.y = -len; par.add(nx); par = nx; joints.push(nx);
      }
    });
    digits.push({joints, w:[1, 1.15, .85]});
  });
  // pollice: parte dal lato del palmo e si piega verso l'interno
  let th = new THREE.Group(); th.position.set(-.006*side, -.03, .036); th.rotation.set(-.55, 0, -.4*side); hand.add(th);
  const tj = [th];
  [[.036,.0108,.0098],[.029,.0098,.0082]].forEach(([len,r0,r1], j)=>{
    mesh(th, phalanx(len, r0, r1), M.skin, 0, 0, 0, false);
    if (j === 0){ const nx = new THREE.Group(); nx.position.y = -len; th.add(nx); th = nx; tj.push(nx); }
    else blob(th, M.nail, .0085, .35, 1.5, .85, side*.005, -len*.6, .002, false, true);
  });
  digits.push({joints:tj, w:[.5, .8], thumb:true});
  return {hand, digits};
}

/* ---------- modello realistico: superfici scolpite, tessuti e pelle ---------- */
// superficie parametrica chiusa attorno all'asse y (cucitura sul retro, normali verso l'esterno)
function surfGeo(nu, nv, fn){
  const pos = [], uv = [], idx = [];
  for (let j=0;j<=nv;j++) for (let i=0;i<=nu;i++){
    const p = fn(i/nu, j/nv); pos.push(p[0], p[1], p[2]); uv.push(i/nu, j/nv);
  }
  for (let j=0;j<nv;j++) for (let i=0;i<nu;i++){
    const a = j*(nu+1)+i, b = a+1, c = a+nu+1, d = c+1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const gauss = (d, s) => Math.exp(-(d*d)/(2*s*s));
const smooth = (a, b, t) => { t = clamp((t-a)/(b-a), 0, 1); return t*t*(3-2*t); };
// punto sulla sezione ellittica "squadrata" (theta = 0 davanti)
function ringPt(th, rx, rz, n=2.3){
  const s = Math.sin(th), c = Math.cos(th);
  return [Math.sign(s)*Math.pow(Math.abs(s), 2/n)*rx, Math.sign(c)*Math.pow(Math.abs(c), 2/n)*rz];
}
// mappa di rilievo -> normal map
function heightToNormal(draw, size=256, strength=2){
  const c = mkCanvas(size, size), g = c.getContext('2d'); draw(g, size);
  const src = g.getImageData(0,0,size,size).data, out = g.createImageData(size, size), o = out.data;
  const h = (x,y) => src[(((y+size)%size)*size + ((x+size)%size))*4] / 255;
  for (let y=0;y<size;y++) for (let x=0;x<size;x++){
    const dx = (h(x-1,y) - h(x+1,y))*strength, dy = (h(x,y-1) - h(x,y+1))*strength;
    const l = Math.hypot(dx, dy, 1), i = (y*size+x)*4;
    o[i] = (dx/l*.5+.5)*255; o[i+1] = (dy/l*.5+.5)*255; o[i+2] = (1/l*.5+.5)*255; o[i+3] = 255;
  }
  g.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const NMAP = {
  knit: heightToNormal((g,s)=>{ g.fillStyle='#808080'; g.fillRect(0,0,s,s); for (let y=0;y<s;y+=2) for (let x=0;x<s;x+=2){ g.fillStyle = `rgb(${124+((x+y)%4)*6+Math.random()*8|0},0,0)`; g.fillRect(x,y,2,2); }
    g.strokeStyle='rgba(40,40,40,.5)'; g.lineWidth=6; for (let k=0;k<5;k++){ g.beginPath(); const x = Math.random()*s; g.moveTo(x,0); g.bezierCurveTo(x+20,s*.3,x-20,s*.6,x+10,s); g.stroke(); } }, 256, 3),
  twill: heightToNormal((g,s)=>{ g.fillStyle='#808080'; g.fillRect(0,0,s,s); g.strokeStyle='#b0b0b0'; g.lineWidth=1.4; for (let k=-s;k<s*2;k+=4){ g.beginPath(); g.moveTo(k,0); g.lineTo(k+s*.5,s); g.stroke(); } }, 256, 4),
  pores: heightToNormal((g,s)=>{ g.fillStyle='#909090'; g.fillRect(0,0,s,s); for (let i=0;i<5000;i++){ g.fillStyle = `rgba(0,0,0,${Math.random()*.25})`; g.fillRect(Math.random()*s|0, Math.random()*s|0, 1, 1); } }, 256, 1.2),
  canvas: heightToNormal((g,s)=>{ g.fillStyle='#808080'; g.fillRect(0,0,s,s); for (let y=0;y<s;y+=2){ g.fillStyle = y%4 ? '#a0a0a0' : '#606060'; g.fillRect(0,y,s,1); } for (let x=0;x<s;x+=2){ g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(x,0,1,s); } }, 128, 3),
};
// mappa d'ambiente morbida per pelle, tessuti e metalli
const HUMAN_ENV = (()=>{
  try {
    const es = new THREE.Scene();
    const c = mkCanvas(64, 64), g = c.getContext('2d');
    const gr = g.createLinearGradient(0,0,0,64); gr.addColorStop(0,'#dfeaf6'); gr.addColorStop(.48,'#c9d2da'); gr.addColorStop(.55,'#8d8a84'); gr.addColorStop(1,'#4a4640');
    g.fillStyle = gr; g.fillRect(0,0,64,64);
    es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c), side:THREE.BackSide})));
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({color:0xffffff}));
    panel.position.set(3, 6, 4); panel.lookAt(0,0,0); es.add(panel);
    const pm = new THREE.PMREMGenerator(renderer);
    const t = pm.fromScene(es, .04).texture; pm.dispose();
    return t;
  } catch(e){ return null; }
})();
const PBR = (color, rough, extra={}) => new THREE.MeshStandardMaterial(Object.assign({color, roughness:rough, metalness:0, envMap:HUMAN_ENV, envMapIntensity:.55}, extra));

// ----- geometrie del corpo -----
function torsoGeo(fem, build){
  const H = .64, sw = build;
  const W = t => (t < .3 ? lerp(.162, .148, smooth(0, .3, t)) : t < .72 ? lerp(.148, .192, smooth(.3, .72, t)) : t < .9 ? lerp(.192, .2, smooth(.72, .9, t)) : lerp(.2, .064, smooth(.9, 1, t)))
    * (fem ? (t < .45 ? lerp(1.07, .9, smooth(0, .45, t)) : .88) : sw);
  const D = t => t < .3 ? lerp(.108, .096, smooth(0, .3, t)) : t < .72 ? lerp(.096, .125, smooth(.3, .72, t)) : t < .9 ? lerp(.125, .11, smooth(.72, .9, t)) : lerp(.11, .058, smooth(.9, 1, t));
  return surfGeo(40, 30, (u, v)=>{
    const th = Math.PI + u*Math.PI*2, t = v;
    let [x, z] = ringPt(th, W(t), D(t), 2.35);
    const front = Math.max(0, Math.cos(th)), back = Math.max(0, -Math.cos(th));
    const ax = Math.abs(x);
    if (fem) z += front * .034 * gauss(t - .66, .07) * gauss(ax - .065, .045);        // seno
    else z += front * .016 * gauss(t - .7, .07) * gauss(ax - .075, .05);               // pettorali
    z -= back * .012 * gauss(t - .76, .08) * gauss(ax - .07, .04);                      // scapole
    z += back * .006 * gauss(ax, .015) * smooth(.2, .8, t);                             // solco della schiena
    z += front * .01 * gauss(t - .12, .1) * gauss(ax, .07) * (fem ? .5 : 1);            // addome
    if (t < .1){ const f = 1 + .07*(1 - t/.1); x *= f; z *= f; }                        // orlo morbido sopra i jeans
    return [x, -.02 + t*H + (t > .9 ? -.01*back : 0), z + .006*smooth(.5, .8, t)];
  });
}
function limbGeo(len, rTop, rBot, prof, nu=18, nv=16){
  return surfGeo(nu, nv, (u, v)=>{
    const th = Math.PI + u*Math.PI*2, t = 1 - v;              // t: 0 in alto, 1 in basso
    let r = lerp(rTop, rBot, t);
    const b = prof(t, th);
    const [x, z] = ringPt(th, r*b[0], r*b[1], 2.1);
    return [x + (b[2]||0), -len + v*len, z + (b[3]||0)];
  });
}
const armUpperProf = (t, th) => [1 + .08*gauss(t-.45, .2), 1 + .14*gauss(t-.45, .18)*Math.max(0, Math.cos(th)) + .08*gauss(t-.35, .2)*Math.max(0, -Math.cos(th))];
const forearmProf = (t, th) => [1 + .1*gauss(t-.18, .15), .86 + .06*gauss(t-.2, .15)];
const thighProf = (t, th) => [1 + .03*gauss(t-.35, .25), 1.05 + .05*gauss(t-.3, .2)*Math.max(0, Math.cos(th))];
const shinProf = (t, th) => [1, 1 + .1*gauss(t-.3, .18)*Math.max(0, -Math.cos(th)) + .03*gauss(t-.95, .08)];

// ----- testa scolpita -----
function headDeform(x, y, z){
  let X = x*.079, Y = y*.12, Z = z*.101;
  if (y < 0){ const k = -y; X *= 1 - .12*k*k - .2*Math.pow(k, 6); if (z > 0) Z *= 1 - .04*k; if (z < 0) Z *= 1 - .25*k*k; }
  if (y < -.6) Y *= 1 - .08*smooth(-.6, -1, y);                                         // mandibola più corta
  if (y < -.55 && z > .3) Z += .012*smooth(-.55, -.9, y)*z;                        // mento
  X *= 1 + .05*gauss(y + .12, .16)*smooth(.2, .6, z);                                // zigomi
  if (z > 0 && y > .25) Z *= 1 - .03*smooth(.25, .8, y);                              // fronte
  if (z < 0) Z *= 1 + .07*gauss(y - .15, .45);                                        // nuca
  for (const s of [-1, 1]) Z -= .007*gauss(x - s*.34, .12)*gauss(y - .13, .1)*Math.max(0, z);   // orbite
  Z += .006*gauss(x, .1)*gauss(y - .27, .08)*Math.max(0, z);                          // arcata sopracciliare centrale
  return [X, Y, Z];
}
const HEAD_GEO = (()=>{
  const g = new THREE.SphereGeometry(1, 56, 40), p = g.attributes.position;
  for (let i=0;i<p.count;i++){ const d = headDeform(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, d[0], d[1], d[2]); }
  g.computeVertexNormals();
  return g;
})();
const headPoint = (a, y, push=0) => {                // a = angolo orizzontale dal davanti, y = altezza sulla sfera unitaria
  const r = Math.sqrt(1 - y*y), d = headDeform(Math.sin(a)*r, y, Math.cos(a)*r);
  return new THREE.Vector3(d[0], d[1], d[2]).multiplyScalar(1 + push);
};
const css = c => '#' + new THREE.Color(c).getHexString();
function paintFace(o){
  const Wd = 512, Hd = 256, c = mkCanvas(Wd, Hd), g = c.getContext('2d');
  const skin = new THREE.Color(o.skin), hair = new THREE.Color(o.hair);
  const U = a => (.25 + a/(Math.PI*2))*Wd, V = y => Math.acos(clamp(y, -1, 1))/Math.PI*Hd;
  g.fillStyle = css(skin); g.fillRect(0,0,Wd,Hd);
  for (let i=0;i<5000;i++){ g.fillStyle = Math.random() < .5 ? 'rgba(150,70,50,.05)' : 'rgba(255,230,210,.05)'; g.fillRect(Math.random()*Wd, Math.random()*Hd, 2, 2); }
  const blob = (a, y, rx, ry, col) => { const gr = g.createRadialGradient(U(a), V(y), 0, U(a), V(y), rx); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.translate(U(a), V(y)); g.scale(1, ry/rx); g.translate(-U(a), -V(y)); g.fillStyle = gr; g.beginPath(); g.arc(U(a), V(y), rx, 0, Math.PI*2); g.fill(); g.restore(); };
  for (const s of [-1,1]){
    blob(s*.42, -.12, 26, 18, 'rgba(210,90,80,.16)');                 // guance
    blob(s*.34, .02, 16, 7, 'rgba(90,50,60,.14)');                    // occhiaie
    blob(s*.34, .15, 18, 10, 'rgba(120,70,60,.12)');                  // ombra dell'orbita
  }
  blob(0, -.2, 10, 30, 'rgba(120,70,50,.10)');                        // ombre del naso
  g.fillStyle = 'rgba(70,35,25,.3)'; g.fillRect(0, V(-.84), Wd, Hd - V(-.84));      // ombra sotto la mandibola
  // barba corta
  const beard = o.beard ?? .22;
  if (beard > 0){
    const hc = `rgba(${hair.r*200|0},${hair.g*170|0},${hair.b*150|0},`;
    for (let i=0;i<9000*beard;i++){
      const a = (Math.random()-.5)*2.6, y = -.2 - Math.random()*.8 - (Math.random() < .25 ? .1 : 0);
      const onJaw = y < -.38 || (Math.abs(a) > .5 && Math.abs(a) < 1.3 && y < -.2);
      const mous = y > -.4 && y < -.3 && Math.abs(a) < .22;
      const lips = y < -.36 && y > -.5 && Math.abs(a) < .2;
      if ((!onJaw && !mous) || lips || Math.abs(a) > 1.3) continue;
      g.fillStyle = hc + (.18 + Math.random()*.35*beard) + ')';
      g.fillRect(U(a), V(y), 1.2, 1.6);
    }
    for (const s of [-1,1]) for (let i=0;i<400;i++){ const a = s*(1.22 + Math.random()*.14), y = -.15 + Math.random()*.45; g.fillStyle = hc + '.4)'; g.fillRect(U(a), V(y), 1.2, 1.8); }
  }
  // labbra
  g.fillStyle = css(o.lip ?? 0xb97a6a);
  g.beginPath(); g.ellipse(U(0), V(-.405), 13, 2.6, 0, 0, Math.PI*2); g.fill();
  g.fillStyle = 'rgba(80,30,30,.5)'; g.fillRect(U(0)-14, V(-.405), 28, 1);
  // sopracciglia
  g.strokeStyle = css(hair.clone().multiplyScalar(.75)); g.lineCap = 'round';
  for (const s of [-1,1]) for (let k=0;k<26;k++){
    const a0 = s*(.16 + k*.011), y0 = .26 + .03*Math.sin(k/26*Math.PI) - k*.001;
    g.lineWidth = 1.2; g.beginPath(); g.moveTo(U(a0), V(y0)); g.lineTo(U(a0 + s*.012), V(y0 + .025)); g.stroke();
  }
  // attaccatura dei capelli dipinta sotto le ciocche
  const hairCss = css(hair);
  for (let x=0;x<Wd;x++){
    const u = x/Wd, a = (u - .25)*Math.PI*2, front = Math.cos(a);
    const yLine = front > .2 ? .58 - .07*Math.abs(Math.sin(a*2)) : o.hairStyle === 'long' ? -.6 : -.2;
    g.fillStyle = hairCss; g.fillRect(x, 0, 1, V(yLine));
    const gr = g.createLinearGradient(0, V(yLine), 0, V(yLine) + 6); gr.addColorStop(0, hairCss); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x, V(yLine), 1, 6);
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = MAX_ANI;
  return t;
}
const IRIS_TEX = {};
function irisTex(col){
  const k = css(col);
  if (IRIS_TEX[k]) return IRIS_TEX[k];
  const c = mkCanvas(64, 64), g = c.getContext('2d');
  g.fillStyle = '#f4f1ec'; g.fillRect(0,0,64,64);
  const base = new THREE.Color(col);
  const gr = g.createRadialGradient(32,32,4,32,32,15); gr.addColorStop(0, css(base.clone().multiplyScalar(.6))); gr.addColorStop(.6, css(base)); gr.addColorStop(1, css(base.clone().multiplyScalar(.45)));
  g.fillStyle = gr; g.beginPath(); g.arc(32,32,15,0,Math.PI*2); g.fill();
  for (let i=0;i<60;i++){ const a = Math.random()*Math.PI*2; g.strokeStyle = `rgba(255,255,255,${Math.random()*.25})`; g.beginPath(); g.moveTo(32+Math.cos(a)*5, 32+Math.sin(a)*5); g.lineTo(32+Math.cos(a)*14, 32+Math.sin(a)*14); g.stroke(); }
  g.strokeStyle = 'rgba(20,20,30,.8)'; g.lineWidth = 1.6; g.beginPath(); g.arc(32,32,15,0,Math.PI*2); g.stroke();
  g.fillStyle = '#080808'; g.beginPath(); g.arc(32,32,5.5,0,Math.PI*2); g.fill();
  return IRIS_TEX[k] = new THREE.CanvasTexture(c);
}
// capelli: calotta con volume che segue l'attaccatura + ciocche morbide adagiate sopra
function hairMask(a, y, style){
  const front = Math.cos(a), side = Math.abs(Math.sin(a));
  const lineFront = .56 - .07*Math.abs(Math.sin(a*2));             // stempiatura leggera
  const lineSide = style === 'long' ? -.75 : .24;
  const lineBack = style === 'long' ? -.8 : -.34;
  let line = front > 0 ? lerp(lineSide, lineFront, smooth(.1, .75, front)) : lerp(lineSide, lineBack, smooth(0, .8, -front));
  if (style !== 'long' && side > .8 && front > -.4 && front < .45) line = Math.max(line, .3);   // sopra le orecchie
  return smooth(line - .05, line + .06, y);
}
function hairShellGeo(style){
  const g = new THREE.SphereGeometry(1, 48, 32), p = g.attributes.position;
  const vol = style === 'short' ? .03 : style === 'long' ? .05 : .075;
  for (let i=0;i<p.count;i++){
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(x, z), m = hairMask(a, y, style);
    let r = lerp(.95, 1.045 + vol*smooth(-.2, .9, y) + .045*smooth(.3, .9, y)*smooth(.2, .9, Math.cos(a))*(style === 'tousled' ? 1 : .4), m);
    if (style === 'long' && y < .3) r = lerp(r, r + .05*m, smooth(.3, -.6, y));
    const d = headDeform(x, y, z);
    p.setXYZ(i, d[0]*r, d[1]*r + (style === 'tousled' ? .006*m*smooth(.3, 1, y) : 0), d[2]*r);
  }
  g.computeVertexNormals();
  return g;
}
function hairGeo(style, seed, count){
  const R = mulberry32(seed), geos = [], up = new THREE.Vector3(0,1,0);
  const long = style === 'long', short = style === 'short';
  const vol = short ? .03 : long ? .05 : .075;
  for (let k=0; k<count*3 && geos.length < count; k++){
    const a = R()*Math.PI*2, y = -.8 + R()*1.8;
    if (y > .99) continue;
    const m = hairMask(a, y, style);
    if (m < .9) continue;
    const front = Math.cos(a);
    const r = 1.04 + vol*smooth(-.2, .9, y) + .045*smooth(.3, .9, y)*smooth(.2, .9, front)*(style === 'tousled' ? 1 : .4);
    const rr = Math.sqrt(1 - y*y), d = headDeform(Math.sin(a)*rr, y, Math.cos(a)*rr);
    const p = new THREE.Vector3(d[0], d[1], d[2]).multiplyScalar(r);
    const nrm = p.clone().normalize();
    let dir;
    if (long && y < .4) dir = new THREE.Vector3(Math.sin(a)*.15, -1, Math.cos(a)*.1 - .1);
    else if (front > .35) dir = new THREE.Vector3((R()-.5)*.5, .55, -.9);          // ciuffo pettinato indietro con volume
    else if (y > .75) dir = new THREE.Vector3((R()-.5)*.6, -.1, -1);
    else dir = new THREE.Vector3(Math.sin(a)*.4, -.6, Math.cos(a)*.35 - .5);
    dir.add(new THREE.Vector3((R()-.5)*.35, (R()-.5)*.25, (R()-.5)*.35));
    // la ciocca resta adagiata sulla calotta: rimuovo quasi tutta la componente normale
    dir.addScaledVector(nrm, -dir.dot(nrm)*.85 + (style === 'tousled' ? .1 : .04)).normalize();
    const len = long && y < .4 ? .1 + R()*.12 : short ? .026 + R()*.018 : .045 + R()*.035;
    const rad = (short ? .014 : .02) + R()*.01;
    const cg = new THREE.ConeGeometry(rad, len, 5, 1).toNonIndexed();
    cg.scale(1, 1, .45);                                          // ciocca piatta
    cg.translate(0, len/2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    cg.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
    cg.translate(p.x - nrm.x*.004, p.y - nrm.y*.004, p.z - nrm.z*.004);
    const tint = .78 + R()*.34, cols = new Float32Array(cg.attributes.position.count*3);
    for (let v=0; v<cg.attributes.position.count; v++){ const tip = cg.attributes.uv.getY(v) > .9 ? 1.2 : 1; cols[v*3] = cols[v*3+1] = cols[v*3+2] = tint*tip; }
    cg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    cg.deleteAttribute('uv');
    geos.push(cg);
  }
  let total = 0; for (const g of geos) total += g.attributes.position.count;
  const merged = new THREE.BufferGeometry();
  for (const name of ['position','normal','color']){
    const arr = new Float32Array(total*3); let off = 0;
    for (const g of geos){ arr.set(g.attributes[name].array, off); off += g.attributes[name].array.length; }
    merged.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  merged.computeBoundingSphere();
  return merged;
}
const HAIR_CACHE = {};
const hairFor = (style, lite) => { const k = style + (lite ? 'L' : 'H'); return HAIR_CACHE[k] || (HAIR_CACHE[k] = {shell:hairShellGeo(style), tufts:hairGeo(style, style.length*31 + (lite ? 7 : 3), lite ? 110 : 320)}); };
// jeans: tela, sbiaditure, cuciture, tasche
function jeansTex(col){
  const c = mkCanvas(256, 256), g = c.getContext('2d'), base = new THREE.Color(col);
  g.fillStyle = css(base); g.fillRect(0,0,256,256);
  for (let i=0;i<9000;i++){ g.fillStyle = `rgba(${Math.random()<.5?'255,255,255':'0,0,20'},${Math.random()*.12})`; g.fillRect(Math.random()*256, Math.random()*256, 1, 2); }
  // sbiadito davanti (u ~ 0.5) e sulle ginocchia
  const fade = g.createRadialGradient(128, 120, 4, 128, 120, 80); fade.addColorStop(0, 'rgba(190,210,235,.22)'); fade.addColorStop(1, 'rgba(190,210,235,0)');
  g.fillStyle = fade; g.fillRect(0,0,256,256);
  // cuciture laterali doppie (arancio)
  g.strokeStyle = 'rgba(200,140,60,.8)'; g.lineWidth = 1; g.setLineDash([3,2]);
  for (const x of [62, 66, 190, 194]){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,256); g.stroke(); }
  g.setLineDash([]);
  return new THREE.CanvasTexture(c);
}
function pelvisTex(col){
  const c = mkCanvas(256, 128), g = c.getContext('2d');
  g.fillStyle = css(new THREE.Color(col)); g.fillRect(0,0,256,128);
  for (let i=0;i<5000;i++){ g.fillStyle = `rgba(${Math.random()<.5?'255,255,255':'0,0,20'},${Math.random()*.12})`; g.fillRect(Math.random()*256, Math.random()*128, 1, 2); }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, 256, 16);                      // cintura dei jeans
  g.strokeStyle = 'rgba(200,140,60,.85)'; g.setLineDash([3,2]); g.lineWidth = 1;
  g.beginPath(); g.moveTo(0,16); g.lineTo(256,16); g.stroke();
  for (const x of [2, 254]){ g.beginPath(); g.moveTo(x, 16); g.lineTo(x, 90); g.stroke(); }                                    // patta
  for (const s of [1,-1]){ g.beginPath(); g.moveTo(128 + s*96, 16); g.quadraticCurveTo(128 + s*70, 40, 128 + s*60, 16); g.stroke(); }   // tasche davanti
  for (const s of [1,-1]){ g.strokeRect(128 + s*28 - 14, 30, 28, 34); }                                                       // tasche dietro
  g.setLineDash([]);
  g.fillStyle = '#c9a44a'; g.beginPath(); g.arc(8, 26, 3, 0, 7); g.fill();       // bottone
  return new THREE.CanvasTexture(c);
}

function makeHuman(o={}){
  const lite = !!o.lite, fem = !!o.fem;
  const hairStyle = o.hairStyle || (o.longHair ? 'long' : 'tousled');
  const skinC = o.skin ?? 0xdca183, hairC = o.hair ?? 0x8a6232, shirtC = o.shirt ?? 0xf6f6f2;
  const pantsC = o.pants ?? 0x243c66, shoeC = o.shoe ?? 0x22305a, eyeC = o.eye ?? 0x5b86b8;
  const build = o.build ?? 1;
  const M = {
    skin: PBR(skinC, .55, {normalMap:NMAP.pores, normalScale:new THREE.Vector2(.15,.15), emissive:0x1a0503, emissiveIntensity:.25, envMapIntensity:.3}),
    face: PBR(0xffffff, .55, {map:paintFace({skin:skinC, hair:hairC, beard:o.beard, lip:o.lip, hairStyle}), normalMap:NMAP.pores, normalScale:new THREE.Vector2(.12,.12), emissive:0x1a0503, emissiveIntensity:.2, envMapIntensity:.3}),
    nail: PBR(0xf1d3c6, .3),
    hair: PBR(hairC, .7, {vertexColors:true}),
    hairShell: PBR(hairC, .8, {map:HTEX.hair, color:new THREE.Color(hairC).multiplyScalar(.92)}),
    shirt: PBR(new THREE.Color(shirtC).multiplyScalar(.93), .95, {normalMap:NMAP.knit, normalScale:new THREE.Vector2(.12,.12), side:THREE.DoubleSide, envMapIntensity:.25}),
    pants: PBR(0xffffff, .95, {map:jeansTex(pantsC), normalMap:NMAP.twill, normalScale:new THREE.Vector2(.35,.35), envMapIntensity:.2}),
    pelvis: PBR(0xffffff, .95, {map:pelvisTex(pantsC), normalMap:NMAP.twill, normalScale:new THREE.Vector2(.35,.35), envMapIntensity:.2}),
    shoe: PBR(shoeC, .85, {normalMap:NMAP.canvas, normalScale:new THREE.Vector2(.6,.6)}),
    rubber: PBR(0xf1f0ea, .7),
    stripe: PBR(0x2a3a70, .6),
    white: PBR(0xfbfaf8, .2),
    iris: PBR(0xffffff, .15, {map:irisTex(eyeC)}),
    cornea: PBR(0xffffff, 0, {transparent:true, opacity:.18, envMapIntensity:1.2}),
    lip: PBR(o.lip ?? 0xc07a6c, .45),
    brow: PBR(new THREE.Color(hairC).multiplyScalar(.75), .9),
    lace: PBR(0xf2f2f2, .8),
    steel: PBR(0xc9ced6, .22, {metalness:1, envMapIntensity:1.3}),
    dial: PBR(0x0c0f16, .15, {metalness:.3}),
    gold: PBR(0xd8ac3a, .25, {metalness:1, envMapIntensity:1.3}),
    ruby: PBR(0xa0101a, .1, {emissive:0x300004}),
  };
  const H = {M, w:{walk:0, run:0, air:0, hold:0, work:0, lean:0, bend:0}, blink:2 + Math.random()*3};
  const root = new THREE.Group();
  if (o.height) root.scale.setScalar(o.height);
  const body = new THREE.Group(); root.add(body);
  const hipY = .93;

  // bacino con jeans, cintura e passanti
  const pelvis = new THREE.Group(); pelvis.position.y = hipY; body.add(pelvis);
  mesh(pelvis, PELVIS_GEO, M.pelvis).scale.set(.95 * (fem ? 1.06 : 1), .92, .6);
  blob(pelvis, M.pelvis, .078, 1, .95, .8, .064, -.02, -.034, false);
  blob(pelvis, M.pelvis, .078, 1, .95, .8, -.064, -.02, -.034, false);

  const THIGH = lite ? THIGH_GEO : limbGeo(.44, .08, .06, thighProf);
  const SHIN = lite ? SHIN_GEO : limbGeo(.4, .06, .054, shinProf);
  const makeLeg = side => {
    const hip = new THREE.Group(); hip.position.set(.08*side, hipY-.015, 0); body.add(hip);
    mesh(hip, THIGH, M.pants, 0, -.012, 0);
    const knee = new THREE.Group(); knee.position.y = -.44; hip.add(knee);
    blob(knee, M.pants, .054, 1, 1, 1.02, 0, 0, .002, false, true);
    mesh(knee, SHIN, M.pants);
    if (!lite) for (const [y, r] of [[-.34, .053], [-.37, .055]]){ const f = mesh(knee, new THREE.TorusGeometry(r, .0045, 6, 18), M.pants, 0, y, 0, false); f.rotation.x = Math.PI/2; f.scale.set(1, 1.1, 1); }
    const ankle = new THREE.Group(); ankle.position.y = -.405; knee.add(ankle);
    // sneaker alta in tela
    blob(ankle, M.shoe, .066, .8, .66, 2.0, 0, -.045, .052);
    const col = mesh(ankle, new THREE.CylinderGeometry(.052, .058, .12, 16, 1, true), M.shoe, 0, .005, -.006, false); col.material = M.shoe;
    blob(ankle, M.shoe, .054, .85, .82, .95, 0, -.03, -.035, false, true);
    blob(ankle, M.rubber, .044, 1.05, .62, 1.05, 0, -.058, .13, false, true);                      // punta in gomma
    const sole = mesh(ankle, new THREE.BoxGeometry(.1, .034, .285), M.rubber, 0, -.087, .045); sole.receiveShadow = true;
    mesh(ankle, new THREE.BoxGeometry(.102, .006, .287), M.stripe, 0, -.078, .045, false);
    if (!lite){
      for (let k=0;k<6;k++){
        const l = mesh(ankle, new THREE.BoxGeometry(.05, .005, .008), M.lace, 0, .03 - k*.017, .045 + k*.021 + (k > 3 ? (k-3)*.006 : 0), false);
        l.rotation.set(-.55 - (k > 3 ? .35 : 0), 0, (k%2 ? .35 : -.35));
      }
    }
    return {hip, knee, ankle};
  };
  const LG = makeLeg(1), RG = makeLeg(-1);

  // busto con maglietta aderente
  const torso = new THREE.Group(); torso.position.y = hipY - .02; body.add(torso);
  mesh(torso, torsoGeo(fem, build), M.shirt);
  if (!lite){
    mesh(torso, LOGO_FRONT_GEO, LOGO_DECAL_MAT, 0, .45, .006, false).scale.set(.216, .085, .138);
    mesh(torso, LOGO_BACK_GEO, LOGO_DECAL_MAT, 0, .37, -.004, false).scale.set(.196, .17, .118);
  }
  const collar = mesh(torso, COLLAR_GEO, M.shirt, 0, .626, .006, false); collar.rotation.x = Math.PI/2; collar.scale.set(1.05, .85, 1);
  const neck = mesh(torso, new THREE.CylinderGeometry(.061, .07, .12, 18), M.skin, 0, .67, -.014);

  const UA = lite ? UPPER_ARM_GEO : limbGeo(.28, .052 * build, .04, armUpperProf, 16, 14);
  const FA = lite ? FOREARM_GEO : limbGeo(.235, .046, .028, forearmProf, 16, 12);
  const makeArm = side => {
    const sh = new THREE.Group(); sh.position.set(.214*side*(fem ? .92 : build), .55, 0); torso.add(sh);
    blob(sh, M.shirt, .056, .95, .9, .95, 0, -.018, 0);
    const sl = mesh(sh, new THREE.CylinderGeometry(.056*build, .059*build, .15, 18, 1, true), M.shirt, .003*side, -.08, 0); sl.rotation.z = -.05*side;
    const hem = mesh(sh, new THREE.TorusGeometry(.058*build, .004, 6, 20), M.shirt, .007*side, -.155, 0, false); hem.rotation.x = Math.PI/2;
    mesh(sh, UA, M.skin, 0, -.01, 0);
    const el = new THREE.Group(); el.position.y = -.285; sh.add(el);
    blob(el, M.skin, .038, 1, 1, 1, 0, 0, 0, false, true);
    mesh(el, FA, M.skin);
    const wr = new THREE.Group(); wr.position.y = -.248; el.add(wr);
    const hd = makeHand(wr, side, M, lite);
    return {sh, el, wr, digits:hd.digits};
  };
  const AL = makeArm(1), AR = makeArm(-1);
  // orologio al polso sinistro, anello con pietra rossa a destra
  if (o.watch){
    const w = new THREE.Group(); w.position.y = .018; AL.wr.add(w);
    const band = mesh(w, new THREE.TorusGeometry(.0285, .0042, 6, 22), M.steel, 0, 0, 0, false); band.rotation.x = Math.PI/2; band.scale.set(1, .88, 1);
    const cs = mesh(w, new THREE.CylinderGeometry(.016, .016, .009, 22), M.steel, .029, 0, 0, false); cs.rotation.z = Math.PI/2;
    const dl = mesh(w, new THREE.CylinderGeometry(.0125, .0125, .0095, 22), M.dial, .0305, 0, 0, false); dl.rotation.z = Math.PI/2;
  }
  if (o.ring && !lite){
    const ringF = AR.digits[2].joints[0];
    const rg = mesh(ringF, new THREE.TorusGeometry(.0098, .0024, 6, 16), M.gold, 0, -.012, 0, false); rg.rotation.x = Math.PI/2;
    blob(ringF, M.ruby, .005, 1, .7, 1, -.0105, -.012, 0, false, true);
  }

  // testa
  const head = new THREE.Group(); head.position.y = .7; head.scale.setScalar(1.1); torso.add(head);
  const hc = new THREE.Group(); hc.position.y = .112; head.add(hc);
  const skull = mesh(hc, HEAD_GEO, M.face); skull.rotation.y = 0;
  const eyes = [];
  for (const s of [-1, 1]){
    const ec = headPoint(s*.36, .13, 0);
    const eg = new THREE.Group(); eg.position.set(ec.x, ec.y, ec.z - .0085); hc.add(eg);
    const ball = blob(eg, M.iris, .0135, 1, 1, 1, 0, 0, 0, false); ball.rotation.y = -Math.PI/2;
    blob(eg, M.cornea, .0138, 1, 1, 1, 0, 0, .0006, false, true);
    eyes.push(eg);
    const lid = blob(hc, M.skin, .0146, 1.14, .34, .92, ec.x, ec.y + .0095, ec.z - .0075, false, true); eyes.push(lid);
    if (!lite){
      const lash = mesh(hc, LASH_GEO, M.brow, ec.x, ec.y + .0055, ec.z + .0045, false); lash.scale.set(.92, .5, 1);
      blob(hc, M.skin, .0138, 1.1, .26, .8, ec.x, ec.y - .0125, ec.z - .0075, false, true);
    }
    // sopracciglio in rilievo
    const bp = headPoint(s*.33, .29, .012);
    const br = mesh(hc, new THREE.BoxGeometry(.032, .0055, .008), M.brow, bp.x, bp.y, bp.z, false);
    br.rotation.set(-.2, s*.35, -s*.12);
    // orecchio
    const ep = headPoint(s*1.55, .06, -.04);
    const ear = blob(hc, M.skin, .026, .32, 1.0, .6, ep.x, ep.y, ep.z, true, true); ear.rotation.y = s*.2;
    if (!lite) blob(hc, M.brow, .013, .3, .7, .5, ep.x + s*.009, ep.y - .002, ep.z + .003, false, true);
  }
  // naso, labbra, mento
  const np = headPoint(0, -.12, 0);
  const nose = blob(hc, M.skin, .027, .3, .95, .5, 0, np.y + .014, np.z - .007, false, true); nose.rotation.x = -.38;
  blob(hc, M.skin, .0095, 1.15, .8, .9, 0, np.y - .012, np.z + .0035, false, true);
  if (!lite) for (const s of [-1,1]) blob(hc, M.skin, .0075, 1.1, .75, 1, s*.0105, np.y - .016, np.z + .0005, false, true);
  const lp = headPoint(0, -.41, 0);
  blob(hc, M.lip, .0145, 1.15, .22, .38, 0, lp.y + .003, lp.z - .003, false, true);
  blob(hc, M.lip, .014, 1.1, .27, .42, 0, lp.y - .005, lp.z - .0035, false, true);
  // capelli
  const HG = hairFor(hairStyle, lite);
  mesh(hc, HG.shell, M.hairShell, 0, 0, 0, true);
  mesh(hc, HG.tufts, M.hair, 0, 0, 0, false);

  const held = new THREE.Mesh(new THREE.BoxGeometry(.26,.26,.26), SMOOTH(0xffffff, .6));
  held.position.set(0, .2, .3); held.castShadow = true; held.visible = false; torso.add(held);

  Object.assign(H, {root, body, pelvis, torso, head, held, eyes,
    legL:LG.hip, legR:RG.hip, kneeL:LG.knee, kneeR:RG.knee, ankleL:LG.ankle, ankleR:RG.ankle,
    armL:AL.sh, armR:AR.sh, elbowL:AL.el, elbowR:AR.el, wristL:AL.wr, wristR:AR.wr,
    handL:AL.wr, handR:AR.wr, digitsL:AL.digits, digitsR:AR.digits, t:Math.random()*10});
  return H;
}

/* ---------- animazione: pose calcolate e mescolate con pesi smorzati ---------- */
const lerp = (a, b, k) => a + (b - a)*k;
const damp = (cur, target, rate, dt) => cur + (target - cur)*(1 - Math.exp(-rate*dt));
function curlHand(digits, side, curl, spread){
  for (const d of digits){
    d.joints.forEach((j, i)=>{
      const c = curl * d.w[i];
      if (d.thumb){ if (i === 0) j.rotation.set(-.55 - c*.35, 0, (-.4 - c*.5)*side); else j.rotation.z = -c*side; }
      else { j.rotation.z = -c*side; if (i === 0) j.rotation.y = 0; }
    });
    if (!d.thumb) d.joints[0].rotation.x = d.joints[0].position.z * (1.4 + spread*3);
  }
}
// a = {phase, speed, run, air, holding, working, turn, dt}
function animateHuman(H, a){
  const dt = Math.min(a.dt, .05), W = H.w;
  H.t += dt;
  W.walk = damp(W.walk, clamp((a.speed||0)/2.4, 0, 1), 7, dt);
  W.run  = damp(W.run, a.run ? 1 : 0, 4, dt);
  W.air  = damp(W.air, a.air ? 1 : 0, 10, dt);
  W.hold = damp(W.hold, a.holding ? 1 : 0, 6, dt);
  W.work = damp(W.work, a.working ? 1 : 0, 5, dt);
  W.lean = damp(W.lean, clamp(-(a.turn||0)*.05, -.16, .16), 5, dt);
  W.sit = damp(W.sit || 0, a.sit ? 1 : 0, 6, dt);
  W.drink = damp(W.drink || 0, a.drink ? 1 : 0, 7, dt);
  const p = a.phase, w = W.walk, r = W.run, air = W.air, hold = W.hold, work = W.work;
  const idle = 1 - w, t = H.t;
  const breath = Math.sin(t*2.1);
  const shift = Math.sin(t*.37);                        // spostamento del peso da fermo

  // --- gambe: ciclo del passo con appoggio, spinta e volo
  const leg = (q, sideShift) => {
    const hip = Math.sin(q) * (.4 + .3*r) * w;
    const swing = Math.max(0, -Math.cos(q - .35));
    const knee = w*((.95 + .55*r) * Math.pow(swing, 1.4) + .12*Math.max(0, Math.cos(q + .8))) + idle*(.03 + .07*Math.max(0, sideShift));
    const push = Math.pow(Math.max(0, Math.cos(q - 1.45)), 8) * .5 * w;
    const flat = .8 + .2*clamp(Math.cos(q)*4, -1, 1);
    const ankle = -(hip + knee)*flat + push - .08*swing*w;
    return {hip, knee, ankle};
  };
  const lL = leg(p, shift), lR = leg(p + Math.PI, -shift);
  const airL = {hip:-.55, knee:1.0, ankle:-.25}, airR = {hip:.15, knee:.55, ankle:.1};
  H.legL.rotation.x = lerp(lL.hip, airL.hip, air); H.kneeL.rotation.x = lerp(lL.knee, airL.knee, air); H.ankleL.rotation.x = lerp(lL.ankle, airL.ankle, air);
  H.legR.rotation.x = lerp(lR.hip, airR.hip, air); H.kneeR.rotation.x = lerp(lR.knee, airR.knee, air); H.ankleR.rotation.x = lerp(lR.ankle, airR.ankle, air);
  H.legL.rotation.z = .02 + idle*.02*shift; H.legR.rotation.z = -.02 + idle*.02*shift;

  // --- bacino e busto
  const bob = -(.03 + .03*r) * (.5 - .5*Math.cos(2*p)) * w;
  H.body.position.y = bob - idle*.012*Math.abs(shift);
  H.body.position.x = .018*Math.cos(p)*w + idle*.012*shift;
  H.pelvis.rotation.y = .13*Math.sin(p)*w;
  H.pelvis.rotation.z = -.04*Math.cos(p)*w - idle*.03*shift;
  H.torso.rotation.y = -.17*Math.sin(p)*w;
  H.torso.rotation.x = .03*w + .15*r + .05*work + breath*.006*idle;
  H.torso.rotation.z = W.lean + .03*Math.cos(p)*w + idle*.02*shift;
  H.torso.position.y = .91 + breath*.004*idle;
  // testa stabile: compensa busto e rimbalzo, da ferma si guarda attorno
  const look = Math.sin(t*.45)*.35*Math.max(0, Math.sin(t*.13));
  H.head.rotation.y = -H.torso.rotation.y*.85 + look*idle*(1 - work);
  H.head.rotation.x = -H.torso.rotation.x*.6 + .06*work + Math.sin(t*.3)*.03*idle;
  H.head.rotation.z = -H.torso.rotation.z*.7;

  // --- braccia: oscillazione opposta alle gambe con un leggero ritardo
  const as = Math.sin(p - .15) * (.55 + .35*r) * w;
  const walkArm = side => {
    const sw = side > 0 ? -as : as;
    return {x:sw, z:(.07 + .06*r)*side + (idle ? breath*.012*side*idle : 0),
      el:-(.12 + .95*r + .45*Math.max(0, -sw)*(1 - r*.4)) * (0.35 + .65*Math.max(w, .25))};
  };
  const setArm = (sh, el, wr, digits, side) => {
    const wa = walkArm(side);
    const wk = Math.sin(t*9 + side)*.14;
    let x = wa.x, z = wa.z, e = wa.el;
    x = lerp(x, -.62, hold); z = lerp(z, .18*side, hold); e = lerp(e, -.85, hold);
    x = lerp(x, -.72 + wk, work); z = lerp(z, .12*side, work); e = lerp(e, -.95 - wk, work);
    x = lerp(x, -.35, air*(1 - hold)); z = lerp(z, .35*side, air*(1 - hold));
    sh.rotation.set(x, 0, z);
    el.rotation.set(e, 0, 0);
    wr.rotation.set(lerp(-.05 + .05*Math.sin(p)*w, .1, hold), lerp(0, .15*side, hold), lerp(0, -.6*side, hold));
    const curl = lerp(lerp(.32 + .06*Math.sin(t*.8 + side), .5 + .35*r, w*r), 1.05, hold) * (1 - work) + work*(.45 + .3*Math.sin(t*7 + side*2));
    curlHand(digits, side, curl, (1 - hold)*.02);
  };
  setArm(H.armL, H.elbowL, H.wristL, H.digitsL, 1);
  setArm(H.armR, H.elbowR, H.wristR, H.digitsR, -1);
  if (W.drink > .01){
    const k = W.drink, sip = Math.sin(t*3)*.06;
    H.armR.rotation.x = lerp(H.armR.rotation.x, -1.05 + sip, k);
    H.armR.rotation.z = lerp(H.armR.rotation.z, -.55, k);
    H.elbowR.rotation.x = lerp(H.elbowR.rotation.x, -2.05, k);
    H.wristR.rotation.set(lerp(H.wristR.rotation.x, .35, k), 0, lerp(H.wristR.rotation.z, .9, k));
    curlHand(H.digitsR, -1, lerp(.3, 1.0, k), 0);
    H.head.rotation.x = lerp(H.head.rotation.x, -.35 + sip*.5, k);
  }

  // --- battito di ciglia
  H.blink -= dt;
  let lidK = 1;
  if (H.blink < 0){ lidK = clamp(Math.abs(H.blink + .07)/.07, .08, 1); if (H.blink < -.14){ H.blink = 2.5 + Math.random()*4; lidK = 1; } }
  for (let i=0;i<H.eyes.length;i+=2) H.eyes[i].scale.y = lidK;
  if (W.sit > .01){
    const k = W.sit, sw = Math.sin(H.t*1.4)*.05;
    H.legL.rotation.x = lerp(H.legL.rotation.x, -1.35 + sw, k); H.legR.rotation.x = lerp(H.legR.rotation.x, -1.35 - sw, k);
    H.kneeL.rotation.x = lerp(H.kneeL.rotation.x, .55, k); H.kneeR.rotation.x = lerp(H.kneeR.rotation.x, .55, k);
    H.ankleL.rotation.x = lerp(H.ankleL.rotation.x, .25, k); H.ankleR.rotation.x = lerp(H.ankleR.rotation.x, .25, k);
    H.legL.rotation.z = lerp(H.legL.rotation.z, .06, k); H.legR.rotation.z = lerp(H.legR.rotation.z, -.06, k);
    H.armL.rotation.set(lerp(H.armL.rotation.x, -2.25, k), 0, lerp(H.armL.rotation.z, .3, k));
    H.armR.rotation.set(lerp(H.armR.rotation.x, -2.25, k), 0, lerp(H.armR.rotation.z, -.3, k));
    H.elbowL.rotation.x = lerp(H.elbowL.rotation.x, -.25, k); H.elbowR.rotation.x = lerp(H.elbowR.rotation.x, -.25, k);
    H.torso.rotation.x = lerp(H.torso.rotation.x, .12 + sw*.4, k);
    H.body.position.y = lerp(H.body.position.y, 0, k);
    curlHand(H.digitsL, 1, .95, 0); curlHand(H.digitsR, -1, .95, 0);
  }
  H.held.visible = hold > .5 && W.sit < .5;
}

/* ---------- il protagonista ---------- */
const HERO_EXTRA = {can:null};
let hero = null, steve = null, held = null;
function buildHero(look){
  let pos = null, rot = 0;
  if (steve){ pos = steve.position.clone(); rot = steve.rotation.y; scene.remove(steve); }
  hero = makeHuman(look || {});
  steve = hero.root; scene.add(steve);
  if (pos){ steve.position.copy(pos); steve.rotation.y = rot; }
  held = hero.held;
  if (HERO_EXTRA.can) hero.wristR.add(HERO_EXTRA.can);
}
buildHero({hair:0x8a6232, skin:0xdca183, eye:0x5b86b8, shoe:0x22305a, pants:0x243c66, beard:.3, watch:true, ring:true, hairStyle:'tousled'});
const heldMats = { blueprint: MAT.blueprint, pack: MAT.cardboard };
// frigo delle bibite energetiche (si compra nel Negozio)
const FRIDGE = {x:-11.55, z:1.75};
const energyCanTex = (()=>{
  const c = mkCanvas(256,256), g = c.getContext('2d'), t = new THREE.CanvasTexture(c);
  const draw = ()=>{
    const gr = g.createLinearGradient(0,0,256,0);
    gr.addColorStop(0,'#1a3a7a'); gr.addColorStop(.5,'#2e5fb8'); gr.addColorStop(1,'#1a3a7a');
    g.fillStyle = gr; g.fillRect(0,0,256,256);
    g.fillStyle = '#c9ced8'; g.fillRect(0,150,256,70);
    for (let x=0;x<256;x+=128){
      if (logoImg.naturalWidth) g.drawImage(logoImg, x+24, 40, 80, 68);
      g.fillStyle = '#ffffff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('LDM', x+64, 180);
      g.fillStyle = '#1a3a7a'; g.font = 'bold 20px sans-serif'; g.fillText('ENERGY', x+64, 206);
    }
    t.needsUpdate = true;
  };
  draw(); onLogo(draw);
  return t;
})();
const CAN_GEO = new THREE.CylinderGeometry(.033, .033, .12, 16);
const CAN_MATS = [new THREE.MeshStandardMaterial({map:energyCanTex, roughness:.25, metalness:.6}),
  new THREE.MeshStandardMaterial({color:0xcfd3d9, roughness:.25, metalness:.85}), new THREE.MeshStandardMaterial({color:0xcfd3d9, roughness:.25, metalness:.85})];
const fridgeObj = (()=>{
  const g = new THREE.Group(); g.position.set(FRIDGE.x, 0, FRIDGE.z); g.rotation.y = Math.PI/2; g.visible = false; scene.add(g);
  const body = new THREE.MeshStandardMaterial({color:0x1d3f86, roughness:.35, metalness:.4});
  const inner = new THREE.MeshStandardMaterial({color:0xe9f1ff, roughness:.6, emissive:0xbfd8ff, emissiveIntensity:.55});
  const pb = (w,h,d,m,x,y,z,sh=true) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); b.position.set(x,y,z); b.castShadow = sh; b.receiveShadow = true; g.add(b); return b; };
  pb(.9,.12,.7,body,0,.06,0);
  pb(.9,1.9,.05,body,0,1.07,-.32);
  pb(.05,1.9,.7,body,-.43,1.07,0); pb(.05,1.9,.7,body,.43,1.07,0);
  pb(.9,.05,.7,body,0,2.0,0);
  pb(.8,1.78,.02,inner,0,1.06,-.29,false);
  // insegna luminosa in alto
  const sc = mkCanvas(384,96), sg = sc.getContext('2d'), st = new THREE.CanvasTexture(sc);
  const drawSign = ()=>{ sg.fillStyle = '#0f2552'; sg.fillRect(0,0,384,96);
    if (logoImg.naturalWidth) sg.drawImage(logoImg, 14, 10, 90, 76);
    sg.fillStyle = '#ffffff'; sg.font = 'bold 40px sans-serif'; sg.fillText('ENERGY', 120, 62); st.needsUpdate = true; };
  drawSign(); onLogo(drawSign);
  pb(.9,.28,.7,body,0,2.16,0);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(.86,.24), new THREE.MeshBasicMaterial({map:st})); sign.position.set(0,2.16,.353); g.add(sign);
  // ripiani pieni di lattine
  const shelfM = new THREE.MeshStandardMaterial({color:0xdfe6ee, roughness:.3, metalness:.5});
  for (let r=0;r<4;r++){
    const y = .35 + r*.42;
    pb(.8,.02,.6,shelfM,0,y,0,false);
    for (let k=0;k<7;k++) for (let d=0;d<2;d++){
      const can = new THREE.Mesh(CAN_GEO, CAN_MATS); can.position.set(-.33 + k*.11, y + .07, .12 - d*.16); can.rotation.y = -.4; g.add(can);
    }
  }
  // anta di vetro con maniglia
  const glassM = new THREE.MeshStandardMaterial({color:0xcfe8ff, roughness:.05, metalness:.1, transparent:true, opacity:.22, depthWrite:false});
  pb(.82,1.8,.02,glassM,0,1.06,.34,false);
  const frameM = new THREE.MeshStandardMaterial({color:0x13295a, roughness:.4, metalness:.5});
  pb(.9,.05,.04,frameM,0,.17,.34); pb(.9,.05,.04,frameM,0,1.97,.34);
  pb(.05,1.85,.04,frameM,-.43,1.07,.34); pb(.05,1.85,.04,frameM,.43,1.07,.34);
  pb(.03,.6,.05,new THREE.MeshStandardMaterial({color:0xc0c6cf, roughness:.2, metalness:.9}),.36,1.15,.39);
  const tag = makeWallTag('Frigo LDM Energy', '#7fd0ff', 1.0); tag.position.set(0, 2.55, -.345); g.add(tag);
  return g;
})();
const FRIDGE_COL = [FRIDGE.x - .45, FRIDGE.x + .4, FRIDGE.z - .5, FRIDGE.z + .5];
// lattina in mano al protagonista (visibile mentre beve)
const heroCan = new THREE.Mesh(CAN_GEO, CAN_MATS);
heroCan.position.set(-.012, -.07, .045); heroCan.rotation.x = .2; heroCan.visible = false;
hero.wristR.add(heroCan); HERO_EXTRA.can = heroCan;
