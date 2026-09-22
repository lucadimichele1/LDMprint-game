/* =====================================================================
   SALVATAGGI CON NOME
   ===================================================================== */
const SLOTS_KEY = 'ldmcraft_slots_v1';
function listSlots(){ try { return JSON.parse(localStorage.getItem(SLOTS_KEY) || '[]'); } catch(e){ return []; } }
function writeSlots(list){ try { localStorage.setItem(SLOTS_KEY, JSON.stringify(list)); return true; } catch(e){ return false; } }
function snapshot(){ save(); return JSON.parse(JSON.stringify(state)); }
function saveSlot(name, id){
  const list = listSlots();
  const slot = id ? list.find(x=>x.id === id) : null;
  const sid = slot ? slot.id : 's' + Date.now().toString(36);
  const data = snapshot();
  try { localStorage.setItem('ldmcraft_slot_' + sid, JSON.stringify(data)); }
  catch(e){ return 'Spazio del browser esaurito: elimina qualche salvataggio'; }
  const meta = {id:sid, name:(name || 'Partita').slice(0, 40), date:Date.now(), ldm:Math.floor(state.ldm), day:state.dayN, printers:state.printers.length};
  if (slot) Object.assign(slot, meta); else list.unshift(meta);
  writeSlots(list);
  return null;
}
function readSlot(id){ try { const d = JSON.parse(localStorage.getItem('ldmcraft_slot_' + id)); return d && d.v === 1 ? migrate(d) : null; } catch(e){ return null; } }
function deleteSlot(id){ try { localStorage.removeItem('ldmcraft_slot_' + id); } catch(e){} writeSlots(listSlots().filter(x=>x.id !== id)); }
const esc = t => String(t).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateStr = ms => new Date(ms).toLocaleString('it-IT', {day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'});
function slotLine(x, act){
  return `<button class="slot" data-slot="${act}" data-id="${x.id}"><b>${esc(x.name)}</b><small>${dateStr(x.date)} · ${fmt(x.ldm)} LDM · giorno ${x.day || 1} · ${x.printers || 3} stampanti</small></button>`;
}
function renderSavePanel(msg){
  const list = listSlots();
  const def = `LDMprint · giorno ${state.dayN} · ${fmt(state.ldm)} LDM`;
  $('#savePanel').innerHTML = `<h3>Salva la partita</h3>
    <div class="saverow"><input id="saveName" maxlength="40" value="${esc(def)}" aria-label="Nome del salvataggio"><button class="mc-btn go" id="saveNew">Salva</button></div>
    ${msg ? `<div class="savemsg">${msg}</div>` : ''}
    ${list.length ? `<div class="slotlist"><small>Oppure sovrascrivi un salvataggio:</small>${list.map(x=>slotLine(x, 'over')).join('')}</div>` : ''}
    <button class="mc-btn" id="saveBack">Indietro</button>`;
  $('#pauseMain').classList.add('hidden'); $('#savePanel').classList.remove('hidden');
  const inp = $('#saveName'); inp.focus(); inp.select();
}
function doSave(id){
  const inp = $('#saveName');
  const name = id ? listSlots().find(x=>x.id===id).name : (inp.value.trim() || 'Partita');
  const err = saveSlot(name, id);
  renderSavePanel(err ? `⚠️ ${err}` : `✓ Salvato come “${esc(name)}”`);
}
function renderLoadPanel(){
  const list = listSlots();
  $('#loadPanel').innerHTML = `<h3>Carica una partita</h3>
    ${list.length ? `<div class="slotlist">${list.map(x=>`<div class="slotwrap">${slotLine(x, 'load')}<button class="slotdel" data-slot="del" data-id="${x.id}" aria-label="Elimina ${esc(x.name)}">✕</button></div>`).join('')}</div>`
      : '<p>Nessun salvataggio. Dal menu di pausa usa “Salva con nome”.</p>'}
    <button class="mc-btn" id="loadBack">Indietro</button>`;
  $('#startMain').classList.add('hidden'); $('#loadPanel').classList.remove('hidden');
}
document.addEventListener('click', e=>{
  const b = e.target.closest('[data-slot]');
  if (b){
    const id = b.dataset.id, act = b.dataset.slot;
    if (act === 'over') doSave(id);
    else if (act === 'load'){ const d = readSlot(id); if (d){ $('#loadPanel').classList.add('hidden'); $('#startMain').classList.remove('hidden'); startGame(false, d); } }
    else if (act === 'del'){
      if (b.dataset.sure){ deleteSlot(id); renderLoadPanel(); }
      else { b.dataset.sure = '1'; b.textContent = 'Elimina?'; b.classList.add('sure'); }
    }
    return;
  }
  if (e.target.id === 'saveNew') doSave(null);
  if (e.target.id === 'saveBack'){ $('#savePanel').classList.add('hidden'); $('#pauseMain').classList.remove('hidden'); }
  if (e.target.id === 'loadBack'){ $('#loadPanel').classList.add('hidden'); $('#startMain').classList.remove('hidden'); }
  if (e.target.id === 'pSave') renderSavePanel();
  if (e.target.id === 'btnLoad') renderLoadPanel();
  if (e.target.id === 'pMusic') toggleMusic();
});
document.addEventListener('keydown', e=>{ if (e.target && e.target.id === 'saveName' && e.key === 'Enter'){ e.preventDefault(); doSave(null); } });

/* =====================================================================
   AMBIENTE SONORO: ronzio delle stampanti e musica leggera
   ===================================================================== */
const prefs = (()=>{ try { return JSON.parse(localStorage.getItem('ldmcraft_prefs') || '{}'); } catch(e){ return {}; } })();
let musicOn = prefs.music !== false;
const amb = {hum:null, humGain:null, music:null, timer:0, step:0};
function initAmbient(){
  if (amb.hum || !AC) return;
  try {
    const len = 2*AC.sampleRate, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i=0;i<len;i++){ const w = Math.random()*2-1; last = (last + .02*w)/1.02; d[i] = last*3.5; }
    const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const osc = AC.createOscillator(); osc.type = 'sine'; osc.frequency.value = 118;
    const og = AC.createGain(); og.gain.value = .25;
    amb.humGain = AC.createGain(); amb.humGain.gain.value = 0;
    src.connect(lp); lp.connect(amb.humGain); osc.connect(og); og.connect(amb.humGain); amb.humGain.connect(AC.destination);
    src.start(); osc.start();
    amb.hum = src;
    amb.music = AC.createGain(); amb.music.gain.value = .05; amb.music.connect(AC.destination);
  } catch(e){}
}
function updateAmbient(dt){
  if (!AC) return;
  initAmbient();
  if (!amb.humGain) return;
  const printing = state ? state.printers.filter(p=>p.job).length : 0;
  const dist = Math.hypot(player.x - 22, player.z + 2);
  const near = roomOf(player) === 'farm' ? 1 : clamp(1 - (dist - 10)/30, 0, .5);
  const target = (!started || muted || paused) ? 0 : Math.min(.07, .004*printing) * near;
  amb.humGain.gain.value = damp(amb.humGain.gain.value, target, 3, dt);
  amb.music.gain.value = damp(amb.music.gain.value, (musicOn && !muted && started) ? (paused ? .02 : .05) : 0, 2, dt);
  amb.timer -= dt;
  if (amb.timer <= 0 && musicOn && !muted && started){ amb.timer = 2.4; playMusicStep(); }
}
const CHORDS = [[57,60,64],[53,57,60],[48,52,55],[55,59,62]];      // La min, Fa, Do, Sol
const PENTA = [69,72,74,76,79,81];
const mhz = n => 440*Math.pow(2, (n-69)/12);
function tone(f, t, dur, vol, type){
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .08); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(amb.music); o.start(t); o.stop(t + dur + .05);
}
function playMusicStep(){
  try {
    const t = AC.currentTime + .05, ch = CHORDS[Math.floor(amb.step/2) % CHORDS.length];
    if (amb.step % 2 === 0) ch.forEach(n=>tone(mhz(n), t, 4.6, .22, 'triangle'));
    for (let k=0;k<3;k++) if (Math.random() < .6) tone(mhz(PENTA[Math.random()*PENTA.length|0]), t + k*.8, .9, .12, 'sine');
    amb.step++;
  } catch(e){}
}
function toggleMusic(){
  musicOn = !musicOn; prefs.music = musicOn;
  try { localStorage.setItem('ldmcraft_prefs', JSON.stringify(prefs)); } catch(e){}
  $('#pMusic').textContent = musicOn ? 'Musica: attiva' : 'Musica: spenta';
}

