/* =====================================================================
   HUD
   ===================================================================== */
let hudTimer = 0, lastPrinterHTML = '', lastMoney = -1;
function renderHotbar(){
  $('#hotbar').innerHTML = state.inv.map(s=>`<div class="slot" title="${s?itemName(s):''}">${s?`<img src="${iconFor(s)}" alt="">${s.n>1?`<span class="n">${s.n}</span>`:''}`:''}</div>`).join('');
}
function renderOrdersHUD(){
  const os = state.orders;
  if (!os.length) return `<div class="empty">${state.products.length?'Nessun ordine al momento':'Pubblica un annuncio per ricevere ordini'}</div>`;
  const ST_ = {pending:['da preparare','st-p'], packed:['imballato','st-k'], labeled:['pronto da spedire','st-l'], staff:['','st-s'], van:['attende il furgone 🚐','st-l'], counter:['al bancone, arriva il cliente','st-l']};
  return os.map(o=>{
    const st = ST_[o.status] || ST_.pending;
    const lbl = o.status==='staff' ? `${(STAFF[o.by] || STAFF.ship).name}: ${o.stage||'al lavoro'}` : st[0];
    const late = o.urgent && state.gt > o.deadline;
    return `<div class="ho"><img src="${pieceIcon(o.sku)}" alt="">
      <div class="hb"><div>#${o.id} · ${o.qty}× ${skuName(o.sku)}${o.walkin ? ' 🧍' : ''}</div>
      <div>${chip(o.ch)} ${o.urgent ? (late ? '<span class="urg">scaduto</span> · ' : `<span class="urg">⏱ ${urgLeft(o)}</span> · `) : ''}<span class="${st[1]}">${lbl}</span> · <span class="gold">${fmt(late ? o.base : o.reward)}</span></div></div>
      ${o.status==='pending'?`<button class="decl" data-decl="${o.id}" title="Rifiuta l'ordine" aria-label="Rifiuta ordine ${o.id}">✕</button>`:''}</div>`;
  }).join('');
}
function urgLeft(o){ const t = Math.max(0, Math.ceil(o.deadline - state.gt)); return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`; }
function renderPrintersHUD(){
  const plan = printerPlan();
  if (state.printers.length > 10){
    const P = state.printers;
    const n = {job:P.filter(p=>p.job).length, done:P.filter(p=>p.done).length, err:P.filter(p=>p.failed).length};
    n.free = P.filter(p=>!p.job && !p.done && !p.failed).length;
    const alerts = P.map((p,i)=>p.failed ? `<div class="pc err"><span>#${i+1} spaghetti: pulisci!</span></div>` : '').filter(Boolean).slice(0,3).join('');
    return `<div class="hud-t">Stampanti · ${P.length}</div>
      <div class="pc"><i style="width:${(n.job/P.length*100).toFixed(0)}%"></i><span>In stampa</span><b>${n.job}</b></div>
      <div class="pc done"><span>Con pezzi da ritirare</span><b>${n.done}</b></div>
      <div class="pc idle"><span>Libere</span><b>${n.free}</b></div>
      ${n.err ? `<div class="pc err"><span>Stampe fallite</span><b>${n.err}</b></div>` : ''}${alerts}`;
  }
  return `<div class="hud-t">Stampanti</div>` + state.printers.map((p,i)=>{
    if (p.job){
      const pr = clamp((now()-p.job.start)/p.job.dur,0,1);
      return `<div class="pc ${p.done ? 'done' : ''}"><i style="width:${(pr*100).toFixed(0)}%"></i><span>#${i+1} ${p.job.kind==='proto'?'prototipo':projectDef(p.job.pid).name}${p.done ? ` +${p.done.count}` : ''}</span><b>${secsLeft(p)}s</b></div>`;
    }
    if (p.failed) return `<div class="pc err"><span>#${i+1} spaghetti: pulisci!</span></div>`;
    if (p.done) return `<div class="pc done"><span>#${i+1} pronta da ritirare</span></div>`;
    const pid = plan[i];
    return `<div class="pc idle"><span>#${i+1} libera${pid !== undefined ? ' · ' + projectDef(pid).name : ''}</span></div>`;
  }).join('');
}
function updateHUD(dt){
  if (state.ldm !== lastMoney){
    lastMoney = state.ldm;
    $('#ldm').textContent = fmt(state.ldm);
    const gCeo = hasCeo();
    $('#goalbar').style.width = (Math.min(1, gCeo ? state.private/PRIVATE_GOAL : state.ldm/CONFIG.GOAL)*100) + '%';
    const gTxt = gCeo ? `Patrimonio di Luca: ${fmt(Math.floor(state.private))} / 50.000.000 LDM` : 'Traguardo: 1.000.000.000 LDM';
    if ($('#goaltxt').textContent !== gTxt) $('#goaltxt').textContent = gTxt;
  }
  if (dirty){
    dirty = false;
    renderHotbar();
    $('#orderlist').innerHTML = renderOrdersHUD();
    updateHeld();
  }
  hudTimer -= dt;
  if (hudTimer <= 0){
    hudTimer = .25;
    const ph = renderPrintersHUD();
    if (ph !== lastPrinterHTML){ lastPrinterHTML = ph; $('#printers').innerHTML = ph; }
    objective = computeObjective();
    const dt0 = dayType(state.dayN), closeTxt = dt0 === 'sat' ? '13:00' : '18:30';
    const ct = `<span>${weatherIcon()} ${dateStrOf(state.dayN)} · ${clockStr()}${isNight() ? ' 🌙' : ''}</span>${isOpen() ? `<span class="open">aperto fino alle ${closeTxt}${inSales() ? ' · saldi' : ''}</span>` : `<span class="warn">🔒 chiuso${dt0 === 'holiday' ? ' (' + holidayOf(state.dayN) + ')' : dt0 === 'sun' ? ' (domenica)' : ''}${staffOpen() ? ' · straordinari' : ''}</span>`}<span>tasse da versare ${fmt(state.tax.due)} LDM</span><span class="${state.powerOff || state.debt > 1 ? 'warn' : ''}">spese −${fmt1(rentPerMin() + powerPerMin())} LDM/min${state.debt > 1 ? ` · debito ${fmt(state.debt)}` : ''}${state.powerOff ? ' ⚠️' : ''}</span>`, ce = $('#clocktxt');
    if (ce.innerHTML !== ct) ce.innerHTML = ct;
    const need = neededMats();
    const pk = `<span class="${packLow() ? 'low' : ''}" style="border-color:#c79d63">📦 ${Math.floor(state.packs.box)}</span>`;
    const ft = pk + Object.entries(MATERIALS).map(([m,M])=>`<span class="${need.includes(m) && state.fil[m] < 500 ? 'low' : ''}" style="border-color:${M.color}">${M.name} ${(state.fil[m]/1000).toLocaleString('it-IT',{maximumFractionDigits:1})}</span>`).join(''), fe = $('#filtxt');
    if (fe.innerHTML !== ft) fe.innerHTML = ft;
    updateShelf(totalFil());
    const ev = $('#event');
    if (state.event){
      const d = evDef(state.event.id), l = Math.max(0, Math.ceil(state.event.until - state.gt));
      const html = `<b>${d.name}<span class="et">${Math.floor(l/60)}:${String(l%60).padStart(2,'0')}</span></b>${d.desc}`;
      if (ev.innerHTML !== html) ev.innerHTML = html;
      ev.classList.remove('hidden');
    } else ev.classList.add('hidden');
    const tm = [];
    if (ordersFrozen()) tm.push(`<div class="tbadge fz">⏸ Ordini fermi <b>${mmss(state.cheats.freezeUntil - state.gt)}</b></div>`);
    for (const c of state.b2b.active) tm.push(`<div class="tbadge b2">📑 ${fmt(c.qty)}× ${projectDef(c.pid).name} <b>${mmss(c.deadline - state.gt)}</b></div>`);
    if (state.gt < state.energyUntil) tm.push(`<div class="tbadge en">⚡ Energia <b>${mmss(state.energyUntil - state.gt)}</b></div>`);
    if (saleOn()) tm.push(`<div class="tbadge sl">🏷️ Sconto 50% <b>${mmss(state.cheats.saleUntil - state.gt)}</b></div>`);
    const tmh = tm.join(''), te = $('#timers');
    if (te.innerHTML !== tmh) te.innerHTML = tmh;
    const rp = state.reviews.length ? `★ ${repAvg().toFixed(1)}` : '';
    if ($('#rep').textContent !== rp) $('#rep').textContent = rp;
    if ($('#objtxt').textContent !== objective.t) $('#objtxt').textContent = objective.t;
  }
  const pos = objective.pos, arrow = $('#arrow'), od = $('#objdist');
  if (pos){
    const dx = pos.x - player.x, dz = pos.z - player.z;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const ang = Math.atan2(dx*rx + dz*rz, dx*fx + dz*fz);
    arrow.style.visibility = 'visible';
    arrow.style.transform = `rotate(${ang}rad)`;
    const d = Math.hypot(dx,dz);
    od.textContent = d > 2.5 ? `${Math.round(d)} m` : 'qui';
    beacon.visible = d > 3;
    beacon.position.set(pos.x, 0, pos.z);
  } else {
    arrow.style.visibility = 'hidden'; od.textContent = ''; beacon.visible = false;
  }
}
let heldOn = false, drinkT = 0;
function canSound(){
  if (muted) return;
  try {
    if (!AC) AC = new (window.AudioContext||window.webkitAudioContext)();
    const t = AC.currentTime, len = .35, buf = AC.createBuffer(1, AC.sampleRate*len, AC.sampleRate), d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++){ const k = i/d.length; d[i] = (Math.random()*2-1) * Math.pow(1-k, 2.5) * (k < .03 ? k/.03 : 1); }
    const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    src.buffer = buf; f.type = 'highpass'; f.frequency.value = 2500; g.gain.value = .25;
    src.connect(f); f.connect(g); g.connect(AC.destination); src.start(t);
  } catch(e){}
}
function drinkEnergy(){
  state.energyUntil = state.gt + 30;
  state.stats.cans = (state.stats.cans || 0) + 1;
  drinkT = 1.8;
  canSound();
  toast('🥤 LDM Energy: corri più veloce per 30 secondi!','good');
  save();
}
function updateHeld(){
  const s = state.inv.find(x=>x);
  heldOn = !!s;
  if (!s) return;
  if (s.type==='blueprint'){ held.material = heldMats.blueprint; held.scale.set(1,1.3,.2); }
  else if (s.type==='pack'){ held.material = heldMats.pack; held.scale.set(1.5,1.1,1.2); }
  else {
    const tier = s.type==='piece' ? s.pid : s.tier;
    if (!heldMats['c'+tier]) heldMats['c'+tier] = L({color:new THREE.Color(s.type==='piece' ? colorHex(tier) : projectDef(tier).color)});
    held.material = heldMats['c'+tier]; held.scale.set(1,1,1);
  }
}

