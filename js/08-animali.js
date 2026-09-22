/* =====================================================================
   GATTO bianco e nero (codice EASY)
   ===================================================================== */
const CATM = {
  black: SMOOTH(0x1a1a1c, .8, HTEX.fur),
  white: SMOOTH(0xf5f3ef, .9, HTEX.fur),
  pink: SMOOTH(0xe39aa5, .55),
  eye: SMOOTH(0xa8d23a, .12, null, {emissive:0x3a5000, emissiveIntensity:.35}),
  pupil: SMOOTH(0x050505, .1),
  whisker: new THREE.MeshBasicMaterial({color:0xf0f0f0}),
};
const CAT_EAR = new THREE.ConeGeometry(.025, .052, 14);
const CAT_EAR_IN = new THREE.ConeGeometry(.016, .036, 10);
const CAT_WHISKER = new THREE.CylinderGeometry(.0009, .0004, .085, 3);
function makeCat(){
  const C = {root:new THREE.Group(), t:Math.random()*9, w:{walk:0, run:0, sit:0, eat:0}, blink:2, ear:0};
  const body = new THREE.Group(); body.position.y = .205; C.root.add(body); C.body = body;
  blob(body, CATM.black, .1, .72, .8, 2.25, 0, 0, 0, true, 'hi');                // tronco
  blob(body, CATM.white, .1, .6, .55, 1.75, 0, -.035, .01, false);                // pancia
  blob(body, CATM.white, .068, .85, .95, 1, 0, -.012, .15, true);                 // petto
  blob(body, CATM.black, .064, 1.05, .85, 1.05, 0, .012, -.155, true);            // groppa
  // testa
  const neck = new THREE.Group(); neck.position.set(0, .045, .19); body.add(neck); C.neck = neck;
  blob(neck, CATM.black, .048, .95, 1.05, 1.2, 0, .01, .02, true);
  const head = new THREE.Group(); head.position.set(0, .055, .06); neck.add(head); C.head = head;
  blob(head, CATM.black, .062, 1.08, .9, 1.02, 0, 0, 0, true, 'hi');
  blob(head, CATM.white, .03, 1.3, .82, 1, 0, -.022, .045, false);               // muso
  blob(head, CATM.white, .02, .5, 1.6, .5, 0, .012, .054, false, true);          // striscia bianca
  blob(head, CATM.white, .022, 1, .7, .9, 0, -.036, .03, false, true);           // mento
  blob(head, CATM.pink, .0075, 1.3, .8, .9, 0, -.009, .077, false, true);        // naso
  C.eyes = [];
  for (const s of [1,-1]){
    const eg = new THREE.Group(); eg.position.set(.027*s, .01, .05); eg.rotation.y = .28*s; head.add(eg);
    blob(eg, CATM.eye, .0125, 1, 1, .6, 0, 0, 0, false);
    blob(eg, CATM.pupil, .012, .22, .88, .3, 0, 0, .0045, false, true);
    blob(eg, CATM.white, .0018, 1, 1, .4, .003*s, .004, .0075, false, true);
    C.eyes.push(eg);
    const ear = new THREE.Group(); ear.position.set(.036*s, .045, -.008); ear.rotation.set(-.12, 0, -.32*s); head.add(ear);
    mesh(ear, CAT_EAR, CATM.black, 0, .02, 0).scale.set(1, 1, .55);
    mesh(ear, CAT_EAR_IN, CATM.pink, 0, .015, .006, false).scale.set(1, 1, .3);
    if (s > 0) C.earL = ear; else C.earR = ear;
    for (let k=0;k<3;k++){
      const wk = mesh(head, CAT_WHISKER, CATM.whisker, .03*s, -.02 - k*.006, .062, false);
      wk.rotation.set(0, 0, (Math.PI/2 + (k-1)*.18)*s); wk.position.x += .038*s;
      wk.rotation.y = -.35*s;
    }
  }
  // zampe
  C.legs = [];
  const LEGU = taperGeo(.092, .029, .02, 12, .45, 1.1), LEGL = taperGeo(.075, .019, .014, 10, .5, 1.02);
  const addLeg = (x, z, front, phaseOff) => {
    const up = new THREE.Group(); up.position.set(x, -.02, z); body.add(up);
    mesh(up, LEGU, front ? CATM.black : CATM.black);
    const low = new THREE.Group(); low.position.y = -.09; up.add(low);
    mesh(low, LEGL, CATM.white);
    blob(low, CATM.white, .021, 1, .62, 1.3, 0, -.085, .01, true);
    C.legs.push({up, low, front, off:phaseOff});
  };
  addLeg(.043, .15, true, 0); addLeg(-.043, .15, true, Math.PI);
  addLeg(.05, -.15, false, Math.PI); addLeg(-.05, -.15, false, 0);
  blob(body, CATM.black, .056, .62, 1.05, 1.2, .05, -.015, -.14, false);         // cosce
  blob(body, CATM.black, .056, .62, 1.05, 1.2, -.05, -.015, -.14, false);
  blob(body, CATM.black, .042, .6, 1.05, 1, .045, -.005, .15, false, true);      // spalle
  blob(body, CATM.black, .042, .6, 1.05, 1, -.045, -.005, .15, false, true);
  // coda a segmenti
  C.tail = [];
  let par = new THREE.Group(); par.position.set(0, .035, -.215); body.add(par);
  for (let i=0;i<8;i++){
    const r0 = .018*(1 - i*.075), r1 = .018*(1 - (i+1)*.075);
    mesh(par, taperGeo(.043, r0, r1, 8, .5, 1), CATM.black, 0, 0, 0, i < 3);
    C.tail.push(par);
    const nx = new THREE.Group(); nx.position.y = -.041; par.add(nx); par = nx;
  }
  return C;
}
// m = {speed, phase, sit, eat (0 no, 1 cibo, 2 acqua), lookYaw, dt}
function animateCat(C, m){
  const dt = Math.min(m.dt, .05), W = C.w;
  C.t += dt;
  W.walk = damp(W.walk, clamp(m.speed/1.2, 0, 1), 6, dt);
  W.run = damp(W.run, clamp((m.speed - 2)/2, 0, 1), 4, dt);
  W.sit = damp(W.sit, m.sit ? 1 : 0, 3, dt);
  W.eat = damp(W.eat, m.eat ? 1 : 0, 4, dt);
  const p = m.phase, w = W.walk, r = W.run, sit = W.sit, eat = W.eat, t = C.t;
  for (const L of C.legs){
    const q = p + L.off + (L.front ? 0 : .5);
    const sw = Math.sin(q) * (.45 + .25*r) * w;
    const lift = Math.max(0, -Math.cos(q)) * (.7 + .4*r) * w;
    let ux = sw, lx = L.front ? lift : -lift*1.1;
    if (!L.front){ ux += -.15*w; lx += .1*w; }
    // seduto: zampe posteriori piegate, anteriori dritte
    if (L.front){ ux = lerp(ux, .62, sit); lx = lerp(lx, -.05, sit); }
    else { ux = lerp(ux, -1.25, sit); lx = lerp(lx, 2.35, sit); }
    // mangia: zampe anteriori un po' piegate
    if (L.front){ ux = lerp(ux, .25, eat); lx = lerp(lx, -.35, eat); }
    else { ux = lerp(ux, -.35, eat); lx = lerp(lx, .55, eat); }
    L.up.rotation.x = ux; L.low.rotation.x = lx;
  }
  const bob = -Math.abs(Math.sin(p))*.01*w;
  C.body.position.y = .205 + bob - .05*sit - .035*eat;
  C.body.position.z = -.03*sit;
  C.body.rotation.x = -.62*sit + .12*eat + .05*r*Math.sin(p*2);
  C.body.rotation.z = .025*Math.sin(p)*w;
  // testa: guarda il giocatore da fermo, giù quando mangia
  const lick = m.eat === 2 ? Math.sin(t*16)*.035 : Math.sin(t*9)*.07;
  C.neck.rotation.x = lerp(lerp(.05*Math.sin(p*2)*w, .42, sit), .95 + lick, eat);
  C.head.rotation.y = damp(C.head.rotation.y, clamp(m.lookYaw || 0, -.7, .7)*(1 - eat)*(1 - w*.7), 3, dt);
  C.head.rotation.x = lerp(.18*sit, .2, eat);
  // orecchie che si muovono ogni tanto
  C.ear -= dt;
  if (C.ear < 0){ C.ear = 1.5 + Math.random()*4; C.twitch = Math.random() < .5 ? C.earL : C.earR; C.twitchT = .25; }
  if (C.twitchT > 0){ C.twitchT -= dt; if (C.twitch) C.twitch.rotation.y = Math.sin(C.twitchT*40)*.25; }
  // coda: alta a punto di domanda quando cammina, arrotolata da seduto
  const base = lerp(lerp(lerp(2.25, 2.55, w), 1.35, sit), 1.9, eat);
  C.tail[0].rotation.x = base;
  C.tail[0].rotation.z = Math.sin(t*1.3)*(.2 + .15*(1 - w));
  for (let i=1;i<C.tail.length;i++){
    const k = i/C.tail.length;
    const curlW = w*(1 - sit)*(k > .6 ? -.35 : .04);
    const curlS = sit*(i > 1 ? .32 : .5);
    C.tail[i].rotation.x = curlW + curlS + eat*.05;
    C.tail[i].rotation.z = Math.sin(t*2.2 - i*.6)*(.07 + .08*k)*(1 + (1 - w));
    C.tail[i].rotation.y = sit*.22;
  }
  // battito di palpebre (occhi che si chiudono piano quando è rilassato)
  C.blink -= dt;
  let e = 1;
  if (C.blink < 0){ e = clamp(Math.abs(C.blink + .1)/.1, .1, 1); if (C.blink < -.2){ C.blink = 2 + Math.random()*5; e = 1; } }
  const relax = sit ? .55 + .45*Math.max(0, Math.sin(t*.5)) : 1;
  for (const eg of C.eyes) eg.scale.y = e*relax;
}