/* =====================================================================
   PERSONAGGIO PERSONALIZZABILE (scheda Studio)
   ===================================================================== */
const LOOK_OPTS = {
  shirt: {label:'Maglietta', opts:{white:['Bianca',0xf6f6f2], black:['Nera',0x26282d], navy:['Blu',0x1f3a6d], red:['Rossa',0xb8322e], green:['Verde',0x3f7a4a], orange:['Arancione',0xe8761f]}},
  hair:  {label:'Capelli', opts:{lightbrown:['Castano chiaro',0x8a6232], brown:['Castani',0x3a2517], black:['Neri',0x111111], blond:['Biondi',0xc9a15a], red:['Rossi',0x9c3b1f], grey:['Grigi',0x9a9a9a]}},
  style: {label:'Taglio', opts:{tousled:['Spettinati'], short:['Corti'], long:['Lunghi']}},
  beard: {label:'Barba', opts:{none:['Rasato'], light:['Corta'], full:['Folta']}},
  eyes:  {label:'Occhi', opts:{blue:['Azzurri',0x5b86b8], brown:['Marroni',0x5a3a22], green:['Verdi',0x4f7a4a]}},
  skin:  {label:'Carnagione', opts:{light:['Chiara',0xdca183], medium:['Media',0xc99070], tan:['Olivastra',0xb07a58], dark:['Scura',0x7a4e36]}},
  pants: {label:'Pantaloni', opts:{jeans:['Jeans scuri',0x243c66], light:['Jeans chiari',0x5b7cad], black:['Neri',0x2a2c31], beige:['Beige',0xb9a27c]}},
  shoes: {label:'Scarpe', opts:{navy:['Sneakers blu',0x22305a], dark:['Scure',0x363a42], white:['Bianche',0xeeeeee], red:['Rosse',0xb8322e]}},
  acc:   {label:'Accessori', opts:{both:['Orologio e anello'], watch:['Solo orologio'], none:['Nessuno']}},
};
const LUCA_LOOK = {shirt:'white', hair:'lightbrown', style:'tousled', beard:'light', eyes:'blue', skin:'light', pants:'jeans', shoes:'navy', acc:'both', v:2};
function heroLook(){
  const L = Object.assign({}, LUCA_LOOK, state ? state.look : {});
  const col = (k) => (LOOK_OPTS[k].opts[L[k]] || LOOK_OPTS[k].opts[LUCA_LOOK[k]])[1];
  return {shirt:col('shirt'), hair:col('hair'), skin:col('skin'), pants:col('pants'), shoe:col('shoes'), eye:col('eyes'),
    hairStyle:L.style, beard:{none:0, light:.3, full:.62}[L.beard] ?? .3, watch:L.acc !== 'none', ring:L.acc === 'both'};
}
function renderLookEditor(){
  const L = state.look;
  return `<h3>Il tuo personaggio: Luca</h3><div class="lookgrid">${Object.entries(LOOK_OPTS).map(([k, g])=>`<div class="lookrow"><b>${g.label}</b>
    <div class="lookopts">${Object.entries(g.opts).map(([v, [name, c]])=>`<button class="lookbtn ${L[k]===v?'on':''}" data-act="look" data-arg="${k}:${v}">${c != null ? `<i style="background:#${c.toString(16).padStart(6,'0')}"></i>` : ''}${name}</button>`).join('')}</div></div>`).join('')}</div>`;
}


/* =====================================================================
   ORARI DELL'AZIENDA (9:00 – 18:30), NEON E FINE TURNO
   ===================================================================== */
