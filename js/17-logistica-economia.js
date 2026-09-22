/* =====================================================================
   NASTRO TRASPORTATORE e FURGONE DEL CORRIERE
   ===================================================================== */
const hopperStand = () => ({x:13.85, z:-8.5, fx:BELT.hopper.x, fz:BELT.hopper.z});
const pickupStand = () => ({x:PICKUP.x, z:PICKUP.z - .95, fx:PICKUP.x, fz:PICKUP.z + 1});
function beltLoad(carry){
  let n = 0;
  for (const k of Object.keys(carry)){
    const pid = Number(k), q = carry[k];
    if (!q) continue;
    const ci = beltChest(pid);
    state.belt.push({pid, n:q, d:0, ci:ci < 0 ? 0 : ci});
    n += q; delete carry[k];
  }
  return n;
}
function useHopper(){
  if (!state.upgrades.belt) return;
  let n = 0;
  state.inv.forEach((s,i)=>{ if (s && s.type === 'piece'){ state.belt.push({pid:s.pid, n:s.n, d:0, ci:Math.max(0, beltChest(s.pid))}); n += s.n; state.inv[i] = null; } });
  if (!n){ toast('Non hai pezzi da mettere sul nastro','bad'); sfx('err'); return; }
  toast(`${n} pezzi sul nastro: arriveranno da soli nelle casse`,'good'); sfx('pick'); touchUI(); save();
}
function updateBelt(dt){
  if (!state.upgrades.belt) return;
  for (const sg of BELT.seg) sg.tex.offset.x -= BELT.speed*dt/.5;
  const items = state.belt;
  for (let i=items.length-1; i>=0; i--){
    const it = items[i];
    const target = beltDistTo(it.ci);
    it.d = Math.min(it.d + BELT.speed*dt, target + .8);
    if (it.d >= target + .8){
      const ci = state.chests[it.ci] ? it.ci : 0;
      let left = addPieces(it.pid, it.n, state.chests[ci]);
      if (left){ const alt = beltChest(it.pid); if (alt >= 0 && alt !== ci){ it.ci = alt; it.n = left; it.d = Math.min(it.d, beltDistTo(alt)); continue; } }
      if (left){ it.n = left; it.d = target + .8; continue; }       // casse piene: aspetta in fondo al nastro
      items.splice(i, 1);
      if (chestObjs[ci]){ chestObjs[ci].open = 1; setTimeout(()=>{ if (chestObjs[ci]) chestObjs[ci].open = 0; }, 500); }
      touchUI();
    }
  }
  BELT.boxes.forEach((b, k)=>{
    const it = items[k];
    if (!it){ b.visible = false; return; }
    const target = beltDistTo(it.ci);
    const p = beltPos(Math.min(it.d, target));
    const drop = clamp((it.d - target)/.8, 0, 1);
    b.visible = true;
    b.position.set(p.x - drop*.25, BELT.y + .17 - drop*(BELT.y - 1.0), p.z);
  });
}
// furgone: arriva, ritira i pacchi dallo scaffale e riparte
const van = {phase:'away', t:15, x:VAN.far.x, z:VAN.far.z, rot:Math.PI, v:0};
function toPickup(o){ o.status = 'van'; o.stage = 'attende il furgone'; if (!state.pickupQ.includes(o.id)) state.pickupQ.push(o.id); }
function usePickup(){
  if (!state.upgrades.van) return;
  let n = 0;
  state.inv.forEach((s,i)=>{
    if (!(s && s.type==='pack' && s.labeled)) return;
    const o = state.orders.find(x=>x.id===s.oid);
    if (o){ toPickup(o); n++; }
    state.inv[i] = null;
  });
  if (!n){ toast(state.inv.some(s=>s && s.type==='pack') ? 'I pacchi non hanno l\'etichetta' : 'Non hai pacchi etichettati','bad'); sfx('err'); return; }
  toast(`${n} pacch${n===1?'o':'i'} pronti per il furgone`,'good'); sfx('pick'); touchUI(); save();
}
function updateVan(dt){
  const on = !!state.upgrades.van;
  VAN.obj.visible = on && van.phase !== 'away';
  pickupObj.userData.boxes.forEach((b,k)=>{ b.visible = on && k < state.pickupQ.length; });
  if (!on) return;
  const drive = (tx, tz, speed) => {
    const dx = tx - van.x, dz = tz - van.z, d = Math.hypot(dx, dz);
    van.v = damp(van.v, Math.min(speed * (rainLevel > .5 ? .6 : 1), d*1.2 + .5), 2.5, dt);
    const st = Math.min(d, van.v*dt);
    if (d > .01){ van.x += dx/d*st; van.z += dz/d*st; }
    for (const w of VAN.wheels) w.rotation.x -= st/.38;
    return d < .05;
  };
  if (van.phase === 'away'){
    van.t -= dt;
    if (van.t <= 0 && staffOpen()){
      if (state.pickupQ.length){ van.phase = 'coming'; van.x = VAN.far.x; van.z = VAN.far.z; van.rot = 0; van.v = 7; }
      else van.t = 5;
    }
  } else if (van.phase === 'coming'){
    if (drive(VAN.park.x, VAN.park.z, 8)){ van.phase = 'parked'; van.t = 3.5; van.picked = false; VAN.col.off = false; rebuildColliders(); }
  } else if (van.phase === 'parked'){
    van.t -= dt;
    if (!van.picked && van.t < 2){
      van.picked = true;
      const list = state.pickupQ.map(id=>state.orders.find(o=>o.id===id)).filter(Boolean);
      let gain = 0; list.forEach(o=>{ gain += shipOrder(o); });
      state.pickupQ = [];
      if (list.length){ toast(`🚐 Il furgone ha ritirato ${list.length===1?'1 pacco':list.length+' pacchi'}: +${fmt(gain)} LDM`,'money'); sfx('coin'); checkUnlocks(); save(); }
      touchUI();
    }
    if (van.t <= 0){ van.phase = 'turning'; van.t = 1.6; VAN.col.off = true; rebuildColliders(); }
  } else if (van.phase === 'turning'){
    van.t -= dt; van.rot = damp(van.rot, Math.PI, 3, dt);
    if (van.t <= 0){ van.rot = Math.PI; van.phase = 'leaving'; van.v = 0; }
  } else if (van.phase === 'leaving'){
    if (drive(VAN.far.x, VAN.far.z, 9)){ van.phase = 'away'; van.t = 30; }
  }
  VAN.obj.position.set(van.x, 0, van.z);
  VAN.obj.rotation.y = van.rot;
}


