'use strict';
/* =====================================================================
   STATO DI GIOCO
   ===================================================================== */
const PLATE = [1,2,3,4,6,8];
const PLATE_COST = [2500,10000,40000,120000,300000];
const SPEED_COST = [300,1500,6000,20000,60000,150000];
const BOOTS_COST = [200,2000,10000,40000];
const AI_COST = [1500,6000,20000];
const FAIL_RATE = [.07,.04,.02,.008];          // probabilità di stampa fallita per livello del sensore AI

/* canali di vendita */
const CHANNELS = [
  {id:'etsy',   name:'Etsy',        color:'#e8590c', fee:.12, demand:1.25, perceive:1.15, qty:1.0, note:'Tanta domanda e clienti disposti a pagare di più. Commissione 12%.'},
  {id:'vinted', name:'Vinted',      color:'#0a9aa2', fee:.05, demand:.95,  perceive:.75,  qty:.5,  note:'Molti acquirenti ma cercano prezzi bassi. Ordini piccoli. Commissione 5%.'},
  {id:'subito', name:'Subito',      color:'#d63a2e', fee:0,   demand:.55,  perceive:.85,  qty:.4,  note:'Nessuna commissione, domanda locale bassa.'},
  {id:'site',   name:'ldmprint.it', color:'#c96a10', fee:.03, demand:.35,  perceive:1.0,  qty:1.7, note:'Ordini grandi. La domanda cresce con ogni ordine spedito dal sito. Commissione 3%.'},
];
const chById = id => CHANNELS.find(c=>c.id===id) || CHANNELS[3];
const allCh = () => Object.fromEntries(CHANNELS.map(c=>[c.id,true]));
const chip = id => { const c = chById(id); return `<span class="chip" style="background:${c.color}">${c.name}</span>`; };

/* eventi stagionali */
const EVENTS = [
  {id:'natale', name:'🎄 Picco di Natale',   desc:'domanda ×2,2 e ordini più grandi',            dur:150, d:2.2, q:1.3},
  {id:'black',  name:'🏷️ Black Friday',      desc:'domanda ×2,8 ma i clienti vogliono prezzi bassi', dur:120, d:2.8, perc:.8},
  {id:'mamma',  name:'💐 Festa della Mamma', desc:'domanda ×1,6',                                 dur:150, d:1.6},
  {id:'estate', name:'🏖️ Calo estivo',       desc:'la domanda si dimezza',                        dur:120, d:.5},
  {id:'fiera',  name:'🛠️ Fiera dei Maker',   desc:'ldmprint.it vende ×3 con ordini grandi',       dur:150, d:3, q:1.5, only:'site'},
  {id:'viral',  name:'📱 Video virale',      desc:'il prodotto più recente vende ×3',              dur:120, d:3, latest:true},
];
const evDef = id => EVENTS.find(e=>e.id===id);

/* recensioni */
const REVIEW_TXT = {
  5:['Spedizione velocissima, pezzo perfetto!','Stampa di qualità eccellente, consigliato.','Arrivato in un lampo, lo ricompro!'],
  4:['Bel prodotto, spedizione nella norma.','Buona qualità, arrivato in pochi giorni.'],
  3:['Carino, ma ci ha messo un po\' ad arrivare.','Discreto, spedizione lenta.'],
  2:['Spedizione molto lenta.','Pacco arrivato tardi e un po\' ammaccato.'],
  1:['Ordine urgente mai spedito, delusissimo.','Ordine annullato per ritardo.'],
};