const OPEN_H = 9, CLOSE_H = 18.5;
const isOpen = () => { const t = dayType(state.dayN); return (t === 'work' || t === 'sat') && state.tod >= OPEN_H && state.tod < closeHourOf(state.dayN); };
let wasOpen = null;
// ogni secondo a negozio chiuso: ordini, scadenze ed eventi restano fermi fino alla mattina
function closedTick(){
  state.forceOrders.forEach(f=>{ f.at += 1000; });
  state.orders.forEach(o=>{ o.t += 1; if (o.urgent) o.deadline += 1; });
  state.lastOrderAt += 1;
  const B = state.b2b;
  B.active.forEach(c=>{ c.deadline += 1; });
  if (B.offer) B.offer.expires += 1;
  B.nextAt += 1;
  if (state.event) state.event.until += 1;
  state.nextEvent += 1;
  state.cheats.ldmNext += 0;
}
// ogni mattina: assenze, energia, rate dei prestiti, tasse del lunedì, inventario ogni due settimane
function morningRoutine(){
  if (state.lastMorning === state.dayN) return;
  state.lastMorning = state.dayN;
  for (const k of Object.keys(STAFF)){
    const S = state.staff[k]; if (!S.hired) continue;
    S.energy = 1;
    if (Math.random() < .05){
      S.absentDay = state.dayN; S.absentWhy = Math.random() < .5 ? 'ferie' : 'malattia';
      toast(`${STAFF[k].name} oggi è ${S.absentWhy === 'ferie' ? 'in ferie' : 'in malattia'}`);
    }
  }
  payLoans();
  if (dateOf(state.dayN).getUTCDay() === 1 && state.dayN > 1) weeklyClose();
  if (state.dayN - state.lastInv >= 14) doInventory();
}
function doInventory(){
  state.lastInv = state.dayN;
  let lost = 0, value = 0;
  state.chests.forEach(ch=>ch.forEach((s, i)=>{
    if (!s || s.type !== 'piece') return;
    let l = 0; for (let k=0;k<s.n;k++) if (Math.random() < .01) l++;
    if (!l) return;
    s.n -= l; lost += l; value += l * (prod(s.pid) ? prod(s.pid).price : projectDef(s.pid).fair);
    if (!s.n) ch[i] = null;
  }));
  state.lastInvReport = {day:state.dayN, lost, value};
  if (value) addCost(value);
  toast(lost ? `📋 Inventario: ${lost} pezzi persi o rovinati (valore ${fmt(value)} LDM)` : '📋 Inventario completato: nessuna differenza','big');
  touchUI();
}
function hoursTick(){
  const open = isOpen();
  if (wasOpen === null){ wasOpen = open; return; }
  if (open === wasOpen) return;
  wasOpen = open;
  if (open){
    morningRoutine();
    toast(`☀️ ${dateStrOf(state.dayN)}, ore 9:00: LDMprint apre${dayType(state.dayN) === 'sat' ? ' (sabato, fino alle 13:00)' : ''}. Riprendono gli ordini.`,'big');
    for (const k of Object.keys(npcs)) if (state.staff[k].absentDay !== state.dayN) staffArrive(npcs[k]);
  } else {
    toast(`🔒 LDMprint chiude. Ordini sospesi fino alla prossima apertura`,'big');
    state.shiftPromptAt = state.gt + 10;
  }
  touchUI();
}
// lo staff finisce il lavoro in corso, poi esce; la mattina rientra dalla porta
const STAFF_EXIT = {x:0, z:13.5};
function staffLeave(n){
  if (n.maintTarget != null){ const p = state.printers[n.maintTarget]; if (p) p.maintRes = false; n.maintTarget = null; }
  setStatus(n, 'fine turno, vado a casa', '#cccccc');
  goTo(n, STAFF_EXIT, ()=>{ n.away = true; n.h.root.visible = false; setStatus(n, 'a casa', '#cccccc'); });
}
function staffArrive(n){
  if (!n.away) return;
  n.away = false; n.x = STAFF_EXIT.x + (Math.random() - .5); n.z = STAFF_EXIT.z; n.path = []; n.work = 0; n.onArrive = null;
  n.h.root.visible = true;
}
function hasPendingWork(n){
  const job = STAFF[n.kind].job;
  if (job === 'op') return carryCount(n) > 0;
  if (job === 'ship') return !!state.staff[n.kind].job;
  if (job === 'tech') return n.maintTarget != null;
  return false;
}
// luci al neon: si accendono alle 17:30 e si spengono al mattino
const neonWanted = () => state.tod >= 17.5 || state.tod < 7.5;
function updateNeon(dt){
  const want = state ? neonWanted() : false;
  if (want !== NEON.on){ NEON.on = want; NEON.flick = want ? .9 : 0; }
  let lit = NEON.on;
  if (NEON.flick > 0){ NEON.flick -= dt; lit = Math.random() < .55; }      // sfarfallio dell'accensione
  NEON.level = damp(NEON.level, lit ? 1 : 0, lit ? 30 : 8, dt);
  NEON.tubes.material = NEON.level > .5 ? NEON.matOn : NEON.matOff;
  for (const l of NEON.lights) l.intensity = .95 * NEON.level;
  if (officeRefs.ceilLights) for (const l of officeRefs.ceilLights) l.intensity = .8 * NEON.level;
}
// fine turno: dopo 10 secondi il gioco chiede se salvare
let shiftOpen = false;
function shiftTick(){
  if (state.shiftPromptAt == null || shiftOpen || modal || paused) return;
  if (state.gt >= state.shiftPromptAt){ state.shiftPromptAt = null; openShiftPrompt(); }
}
function openShiftPrompt(){
  shiftOpen = true;
  setPaused(true, true);
  const def = `${dateStrOf(state.dayN)} · ${fmt(state.ldm)} LDM`;
  $('#shiftPrompt').innerHTML = `<div class="mc-panel shift-box">
    <h2>🔒 Fine turno · ${dateStrOf(state.dayN)}</h2>
    <p>LDMprint ha chiuso. Oggi: incassi ${fmt(state.today.rev)} LDM, costi ${fmt(state.today.cost)} LDM. Vuoi salvare la partita?</p>
    <div class="saverow"><input id="shiftName" maxlength="40" value="${esc(def)}" aria-label="Nome del salvataggio"><button class="mc-btn go" id="shiftSave">Salva</button></div>
    <div id="shiftMsg" class="savemsg"></div>
    <div class="pause-btns">
      <button class="mc-btn" id="shiftSleep">Salta alla prossima apertura</button>
      <button class="mc-btn" id="shiftNo">Non ora</button>
    </div></div>`;
  $('#shiftPrompt').classList.remove('hidden');
  const inp = $('#shiftName'); inp.focus(); inp.select();
}
function closeShiftPrompt(){
  $('#shiftPrompt').classList.add('hidden');
  shiftOpen = false;
  setPaused(false, true);
}
function skipToMorning(){
  if (state.tod >= OPEN_H){ rollDay(); state.dayN++; }
  while (!['work','sat'].includes(dayType(state.dayN))){ rollDay(); state.dayN++; }
  state.tod = OPEN_H;
  morningRoutine();
  wasOpen = true;
  for (const k of Object.keys(npcs)) if (state.staff[k].absentDay !== state.dayN) staffArrive(npcs[k]);
  toast(`🌅 ${dateStrOf(state.dayN)}: buongiorno!`);
}
document.addEventListener('click', e=>{
  const id = e.target && e.target.id;
  if (id === 'shiftSave' || id === 'shiftSleep' || id === 'shiftNo'){
    if (id === 'shiftSave'){
      const name = $('#shiftName').value.trim() || 'Fine turno';
      const err = saveSlot(name);
      $('#shiftMsg').textContent = err ? '⚠️ ' + err : `✓ Salvato come “${name}”`;
      if (!err) setTimeout(()=>{ if (shiftOpen) closeShiftPrompt(); }, 1200);
      return;
    }
    if (id === 'shiftSleep') skipToMorning();
    closeShiftPrompt();
  }
});
document.addEventListener('keydown', e=>{
  if (!shiftOpen) return;
  if (e.key === 'Enter' && e.target && e.target.id === 'shiftName'){ e.preventDefault(); $('#shiftSave').click(); }
  if (e.key === 'Escape'){ e.preventDefault(); closeShiftPrompt(); }
});


/* =====================================================================
   REALISMO: colori, usura, qualità, forniture, imballaggi, tasse,
   concorrenza, prestiti, calendario, meteo, clienti al bancone
   ===================================================================== */