/* =====================================================================
   INPUT
   ===================================================================== */
addEventListener('keydown', e=>{
  const tag = e.target && e.target.tagName;
  if (tag==='INPUT'){ if (e.code==='Escape') closeModal(); return; }
  if (!started) return;
  if (shiftOpen) return;
  if (e.code==='KeyP' && !e.repeat){ setPaused(!paused); return; }
  if (paused){ if (e.code==='Escape') setPaused(false); else if (e.code==='KeyM' && !e.repeat) toggleAudio(); return; }
  if (e.code==='Escape'){ closeModal(); return; }
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code==='KeyE' && !e.repeat){
    if (modal) closeModal(); else if (SWING.rider) leaveSwing(); else if (nearest) interact(nearest);
    return;
  }
  if (e.code==='KeyG' && !e.repeat){ if (modal && modal.kind==='help') closeModal(); else if (!modal) openModal('help', null, renderHelp); return; }
  if (e.code==='KeyH' && !e.repeat && !modal){ startPlay(); return; }
  if (e.code==='KeyC' && !e.repeat){ openPhone(); return; }
  if (e.code==='KeyM' && !e.repeat){ toggleAudio(); return; }
  if (!modal) keys[e.code] = true;
});
addEventListener('keyup', e=>{ keys[e.code] = false; });
addEventListener('blur', ()=>{ for (const k in keys) keys[k] = false; });

