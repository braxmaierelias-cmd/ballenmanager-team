
/* FarmManager V11 – Arbeitszeit + Live-Karte
   Ergänzt die bestehende app.js, ohne Login-/Auftragslogik zu ersetzen. */

let workSessions = [];
let liveLocations = [];
let fmWatchId = null;
let fmClockInterval = null;
let fmLocationRefreshInterval = null;
let fmMap = null;
let fmMapMarkers = [];

const fmOriginalLoad = load;
load = async function(){
  await fmOriginalLoad();
  await fmLoadFeatures();
};

const fmOriginalOrderCard = orderCard;
orderCard = function(o, done=false){
  let html = fmOriginalOrderCard(o, done);
  const sessions = workSessions.filter(s => +s.order_id === +o.id && s.status === 'completed');
  if(!sessions.length) return html;
  const seconds = sessions.reduce((sum, s) => sum + (+s.work_seconds || 0), 0);
  const rows = sessions.slice(0, 6).map(s => {
    const machine = machines.find(m => +m.id === +s.machine_id);
    const user = profiles.find(p => p.id === s.user_id);
    return `<span>${esc(user?.display_name || user?.email || 'Mitarbeiter')} · ${esc(s.work_type)}${machine ? ' · '+esc(machine.name) : ''} · ${fmDurationShort(+s.work_seconds||0)}</span>`;
  }).join('');
  const block = `<div class="order-worktime"><b>Arbeitszeit: ${fmDurationShort(seconds)}</b>${rows}</div>`;
  return html.replace(/<\/div>\s*$/, block + '</div>');
};

async function fmLoadFeatures(){
  if(!token || !me) return;
  try{
    workSessions = await select('work_sessions','select=*&order=started_at.desc&limit=300') || [];
    liveLocations = await select('live_locations','select=*&active=eq.true&order=updated_at.desc') || [];
    fmPopulateWorkSelectors();
    fmRenderWorkTime();
    fmRenderWorkHistory();
    renderOrders();
    if(document.getElementById('p-livekarte')?.classList.contains('active')) fmRenderLiveMap();
  }catch(e){
    console.warn('FarmManager V11:', e);
  }
}

function fmPopulateWorkSelectors(){
  const c = $('workCustomer');
  const m = $('workMachine');
  if(!c || !m) return;
  const currentCustomer = c.value;
  const currentMachine = m.value;
  c.innerHTML = '<option value="">Kunde wählen …</option>' + cust.map(x =>
    `<option value="${x.id}">${esc(x.name)}${x.company ? ' · '+esc(x.company) : ''}</option>`
  ).join('');
  m.innerHTML = '<option value="">Maschine wählen …</option>' + machines.filter(x => x.active !== false).map(x =>
    `<option value="${x.id}">${esc(x.name)}${x.category ? ' · '+esc(x.category) : ''}</option>`
  ).join('');
  if(currentCustomer) c.value = currentCustomer;
  if(currentMachine) m.value = currentMachine;
  fmPopulateOrderSelect();
}

function fmPopulateOrderSelect(){
  const customerId = +($('workCustomer')?.value || 0);
  const orderSel = $('workOrder');
  if(!orderSel) return;
  const active = orders.filter(o =>
    +o.customer_id === customerId && !['abgeschlossen','storniert'].includes(o.status)
  );
  orderSel.innerHTML = customerId
    ? '<option value="">Auftrag wählen …</option>' + active.map(o =>
        `<option value="${o.id}">#${o.id} · ${esc(o.order_type)} · ${esc(L[o.status] || o.status)}</option>`
      ).join('')
    : '<option value="">Zuerst Kunde wählen …</option>';
  if(active.length === 1) orderSel.value = active[0].id;
}

function fmMyActiveSession(){
  return workSessions.find(s => s.user_id === me?.id && (s.status === 'running' || s.status === 'paused')) || null;
}

function fmSeconds(session){
  if(!session) return 0;
  const start = new Date(session.started_at).getTime();
  const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
  let pauses = +session.pause_seconds || 0;
  if(session.status === 'paused' && session.pause_started_at){
    pauses += Math.max(0, Math.floor((Date.now() - new Date(session.pause_started_at).getTime()) / 1000));
  }
  return Math.max(0, Math.floor((end - start) / 1000) - pauses);
}

function fmPauseSeconds(session){
  if(!session) return 0;
  let s = +session.pause_seconds || 0;
  if(session.status === 'paused' && session.pause_started_at){
    s += Math.max(0, Math.floor((Date.now() - new Date(session.pause_started_at).getTime()) / 1000));
  }
  return s;
}

function fmDuration(sec){
  sec = Math.max(0, Math.floor(sec || 0));
  const h = String(Math.floor(sec/3600)).padStart(2,'0');
  const m = String(Math.floor((sec%3600)/60)).padStart(2,'0');
  const s = String(sec%60).padStart(2,'0');
  return `${h}:${m}:${s}`;
}