// ---------- colori (ogni pezzo fisico ha un codice sku = prodotto + colore) ----------
const COLORS = [{name:'originale', hex:null}, {name:'nero', hex:'#26282d'}, {name:'bianco', hex:'#eeeeee'}, {name:'blu', hex:'#2d5bd1'}];
const SKU = 1000;
const baseOf = x => x % SKU;
const colOf = x => x >= SKU ? Math.floor(x / SKU) - 1 : 0;
const skuOf = (pid, c) => baseOf(pid) + (c + 1) * SKU;
const colorHex = x => COLORS[colOf(x)].hex || projectDef(x).color;
const skuName = x => projectDef(x).name + (x >= SKU && colOf(x) ? ` ${COLORS[colOf(x)].name}` : '');
const colorDot = x => `<i class="cdot" style="background:${colorHex(x)}" title="${COLORS[colOf(x)].name}"></i>`;
const pendingSku = sku => pendingOrders().filter(o=>o.sku === sku).reduce((a,o)=>a + o.qty, 0);
function transitSku(sku){
  let n = 0;
  for (const p of state.printers){ if (p.done && p.done.pid === sku) n += p.done.count; if (p.job && p.job.pid === sku) n += p.job.count; }
  for (const it of state.belt) if (it.pid === sku) n += it.n;
  for (const k in npcs){ const c = npcs[k].carry; if (c && c[sku]) n += c[sku]; }
  return n;
}
// sceglie il colore che manca di più; se non manca niente tiene quello già caricato (niente spurghi)
function pickColor(i, pid){
  let best = -1, bn = 0;
  for (let c=0; c<COLORS.length; c++){                 // prima i colori chiesti dagli ordini
    const s = skuOf(pid, c);
    const need = pendingSku(s) - chestCount(s) - transitSku(s);
    if (need > bn){ bn = need; best = c; }
  }
  if (best >= 0) return best;
  const s0 = skuOf(pid, 0);                             // poi una piccola scorta del colore originale
  if (chestCount(s0) + transitSku(s0) < 12) return 0;
  const cur = state.printers[i] && state.printers[i].color;
  return cur != null ? cur : 0;
}
const hasAms = i => ['p1s','h2s'].includes(state.printers[i].model || 'p1s');

// ---------- usura e qualità ----------
const wearOf = p => p.wear || 0;
function qualityRate(){ const q = state.qual; return q.good + q.bad > 0 ? q.bad / (q.good + q.bad) : .03; }
function afterJob(i, J){
  const p = state.printers[i], M = modelOf(i);
  p.wear = Math.min(1, wearOf(p) + .004 * (M.name === 'A1 mini' ? 1.3 : M.name === 'H2S Combo' ? .7 : 1));
  const rate = .03 + .1*wearOf(p);
  let bad = 0; for (let k=0;k<J.count;k++) if (Math.random() < rate) bad++;
  if (state.upgrades.qa && bad){ J.count -= bad; state.stats.scrap = (state.stats.scrap || 0) + bad; }
  else { state.qual.bad = state.qual.bad*.98 + bad; }
  state.qual.good = state.qual.good*.98 + (J.count - (state.upgrades.qa ? 0 : bad));
}
function startMaint(i){
  const p = state.printers[i];
  if (p.job || p.maint) return;
  const cost = 50;
  if (state.ldm < cost){ sfx('err'); return; }
  state.ldm -= cost; addCost(cost);
  p.maint = {until: now() + 20000};
  toast(`Stampante #${i+1}: manutenzione in corso (20 s)`,'good'); sfx('click'); touchUI(); save();
}

// ---------- imballaggi ----------
const PACK_ITEMS = {
  box:  {name:'Scatole', unit:'pz', per:1, qty:50, cost:75},
  wrap: {name:'Pluriball', unit:'m', per:1, qty:50, cost:50},
  tape: {name:'Nastro adesivo', unit:'rotoli', per:.05, qty:5, cost:30},
};
const canPack = k => Object.entries(PACK_ITEMS).every(([id, it])=>state.packs[id] >= it.per*k - 1e-9);
function usePack(k){ for (const [id, it] of Object.entries(PACK_ITEMS)) state.packs[id] = Math.max(0, state.packs[id] - it.per*k); }
const packLow = () => Object.entries(PACK_ITEMS).some(([id, it])=>state.packs[id] < it.per*10);

// ---------- forniture con tempi di consegna e fornitori esauriti ----------
const pendingSupply = (kind, item) => state.supply.some(s=>s.kind === kind && s.item === item);
function orderSupply(kind, item, qty, cost, express, auto){
  if (state.ldm < cost){ if (!auto) sfx('err'); return false; }
  const out = kind === 'fil' && state.supplyOut && state.supplyOut.mat === item && state.gt < state.supplyOut.until;
  if (out && !express){ if (!auto){ toast(`Il fornitore ha finito il ${MATERIALS[item].name}: prova la consegna express`,'bad'); sfx('err'); } return false; }
  state.ldm -= cost; addCost(cost);
  if (kind === 'fil') state.stats.fil += cost;
  const name = kind === 'fil' ? `${qty/1000} kg di ${MATERIALS[item].name}` : `${qty} ${PACK_ITEMS[item].unit} di ${PACK_ITEMS[item].name.toLowerCase()}`;
  if (express){ deliverSupply({kind, item, qty}); toast(`⚡ Consegna express: ${name} arrivati subito`,'good'); }
  else { state.supply.push({kind, item, qty, at:state.gt + (kind === 'fil' ? 45 : 30)}); toast(`${auto ? 'Riordino automatico: ' : ''}ordinati ${name}, arrivano tra ${kind === 'fil' ? 45 : 30} s`,'good'); }
  if (!auto) sfx('coin');
  touchUI(); save();
  if (!auto) rerender();
  return true;
}
function deliverSupply(s){
  if (s.kind === 'fil') state.fil[s.item] += s.qty;
  else state.packs[s.item] += s.qty;
}
function supplyTick(){
  if (staffOpen()){
    for (const s of state.supply.slice()) if (state.gt >= s.at){
      deliverSupply(s); state.supply = state.supply.filter(x=>x !== s);
      toast(`🚚 Consegnati ${s.kind === 'fil' ? (s.qty/1000) + ' kg di ' + MATERIALS[s.item].name : s.qty + ' ' + PACK_ITEMS[s.item].unit + ' di ' + PACK_ITEMS[s.item].name.toLowerCase()}`,'good');
      touchUI();
    }
  }
  const O = state.supplyOut;
  if (O && state.gt >= O.until){ toast(`Il fornitore ha di nuovo il ${MATERIALS[O.mat].name}`); state.supplyOut = null; }
  if (!state.supplyOut && state.gt >= state.nextOutage){
    state.nextOutage = state.gt + 420 + Math.random()*300;
    if (Math.random() < .35 && state.products.length){
      const mats = Object.keys(MATERIALS), m = mats[Math.random()*mats.length|0];
      state.supplyOut = {mat:m, until:state.gt + 180};
      toast(`⚠️ Fornitore: ${MATERIALS[m].name} esaurito per qualche minuto. Tieni una scorta minima!`,'bad');
    }
  }
  if (state.autoFil) for (const m of neededMats()) if (state.fil[m] < 2000 && !pendingSupply('fil', m)){
    const out = state.supplyOut && state.supplyOut.mat === m;
    if (!out) orderSupply('fil', m, 5000, filPacks(m)[1].cost, false, true);
  }
  if (state.autoPack) for (const [id, it] of Object.entries(PACK_ITEMS)) if (state.packs[id] < it.per*20 && !pendingSupply('pack', id))
    orderSupply('pack', id, it.qty, salePrice(it.cost), false, true);
}

