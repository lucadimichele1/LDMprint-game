/* =====================================================================
   CODICI SEGRETI (scheda Aiuto del computer)
   ===================================================================== */
const CHEATS = {
  LDM(){
    const C = state.cheats;
    if (!C.ldm){ C.ldm = true; C.ldmNext = state.gt + 120; return true; }
    // dalla seconda volta: +1000 LDM subito, al massimo una volta ogni 10 minuti
    if (state.gt - C.ldmBonusAt < 600) return false;
    C.ldmBonusAt = state.gt; state.ldm += 1000;
    toast('🎁 +1.000 LDM','money'); sfx('coin');
    return true;
  },
  JARVIS(){ state.cheats.dog = true; spawnDog(); },
  '1000'(){ state.ldm += 1000; toast('🎁 +1.000 LDM','money'); sfx('coin'); touchUI(); },
  END(){ endGameBoost(); },
  'TOP SECRET'(){ if (modal) modal.codes = true; rerender(); },
  TOPSECRET(){ return CHEATS['TOP SECRET'](); },
  // assume gratis il prossimo dipendente disponibile (nell'ordine della scheda Staff)
  STAFF(){
    const k = Object.keys(STAFF).find(x=>!state.staff[x].hired && !STAFF[x].noCheat && (!STAFF[x].needs || state.staff[STAFF[x].needs].hired));
    return k ? hire(k, true) : false;
  },
  TEMPO(){ state.cheats.freezeUntil = state.gt + 40; },
  SCONTO(){ state.cheats.saleUntil = state.gt + 30; },
  EASY(){ state.cheats.cat = true; spawnCat(); },
  NEW(){
    if (state.printers.length >= CONFIG.MAX_PRINTERS) return;
    state.printers.push({job:null, done:null, failed:null, model:'p1s'});
    state.cheats.freeP++;
    const ni = state.printers.length-1;
    printerObjs.push(onFloor(ni) ? buildPrinter(ni, 'p1s') : null);
    rebuildColliders(); rebuildInteractables(); touchUI();
  },
};
const ordersFrozen = () => state.gt < state.cheats.freezeUntil;
const saleOn = () => state.gt < state.cheats.saleUntil;
const salePrice = n => Math.round(n * (saleOn() ? .5 : 1));
const mmss = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
// esegue un codice dai pulsanti dell'elenco TOP SECRET (ripetibile finché il telefono resta aperto)
function runCode(code){
  const fn = CHEATS[code];
  if (!fn) return;
  const m = modal;
  const ok = fn() !== false;
  if (m){ m.codes = true; m.codeMsg = ok ? `✓ ${code} attivato` : `${code} non è disponibile in questo momento`; m.codeOk = ok; }
  if (ok){ save(); showCheck(); } else sfx('err');
  rerender();
}
function submitCode(){
  const inp = $('#helpq'); if (!inp) return;
  const code = inp.value.trim().toUpperCase();
  inp.value = '';
  const fn = CHEATS[code];
  if (!fn) return;                       // codice sbagliato: non succede nulla
  if (fn() === false) return;            // codice non disponibile adesso: come se fosse sbagliato
  save(); showCheck();
}
let checkTimer = 0;
function showCheck(){
  const el = $('#okcheck');
  el.classList.remove('hidden', 'pop'); void el.offsetWidth; el.classList.add('pop');
  clearTimeout(checkTimer);
  checkTimer = setTimeout(()=>el.classList.add('hidden'), 2000);
}
document.addEventListener('keydown', e=>{
  if (e.target && e.target.id === 'helpq' && e.key === 'Enter'){ e.preventDefault(); submitCode(); }
});
let lastSale = false;
function cheatTick(){
  const Ch = state.cheats;
  if (Ch.ldm && state.gt >= Ch.ldmNext){ Ch.ldmNext += 120; state.ldm += 100; toast('🎁 +100 LDM','money'); sfx('coin'); }
  const s = saleOn();
  if (s !== lastSale){ lastSale = s; if (modal && (modal.kind === 'computer' && modal.tab !== 'help' || modal.kind === 'filament')) rerender(); }
}
const CODE_LIST = [
  ['LDM', 'la prima volta attiva un regalo di 100 LDM ogni 2 minuti; dalla seconda dà subito 1.000 LDM, poi serve attendere 10 minuti'],
  ['1000', 'aggiunge 1.000 LDM al portafoglio, quante volte vuoi'],
  ['TEMPO', 'sospende gli ordini per 40 secondi: scadenze ed eventi restano fermi'],
  ['SCONTO', 'per 30 secondi tutto quello che si compra costa la metà'],
  ['NEW', 'regala una stampante 3D in più, senza far salire i prezzi delle successive'],
  ['STAFF', 'assume gratis il prossimo dipendente disponibile'],
  ['EASY', 'fa comparire il gatto bianco e nero, con ciotole e cuccia'],
  ['JARVIS', 'fa comparire il cane Jarvis nel giardino; con il tasto H gioca col gatto per 20 secondi'],
  ['END', 'porta il gioco al massimo: 50 stampanti, tutto lo staff, studio arredato e 15 prodotti a catalogo'],
  ['TOP SECRET', 'mostra questo elenco'],
];
const HELP_TOPICS = [
  ['Come avviare una stampa', 'Ogni stampante è dedicata a un prodotto: vai a una stampante libera, premi E e avvia la stampa, oppure avviale tutte insieme.'],
  ['Ordini urgenti e scadenze', 'Gli ordini con il cronometro pagano il 40% in più se partono prima della scadenza.'],
  ['Filamento esaurito', 'Compra il PLA nel Negozio o allo scaffale filamenti. Il riordino automatico evita le sorprese.'],
  ['Stampa fallita (spaghetti)', 'Raggiungi la stampante con la luce rossa e premi E per pulire il piatto.'],
  ['Assumere dipendenti', 'Dalla scheda Staff puoi assumere Tony e Steve per le stampanti, Natasha e Peter per le spedizioni.'],
  ['Canali di vendita', 'Ogni canale ha clienti e commissioni diverse: attivali o spegnili dalla scheda Annunci.'],
];
function renderHelpTab(){
  return `<div class="helpc">
    <div class="hhead"><img src="${LOGO_SRC}" alt=""><div><b>Centro assistenza</b><small>LDMcraft · guida e supporto</small></div></div>
    <div class="hsearch" role="search">
      <input id="helpq" type="text" enterkeyhint="search" placeholder="Cerca nella guida…" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Cerca nella guida">
      <button class="hbtn" data-act="helpgo" aria-label="Cerca">⌕</button>
    </div>
    ${modal && modal.codes ? `<div class="codebox"><b>🔐 Codici segreti</b>
      <div class="codelist">${CODE_LIST.map(([c, d])=>`<button class="codebtn" data-act="code" data-arg="${c}"><code>${c}</code><span>${d}</span></button>`).join('')}</div>
      ${modal.codeMsg ? `<div class="codemsg ${modal.codeOk ? 'ok' : 'no'}">${modal.codeMsg}</div>` : ''}
      <small>Premi un pulsante per attivarlo, quante volte vuoi. L'elenco sparisce quando chiudi il telefono o il computer.</small></div>` : ''}
    <div class="hpop">Argomenti popolari</div>
    <div class="hlist">${HELP_TOPICS.map(([t,d])=>`<div class="hitem"><b>${t}</b><span>${d}</span></div>`).join('')}</div>
    <div class="hfoot">Non trovi quello che cerchi? In gioco premi G per la guida rapida.</div>
  </div>`;
}

/* =====================================================================
   GATTO (codice EASY): segue il giocatore, ogni 40 s va a mangiare o bere
   ===================================================================== */
let cat = null, bowlObjs = null;
const BOWLS = {food:{x:-6, z:9.35}, water:{x:-5.05, z:9.35}};
function buildBowls(){
  if (bowlObjs) return;
  const g = new THREE.Group(); scene.add(g);
  const steel = new THREE.MeshStandardMaterial({color:0xd5dae2, roughness:.3, metalness:.35});
  const matM = new THREE.MeshStandardMaterial({color:0x6b7f8e, roughness:.9});
  const pad = new THREE.Mesh(new THREE.BoxGeometry(1.5, .012, .55), matM); pad.position.set(-5.52, .022, 9.35); pad.receiveShadow = true; g.add(pad);
  for (const [k, b] of Object.entries(BOWLS)){
    const bw = new THREE.Mesh(new THREE.CylinderGeometry(.14, .11, .075, 28), steel);
    bw.position.set(b.x, .066, b.z); bw.castShadow = true; g.add(bw);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.14, .01, 8, 28), steel); rim.rotation.x = Math.PI/2; rim.position.set(b.x, .104, b.z); g.add(rim);
    if (k === 'food'){
      const kib = new THREE.MeshStandardMaterial({color:0x8a5a2b, roughness:.8});
      const R = mulberry32(5);
      for (let i=0;i<34;i++){ const a = R()*6.28, d = Math.sqrt(R())*.1; const m = new THREE.Mesh(SPH_LO, kib); m.scale.setScalar(.013); m.position.set(b.x + Math.cos(a)*d, .1 + R()*.012, b.z + Math.sin(a)*d); g.add(m); }
    } else {
      const wat = new THREE.Mesh(new THREE.CircleGeometry(.125, 28), new THREE.MeshStandardMaterial({color:0x5aa9e6, roughness:.05, transparent:true, opacity:.75}));
      wat.rotation.x = -Math.PI/2; wat.position.set(b.x, .098, b.z); g.add(wat);
    }
  }
  bowlObjs = g;
}
function meow(){
  if (muted) return;
  try {
    if (!AC) AC = new (window.AudioContext||window.webkitAudioContext)();
    const t = AC.currentTime, o = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(540, t); o.frequency.linearRampToValueAtTime(840, t+.18); o.frequency.linearRampToValueAtTime(610, t+.5);
    f.type = 'bandpass'; f.Q.value = 5;
    f.frequency.setValueAtTime(950, t); f.frequency.linearRampToValueAtTime(1800, t+.2); f.frequency.linearRampToValueAtTime(1150, t+.5);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.14, t+.06); g.gain.exponentialRampToValueAtTime(.0001, t+.55);
    o.connect(f); f.connect(g); g.connect(AC.destination); o.start(t); o.stop(t+.6);
  } catch(e){}
}
function spawnCat(){
  if (cat) return;
  buildBowls();
  const C = makeCat(); scene.add(C.root);
  const x = player.x + Math.cos(player.rot)*1.2, z = player.z - Math.sin(player.rot)*1.2;
  cat = {C, x, z, rot:player.rot, face:player.rot, spd:0, phase:0, mode:'follow', snack:40, path:[], repath:0, eatT:0, idleT:0, kind:0, side:Math.random() < .5 ? 1 : -1};
  C.root.position.set(x, 0, z);
}
function removeCat(){
  if (cat){ scene.remove(cat.C.root); cat = null; }
  if (bowlObjs){ scene.remove(bowlObjs); bowlObjs = null; }
}
const catStand = k => { const b = BOWLS[k]; return {x:b.x, z:b.z - .36, fx:b.x, fz:b.z + 1}; };
function updateCat(dt){
  const A = cat; if (!A) return;
  if (A.mode === 'wait' || A.mode === 'play'){
    if (A.mode === 'wait'){ A.spd = damp(A.spd, 0, 6, dt); if (dog) A.face = Math.atan2(dog.x - A.x, dog.z - A.z); turnTo(A, dt, 4); }
    A.phase += dt * A.spd * 8.5 / (1 + A.spd*.25);
    const hop = A.mode === 'play' && play && play.bow > 0;
    animateCat(A.C, {speed:A.spd, phase:A.phase, sit:A.mode === 'wait' && A.spd < .1, eat:0, lookYaw:0, dt});
    A.C.root.position.set(A.x, hop ? Math.abs(Math.sin(performance.now()/120))*.12 : 0, A.z);
    A.C.root.rotation.y = A.rot;
    return;
  }
  const dP = Math.hypot(player.x - A.x, player.z - A.z);
  if (dP > 40){ A.x = player.x - Math.sin(player.rot)*1.5; A.z = player.z - Math.cos(player.rot)*1.5; A.path = []; }
  let want = 0;
  if (A.mode === 'follow'){
    A.snack -= dt;
    if (A.snack <= 0){
      A.kind = Math.random() < .5 ? 1 : 2;
      A.goal = catStand(A.kind === 1 ? 'food' : 'water');
      A.path = route({x:A.x, z:A.z}, A.goal);
      A.mode = 'go';
      if (Math.random() < .6) meow();
    } else {
      A.repath -= dt;
      const fx = player.x - Math.sin(player.rot)*.6 + Math.cos(player.rot)*.95*A.side;
      const fz = player.z - Math.cos(player.rot)*.6 - Math.sin(player.rot)*.95*A.side;
      const dF = Math.hypot(fx - A.x, fz - A.z);
      if (A.path.length ? A.repath <= 0 : dF > 1.2){
        A.repath = .35;
        A.path = dF > .45 ? route({x:A.x, z:A.z}, {x:fx, z:fz}) : [];
      }
      if (A.path.length) want = dP > 7 ? 6.2 : dP > 3.2 ? 3.4 : clamp(dF*1.6, .5, 1.3);
    }
  }
  if (A.mode === 'go'){
    const dg = Math.hypot(A.goal.x - A.x, A.goal.z - A.z);
    want = dg > 4 ? 3 : clamp(dg*1.4, .35, 1.3);
    if (!A.path.length){ A.mode = 'eat'; A.eatT = 5 + Math.random()*3; }
  }
  if (A.mode === 'eat'){
    A.eatT -= dt;
    A.face = Math.atan2(A.goal.fx - A.x, A.goal.fz - A.z);
    if (A.eatT <= 0){ A.mode = 'follow'; A.snack = 40; A.path = []; A.side = Math.random() < .5 ? 1 : -1; }
  }
  A.spd = damp(A.spd, want, 5, dt);
  if (A.path.length && A.spd > .02){
    const tg = A.path[0], dx = tg.x - A.x, dz = tg.z - A.z, d = Math.hypot(dx, dz), st = A.spd*dt;
    if (d <= Math.max(st, .04)){ A.x = tg.x; A.z = tg.z; A.path.shift(); }
    else { A.x += dx/d*st; A.z += dz/d*st; A.face = Math.atan2(dx, dz); }
  }
  const still = A.mode === 'follow' && A.spd < .08 && !A.path.length;
  A.idleT = still ? A.idleT + dt : 0;
  if (still && A.idleT > .6) A.face = Math.atan2(player.x - A.x, player.z - A.z) * .3 + A.face * .7;
  const df = ((A.face - A.rot + Math.PI*3) % (Math.PI*2)) - Math.PI;
  A.rot += df * (1 - Math.exp(-dt*(A.spd > .5 ? 7 : 3)));
  A.phase += dt * A.spd * 8.5 / (1 + A.spd*.25);
  const lookYaw = ((Math.atan2(player.x - A.x, player.z - A.z) - A.rot + Math.PI*3) % (Math.PI*2)) - Math.PI;
  animateCat(A.C, {speed:A.spd, phase:A.phase, sit:A.idleT > 2.5, eat:A.mode === 'eat' ? A.kind : 0, lookYaw, dt});
  A.C.root.position.set(A.x, 0, A.z);
  A.C.root.rotation.y = A.rot;
}


/* =====================================================================
   CANE JARVIS (codice JARVIS) e gioco con il gatto (tasto H)
   ===================================================================== */
let dog = null, play = null;
function spawnDog(){
  if (dog) return;
  const D = makeDog(); scene.add(D.root);
  const x = KENNEL.x - 1.4, z = KENNEL.z;
  dog = {D, x, z, rot:-Math.PI/2, face:-Math.PI/2, spd:0, phase:0, mode:'roam', path:[], goal:null, want:0, meal:60, restT:0, eatT:0, kind:0, idleT:0, happy:0};
  D.root.position.set(x, 0, z);
}
function removeDog(){ if (dog){ scene.remove(dog.D.root); dog = null; } play = null; }
const yardPoint = () => {
  for (let i=0;i<30;i++){
    const x = DOG_YARD.x0 + Math.random()*(DOG_YARD.x1 - DOG_YARD.x0), z = DOG_YARD.z0 + Math.random()*(DOG_YARD.z1 - DOG_YARD.z0);
    if (!blockedAt(x, z, .6) && Math.hypot(x - KENNEL.x, z - KENNEL.z) > 1.8) return {x, z};
  }
  return {x:14, z:22};
};
const dogStand = k => { const b = DOG_BOWLS[k]; return {x:b.x + .66, z:b.z, fx:b.x - 2, fz:b.z}; };
function moveAlong(A, dt, maxSpeed){
  A.spd = damp(A.spd, maxSpeed, 4.5, dt);
  if (A.path.length && A.spd > .02){
    const tg = A.path[0], dx = tg.x - A.x, dz = tg.z - A.z, d = Math.hypot(dx, dz), st = A.spd*dt;
    if (d <= Math.max(st, .05)){ A.x = tg.x; A.z = tg.z; A.path.shift(); }
    else { A.x += dx/d*st; A.z += dz/d*st; A.face = Math.atan2(dx, dz); }
  }
}
function turnTo(A, dt, rate){
  const df = ((A.face - A.rot + Math.PI*3) % (Math.PI*2)) - Math.PI;
  A.rot += df * (1 - Math.exp(-dt*rate));
}
function updateDog(dt){
  const A = dog; if (!A) return;
  let want = 0, lie = false, eat = 0, bow = false;
  if (A.mode !== 'meet' && A.mode !== 'play'){
    A.meal -= dt;
    if (A.meal <= 0 && (A.mode === 'roam' || A.mode === 'rest')){
      A.mode = 'food'; A.goal = dogStand('food'); A.path = route({x:A.x, z:A.z}, A.goal);
    }
  }
  if (A.mode === 'roam'){
    if (!A.path.length){
      if (Math.random() < .3){ A.mode = 'rest'; A.goal = {x:KENNEL.x - 1.25, z:KENNEL.z + (Math.random() - .5)*.8}; A.path = route({x:A.x, z:A.z}, A.goal); A.restT = 6 + Math.random()*6; A.want = 2.2; }
      else { const q = yardPoint(); A.path = route({x:A.x, z:A.z}, q); A.want = Math.random() < .6 ? 6 : 2.4; }
    }
    want = A.path.length ? A.want : 0;
  } else if (A.mode === 'rest'){
    if (A.path.length) want = 2.2;
    else { lie = true; A.face = -Math.PI/2 + Math.sin(performance.now()/3000)*.3; A.restT -= dt; if (A.restT <= 0) A.mode = 'roam'; }
  } else if (A.mode === 'food' || A.mode === 'water'){
    if (A.path.length){ const dg = d2(A, A.goal); want = dg > 4 ? 5 : clamp(dg*1.5, .5, 2); }
    else {
      eat = A.mode === 'food' ? 1 : 2;
      A.face = Math.atan2(A.goal.fx - A.x, A.goal.fz - A.z);
      if (A.eatT <= 0) A.eatT = A.mode === 'food' ? 5 : 4;
      A.eatT -= dt;
      if (A.eatT <= 0){
        A.eatT = 0;
        if (A.mode === 'food'){ A.mode = 'water'; A.goal = dogStand('water'); A.path = route({x:A.x, z:A.z}, A.goal); }
        else { A.mode = 'roam'; A.meal = 60; A.path = []; }
      }
    }
  } else if (A.mode === 'meet'){
    A.repath = (A.repath || 0) - dt;
    if (A.repath <= 0){ A.repath = .5; A.path = route({x:A.x, z:A.z}, {x:cat.x, z:cat.z}); }
    want = d2(A, cat) > 3 ? 6.5 : 2.5;
  }
  if (A.mode !== 'play'){
    moveAlong(A, dt, want);
    turnTo(A, dt, A.spd > .5 ? 7 : 3);
  }
  const lookYaw = ((Math.atan2(player.x - A.x, player.z - A.z) - A.rot + Math.PI*3) % (Math.PI*2)) - Math.PI;
  if (A.mode === 'play') bow = play && play.bow > 0;
  animateDog(A.D, {speed:A.spd, phase:A.phase, lie, eat, bow, happy:A.mode === 'play' || A.mode === 'meet' || d2(A, player) < 3, lookYaw:Math.abs(lookYaw) < 1.4 ? lookYaw : 0, dt});
  A.phase += dt * A.spd * 5.2 / (1 + A.spd*.18);
  A.D.root.position.set(A.x, 0, A.z);
  A.D.root.rotation.y = A.rot;
}
const freeCircle = (c, r) => { for (let k=0;k<12;k++){ const a = k/12*Math.PI*2; if (blockedAt(c.x + Math.sin(a)*r, c.z + Math.cos(a)*r, .25)) return false; } return !blockedAt(c.x, c.z, .25); };
function playCenter(p){
  if (inOffice(p)) return {x:clamp(p.x, -10.2, -5.8), z:clamp(p.z, -17.2, -13.2)};
  if (inLab(p)) { const c = clampIn(p); return {x:clamp(c.x, -8, 8), z:clamp(c.z, -5.5, 7)}; }
  // all'aperto: cerca uno spiazzo libero vicino (niente lampioni, alberi o cuccia in mezzo)
  for (let ring=0; ring<6; ring++){
    for (let k=0; k<(ring ? 10 : 1); k++){
      const a = k/10*Math.PI*2, c = {x:p.x + Math.sin(a)*ring*1.2, z:p.z + Math.cos(a)*ring*1.2};
      if (roomOf(c) === 'out' && freeCircle(c, 1.6)) return c;
    }
  }
  return {x:p.x, z:p.z};
}
function startPlay(){
  if (!dog || !cat || play) return;
  play = {t:0, meet:true, dir:1, flip:4, bow:0, bowT:2.5};
  cat.mode = 'wait'; cat.path = [];
  dog.mode = 'meet'; dog.repath = 0;
  toast('🐶🐱 Jarvis e il micio giocano insieme!', 'good');
  if (Math.random() < .7) meow();
}
function endPlay(){
  play = null;
  if (cat){ cat.mode = 'follow'; cat.path = []; cat.snack = Math.max(cat.snack, 10); }
  if (dog){ dog.mode = 'roam'; dog.path = []; }
}
function updatePlay(dt){
  if (!play) return;
  if (!dog || !cat){ endPlay(); return; }
  if (play.meet){
    play.t += dt;
    if (d2(dog, cat) < 1.6 || play.t > 25){
      play.meet = false; play.t = 0;
      play.c = playCenter(cat);
      play.a = Math.atan2(cat.x - play.c.x, cat.z - play.c.z);
      dog.mode = 'play'; cat.mode = 'play'; dog.path = []; cat.path = [];
    }
    return;
  }
  play.t += dt;
  if (play.t >= 20){ endPlay(); return; }
  // si rincorrono in cerchio, ogni tanto cambiano verso e il cane fa l'inchino
  play.flip -= dt;
  if (play.flip <= 0){ play.dir *= -1; play.flip = 3 + Math.random()*2.5; }
  play.bowT -= dt;
  if (play.bowT <= 0 && play.bow <= 0){ play.bow = 1.1; play.bowT = 3 + Math.random()*3; }
  let omega = 2.3 * play.dir;
  if (play.bow > 0){ play.bow -= dt; omega *= .15; }
  play.a += omega*dt;
  const c = play.c, rD = 1.25, rC = .85;
  const aD = play.a - .9*play.dir;
  const tgtD = {x:c.x + Math.sin(aD)*rD, z:c.z + Math.cos(aD)*rD};
  const tgtC = {x:c.x + Math.sin(play.a)*rC, z:c.z + Math.cos(play.a)*rC};
  for (const [A, tg] of [[dog, tgtD], [cat, tgtC]]){
    const nx = damp(A.x, tg.x, 8, dt), nz = damp(A.z, tg.z, 8, dt);
    const v = Math.hypot(nx - A.x, nz - A.z)/Math.max(dt, 1e-4);
    if (v > .15) A.face = Math.atan2(nx - A.x, nz - A.z);
    A.x = nx; A.z = nz; A.spd = damp(A.spd, v, 8, dt);
    turnTo(A, dt, 10);
  }
  // il cane guarda il gatto durante l'inchino
  if (play.bow > 0) dog.face = Math.atan2(cat.x - dog.x, cat.z - dog.z);
}