function fmDurationShort(sec){
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec/3600);
  const m = Math.floor((sec%3600)/60);
  return `${h}:${String(m).padStart(2,'0')} h`;
}

function fmRenderWorkTime(){
  if(!$('workClock')) return;
  const active = fmMyActiveSession();
  const locked = !!active;

  ['workCustomer','workOrder','workMachine','workType'].forEach(id => {
    if($(id)) $(id).disabled = locked;
  });

  if(!active){
    $('workClock').textContent = '00:00:00';
    $('workState').textContent = 'Bereit';
    $('workState').className = 'work-state idle';
    $('workStartedAt').textContent = '—';
    $('workPauseTime').textContent = '00:00';
    $('workStart').hidden = false;
    $('workPause').hidden = true;
    $('workResume').hidden = true;
    $('workStop').hidden = true;
    $('workEnableGps').hidden = true;
    $('workGpsState').textContent = 'Noch nicht aktiv';
    clearInterval(fmClockInterval);
    fmClockInterval = null;
    return;
  }

  $('workCustomer').value = active.customer_id;
  fmPopulateOrderSelect();
  $('workOrder').value = active.order_id;
  $('workMachine').value = active.machine_id || '';
  $('workType').value = active.work_type || 'Ballen';
  $('workNotes').value = active.notes || '';
  $('workStartedAt').textContent = new Date(active.started_at).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'});
  $('workStart').hidden = true;
  $('workPause').hidden = active.status !== 'running';
  $('workResume').hidden = active.status !== 'paused';
  $('workStop').hidden = false;
  $('workEnableGps').hidden = fmWatchId !== null;

  const tick = () => {
    const s = fmMyActiveSession();
    if(!s) return;
    $('workClock').textContent = fmDuration(fmSeconds(s));
    $('workPauseTime').textContent = fmDuration(fmPauseSeconds(s)).slice(0,5);
    $('workState').textContent = s.status === 'paused' ? 'Pause' : 'Arbeitszeit läuft';
    $('workState').className = 'work-state ' + (s.status === 'paused' ? 'paused' : 'running');
  };
  tick();
  clearInterval(fmClockInterval);
  fmClockInterval = setInterval(tick,1000);
}

async function fmStartWork(){
  const customer_id = +$('workCustomer').value || 0;
  const order_id = +$('workOrder').value || 0;
  const machine_id = +$('workMachine').value || 0;
  const work_type = $('workType').value;
  if(!customer_id) return alert('Bitte Kunde auswählen.');
  if(!order_id) return alert('Bitte einen Auftrag des Kunden auswählen.');
  if(!machine_id) return alert('Bitte Maschine auswählen.');
  if(fmMyActiveSession()) return alert('Du hast bereits eine laufende Arbeitszeit.');

  try{
    const rows = await insert('work_sessions',{
      user_id:me.id,
      customer_id,
      order_id,
      machine_id,
      work_type,
      status:'running',
      notes:$('workNotes').value.trim() || null,
      started_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    },true);
    workSessions.unshift(rows[0]);
    fmRenderWorkTime();
    fmRenderWorkHistory();
    fmStartGps(rows[0]);
  }catch(e){ alert('Arbeitszeit konnte nicht gestartet werden: '+e.message); }
}

async function fmPauseWork(){
  const s = fmMyActiveSession();
  if(!s || s.status !== 'running') return;
  try{
    await update('work_sessions',{
      status:'paused',
      pause_started_at:new Date().toISOString(),
      notes:$('workNotes').value.trim() || null,
      updated_at:new Date().toISOString()
    },'id=eq.'+s.id);
    s.status='paused'; s.pause_started_at=new Date().toISOString(); s.notes=$('workNotes').value.trim()||null;
    fmRenderWorkTime();
  }catch(e){ alert(e.message); }
}

async function fmResumeWork(){
  const s = fmMyActiveSession();
  if(!s || s.status !== 'paused') return;
  const now = Date.now();
  const added = s.pause_started_at ? Math.max(0,Math.floor((now-new Date(s.pause_started_at).getTime())/1000)) : 0;
  const pause_seconds = (+s.pause_seconds||0)+added;
  try{
    await update('work_sessions',{
      status:'running',
      pause_started_at:null,
      pause_seconds,
      notes:$('workNotes').value.trim() || null,
      updated_at:new Date().toISOString()
    },'id=eq.'+s.id);
    s.status='running'; s.pause_started_at=null; s.pause_seconds=pause_seconds; s.notes=$('workNotes').value.trim()||null;
    fmRenderWorkTime();
    if(fmWatchId===null) fmStartGps(s);
  }catch(e){ alert(e.message); }
}