// ---------- contabilità: giorni, settimane, tasse ----------
const TAX_RATE = .2;
function addRev(v, pid){
  state.today.rev += v; state.week.rev += v;
  if (pid != null){ const b = baseOf(pid); state.stats.prodRev[b] = (state.stats.prodRev[b] || 0) + v; }
  state.tax.due += v * TAX_RATE;
}
function addCost(v){ state.today.cost += v; state.week.cost += v; }
function rollDay(){
  state.days.push(Object.assign({}, state.today, {tax:state.today.rev*TAX_RATE}));
  if (state.days.length > 30) state.days.shift();
  state.today = {d:state.dayN, rev:0, cost:0};
}
function weeklyClose(){
  const W = state.week, paid = Math.min(state.ldm, state.tax.due);
  state.ldm -= paid;
  const rest = state.tax.due - paid;
  if (rest > 0){ state.debt = (state.debt || 0) + rest*1.1; toast(`🧾 Tasse non pagate per intero: ${fmt(rest)} LDM diventano debito con il 10% di mora`,'bad'); }
  state.months.push({label:`Settimana ${state.weekN}`, rev:W.rev, cost:W.cost, tax:state.tax.due});
  if (state.months.length > 12) state.months.shift();
  if (state.tax.due > 0) toast(`🧾 Versamento settimanale di IVA e imposte: ${fmt(state.tax.due)} LDM`);
  state.tax.paid += paid; state.tax.due = 0;
  state.week = {rev:0, cost:0}; state.weekN++;
}

// ---------- prezzi della concorrenza ----------
const mktKey = (pid, ch) => pid + ':' + ch;
const marketMult = (pid, ch) => state.market[mktKey(pid, ch)] || 1;
const marketPrice = (pid, ch) => Math.round(projectDef(pid).fair * chById(ch).perceive * marketMult(pid, ch) * seasonPerceive());
function marketTick(){
  for (const p of state.products) for (const c of CHANNELS){
    const k = mktKey(p.pid, c.id), m = state.market[k] || 1;
    state.market[k] = clamp(m + (Math.random()-.5)*.08 + (1 - m)*.05, .72, 1.3);
  }
}

// ---------- prestiti ----------
const LOAN_SIZES = [10000, 50000, 250000, 1000000, 5000000];
const loanOk = a => state.earned >= a/4 && state.loans.length < 2;
function takeLoan(a){
  if (!loanOk(a)) { sfx('err'); return; }
  const total = Math.round(a * 1.12);
  state.loans.push({amount:a, left:total, inst:Math.round(total/10)});
  state.ldm += a;
  toast(`🏦 Prestito di ${fmt(a)} LDM accreditato: 10 rate giornaliere da ${fmt(Math.round(total/10))} LDM`,'money'); sfx('coin');
  save(); rerender();
}
function payLoans(){
  for (const L of state.loans.slice()){
    const inst = Math.min(L.inst, L.left), paid = Math.min(state.ldm, inst);
    state.ldm -= paid; L.left -= inst;
    addCost(inst - inst/1.12);
    if (paid < inst){ state.debt = (state.debt || 0) + (inst - paid); toast('🏦 Rata del prestito non coperta: la differenza diventa debito','bad'); }
    if (L.left <= 0){ state.loans = state.loans.filter(x=>x !== L); toast(`🏦 Prestito di ${fmt(L.amount)} LDM estinto`,'good'); }
  }
}

// ---------- calendario ----------
const CAL_START = Date.UTC(2026, 0, 5);            // lunedì 5 gennaio 2026
const dateOf = n => new Date(CAL_START + (n-1)*864e5);
function easterMonday(y){
  const a = y%19, b = Math.floor(y/100), c = y%100, d = Math.floor(b/4), e = b%4, f = Math.floor((b+8)/25), g = Math.floor((b-f+1)/3);
  const h = (19*a+b-d-g+15)%30, i = Math.floor(c/4), k = c%4, l = (32+2*e+2*i-h-k)%7, m = Math.floor((a+11*h+22*l)/451);
  const month = Math.floor((h+l-7*m+114)/31), day = ((h+l-7*m+114)%31)+1;
  return new Date(Date.UTC(y, month-1, day + 1));
}
const HOLIDAYS = {'1-1':'Capodanno', '1-6':'Epifania', '4-25':'Festa della Liberazione', '5-1':'Festa dei Lavoratori', '6-2':'Festa della Repubblica', '8-15':'Ferragosto', '11-1':'Ognissanti', '12-8':'Immacolata', '12-25':'Natale', '12-26':'Santo Stefano'};
function holidayOf(n){
  const d = dateOf(n), key = `${d.getUTCMonth()+1}-${d.getUTCDate()}`;
  if (HOLIDAYS[key]) return HOLIDAYS[key];
  const em = easterMonday(d.getUTCFullYear());
  if (em.getUTCMonth() === d.getUTCMonth() && em.getUTCDate() === d.getUTCDate()) return 'Pasquetta';
  return null;
}
function dayType(n){
  if (holidayOf(n)) return 'holiday';
  const w = dateOf(n).getUTCDay();
  return w === 0 ? 'sun' : w === 6 ? 'sat' : 'work';
}
const closeHourOf = n => ({work:18.5, sat:13})[dayType(n)] ?? 0;
const WD = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'], MO = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const dateStrOf = n => { const d = dateOf(n); return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MO[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
function seasonDemand(){
  const d = dateOf(state.dayN), m = d.getUTCMonth(), day = d.getUTCDate();
  if ((m === 0 && day >= 5) || (m === 1 && day <= 15) || m === 6 || m === 7) return 1.3;     // saldi
  if (m === 11) return 1.35;                                                                   // Natale
  return 1;
}
function seasonPerceive(){
  const d = dateOf(state.dayN), m = d.getUTCMonth(), day = d.getUTCDate();
  return ((m === 0 && day >= 5) || (m === 1 && day <= 15) || m === 6 || m === 7) ? .85 : 1;
}
const inSales = () => seasonPerceive() < 1;

// ---------- straordinari ----------
const OVERTIME_END = 21;
function staffOpen(){
  if (isOpen()) return true;
  const t = dayType(state.dayN);
  return !!state.overtime && (t === 'work' || t === 'sat') && state.tod >= closeHourOf(state.dayN) && state.tod < OVERTIME_END;
}

// ---------- meteo ----------
function weatherTick(){
  const W = state.weather;
  if (state.gt < W.next) return;
  const m = dateOf(state.dayN).getUTCMonth();
  const wet = [.3,.28,.25,.3,.25,.15,.08,.1,.2,.3,.35,.3][m];
  const r = Math.random();
  const kind = r < wet ? 'rain' : r < wet + .28 ? 'cloud' : 'sun';
  if (kind !== W.kind){ W.kind = kind; toast(kind === 'rain' ? '🌧️ Inizia a piovere' : kind === 'cloud' ? '☁️ Il cielo si copre' : '☀️ Torna il sole'); }
  W.next = state.gt + 90 + Math.random()*180;
}
const weatherIcon = () => ({sun:'☀️', cloud:'☁️', rain:'🌧️'})[state.weather.kind];
let rainLevel = 0, cloudLevel = 0;

