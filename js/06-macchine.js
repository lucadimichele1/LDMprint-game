/* ---------- costruttori dinamici ---------- */
const SPOOL_MAT = new THREE.MeshLambertMaterial({vertexColors:true});
const PRINTER_GEO = (()=>{
  const D = MAT.dark, parts = [
    [1.2,.18,1.2,0,.09,0,D], [1.2,.14,1.2,0,1.25,0,D],
    ...[[-.55,-.55],[.55,-.55],[-.55,.55],[.55,.55]].map(([x,z])=>[.1,1.0,.1,x,.68,z,D]),
    [1.1,1.0,.05,0,.68,-.57,MAT.panel], [.9,.04,.9,0,.3,0,MAT.plate], [1.0,.3,.7,0,1.47,-.1,MAT.ams],
    ...[0xff7a1a,0x2ec4b6,0xf1f2f6,0x2d3436].map((c,k)=>[.17,.14,.02,-.33+k*.22,1.47,.26,SPOOL_MAT,c]),
  ];
  return mergeBoxes(parts);
})();
const PRINTER_GLASS = mergeBoxes([[1.0,1.0,.02,0,.68,.58,MAT.glass],[.02,1.0,1.0,.58,.68,0,MAT.glass],[.02,1.0,1.0,-.58,.68,0,MAT.glass]])[0];
function buildPrinter(i, model){
  const s = PRINTER_SLOTS[i % PRINTER_SLOTS.length];
  const g = new THREE.Group(); g.position.set(s.x,0,s.z); g.rotation.y = s.r; scene.add(g);
  return buildPrinterModel(g, model || 'p1s', i, `Stampante 3D #${Math.floor(i/100)+1}-${i%100+1}`, s.tag);
}
function updateShelf(grams){
  const n = Math.min(shelfSpools.length, Math.ceil(grams/1000));
  shelfSpools.forEach((g,i)=>{ g.visible = i < n; });
}
const MAT_LED_ERR = new THREE.MeshBasicMaterial({color:0xff2a2a});
const SPAG_GEO = (()=>{
  const R = mulberry32(99), geos = [];
  for (let k=0;k<30;k++){
    const t = new THREE.TorusGeometry(.04+R()*.12, .008, 4, 10, Math.PI*(.6+R()*1.2)).toNonIndexed();
    t.rotateX(R()*6.3); t.rotateY(R()*6.3); t.rotateZ(R()*6.3);
    t.translate((R()-.5)*.55, R()*.42, (R()-.5)*.55);
    geos.push(t);
  }
  let total = 0; for (const g of geos) total += g.attributes.position.count;
  const merged = new THREE.BufferGeometry();
  for (const name of ['position','normal']){
    const arr = new Float32Array(total*3); let o = 0;
    for (const g of geos){ arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    merged.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  merged.computeBoundingSphere();
  return merged;
})();
function buildSpaghetti(g){
  const mat = L({color:0xffffff});
  const sg = new THREE.Mesh(SPAG_GEO, mat); sg.position.y = .34; sg.visible = false; g.add(sg);
  return {sg, mat};
}
/* ---------- modelli di stampante ---------- */
const PRINTER_MODELS = {
  mini: {name:'A1 mini', desc:'Economica e compatta, lenta; solo pezzi piccoli.', speed:1.45, costMult:.5, power:.15, big:false, plateMult:.5},
  a1:   {name:'A1', desc:'Piatto grande, buon rapporto qualità-prezzo.', speed:1.15, costMult:.75, power:.25, big:true, plateMult:1},
  p1s:  {name:'P1S', desc:'Chiusa, affidabile, con AMS multicolore.', speed:1, costMult:1, power:.35, big:true, plateMult:1},
  h2s:  {name:'H2S Combo', desc:'La più veloce: doppio estrusore e AMS grande.', speed:.65, costMult:2.4, power:.6, big:true, plateMult:1.25},
};
const PRINTER_KIT = (()=>{
  const D = MAT.dark, B = MAT.black, A = MAT.ams, P = MAT.plate;
  const spoolRow = (n, y, z, w) => [0xff7a1a,0x2ec4b6,0xf1f2f6,0x2d3436,0xe84393,0x6c5ce7,0xf7b731,0x20bf6b].slice(0,n)
    .map((c,k)=>[.15,.13,.02,-w/2 + w/(n)*(k+.5),y,z,SPOOL_MAT,c]);
  const kits = {};
  kits.p1s = {geo:PRINTER_GEO, glass:PRINTER_GLASS, bar:[1.05,.05,.06], head:[.22,.18,.22], rest:{bar:1.12, head:1.02}, bot:.32, range:.45,
    led:[.34,.05,.02,0,1.25,.61], obj:1, objY:.32, bed:null};
  kits.h2s = {geo:mergeBoxes([
      [1.36,.2,1.2,0,.1,0,B], [1.36,.16,1.2,0,1.46,0,B],
      ...[[-.62,-.54],[.62,-.54],[-.62,.54],[.62,.54]].map(([x,z])=>[.1,1.2,.1,x,.8,z,B]),
      [1.26,1.2,.05,0,.8,-.57,MAT.panel], [1.0,.04,.95,0,.34,0,P], [1.3,.34,.95,0,1.71,-.05,A],
      ...spoolRow(8, 1.73, .43, 1.2),
      [.3,.18,.02,.42,1.46,.61,MAT.screen],
    ]),
    glass:mergeBoxes([[1.2,1.2,.02,0,.8,.58,MAT.glass],[.02,1.2,1.08,.66,.8,0,MAT.glass],[.02,1.2,1.08,-.66,.8,0,MAT.glass]])[0],
    bar:[1.22,.06,.07], head:[.3,.2,.24], rest:{bar:1.32, head:1.2}, bot:.36, range:.55, led:[.5,.05,.02,-.25,1.46,.61], obj:1.15, objY:.36, bed:null};
  kits.a1 = {geo:mergeBoxes([
      [1.1,.12,.95,0,.06,0,A], [.9,.03,.08,0,.13,0,D],
      [.07,1.12,.1,-.5,.68,-.28,D], [.07,1.12,.1,.5,.68,-.28,D], [1.07,.07,.1,0,1.25,-.28,D],
      [.2,.2,.06,0,1.42,-.28,SPOOL_MAT,0xff7a1a], [.05,.12,.05,0,1.31,-.28,D],
    ]), glass:null,
    bar:[1.0,.06,.07], head:[.16,.2,.18], rest:{bar:1.0, head:.9}, bot:.2, range:.5, led:[.22,.04,.02,.3,.08,.48], obj:1, objY:.2,
    bed:{plate:[.64,.03,.64], y:.16, travel:.2}};
  kits.mini = {geo:mergeBoxes([
      [.8,.1,.75,0,.05,0,A], [.07,.92,.08,-.33,.55,-.22,D],
      [.18,.18,.05,-.33,1.12,-.22,SPOOL_MAT,0x2ec4b6],
    ]), glass:null,
    bar:[.62,.06,.07], head:[.14,.18,.16], rest:{bar:.85, head:.76}, bot:.18, range:.4, led:[.18,.04,.02,.2,.07,.38], obj:.75, objY:.18,
    bed:{plate:[.46,.03,.46], y:.13, travel:.14}, barX:-.02};
  return kits;
})();
function buildPrinterModel(g, model, idx, tagText, tagZ){
  const K = PRINTER_KIT[model] || PRINTER_KIT.p1s;
  for (const part of K.geo){
    const m = new THREE.Mesh(part.geo, part.mat);
    m.castShadow = part.mat === MAT.dark || part.mat === MAT.ams || part.mat === MAT.black; m.receiveShadow = true; g.add(m);
  }
  if (K.glass) g.add(new THREE.Mesh(K.glass.geo, K.glass.mat));
  let bed = null, holder = g;
  if (K.bed){
    bed = new THREE.Group(); bed.position.y = K.bed.y; g.add(bed);
    box(K.bed.plate[0], K.bed.plate[1], K.bed.plate[2], MAT.plate, 0, 0, 0, bed, true);
    holder = bed;
  }
  const bar = box(K.bar[0],K.bar[1],K.bar[2],MAT.dark,K.barX||0,K.rest.bar,K.bed ? -.2 : 0,g,true);
  const head = box(K.head[0],K.head[1],K.head[2],MAT.toolhead,0,K.rest.head,K.bed ? -.08 : 0,g,true);
  const og = new THREE.BoxGeometry(.38*K.obj,.45*K.obj,.38*K.obj); og.translate(0,.225*K.obj,0);
  const obj = new THREE.Mesh(og, L({color:0xffffff})); obj.position.y = K.bed ? .02 : K.objY; obj.visible = false; obj.castShadow = true; holder.add(obj);
  const led = box(K.led[0],K.led[1],K.led[2],MAT.ledOff,K.led[3],K.led[4],K.led[5],g,true);
  const label = makeWallTag(tagText, '#ffffff', 1.45); label.position.set(0,2.05,tagZ); g.add(label);
  const spag = buildSpaghetti(holder); spag.sg.position.y = K.bed ? .04 : K.objY + .02; spag.sg.scale.setScalar(K.obj);
  return {g, bar, head, obj, led, label, lastColor:null, spag, bed, kit:K, model};
}

// STAMPANTE DEI PROTOTIPI nell'ufficio
const PROTO_POS = {x:-6.0, z:-11.65};
const protoObj = (()=>{
  const g = new THREE.Group(); g.position.set(PROTO_POS.x, 0, PROTO_POS.z); g.rotation.y = Math.PI; scene.add(g);
  return buildPrinterModel(g, 'h2s', -1, 'Stampante prototipi', -.64);
})();
addCol(PROTO_POS.x-.7, PROTO_POS.x+.7, -12.3, -11);

function buildChest(i){
  const s = CHEST_SLOTS_POS[i];
  const g = new THREE.Group(); g.position.set(s.x,0,s.z); g.rotation.y = s.r; scene.add(g);
  box(.9,.6,.9,MAT.chest,0,.3,0,g);
  const pivot = new THREE.Group(); pivot.position.set(0,.6,-.45); g.add(pivot);
  box(.9,.28,.9,MAT.chest,0,.14,.45,pivot);
  box(.14,.22,.06,MAT.metal,0,.02,.92,pivot);
  const label = makeWallTag(`Cassa #${i+1}`, '#ffffff', 1.0); label.position.set(0,1.75,-.49); g.add(label);
  return {g, pivot, label, open:0};
}

/* ---------- progetto nel mondo (faro blu) ---------- */
function buildBlueprintObj(x,z){
  const g = new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  const paper = new THREE.Mesh(new THREE.BoxGeometry(.7,.9,.04), MAT.blueprint); paper.position.y = 1.2; paper.castShadow = true; g.add(paper);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,18,12,1,true),
    new THREE.MeshBasicMaterial({color:0x4aa8ff, transparent:true, opacity:.28, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
  beam.position.y = 9; g.add(beam);
  const base = box(.8,.1,.8,MAT.stoneBrick,0,.05,0,g);
  const lab = makeTextSprite('Nuovo progetto!','#8fd3ff',2.2); lab.position.y = 2.2; g.add(lab);
  return {g, paper};
}

/* ---------- faro obiettivo ---------- */
const beacon = new THREE.Group(); scene.add(beacon);
{
  const bm = new THREE.MeshBasicMaterial({color:0xff8a1f, transparent:true, opacity:.22, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide});
  const col = new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,26,10,1,true), bm); col.position.y = 13; beacon.add(col);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(.28,.5,4), new THREE.MeshBasicMaterial({color:0xff8a1f}));
  cone.rotation.x = Math.PI; cone.position.y = 3; beacon.add(cone); beacon.userData.cone = cone;
}
beacon.visible = false;