/* ---------- pausa ---------- */
let paused = false, pausePerf = 0;
function toggleAudio(){
  muted = !muted;
  $('#pAudio').textContent = muted ? 'Audio: spento' : 'Audio: attivo';
  if (!paused) toast(muted ? 'Audio disattivato' : 'Audio attivo');
}
function setPaused(v, quiet){
  if (!started || v === paused) return;
  if (v){
    pausedAt = Date.now(); pausePerf = performance.now();
    closeModal();
    for (const k in keys) keys[k] = false;
    joy.x = joy.y = 0; joy.id = null; $('#joyk').style.transform = '';
    const t = Math.floor(state.stats.time);
    $('#pauseStats').innerHTML = `<span>👤 Luca</span><span>💰 ${fmt(state.ldm)} LDM</span><span>📦 ${fmt(state.stats.orders)} ordini</span><span>⏱ ${Math.floor(t/3600)}h ${Math.floor(t%3600/60)}m</span>`;
    $('#pAudio').textContent = muted ? 'Audio: spento' : 'Audio: attivo';
    $('#pSkip').classList.toggle('hidden', isOpen());
    $('#pSkip').textContent = dayType(state.dayN) === 'holiday' || dayType(state.dayN) === 'sun' ? '🌙 Salta il giorno di chiusura' : '🌙 Salta alla prossima apertura';
    paused = true;
    save();
    if (!quiet){ $('#pause').classList.remove('hidden'); $('#pResume').focus(); sfx('click'); }
  } else {
    const d = Date.now() - pausedAt, dp = performance.now() - pausePerf;
    [...state.printers, state.proto].forEach(p=>{ if (p.job){ p.job.start += d; if (p.job.failAt) p.job.failAt += d; } if (p.done && p.done.cool) p.done.cool += d; if (p.maint) p.maint.until += d; });
    state.forceOrders.forEach(f=>{ f.at += d; });
    if (labelBusy) labelBusy.start += dp;
    pausedAt = 0; paused = false; lastT = performance.now();
    $('#pause').classList.add('hidden');
    $('#savePanel').classList.add('hidden'); $('#pauseMain').classList.remove('hidden');
    touchUI(); save(); sfx('click');
  }
}
function backToMenu(){
  setPaused(false);
  save();
  started = false; closeModal();
  $('#hud').classList.add('hidden'); $('#touch').classList.add('hidden'); $('#prompt').classList.add('hidden');
  beacon.visible = false; steve.visible = true;
  $('#btnContinue').classList.remove('hidden');
  $('#savePanel').classList.add('hidden'); $('#pauseMain').classList.remove('hidden');
  $('#start').classList.remove('hidden');
}
$('#pausebtn').addEventListener('click', ()=>setPaused(!paused));
$('#pResume').addEventListener('click', ()=>setPaused(false));
$('#phonebtn').addEventListener('click', ()=>openPhone());
$('#pAudio').addEventListener('click', toggleAudio);
$('#pMenu').addEventListener('click', backToMenu);
$('#pSkip').addEventListener('click', ()=>{ skipToMorning(); save(); setPaused(false); });
$('#pause').addEventListener('pointerdown', e=>{ if (e.target.id==='pause') setPaused(false); });