// ---------- clienti che passano a ritirare ----------
const customers = [];
const counterStand = () => ({x:COUNTER.x, z:COUNTER.z - 1.05, fx:COUNTER.x, fz:COUNTER.z + 1});
const CUSTOMER_OUT = {x:1.1, z:33};
const CUSTOMER_LOOKS = [
  {shirt:0x5a8a3a, pants:0x2d2f36, hair:0x2a1a10, skin:0xd8a27c, lite:true, height:.98},
  {shirt:0xc0392b, pants:0x34495e, hair:0xd9b46a, skin:0xf0c7a8, longHair:true, beard:0, lite:true, fem:true, height:.94},
  {shirt:0x8e44ad, pants:0x2c3e50, hair:0x111111, skin:0x8a5a3c, lite:true},
  {shirt:0xe67e22, pants:0x6b7078, hair:0x9a9a9a, skin:0xe0ac86, beard:.5, lite:true, build:1.08, height:.97},
];
function toCounter(o){ o.status = 'counter'; o.stage = 'al bancone'; o.counterAt = state.gt; }
function useCounter(){
  let n = 0, wrong = 0;
  state.inv.forEach((s,i)=>{
    if (!(s && s.type === 'pack')) return;
    const o = state.orders.find(x=>x.id === s.oid);
    if (!o) { state.inv[i] = null; return; }
    if (!o.walkin){ wrong++; return; }
    toCounter(o); state.inv[i] = null; n++;
  });
  if (!n){ toast(wrong ? 'Al bancone vanno solo gli ordini con ritiro in sede' : 'Non hai pacchi per il ritiro in sede','bad'); sfx('err'); return; }
  toast(`${n} pacch${n===1?'o':'i'} al bancone: il cliente arriverà a ritirarl${n===1?'o':'i'}`,'good'); sfx('pick'); touchUI(); save();
}
function spawnCustomer(o){
  const h = makeHuman(CUSTOMER_LOOKS[Math.random()*CUSTOMER_LOOKS.length|0]);
  scene.add(h.root);
  const c = {h, oid:o.id, x:CUSTOMER_OUT.x, z:CUSTOMER_OUT.z, rot:Math.PI, spd:0, phase:0, path:route(CUSTOMER_OUT, counterStand()), mode:'in', wait:0};
  o.customer = true;
  customers.push(c);
}
function updateCustomers(dt){
  const ready = state.orders.filter(o=>o.status === 'counter' && !o.customer);
  if (isOpen() && ready.length && customers.length < 3) spawnCustomer(ready[0]);
  for (const c of customers.slice()){
    if (c.path.length){
      const t = c.path[0], dx = t.x - c.x, dz = t.z - c.z, d = Math.hypot(dx, dz);
      c.spd = damp(c.spd, 2.2, 5, dt);
      const st = c.spd*dt;
      if (d <= st){ c.x = t.x; c.z = t.z; c.path.shift(); }
      else { c.x += dx/d*st; c.z += dz/d*st; const tr = Math.atan2(dx, dz), df = ((tr - c.rot + Math.PI*3) % (Math.PI*2)) - Math.PI; c.rot += df*Math.min(1, dt*7); }
    } else {
      c.spd = damp(c.spd, 0, 8, dt);
      if (c.mode === 'in'){
        c.rot = 0; c.wait += dt;
        if (c.wait > 2.5){
          const o = state.orders.find(x=>x.id === c.oid);
          if (o){ const g = shipOrder(o); toast(`🧍 Un cliente ha ritirato l'ordine #${o.id}: +${fmt(g)} LDM`,'money'); sfx('coin'); checkUnlocks(); save(); }
          c.mode = 'out'; c.path = route({x:c.x, z:c.z}, CUSTOMER_OUT);
        }
      } else if (c.mode === 'out'){ scene.remove(c.h.root); customers.splice(customers.indexOf(c), 1); continue; }
    }
    c.phase += dt * c.spd * 1.5;
    animateHuman(c.h, {phase:c.phase, speed:c.spd, run:false, air:false, holding:c.mode === 'out', working:false, turn:0, dt});
    if (c.mode === 'out') c.h.held.material = MAT.cardboard;
    c.h.root.position.set(c.x, 0, c.z); c.h.root.rotation.y = c.rot;
  }
  counterObj.userData.boxes.forEach((b,k)=>{ b.visible = k < state.orders.filter(o=>o.status === 'counter').length; });
}

// ---------- tecnico della manutenzione ----------
function techThink(n, active){
  if (!active){ idleInZone(n, n.kind); return; }
  const taken = new Set(Object.values(npcs).filter(m=>m !== n && m.maintTarget != null).map(m=>m.maintTarget));
  let best = -1, bw = .45;
  state.printers.forEach((p,i)=>{ if (!taken.has(i) && !p.maint && wearOf(p) >= bw){ bw = wearOf(p); best = i; } });
  if (best < 0){ setStatus(n, 'controllo le stampanti', '#b8f0b8'); idleInZone(n, n.kind); return; }
  const i = best, p = state.printers[i];
  p.maintRes = true; n.maintTarget = i;
  setStatus(n, `vado alla stampante #${i+1}`, '#b8f0b8');
  goTo(n, standOf.printer(i), ()=>{
    const tryMaint = () => {
      const q = state.printers[i];
      if (!q){ n.maintTarget = null; return; }
      if (q.job){ setStatus(n, `aspetto che la #${i+1} finisca`, '#b8f0b8'); doWork(n, 2, tryMaint); return; }
      setStatus(n, `manutenzione stampante #${i+1}`, '#b8f0b8');
      doWork(n, staffWork(6), ()=>{ q.wear = 0; q.maintRes = false; n.maintTarget = null; state.stats.maint = (state.stats.maint || 0) + 1; touchUI(); });
    };
    tryMaint();
  });
}
// pausa caffè quando lo staff è stanco
const COFFEE_STAND = {x:-10.45, z:-12.3, fx:-12, fz:-12.3};
function coffeeBreak(n){
  setStatus(n, 'pausa caffè ☕', '#ffe0b0');
  goTo(n, COFFEE_STAND, ()=>doWork(n, 5, ()=>{ state.staff[n.kind].energy = 1; }));
}


/* =====================================================================
   TELEFONO (tasto C), ALTALENA e CODICE END
   ===================================================================== */
function openPhone(){
  if (!started || paused || shiftOpen) return;
  if (modal){ closeModal(); return; }
  openModal('computer', null, renderComputer);
  modal.phone = true;
  $('#modalbox').classList.add('phone');
  rerender(); sfx('click');
}
// altalena: ci si siede con E, si dondola con W/S, si scende con E
function sitSwing(){
  SWING.rider = true; SWING.sat = 0; SWING.vel = .5;
  player.vy = 0; player.y = 0;
  player.rot = Math.PI;
  SWING.seat.add(steve);
  steve.position.set(0, -1.46, .02);
  steve.rotation.set(0, Math.PI, 0);
  toast('Sul dondolo: W e S per dondolare, E per scendere','good'); sfx('click');
}
function leaveSwing(){
  SWING.rider = false;
  scene.add(steve);                                   // torna nella scena, dritto in piedi
  steve.rotation.set(0, Math.PI/2, 0);
  hero.body.rotation.set(0, 0, 0); hero.torso.rotation.set(0, 0, 0);
  player.x = SWING.x + 1.9; player.z = SWING.z; player.rot = Math.PI/2; player.y = 0; player.vy = 0;
  steve.position.set(player.x, 0, player.z);
  if (SWING.sat > 10){
    state.energyUntil = Math.max(state.energyUntil, state.gt + 90);
    toast('😌 Riposato: ti senti carico per un po\'','good');
  }
  sfx('click');
}
function updateSwing(dt){
  const S = SWING;
  const pump = S.rider && !modal ? ((keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0)) : 0;
  if (S.rider){
    S.sat += dt;
    S.vel += -Math.sin(S.angle)*3.4*dt + pump*Math.sign(Math.cos(S.angle) || 1)*(Math.abs(S.angle) < .05 ? .8 : 1.4)*dt*Math.sign(S.vel || 1);
    S.vel *= 1 - .22*dt;
  } else {
    S.vel += -Math.sin(S.angle)*3.4*dt;
    S.vel *= 1 - .9*dt;
    if (Math.abs(S.angle) < .01 && Math.abs(S.vel) < .02){ S.angle = 0; S.vel = 0; }
  }
  S.angle = clamp(S.angle + S.vel*dt, -1.15, 1.15);
  S.seat.rotation.x = S.angle;
  if (S.rider){
    if (steve.parent !== S.seat){ S.seat.add(steve); steve.position.set(0, -1.46, .02); steve.rotation.set(0, Math.PI, 0); }
    S.seat.updateMatrixWorld();
    const p = new THREE.Vector3(0, -1.46, .02).applyMatrix4(S.seat.matrixWorld);
    player.x = p.x; player.z = p.z; player.y = 0;
    steve.visible = true;
    heroAmpReset();
  }
}
const heroAmpReset = () => { pv.x = pv.z = 0; };