/* dipendenti */
const STAFF = {
  op: {name:'Tony', job:'op', role:'Operatore stampanti', icon:'🧑‍🔧', cost:3000, wage:15,
    desc:'Ritira i pezzi finiti e li mette in cassa, pulisce le stampe fallite e fa ripartire tutte le stampanti, ognuna col prodotto assegnato dal piano di stampa.',
    look:{shirt:0x2f6fb5, pants:0x2d2f36, hair:0x17110c, skin:0xd29a74, shoe:0x6b4a2b, eye:0x3b2a1a, beard:.45, lite:true}, home:{x:14.3, z:-5.6}},
  ship: {name:'Natasha', job:'ship', fem:true, role:'Addetta spedizioni', icon:'📦', cost:8000, wage:30,
    desc:'Preleva dalle casse i pezzi per gli ordini, imballa, stampa le etichette e porta i pacchi all\'Ufficio Postale.',
    look:{shirt:0x2d2f36, pants:0x2c3e50, hair:0x9c3b1f, skin:0xf0c7a8, shoe:0xeeeeee, beard:0, lip:0xc2605a, eye:0x3f7a4a, longHair:true, lite:true}, home:{x:-9, z:3}},
  op2: {name:'Steve', job:'op', role:'Secondo operatore stampanti', icon:'🛠️', cost:15000, wage:40, needs:'op',
    desc:'Lavora in squadra con Tony: ritira, pulisce e fa ripartire le stampanti. In due le stampanti restano ferme molto meno.',
    look:{shirt:0x243a66, pants:0x3a3f47, hair:0xd9b46a, skin:0xe8b48e, shoe:0x2a2a2a, eye:0x3a6fb0, beard:.08, lite:true, build:1.06, height:1.03}, home:{x:13.8, z:-3.6}},
  ship2: {name:'Peter', job:'ship', role:'Secondo addetto spedizioni', icon:'🚚', cost:22000, wage:55, needs:'ship',
    desc:'Aiuta Natasha con prelievi, imballaggi, etichette e consegne: gli ordini partono molto più in fretta.',
    look:{shirt:0xb8322e, pants:0x34495e, hair:0x5a3a22, skin:0xe6b08a, shoe:0xf2f2f2, eye:0x5a3a22, beard:0, lite:true}, home:{x:-8.8, z:-2}},
  op3: {name:'Bruce', job:'op', role:'Operatore stampanti', icon:'🔧', cost:30000, wage:60, needs:'op2',
    desc:'Terzo operatore della farm: con più persone le 50 stampanti restano sempre in moto.',
    look:{shirt:0x4a6b3a, pants:0x2d2f36, hair:0x3b2a1a, skin:0xd8a27c, shoe:0x3a3a3a, eye:0x4a3520, beard:.35, lite:true}, home:{x:13.8, z:-7.6}},
  op4: {name:'Sam', job:'op', role:'Operatore stampanti', icon:'🔩', cost:45000, wage:80, needs:'op3',
    desc:'Quarto operatore: ritira, pulisce e fa ripartire le stampanti.',
    look:{shirt:0x2b4f7e, pants:0x3a3f47, hair:0x0e0a07, skin:0x8a5a3c, shoe:0x2a2a2a, eye:0x2a1a0e, beard:.2, lite:true}, home:{x:13.8, z:-2.8}},
  op5: {name:'Scott', job:'op', role:'Operatore stampanti', icon:'🧰', cost:65000, wage:100, needs:'op4',
    desc:'Quinto operatore: ideale quando la farm supera le 30 stampanti.',
    look:{shirt:0x7a2e2e, pants:0x34495e, hair:0x6b4a2a, skin:0xe8b48e, shoe:0x6b4a2b, eye:0x3a6fb0, beard:.15, lite:true}, home:{x:13.8, z:1}},
  op6: {name:'Hope', job:'op', fem:true, role:'Operatrice stampanti', icon:'🛠️', cost:90000, wage:120, needs:'op5',
    desc:'Sesta operatrice: con lei la farm da 50 stampanti gira a pieno ritmo.',
    look:{shirt:0x1f2a44, pants:0x2d2f36, hair:0x2a1a10, skin:0xf0c7a8, shoe:0xeeeeee, eye:0x3f7a4a, beard:0, longHair:true, lip:0xb05a55, lite:true}, home:{x:13.8, z:3}},
  ship3: {name:'Wanda', job:'ship', fem:true, role:'Addetta spedizioni', icon:'📮', cost:35000, wage:70, needs:'ship2',
    desc:'Terza addetta alle spedizioni: prelievi e pacchi ancora più veloci.',
    look:{shirt:0x8e2a3a, pants:0x2c3e50, hair:0x6a2a1a, skin:0xf0c7a8, shoe:0x2a2a2a, eye:0x3f7a4a, beard:0, longHair:true, lip:0xb05a55, lite:true}, home:{x:-8.8, z:6}},
  ship4: {name:'Carol', job:'ship', fem:true, role:'Addetta spedizioni', icon:'✈️', cost:55000, wage:90, needs:'ship3',
    desc:'Quarta addetta alle spedizioni: per i periodi di picco e i contratti aziendali.',
    look:{shirt:0x1d4fa3, pants:0x2d2f36, hair:0xd9b46a, skin:0xe8b48e, shoe:0xeeeeee, eye:0x3a6fb0, beard:0, longHair:true, lip:0xc2605a, lite:true}, home:{x:-8.8, z:-5}},
  tech: {name:'Happy', job:'tech', role:'Tecnico manutenzione', icon:'🔧', cost:20000, wage:45,
    desc:'Controlla l\'usura delle stampanti e le revisiona prima che si guastino: meno stampe fallite e meno pezzi difettosi.',
    look:{shirt:0x5b6470, pants:0x2d2f36, hair:0x2a1a10, skin:0xd8a27c, shoe:0x3a3a3a, eye:0x4a3520, beard:.3, lite:true}, home:{x:13.8, z:-6.5}},
  tech2: {name:'Rhodey', job:'tech', role:'Tecnico manutenzione', icon:'⚙️', cost:45000, wage:70, needs:'tech',
    desc:'Secondo tecnico: indispensabile con una farm grande.',
    look:{shirt:0x3a4a5a, pants:0x2c3e50, hair:0x0e0a07, skin:0x8a5a3c, shoe:0x2a2a2a, eye:0x2a1a0e, beard:.15, lite:true}, home:{x:13.8, z:-1}},
  ceo: {name:'Amministratore delegato', job:'ceo', role:'Guida l\'azienda al posto tuo', icon:'🎩', cost:10000000, wage:900, noCheat:true,
    desc:'Con lui al comando l\'azienda cammina da sola e tu passi a stipendio: ogni minuto una quota degli utili finisce sul tuo conto privato. La partita si vince quando il patrimonio di Luca arriva a 50 milioni di LDM.',
    look:{shirt:0x1b2330, pants:0x1b2330, hair:0x2a2a2a, skin:0xd8a27c, shoe:0x1a1a1a, eye:0x3a3a3a, beard:.2, lite:true, build:1.05}, home:{x:-7.6, z:-16.5}},
  mkt: {name:'Pepper', job:'mkt', fem:true, role:'Responsabile marketing', icon:'📣', cost:12000, wage:35,
    desc:'Lavora nell\'ufficio: social, pubblicità e clienti. Finché lavora arrivano il 25% di ordini in più.',
    look:{shirt:0x7d8ea3, pants:0x2d2f36, hair:0xc9864a, skin:0xf2cfb4, shoe:0x2a2a2a, eye:0x3a6fb0, beard:0, longHair:true, lip:0xc2605a, lite:true}, home:{x:-7.6, z:-15.2}},
};
const staffKeys = job => Object.keys(STAFF).filter(k=>STAFF[k].job === job);
const STAFF_LVL_COST = [2500, 9000, 30000];
// ogni dipendente resta nella zona del suo ruolo quando non ha lavoro
const STAFF_ZONE = {
  op:   {x0:13.9, x1:30.4, z0:-11.7, z1:8.6},   // corridoi della print farm
  mkt:  {x0:-10.8, x1:-5.2, z0:-18.4, z1:-12.6}, // ufficio
  ceo:  {x0:-19.5, x1:-13.5, z0:-18.4, z1:-12.6}, // studio panoramico
  ship: {x0:-10.3, x1:-7.2, z0:-6.5, z1:7.8},   // casse, tavolo imballaggio, etichette
};

