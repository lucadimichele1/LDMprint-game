/* =====================================================================
   COSTRUZIONE ELEMENTI DINAMICI
   ===================================================================== */
function rebuildColliders(){
  const st = onStudio();
  colliders = staticCols.filter(c=>!(st && (c.tag === 'farm' || (c.x0 >= 13 && c.x1 <= 33 && c.z0 >= -13 && c.z1 <= 9 && c.x1 - c.x0 > 3))));
  // ingombro solo delle stampanti davvero presenti sul piano che stai visitando
  state.printers.forEach((p,i)=>{ if (!onFloor(i)) return; const s = slotOf(i); colliders.push({x0:s.x-.6,x1:s.x+.6,z0:s.z-.6,z1:s.z+.6}); });
  state.chests.forEach((c,i)=>{ const s=CHEST_SLOTS_POS[i]; if (st && s.zone === 'farm') return; colliders.push({x0:s.x-.45,x1:s.x+.45,z0:s.z-.45,z1:s.z+.45}); });
  for (const d of DECOR) if (d.col && decorShown(d.id)) colliders.push({x0:d.col[0], x1:d.col[1], z0:d.col[2], z1:d.col[3]});
  if (state.upgrades.fridge) colliders.push({x0:FRIDGE_COL[0], x1:FRIDGE_COL[1], z0:FRIDGE_COL[2], z1:FRIDGE_COL[3]});
  if (state.upgrades.belt){ colliders.push(Object.assign({}, BELT.col, {off:false})); for (const c of BELT.posts) colliders.push(Object.assign({}, c, {off:false})); }
  if (state.upgrades.van){ colliders.push(Object.assign({}, PICKUP_COL, {off:false})); colliders.push(VAN.col); }
  if (state.upgrades.qa) colliders.push(Object.assign({}, QA_COL));
  if (onStudio()){
    colliders.push({x0:12, x1:13, z0:FARM_OPEN.z0, z1:FARM_OPEN.z1});
    for (const c of STUDIO.cols) colliders.push(c);
  }
}
function rebuildInteractables(){
  inter = [
    {kind:'computer', x:ST.computer.x, z:ST.computer.z, r:2.3},
    {kind:'proto', x:PROTO_POS.x, z:PROTO_POS.z, r:1.9},
    {kind:'pack', x:ST.pack.x, z:ST.pack.z, r:2.2},
    {kind:'label', x:ST.label.x, z:ST.label.z, r:1.9},
    {kind:'post', x:POST.x, z:POST.z, r:2.8},
    {kind:'filament', x:ST.filament.x, z:ST.filament.z, r:2.1},
    {kind:'counter', x:COUNTER.x, z:COUNTER.z, r:1.9},
    {kind:'swing', x:SWING.x, z:SWING.z, r:2.1},
    {kind:'lift', x:LIFT.x, z:LIFT.z - .55, r:1.9},
  ];
  if (state.upgrades.fridge) inter.push({kind:'fridge', x:FRIDGE.x, z:FRIDGE.z, r:1.9});
  if (state.upgrades.belt) inter.push({kind:'hopper', x:BELT.hopper.x, z:BELT.hopper.z, r:1.7});
  if (state.upgrades.van) inter.push({kind:'pickup', x:PICKUP.x, z:PICKUP.z, r:1.9});
  state.printers.forEach((p,i)=>{ if (!onFloor(i)) return; const s = slotOf(i); inter.push({kind:'printer', ref:i, x:s.x, z:s.z, r:1.9}); });
  if (onStudio()) inter = inter.filter(it=>it.kind === 'lift' || !(it.x > 12 && it.z > FARM.z0 - 1 && it.z < FARM.z1 + 1));
  state.chests.forEach((c,i)=>inter.push({kind:'chest', ref:i, x:CHEST_SLOTS_POS[i].x, z:CHEST_SLOTS_POS[i].z, r:1.6}));
  const P = state.project;
  if (P && P.stage==='world') inter.push({kind:'blueprint', x:P.x, z:P.z, r:1.8});
}
function applyFloorLook(){
  const st = onStudio();
  STUDIO.group.visible = st;
  if (officeRefs.farmEquip) officeRefs.farmEquip.visible = !st;
  officeRefs.farmFloor.visible = !st;
  if (officeRefs.farmTags) officeRefs.farmTags.forEach(t=>t.visible = !st);
  BELT.group.visible = !!state.upgrades.belt && !st;
  qaObj.visible = !!state.upgrades.qa;
  chestObjs.forEach((o, i)=>{ if (o) o.g.visible = !(st && CHEST_SLOTS_POS[i].zone === 'farm'); });
  for (const k in npcs){ const n = npcs[k]; if (n.h) n.h.root.visible = !n.away && !(st && roomOf(n) === 'farm'); }
}
function buildDynamic(){
  printerObjs.forEach(o=>{ if (o) scene.remove(o.g); }); chestObjs.forEach(o=>scene.remove(o.g));
  if (blueprintObj){ scene.remove(blueprintObj.g); blueprintObj = null; }
  printerObjs = state.printers.map((p,i)=>onFloor(i) ? buildPrinter(i, p.model) : null);
  chestObjs = state.chests.map((c,i)=>buildChest(i));
  const P = state.project;
  if (P && P.stage==='world') blueprintObj = buildBlueprintObj(P.x, P.z);
  rebuildColliders(); rebuildInteractables(); applyFloorLook();
}
function findSpot(){
  for (let i=0;i<400;i++){
    const a = Math.random()*Math.PI*2, d = 18 + Math.random()*27;
    const x = Math.cos(a)*d, z = Math.sin(a)*d;
    if (Math.abs(x)>47 || Math.abs(z)>47 || reserved(x,z,1)) continue;
    if (blockedAt(x,z,1.3)) continue;
    return {x,z};
  }
  return {x:-20, z:20};
}
function spawnProject(tier){
  const s = findSpot();
  state.project = {tier, stage:'world', x:s.x, z:s.z};
  if (blueprintObj) scene.remove(blueprintObj.g);
  blueprintObj = buildBlueprintObj(s.x, s.z);
  rebuildInteractables(); touchUI();
}

