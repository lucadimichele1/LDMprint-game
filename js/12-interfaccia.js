/* =====================================================================
   MODALI
   ===================================================================== */
let modal = null;
let printAll = true;   // ricorda la scelta "stampa su tutte le stampanti libere"
const keys = {};
function openModal(kind, ref, render){
  modal = {kind, ref, render, tab:'project'};
  for (const k in keys) keys[k] = false;
  $('#modal').classList.remove('hidden');
  rerender();
  if (kind==='chest' && chestObjs[ref]) chestObjs[ref].open = 1;
}
function rerender(){
  if (!modal) return;
  const box = $('#modalbox');
  const st = box.scrollTop;
  box.innerHTML = `<button class="xbtn" data-close aria-label="Chiudi">✕</button>` + modal.render(modal.ref);
  box.scrollTop = st;
}
function closeModal(){
  $('#modalbox').classList.remove('phone');
  if (!modal) return;
  if (modal.kind==='chest' && chestObjs[modal.ref]) chestObjs[modal.ref].open = 0;
  modal = null;
  $('#modal').classList.add('hidden');
  $('#modalbox').innerHTML = '';
  save();
}
function slotHTML(s, attrs){
  return `<button class="slot" ${attrs} title="${s ? itemName(s) : 'Vuoto'}">${s ? `<img src="${iconFor(s)}" alt="">${s.n>1?`<span class="n">${s.n}</span>`:''}` : ''}</button>`;
}
const pieceIcon = pid => iconFor({type:'piece', pid});