let state = null;
let started = false;
let dirty = true;
const touchUI = () => { dirty = true; if (typeof invalidatePlan === 'function') invalidatePlan(); };
let printerObjs = [], chestObjs = [], blueprintObj = null, inter = [];
let labelBusy = null;
const player = {x:0, z:3, y:0, vy:0, rot:Math.PI, phase:0};
let yaw = 0, pitch = .5, dist = 9, camDist = 9;

function newState(){
  return {
    v:1, ldm:0, earned:0, products:[], project:null,
    printers:Array.from({length:CONFIG.START_PRINTERS}, ()=>({job:null, done:null})),
    chests:[new Array(CONFIG.CHEST_SLOTS).fill(null)],
    inv:new Array(CONFIG.INV_SLOTS).fill(null),
    orders:[], nextOrderId:1,
    upgrades:{speed:0, plate:0, boots:0, ai:0, aipc:0, fridge:0, eject:0, belt:0, van:0, qa:0}, energyUntil:0,
    belt:[], pickupQ:[], powerOff:false, debt:0, tod:9, dayN:1, shiftPromptAt:null, floor:0, private:0, won:false,
    packs:{box:60, wrap:60, tape:3}, autoPack:false, supply:[], supplyOut:null, nextOutage:600,
    qual:{good:0, bad:0}, market:{}, loans:[], tax:{due:0, paid:0}, today:{d:1, rev:0, cost:0}, week:{rev:0, cost:0}, weekN:1,
    days:[], months:[], overtime:false, weather:{kind:'sun', next:240}, lastInv:0,
    b2b:{offer:null, active:[], nextAt:480, done:0, failed:0},
    look:Object.assign({}, LUCA_LOOK),
    printerUnlocked:false, won:false,
    stats:{orders:0, pieces:0, time:0, fil:0, fees:0, wages:0, fails:0, scrap:0, maint:0, returns:0, prodRev:{}, ch:Object.fromEntries(CHANNELS.map(c=>[c.id,{o:0,r:0}]))},
    forceOrders:[], pos:{x:0, z:3},
    fil:{pla:3000, petg:1000, tpu:500, silk:500}, autoFil:false,
    proto:{job:null, done:null},
    gt:0, event:null, nextEvent:420, siteRep:0,
    reviews:[], lastReviews:[],
    cheats:{ldm:false, ldmNext:0, ldmBonusAt:-1e9, freezeUntil:0, saleUntil:0, cat:false, dog:false, freeP:0},
    flow:1, paceShip:{n:0, age:0}, lastOrderAt:0,
    office:{wall:'white', floor:'marble', walls:{white:true}, floors:{marble:true}, items:{}, hidden:{}},
    staff:Object.assign({lvl:0}, Object.fromEntries(Object.keys(STAFF).map(k=>[k,
      STAFF[k].job === 'op' ? {hired:false, on:true, carry:{}, energy:1} : STAFF[k].job === 'ship' ? {hired:false, on:true, job:null, energy:1} : {hired:false, on:true, energy:1}]))),
  };
}
function save(){
  if (!state) return;
  state.pos = {x:player.x, z:player.z};
  for (const k of Object.keys(npcs)) state.staff[k].pos = {x:npcs[k].x, z:npcs[k].z};
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e){}
}
function loadSave(){
  try { const r = localStorage.getItem(SAVE_KEY); if (!r) return null; const s = JSON.parse(r); if (!(s && s.v===1)) return null;
    return migrate(s); }
  catch(e){ return null; }
}
function migrate(s){
  const d = newState();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  for (const k of Object.keys(d.upgrades)) if (s.upgrades[k] === undefined) s.upgrades[k] = 0;
  for (const k of Object.keys(d.stats)) if (s.stats[k] === undefined) s.stats[k] = d.stats[k];
  for (const c of CHANNELS) if (!s.stats.ch[c.id]) s.stats.ch[c.id] = {o:0, r:0};
  for (const k of Object.keys(STAFF)) s.staff[k] = Object.assign({}, d.staff[k], s.staff[k]);
  s.cheats = Object.assign({}, d.cheats, s.cheats || {});
  if (typeof s.filament === 'number'){ s.fil = Object.assign({}, d.fil, s.fil || {}); s.fil.pla = s.filament; delete s.filament; }
  s.fil = Object.assign({}, d.fil, s.fil || {});
  s.proto = Object.assign({job:null, done:null}, s.proto || {});
  s.b2b = Object.assign({}, d.b2b, s.b2b || {});
  s.look = (s.look && s.look.v === 2) ? Object.assign({}, d.look, s.look) : Object.assign({}, d.look);   // aspetto di Luca
  s.pickupQ = (s.pickupQ || []).filter(id=>s.orders.some(o=>o.id===id));
  // pezzi senza colore (salvataggi precedenti) = colore originale
  const toSku = x => x < 1000 ? x + 1000 : x;
  const fixArr = arr => arr.forEach(it=>{ if (it && it.type === 'piece') it.pid = toSku(it.pid); });
  fixArr(s.inv); s.chests.forEach(fixArr);
  (s.belt || []).forEach(it=>{ it.pid = toSku(it.pid); });
  s.printers.forEach(p=>{
    if (p.done && p.done.kind === 'prod') p.done.pid = toSku(p.done.pid);
    if (p.job && p.job.kind === 'prod') p.job.pid = toSku(p.job.pid);
    p.maintRes = false;
  });
  for (const k of Object.keys(s.staff)){ const c = s.staff[k] && s.staff[k].carry; if (c) for (const key of Object.keys(c)){ const nk = toSku(Number(key)); if (nk !== Number(key)){ c[nk] = (c[nk] || 0) + c[key]; delete c[key]; } } if (s.staff[k] && typeof s.staff[k] === 'object' && s.staff[k].energy == null) s.staff[k].energy = 1; }
  s.orders.forEach(o=>{ if (!o.sku) o.sku = o.pid + 1000; });
  if (!s.today || s.today.d == null) s.today = {d:s.dayN || 1, rev:0, cost:0};
  s.packs = Object.assign({}, d.packs, s.packs || {});
  s.tax = Object.assign({}, d.tax, s.tax || {});
  s.qual = Object.assign({}, d.qual, s.qual || {});
  s.weather = Object.assign({}, d.weather, s.weather || {});
  s.orders.forEach(o=>{ if (o.status === 'van' && !s.pickupQ.includes(o.id)) s.pickupQ.push(o.id); });
  s.printers.forEach(p=>{ if (!p.model) p.model = 'p1s'; });
  s.office = Object.assign({}, d.office, s.office || {});
  if (s.nextEvent === 420 && s.stats.time > 0){ s.gt = s.stats.time; s.nextEvent = s.gt + 300; }
  while (s.printers.length < CONFIG.START_PRINTERS) s.printers.push({job:null, done:null});
  s.printers.forEach(p=>{ if (p.failed === undefined) p.failed = null; });
  s.products.forEach(p=>{ if (!p.ch) p.ch = allCh(); });
  s.orders.forEach(o=>{
    if (!o.ch) o.ch = 'site';
    if (o.t === undefined) o.t = s.gt;
    if (o.gross === undefined){ o.gross = o.reward; o.fee = 0; o.base = o.reward; }
    const owner = staffKeys('ship').find(k=>s.staff[k].job && s.staff[k].job.oids.includes(o.id));
    if (o.status === 'staff' && !owner){ o.status = 'pending'; delete o.stage; }
    if (owner) o.by = owner;
  });
  return s;
}
function clearSave(){ try { localStorage.removeItem(SAVE_KEY); } catch(e){} }