/* =====================================================================
   AZIONI DI GIOCO
   ===================================================================== */
function pickBlueprint(){
  const P = state.project;
  if (!addItem({type:'blueprint', tier:P.tier})){ toast('Inventario pieno: libera una casella','bad'); sfx('err'); return; }
  P.stage = 'held';
  if (blueprintObj){ scene.remove(blueprintObj.g); blueprintObj = null; }
  rebuildInteractables();
  toast(`Hai trovato il progetto "${projectDef(P.tier).name}". Portalo al computer per disegnarlo.`,'good');
  sfx('pick'); save();
}
function newJob(kind, pid, count, secsMult, canFail, wear=0){
  const d = projectDef(pid);
  const dur = CONFIG.PRINT_TIME * d.size * speedMult() * secsMult * (.9 + Math.random()*.2) * 1000;
  const start = now();
  const failAt = canFail && Math.random() < FAIL_RATE[state.upgrades.ai] * (1 + 3*wear) ? start + dur*(.25 + Math.random()*.5) : 0;
  return {kind, pid, count, start, dur, failAt};
}
function startPrint(i, kind, pid, quiet, force){
  const p = state.printers[i];
  if (p.job || p.failed || p.maint || (p.done && !force)) return false;
  if (state.powerOff){ if (!quiet){ toast('Corrente staccata: servono LDM per saldare il debito delle bollette','bad'); sfx('err'); } return false; }
  const d = projectDef(pid), M = modelOf(i);
  if (d.big && !M.big){ if (!quiet){ toast(`${d.name} è troppo grande per una ${M.name}`,'bad'); sfx('err'); } return false; }
  const count = kind==='proto' ? 1 : plateFor(i);
  const need = gramsOf(pid) * count, m = matOf(pid);
  if (state.fil[m] < need){
    if (!quiet){ toast(`${MATERIALS[m].name} insufficiente: servono ${need} g, ne hai ${Math.floor(state.fil[m])}. Compralo al computer o allo scaffale.`,'bad'); sfx('err'); }
    return false;
  }
  state.fil[m] -= need;
  let mult = M.speed, change = false;
  if (kind === 'prod'){
    if (pid < SKU) pid = skuOf(pid, pickColor(i, pid));
    const c = colOf(pid);
    change = p.color != null && p.color !== c;
    if (change) mult *= hasAms(i) ? 1.2 : 1.4;            // cambio colore: spurgo del filamento
    p.color = c;
  }
  p.job = newJob(kind, pid, count, mult, kind==='prod' && state.stats.orders >= 2, wearOf(p));
  p.job.change = change;
  if (kind==='prod') p.last = baseOf(pid);
  if (kind==='proto') state.project.stage = 'proto_printing';
  touchUI(); return true;
}
// stampante dei prototipi nell'ufficio
function startProto(quiet){
  const P = state.project, pr = state.proto;
  if (!P || P.stage !== 'designed'){ if (!quiet){ toast('Nessun modello da prototipare: prima progetta un prodotto','bad'); sfx('err'); } return false; }
  if (pr.job || pr.done) return false;
  const need = gramsOf(P.tier), m = matOf(P.tier);
  if (state.fil[m] < need){ if (!quiet){ toast(`${MATERIALS[m].name} insufficiente per il prototipo`,'bad'); sfx('err'); } return false; }
  state.fil[m] -= need;
  pr.job = newJob('proto', P.tier, 1, PRINTER_MODELS.h2s.speed, false);
  P.stage = 'proto_printing';
  if (!quiet){ toast(`Prototipo di ${projectDef(P.tier).name} in stampa nell'ufficio`,'good'); sfx('click'); }
  touchUI(); save(); return true;
}
function useProto(){
  const pr = state.proto, P = state.project;
  if (pr.done){
    if (!addItem({type:'proto', tier:pr.done.pid})){ toast('Inventario pieno: libera una casella','bad'); sfx('err'); return; }
    if (P) P.stage = 'proto_held';
    pr.done = null;
    toast('Prototipo ritirato. Fotografalo al computer.','good'); sfx('pick'); touchUI(); save();
    return;
  }
  if (pr.job){ toast(`Prototipo in stampa: mancano ${secsLeft(pr)} secondi`); return; }
  startProto(false);
}
function updateProto(t, tn){
  const pr = state.proto, o = protoObj;
  if (pr.job && tn >= pr.job.start + pr.job.dur){
    pr.done = {kind:'proto', pid:pr.job.pid, count:1}; pr.job = null;
    if (state.project && state.project.stage === 'proto_printing') state.project.stage = 'proto_ready';
    toast('Prototipo pronto nella stampante dell\'ufficio','good'); sfx('done'); touchUI();
  }
  animatePrinterObj(o, pr, t, tn, 0);
  if (pr.job) setSpriteText(o.label, `Prototipo · ${secsLeft(pr)}s`, '#ffb347');
  else if (pr.done) setSpriteText(o.label, 'Prototipo pronto: ritiralo!', '#7dff7d');
  else setSpriteText(o.label, state.project && state.project.stage === 'designed' ? 'Stampante prototipi · pronta' : 'Stampante prototipi', '#ffffff');
}
function takeFromPrinter(i){
  const p = state.printers[i], d = p.done;
  if (d.cool && now() < d.cool){ toast(`Il piatto si sta raffreddando: ancora ${Math.ceil((d.cool - now())/1000)} s`); return; }
  if (d.kind==='proto'){
    if (!addItem({type:'proto', tier:d.pid})){ toast('Inventario pieno: libera una casella','bad'); sfx('err'); return; }
    if (state.project) state.project.stage = 'proto_held';
    p.done = null;
    toast('Prototipo ritirato. Portalo al computer per fotografarlo.','good');
  } else {
    const left = addPieces(d.pid, d.count);
    if (left === d.count){ toast('Inventario pieno: deposita i pezzi in una cassa','bad'); sfx('err'); return; }
    if (left > 0){ d.count = left; toast(`Inventario pieno: ${left} pezzi restano nella stampante`,'bad'); }
    else p.done = null;
  }
  sfx('pick'); touchUI(); save();
}
function usePrinter(i){
  const p = state.printers[i];
  if (p.failed){
    p.failed = null;
    toast(`Stampante #${i+1} pulita. Il filamento di quella stampa è perso.`,'good');
    sfx('pick'); touchUI(); save(); return;
  }
  if (p.done){ takeFromPrinter(i); return; }
  if (p.maint){ toast(`Stampante #${i+1} in manutenzione: ancora ${Math.ceil((p.maint.until - now())/1000)} s`); return; }
  if (p.job){ toast(`Stampante #${i+1}: mancano ${secsLeft(p)} secondi`); return; }
  if (!state.products.length){
    toast('Niente da produrre: prima pubblica un prodotto. I prototipi si stampano nell\'ufficio.','bad');
    sfx('err'); return;
  }
  openModal('printer', i, renderPrinter);
}
function packOrder(id, quiet){
  const o = state.orders.find(x=>x.id===id);
  if (!o || o.status!=='pending') return false;
  if (invCount(o.sku) < o.qty){ if(!quiet){ toast(`Ti servono ${o.qty}× ${skuName(o.sku)} nell'inventario`,'bad'); sfx('err'); } return false; }
  if (!canPack(1)){ if (!quiet){ toast('Imballaggi finiti: ordinali al computer (Negozio)','bad'); sfx('err'); } return false; }
  const backup = JSON.stringify(state.inv);
  removePieces(o.sku, o.qty);
  if (!addItem({type:'pack', oid:o.id, labeled:false})){
    state.inv = JSON.parse(backup);
    if (!quiet){ toast('Inventario pieno: non c\'è posto per la busta','bad'); sfx('err'); }
    return false;
  }
  o.status = 'packed'; usePack(1);
  if (!quiet){ toast(o.walkin ? `Ordine #${o.id} imballato: portalo al bancone "Ritiro in sede"` : `Ordine #${o.id} imballato. Ora stampa l'etichetta.`,'good'); sfx('pick'); }
  touchUI(); save(); return true;
}
function useLabelPrinter(){
  if (labelBusy) return;
  const n = state.inv.filter(s=>s && s.type==='pack' && !s.labeled).length;
  if (!n){ toast('Nessun pacco da etichettare: prima imballa un ordine','bad'); sfx('err'); return; }
  labelBusy = {start:performance.now(), dur:1000 + 400*n};
  sfx('label');
}
function finishLabels(){
  let n = 0;
  state.inv.forEach(s=>{ if (s && s.type==='pack' && !s.labeled){ s.labeled = true; n++; const o = state.orders.find(x=>x.id===s.oid); if (o) o.status = 'labeled'; } });
  labelBusy = null;
  toast(`${n} etichett${n===1?'a stampata':'e stampate'}. Porta i pacchi all'Ufficio Postale.`,'good');
  sfx('pick'); touchUI(); save();
}
function addReview(stars, ch){
  state.reviews.push(stars); if (state.reviews.length > 30) state.reviews.shift();
  const t = REVIEW_TXT[stars], txt = t[Math.random()*t.length|0];
  state.lastReviews.unshift({s:stars, ch, txt}); state.lastReviews.length = Math.min(state.lastReviews.length, 6);
  toast(`${starStr(stars)} ${chById(ch).name}: “${txt}”`, stars>=4 ? 'good' : stars<=2 ? 'bad' : '');
  touchUI();
}
function maybeReview(o, late){
  const age = state.gt - o.t;
  let st = late ? 2 : o.urgent ? 5 : age <= 150 ? 5 : age <= 300 ? 4 : age <= 480 ? 3 : 2;
  if (!late && Math.random() < .08) st = Math.max(1, st-1);
  if (st <= 2 || o.urgent || Math.random() < .5) addReview(st, o.ch);
}
// consegna un ordine all'Ufficio Postale: incassa, aggiorna statistiche e reputazione
function returnChance(){ return clamp(qualityRate() * (state.upgrades.qa ? .15 : 1), 0, .5); }
function shipOrder(o){
  const late = o.urgent && state.gt > o.deadline;
  let gain = late ? o.base : o.reward;
  if (Math.random() < returnChance()){
    state.orders = state.orders.filter(x=>x.id!==o.id);
    state.stats.returns++; state.stats.orders++;
    addReview(2, o.ch);
    toast(`↩️ Reso: il cliente dell'ordine #${o.id} ha ricevuto un pezzo difettoso. Nessun incasso.`,'bad');
    return 0;
  }
  const p = prod(o.pid); if (p) p.sold += o.qty;
  state.stats.orders++; state.stats.pieces += o.qty; state.stats.fees += o.fee;
  const cs = state.stats.ch[o.ch]; if (cs){ cs.o++; cs.r += gain; }
  if (o.ch === 'site') state.siteRep++;
  state.paceShip.n++; state.paceShip.age += state.gt - o.t;
  state.orders = state.orders.filter(x=>x.id!==o.id);
  state.ldm += gain; state.earned += gain;
  addRev(gain, o.pid);
  maybeReview(o, late);
  return gain;
}
function usePost(){
  let gain = 0, count = 0;
  state.inv.forEach((s,i)=>{
    if (!(s && s.type==='pack' && s.labeled)) return;
    const o = state.orders.find(x=>x.id===s.oid);
    if (o){ gain += shipOrder(o); count++; }
    state.inv[i] = null;
  });
  if (!count){
    const unl = state.inv.some(s=>s && s.type==='pack');
    toast(unl ? 'I pacchi non hanno l\'etichetta: passa dalla stampante etichette' : 'Non hai pacchi da spedire','bad');
    sfx('err'); return;
  }
  toast(`${count} pacc${count===1?'o spedito':'hi spediti'}: +${fmt(gain)} LDM`,'money');
  sfx('coin'); touchUI(); checkUnlocks(); save();
}
function declineOrder(id){
  const o = state.orders.find(x=>x.id===id);
  if (!o || o.status!=='pending') return;
  state.orders = state.orders.filter(x=>x.id!==id);
  toast(`Ordine #${id} rifiutato`); sfx('click'); touchUI(); save();
}
function checkUnlocks(){
  if (!state.printerUnlocked && state.ldm >= CONFIG.PRINTER_UNLOCK){
    state.printerUnlocked = true;
    toast('Hai raggiunto 1.000 LDM! Ora puoi comprare una nuova stampante 3D dal Negozio del computer.','big');
    sfx('win');
  }
  const latest = state.products[state.products.length-1];
  if (!state.project && latest && latest.sold >= CONFIG.UNLOCK_SOLD){
    spawnProject(state.products.length);
    toast(`Hai venduto ${CONFIG.UNLOCK_SOLD} pezzi di ${latest.name}: c'è un nuovo progetto da trovare!`,'big');
    sfx('order');
  }
  if (!state.won && state.ldm >= CONFIG.GOAL){
    state.won = true; save(); sfx('win');
    openModal('win', null, renderWin);
  }
}