/* ---------- codice END: gioco al massimo ---------- */
function endGameBoost(){
  // stampanti al completo
  while (state.printers.length < CONFIG.MAX_PRINTERS) state.printers.push({job:null, done:null, failed:null, model:'h2s'});
  state.printers.forEach(p=>{ p.model = 'h2s'; p.wear = 0; p.failed = null; });
  state.cheats.freeP = CONFIG.MAX_PRINTERS;
  // casse, potenziamenti e materiali
  while (state.chests.length < CONFIG.MAX_CHESTS) state.chests.push(new Array(CONFIG.CHEST_SLOTS).fill(null));
  state.upgrades = {speed:SPEED_COST.length, plate:PLATE_COST.length, boots:BOOTS_COST.length, ai:AI_COST.length,
    eject:EJECT_COST.length, aipc:1, fridge:1, belt:1, van:1, qa:1};
  for (const m of Object.keys(MATERIALS)) state.fil[m] = 100000;
  state.packs = {box:2000, wrap:2000, tape:100};
  state.printerUnlocked = true;
  // studio completo
  for (const d of DECOR) state.office.items[d.id] = true;
  state.office.hidden = {};
  for (const k of Object.keys(OFFICE_WALLS)) state.office.walls[k] = true;
  for (const k of Object.keys(OFFICE_FLOORS)) state.office.floors[k] = true;
  // tutto lo staff
  for (const k of Object.keys(STAFF)) if (!STAFF[k].noCheat) hire(k, true);
  state.staff.lvl = STAFF_LVL_COST.length;
  // catalogo di 15 prodotti con prezzi che raddoppiano: più caro = meno richiesto
  state.project = null;
  if (blueprintObj){ scene.remove(blueprintObj.g); blueprintObj = null; }
  state.products = [];
  for (let k=0; k<15; k++){
    const d = projectDef(k);
    state.products.push({pid:k, name:d.name, fair:d.fair, price:40*Math.pow(2, k), sold:0, ch:allCh()});
  }
  state.ldm = Math.max(state.ldm, 5000000);
  state.earned = Math.max(state.earned, 2000000);
  buildDynamic(); applyOffice(); rebuildInteractables(); touchUI(); save();
  toast('🏁 Tutto al massimo: 50 stampanti, staff completo, studio arredato e 15 prodotti a catalogo','big');
}


/* =====================================================================
   PIANI DELLA FARM, ASCENSORE E AMMINISTRATORE DELEGATO
   ===================================================================== */
const PRIVATE_GOAL = 50000000;
const CEO_COST = STAFF.ceo.cost;
const hasCeo = () => !!(state.staff.ceo && state.staff.ceo.hired);
// stipendio di Luca: una quota degli utili dell'azienda, versata nel suo conto privato
function ceoTick(){
  if (!hasCeo()) return;
  const profit = Math.max(0, state.today.rev - state.today.cost);
  const perSec = (300 + profit*.03) / 60;
  const pay = Math.min(state.ldm, perSec);
  state.ldm -= pay; state.private = (state.private || 0) + pay;
  state.stats.salary = (state.stats.salary || 0) + pay;
  if (state.private >= PRIVATE_GOAL && !state.won){
    state.won = true;
    openModal('win', null, renderWin);
    sfx('win');
  }
}
function useLift(){
  openModal('lift', null, renderLift); sfx('click');
}
function renderLift(){
  const n = floorsUsed();
  let h = `<h2>🛗 Ascensore</h2><div class="sub">La torre LDMprint ha ${MAX_FLOOR} piani di produzione da ${FLOOR_SIZE} stampanti e lo studio all'ultimo piano.</div><div class="floors">`;
  for (let k = MAX_FLOOR - 1; k >= 0; k--){
    const from = k*FLOOR_SIZE, cnt = clamp(state.printers.length - from, 0, FLOOR_SIZE);
    const busy = state.printers.slice(from, from + FLOOR_SIZE).filter(p=>p.job).length;
    const err = state.printers.slice(from, from + FLOOR_SIZE).filter(p=>p.failed).length;
    h += `<button class="mc-btn ${k === curFloor() ? 'go' : ''}" data-act="floor" data-arg="${k}">
      <b>Piano ${k+1}</b><small>${cnt ? `${cnt} stampanti · ${busy} in stampa${err ? ` · ${err} da pulire` : ''}` : 'ancora vuoto'}</small></button>`;
  }
  h += `</div><button class="mc-btn big ${onStudio() ? 'go' : ''}" data-act="floor" data-arg="studio">🏙️ Piano ${MAX_FLOOR+1} · Studio panoramico<small>un unico salone grande quanto un piano di produzione</small></button>
    <p class="hint">Le stampanti degli altri piani continuano a lavorare anche quando non sei lì.</p>`;
  return h;
}
// cerca il punto libero più vicino: niente uscite dentro un mobile o una stampante
function freeSpotNear(x, z){
  if (!blockedAt(x, z, .36)) return {x, z};
  for (let r = .6; r <= 6; r += .6) for (let a = 0; a < 16; a++){
    const t = a/16*Math.PI*2, nx = x + Math.cos(t)*r, nz = z + Math.sin(t)*r;
    if (!blockedAt(nx, nz, .36)) return {x:nx, z:nz};
  }
  return {x, z};
}
function goFloor(k){
  if (k === 'studio') k = STUDIO_FLOOR;
  k = clamp(+k, 0, STUDIO_FLOOR);
  if (k !== curFloor()){
    state.floor = k;
    buildDynamic();
    setSpriteText(officeRefs.floorSign, k === STUDIO_FLOOR ? 'STUDIO' : `PIANO ${k+1}`, '#7fd0ff');
    setSpriteText(officeRefs.liftSign, k === STUDIO_FLOOR ? 'Ascensore · studio' : `Ascensore · piano ${k+1}`, '#ffd23f');
    toast(k === STUDIO_FLOOR ? '🏙️ Studio panoramico: tutto il piano è il tuo ufficio' : `Piano ${k+1}`);
  }
  closeModal();
  rebuildColliders();
  const spot = freeSpotNear(LIFT.x + .45, LIFT.z - 1.75);      // esce sempre in un punto libero
  player.x = spot.x; player.z = spot.z;
  player.rot = Math.PI;
  save();
}