let drag = null;
canvas.addEventListener('pointerdown', e=>{ drag = {x:e.clientX, y:e.clientY, id:e.pointerId}; try { canvas.setPointerCapture(e.pointerId); } catch(err){} });
canvas.addEventListener('pointermove', e=>{
  if (!drag || drag.id!==e.pointerId) return;
  yaw -= (e.clientX - drag.x) * .006;
  pitch = clamp(pitch + (e.clientY - drag.y) * .005, .12, 1.35);
  drag.x = e.clientX; drag.y = e.clientY;
});
const endDrag = e=>{ if (drag && drag.id===e.pointerId) drag = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', e=>{ dist = clamp(dist + e.deltaY*.01, 3.5, 20); e.preventDefault(); }, {passive:false});
canvas.addEventListener('contextmenu', e=>e.preventDefault());

// comandi touch
const joy = {x:0, y:0, id:null};
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
{
  const base = $('#joy'), knob = $('#joyk');
  const upd = e=>{
    const r = base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2);
    const l = Math.hypot(dx,dy), m = 44;
    if (l > m){ dx = dx/l*m; dy = dy/l*m; }
    joy.x = dx/m; joy.y = dy/m;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  base.addEventListener('pointerdown', e=>{ joy.id = e.pointerId; base.setPointerCapture(e.pointerId); upd(e); });
  base.addEventListener('pointermove', e=>{ if (joy.id===e.pointerId) upd(e); });
  const end = e=>{ if (joy.id===e.pointerId){ joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
  base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
  $('#tE').addEventListener('pointerdown', e=>{ e.preventDefault(); if (paused) return; if (modal) closeModal(); else if (nearest) interact(nearest); });
  $('#tJ').addEventListener('pointerdown', e=>{ e.preventDefault(); keys.Space = true; setTimeout(()=>keys.Space=false, 120); });
}
