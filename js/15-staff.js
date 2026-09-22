/* =====================================================================
   STAFF: i dipendenti camminano e lavorano da soli
   ===================================================================== */
const npcs = {};
const staffSpeed = () => 2.7 * (1 + .25*state.staff.lvl);
const staffWork = secs => secs / (1 + .35*state.staff.lvl);
const LAB_IN = {x0:-9.8, x1:9.6, z0:-7.6, z1:8.8};
const inOffice = p => p.x > -20.6 && p.x < -3.4 && p.z > -20.6 && p.z <= -10.6;
const inLab = p => p.x > -12.6 && p.x < 12.5 && p.z > -10.6 && p.z < 10.2;
const inFarm = p => p.x >= 12.5 && p.x < 33.4 && p.z > -13.6 && p.z < 9.4;
const roomOf = p => inOffice(p) ? 'office' : inFarm(p) ? 'farm' : inLab(p) ? 'lab' : 'out';
// nella farm ci si muove nei corridoi: quello trasversale vicino all'ingresso e quelli tra le file
const farmBand = z => FARM_BANDS.findIndex(b => z >= b.z0 && z <= b.z1);
const farmFree = p => p.x < 14.85 || farmBand(p.z) >= 0;
function farmSnap(p){
  if (farmFree(p)) return {x:clamp(p.x, 13.9, 30.4), z:clamp(p.z, -12.6, 8.6)};
  let best = FARM_BANDS[0], bd = 1e9;
  for (const b of FARM_BANDS){ const d = Math.abs(b.c - p.z); if (d < bd){ bd = d; best = b; } }
  return {x:clamp(p.x, 13.9, 30.4), z:clamp(p.z, best.z0 + .15, best.z1 - .15)};
}
function farmPath(a, b){
  const A = farmSnap(a), B = farmSnap(b), pts = [];
  if (d2(A, a) > .05) pts.push(A);
  const ba = A.x < 14.85 ? -1 : farmBand(A.z), bb = B.x < 14.85 ? -1 : farmBand(B.z);
  if (!(ba === bb || ba === -1 && bb === -1)){
    if (A.x >= 14.85) pts.push({x:FARM.aisleX, z:A.z});
    if (B.x >= 14.85) pts.push({x:FARM.aisleX, z:B.z});
  }
  if (d2(B, b) > .05) pts.push(B);
  return pts;
}
const clampIn = p => ({x:clamp(p.x, LAB_IN.x0, LAB_IN.x1), z:clamp(p.z, LAB_IN.z0, LAB_IN.z1)});
// porte: punto dentro la prima stanza, punto dentro la seconda e il "corridoio" di passaggio
const PORTALS = {
  front:  {lab:{x:0, z:8.8}, out:{x:0, z:12}, corr:p => Math.abs(p.x) < 1.8 && p.z > 8.2 && p.z < 12.6},
  office: {lab:{x:-8.8, z:-9.0}, office:{x:-8.8, z:-12.1}, corr:p => Math.abs(p.x + 8.8) < 1.3 && p.z < -8.4 && p.z > -12.7},
  farm:   {lab:{x:10.8, z:-5.0}, farm:{x:14.3, z:-5.0}, corr:p => p.x > 10.2 && p.x < 14.9 && p.z > -8.2 && p.z < -1.8},
};
const PORTAL_OF = {'lab>out':'front', 'out>lab':'front', 'lab>office':'office', 'office>lab':'office', 'lab>farm':'farm', 'farm>lab':'farm'};
const roomChain = (ra, rb) => ra === rb ? [ra] : (ra === 'lab' || rb === 'lab') ? [ra, rb] : [ra, 'lab', rb];
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// percorso tra stanze: niente passi indietro vicino alle porte (evita che gatto e staff si blocchino)
function route(a, b){
  const rooms = roomChain(roomOf(a), roomOf(b));
  const pts = [];
  let cur = {x:a.x, z:a.z}, inCorr = false;
  for (let i=0; i<rooms.length-1; i++){
    const P = PORTALS[PORTAL_OF[rooms[i] + '>' + rooms[i+1]]];
    const from = P[rooms[i]], to = P[rooms[i+1]];
    if (!P.corr(cur)){
      if (rooms[i] === 'lab'){ const c = clampIn(cur); if (d2(c, cur) > .05) pts.push(c); }
      if (rooms[i] === 'farm') pts.push(...farmPath(cur, from));
      pts.push(from);
    }
    pts.push(to);
    cur = to; inCorr = true;
  }
  if (rooms[rooms.length-1] === 'farm'){
    pts.push(...farmPath(cur, b));
  } else if (rooms[rooms.length-1] === 'lab'){
    const skipStart = !inCorr && PORTALS.front.corr(cur) || !inCorr && PORTALS.office.corr(cur);
    if (!inCorr && !skipStart){ const c = clampIn(cur); if (d2(c, cur) > .05) pts.push(c); }
    const cb = clampIn(b);
    if (d2(cb, b) > .05) pts.push(cb);
  }
  pts.push({x:b.x, z:b.z});
  // toglie punti duplicati o troppo vicini
  const out = [];
  let last = a;
  for (const q of pts){ if (d2(q, last) > .08){ out.push(q); last = q; } }
  if (!out.length || d2(out[out.length-1], b) > .01) out.push({x:b.x, z:b.z});
  return out;
}
const standOf = {
  printer: i => { const s = slotOf(i); return {x:s.x, z:s.z + s.f*1.15, fx:s.x, fz:s.z}; },
  chest: i => { const s = CHEST_SLOTS_POS[i]; return {x:s.x + Math.sin(s.r)*1.15, z:s.z + Math.cos(s.r)*1.15, fx:s.x, fz:s.z}; },
  pack: () => ({x:ST.pack.x+1.2, z:ST.pack.z, fx:ST.pack.x, fz:ST.pack.z}),
  label: () => ({x:ST.label.x+1.15, z:ST.label.z, fx:ST.label.x, fz:ST.label.z}),
  post: () => ({x:.7, z:POST.z-.6, fx:.7, fz:POST.z+3}),
};
function makeNpc(kind){
  const d = STAFF[kind], hs = state.staff[kind];
  const h = makeHuman(Object.assign({fem:!!d.fem}, d.look));
  h.held.material = MAT.cardboard;
  scene.add(h.root);
  const label = makeTextSprite(`${d.name} · ${d.role}`, '#ffd23f', 2.8);
  label.position.y = 2.2; h.root.add(label);
  if (!hs.carry && STAFF[kind].job==='op') hs.carry = {};
  const p = hs.pos || d.home;
  const n = {kind, h, label, x:p.x, z:p.z, rot:Math.PI, phase:0, amp:0, path:[], face:null, onArrive:null, work:0, onWork:null, status:'', carry: hs.carry || {}};
  if (state && !isOpen() && !hs.job && !Object.keys(hs.carry || {}).length){ n.away = true; h.root.visible = false; n.status = 'a casa'; }
  h.root.position.set(n.x, 0, n.z);
  return n;
}
function buildStaff(){
  for (const k of Object.keys(npcs)){ scene.remove(npcs[k].h.root); delete npcs[k]; }
  for (const k of Object.keys(STAFF)) if (state.staff[k].hired) npcs[k] = makeNpc(k);
}
function setStatus(n, txt, col='#ffffff'){
  if (n.status === txt) return;
  n.status = txt; setSpriteText(n.label, `${STAFF[n.kind].name}: ${txt}`, col);
}
function goTo(n, stand, then){
  n.path = route({x:n.x, z:n.z}, stand);
  n.face = stand.fx !== undefined ? {x:stand.fx, z:stand.fz} : null;
  n.onArrive = then || null;
}
function doWork(n, secs, then){ n.work = secs; n.onWork = then || null; }
const carryCount = n => Object.values(n.carry).reduce((a,b)=>a+b, 0);