/* ---------- ordini ---------- */
function createOrder(p, qty, chId, qMult=1){
  const c = chById(chId || firstCh(p));
  const maxQ = clamp(Math.round((1 + Math.floor(Math.min(capacityPerMin(), 4 + progress()*6)*.6)) * qMult), 1, CONFIG.STACK);
  qty = qty || 1 + Math.floor(Math.random()*maxQ);
  const urgent = state.stats.orders >= 3 && Math.random() < .15;
  const base = qty * p.price, gross = Math.round(base * (urgent ? 1.4 : 1));
  const fee = Math.round(gross * c.fee);
  state.lastOrderAt = state.gt;
  const col = Math.random() < .55 ? 0 : 1 + Math.floor(Math.random()*(COLORS.length - 1));
  const walkin = c.id === 'subito' && Math.random() < .5;
  const o = {id:state.nextOrderId++, pid:p.pid, sku:skuOf(p.pid, col), walkin, qty, ch:c.id, t:state.gt, urgent,
    deadline: urgent ? state.gt + clamp(110 + qty*6, 130, 300) : 0,
    gross, fee, reward:gross-fee, base: base - Math.round(base*c.fee), status:'pending'};
  state.orders.push(o);
  toast(`${urgent?'⏱ URGENTE +40% · ':''}Ordine #${o.id} su ${c.name}: ${qty}× ${skuName(o.sku)}${walkin ? ' · ritiro in sede' : ''} (${fmt(o.reward)} LDM)`,'order');
  sfx('order'); touchUI();
}
function orderTick(){
  const ps = state.products; if (!ps.length) return;
  const maxO = maxOrders();
  if (state.orders.length >= maxO) return;
  // niente periodi troppo lunghi senza lavoro: dopo 100 s senza ordini aperti ne arriva uno
  if (!state.orders.length && state.gt - state.lastOrderAt > 100){
    const w = ps.map((p,i)=>Math.pow(.6, ps.length-1-i)), tot = w.reduce((a,b)=>a+b,0);
    let x = Math.random()*tot, k = 0; while (x > w[k] && k < ps.length-1){ x -= w[k]; k++; }
    const p = ps[k]; if (Object.values(p.ch).some(Boolean)){ createOrder(p, 0, firstCh(p)); return; }
  }
  const scale = Math.sqrt(Math.max(1, capacityPerMin()/2));
  const latest = ps.length - 1, rep = repMult();
  const E = state.event ? evDef(state.event.id) : null;
  for (let i=0;i<ps.length;i++){
    const p = ps[i];
    const w = Math.max(.15, Math.pow(.6, latest-i));
    for (const c of CHANNELS){
      if (!p.ch[c.id]) continue;
      let d = chDemand(c), perc = c.perceive, q = c.qty;
      if (E && (!E.only || E.only===c.id) && (!E.latest || i===latest)){ d *= E.d; perc *= (E.perc||1); q *= (E.q||1); }
      const perMin = .2 * orderPace() * demandFactor(p.fair*perc*marketMult(p.pid, c.id)*seasonPerceive(), p.price) * w * scale * d * rep * mktMult() * seasonDemand() * (rainLevel > .5 ? 1.1 : 1);
      if (Math.random() < perMin/60){ createOrder(p, 0, c.id, q); if (state.orders.length >= maxO) return; }
    }
  }
}
function expireOrders(){
  for (const o of state.orders.slice()){
    if (o.urgent && o.status==='pending' && state.gt > o.deadline){
      state.orders = state.orders.filter(x=>x.id!==o.id);
      toast(`Ordine urgente #${o.id} annullato: non è partito in tempo`,'bad');
      addReview(1, o.ch); sfx('err');
      state.flow = Math.max(.6, state.flow * .92);
    }
  }
}
function eventTick(){
  const E = state.event;
  if (E && state.gt >= E.until){
    toast(`Fine evento: ${evDef(E.id).name}`);
    state.event = null; state.nextEvent = state.gt + 300 + Math.random()*300; touchUI();
  }
  if (!state.event && state.products.length && state.gt >= state.nextEvent){
    const d = EVENTS[Math.random()*EVENTS.length|0];
    state.event = {id:d.id, until:state.gt + d.dur};
    toast(`${d.name}: ${d.desc} per ${Math.round(d.dur/60*10)/10} minuti`,'big'); sfx('order'); touchUI();
  }
}
function filPacks(mat){
  const k = MATERIALS[mat || 'pla'].price;
  const sl = saleOn() ? ' −50%' : '';
  return [{kg:1, cost:salePrice(k), tag:sl}, {kg:5, cost:salePrice(k*5*.9), tag:sl || ' (−10%)'}, {kg:20, cost:salePrice(k*20*.8), tag:sl || ' (−20%)'}];
}
function buyFil(mat, i, auto, express){
  const p = filPacks(mat)[i];
  if (!p) return false;
  return orderSupply('fil', mat, p.kg*1000, Math.round(p.cost * (express ? 1.5 : 1)), !!express, auto);
}
// materiali che servono ai prodotti in vendita
const neededMats = () => [...new Set(state.products.map(p=>matOf(p.pid)))];
function payWages(){
  const extra = isOpen() ? 1 : 1.5;                              // straordinari pagati di più
  for (const k of Object.keys(STAFF)){
    const s = state.staff[k]; if (!s.hired || !s.on || s.absentDay === state.dayN) continue;
    const w = STAFF[k].wage/60 * extra;
    if (state.ldm >= w){
      state.ldm -= w; state.stats.wages += w; addCost(w);
      if (s.unpaid){ s.unpaid = false; toast(`${STAFF[k].name} torna al lavoro`,'good'); }
    } else if (!s.unpaid){
      s.unpaid = true; toast(`Non hai LDM per lo stipendio di ${STAFF[k].name}: smette di lavorare`,'bad'); sfx('err');
    }
  }
}