/* =====================================================================
   CONTRATTI AZIENDALI (B2B), SPESE FISSE, GIORNO E NOTTE
   ===================================================================== */
const CLIENTS = ['Studio Architetti Rossi', 'Robotica Toscana srl', 'Museo del Design', 'Scuola Maker Firenze', 'DroneLab Italia', 'Negozio Giochi Aurora', 'Fiera Lucca Comics', 'Hotel Belvedere', 'Officina Motori Prato', 'Startup Futura'];
const capFor = pid => printerPlan(true).reduce((a, x, i)=>a + (x === pid ? plateFor(i) / (CONFIG.PRINT_TIME * projectDef(pid).size * speedMult() * modelOf(i).speed / 60) : 0), 0);
function makeOffer(){
  const ps = state.products; if (!ps.length) return null;
  const w = ps.map((p,i)=>Math.pow(.7, ps.length-1-i)), tot = w.reduce((a,b)=>a+b,0);
  let x = Math.random()*tot, k = 0; while (x > w[k] && k < ps.length-1){ x -= w[k]; k++; }
  const p = ps[k], minutes = 8 + Math.floor(Math.random()*8);
  const cap = Math.max(1, capFor(p.pid));
  const qty = clamp(Math.round(cap * minutes * .55 / 10) * 10, 30, 50000);
  const reward = Math.round(qty * p.price * 1.5);
  return {id:state.nextOrderId++, pid:p.pid, qty, minutes, reward, penalty:Math.round(reward*.25),
    client:CLIENTS[Math.random()*CLIENTS.length|0], expires:state.gt + 120};
}
function b2bTick(){
  const B = state.b2b;
  if (B.offer && state.gt > B.offer.expires){ B.offer = null; B.nextAt = state.gt + 240 + Math.random()*240; touchUI(); }
  if (!B.offer && state.gt >= B.nextAt && state.printers.length >= 5 && state.products.length && B.active.length < 2){
    B.offer = makeOffer();
    if (B.offer){ toast(`📑 ${B.offer.client} propone un contratto: ${fmt(B.offer.qty)}× ${projectDef(B.offer.pid).name}. Vai al computer (scheda Contratti)`,'big'); sfx('order'); }
    B.nextAt = state.gt + 420 + Math.random()*300;
  }
  for (const c of B.active.slice()){
    if (state.gt > c.deadline){
      B.active = B.active.filter(x=>x !== c);
      state.ldm = Math.max(0, state.ldm - c.penalty); B.failed++;
      addReview(1, 'site');
      toast(`📑 Contratto con ${c.client} scaduto: penale di ${fmt(c.penalty)} LDM`,'bad'); sfx('err');
    }
  }
}
function deliverContract(id){
  const B = state.b2b, c = B.active.find(x=>x.id === id);
  if (!c || chestCount(c.pid) < c.qty){ sfx('err'); return; }
  let need = c.qty;
  for (const ch of state.chests){ need = removePieces(c.pid, need, ch); if (!need) break; }
  B.active = B.active.filter(x=>x !== c); B.done++;
  const p = prod(c.pid); if (p) p.sold += c.qty;
  state.ldm += c.reward; state.earned += c.reward;
  addRev(c.reward, c.pid);
  state.stats.pieces += c.qty; state.stats.b2b = (state.stats.b2b || 0) + c.reward;
  addReview(5, 'site'); addReview(5, 'site');
  toast(`📑 Contratto consegnato a ${c.client}: +${fmt(c.reward)} LDM`,'money'); sfx('win');
  touchUI(); checkUnlocks(); save(); rerender();
}
function renderContracts(){
  const B = state.b2b;
  let h = `<p class="hint">Le aziende chiedono grandi quantità con una scadenza. Pagano il 50% in più del prezzo di listino, ma se non consegni in tempo paghi una penale. I pezzi vengono presi direttamente dalle casse. Le proposte arrivano quando hai almeno 5 stampanti.</p>`;
  if (B.offer){
    const o = B.offer, d = projectDef(o.pid);
    h += `<div class="contract offer"><div><b>📑 ${o.client}</b><br>${fmt(o.qty)}× ${d.name} in ${o.minutes} minuti
      <br><small>Compenso <b class="gold">${fmt(o.reward)} LDM</b> · penale ${fmt(o.penalty)} LDM · capacità attuale per questo prodotto ~${fmt(capFor(o.pid))}/min · la proposta scade tra ${mmss(o.expires - state.gt)}</small></div>
      <div class="cbtns"><button class="mc-btn go" data-act="b2bok" ${B.active.length >= 2 ? 'disabled' : ''}>Accetta</button><button class="mc-btn" data-act="b2bno">Rifiuta</button></div></div>`;
  } else h += `<p>Nessuna nuova proposta al momento.</p>`;
  h += `<h3>Contratti in corso</h3>`;
  if (!B.active.length) h += `<p>Nessun contratto attivo.</p>`;
  for (const c of B.active){
    const d = projectDef(c.pid), have = chestCount(c.pid), pct = Math.min(100, have/c.qty*100);
    h += `<div class="contract"><div><b>${c.client}</b> · ${fmt(c.qty)}× ${d.name} · scade tra <b>${mmss(c.deadline - state.gt)}</b>
      <div class="meter"><i style="width:${pct}%"></i></div><small>Nelle casse: ${fmt(have)} / ${fmt(c.qty)} · compenso ${fmt(c.reward)} LDM</small></div>
      <div class="cbtns"><button class="mc-btn ${have >= c.qty ? 'go' : ''}" data-act="b2bgo" data-arg="${c.id}" ${have >= c.qty ? '' : 'disabled'}>Consegna</button></div></div>`;
  }
  h += `<p class="hint">Completati ${B.done} · falliti ${B.failed}</p>`;
  return h;
}
// spese fisse: affitto e corrente delle stampanti che lavorano
const rentPerMin = () => 4 + .6*state.printers.length;
const powerPerMin = () => state.printers.reduce((a,p,i)=>a + (p.job ? modelOf(i).power*3 : 0), 0) + (state.proto.job ? 2 : 0);
// le spese non pagate diventano un debito; la corrente si stacca solo se il debito cresce troppo
function payBills(){
  const perMin = rentPerMin() + powerPerMin();
  const due = perMin/60 + (state.debt || 0);
  const paid = Math.min(Math.max(0, state.ldm), due);
  state.ldm -= paid; state.stats.bills = (state.stats.bills || 0) + paid; addCost(paid);
  state.debt = due - paid;
  const limit = Math.max(300, perMin*15);
  if (!state.powerOff && state.debt > limit){
    state.powerOff = true; toast('⚡ Troppe bollette arretrate: corrente staccata finché non paghi il debito','bad'); sfx('err');
  } else if (state.powerOff && state.debt <= 0){
    state.powerOff = false; toast('⚡ Debito saldato: corrente di nuovo attiva','good');
  }
}
// giorno e notte: un giorno dura 12 minuti
const DAY_LEN = 720;
const SKY_DAY = new THREE.Color(0x8cc8ff), SKY_DUSK = new THREE.Color(0xf29a63), SKY_NIGHT = new THREE.Color(0x0a1230);
const skyTmp = new THREE.Color();
const SKY_GREY = new THREE.Color(0x8d96a0);
const isNight = () => state.tod >= 21 || state.tod < 6;
function dayFactor(){ const a = (state.tod - 6)/12*Math.PI; return clamp(Math.sin(a)*1.6 + .15, 0, 1); }
function updateDayNight(dt){
  state.tod += dt*24/DAY_LEN;
  if (state.tod >= 24){
    state.tod -= 24; rollDay(); state.dayN++;
    const t = dayType(state.dayN);
    toast(t === 'holiday' ? `🎉 ${dateStrOf(state.dayN)}: ${holidayOf(state.dayN)}, LDMprint è chiusa` : t === 'sun' ? `${dateStrOf(state.dayN)}: domenica, LDMprint è chiusa` : `🌅 ${dateStrOf(state.dayN)}`);
  }
}
function applySky(tx, tz){
  const k = dayFactor(), a = (state.tod - 6)/12*Math.PI;
  const dusk = clamp(1 - Math.abs(Math.sin(a))*3, 0, 1) * (Math.sin(a) > -.3 ? 1 : 0);
  const wantRain = state.weather.kind === 'rain' ? 1 : 0, wantCloud = state.weather.kind === 'sun' ? 0 : 1;
  rainLevel = damp(rainLevel, wantRain, .5, 1/30); cloudLevel = damp(cloudLevel, wantCloud, .5, 1/30);
  skyTmp.copy(SKY_NIGHT).lerp(SKY_DAY, k).lerp(SKY_DUSK, dusk*.55).lerp(SKY_GREY.clone().multiplyScalar(.25 + .75*k), cloudLevel*.6 + rainLevel*.25);
  scene.background.copy(skyTmp); scene.fog.color.copy(skyTmp);
  hemi.intensity = .12 + .6*k; ambient.intensity = .11 + .11*k;
  const day = Math.sin(a) > 0;
  const dx = Math.cos(a), dy = Math.abs(Math.sin(a));
  sun.intensity = (day ? .85*clamp(dy*2.2, 0, 1) : .12) * (1 - .45*cloudLevel - .3*rainLevel);
  hemi.intensity *= 1 - .15*rainLevel;
  updateRain(1/30, tx, tz, rainLevel);
  if (NEON.glass){ NEON.glass.map = rainLevel > .05 ? rainTex : null; NEON.glass.needsUpdate = NEON.glass.userData.hadMap !== !!NEON.glass.map; NEON.glass.userData.hadMap = !!NEON.glass.map; NEON.glass.opacity = .14 + .12*rainLevel; rainTex.offset.y -= .004; }
  sun.color.setHex(day ? 0xfff2d8 : 0x9fb4ff);
  sun.position.set(tx + (day ? dx : -dx)*40, 12 + dy*34, tz + 16);
  sun.target.position.set(tx, 0, tz);
  stars.material.opacity = Math.pow(1 - k, 1.5);
  MAT.glow.emissiveIntensity = .7 + 1.6*(1 - k);
  mirror.bg.setRGB(.25 + .56*k, .27 + .55*k, .32 + .49*k);
}
const clockStr = () => { const h = Math.floor(state.tod), m = Math.floor((state.tod - h)*60); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; };
// marketing: Pepper passeggia nell'ufficio e fa crescere la domanda
const MKT_SPOTS = [{x:-5.9, z:-18.9, fx:-5.9, fz:-21}, {x:-10.6, z:-13.2, fx:-12, fz:-12.3}, {x:-7.6, z:-15.2}, {x:-6.8, z:-13.4}, {x:-9.2, z:-17.4, fx:-8, fz:-19.3}];
const MKT_LINES = ['preparo i post social', 'campagna pubblicitaria', 'rispondo ai clienti', 'foto per il catalogo', 'newsletter'];
const mktMult = () => staffKeys('mkt').filter(k=>state.staff[k].hired && state.staff[k].on && !state.staff[k].unpaid).length ? 1.25 : 1;
const CEO_SPOTS = [{x:-18.4, z:-16.5}, {x:-15.5, z:-14}, {x:-16.8, z:-17.6}, {x:-14.2, z:-16.8}];
const CEO_LINES = ['riunione con gli investitori', 'analizzo i conti', 'chiamata con un cliente grosso', 'firmo contratti'];
function ceoThink(n, active){
  if (!active){ setStatus(n, 'in pausa', '#cccccc'); idleInZone(n, n.kind); return; }
  setStatus(n, CEO_LINES[Math.random()*CEO_LINES.length|0], '#ffe6a8');
  goTo(n, CEO_SPOTS[Math.random()*CEO_SPOTS.length|0], ()=>doWork(n, 6 + Math.random()*6, ()=>{}));
}
function mktThink(n, active){
  if (!active){ setStatus(n, 'in pausa', '#cccccc'); idleInZone(n, n.kind); return; }
  const sp = MKT_SPOTS[Math.random()*MKT_SPOTS.length|0];
  setStatus(n, MKT_LINES[Math.random()*MKT_LINES.length|0] + ' (+25% ordini)', '#ffd6f0');
  goTo(n, sp, ()=>doWork(n, 4 + Math.random()*4, ()=>{}));
}