/* Piano di stampa: le stampanti sono divise in parti uguali tra i prodotti,
   quelle in più vanno al prodotto più recente (es. 10 stampanti e 3 prodotti: 3, 3, 4).
   Se i prodotti sono più delle stampanti, stampano i prodotti più recenti, uno per stampante. */
/* Scorta massima: un prodotto con 200 pezzi già stampati (nelle casse o in arrivo) esce dal piano
   e le stampanti vengono ridivise tra gli altri; appena la scorta scende sotto 200 rientra.
   Se un contratto aziendale chiede di più, il limite per quel prodotto sale alla quantità richiesta. */
function inTransit(pid){
  let n = 0;
  for (const p of state.printers) if (p.done && p.done.kind === 'prod' && baseOf(p.done.pid) === pid) n += p.done.count;
  for (const it of state.belt) if (baseOf(it.pid) === pid) n += it.n;
  for (const k in npcs){ const c = npcs[k].carry; if (c) for (const key in c) if (baseOf(Number(key)) === pid) n += c[key]; }
  return n;
}
const stockOf = pid => chestCount(pid) + inTransit(pid);
function stockCap(pid){
  let cap = CONFIG.STOCK_CAP;
  const need = state.b2b.active.filter(c=>c.pid === pid).reduce((a,c)=>a + c.qty, 0);
  if (need) cap = Math.max(cap, need + pendingQty(pid));
  return cap;
}
const isCapped = pid => stockOf(pid) >= stockCap(pid);
let planCache = null, planAt = 0;
function printerPlan(ignoreCap){
  if (!ignoreCap && planCache && performance.now() - planAt < 250 && planCache.length === state.printers.length) return planCache;
  const all = state.products, N = state.printers.length;
  const ps = ignoreCap ? all : all.filter(p=>!isCapped(p.pid));
  const X = ps.length;
  const plan = new Array(N).fill(undefined);
  const done = r => { if (!ignoreCap){ planCache = r; planAt = performance.now(); } return r; };
  if (!X) return done(plan);
  if (N < X){ for (let i=0;i<N;i++) plan[i] = ps[X-N+i].pid; return done(fitPlan(plan, ps)); }
  const base = Math.floor(N/X);
  let i = 0;
  ps.forEach((p,k)=>{ const n = base + (k === X-1 ? N % X : 0); for (let j=0;j<n;j++) plan[i++] = p.pid; });
  return done(fitPlan(plan, ps));
}
const invalidatePlan = () => { planCache = null; };
function fitPlan(plan, ps){
  const small = ps.filter(p=>!projectDef(p.pid).big).map(p=>p.pid);
  return plan.map((pid, i)=>{
    if (pid === undefined || !projectDef(pid).big || modelOf(i).big) return pid;
    return small.length ? small[small.length-1] : undefined;      // la A1 mini stampa il prodotto piccolo più recente
  });
}
// i piani: 100 stampanti ciascuno, il visibile è solo quello corrente
const slotOf = i => PRINTER_SLOTS[i % FLOOR_SIZE];
const floorOf = i => Math.floor(i / FLOOR_SIZE);
const curFloor = () => state.floor || 0;
const STUDIO_FLOOR = MAX_FLOOR;                 // l'ultimo piano della torre è tutto studio
const onStudio = () => curFloor() === STUDIO_FLOOR;
const onFloor = i => !onStudio() && floorOf(i) === curFloor();
const printerName = i => `#${floorOf(i)+1}-${i % FLOOR_SIZE + 1}`;
const floorsUsed = () => Math.ceil(state.printers.length / FLOOR_SIZE);
const printersFor = pid => printerPlan().filter(x=>x===pid).length;
function planSummary(){
  const plan = printerPlan();
  return state.products.map(p=>[p, plan.filter(x=>x===p.pid).length]).filter(([,n])=>n).map(([p,n])=>`${p.name} ${n}`).join(' · ');
}
function idleInZone(n, key){
  const k = STAFF[key].job === 'tech' ? 'op' : STAFF[key].job, Z = STAFF_ZONE[k];
  const room = k === 'op' ? 'farm' : (k === 'mkt' || k === 'ceo') ? 'office' : 'lab';
  let inside = roomOf(n) === room && n.x >= Z.x0 - .05 && n.x <= Z.x1 + .05 && n.z >= Z.z0 - .05 && n.z <= Z.z1 + .05;
  if (inside && k === 'op' && !farmFree(n)) inside = false;
  if (!inside){
    const spot = roomOf(n) === room ? (k === 'op' ? farmSnap(n) : {x:clamp(n.x, Z.x0, Z.x1), z:clamp(n.z, Z.z0, Z.z1)}) : Object.assign({}, STAFF[key].home);
    goTo(n, spot);
    return;
  }
  // resta dov'è, girato verso la postazione di lavoro più vicina
  const spots = k === 'op'
    ? state.printers.map((q,i)=>slotOf(i))
    : [ST.pack, ST.label, ...state.chests.map((c,i)=>CHEST_SLOTS_POS[i])];
  let best = spots[0], bd = 1e9;
  for (const sp of spots){ const d = Math.hypot(sp.x - n.x, sp.z - n.z); if (d < bd){ bd = d; best = sp; } }
  if (best) n.faceRot = Math.atan2(best.x - n.x, best.z - n.z);
  doWork(n, 1);
}
function freePrinters(){ return state.printers.filter(q=>!q.job && !q.done && !q.failed).length; }
function opCanStart(i){
  const p = state.printers[i];
  if (p.job || p.done || p.failed || p.maint || p.maintRes) return null;
  const pid = printerPlan()[i];
  if (pid === undefined || chestSpace(pid) < 0) return null;
  if (!hasFil(pid, gramsOf(pid)*plateFor(i)) || state.powerOff) return null;
  return pid;
}
function nearestChestSpace(pid, from, filter){
  let best = -1, bd = 1e9;
  state.chests.forEach((c, i)=>{
    if (filter && !filter(CHEST_SLOTS_POS[i])) return;
    if (!c.some(s=>!s || (s.pid===pid && s.n<CONFIG.STACK))) return;
    const st = standOf.chest(i), d = Math.hypot(st.x - from.x, st.z - from.z);
    if (d < bd){ bd = d; best = i; }
  });
  return best;
}
const beltChest = pid => nearestChestSpace(pid, {x:-10, z:-8}, s=>s.zone === 'ship');
function opDeposit(n){
    const pid = Number(Object.keys(n.carry)[0]);
    let ci = nearestChestSpace(pid, n);
    if (ci >= 0 && state.upgrades.belt && roomOf(n) === 'farm' && CHEST_SLOTS_POS[ci].zone === 'ship' && beltChest(pid) >= 0) ci = -2;   // meglio il nastro
    if (ci === -2){
      setStatus(n, 'metto i pezzi sul nastro', '#8fd3ff');
      goTo(n, hopperStand(), ()=>doWork(n, staffWork(.7), ()=>{ beltLoad(n.carry); touchUI(); save(); }));
      return;
    }
    if (ci < 0){
      setStatus(n, 'casse piene!', '#ff8080');
      if (!n.warned){ toast(`${STAFF[n.kind].name}: le casse sono piene. Compra un'altra cassa o vendi di più.`,'bad'); n.warned = true; }
      const cz = standOf.chest(0);
      if (Math.hypot(n.x - cz.x, n.z - cz.z) > 3) goTo(n, cz); else doWork(n, 3);
      return;
    }
    n.warned = false;
    setStatus(n, `deposito nella cassa #${ci+1}`, '#8fd3ff');
    goTo(n, standOf.chest(ci), ()=>{
      if (chestObjs[ci]) chestObjs[ci].open = 1;
      doWork(n, staffWork(.9), ()=>{
        for (const k of Object.keys(n.carry)){
          const left = addPieces(Number(k), n.carry[k], state.chests[ci]);
          if (left) n.carry[k] = left; else delete n.carry[k];
        }
        if (chestObjs[ci]) chestObjs[ci].open = 0;
        touchUI();
      });
    });
    return;
}
function opThink(n, active){
  n.target = null;
  const taken = new Set(Object.values(npcs).filter(m=>m !== n && m.target != null).map(m=>m.target));
  const cc = carryCount(n);
  const needNow = cc > 0 && pendingOrders().some(o=>n.carry[o.sku] && chestCount(o.sku) < o.qty);
  const moreReady = state.printers.some(p=>p.failed || (p.done && p.done.kind==='prod'));
  if (cc > 0 && (cc >= 24 || !active || (needNow && !moreReady))) return opDeposit(n);
  if (active){
    // sceglie il lavoro più vicino tra ritirare, pulire e avviare; avviare una stampante ferma ha la precedenza
    let best = -1, bs = 1e9, kind = null;
    state.printers.forEach((q,k)=>{
      if (taken.has(k)) return;
      let kk = null;
      if (q.failed) kk = 'clean';
      else if (q.done && q.done.kind === 'prod' && !(q.done.cool > now())) kk = cc < 150 ? 'collect' : null;
      else if (opCanStart(k) !== null) kk = 'start';
      if (!kk) return;
      const st = standOf.printer(k);
      const sc = Math.hypot(st.x - n.x, st.z - n.z) - (kk === 'start' ? 2.5 : 0);
      if (sc < bs){ bs = sc; best = k; kind = kk; }
    });
    if (best >= 0){
      const i = best;
      n.target = i;
      setStatus(n, kind === 'clean' ? `pulisco la stampante #${i+1}` : kind === 'collect' ? `ritiro dalla stampante #${i+1}` : `avvio la stampante #${i+1}`, '#8fd3ff');
      goTo(n, standOf.printer(i), ()=>doWork(n, staffWork(kind === 'clean' ? 2.2 : kind === 'collect' ? 1.3 : .8), ()=>{
        const p = state.printers[i];
        if (p.failed) p.failed = null;
        else if (p.done && p.done.kind === 'prod'){ n.carry[p.done.pid] = (n.carry[p.done.pid]||0) + p.done.count; p.done = null; }
        const pid = opCanStart(i); if (pid !== null) startPrint(i, 'prod', pid, true);   // riparte subito col suo prodotto
        n.target = null;
        touchUI();
      }));
      return;
    }
  }
  if (cc > 0) return opDeposit(n);
  const plan = printerPlan();
  const freeIdx = state.printers.map((q,k)=>k).filter(k=>{ const q = state.printers[k]; return !q.job && !q.done && !q.failed && plan[k] !== undefined; });
  const noFil = active && freeIdx.some(k=>!hasFil(plan[k], gramsOf(plan[k])*plateFor(k)));
  const full = active && freeIdx.length && freeIdx.every(k=>chestSpace(plan[k]) < 0);
  const allCapped = active && state.products.length && state.products.every(p=>isCapped(p.pid));
  setStatus(n, noFil ? 'filamento finito!' : full ? 'casse piene!' : allCapped ? 'scorte piene, aspetto le vendite' : active ? 'in attesa' : 'in pausa', noFil || full ? '#ff8080' : '#cccccc');
  idleInZone(n, n.kind);
}