/* ---------- ritmo degli ordini: parte piano e cresce con i progressi ---------- */
const progress = () => Math.log10(1 + state.earned/150);
function orderPace(){
  const catalog = Math.min(6, state.products.length - 1) * .05;
  return clamp((.45 + .3*progress() + catalog) * state.flow, .3, 4);
}
function maxOrders(){ return Math.min(12, 3 + Math.floor(progress()*1.5) + Math.floor(state.printers.length/3)); }
// ogni 30 s: se il giocatore spedisce in fretta e senza arretrati il ritmo sale, se resta indietro scende
function paceTick(){
  const P = state.paceShip, cap = Math.max(1, capacityPerMin());
  const backlog = pendingOrders().reduce((a,o)=>a + o.qty, 0);
  const avgAge = P.n ? P.age / P.n : 0;
  if (backlog > cap*1.5 || state.orders.length >= maxOrders() || (P.n && avgAge > 300)) state.flow = Math.max(.6, state.flow * .9);
  else if (P.n && avgAge < 150 && backlog <= cap*.8) state.flow = Math.min(1.7, state.flow * 1.035);
  state.paceShip = {n:0, age:0};
}

let orderAcc = 0, saveAcc = 0, paceAcc = 0;
function gameTick(dt){
  state.stats.time += dt;
  state.gt += dt;
  updateDayNight(dt);
  orderAcc += dt;
  if (orderAcc >= 1){
    orderAcc -= 1;
    hoursTick();
    shiftTick();
    if (!isOpen()) closedTick();
    else if (!ordersFrozen()){
      orderTick();
      const tn = now();
      state.forceOrders = state.forceOrders.filter(f=>{
        if (tn < f.at) return true;
        const p = prod(f.pid); if (p) createOrder(p, 1, firstCh(p));
        return false;
      });
      expireOrders();
    } else {
      // codice TEMPO: ordini fermi, scadenze e attese congelate
      state.forceOrders.forEach(f=>{ f.at += 1000; });
      state.orders.forEach(o=>{ o.t += 1; if (o.urgent) o.deadline += 1; });
    }
    if (isOpen()){ paceAcc += 1; if (paceAcc >= 30){ paceAcc = 0; paceTick(); } }
    cheatTick();
    if (isOpen()) b2bTick();
    payBills();
    if (isOpen()) eventTick();
    if (staffOpen()) payWages();
    ceoTick();
    supplyTick();
    weatherTick();
    if (Math.floor(state.gt) % 60 === 0) marketTick();
    if (state.orders.some(o=>o.urgent)) touchUI();
    checkUnlocks();
  }
  if (labelBusy && performance.now() - labelBusy.start >= labelBusy.dur) finishLabels();
  saveAcc += dt;
  if (saveAcc > 5){ saveAcc = 0; save(); }
}
let lastT = performance.now();
const camT = {x:0, y:0, z:0, init:false};
/* qualità adattiva: se il PC fatica, riduce risoluzione e poi ombre */
const perf = {acc:0, n:0, level:0};
function adaptQuality(raw){
  if (document.hidden || raw > 1) return;
  perf.acc += raw; perf.n++;
  if (perf.acc < 4) return;
  const fps = perf.n / perf.acc; perf.acc = 0; perf.n = 0;
  if (fps >= 28 || perf.level >= 3) return;
  perf.level++;
  if (perf.level === 1){ mirror.scale = .35; if (renderer.getPixelRatio() > 1) renderer.setPixelRatio(1); }
  else if (perf.level === 2){ renderer.shadowMap.enabled = false; scene.traverse(o=>{ if (o.material) [].concat(o.material).forEach(m=>m.needsUpdate = true); }); }
  else mirror.enabled = false;                       // ultima risorsa: niente riflessi
  renderer.setSize(innerWidth, innerHeight);
  resizeMirror();
}
function frame(tms){
  requestAnimationFrame(frame);
  const raw = Math.max(0, (tms - lastT)/1000);
  const dt = Math.min(.05, raw); lastT = tms;
  if (started) adaptQuality(raw);
  const t = tms/1000;
  const live = !(started && paused);
  updateAmbient(dt);
  updateNeon(dt);
  if (started && state && !paused){
    updatePlayer(dt);
    updatePrinters(t);
    updateStaff(dt);
    updateCat(dt);
    updateDog(dt);
    updatePlay(dt);
    updateDoor(dt);
    updateOffice(dt, t);
    updateBelt(dt);
    updateVan(dt);
    updateCustomers(dt);
    updateSwing(dt);
    gameTick(dt);
    updateInteract();
    updateHUD(dt);
    chestObjs.forEach(c=>{ const target = c.open ? -1.1 : 0; c.pivot.rotation.x += (target - c.pivot.rotation.x)*Math.min(1,dt*12); });
  } else if (!started) {
    yaw += dt*.08;
  }
  if (blueprintObj && live){ blueprintObj.paper.rotation.y = t*1.6; blueprintObj.paper.position.y = 1.2 + Math.sin(t*2)*.12; }
  if (beacon.visible && live) beacon.userData.cone.position.y = 3 + Math.sin(t*3)*.25;
  if (ST.label.paper){
    const lp = ST.label.paper;
    if (labelBusy){ const k = (performance.now()-labelBusy.start)/labelBusy.dur; lp.position.z = .3 + ((k*3)%1)*.25; }
    else lp.position.z = .3;
  }
  if (live) clouds.forEach(c=>{ c.position.x += dt*.8; if (c.position.x > 120) c.position.x = -120; });
  if (!camT.init){ camT.x = player.x; camT.y = player.y + 1.45; camT.z = player.z; camT.init = true; }
  camT.x = damp(camT.x, player.x, 14, dt); camT.y = damp(camT.y, player.y + 1.45, 7, dt); camT.z = damp(camT.z, player.z, 14, dt);
  const tx = camT.x, ty = camT.y, tz = camT.z;
  const cdx = Math.sin(yaw)*Math.cos(pitch), cdy = Math.sin(pitch), cdz = Math.cos(yaw)*Math.cos(pitch);
  let want = dist;
  for (let s=.5; s<=dist; s+=.2){ if (camBlocked(tx+cdx*s, ty+cdy*s, tz+cdz*s)){ want = Math.max(1.1, s-.4); break; } }
  camDist = want < camDist ? want : camDist + (want-camDist)*Math.min(1, dt*4);
  camera.position.set(tx + cdx*camDist, ty + cdy*camDist, tz + cdz*camDist);
  steve.visible = camDist > 1.9 || SWING.rider;
  camera.lookAt(tx, ty, tz);
  if (state) applySky(tx, tz);
  else { sun.position.set(tx+22, 42, tz+14); sun.target.position.set(tx, 0, tz); }
  updateMirror();
  renderer.render(scene, camera);
}