/* ---------- helper di dominio ---------- */
const prod = pid => state.products.find(p=>p.pid===pid % 1000);
const speedMult = () => Math.pow(.85, state.upgrades.speed);
const plateN = () => PLATE[state.upgrades.plate];
const modelOf = i => PRINTER_MODELS[(state.printers[i] && state.printers[i].model) || 'p1s'];
const printSecs = (d, model) => Math.round(CONFIG.PRINT_TIME * d.size * speedMult() * PRINTER_MODELS[model || 'p1s'].speed);
const plateFor = i => Math.max(1, Math.round(plateN() * modelOf(i).plateMult));
const EJECT_CYCLES = [0, 3, 6, 12], EJECT_COST = [5000, 20000, 80000];
const secsLeft = p => Math.max(0, Math.ceil((p.job.start + p.job.dur - now())/1000));
const capacityPerMin = () => state.printers.reduce((a,p,i)=>a + plateFor(i) / (CONFIG.PRINT_TIME/60 * speedMult() * modelOf(i).speed), 0);
const printerCostBase = () => Math.round(CONFIG.PRINTER_UNLOCK * Math.pow(1.09, Math.max(0, state.printers.length - CONFIG.START_PRINTERS - (state.cheats.freeP||0)))/10)*10;
const chestCost = () => Math.round(400 * Math.pow(1.35, state.chests.length-1) / 10) * 10;
const pendingOrders = () => state.orders.filter(o=>o.status==='pending');
const pendingQty = pid => pendingOrders().filter(o=>o.pid===pid).reduce((a,o)=>a+o.qty,0);
function demandFactor(fair, price){ return clamp(Math.pow(fair/Math.max(1,price), 2.2), .03, 3); }
const gramsOf = pid => Math.min(1500, Math.max(4, Math.round(projectDef(pid).fair * CONFIG.GRAMS_PER_LDM)));
const matOf = pid => projectDef(pid).mat || 'pla';
const matName = pid => MATERIALS[matOf(pid)].name;
const matCost = pid => gramsOf(pid) * MATERIALS[matOf(pid)].price / 1000;
const hasFil = (pid, g) => state.fil[matOf(pid)] >= g;
const totalFil = () => Object.values(state.fil).reduce((a,b)=>a+b, 0);
const kgFmt = g => (g/1000).toLocaleString('it-IT',{minimumFractionDigits:1, maximumFractionDigits:1}) + ' kg';
const fmt1 = n => n.toLocaleString('it-IT',{maximumFractionDigits:1});
function repAvg(){ const r = state.reviews.slice(-20); return r.length ? r.reduce((a,b)=>a+b,0)/r.length : 0; }
function repMult(){ return state.reviews.length < 3 ? 1 : .55 + repAvg()*.13; }
const starStr = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5-Math.round(n));
function chDemand(c){ return c.id==='site' ? c.demand + Math.min(1.4, state.siteRep*.015) : c.demand; }
function firstCh(p){ const on = CHANNELS.filter(c=>p.ch[c.id]); return (on.sort((a,b)=>chDemand(b)-chDemand(a))[0] || CHANNELS[0]).id; }
function chestSpace(pid){ return state.chests.findIndex(c=>c.some(s=>!s || (s.pid===pid && s.n<CONFIG.STACK))); }
function demandLabel(df){ return df>=1.4?'altissima':df>=.9?'alta':df>=.5?'media':df>=.2?'bassa':'quasi nulla'; }