/* ---------- computer ---------- */
function renderComputer(){
  const tab = modal.tab;
  const tabs = [['project','Progetto'],['listings','Annunci'],['shop','Negozio'],['contracts','Contratti' + (state.b2b.offer ? ' •' : '')],['finance','Finanze'],['staff','Staff'],['office','Studio'],['stats','Statistiche'],['help','Aiuto']];
  const ph = modal && modal.phone;
  let h = `<div class="pc-head${ph ? ' phone-head' : ''}"><span class="os"><img src="${LOGO_SRC}" alt="">LDM<span>print</span> ${ph ? 'Mobile' : 'OS'}</span><span class="bal">${ph ? clockStr() + ' 🔋 ' : ''}${fmt(state.ldm)} LDM</span></div>
    <div class="tabs">${tabs.map(([k,l])=>`<button class="tab ${k===tab?'on':''}" data-act="tab" data-arg="${k}">${l}</button>`).join('')}</div><div class="tabbody">`;
  h += tab==='project' ? renderProjectTab() : tab==='listings' ? renderListings() : tab==='shop' ? renderShop() : tab==='staff' ? renderStaff() : tab==='office' ? renderOffice() : tab==='contracts' ? renderContracts() : tab==='finance' ? renderFinance() : tab==='help' ? renderHelpTab() : renderStats();
  return h + '</div>';
}
function renderProjectTab(){
  const P = state.project;
  if (!P){
    const latest = state.products[state.products.length-1];
    const n = Math.min(latest.sold, CONFIG.UNLOCK_SOLD);
    return `<h3>Nessun progetto in lavorazione</h3>
      <p>Vendi ${CONFIG.UNLOCK_SOLD} pezzi di <b>${latest.name}</b> per sbloccare il prossimo progetto.</p>
      <div class="meter"><i style="width:${n/CONFIG.UNLOCK_SOLD*100}%"></i></div><div>${n} / ${CONFIG.UNLOCK_SOLD} venduti</div>`;
  }
  const d = projectDef(P.tier);
  switch (P.stage){
    case 'world': return state.upgrades.aipc ? renderAIGen(d)
      : `<h3>Progetto da trovare</h3><p>Il progetto <b>${d.name}</b> è da qualche parte nel mondo. Segui il faro blu e la freccia in alto.</p>
        <p class="hint">Con l'Upgrade AI del computer (scheda Negozio) potresti generarlo da qui senza cercarlo.</p>`;
    case 'held': return state.upgrades.aipc ? renderAIGen(d) : renderCAD(d);
    case 'designed': return `<h3>Modello pronto</h3><p>Il file di <b>${d.name}</b> è esportato. Vai alla stampante dei prototipi qui nell'ufficio e stampalo (circa ${printSecs(d,'h2s')} secondi, ${gramsOf(d.tier)} g di ${matName(d.tier)}).</p>
      <button class="mc-btn big go" data-act="protoprint">Invia il prototipo alla stampante dell'ufficio</button>`;
    case 'proto_printing': return `<h3>Prototipo in stampa</h3><p>Aspetta che la stampante finisca il prototipo di <b>${d.name}</b>, poi ritiralo.</p>`;
    case 'proto_ready': return `<h3>Prototipo pronto</h3><p>Ritira il prototipo di <b>${d.name}</b> dalla stampante e riportalo qui per le foto.</p>`;
    case 'proto_held': return renderPhotos(d);
    case 'photos': return renderPublish(d);
  }
  return '';
}
const AI_LINES = ['Analizzo le vendite e le tendenze…', 'Genero la forma con l\'AI…', 'Ottimizzo spessori e supporti…', 'Preparo il file per lo slicer…', 'Invio alla stampante…'];
function renderAIGen(d){
  const pct = modal.aiPct || 0;
  const line = AI_LINES[Math.min(AI_LINES.length-1, Math.floor(pct/100*AI_LINES.length))];
  return `<h3>🧠 Generatore AI: ${d.name}</h3>
    <div class="aigen">
      <div class="aiprev"><div class="grid g-ref">${shapeOf(d.tier).map((v,i)=>`<i style="${v && i < pct*.36 ? `background:${d.color}` : ''}"></i>`).join('')}</div></div>
      <div class="aitxt"><p>Il nuovo prodotto è sbloccato. L'AI lo progetta e lo manda subito in stampa come prototipo, senza cercarlo in giro né disegnarlo.</p>
      ${modal.aiBusy ? `<div class="meter"><i style="width:${pct}%"></i></div><div>${line} ${pct}%</div>`
        : `<button class="mc-btn big go" data-act="aigen">Genera e stampa con l'AI</button>`}</div>
    </div>`;
}
function aiFinish(P){
  const idx = state.inv.findIndex(s=>s && s.type==='blueprint');
  if (idx >= 0) state.inv[idx] = null;
  if (blueprintObj){ scene.remove(blueprintObj.g); blueprintObj = null; }
  P.stage = 'designed';
  const d = projectDef(P.tier);
  if (startProto(true)) toast(`🧠 Modello di ${d.name} generato e già in stampa sulla stampante dei prototipi`,'good');
  else toast(`🧠 Modello di ${d.name} generato. Avvia il prototipo appena la stampante dell'ufficio è libera.`,'good');
  sfx('done'); touchUI(); save();
}
function renderCAD(d){
  if (!modal.cad) modal.cad = new Array(36).fill(0);
  const shape = shapeOf(d.tier), cad = modal.cad;
  let match = 0; for (let i=0;i<36;i++) if (cad[i]===shape[i]) match++;
  const pct = Math.round(match/36*100);
  return `<h3>LDM CAD: ${d.name}</h3>
    <div class="cad">
      <div class="cad-ref">
        <div class="lbl">Schizzo di riferimento</div>
        <div class="grid g-ref">${shape.map(v=>`<i style="${v?`background:${d.color}`:''}"></i>`).join('')}</div>
        <div class="lbl">Corrispondenza ${pct}%</div>
        <div class="meter"><i style="width:${pct}%"></i></div>
      </div>
      <div class="grid g-cad">${cad.map((v,i)=>`<button class="${v?'on':''}" data-act="cad" data-arg="${i}" aria-label="Cella ${i+1}" style="${v?`background:${d.color}`:''}"></button>`).join('')}</div>
    </div>
    <p class="hint">Clicca le celle per aggiungere o togliere blocchi finché il modello non è uguale allo schizzo.</p>
    <button class="mc-btn big go" data-act="export" ${match===36?'':'disabled'}>Esporta file .STL</button>`;
}
function renderPhotos(d){
  const pct = modal.photoPct || 0, shots = Math.floor(pct/25);
  return `<h3>Foto prodotto: ${d.name}</h3>
    <p>Metti il prototipo nel set fotografico e carica le foto su ldmprint.it.</p>
    <div class="photos">${[0,1,2,3].map(i=>`<div class="ph ${i<shots?'on':''}">${i<shots?`<img src="${pieceIcon(d.tier)}" alt="">`:'📷'}</div>`).join('')}</div>
    <div class="meter"><i style="width:${pct}%"></i></div>
    <button class="mc-btn big go" data-act="photos" ${modal.photoBusy?'disabled':''}>${modal.photoBusy?'Caricamento in corso…':'Scatta e carica 4 foto'}</button>`;
}
function demandHTML(fair, price){
  const df = demandFactor(fair, price);
  return `<div class="meter dem"><i style="width:${Math.round(df/3*100)}%"></i></div>
    <div>Domanda prevista: <b>${demandLabel(df)}</b>. Prezzo alto = più guadagno per pezzo ma meno ordini.</div>`;
}
function marginHTML(pid, price){
  const mc = matCost(pid);
  return `Costo materiale: <b>${fmt1(mc)} LDM</b>/pezzo (${gramsOf(pid)} g) · Margine prima delle commissioni: <b>${fmt1(price - mc)} LDM</b>`;
}
function renderPublish(d){
  const price = modal.price ?? d.fair;
  if (!modal.ch) modal.ch = allCh();
  return `<h3>Pubblica l'annuncio</h3>
    <div class="pub"><img class="bigicon" src="${pieceIcon(d.tier)}" alt="">
      <div><div class="pname">${d.name}</div><div>Prezzo consigliato: <b>${fmt(d.fair)} LDM</b></div><div>Tempo di stampa: circa ${printSecs(d)} s per stampa</div></div></div>
    <div>Prezzo unitario: <b id="pricev">${fmt(price)}</b> LDM</div>
    <input type="range" id="price" min="1" max="${d.fair*4}" value="${price}" aria-label="Prezzo unitario">
    <div class="row" style="align-items:center">Oppure scrivi il prezzo: <input type="number" id="pricen" min="1" value="${price}"></div>
    <div id="demand">${demandHTML(d.fair, price)}</div>
    <div id="margin" class="hint">${marginHTML(d.tier, price)}</div>
    <h3>Dove vuoi vendere?</h3>
    <div class="chgrid">${CHANNELS.map(c=>`<label class="chcard"><input type="checkbox" data-pubch="${c.id}" ${modal.ch[c.id]?'checked':''}>
      <span>${chip(c.id)}<small>${c.note}</small></span></label>`).join('')}</div>
    <button class="mc-btn big go" data-act="publish">Pubblica l'annuncio</button>`;
}
function renderListings(){
  if (!state.products.length) return `<h3>Nessun annuncio</h3><p>Trova un progetto, disegnalo, stampa il prototipo e pubblicalo.</p>`;
  const last = state.products.length-1;
  return `<p class="hint">Prezzo e canali si cambiano quando vuoi e valgono per i nuovi ordini. Clic su un canale per attivarlo o spegnerlo. Le stampanti sono divise in parti uguali tra i prodotti (le rimanenti al più recente).</p>
  <table class="lst"><tr><th></th><th>Prodotto</th><th>Venduti</th><th>Scorte</th><th>Stampanti</th><th>Prezzo (LDM)</th><th>Canali</th></tr>
  ${state.products.map((p,i)=>`<tr>
    <td><img src="${pieceIcon(p.pid)}" alt=""></td>
    <td>${p.name}<br><small>consigliato ${fmt(p.fair)} · materiale ${fmt1(matCost(p.pid))}</small></td>
    <td>${p.sold}${i===last&&!state.project?`<small> / ${CONFIG.UNLOCK_SOLD}</small>`:''}</td>
    <td>${stockOf(p.pid)}<small>/${stockCap(p.pid)}</small>${isCapped(p.pid) ? '<br><small class="capped">scorta piena</small>' : ''}</td>
    <td>${printersFor(p.pid)}</td>
    <td><input type="number" min="1" value="${p.price}" data-price="${p.pid}" aria-label="Prezzo ${p.name}"> <button class="mc-btn sm" data-act="setprice" data-arg="${p.pid}">Salva</button></td>
    <td><div class="chips">${CHANNELS.map(c=>`<button class="chtog ${p.ch[c.id]?'on':''}" style="background:${c.color}" data-act="togch" data-arg="${p.pid}:${c.id}" title="${c.note}">${c.name}</button>`).join('')}</div>
      <small>concorrenza ${CHANNELS.filter(c=>p.ch[c.id]).map(c=>`${c.name} ${fmt(marketPrice(p.pid, c.id))}`).join(' · ')}</small></td></tr>`).join('')}</table>`;
}
function filamentHTML(){
  const need = neededMats();
  return Object.entries(MATERIALS).map(([m, M])=>{
    const uses = state.products.filter(p=>matOf(p.pid)===m).map(p=>p.name);
    return `<div class="matrow"><div class="fil-row"><span class="matname" style="border-color:${M.color}">${M.name}</span>
      <span>Scorta: <b>${kgFmt(state.fil[m])}</b> · ${M.price} LDM/kg</span>
      <small>${uses.length ? 'serve per: ' + uses.slice(-3).join(', ') : 'non ancora usato'}</small></div>
      <div class="meter"><i style="width:${Math.min(100, state.fil[m]/20000*100)}%;background:${M.color}"></i></div>
      ${state.supplyOut && state.supplyOut.mat === m ? `<div class="bad-t">⚠️ Esaurito dal fornitore ancora per ${mmss(state.supplyOut.until - state.gt)}: solo consegna express</div>` : ''}
      ${state.supply.filter(x=>x.kind==='fil' && x.item===m).map(x=>`<small>🚚 ${x.qty/1000} kg in arrivo tra ${mmss(x.at - state.gt)}${staffOpen() ? '' : ' (consegna in orario di apertura)'}</small>`).join(' ')}
      <div class="fil-row">${filPacks(m).map((p,i)=>`<button class="mc-btn ${state.ldm>=p.cost && need.includes(m)?'go':''}" data-act="fil" data-arg="${m}:${i}" ${state.ldm<p.cost?'disabled':''}>${p.kg} kg · ${fmt(p.cost)} LDM${p.tag}</button>`).join('')}
        <button class="mc-btn" data-act="filx" data-arg="${m}:0" title="Arriva subito, costa il 50% in più">⚡ 1 kg express · ${fmt(Math.round(filPacks(m)[0].cost*1.5))}</button></div></div>`;
  }).join('') + `<p class="hint">Gli ordini normali arrivano dopo 45 secondi (solo in orario di lavoro). Tieni una scorta minima: ogni tanto un materiale finisce dal fornitore.</p>
  <label class="chk"><input type="checkbox" id="autofil" ${state.autoFil?'checked':''}> Riordino automatico: ordina 5 kg dei materiali che servono quando scendono sotto 2 kg</label>`;
}
function packHTML(){
  return `<div class="packgrid">${Object.entries(PACK_ITEMS).map(([id, it])=>{
    const q = state.packs[id], low = q < it.per*10;
    return `<div class="packrow ${low ? 'low' : ''}"><b>${it.name}</b><span>${fmt1(q)} ${it.unit}</span>
      ${state.supply.filter(x=>x.kind==='pack' && x.item===id).map(x=>`<small>🚚 in arrivo tra ${mmss(x.at - state.gt)}</small>`).join('')}
      <button class="mc-btn ${state.ldm>=salePrice(it.cost)?'go':''}" data-act="buypack" data-arg="${id}">+${it.qty} ${it.unit} · ${fmt(salePrice(it.cost))} LDM</button>
      <button class="mc-btn" data-act="buypackx" data-arg="${id}" title="Arriva subito, +50%">⚡</button></div>`;
  }).join('')}</div>
  <p class="hint">Ogni ordine usa 1 scatola, 1 m di pluriball e un po' di nastro. Senza imballaggi non si può spedire.</p>
  <label class="chk"><input type="checkbox" id="autopack" ${state.autoPack?'checked':''}> Riordino automatico degli imballaggi</label>`;
}
function renderFilament(){
  return `<h2>Scaffale filamenti</h2>
    <div class="sub">Le stampanti prendono PLA, PETG, TPU e seta da qui, come dall'AMS. Ogni stampa consuma materiale, anche quelle che falliscono.</div>` + filamentHTML();
}
function renderShop(){
  return `<h3>Filamenti</h3>${filamentHTML()}<h3>Imballaggi</h3>${packHTML()}<h3>Macchine e potenziamenti</h3><div class="shop">${shopItems().map(it=>`<div class="card">
    <div class="ci">${it.icon}</div>
    <div class="cb"><b>${it.name}</b> <small>${it.level}</small><div class="cd">${it.desc}</div></div>
    <div>${it.maxed ? '<span class="max">MAX</span>' : it.locked ? `<small class="lock">🔒 ${it.lockMsg}</small>` : it.models ? it.models :
      `<button class="mc-btn ${state.ldm>=it.cost?'go':''}" data-act="buy" data-arg="${it.id}" ${state.ldm<it.cost?'disabled':''}>${fmt(it.cost)} LDM${saleOn()?' −50%':''}</button>`}</div>
  </div>`).join('')}</div>`;
}
/* ---------- studio personalizzabile ---------- */
const decorShown = id => !!(state.office.items[id] && !state.office.hidden[id]);
const FLOOR_COST = {marble:0, parquet:900, carpet:500};
function applyOffice(){
  const O = state.office;
  setOfficeWall(O.wall);
  setOfficeFloor(O.floor);
  for (const d of DECOR) d.obj.visible = decorShown(d.id);
  officeAnim.lampLight.intensity = decorShown('lamp') ? .9 : 0;
  officeRefs.aiGlow.visible = officeRefs.aiTag.visible = !!state.upgrades.aipc;
  fridgeObj.visible = !!state.upgrades.fridge;
  BELT.group.visible = !!state.upgrades.belt;
  pickupObj.visible = !!state.upgrades.van;
  qaObj.visible = !!state.upgrades.qa;
  rebuildInteractables();
  rebuildColliders();
}
function renderOffice(){
  const O = state.office, sale = saleOn() ? ' −50%' : '';
  const owned = Object.keys(O.items).length;
  const swatch = (kind, id, name, color, cost) => {
    const have = kind === 'wall' ? O.walls[id] : O.floors[id];
    const using = (kind === 'wall' ? O.wall : O.floor) === id;
    const price = salePrice(cost);
    const btn = using ? `<span class="inuse">In uso</span>`
      : have ? `<button class="mc-btn" data-act="ostyle" data-arg="${kind}:${id}">Usa</button>`
      : `<button class="mc-btn ${state.ldm>=price?'go':''}" data-act="ostyle" data-arg="${kind}:${id}" ${state.ldm<price?'disabled':''}>${fmt(price)} LDM${sale}</button>`;
    return `<div class="sw"><i style="background:${color}"></i><b>${name}</b>${btn}</div>`;
  };
  const floorColor = {marble:'linear-gradient(135deg,#f4f4f2,#cfd2d6)', parquet:'linear-gradient(90deg,#c08a52,#9a6a3c,#c99a62)', carpet:'#2f4f86'};
  return renderLookEditor() + `<p class="hint">Il tuo studio è oltre la porta scorrevole in fondo al laboratorio. Qui scegli colori, pavimento e addobbi (${owned}/${DECOR.length} acquistati).</p>
    <h3>Colore delle pareti</h3>
    <div class="swgrid">${Object.entries(OFFICE_WALLS).map(([id,w])=>swatch('wall', id, w.name, '#'+w.color.toString(16).padStart(6,'0'), w.cost)).join('')}</div>
    <h3>Pavimento</h3>
    <div class="swgrid">${Object.entries(OFFICE_FLOORS).map(([id,f])=>swatch('floor', id, f.name, floorColor[id], FLOOR_COST[id])).join('')}</div>
    <h3>Arredi e addobbi</h3>
    <div class="shop">${DECOR.map(d=>{
      const have = O.items[d.id], price = salePrice(d.cost);
      return `<div class="card"><div class="ci">${d.icon}</div><div class="cb"><b>${d.name}</b><div class="cd">${d.desc}</div></div>
        <div>${have
          ? `<button class="mc-btn" data-act="odecor" data-arg="${d.id}">${O.hidden[d.id] ? 'Mostra' : 'Nascondi'}</button>`
          : `<button class="mc-btn ${state.ldm>=price?'go':''}" data-act="odecor" data-arg="${d.id}" ${state.ldm<price?'disabled':''}>${fmt(price)} LDM${sale}</button>`}</div></div>`;
    }).join('')}</div>`;
}
function financeChart(){
  const days = [...state.days.slice(-13), Object.assign({}, state.today, {tax:state.today.rev*TAX_RATE, now:true})];
  const W = 560, H = 190, pad = 34, bw = (W - pad - 10) / days.length;
  const max = Math.max(1, ...days.map(d=>Math.max(d.rev, d.cost)));
  const y = v => H - 22 - (v/max)*(H - 40);
  let bars = '', line = '';
  days.forEach((d, i)=>{
    const x = pad + i*bw;
    bars += `<rect x="${x+3}" y="${y(d.rev)}" width="${bw/2-4}" height="${H-22-y(d.rev)}" fill="#3aa35a"><title>Incassi ${fmt(d.rev)}</title></rect>`;
    bars += `<rect x="${x+bw/2}" y="${y(d.cost)}" width="${bw/2-4}" height="${H-22-y(d.cost)}" fill="#d9534f"><title>Costi ${fmt(d.cost)}</title></rect>`;
    bars += `<text x="${x+bw/2}" y="${H-6}" font-size="11" text-anchor="middle" fill="#222">${d.now ? 'oggi' : dateOf(d.d).getUTCDate()}</text>`;
    const m = d.rev - d.cost - d.tax;
    line += `${i ? 'L' : 'M'}${x+bw/2} ${y(Math.max(0, m))} `;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Incassi, costi e margine degli ultimi giorni">
    <line x1="${pad}" y1="${H-22}" x2="${W-6}" y2="${H-22}" stroke="#555"/><text x="4" y="14" font-size="11" fill="#222">${fmt(max)}</text>
    ${bars}<path d="${line}" fill="none" stroke="#1d3f86" stroke-width="2.5"/></svg>
    <div class="legend"><span><i style="background:#3aa35a"></i>incassi</span><span><i style="background:#d9534f"></i>costi</span><span><i style="background:#1d3f86"></i>margine dopo le tasse</span></div>`;
}
function renderFinance(){
  const P = state.products;
  const rows = P.map(p=>{
    const rev = state.stats.prodRev[p.pid] || 0, mc = matCost(p.pid);
    const mk = CHANNELS.filter(c=>p.ch[c.id]).map(c=>`${c.name} ${fmt(marketPrice(p.pid, c.id))}`).join(' · ');
    return `<tr><td>${p.name}</td><td>${fmt(p.sold)}</td><td>${fmt(rev)}</td><td>${fmt(p.price)}</td><td>${fmt1(mc)}</td><td>${fmt1(p.price - mc)}</td><td><small>${mk}</small></td></tr>`;
  }).join('');
  const loans = state.loans.map(L=>`<div class="contract"><div>🏦 Prestito da ${fmt(L.amount)} LDM · resta da restituire <b>${fmt(L.left)}</b> · rata giornaliera ${fmt(L.inst)}</div></div>`).join('');
  return `<h3>Andamento degli ultimi giorni</h3>${financeChart()}
    <h3>Tasse</h3>
    <p>IVA e imposte da accantonare: il ${Math.round(TAX_RATE*100)}% di ogni incasso. Da versare lunedì: <b>${fmt(state.tax.due)} LDM</b> · già versate ${fmt(state.tax.paid)} LDM.${state.debt > 1 ? ` Debito: <b class="bad-t">${fmt(state.debt)} LDM</b>.` : ''}</p>
    ${state.months.length ? `<table class="lst"><tr><th>Periodo</th><th>Incassi</th><th>Costi</th><th>Tasse</th><th>Margine</th></tr>${state.months.slice().reverse().map(m=>`<tr><td>${m.label}</td><td>${fmt(m.rev)}</td><td>${fmt(m.cost)}</td><td>${fmt(m.tax)}</td><td>${fmt(m.rev - m.cost - m.tax)}</td></tr>`).join('')}</table>` : '<p class="hint">Il riepilogo settimanale compare dopo il primo lunedì.</p>'}
    <h3>Prodotti e prezzi della concorrenza</h3>
    <table class="lst"><tr><th>Prodotto</th><th>Venduti</th><th>Incasso</th><th>Tuo prezzo</th><th>Materiale</th><th>Margine</th><th>Concorrenza</th></tr>${rows}</table>
    <p class="hint">Se il tuo prezzo supera molto quello della concorrenza su un canale, lì gli ordini calano.${inSales() ? ' Periodo di saldi: i clienti si aspettano prezzi più bassi, ma comprano di più.' : ''}</p>
    <h3>Prestiti</h3>
    ${loans || '<p>Nessun prestito attivo.</p>'}
    <div class="fil-row">${LOAN_SIZES.map(a=>`<button class="mc-btn ${loanOk(a)?'go':''}" data-act="loan" data-arg="${a}" ${loanOk(a)?'':'disabled'}>${fmt(a)} LDM</button>`).join('')}</div>
    <p class="hint">Si restituisce il 112% in 10 rate, una ogni mattina. Importi più alti si sbloccano con i guadagni (massimo 2 prestiti).</p>`;
}
function renderStaff(){
  const lvl = state.staff.lvl;
  let h = `<p class="hint">I dipendenti lavorano da soli e prendono uno stipendio al minuto. Se finisci gli LDM smettono di lavorare. Con il tempo si stancano e vanno più piano: con la macchina del caffè nello studio fanno una pausa e si ricaricano. Ogni tanto qualcuno è in ferie o in malattia.</p>
    <div class="staff"><div class="av">🌙</div><div class="sb"><b>Straordinari</b><div class="sd">Lo staff resta fino alle 21:00 dopo la chiusura e finisce il lavoro arretrato (paga ×1,5). Gli ordini nuovi restano sospesi.</div></div>
      <div><button class="mc-btn ${state.overtime ? 'go' : ''}" data-act="overtime">${state.overtime ? 'Attivi' : 'Disattivati'}</button></div></div>`;
  for (const k of Object.keys(STAFF)){
    const d = STAFF[k], s = state.staff[k], n = npcs[k];
    const st = s.absentDay === state.dayN ? `assente oggi (${s.absentWhy || 'ferie'})` : n && n.away ? 'a casa (rientra alle 9:00)' : s.unpaid ? 'stipendio non pagato' : !s.on ? 'in pausa' : n ? n.status : 'al lavoro';
    h += `<div class="staff"><div class="av">${d.icon}</div><div class="sb"><b>${d.name}</b> · ${d.role}
      <div class="sd">${d.desc}</div>
      <div class="ss">Stipendio <b>${d.wage} LDM/min</b>${s.hired?` · adesso: <b>${st}</b>`:''}</div>
      ${s.hired ? `<div class="energy"><span>Energia</span><div class="meter"><i style="width:${Math.round((s.energy ?? 1)*100)}%;background:${(s.energy ?? 1) < .3 ? '#d9534f' : '#5cb85c'}"></i></div></div>` : ''}
      </div><div>${s.hired
        ? `<button class="mc-btn ${s.on?'':'go'}" data-act="staffon" data-arg="${k}">${s.on?'Metti in pausa':'Rimetti al lavoro'}</button>`
        : d.needs && !state.staff[d.needs].hired
          ? `<button class="mc-btn" disabled>Serve prima ${STAFF[d.needs].name}</button>`
          : `<button class="mc-btn ${state.ldm>=salePrice(d.cost)?'go':''}" data-act="hire" data-arg="${k}" ${state.ldm<salePrice(d.cost)?'disabled':''}>Assumi · ${fmt(salePrice(d.cost))} LDM${saleOn()?' −50%':''}</button>`}</div></div>`;
  }
  const maxed = lvl >= STAFF_LVL_COST.length, cost = salePrice(STAFF_LVL_COST[lvl] || 0);
  h += `<div class="card"><div class="ci">🎓</div><div class="cb"><b>Formazione staff</b> <small>liv. ${lvl}/${STAFF_LVL_COST.length}</small>
    <div class="cd">Dipendenti più veloci del 25% e lavoro al banco più rapido.</div></div>
    <div>${maxed ? '<span class="max">MAX</span>' : `<button class="mc-btn ${state.ldm>=cost?'go':''}" data-act="train" ${state.ldm<cost?'disabled':''}>${fmt(cost)} LDM</button>`}</div></div>`;
  return h;
}
function hire(k, free){
  const d = STAFF[k], s = state.staff[k];
  if (free && d.noCheat) return false;                    // l'amministratore delegato si paga, e basta
  const cost = free ? 0 : d.noCheat ? d.cost : salePrice(d.cost);
  if (s.hired || state.ldm < cost || (d.needs && !state.staff[d.needs].hired)){ if (!free) sfx('err'); return false; }
  state.ldm -= cost; s.hired = true; s.on = true; s.unpaid = false; s.pos = {x:0, z:11.5};
  npcs[k] = makeNpc(k);
  toast(`${d.name} è entrat${d.fem?'a':'o'} nel team LDMprint!`,'big');
  sfx('win'); touchUI(); save(); rerender();
  return true;
}
function renderStats(){
  const t = Math.floor(state.stats.time), hh = Math.floor(t/3600), mm = Math.floor(t%3600/60);
  return `<div class="stats">
    <span>Saldo</span><b>${fmt(state.ldm)} LDM</b>
    <span>Guadagno totale</span><b>${fmt(state.earned)} LDM</b>
    <span>Traguardo</span><b>${(Math.min(1,state.ldm/CONFIG.GOAL)*100).toFixed(2)}%</b>
    <span>Ordini spediti</span><b>${state.stats.orders}</b>
    <span>Pezzi venduti</span><b>${state.stats.pieces}</b>
    <span>Prodotti a catalogo</span><b>${state.products.length}</b>
    <span>Stampanti</span><b>${state.printers.length}</b>
    <span>Capacità</span><b>${capacityPerMin().toFixed(1)} pezzi/min</b>
    <span>Tempo di gioco</span><b>${hh}h ${mm}m</b>
    <span>Reputazione</span><b>${state.reviews.length ? `<span class="stars">${starStr(repAvg())}</span> ${repAvg().toFixed(1)} (${state.reviews.length})` : 'nessuna recensione'}</b>
    <span>Filamento comprato</span><b>${fmt(state.stats.fil)} LDM</b>
    <span>Commissioni pagate</span><b>${fmt(state.stats.fees)} LDM</b>
    <span>Stipendi pagati</span><b>${fmt(state.stats.wages)} LDM</b>
    <span>Stampe fallite</span><b>${state.stats.fails}</b>
    <span>Pezzi scartati al controllo</span><b>${state.stats.scrap || 0}</b>
    <span>Resi dei clienti</span><b>${state.stats.returns || 0} (difettosità ${(qualityRate()*100).toFixed(1)}%)</b>
    <span>Manutenzioni</span><b>${state.stats.maint || 0}</b>${state.lastInvReport ? `
    <span>Ultimo inventario</span><b>${dateStrOf(state.lastInvReport.day)}: ${state.lastInvReport.lost} pezzi persi</b>` : ''}
    <span>Lattine bevute</span><b>${state.stats.cans || 0}</b>
    <span>Affitto e bollette</span><b>${fmt(state.stats.bills || 0)} LDM</b>
    <span>Contratti aziendali</span><b>${state.b2b.done} (${fmt(state.stats.b2b || 0)} LDM)</b>
    <span>Giorno</span><b>${state.dayN} · ${clockStr()}</b>
    <span>Piani in uso</span><b>${floorsUsed()} di ${MAX_FLOOR} · ${fmt(state.printers.length)} stampanti</b>${hasCeo() ? `
    <span>Patrimonio privato di Luca</span><b>${fmt(state.private)} / ${fmt(PRIVATE_GOAL)} LDM</b>
    <span>Stipendi incassati</span><b>${fmt(state.stats.salary || 0)} LDM</b>` : ''}
    <span>Ritmo ordini</span><b>×${orderPace().toFixed(2)}</b>
  </div>
  <h3>Vendite per canale</h3>
  <table class="lst"><tr><th>Canale</th><th>Ordini</th><th>Incasso</th><th>Domanda</th></tr>
  ${CHANNELS.map(c=>{ const x = state.stats.ch[c.id]; return `<tr><td>${chip(c.id)}</td><td>${x.o}</td><td>${fmt(x.r)} LDM</td><td>×${chDemand(c).toFixed(2)}</td></tr>`; }).join('')}</table>
  ${state.lastReviews.length ? `<h3>Ultime recensioni</h3><div class="revs">${state.lastReviews.map(r=>`<div><span class="stars">${starStr(r.s)}</span> ${chip(r.ch)} ${r.txt}</div>`).join('')}</div>` : ''}
  <div class="row">${modal.confirmReset
    ? `<span>Cancellare tutti i progressi?</span><button class="mc-btn warn" data-act="resetok">Sì, ricomincia</button><button class="mc-btn" data-act="resetno">Annulla</button>`
    : `<button class="mc-btn warn" data-act="reset">Nuova partita</button>`}</div>`;
}

/* ---------- stampante ---------- */
function planHTML(plan, cur){
  const groups = state.products.map(p=>({p, idx:plan.map((x,k)=>x===p.pid ? k : -1).filter(k=>k>=0)})).filter(g=>g.idx.length);
  return `<h3>Piano di stampa</h3>
    <div class="plan">${groups.map(g=>`<div class="pg"><img src="${pieceIcon(g.p.pid)}" alt="">
      <span><b>${g.p.name}</b><small>${g.idx.length} stampant${g.idx.length===1?'e':'i'}: ${g.idx.map(k=>`<i class="${k===cur?'me':''}">#${k+1}</i>`).join(' ')}</small></span></div>`).join('')}</div>
    ${capList()}
    <p class="hint">Le stampanti sono divise in parti uguali tra i prodotti che hanno meno di ${CONFIG.STOCK_CAP} pezzi di scorta; quelle in più vanno al prodotto più recente.${state.products.length > state.printers.length ? ' I prodotti sono più delle stampanti: stampano solo i più recenti.' : ''}</p>`;
}
function capList(){
  const full = state.products.filter(p=>isCapped(p.pid));
  if (!full.length) return '';
  return `<div class="capbox">⏸ In pausa per scorta piena: ${full.map(p=>`<b>${p.name}</b> (${stockOf(p.pid)}/${stockCap(p.pid)})`).join(', ')}. Ripartono quando la scorta scende sotto il limite.</div>`;
}
function renderPrinter(i){
  const P = state.project;
  let h = `<h2>Stampante 3D #${i+1}</h2>`;
  const M = modelOf(i);
  const pw = state.printers[i], wr = Math.round(wearOf(pw)*100);
  h = `<h2>Stampante 3D #${i+1} · ${M.name}</h2><div class="sub">${M.desc} Tempo ×${M.speed} · pezzi per piatto ${plateFor(i)}${hasAms(i) ? ' · AMS: cambio colore rapido' : ' · senza AMS: cambio colore lento'}</div>
    <div class="wearrow"><span>Usura ${wr}%</span><div class="meter"><i style="width:${wr}%;background:${wr >= 60 ? '#d9534f' : wr >= 35 ? '#e8b923' : '#5cb85c'}"></i></div>
    <button class="mc-btn ${wr >= 35 ? 'go' : ''}" data-act="maint" data-arg="${i}" ${pw.job || pw.maint || wr < 5 ? 'disabled' : ''}>🔧 Manutenzione · 50 LDM · 20 s</button></div>
    <p class="hint">Con l'usura aumentano stampe fallite e pezzi difettosi. Il tecnico (scheda Staff) fa la manutenzione da solo.</p>`;
  if (P && P.stage==='designed') h += `<p class="hint">I prototipi si stampano con la stampante dedicata nell'ufficio.</p>`;
  if (state.products.length){
    const plan = printerPlan(), pid = plan[i];
    h += `<h3>Produzione: ${plateN()} ${plateN()>1?'pezzi':'pezzo'} per stampa</h3>`;
    if (pid === undefined){
      h += state.products.every(p=>isCapped(p.pid))
        ? `<p class="hint">Tutti i prodotti hanno la scorta piena (${CONFIG.STOCK_CAP} pezzi): la stampante aspetta che vengano venduti.</p>`
        : `<p class="hint">Questa stampante non ha un prodotto assegnato.</p>`;
    } else {
      const pr = prod(pid), d = projectDef(pid);
      h += `<div class="sub">Dedicata a <b>${pr.name}</b></div>
        <div class="plist"><button class="mc-btn prow" data-act="print" data-arg="${pid}">
        <img src="${pieceIcon(pid)}" alt=""><span>Stampa ${pr.name}</span>
        <small>~${printSecs(d, state.printers[i].model)} s · ${gramsOf(pid)*plateFor(i)} g ${matName(pid)} · scorte ${stockTotal(pid)} · da ordini ${pendingQty(pid)}</small></button></div>`;
    }
    const free = plan.map((x,k)=>k).filter(k=>{ const q = state.printers[k]; return plan[k] !== undefined && !q.job && !q.done && !q.failed; });
    if (free.length > 1) h += `<button class="mc-btn go" data-act="printall">Avvia tutte le stampanti libere col loro prodotto (${free.length})</button>`;
    h += planHTML(plan, i);
  }
  return h;
}

/* ---------- cassa ---------- */
function renderChest(ci){
  const ch = state.chests[ci];
  const tot = ch.reduce((a,s)=>a+(s?s.n:0),0);
  const hasPend = pendingOrders().length > 0;
  return `<h2>Cassa #${ci+1} · magazzino</h2>
    <div class="sub">${tot} / ${CONFIG.CHEST_SLOTS*CONFIG.STACK} pezzi. Clic: prendi la casella · Maiusc+clic: 10 · clic destro: 1</div>
    <div class="inv-grid chest">${ch.map((s,i)=>slotHTML(s,`data-act="ctake" data-arg="${i}"`)).join('')}</div>
    <div class="row">
      <button class="mc-btn go" data-act="cneed" ${hasPend?'':'disabled'}>Preleva per gli ordini</button>
      <button class="mc-btn" data-act="cdepall">Deposita tutti i pezzi</button>
    </div>
    <h3>Inventario <small>(clic su un pezzo per depositarlo)</small></h3>
    <div class="inv-grid inv">${state.inv.map((s,i)=>slotHTML(s,`data-act="cdep" data-arg="${i}"`)).join('')}</div>`;
}
function chestTake(ci, i, count){
  const ch = state.chests[ci], s = ch[i];
  if (!s) return;
  const k = Math.min(count, s.n);
  const left = addPieces(s.pid, k);
  const moved = k - left;
  if (!moved){ toast('Inventario pieno','bad'); sfx('err'); return; }
  s.n -= moved; if (!s.n) ch[i] = null;
  sfx('click'); touchUI(); rerender();
}
function chestDeposit(ci, i, quiet){
  const s = state.inv[i];
  if (!s) return;
  if (s.type!=='piece'){ if(!quiet){ toast('Nella cassa vanno solo i pezzi stampati','bad'); sfx('err'); } return; }
  const left = addPieces(s.pid, s.n, state.chests[ci]);
  if (left === s.n){ if(!quiet){ toast('Cassa piena: compra un\'altra cassa nel Negozio','bad'); sfx('err'); } return; }
  s.n = left; if (!s.n) state.inv[i] = null;
  if (!quiet) sfx('click');
  touchUI();
}
function chestTakeForOrders(ci){
  const ch = state.chests[ci], need = {};
  pendingOrders().forEach(o=>{ need[o.sku] = (need[o.sku]||0) + o.qty; });
  let taken = 0, full = false;
  for (const key of Object.keys(need)){
    const pid = Number(key);
    let want = need[key] - invCount(pid);
    for (let i=0;i<ch.length && want>0 && !full;i++){
      const s = ch[i];
      if (!s || s.pid!==pid) continue;
      const k = Math.min(want, s.n), left = addPieces(pid, k), moved = k-left;
      s.n -= moved; want -= moved; taken += moved;
      if (!s.n) ch[i] = null;
      if (left) full = true;
    }
  }
  if (taken) toast(`Prelevati ${taken} pezzi per gli ordini${full?' (inventario pieno)':''}`,'good');
  else toast(full?'Inventario pieno':'In questa cassa non ci sono pezzi utili per gli ordini aperti','bad');
  sfx(taken?'pick':'err'); touchUI(); rerender();
}

/* ---------- tavolo imballaggio ---------- */
function renderPacking(){
  const pend = pendingOrders();
  let h = `<h2>Tavolo imballaggio</h2><div class="sub">Servono i pezzi del colore giusto nell'inventario e gli imballaggi: ${Object.entries(PACK_ITEMS).map(([id,it])=>`${it.name.toLowerCase()} ${fmt1(state.packs[id])} ${it.unit}`).join(' · ')}.</div>`;
  if (!pend.length) return h + '<p>Nessun ordine da imballare. I nuovi ordini compaiono in alto a destra.</p>';
  h += `<div class="olist">${pend.map(o=>{
    const have = invCount(o.sku), ok = have>=o.qty && canPack(1);
    return `<div class="orow"><img src="${pieceIcon(o.sku)}" alt="">
      <div><b>#${o.id}</b> ${chip(o.ch)} ${o.urgent?`<span class="urg">⏱ ${urgLeft(o)}</span>`:''}${o.walkin ? ' <span class="walk">ritiro in sede</span>' : ''} · ${o.qty}× ${skuName(o.sku)} ${colorDot(o.sku)}<br><small class="${have>=o.qty?'good-t':'bad-t'}">In inventario: ${have} / ${o.qty}</small></div>
      <div class="rw">${fmt(o.reward)} LDM</div>
      <button class="mc-btn ${ok?'go':''}" data-act="pack" data-arg="${o.id}" ${ok?'':'disabled'}>Imballa</button></div>`;
  }).join('')}</div>
  <button class="mc-btn" data-act="packall">Imballa tutti quelli possibili</button>`;
  return h;
}

/* ---------- aiuto / vittoria ---------- */
function renderHelp(){
  return `<h2>Come si gioca</h2>
  <div class="keys">
    <kbd>W A S D</kbd><span>muoviti (anche con le frecce)</span>
    <kbd>Maiusc</kbd><span>corri</span>
    <kbd>Spazio</kbd><span>salta</span>
    <kbd>E</kbd><span>interagisci / chiudi finestra</span>
    <kbd>Mouse</kbd><span>trascina per ruotare la visuale, rotella per lo zoom</span>
    <kbd>C</kbd><span>telefono: tutte le schermate del computer, ovunque tu sia</span>
    <kbd>G</kbd><span>questa guida</span>
    <kbd>P</kbd><span>pausa</span>
    <kbd>M</kbd><span>audio on/off</span>
  </div>
  <h3>Il ciclo di LDMprint</h3>
  <ol class="cycle">
    <li>Trova il progetto seguendo il faro blu.</li>
    <li>Al computer disegnalo nel CAD.</li>
    <li>Stampa il prototipo, ritiralo e fotografalo al computer.</li>
    <li>Pubblica l'annuncio scegliendo il prezzo.</li>
    <li>Stampa i pezzi (circa 30 secondi a stampa) e mettili in cassa.</li>
    <li>Quando arriva un ordine: prendi i pezzi, imballali, stampa l'etichetta.</li>
    <li>Porta i pacchi all'Ufficio Postale e incassa gli LDM.</li>
  </ol>
  <h3>Da tenere d'occhio</h3>
  <ul class="cycle">
    <li><b>Piano di stampa</b>: le stampanti sono divise in parti uguali tra i prodotti, quelle in più vanno al prodotto più recente.</li>
    <li><b>Filamento</b>: ogni stampa consuma PLA. Compralo al computer o allo scaffale filamenti.</li>
    <li><b>Stampe fallite</b>: se una stampante fa gli spaghetti, vai lì e premi E per pulirla.</li>
    <li><b>Canali</b>: Etsy, Vinted, Subito e ldmprint.it hanno commissioni e clienti diversi.</li>
    <li><b>Recensioni</b>: spedire presto alza la reputazione e quindi gli ordini.</li>
    <li><b>Ordini urgenti ⏱</b>: pagano il 40% in più, ma vanno imballati prima della scadenza.</li>
    <li><b>Eventi</b>: Natale, Black Friday e altri cambiano la domanda per qualche minuto.</li>
    <li><b>Staff</b>: dalla scheda Staff del computer puoi assumere Tony, Natasha, Steve e Peter.</li>
    <li><b>Farm</b>: modelli di stampante diversi, espulsione automatica e nastro trasportatore si comprano nel Negozio.</li>
    <li><b>Materiali</b>: ogni prodotto usa PLA, PETG, TPU o seta; controlla le scorte.</li>
    <li><b>Contratti</b>: le aziende chiedono grandi quantità con una scadenza (scheda Contratti).</li>
    <li><b>Spese fisse</b>: affitto e corrente si pagano ogni minuto.</li>
    <li><b>Orari</b>: LDMprint è aperta dalle 9:00 alle 18:30; di sera gli ordini sono sospesi e lo staff torna a casa. Alle 17:30 si accendono i neon.</li>
    <li><b>Colori</b>: gli ordini chiedono un colore; le stampanti con AMS (P1S, H2S) cambiano colore più in fretta.</li>
    <li><b>Usura</b>: le stampanti si consumano; fai la manutenzione o assumi un tecnico. Il banco qualità scarta i pezzi difettosi ed evita i resi.</li>
    <li><b>Forniture</b>: filamenti e imballaggi arrivano dopo un po'; la consegna express è immediata ma costa di più.</li>
    <li><b>Calendario</b>: sabato si chiude alle 13:00, domenica e festivi è chiuso; a gennaio-febbraio e luglio-agosto ci sono i saldi.</li>
    <li><b>Ritiro in sede</b>: alcuni clienti di Subito passano a prendere il pacco al bancone vicino all'ingresso (niente etichetta).</li>
    <li><b>Finanze</b>: grafici, tasse settimanali, prezzi della concorrenza e prestiti nella scheda Finanze.</li>
    <li><b>Piani</b>: l'ascensore in fondo alla farm porta ai 10 piani da 100 stampanti e allo studio panoramico all'ultimo piano.</li>
    <li><b>Amministratore delegato</b>: costa 10 milioni di LDM e non si ottiene con nessun codice. Con lui l'azienda va da sola e tu prendi uno stipendio: si vince quando il patrimonio di Luca arriva a 50 milioni.</li>
    <li><b>Scorta massima</b>: un prodotto con ${CONFIG.STOCK_CAP} pezzi pronti non viene più stampato e le stampanti passano agli altri.</li>
    <li><b>Casse</b>: fino a 20, vicino all'imballaggio, all'ingresso della farm e dentro la farm.</li>
    <li><b>Prototipi</b>: si stampano solo con la stampante dell'ufficio.</li>
    <li><b>Salvataggi</b>: in pausa (P) usa “Salva con nome”; dal menu iniziale “Carica partita”.</li>
    <li><b>Studio</b>: il computer è nell'ufficio oltre la porta scorrevole; dalla scheda Studio compri addobbi, colori e pavimenti.</li>
  </ul>
  <p>Ogni ${CONFIG.UNLOCK_SOLD} pezzi venduti dell'ultimo prodotto si sblocca un nuovo progetto. A 1.000 LDM puoi comprare altre stampanti. Traguardo: 1.000.000 LDM. La partita si salva da sola.</p>
  <button class="mc-btn big go" data-close>Torna al gioco</button>`;
}
function renderWin(){
  const t = Math.floor(state.stats.time);
  if (hasCeo() && state.private >= PRIVATE_GOAL) return `<h2>🏆 50.000.000 LDM sul conto di Luca!</h2>
    <p>L'Amministratore delegato guida LDMprint, le ${fmt(state.printers.length)} stampanti lavorano da sole e tu vivi di rendita: il patrimonio personale di Luca ha superato i 50 milioni di LDM.</p>
    <div class="stats"><span>Patrimonio di Luca</span><b>${fmt(state.private)} LDM</b><span>Cassa aziendale</span><b>${fmt(state.ldm)} LDM</b>
    <span>Ordini spediti</span><b>${fmt(state.stats.orders)}</b><span>Giorni</span><b>${state.dayN}</b></div>
    <button class="mc-btn big go" data-close>Continua a giocare</button>`;
  return `<h2>🏆 1.000.000.000 LDM!</h2>
  <p>LDMprint è diventata un impero della stampa 3D.</p>
  <div class="stats">
    <span>Ordini spediti</span><b>${state.stats.orders}</b>
    <span>Pezzi venduti</span><b>${state.stats.pieces}</b>
    <span>Stampanti</span><b>${state.printers.length}</b>
    <span>Tempo</span><b>${Math.floor(t/3600)}h ${Math.floor(t%3600/60)}m</b>
  </div>
  <button class="mc-btn big go" data-close>Continua a giocare</button>`;
}

/* ---------- azioni dei pulsanti ---------- */
const ACT = {
  tab: a => { modal.tab = a; modal.confirmReset = false; sfx('click'); rerender(); if (a==='help') setTimeout(()=>{ const q = $('#helpq'); if (q) q.focus(); }, 30); },
  helpgo: () => submitCode(),
  code: a => runCode(a),
  floor: a => goFloor(a === 'studio' ? 'studio' : +a),
  look: a => { const [k, v] = a.split(':'); state.look[k] = v; buildHero(heroLook()); updateHeld(); sfx('click'); save(); rerender(); },
  b2bok: () => { const B = state.b2b, o = B.offer; if (!o || B.active.length >= 2) return; B.active.push(Object.assign({}, o, {deadline:state.gt + o.minutes*60})); B.offer = null; toast(`📑 Contratto accettato: ${fmt(o.qty)}× ${projectDef(o.pid).name} entro ${o.minutes} minuti`,'good'); sfx('coin'); save(); rerender(); },
  b2bno: () => { state.b2b.offer = null; sfx('click'); save(); rerender(); },
  b2bgo: a => deliverContract(+a),
  protoprint: () => { if (startProto(false)) rerender(); },
  aigen: () => {
    const P = state.project;
    if (!P || !state.upgrades.aipc || modal.aiBusy || !(P.stage === 'world' || P.stage === 'held')) return;
    const m = modal; m.aiBusy = true; m.aiPct = 0; sfx('click'); rerender();
    const iv = setInterval(()=>{
      if (paused) return;
      m.aiPct = Math.min(100, m.aiPct + 5);
      if (m.aiPct % 20 === 0) sfx('label');
      if (m.aiPct >= 100){
        clearInterval(iv); m.aiBusy = false; m.aiPct = 0;
        if (state.project === P && (P.stage === 'world' || P.stage === 'held')) aiFinish(P);
      }
      if (modal === m) rerender();
    }, 220);
  },
  ostyle: a => {
    const [kind, id] = a.split(':'), O = state.office;
    const own = kind === 'wall' ? O.walls : O.floors;
    if (!own[id]){
      const price = salePrice(kind === 'wall' ? OFFICE_WALLS[id].cost : FLOOR_COST[id]);
      if (state.ldm < price){ sfx('err'); return; }
      state.ldm -= price; own[id] = true;
      toast(`${kind === 'wall' ? 'Pareti' : 'Pavimento'}: ${kind === 'wall' ? OFFICE_WALLS[id].name : OFFICE_FLOORS[id].name}`, 'good'); sfx('coin');
    } else sfx('click');
    if (kind === 'wall') O.wall = id; else O.floor = id;
    applyOffice(); save(); rerender();
  },
  odecor: a => {
    const d = DECOR.find(x=>x.id===a), O = state.office; if (!d) return;
    if (!O.items[a]){
      const price = salePrice(d.cost);
      if (state.ldm < price){ sfx('err'); return; }
      state.ldm -= price; O.items[a] = true; delete O.hidden[a];
      toast(`${d.icon} ${d.name} aggiunto allo studio`, 'good'); sfx('coin');
    } else {
      if (O.hidden[a]) delete O.hidden[a]; else O.hidden[a] = true;
      sfx('click');
    }
    applyOffice();
    if (blockedAt(player.x, player.z, .32)){ player.x = ST.computer.x; player.z = ST.computer.z + 1.1; }
    save(); rerender();
  },
  cad: a => { const i = +a; modal.cad[i] = modal.cad[i] ? 0 : 1; sfx('click'); rerender(); },
  export: () => {
    const P = state.project; if (!P || P.stage!=='held') return;
    const idx = state.inv.findIndex(s=>s && s.type==='blueprint');
    if (idx>=0) state.inv[idx] = null;
    P.stage = 'designed'; modal.cad = null;
    toast(`Modello di ${projectDef(P.tier).name} esportato. Ora stampa il prototipo.`,'good');
    sfx('done'); touchUI(); save(); rerender();
  },
  photos: () => {
    if (modal.photoBusy) return;
    const P = state.project; if (!P || P.stage!=='proto_held') return;
    const m = modal; m.photoBusy = true; m.photoPct = 0; rerender();
    const iv = setInterval(()=>{
      if (paused) return;
      m.photoPct = Math.min(100, m.photoPct + 4);
      if (m.photoPct % 25 === 0) sfx('click');
      if (m.photoPct >= 100){
        clearInterval(iv);
        const idx = state.inv.findIndex(s=>s && s.type==='proto');
        if (idx>=0) state.inv[idx] = null;
        P.stage = 'photos'; m.photoBusy = false;
        toast('Foto caricate. Scegli il prezzo e pubblica l\'annuncio.','good');
        touchUI(); save();
      }
      if (modal === m) rerender();
    }, 90);
  },
  publish: () => {
    const P = state.project; if (!P || P.stage!=='photos') return;
    const d = projectDef(P.tier);
    const price = Math.max(1, Math.round(modal.price ?? d.fair));
    const ch = Object.assign(allCh(), modal.ch || {});
    if (!Object.values(ch).some(Boolean)){ toast('Scegli almeno un canale di vendita','bad'); sfx('err'); return; }
    state.products.push({pid:P.tier, name:d.name, fair:d.fair, price, sold:0, ch});
    state.project = null; modal.price = undefined; modal.ch = null;
    state.forceOrders.push({pid:P.tier, at:now()+25000});
    toast(`Annuncio pubblicato su ${CHANNELS.filter(c=>ch[c.id]).map(c=>c.name).join(', ')}: ${d.name} a ${fmt(price)} LDM`,'good');
    if (state.products.length > 1) setTimeout(()=>toast(`Nuovo piano di stampa: ${planSummary()}`), 900);
    if (state.products.length===1) setTimeout(()=>toast('Ora stampa i pezzi e mettili in una cassa: gli ordini arriveranno presto!','big'), 1200);
    sfx('coin'); rebuildInteractables(); touchUI(); save();
    modal.tab = 'listings'; rerender();
  },
  setprice: a => {
    const pid = +a, p = prod(pid), inp = document.querySelector(`[data-price="${pid}"]`);
    if (!p || !inp) return;
    p.price = Math.max(1, Math.round(+inp.value || 1));
    toast(`Nuovo prezzo di ${p.name}: ${fmt(p.price)} LDM`,'good'); sfx('click'); save(); rerender();
  },
  buy: a => buy(a),
  fil: a => { const [m, i] = a.split(':'); buyFil(m, +i); },
  filx: a => { const [m, i] = a.split(':'); buyFil(m, +i, false, true); },
  buypack: a => { const it = PACK_ITEMS[a]; if (it) orderSupply('pack', a, it.qty, salePrice(it.cost), false, false); },
  buypackx: a => { const it = PACK_ITEMS[a]; if (it) orderSupply('pack', a, it.qty, Math.round(salePrice(it.cost)*1.5), true, false); },
  maint: a => { startMaint(+a); rerender(); },
  loan: a => takeLoan(+a),
  overtime: () => { state.overtime = !state.overtime; toast(state.overtime ? 'Straordinari attivi: lo staff resta fino alle 21:00 (paga ×1,5)' : 'Straordinari disattivati'); sfx('click'); save(); rerender(); },
  buyp: a => buy('printer', a),
  hire: a => hire(a),
  staffon: a => { const st = state.staff[a]; st.on = !st.on; if (st.on) st.unpaid = false; toast(`${STAFF[a].name} ${st.on?'torna al lavoro':'è in pausa (finisce prima il lavoro in corso)'}`); sfx('click'); save(); rerender(); },
  train: () => {
    if (STAFF_LVL_COST[state.staff.lvl] === undefined) return;
    const c = salePrice(STAFF_LVL_COST[state.staff.lvl]);
    if (state.ldm < c){ sfx('err'); return; }
    state.ldm -= c; state.staff.lvl++; toast(`Formazione completata: staff livello ${state.staff.lvl}`,'good'); sfx('coin'); save(); rerender();
  },
  togch: a => {
    const [pid, ch] = a.split(':'); const p = prod(+pid); if (!p) return;
    p.ch[ch] = !p.ch[ch];
    if (!Object.values(p.ch).some(Boolean)){ p.ch[ch] = true; toast('Serve almeno un canale attivo','bad'); sfx('err'); return; }
    toast(`${p.name}: ${chById(ch).name} ${p.ch[ch]?'attivato':'disattivato'}`); sfx('click'); save(); rerender();
  },
  reset: () => { modal.confirmReset = true; rerender(); },
  resetno: () => { modal.confirmReset = false; rerender(); },
  resetok: () => { closeModal(); startGame(true); },
  print: a => {
    const i = modal.ref, P = state.project;
    if (a==='proto'){
      if (!P || P.stage!=='designed') return;
      if (!startPrint(i, 'proto', P.tier)) return;
      toast(`Stampante #${i+1}: prototipo in stampa`,'good');
    } else {
      const pid = +a;
      if (printerPlan()[i] !== pid) return;
      if (!startPrint(i, 'prod', pid, false)) return;
      toast(`Stampante #${i+1}: ${projectDef(pid).name} in stampa (−${gramsOf(pid)*plateFor(i)} g ${matName(pid)})`,'good');
    }
    sfx('click'); save(); closeModal();
  },
  printall: () => {
    const plan = printerPlan();
    let n = 0, g = 0, noFil = false;
    plan.forEach((pid, k)=>{
      const q = state.printers[k];
      if (pid === undefined || q.job || q.done || q.failed) return;
      if (startPrint(k, 'prod', pid, true)){ n++; g += gramsOf(pid)*q.job.count; } else noFil = true;
    });
    if (!n){ toast(state.powerOff ? 'Corrente staccata: paga il debito delle bollette' : noFil ? 'Filamento insufficiente: compralo al computer o allo scaffale filamenti' : 'Nessuna stampante libera','bad'); sfx('err'); return; }
    toast(`${n} stampanti avviate secondo il piano (−${fmt(g)} g di filamento)${noFil ? ' · per alcune manca il materiale' : ''}`,'good');
    sfx('click'); save(); closeModal();
  },
  ctake: (a,e) => chestTake(modal.ref, +a, e.shiftKey ? 10 : CONFIG.STACK),
  cdep: a => { chestDeposit(modal.ref, +a); rerender(); },
  cdepall: () => {
    const before = state.inv.filter(s=>s&&s.type==='piece').length;
    state.inv.forEach((s,i)=>chestDeposit(modal.ref, i, true));
    const after = state.inv.filter(s=>s&&s.type==='piece').length;
    if (before && after===before){ toast('Cassa piena','bad'); sfx('err'); }
    else if (before) sfx('pick');
    rerender();
  },
  cneed: () => chestTakeForOrders(modal.ref),
  pack: a => { packOrder(+a); rerender(); },
  packall: () => {
    let n = 0; pendingOrders().forEach(o=>{ if (packOrder(o.id, true)) n++; });
    toast(n ? `${n} ordin${n===1?'e imballato':'i imballati'}. Ora stampa le etichette.` : 'Nessun ordine imballabile con i pezzi che hai', n?'good':'bad');
    sfx(n?'pick':'err'); rerender();
  },
};
const MB = $('#modalbox');
MB.addEventListener('click', e=>{
  const c = e.target.closest('[data-close]');
  if (c){ closeModal(); return; }
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const fn = ACT[b.dataset.act];
  if (fn) fn(b.dataset.arg, e);
});
MB.addEventListener('contextmenu', e=>{
  e.preventDefault();
  const b = e.target.closest('[data-act="ctake"]');
  if (b && modal) chestTake(modal.ref, +b.dataset.arg, 1);
});
MB.addEventListener('input', e=>{
  const t = e.target;
  if ((t.id==='price' || t.id==='pricen') && state.project){
    const v = Math.max(1, Math.round(+t.value || 1));
    modal.price = v;
    const other = t.id==='price' ? $('#pricen') : $('#price');
    if (other) other.value = v;
    $('#pricev').textContent = fmt(v);
    $('#demand').innerHTML = demandHTML(projectDef(state.project.tier).fair, v);
    if ($('#margin')) $('#margin').innerHTML = marginHTML(state.project.tier, v);
  }
  if (t.id==='allp') printAll = t.checked;
  if (t.id==='autofil'){ state.autoFil = t.checked; save(); }
  if (t.id==='autopack'){ state.autoPack = t.checked; save(); }
  if (t.dataset && t.dataset.pubch && modal){ if (!modal.ch) modal.ch = allCh(); modal.ch[t.dataset.pubch] = t.checked; }
});
$('#modal').addEventListener('pointerdown', e=>{ if (e.target.id==='modal') closeModal(); });
$('#orderlist').addEventListener('click', e=>{
  const b = e.target.closest('[data-decl]');
  if (b) declineOrder(+b.dataset.decl);
});

/* ---------- interazione ---------- */
function interact(it){
  switch (it.kind){
    case 'blueprint': pickBlueprint(); break;
    case 'computer': openModal('computer', null, renderComputer); sfx('click'); break;
    case 'printer': usePrinter(it.ref); break;
    case 'chest': openModal('chest', it.ref, renderChest); sfx('click'); break;
    case 'pack': openModal('pack', null, renderPacking); sfx('click'); break;
    case 'label': useLabelPrinter(); break;
    case 'post': usePost(); break;
    case 'filament': openModal('filament', null, renderFilament); sfx('click'); break;
    case 'proto': useProto(); break;
    case 'hopper': useHopper(); break;
    case 'counter': useCounter(); break;
    case 'swing': sitSwing(); break;
    case 'lift': useLift(); break;
    case 'pickup': usePickup(); break;
    case 'fridge': drinkEnergy(); break;
  }
}
function promptFor(it){
  const E = '<b>[E]</b> ';
  switch (it.kind){
    case 'blueprint': return E + 'Raccogli il progetto';
    case 'computer': return E + 'Usa il computer';
    case 'proto': { const pr = state.proto;
      if (pr.done) return E + 'Ritira il prototipo';
      if (pr.job) return `Prototipo in stampa, ${secsLeft(pr)} s`;
      return state.project && state.project.stage === 'designed' ? E + 'Stampa il prototipo' : 'Stampante prototipi (libera)'; }
    case 'printer': {
      const p = state.printers[it.ref];
      if (p.failed) return E + `Pulisci la stampante #${it.ref+1} (stampa fallita)`;
      if (p.done) return E + (p.done.kind==='proto' ? 'Ritira il prototipo' : `Ritira ${p.done.count}× ${projectDef(p.done.pid).name}`);
      if (p.job) return `Stampante #${it.ref+1}: ${p.job.kind==='proto'?'prototipo':'stampa'} in corso, ${secsLeft(p)} s`;
      return E + `Avvia una stampa (stampante #${it.ref+1})`;
    }
    case 'chest': return E + `Apri la cassa #${it.ref+1}`;
    case 'pack': return E + 'Imballa gli ordini';
    case 'label': return labelBusy ? `Stampa etichette… ${Math.min(100,Math.round((performance.now()-labelBusy.start)/labelBusy.dur*100))}%` : E + 'Stampa le etichette di spedizione';
    case 'post': return E + 'Spedisci i pacchi';
    case 'filament': return E + `Scaffale filamenti · ${kgFmt(totalFil())}`;
    case 'fridge': return E + 'Prendi una lattina di LDM Energy';
    case 'hopper': return E + 'Metti i pezzi sul nastro';
    case 'swing': return E + 'Siediti sull\'altalena';
    case 'lift': return E + (onStudio() ? 'Ascensore · sei nello studio panoramico' : `Ascensore · sei al piano ${curFloor()+1}`);
    case 'counter': return E + `Lascia i pacchi per il ritiro in sede (${state.orders.filter(o=>o.status==='counter').length} in attesa)`;
    case 'pickup': return E + `Lascia i pacchi al corriere (${state.pickupQ.length} in attesa)`;
  }
  return '';
}
let nearest = null;
function updateInteract(){
  let best = null, bd = 1e9;
  const fx = Math.sin(player.rot), fz = Math.cos(player.rot);
  for (const it of inter){
    const dx = it.x-player.x, dz = it.z-player.z, d = Math.hypot(dx, dz);
    if (d >= it.r) continue;
    const facing = d > .01 ? (dx*fx + dz*fz)/d : 1;
    const score = d - facing*.9;
    if (score < bd){ bd = score; best = it; }
  }
  nearest = best;
  const pe = $('#prompt');
  if (best && !modal){
    const html = promptFor(best);
    if (pe.innerHTML !== html) pe.innerHTML = html;
    pe.classList.remove('hidden');
  } else pe.classList.add('hidden');
}

/* ---------- obiettivo guidato ---------- */
function chestWith(pid){ return state.chests.findIndex(c=>invCount(pid,c)>0); }
function chestFor(pid){
  const i = state.chests.findIndex(c=>c.some(s=>!s || (s.pid===pid && s.n<CONFIG.STACK)));
  return i<0 ? 0 : i;
}
const posOf = {
  computer: ()=>ST.computer, pack: ()=>ST.pack, label: ()=>ST.label, post: ()=>POST,
  printer: i=>slotOf(i), chest: i=>CHEST_SLOTS_POS[i], filament: ()=>ST.filament,
};
function computeObjective(){
  const P = state.project, inv = state.inv;
  if (P){
    const d = projectDef(P.tier);
    if (P.stage==='world' && state.upgrades.aipc) return {t:`Al computer: genera "${d.name}" con l'AI`, pos:posOf.computer()};
    if (P.stage==='world') return {t:`Trova il progetto "${d.name}"`, pos:P};
    if (P.stage==='held') return {t:'Porta il progetto al computer e disegnalo', pos:posOf.computer()};
    if (P.stage==='proto_held') return {t:'Al computer: fotografa il prototipo', pos:posOf.computer()};
    if (P.stage==='photos') return {t:'Al computer: pubblica l\'annuncio e scegli il prezzo', pos:posOf.computer()};
    if (P.stage==='proto_ready'){
      if (state.proto.done) return {t:'Ritira il prototipo nell\'ufficio', pos:PROTO_POS};
      const i = state.printers.findIndex(p=>p.done && p.done.kind==='proto'); if (i>=0) return {t:'Ritira il prototipo dalla stampante', pos:posOf.printer(i)};
    }
    if (P.stage==='designed') return {t:'Stampa il prototipo con la stampante dell\'ufficio', pos:PROTO_POS};
  }
  if (inv.some(s=>s && s.type==='pack' && (state.orders.find(o=>o.id===s.oid) || {}).walkin)) return {t:'Porta il pacco al bancone "Ritiro in sede"', pos:COUNTER};
  if (!canPack(1) && pendingOrders().length) return {t:'Imballaggi finiti: ordinali al computer', pos:posOf.computer()};
  const readyC = state.b2b.active.find(c=>chestCount(c.pid) >= c.qty);
  if (readyC) return {t:`Al computer: consegna il contratto per ${readyC.client}`, pos:posOf.computer()};
  if (inv.some(s=>s && s.type==='pack' && s.labeled)) return state.upgrades.van ? {t:'Lascia i pacchi allo scaffale del corriere', pos:PICKUP} : {t:'Porta i pacchi all\'Ufficio Postale', pos:posOf.post()};
  if (inv.some(s=>s && s.type==='pack')) return {t:'Stampa le etichette di spedizione', pos:posOf.label()};
  const pend = pendingOrders();
  const ready = pend.find(o=>invCount(o.pid)>=o.qty);
  if (ready) return {t:`Imballa l'ordine #${ready.id}`, pos:posOf.pack()};
  const fromChest = pend.find(o=>chestCount(o.pid)>0 && chestCount(o.pid)+invCount(o.pid)>=o.qty);
  if (fromChest){ const ci = chestWith(fromChest.pid); return {t:`Prendi ${fromChest.qty}× ${projectDef(fromChest.pid).name} dalla cassa #${ci+1}`, pos:posOf.chest(ci)}; }
  const failed = state.printers.findIndex(p=>p.failed);
  if (failed>=0) return {t:`Pulisci la stampante #${failed+1} (spaghetti!)`, pos:posOf.printer(failed)};
  const done = state.printers.findIndex(p=>p.done);
  if (done>=0) return {t:`Ritira i pezzi dalla stampante #${done+1}`, pos:posOf.printer(done)};
  const carried = inv.find(s=>s && s.type==='piece');
  if (carried && !pend.some(o=>o.pid===carried.pid)){ const ci = chestFor(carried.pid); return {t:`Deposita i pezzi nella cassa #${ci+1}`, pos:posOf.chest(ci)}; }
  const plan = printerPlan();
  const idle = state.printers.findIndex((p,k)=>!p.job && !p.done && !p.failed && plan[k] !== undefined);
  if (idle>=0 && !hasFil(plan[idle], gramsOf(plan[idle])*plateFor(idle))) return {t:`${matName(plan[idle])} finito: compralo al computer`, pos:posOf.computer()};
  if (idle>=0) return {t:`Stampa ${projectDef(plan[idle]).name} sulla stampante #${idle+1}`, pos:posOf.printer(idle)};
  if (state.products.length && state.products.every(p=>isCapped(p.pid)) && !state.orders.length) return {t:`Scorte piene (${CONFIG.STOCK_CAP} pezzi per prodotto): aspetta gli ordini o sblocca un nuovo prodotto`, pos:null};
  if (carried){ const ci = chestFor(carried.pid); return {t:`Deposita i pezzi nella cassa #${ci+1}`, pos:posOf.chest(ci)}; }
  if (P && P.stage==='proto_printing') return {t:'Il prototipo è in stampa: attendi', pos:null};
  if (pend.length) return {t:'Le stampanti lavorano: attendi i pezzi per gli ordini', pos:null};
  return {t:'Attendi nuovi ordini e stampa scorte in anticipo', pos:null};
}
let objective = {t:'', pos:null};