/* =====================================================================
   CANE JARVIS (simile a un golden retriever) — codice JARVIS
   ===================================================================== */
const DOGM = {
  gold: SMOOTH(0xcf9448, .85, HTEX.fur),
  light: SMOOTH(0xe8c483, .9, HTEX.fur),
  nose: SMOOTH(0x141414, .3),
  eye: SMOOTH(0x2e1a0c, .12),
  white: SMOOTH(0xffffff, .2),
  tongue: SMOOTH(0xe0707f, .35),
  collar: SMOOTH(0x1d4fa3, .45),
  tag: SMOOTH(0xf5c542, .2, null, {metalness:.85}),
};
function makeDog(){
  const D = {root:new THREE.Group(), t:Math.random()*9, w:{walk:0, run:0, lie:0, eat:0, bow:0}, blink:2};
  const body = new THREE.Group(); body.position.y = .535; D.root.add(body); D.body = body;
  blob(body, DOGM.gold, .2, .72, .78, 1.9, 0, 0, 0, true, 'hi');
  blob(body, DOGM.light, .14, .78, .82, .9, 0, -.03, .26, true);          // petto
  blob(body, DOGM.gold, .15, .86, .86, 1.05, 0, .02, -.26, true);         // groppa
  blob(body, DOGM.light, .17, .55, .36, 1.4, 0, -.13, .02, false);        // pelo sotto la pancia
  const neck = new THREE.Group(); neck.position.set(0, .1, .32); body.add(neck); D.neck = neck;
  const nk = blob(neck, DOGM.gold, .1, 1, 1.3, 1.1, 0, .07, .04, true); nk.rotation.x = -.5;
  const collar = mesh(neck, new THREE.TorusGeometry(.098, .016, 8, 22), DOGM.collar, 0, .05, .03, false); collar.rotation.x = Math.PI/2 - .5;
  blob(neck, DOGM.tag, .018, 1, 1, .35, 0, -.05, .1, false, true);
  const head = new THREE.Group(); head.position.set(0, .19, .1); neck.add(head); D.head = head;
  blob(head, DOGM.gold, .11, .95, .9, 1.05, 0, 0, 0, true, 'hi');
  blob(head, DOGM.gold, .07, .82, .72, 1.35, 0, -.035, .12, true);        // muso
  blob(head, DOGM.light, .055, .86, .6, 1.2, 0, -.052, .14, false);
  blob(head, DOGM.nose, .026, 1.25, .9, .9, 0, -.022, .215, false);
  const jaw = new THREE.Group(); jaw.position.set(0, -.07, .06); head.add(jaw); D.jaw = jaw;
  blob(jaw, DOGM.light, .045, .8, .45, 1.25, 0, -.01, .06, false, true);
  const tongue = blob(jaw, DOGM.tongue, .03, .8, .22, 1.35, 0, .003, .085, false, true); D.tongue = tongue;
  D.eyes = [];
  for (const s of [1,-1]){
    const eg = new THREE.Group(); eg.position.set(.05*s, .03, .08); head.add(eg);
    blob(eg, DOGM.eye, .017, 1, 1, .7, 0, 0, 0, false);
    blob(eg, DOGM.white, .004, 1, 1, .5, .004*s, .005, .011, false, true);
    D.eyes.push(eg);
    blob(head, DOGM.gold, .02, 1.3, .5, .8, .05*s, .052, .075, false, true); // arcata
    const ear = new THREE.Group(); ear.position.set(.088*s, .045, -.01); ear.rotation.z = .22*s; head.add(ear);
    blob(ear, DOGM.gold, .07, .3, 1.05, .78, .012*s, -.07, 0, true);
    if (s > 0) D.earL = ear; else D.earR = ear;
  }
  D.legs = [];
  const LU = taperGeo(.24, .05, .038, 12, .4, 1.1), LL = taperGeo(.22, .037, .03, 10, .5, 1.03);
  const addLeg = (x, z, front, off) => {
    const up = new THREE.Group(); up.position.set(x, -.06, z); body.add(up);
    mesh(up, LU, DOGM.gold);
    const low = new THREE.Group(); low.position.y = -.235; up.add(low);
    mesh(low, LL, front ? DOGM.gold : DOGM.gold);
    if (front) blob(low, DOGM.light, .03, .5, 1.6, .7, 0, -.09, -.03, false, true);   // frange
    blob(low, DOGM.light, .042, 1, .6, 1.3, 0, -.215, .015, true);
    D.legs.push({up, low, front, off});
  };
  addLeg(.1, .23, true, 0); addLeg(-.1, .23, true, Math.PI);
  addLeg(.11, -.27, false, Math.PI); addLeg(-.11, -.27, false, 0);
  blob(body, DOGM.gold, .11, .5, 1, 1.1, .1, -.03, -.26, false);
  blob(body, DOGM.gold, .11, .5, 1, 1.1, -.1, -.03, -.26, false);
  D.tail = [];
  let par = new THREE.Group(); par.position.set(0, .07, -.37); body.add(par);
  for (let i=0;i<8;i++){
    const r0 = .034*(1 - i*.08), r1 = .034*(1 - (i+1)*.08);
    mesh(par, taperGeo(.055, r0, r1, 8, .5, 1), DOGM.gold, 0, 0, 0, i < 3);
    if (i > 1) blob(par, DOGM.light, .03*(1 - i*.07), .6, 1.2, .9, 0, -.028, -.022, false, true);   // coda piumata
    D.tail.push(par);
    const nx = new THREE.Group(); nx.position.y = -.052; par.add(nx); par = nx;
  }
  return D;
}
// m = {speed, phase, lie, eat (0/1/2), bow, happy, lookYaw, dt}
function animateDog(D, m){
  const dt = Math.min(m.dt, .05), W = D.w;
  D.t += dt;
  W.walk = damp(W.walk, clamp(m.speed/1.4, 0, 1), 6, dt);
  W.run = damp(W.run, clamp((m.speed - 3)/2.5, 0, 1), 4, dt);
  W.lie = damp(W.lie, m.lie ? 1 : 0, 2.5, dt);
  W.eat = damp(W.eat, m.eat ? 1 : 0, 4, dt);
  W.bow = damp(W.bow, m.bow ? 1 : 0, 6, dt);
  const p = m.phase, w = W.walk, r = W.run, lie = W.lie, eat = W.eat, bow = W.bow, t = D.t;
  for (const L of D.legs){
    const qt = p + L.off;                                       // trotto: diagonali
    const qg = p + (L.front ? 0 : Math.PI*.85) + (L.off ? .35 : 0);   // galoppo: anteriori e posteriori insieme
    const st = Math.sin(qt), sg = Math.sin(qg);
    const sw = lerp(st, sg, r) * (.5 + .35*r) * w;
    const liftT = Math.max(0, -Math.cos(qt)), liftG = Math.max(0, -Math.cos(qg));
    const lift = lerp(liftT, liftG, r) * (.8 + .5*r) * w;
    let ux = sw, lx = L.front ? lift : -lift*1.1;
    if (!L.front){ ux += -.12*w; lx += .15*w; }
    if (L.front){ ux = lerp(ux, -1.35, lie); lx = lerp(lx, -.1, lie); }
    else { ux = lerp(ux, -1.45, lie); lx = lerp(lx, 2.3, lie); }
    if (L.front){ ux = lerp(ux, .2, eat); lx = lerp(lx, -.25, eat); }
    else { ux = lerp(ux, -.2, eat); lx = lerp(lx, .35, eat); }
    if (L.front){ ux = lerp(ux, -1.1, bow); lx = lerp(lx, .9, bow); }
    L.up.rotation.x = ux; L.low.rotation.x = lx;
  }
  const bob = -Math.abs(Math.sin(p))*(.015 + .03*r)*w;
  D.body.position.y = .535 + bob - .33*lie - .05*eat - .12*bow*(1 - lie);
  D.body.rotation.x = .12*r*Math.sin(p*1) + .1*eat + .32*bow;
  D.body.rotation.z = .02*Math.sin(p)*w;
  const pant = Math.max(r, bow, (m.happy ? .6 : 0));
  D.jaw.rotation.x = lerp(.04, .32 + Math.sin(t*14)*.06, pant);
  D.tongue.visible = pant > .15 || eat > .5;
  D.neck.rotation.x = lerp(lerp(-.05*Math.sin(p*2)*w + .08*r, -.15, lie), .95 + (m.eat === 2 ? Math.sin(t*15)*.04 : Math.sin(t*8)*.07), eat) - .25*bow;
  D.head.rotation.y = damp(D.head.rotation.y, clamp(m.lookYaw || 0, -.8, .8)*(1 - eat)*(1 - w*.7), 3, dt);
  D.head.rotation.x = .15*lie + (bow ? -.15 : 0);
  D.head.rotation.z = bow ? Math.sin(t*4)*.2 : 0;
  // orecchie morbide che ballano
  const flop = Math.sin(p*2)*.25*w + Math.sin(t*3)*.03;
  D.earL.rotation.x = flop; D.earR.rotation.x = flop;
  D.earL.rotation.z = .22 + .3*r; D.earR.rotation.z = -.22 - .3*r;
  // coda: scodinzola più forte quando è contento
  const wag = (m.happy || bow) ? 13 : 6 + 4*w;
  const amp = (m.happy || bow) ? .55 : .25 + .15*w;
  D.tail[0].rotation.x = lerp(lerp(2.0 + .25*w, 1.3, lie), 1.7, eat) + .35*bow;
  D.tail[0].rotation.z = Math.sin(t*wag)*amp*(1 - lie*.7);
  for (let i=1;i<D.tail.length;i++){
    D.tail[i].rotation.x = -.1 + .06*r - lie*.08;
    D.tail[i].rotation.z = Math.sin(t*wag - i*.5)*amp*.35*(1 - lie*.7);
  }
  D.blink -= dt;
  let e = 1;
  if (D.blink < 0){ e = clamp(Math.abs(D.blink + .08)/.08, .1, 1); if (D.blink < -.16){ D.blink = 2 + Math.random()*4; e = 1; } }
  for (const eg of D.eyes) eg.scale.y = e;
}