/* ---------- inventario ---------- */
// pid < 1000 = qualsiasi colore del prodotto; pid >= 1000 = uno sku preciso (prodotto + colore)
const pieceMatch = (s, pid) => s && s.type==='piece' && (pid < 1000 ? s.pid % 1000 === pid : s.pid === pid);
function invCount(pid, arr=state.inv){ return arr.reduce((a,s)=>a+(pieceMatch(s,pid)?s.n:0),0); }
function chestCount(pid){ return state.chests.reduce((a,c)=>a+invCount(pid,c),0); }
const stockTotal = pid => invCount(pid) + chestCount(pid);
function addPieces(pid, n, arr=state.inv){
  if (pid < 1000) pid += 1000;
  for (const s of arr) if (s && s.type==='piece' && s.pid===pid && s.n<CONFIG.STACK){ const k=Math.min(n,CONFIG.STACK-s.n); s.n+=k; n-=k; if(!n) return 0; }
  for (let i=0;i<arr.length && n>0;i++) if (!arr[i]){ const k=Math.min(n,CONFIG.STACK); arr[i]={type:'piece',pid,n:k}; n-=k; }
  return n;
}
function removePieces(pid, n, arr=state.inv){
  for (let i=arr.length-1;i>=0 && n>0;i--){ const s=arr[i]; if (pieceMatch(s, pid)){ const k=Math.min(n,s.n); s.n-=k; n-=k; if(!s.n) arr[i]=null; } }
  return n;
}
function addItem(item){ const i = state.inv.findIndex(s=>!s); if (i<0) return false; state.inv[i] = item; touchUI(); return true; }
function itemName(s){
  if (s.type==='piece') return skuName(s.pid);
  if (s.type==='proto') return 'Prototipo: ' + projectDef(s.tier).name;
  if (s.type==='blueprint') return 'Progetto: ' + projectDef(s.tier).name;
  return `Pacco ordine #${s.oid}${s.labeled?' (con etichetta)':' (senza etichetta)'}`;
}