const shipOrders = J => J.oids.map(id=>state.orders.find(o=>o.id===id)).filter(Boolean);
function reservedByOthers(n, pid){
  let r = 0;
  for (const k of staffKeys('ship')){
    const J = state.staff[k].job;
    if (k === n.kind || !J || J.stage !== 'chest') continue;
    for (const o of shipOrders(J)) if (o.sku === pid) r += o.qty;
  }
  return r;
}
function shipThink(n, active){
  const S = state.staff[n.kind];
  if (S.job) return shipContinue(n, S.job);
  if (active){
    const cands = pendingOrders().filter(o=>chestCount(o.sku) - reservedByOthers(n, o.sku) >= o.qty)
      .sort((a,b)=>(b.urgent - a.urgent) || (a.urgent ? a.deadline - b.deadline : a.t - b.t));
    const cap = 3 + 2*state.staff.lvl, avail = {}, take = [];
    for (const o of cands){
      const have = avail[o.sku] ?? (chestCount(o.sku) - reservedByOthers(n, o.sku));
      if (have >= o.qty){ avail[o.sku] = have - o.qty; take.push(o); if (take.length >= cap) break; }
    }
    if (take.length){
      take.forEach(o=>{ o.status = 'staff'; o.stage = 'prelievo'; o.by = n.kind; });
      S.job = {oids:take.map(o=>o.id), stage:'chest'};
      touchUI();
      return shipContinue(n, S.job);
    }
  }
  setStatus(n, active ? 'in attesa di ordini' : 'in pausa', '#cccccc');
  idleInZone(n, n.kind);
}
function shipContinue(n, J){
  const S = state.staff[n.kind], os = shipOrders(J);
  if (!os.length){ S.job = null; return; }
  const k = os.length, pl = k===1 ? 'ordine' : 'ordini';
  if (J.stage === 'chest'){
    const packAt = standOf.pack();
    let ci = -1, bd = 1e9;
    state.chests.forEach((c, i)=>{ if (!os.some(o=>invCount(o.sku, c) > 0)) return; const st = standOf.chest(i), d = Math.hypot(st.x - packAt.x, st.z - packAt.z); if (d < bd){ bd = d; ci = i; } });
    if (ci < 0){ os.forEach(o=>{ o.status = 'pending'; delete o.stage; }); S.job = null; touchUI(); return; }
    setStatus(n, `prelevo i pezzi per ${k} ${pl}`, '#ffb3d9');
    goTo(n, standOf.chest(ci), ()=>{
      if (chestObjs[ci]) chestObjs[ci].open = 1;
      doWork(n, staffWork(1.1), ()=>{
        const ok = [];
        for (const o of shipOrders(J)){
          if (chestCount(o.sku) >= o.qty){
            let need = o.qty;
            for (const c of state.chests){ need = removePieces(o.sku, need, c); if (!need) break; }
            o.stage = 'imballo'; ok.push(o.id);
          } else { o.status = 'pending'; delete o.stage; }
        }
        J.oids = ok; J.stage = 'pack';
        if (chestObjs[ci]) chestObjs[ci].open = 0;
        touchUI(); save();
      });
    });
    return;
  }
  if (J.stage === 'pack'){
    setStatus(n, `imballo ${k} ${pl}`, '#ffb3d9');
    if (!canPack(k)){ setStatus(n, 'imballaggi finiti!', '#ff8080'); idleInZone(n, n.kind); return; }
    goTo(n, standOf.pack(), ()=>doWork(n, staffWork(1 + .6*k), ()=>{
      if (!canPack(k)) return;
      usePack(k);
      const walk = shipOrders(J).some(o=>o.walkin);
      J.stage = walk ? 'counter' : 'label';
      shipOrders(J).forEach(o=>o.stage = o.walkin ? 'verso il bancone' : 'etichetta'); touchUI();
    }));
    return;
  }
  if (J.stage === 'counter'){
    setStatus(n, 'porto i pacchi al bancone ritiri', '#ffb3d9');
    goTo(n, counterStand(), ()=>doWork(n, staffWork(.8), ()=>{
      const list = shipOrders(J);
      list.filter(o=>o.walkin).forEach(o=>toCounter(o));
      J.oids = list.filter(o=>!o.walkin).map(o=>o.id);
      J.stage = 'label'; touchUI(); save();
    }));
    return;
  }
  if (J.stage === 'label'){
    setStatus(n, 'stampo le etichette', '#ffb3d9');
    goTo(n, standOf.label(), ()=>doWork(n, staffWork(.8 + .35*k), ()=>{ J.stage = 'post'; shipOrders(J).forEach(o=>o.stage = 'verso la posta'); touchUI(); }));
    return;
  }
  if (state.upgrades.van){
    setStatus(n, `lascio ${k===1?'1 pacco':k+' pacchi'} al furgone`, '#ffb3d9');
    goTo(n, pickupStand(), ()=>doWork(n, staffWork(.8), ()=>{
      shipOrders(J).forEach(o=>toPickup(o));
      S.job = null; touchUI(); save();
    }));
    return;
  }
  setStatus(n, `porto ${k===1?'1 pacco':k+' pacchi'} in posta`, '#ffb3d9');
  n.run = true;                                          // corre verso l'Ufficio Postale
  goTo(n, standOf.post(), ()=>doWork(n, staffWork(1), ()=>{
    const list = shipOrders(J);
    let gain = 0; list.forEach(o=>{ gain += shipOrder(o); });
    S.job = null;
    if (list.length) toast(`${STAFF[n.kind].name} ha spedito ${list.length===1?'1 pacco':list.length+' pacchi'}: +${fmt(gain)} LDM`,'money');
    sfx('coin'); touchUI(); checkUnlocks(); save();
    // e torna di corsa all'etichettatrice
    setStatus(n, 'torno all\'etichettatrice', '#ffb3d9');
    n.run = true;
    goTo(n, standOf.label(), ()=>{ n.run = false; });
  }));
}
function stepNpc(n, dt){
  let moving = false;
  const last = n.path[n.path.length-1];
  const toEnd = last ? Math.hypot(last.x - n.x, last.z - n.z) : 0;
  const SS = state.staff[n.kind];
  if (n.path.length || n.work > 0) SS.energy = Math.max(0, (SS.energy ?? 1) - dt/540);
  else SS.energy = Math.min(1, (SS.energy ?? 1) + dt/300);
  const top = staffSpeed() * (.62 + .38*SS.energy) * (n.run ? 2.1 : 1);
  n.spd = damp(n.spd || 0, n.path.length ? Math.min(top, .5 + toEnd*(n.run ? 3.5 : 2.2)) : 0, n.run ? 4 : 6, dt);
  if (n.path.length){
    const t = n.path[0], dx = t.x - n.x, dz = t.z - n.z, d = Math.hypot(dx, dz), sp = Math.max(n.spd, .35)*dt;
    if (d <= sp){
      n.x = t.x; n.z = t.z; n.path.shift();
      if (!n.path.length){
        n.faceRot = n.face ? Math.atan2(n.face.x - n.x, n.face.z - n.z) : null;
        const cb = n.onArrive; n.onArrive = null; if (cb) cb();
      }
    } else {
      n.x += dx/d*sp; n.z += dz/d*sp; moving = true;
      n.faceRot = Math.atan2(dx, dz);
    }
  } else if (n.work > 0){
    n.work -= dt;
    if (n.work <= 0){ n.work = 0; const cb = n.onWork; n.onWork = null; if (cb) cb(); }
  }
  let turn = 0;
  if (n.faceRot != null){
    const df = ((n.faceRot - n.rot + Math.PI*3) % (Math.PI*2)) - Math.PI;
    turn = df * (1 - Math.exp(-dt*7)); n.rot += turn;
  }
  n.phase += dt * n.spd * (n.run ? 1.15 : 1.55);
  const J = state.staff[n.kind].job;
  const carrying = STAFF[n.kind].job === 'op' ? carryCount(n) > 0 : !!(J && J.stage !== 'chest');
  const working = n.work > 0 && !!n.onWork;
  animateHuman(n.h, {phase:n.phase, speed:n.spd, run:!!n.run && n.spd > staffSpeed()*1.2, air:false, holding:carrying && !working, working, turn:dt ? turn/dt : 0, dt});
  n.h.root.position.set(n.x, 0, n.z);
  n.h.root.rotation.y = n.rot;
}
let doorWasOpen = false;
function updateDoor(dt){
  const near = p => Math.hypot(p.x - DOOR_B.cx, p.z - DOOR_B.z) < 2.9;
  let want = near(player);
  if (cat && near(cat)) want = true;
  if (dog && near(dog)) want = true;
  for (const k in npcs) if (near(npcs[k])) want = true;
  // non si chiude mai addosso a qualcuno
  if (!want && slideDoor.open > .05 && Math.abs(player.x - DOOR_B.cx) < 1.5 && Math.abs(player.z - DOOR_B.z) < .6) want = true;
  slideDoor.open = damp(slideDoor.open, want ? 1 : 0, want ? 7 : 4, dt);
  slideDoor.place();
  const isOpen = slideDoor.open > .5;
  if (isOpen !== doorWasOpen){ doorWasOpen = isOpen; if (Math.hypot(player.x - DOOR_B.cx, player.z - DOOR_B.z) < 8) sfx('door'); }
  slideDoor.led.material.color.setHex(slideDoor.open > .72 ? 0x33ff77 : 0xff4040);
}
let ledAcc = 0;
function updateOffice(dt, t){
  if (officeRefs.ceil){
    officeRefs.ceil.visible = !(camera.position.y > 3.25 && inOffice(player));      // dall'alto il tetto si apre
    const lit = NEON.level > .5;
    for (const d of officeRefs.ceilSpots) d.material.color.setHex(lit ? 0xfff6e0 : 0x9aa0a8);
  }
  ledAcc += dt;
  if (ledAcc > .12){
    ledAcc = 0;
    for (let i=0;i<6;i++){ const l = serverLeds[Math.random()*serverLeds.length|0]; l.visible = !l.visible || Math.random() < .5; }
  }
  if (officeAnim.clock && decorShown('clock')){
    const d = new Date(), sec = d.getSeconds() + d.getMilliseconds()/1000, min = d.getMinutes() + sec/60, hr = (d.getHours() % 12) + min/60;
    officeAnim.clock.s.rotation.z = -sec/60*Math.PI*2;
    officeAnim.clock.m.rotation.z = -min/60*Math.PI*2;
    officeAnim.clock.h.rotation.z = -hr/12*Math.PI*2;
  }
  if (decorShown('aquarium')) for (const F of officeAnim.fish){
    const a = t*F.s + F.p;
    F.f.position.set(Math.cos(a)*F.r*1.4, F.y + Math.sin(a*1.7)*.05, F.z + Math.sin(a)*.05);
    F.f.rotation.y = Math.atan2(-Math.sin(a)*F.r*1.4, 0) > 0 ? Math.PI : 0;
  }
}
function updateStaff(dt){
  for (const k of Object.keys(npcs)){
    const n = npcs[k], S = state.staff[k];
    const open = staffOpen();
    if (n.away){ if (open && S.absentDay !== state.dayN) staffArrive(n); else continue; }
    const active = S.on && !S.unpaid && open;
    if (!n.path.length && n.work <= 0 && !n.onArrive){
      if (!open && !hasPendingWork(n)) staffLeave(n);
      else if (active && S.energy < .3 && !hasPendingWork(n) && decorShown('coffee') && STAFF[k].job !== 'mkt') coffeeBreak(n);
      else if (STAFF[k].job === 'op') opThink(n, active);
      else if (STAFF[k].job === 'mkt') mktThink(n, active);
      else if (STAFF[k].job === 'tech') techThink(n, active);
      else if (STAFF[k].job === 'ceo') ceoThink(n, active);
      else shipThink(n, active);
    }
    stepNpc(n, dt);
  }
}