async function fmStopWork(){
  const s = fmMyActiveSession();
  if(!s) return;
  const nowIso = new Date().toISOString();
  let pause_seconds = +s.pause_seconds || 0;
  if(s.status === 'paused' && s.pause_started_at){
    pause_seconds += Math.max(0,Math.floor((Date.now()-new Date(s.pause_started_at).getTime())/1000));
  }
  const total = Math.max(0,Math.floor((Date.now()-new Date(s.started_at).getTime())/1000)-pause_seconds);
  try{
    await update('work_sessions',{
      status:'completed',
      ended_at:nowIso,
      pause_started_at:null,
      pause_seconds,
      work_seconds:total,
      notes:$('workNotes').value.trim() || null,
      updated_at:nowIso
    },'id=eq.'+s.id);

    s.status='completed'; s.ended_at=nowIso; s.pause_started_at=null; s.pause_seconds=pause_seconds; s.work_seconds=total;
    s.notes=$('workNotes').value.trim()||null;
    await fmStopGps();
    $('workNotes').value='';
    fmRenderWorkTime();
    fmRenderWorkHistory();
    renderOrders();
    alert(`Arbeitszeit gespeichert: ${fmDurationShort(total)}`);
  }catch(e){ alert('Arbeitszeit konnte nicht gespeichert werden: '+e.message); }
}

function fmRenderWorkHistory(){
  if(!$('workHistory') || !me) return;
  const mine = workSessions.filter(s => s.user_id === me.id);
  const today = new Date().toISOString().slice(0,10);
  const todaySeconds = mine.filter(s => String(s.started_at||'').slice(0,10)===today && s.status==='completed')
    .reduce((a,s)=>a+(+s.work_seconds||0),0);
  $('workTodayTotal').textContent = 'Heute: '+fmDurationShort(todaySeconds);

  const list = (myRole === 'admin' ? workSessions : mine).slice(0,60);
  $('workHistory').innerHTML = list.map(s => {
    const customer = cust.find(c => +c.id === +s.customer_id);
    const machine = machines.find(m => +m.id === +s.machine_id);
    const user = profiles.find(p => p.id === s.user_id);
    const duration = s.status === 'completed' ? (+s.work_seconds||0) : fmSeconds(s);
    return `<div class="work-row">
      <div>
        <b>${esc(s.work_type)} · Auftrag #${s.order_id}</b>
        <p>${esc(customer?.name||'Kunde')} · ${esc(machine?.name||'Keine Maschine')}</p>
        ${myRole==='admin' ? `<p>${esc(user?.display_name||user?.email||'Mitarbeiter')}</p>` : ''}
      </div>
      <div class="work-row-right">
        <strong>${fmDurationShort(duration)}</strong>
        <span>${new Date(s.started_at).toLocaleDateString('de-DE')}</span>
        <em class="${s.status}">${s.status==='completed'?'Gespeichert':s.status==='paused'?'Pause':'Läuft'}</em>
      </div>
    </div>`;
  }).join('') || '<p class="muted">Noch keine Arbeitszeiten erfasst.</p>';
}

function fmGpsError(err){
  $('workGpsState').textContent = err?.message ? 'Nicht aktiv' : 'Nicht verfügbar';
  $('workEnableGps').hidden = false;
}

function fmStartGps(session){
  if(!navigator.geolocation){
    $('workGpsState').textContent='GPS nicht unterstützt';
    return;
  }
  if(fmWatchId !== null) return;
  $('workGpsState').textContent='Standort wird angefragt …';
  fmWatchId = navigator.geolocation.watchPosition(async pos => {
    const s = fmMyActiveSession() || session;
    if(!s) return;
    const p = pos.coords;
    $('workGpsState').textContent = `Aktiv · ±${Math.round(p.accuracy||0)} m`;
    $('workEnableGps').hidden = true;
    try{
      await req('live_locations?on_conflict=user_id',{
        method:'POST',
        headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify({
          user_id:me.id,
          machine_id:s.machine_id,
          work_session_id:s.id,
          latitude:p.latitude,
          longitude:p.longitude,
          accuracy:p.accuracy||null,
          speed:p.speed,
          heading:p.heading,
          active:true,
          updated_at:new Date().toISOString()
        })
      });
    }catch(e){ console.warn('GPS speichern:',e); }
  }, fmGpsError, {enableHighAccuracy:true,maximumAge:10000,timeout:20000});
}

async function fmStopGps(){
  if(fmWatchId !== null && navigator.geolocation){
    navigator.geolocation.clearWatch(fmWatchId);
    fmWatchId=null;
  }
  if(me?.id){
    try{
      await update('live_locations',{active:false,updated_at:new Date().toISOString()},'user_id=eq.'+encodeURIComponent(me.id));
    }catch(e){}
  }
  if($('workGpsState')) $('workGpsState').textContent='Beendet';
}