/* ---------- icone pixel ---------- */
const iconCache = new Map();
function drawShape(g, shape, color){
  const s = 5;
  for (let y=0;y<6;y++) for (let x=0;x<6;x++){
    if (!shape[y*6+x]) continue;
    const px = 1+x*s, py = 1+y*s;
    g.fillStyle = color; g.fillRect(px,py,s,s);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(px,py+s-1,s,1); g.fillRect(px+s-1,py,1,s);
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(px,py,s-1,1);
  }
}
function iconFor(item){
  if (!item) return '';
  const key = item.type==='piece' ? 'p'+item.pid : item.type==='proto' ? 'x'+item.tier : item.type==='blueprint' ? 'b' : (item.labeled?'L':'E');
  if (iconCache.has(key)) return iconCache.get(key);
  const c = mkCanvas(32,32), g = c.getContext('2d');
  if (item.type==='piece' || item.type==='proto'){
    const tier = item.type==='piece' ? item.pid % 1000 : item.tier;
    drawShape(g, shapeOf(tier), item.type==='piece' ? colorHex(item.pid) : projectDef(tier).color);
    if (item.type==='proto'){ g.fillStyle='#ffd23f'; g.fillRect(20,0,12,12); g.fillStyle='#000'; g.fillRect(24,2,1,8); g.fillRect(24,2,4,1); g.fillRect(24,6,4,1); g.fillRect(27,2,1,5); }
  } else if (item.type==='blueprint'){
    g.fillStyle='#0f3a78'; g.fillRect(3,2,26,28); g.fillStyle='#1d5fbf'; g.fillRect(4,3,24,26);
    g.fillStyle='#bfe0ff'; g.fillRect(8,8,16,1); g.fillRect(8,8,1,12); g.fillRect(23,8,1,12); g.fillRect(8,19,16,1); g.fillRect(10,23,12,1); g.fillRect(10,26,8,1);
    g.fillStyle='#ffd23f'; g.fillRect(13,12,6,4);
  } else {
    g.fillStyle='#8a6532'; g.fillRect(2,7,28,20); g.fillStyle='#c79a5b'; g.fillRect(3,8,26,18);
    g.fillStyle='#8a6532'; for (let i=0;i<13;i++){ g.fillRect(3+i,8+Math.floor(i*.7),1,1); g.fillRect(28-i,8+Math.floor(i*.7),1,1); }
    if (logoImg.naturalWidth) g.drawImage(logoImg, 5, 12, 13, 11);
    if (item.labeled){ g.fillStyle='#fff'; g.fillRect(18,17,11,8); g.fillStyle='#000'; for (let x=19;x<28;x+=2) g.fillRect(x,18,1,4); g.fillStyle='#d63a2e'; g.fillRect(19,23,5,1); }
  }
  const url = c.toDataURL(); iconCache.set(key,url); return url;
}

