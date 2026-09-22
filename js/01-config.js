'use strict';
/* =====================================================================
   CONFIGURAZIONE — modifica questi valori per bilanciare il gioco
   ===================================================================== */
const CONFIG = {
  PRINT_TIME: 30,        // durata media di una stampa in secondi (tempo reale)
  STACK: 30,             // pezzi per casella
  CHEST_SLOTS: 24,       // caselle per cassa
  INV_SLOTS: 9,          // caselle dell'inventario (hotbar)
  GOAL: 1000000000,         // traguardo in LDM
  PRINTER_UNLOCK: 1000,  // LDM necessari per sbloccare l'acquisto di stampanti
  START_PRINTERS: 3,     // stampanti 3D all'inizio della partita
  UNLOCK_SOLD: 50,       // pezzi venduti per sbloccare un nuovo progetto
  STOCK_CAP: 200,        // oltre questa scorta un prodotto non viene più stampato
  FILAMENT_START: 3000,  // grammi di filamento PLA a inizio partita
  FILAMENT_KG: 100,      // prezzo di 1 kg di filamento in LDM
  GRAMS_PER_LDM: 0.3,    // grammi di materiale per ogni LDM di prezzo consigliato
  MAX_PRINTERS: 200,
  MAX_CHESTS: 20,
  WALK: 5.2,             // velocità di camminata
  WORLD: 52,             // limite del mondo
};
const SAVE_KEY = 'ldmcraft_save_v1';

/* ---------- utilità ---------- */
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => Math.floor(n).toLocaleString('it-IT');
let pausedAt = 0;                                   // >0 mentre il gioco è in pausa
const now = () => pausedAt || Date.now();
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const TR = mulberry32(4242);   // rng texture
const WR = mulberry32(777);    // rng mondo

/* ---------- catalogo progetti ---------- */
const PROJECTS = [
  ['Portachiavi LDM', 40, 0.8, '#ff7a1a', 'pla'],
  ['Supporto Smartphone', 60, 0.9, '#2ec4b6', 'petg'],
  ['Vaso Low-Poly', 90, 1.0, '#e84393', 'silk'],
  ['Organizer Scrivania', 130, 1.1, '#6c5ce7', 'pla'],
  ['Lampada Luna', 190, 1.0, '#f1f2f6', 'silk'],
  ['Drago Articolato', 270, 1.2, '#20bf6b', 'pla'],
  ['Scacchiera Completa', 380, 1.0, '#34495e', 'pla'],
  ['Casco Cosplay', 520, 1.1, '#eb3b5a', 'petg'],
  ['Plastico Architettonico', 720, 0.9, '#d1ccc0', 'pla'],
  ['Braccio Robotico', 1000, 1.0, '#fa8231', 'petg'],
  ['Telaio Drone FPV', 1400, 0.9, '#3867d6', 'tpu'],
  ['Statua da Collezione', 1900, 1.1, '#f7b731', 'silk'],
  ['Esoscheletro Mano', 2600, 1.0, '#8854d0', 'tpu'],
  ['Replica Motore V8', 3500, 1.0, '#a5b1c2', 'petg'],
];
// materiali: prezzo al kg in LDM
const MATERIALS = {
  pla:  {name:'PLA', price:100, color:'#ff8a1f'},
  petg: {name:'PETG', price:120, color:'#2ec4b6'},
  tpu:  {name:'TPU', price:180, color:'#e84393'},
  silk: {name:'Seta', price:150, color:'#f7b731'},
};
function projectDef(tier){
  tier = tier % 1000;                       // i codici colore (sku) condividono i dati del prodotto
  if (tier < PROJECTS.length){ const p = PROJECTS[tier]; return {name:p[0], fair:p[1], size:p[2], color:p[3], mat:p[4], big:p[1] >= 380, tier}; }
  const k = tier - PROJECTS.length + 1;
  const cols = ['#ff6b6b','#48dbfb','#feca57','#1dd1a1','#5f27cd','#ff9ff3'];
  return {name:`Progetto Custom #${k}`, fair:Math.round(3500*Math.pow(1.4,k)/10)*10, size:[1,0.9,1.1][k%3], color:cols[k%cols.length], mat:['pla','petg','silk','tpu'][k%4], big:true, tier};
}
const shapeCache = new Map();
function shapeOf(tier){
  if (shapeCache.has(tier)) return shapeCache.get(tier);
  const r = mulberry32(tier*9973+17); let g, c;
  do {
    g = new Array(36).fill(0);
    for (let y=0;y<6;y++) for (let x=0;x<3;x++){ const v = r()<0.47?1:0; g[y*6+x]=v; g[y*6+5-x]=v; }
    c = g.reduce((a,b)=>a+b,0);
  } while (c<10 || c>22);
  shapeCache.set(tier, g); return g;
}
