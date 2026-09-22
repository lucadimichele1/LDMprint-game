/* =====================================================================
   LOOP
   ===================================================================== */
const pv = {x:0, z:0, turn:0};
function updatePlayer(dt){
  if (SWING.rider){
    animateHuman(hero, {phase:player.phase, speed:0, run:false, air:false, holding:false, working:false, sit:true, turn:0, dt});
    return;
  }
  let f = 0, r = 0;
  if (!modal){
    f = (keys.KeyW||keys.ArrowUp?1:0) - (keys.KeyS||keys.ArrowDown?1:0) - joy.y;
    r = (keys.KeyD||keys.ArrowRight?1:0) - (keys.KeyA||keys.ArrowLeft?1:0) + joy.x;
  }
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  let vx = fx*f + rx*r, vz = fz*f + rz*r;
  const len = Math.hypot(vx,vz);
  const moving = len > .08;
  if (len > 1){ vx /= len; vz /= len; }
  const run = (keys.ShiftLeft || keys.ShiftRight) && moving;
  const energy = state.gt < state.energyUntil;
  const sp = CONFIG.WALK * (1 + .2*state.upgrades.boots) * (run ? 1.6 : 1) * (energy ? 1.4 : 1);
  const tvx = moving ? vx*sp : 0, tvz = moving ? vz*sp : 0;
  // accelerazione e frenata graduali
  pv.x = damp(pv.x, tvx, moving ? 9 : 12, dt);
  pv.z = damp(pv.z, tvz, moving ? 9 : 12, dt);
  if (Math.abs(pv.x) < .01 && !moving) pv.x = 0;
  if (Math.abs(pv.z) < .01 && !moving) pv.z = 0;
  const steps = 3;
  for (let s=0;s<steps;s++){
    const dx = pv.x*dt/steps, dz = pv.z*dt/steps;
    if (!blockedAt(player.x+dx, player.z, .32)) player.x += dx; else pv.x *= .5;
    if (!blockedAt(player.x, player.z+dz, .32)) player.z += dz; else pv.z *= .5;
  }
  const speed = Math.hypot(pv.x, pv.z);
  let turn = 0;
  if (moving){
    const target = Math.atan2(tvx, tvz);
    const diff = ((target - player.rot + Math.PI*3) % (Math.PI*2)) - Math.PI;
    turn = diff * (1 - Math.exp(-dt*9));
    player.rot += turn;
  }
  pv.turn = damp(pv.turn, dt > 0 ? turn/dt : 0, 8, dt);
  player.phase += dt * speed * (run ? 1.25 : 1.5);
  if (keys.Space && player.y <= 0 && !modal){ player.vy = 6.2; }
  player.vy -= 20*dt; player.y += player.vy*dt;
  if (player.y < 0){ player.y = 0; player.vy = 0; }
  steve.position.set(player.x, player.y, player.z);
  steve.rotation.y = player.rot;
  drinkT = Math.max(0, drinkT - dt);
  heroCan.visible = drinkT > .15;
  animateHuman(hero, {phase:player.phase, speed, run:(run || energy) && speed > CONFIG.WALK*1.1, air:player.y > .02, holding:heldOn && !drinkT, working:false, drink:drinkT > 0, turn:pv.turn, dt});
}
function animatePrinterObj(o, p, t, tn, i){
  const K = o.kit, R = K.rest;
  const pid = (p.job || p.done || p.failed || {}).pid;
  if (pid !== undefined){
    if (o.lastColor !== pid){ o.lastColor = pid; const c = pid >= SKU ? colorHex(pid) : projectDef(pid).color; o.obj.material.color.set(c); o.spag.mat.color.set(c); }
    o.obj.visible = true;
  } else o.obj.visible = false;
  o.spag.sg.visible = !!p.failed;
  const bz = K.bed ? -.2 : 0, hz = K.bed ? -.08 : 0;
  if (p.failed){
    o.obj.scale.set(1, .3, 1);
    o.head.position.set(.15, K.bot + .43, hz); o.bar.position.set(o.bar.position.x, K.bot + .51, bz);
    o.led.material = (Math.floor(t*3)%2) ? MAT_LED_ERR : MAT.ledOff;
  } else if (p.job){
    const pr = clamp((tn - p.job.start)/p.job.dur, 0, 1);
    o.obj.scale.set(1, Math.max(.03, pr), 1);
    const hy = K.bot + K.range*pr + .14;
    if (K.bed){
      o.head.position.set(Math.sin(t*6.1+i)*.22, hy + .02, hz);
      o.bar.position.set(o.bar.position.x, hy + .1, bz);
      o.bed.position.z = Math.cos(t*4.3+i)*K.bed.travel;
    } else {
      o.head.position.set(Math.sin(t*6.1+i)*.2, hy, Math.cos(t*4.3+i)*.2);
      o.bar.position.set(0, hy+.08, o.head.position.z);
    }
    o.led.material = MAT.ledBusy;
  } else {
    if (p.done) o.obj.scale.set(1,1,1);
    o.head.position.set(0, R.head, hz); o.bar.position.set(o.bar.position.x, R.bar, bz);
    if (o.bed) o.bed.position.z = 0;
    o.led.material = p.done ? MAT.ledDone : MAT.ledOff;
  }
}
function updatePrinters(t){
  const tn = now();
  const plan = printerPlan();
  const cap = EJECT_CYCLES[state.upgrades.eject];
  updateProto(t, tn);
  state.printers.forEach((p,i)=>{
    if (p.maint && tn >= p.maint.until){ p.maint = null; p.wear = 0; state.stats.maint = (state.stats.maint || 0) + 1; toast(`Stampante #${i+1}: manutenzione completata`,'good'); touchUI(); }
    if (p.job && p.job.failAt && tn >= p.job.failAt){
      p.failed = {pid:p.job.pid}; p.job = null; state.stats.fails++;
      toast(`Stampante #${i+1}: stampa fallita, spaghetti ovunque! Vai a pulirla.`,'bad'); sfx('err'); touchUI();
    }
    if (p.job && tn >= p.job.start + p.job.dur){
      const J = p.job;
      if (J.kind === 'prod') afterJob(i, J);
      const auto = J.kind === 'prod' && cap > 0 && (!p.done || p.done.pid === J.pid) && (p.done ? p.done.cycles || 1 : 0) < cap;
      if (J.kind === 'prod' && J.count <= 0){ p.job = null; touchUI(); }
      else if (auto){
        // espulsione automatica: il pezzo scende nel cassetto e la stampa riparte da sola
        p.done = {kind:'prod', pid:J.pid, count:(p.done ? p.done.count : 0) + J.count, cycles:(p.done ? p.done.cycles || 1 : 0) + 1};
        p.job = null;
        const next = plan[i];
        if (next === baseOf(J.pid) && !p.maintRes) startPrint(i, 'prod', J.pid, true, true);
        touchUI();
      } else {
        if (p.done && p.done.pid === J.pid && J.kind === 'prod') p.done.count += J.count;
        else p.done = {kind:J.kind, pid:J.pid, count:J.count, cycles:1};
        p.done.cool = now() + 4000;                              // il piatto deve raffreddarsi
        p.job = null;
        if (p.done.kind==='proto' && state.project) state.project.stage = 'proto_ready';
        if (state.printers.length <= 12) toast(`Stampante #${i+1}: stampa completata`,'good');
        sfx('done'); touchUI();
      }
    }
    const o = printerObjs[i]; if (!o) return;
    animatePrinterObj(o, p, t, tn, i);
    const nm = o.kit === PRINTER_KIT.p1s ? '' : ` ${modelOf(i).name}`;
    const pn = printerName(i);
    const worn = wearOf(p) >= .6 ? ' ⚠' : '';
    if (p.maint) setSpriteText(o.label, `${pn}${nm} manutenzione · ${Math.ceil((p.maint.until - tn)/1000)}s`, '#9be89b');
    else if (p.failed) setSpriteText(o.label, `${pn}${nm} ERRORE: pulisci il piatto!`, '#ff6b6b');
    else if (p.job){
      const left = state.printers.length > 12 ? Math.ceil(secsLeft(p)/5)*5 : secsLeft(p);
      setSpriteText(o.label, `${pn}${nm}${worn} ${p.job.kind==='proto'?'prototipo':skuName(p.job.pid)}${p.job.change ? ' (cambio colore)' : ''} · ${left}s${p.done ? ` · ${p.done.count} pronti` : ''}`, '#ffb347');
    }
    else if (p.done) setSpriteText(o.label, p.done.cool > tn ? `${pn}${nm} raffreddamento · ${Math.ceil((p.done.cool - tn)/1000)}s` : `#${i+1}${nm}${worn} pronta: ritira ${p.done.count}!`, '#7dff7d');
    else {
      const pp = plan[i];
      setSpriteText(o.label, pp !== undefined ? `#${i+1}${nm} libera · ${projectDef(pp).name}` : state.products.length ? `${pn}${nm} ferma · scorte piene` : `Stampante ${pn}${nm} · libera`, '#ffffff');
    }
  });
}