/* ---------- audio ---------- */
let AC = null, muted = false;
function sfx(name){
  if (muted) return;
  try {
    if (!AC) AC = new (window.AudioContext||window.webkitAudioContext)();
    const seq = {pick:[[660,.06],[880,.08]], coin:[[988,.07],[1319,.16]], order:[[523,.08],[659,.08],[784,.12]],
      done:[[880,.09],[0,.05],[1175,.12]], door:[[260,.05],[330,.07]], err:[[170,.14]], click:[[520,.03]], win:[[523,.12],[659,.12],[784,.12],[1047,.35]], label:[[300,.05],[330,.05],[300,.05]]}[name];
    if (!seq) return;
    let t = AC.currentTime;
    for (const [f,d] of seq){
      if (f){
        const o = AC.createOscillator(), gn = AC.createGain();
        o.type = name==='err'||name==='label' ? 'square' : 'triangle'; o.frequency.value = f;
        gn.gain.setValueAtTime(.1,t); gn.gain.exponentialRampToValueAtTime(.001,t+d);
        o.connect(gn); gn.connect(AC.destination); o.start(t); o.stop(t+d+.02);
      }
      t += d;
    }
  } catch(e){}
}

/* ---------- toast ---------- */
function toast(msg, kind=''){
  const box = $('#toasts');
  const d = document.createElement('div'); d.className = 'toast ' + kind; d.textContent = msg;
  box.appendChild(d);
  setTimeout(()=>d.classList.add('out'), kind==='big'?5200:3300);
  setTimeout(()=>d.remove(), kind==='big'?5700:3800);
  while (box.children.length > 5) box.firstChild.remove();
}