/* ---------- negozio ---------- */
const printerCost = (model='p1s') => Math.round(printerCostBase() * PRINTER_MODELS[model].costMult / 10) * 10;
const BELT_COST = 25000, VAN_COST = 15000;
function shopItems(){
  const U = state.upgrades, np = state.printers.length, nc = state.chests.length;
  return [
    {id:'printer', icon:'🖨️', name:'Stampante 3D aggiuntiva', desc:'Scegli il modello: più costa, più è veloce. La A1 mini non stampa i pezzi grandi.', level:`${np}/${CONFIG.MAX_PRINTERS}`,
      cost:salePrice(printerCost('mini')), maxed:np>=CONFIG.MAX_PRINTERS, locked:!state.printerUnlocked, lockMsg:'Si sblocca a 1.000 LDM',
      models:`<div class="models">${Object.entries(PRINTER_MODELS).map(([k,M])=>{ const c = salePrice(printerCost(k));
        return `<button class="mc-btn ${state.ldm>=c?'go':''}" data-act="buyp" data-arg="${k}" ${state.ldm<c?'disabled':''} title="${M.desc}"><b>${M.name}</b><small>${fmt(c)} LDM · tempo ×${M.speed}</small></button>`; }).join('')}</div>`},
    {id:'eject', icon:'⏏️', name:'Espulsione automatica del piatto', desc:`Le stampanti fanno cadere i pezzi nel cassetto e ripartono da sole per ${EJECT_CYCLES[Math.min(U.eject+1, 3)]} cicli prima di dover essere svuotate.`, level:`liv. ${U.eject}/${EJECT_COST.length}`,
      cost:salePrice(EJECT_COST[U.eject]), maxed:U.eject>=EJECT_COST.length},
    {id:'belt', icon:'🛤️', name:'Nastro trasportatore', desc:'Un nastro sospeso porta i pezzi dalla farm alle casse: gli operatori li lasciano nella tramoggia vicino all\'ingresso della farm.', level:U.belt ? 'installato' : '',
      cost:salePrice(BELT_COST), maxed:U.belt>=1},
    {id:'van', icon:'🚐', name:'Furgone del corriere', desc:'Il furgone passa a ritirare i pacchi etichettati allo scaffale "Ritiro corriere" vicino all\'ingresso: niente più corse all\'Ufficio Postale.', level:U.van ? 'attivo' : '',
      cost:salePrice(VAN_COST), maxed:U.van>=1},
    {id:'chest', icon:'📦', name:'Cassa magazzino', desc:`${CONFIG.CHEST_SLOTS} caselle da ${CONFIG.STACK} pezzi l'una.`, level:`${nc}/${CONFIG.MAX_CHESTS}`,
      cost:salePrice(chestCost()), maxed:nc>=CONFIG.MAX_CHESTS},
    {id:'speed', icon:'⚡', name:'Firmware turbo', desc:`Stampe più rapide del 15% (ora ${Math.round(speedMult()*100)}% del tempo).`, level:`liv. ${U.speed}/${SPEED_COST.length}`,
      cost:salePrice(SPEED_COST[U.speed]), maxed:U.speed>=SPEED_COST.length},
    {id:'plate', icon:'🧩', name:'Piatto multi-pezzo', desc:`Pezzi per stampa: ${plateN()}${U.plate<PLATE_COST.length?` → ${PLATE[U.plate+1]}`:''}.`, level:`liv. ${U.plate}/${PLATE_COST.length}`,
      cost:salePrice(PLATE_COST[U.plate]), maxed:U.plate>=PLATE_COST.length},
    {id:'ai', icon:'🤖', name:'Sensore AI anti-spaghetti', desc:`Riduce le stampe fallite: ${Math.round(FAIL_RATE[U.ai]*100*10)/10}%${U.ai<AI_COST.length?` → ${Math.round(FAIL_RATE[U.ai+1]*1000)/10}%`:''}.`, level:`liv. ${U.ai}/${AI_COST.length}`,
      cost:salePrice(AI_COST[U.ai]), maxed:U.ai>=AI_COST.length},
    {id:'aipc', icon:'🧠', name:'Upgrade AI del computer', desc:'Il computer genera i nuovi modelli con l\'AI e li manda subito in stampa: niente più ricerche in giro.', level:U.aipc ? 'installato' : '',
      cost:salePrice(6000), maxed:U.aipc>=1},
    {id:'qa', icon:'🔍', name:'Banco controllo qualità', desc:'Controlla i pezzi appena stampati e scarta quelli difettosi: i resi dei clienti calano quasi a zero.', level:U.qa ? 'installato' : '',
      cost:salePrice(12000), maxed:U.qa>=1},
    {id:'fridge', icon:'🥤', name:'Frigo bibite energetiche', desc:'Frigo nel laboratorio: prendi una lattina quando vuoi e corri più veloce per 30 secondi.', level:U.fridge ? 'installato' : '',
      cost:salePrice(1500), maxed:U.fridge>=1},
    {id:'boots', icon:'👟', name:'Scarpe da corsa', desc:'Cammini il 20% più veloce.', level:`liv. ${U.boots}/${BOOTS_COST.length}`,
      cost:salePrice(BOOTS_COST[U.boots]), maxed:U.boots>=BOOTS_COST.length},
  ];
}
function buy(id, model){
  const it = shopItems().find(x=>x.id===id);
  const cost = id === 'printer' ? salePrice(printerCost(model || 'p1s')) : it && it.cost;
  if (!it || it.maxed || it.locked || state.ldm < cost){ sfx('err'); return; }
  state.ldm -= cost;
  if (id==='printer'){
    const md = PRINTER_MODELS[model] ? model : 'p1s';
    state.printers.push({job:null, done:null, failed:null, model:md});
    const ni = state.printers.length-1;
    printerObjs.push(onFloor(ni) ? buildPrinter(ni, md) : null);
    toast(`${PRINTER_MODELS[md].name} installata nella farm (stampante #${state.printers.length})`,'good');
  } else if (id==='chest'){
    state.chests.push(new Array(CONFIG.CHEST_SLOTS).fill(null));
    chestObjs.push(buildChest(state.chests.length-1));
    toast(`Cassa #${state.chests.length} aggiunta al magazzino`,'good');
  } else {
    state.upgrades[id]++;
    toast(`${it.name} acquistato`,'good');
    if (['aipc','fridge','belt','van','qa'].includes(id)) applyOffice();
    if (id === 'qa') toast('🔍 Banco qualità installato vicino all\'ingresso della farm','good');
    if (id === 'belt') toast('🛤️ Nastro installato: la tramoggia è all\'ingresso della farm','good');
    if (id === 'van') toast('🚐 Furgone attivo: lascia i pacchi etichettati allo scaffale "Ritiro corriere"','good');
    if (id === 'fridge') toast('🥤 Frigo installato nel laboratorio, accanto alle casse','good');
  }
  rebuildColliders(); rebuildInteractables();
  sfx('coin'); touchUI(); save(); rerender();
}