async function fmRefreshLocations(){
  if(!token) return;
  try{
    liveLocations = await select('live_locations','select=*&active=eq.true&order=updated_at.desc') || [];
    fmRenderLiveMap();
  }catch(e){ console.warn(e); }
}

function fmRenderLiveMap(){
  if(!$('liveMap') || typeof L === 'undefined') return;

  if(!fmMap){
    fmMap = L.map('liveMap',{zoomControl:true}).setView([49.5,8.4],8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'© OpenStreetMap'
    }).addTo(fmMap);
  }

  fmMapMarkers.forEach(m => fmMap.removeLayer(m));
  fmMapMarkers=[];

  const now=Date.now();
  const rows = liveLocations.filter(x => x.active);
  const bounds=[];

  rows.forEach(x => {
    const age = now - new Date(x.updated_at).getTime();
    const fresh = age < 5*60*1000;
    const machine = machines.find(m => +m.id === +x.machine_id);
    const user = profiles.find(p => p.id === x.user_id);
    const session = workSessions.find(s => +s.id === +x.work_session_id);
    const icon = L.divIcon({
      className:'machine-map-icon-wrap',
      html:`<div class="machine-map-icon ${fresh?'fresh':'stale'}">🚜</div>`,
      iconSize:[42,42],
      iconAnchor:[21,21]
    });
    const marker=L.marker([x.latitude,x.longitude],{icon}).addTo(fmMap);
    marker.bindPopup(`<b>${esc(machine?.name||'Maschine')}</b><br>${esc(user?.display_name||user?.email||'Mitarbeiter')}<br>${esc(session?.work_type||'Einsatz')}<br><small>Stand: ${new Date(x.updated_at).toLocaleTimeString('de-DE')}</small>`);
    fmMapMarkers.push(marker);
    bounds.push([x.latitude,x.longitude]);
  });

  if(bounds.length) fmMap.fitBounds(bounds,{padding:[35,35],maxZoom:15});
  setTimeout(()=>fmMap.invalidateSize(),100);

  $('liveMachineList').innerHTML = rows.map(x => {
    const machine = machines.find(m => +m.id === +x.machine_id);
    const user = profiles.find(p => p.id === x.user_id);
    const session = workSessions.find(s => +s.id === +x.work_session_id);
    const ageSec = Math.max(0,Math.floor((now-new Date(x.updated_at).getTime())/1000));
    const fresh=ageSec<300;
    const speed = x.speed == null ? '—' : Math.max(0,Math.round(x.speed*3.6))+' km/h';
    return `<button class="live-machine-row" data-lat="${x.latitude}" data-lon="${x.longitude}">
      <span class="live-machine-icon">🚜</span>
      <span><b>${esc(machine?.name||'Maschine')}</b><small>${esc(user?.display_name||user?.email||'Mitarbeiter')} · ${esc(session?.work_type||'Einsatz')}</small></span>
      <span class="live-machine-meta"><b>${speed}</b><small class="${fresh?'online-text':'stale-text'}">${fresh?'Live':'vor '+Math.max(1,Math.round(ageSec/60))+' Min.'}</small></span>
    </button>`;
  }).join('') || '<p class="muted">Aktuell ist keine Maschine mit Live-Tracking unterwegs.</p>';

  document.querySelectorAll('.live-machine-row').forEach(b => b.onclick=()=>{
    fmMap.setView([+b.dataset.lat,+b.dataset.lon],16);
  });
}

$('workCustomer')?.addEventListener('change',fmPopulateOrderSelect);
$('workStart')?.addEventListener('click',fmStartWork);
$('workPause')?.addEventListener('click',fmPauseWork);
$('workResume')?.addEventListener('click',fmResumeWork);
$('workStop')?.addEventListener('click',fmStopWork);
$('workEnableGps')?.addEventListener('click',()=>{const s=fmMyActiveSession();if(s)fmStartGps(s)});
$('liveRefresh')?.addEventListener('click',fmRefreshLocations);

document.querySelector('nav button[data-page="arbeitszeit"]')?.addEventListener('click',()=>setTimeout(()=>{
  fmPopulateWorkSelectors(); fmRenderWorkTime(); fmRenderWorkHistory();
},30));

document.querySelector('nav button[data-page="livekarte"]')?.addEventListener('click',()=>setTimeout(async()=>{
  await fmRefreshLocations();
  if(!fmLocationRefreshInterval) fmLocationRefreshInterval=setInterval(()=>{
    if(document.getElementById('p-livekarte')?.classList.contains('active')) fmRefreshLocations();
  },20000);
},60));

setTimeout(async()=>{
  if(token && me){
    await fmLoadFeatures();
    const s=fmMyActiveSession();
    if(s) fmRenderWorkTime();
  }
},600);
