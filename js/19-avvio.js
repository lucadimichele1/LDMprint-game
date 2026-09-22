/* =====================================================================
   AVVIO
   ===================================================================== */
function startGame(fresh, data){
  if (fresh){ clearSave(); state = null; }
  const loaded = data || (fresh ? null : loadSave());
  state = loaded || newState();
  labelBusy = null; modal = null; dirty = true; lastMoney = -1; lastPrinterHTML = '';
  if (state.pos){ player.x = state.pos.x; player.z = state.pos.z; } else { player.x = 0; player.z = 3; }
  player.y = 0; player.vy = 0; player.rot = Math.PI; yaw = 0; pitch = .5;
  colliders = staticCols.slice();
  buildDynamic();
  applyOffice();
  buildStaff();
  removeCat();
  removeDog();
  camT.init = false; pv.x = pv.z = 0;
  if (!state.project && !state.products.length) spawnProject(0);
  if (blockedAt(player.x, player.z, .32)){ player.x = 0; player.z = 3; }
  started = true;
  $('#start').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  if (isTouch) $('#touch').classList.remove('hidden');
  sfx('click');
  if (state.cheats.cat) spawnCat();
  if (state.cheats.dog) spawnDog();
  buildHero(heroLook());
  van.phase = 'away'; van.t = 15;
  lastSale = saleOn();
  if (!loaded){
    toast('Benvenuto in LDMprint! Segui la freccia arancione per trovare il primo progetto.','big');
    setTimeout(()=>{ if (started) toast('G = guida · trascina il mouse per girare la visuale'); }, 2500);
  } else toast(data ? 'Salvataggio caricato' : 'Partita caricata','good');
  $('#pMusic').textContent = musicOn ? 'Musica: attiva' : 'Musica: spenta';
  save();
}
{
  const has = !!loadSave();
  if (!has) $('#btnContinue').classList.add('hidden');
  $('#btnContinue').addEventListener('click', ()=>startGame(false));
  $('#btnNew').addEventListener('click', ()=>startGame(true));
  if (isTouch) $('.start-keys').textContent = 'Joystick per muoverti · E per interagire · trascina per ruotare la visuale';
}
onLogo(()=>{ iconCache.delete('L'); iconCache.delete('E'); if (state) touchUI(); });
addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', ()=>{ if (document.hidden) save(); });
requestAnimationFrame(frame);
