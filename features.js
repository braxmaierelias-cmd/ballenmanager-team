
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


/* ===== FarmManager V12: Felder / Schläge ===== */
let fields = [];
let orderFields = [];
let workFieldSegments = [];
let fmFieldMap = null;
let fmFieldDrawLayer = null;
let fmFieldDisplayLayer = null;
let fmPendingGeometry = null;
let fmLiveFieldLayers = [];

const fmV11LoadFeatures = fmLoadFeatures;
fmLoadFeatures = async function(){
  await fmV11LoadFeatures();
  if(!token || !me) return;
  try{
    [fields, orderFields, workFieldSegments] = await Promise.all([
      select('fields','select=*&order=name.asc'),
      select('order_fields','select=*&order=created_at.asc'),
      select('work_field_segments','select=*&order=started_at.asc')
    ]);
    fmPopulateFieldCustomer();
    fmRenderOrderFieldChoices();
    fmPopulateWorkFields();
    fmRenderFieldTimeline();
    renderOrders();
    if(document.getElementById('p-kunden')?.classList.contains('active')) fmInitFieldMap();
    if(document.getElementById('p-livekarte')?.classList.contains('active')) fmRenderLiveMap();
  }catch(e){ console.warn('Felder laden:',e); }
};

function fmCustomerFields(customerId){
  return fields.filter(f => +f.customer_id === +customerId);
}
function fmOrderFieldIds(orderId){
  return orderFields.filter(x => +x.order_id === +orderId).map(x => +x.field_id);
}
function fmFieldName(id){
  return fields.find(f => +f.id === +id)?.name || 'Feld';
}
function fmPopulateFieldCustomer(){
  const el=$('fieldCustomer');
  if(!el) return;
  const val=el.value;
  el.innerHTML='<option value="">Kunde wählen …</option>'+cust.map(c=>`<option value="${c.id}">${esc(c.name)}${c.company?' · '+esc(c.company):''}</option>`).join('');
  if(val) el.value=val;
  fmRenderCustomerFields();
}
function fmRenderCustomerFields(){
  const customerId=+$('fieldCustomer')?.value||0;
  if(!$('customerFieldsList')) return;
  const list=fmCustomerFields(customerId);
  $('customerFieldsList').innerHTML = customerId ? (list.map(f=>`
    <button class="field-list-row" data-field-focus="${f.id}">
      <span><b>${esc(f.name)}</b><small>${f.hectares?Number(f.hectares).toLocaleString('de-DE',{maximumFractionDigits:2})+' ha':''}${f.crop?' · '+esc(f.crop):''}</small></span>
      <span class="field-row-actions"><i data-field-edit="${f.id}">Bearbeiten</i><i data-field-delete="${f.id}">Löschen</i></span>
    </button>`).join('') || '<p class="muted">Für diesen Kunden sind noch keine Felder angelegt. Zeichne rechts eine Fläche ein.</p>') : '<p class="muted">Noch keinen Kunden gewählt.</p>';
  document.querySelectorAll('[data-field-focus]').forEach(b=>b.onclick=e=>{
    if(e.target.closest('[data-field-edit]')||e.target.closest('[data-field-delete]')) return;
    fmFocusField(+b.dataset.fieldFocus);
  });
  document.querySelectorAll('[data-field-edit]').forEach(b=>b.onclick=e=>{e.stopPropagation();fmEditField(+b.dataset.fieldEdit)});
  document.querySelectorAll('[data-field-delete]').forEach(b=>b.onclick=async e=>{
    e.stopPropagation();
    const id=+b.dataset.fieldDelete;
    if(!confirm('Feld wirklich löschen?')) return;
    try{await remove('fields','id=eq.'+id); await fmReloadFieldData();}catch(err){alert('Feld kann nicht gelöscht werden, solange es bereits in einem Auftrag oder einer Arbeitszeit verwendet wird.');}
  });
  fmDrawCustomerFields();
}
function fmInitFieldMap(){
  if(!$('fieldMap') || typeof L==='undefined') return;
  if(!fmFieldMap){
    fmFieldMap=L.map('fieldMap').setView([49.5,8.4],9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(fmFieldMap);
    fmFieldDrawLayer=new L.FeatureGroup().addTo(fmFieldMap);
    fmFieldDisplayLayer=new L.FeatureGroup().addTo(fmFieldMap);
    if(L.Control?.Draw){
      const drawControl=new L.Control.Draw({
        draw:{polyline:false,rectangle:false,circle:false,circlemarker:false,marker:false,polygon:{allowIntersection:false,showArea:true}},
        edit:false
      });
      fmFieldMap.addControl(drawControl);
      fmFieldMap.on(L.Draw.Event.CREATED,e=>{
        if(!$('fieldCustomer').value){alert('Bitte zuerst einen Kunden auswählen.');return}
        fmFieldDrawLayer.clearLayers();
        fmFieldDrawLayer.addLayer(e.layer);
        fmPendingGeometry=e.layer.toGeoJSON().geometry;
        let ha=0;
        try{ha=L.GeometryUtil.geodesicArea(e.layer.getLatLngs()[0])/10000}catch(_){}
        $('fieldHectares').value=ha?ha.toFixed(2):'';
        $('fieldEditId').value='';
        $('fieldName').value='';
        $('fieldCrop').value='';
        $('fieldNotes').value='';
        $('fieldEditor').hidden=false;
      });
    }
  }
  fmDrawCustomerFields();
  setTimeout(()=>fmFieldMap.invalidateSize(),120);
}
function fmGeoLayer(f,opts={}){
  try{return L.geoJSON({type:'Feature',geometry:f.geometry,properties:{}},{style:{weight:2,fillOpacity:.16,...opts}})}catch(e){return null}
}
function fmDrawCustomerFields(){
  if(!fmFieldMap||!fmFieldDisplayLayer) return;
  fmFieldDisplayLayer.clearLayers();
  const customerId=+$('fieldCustomer')?.value||0;
  const list=fmCustomerFields(customerId);
  const bounds=[];
  list.forEach(f=>{
    const layer=fmGeoLayer(f);
    if(!layer) return;
    layer.bindTooltip(`${esc(f.name)}${f.hectares?' · '+Number(f.hectares).toFixed(2)+' ha':''}`);
    layer.addTo(fmFieldDisplayLayer);
    try{bounds.push(layer.getBounds())}catch(_){}
  });
  if(bounds.length){
    let b=bounds[0];
    for(let i=1;i<bounds.length;i++) b.extend(bounds[i]);
    fmFieldMap.fitBounds(b,{padding:[20,20],maxZoom:16});
  }
}
function fmFocusField(id){
  const f=fields.find(x=>+x.id===+id); if(!f||!fmFieldMap) return;
  const layer=fmGeoLayer(f,{weight:4,fillOpacity:.25}); if(!layer)return;
  try{fmFieldMap.fitBounds(layer.getBounds(),{padding:[30,30],maxZoom:17})}catch(_){}
}
function fmEditField(id){
  const f=fields.find(x=>+x.id===+id); if(!f)return;
  $('fieldEditId').value=f.id;$('fieldName').value=f.name||'';$('fieldHectares').value=f.hectares||'';$('fieldCrop').value=f.crop||'';$('fieldNotes').value=f.notes||'';
  fmPendingGeometry=f.geometry;
  $('fieldEditor').hidden=false;
  fmFocusField(id);
}
async function fmSaveField(){
  const customer_id=+$('fieldCustomer').value||0;
  const name=$('fieldName').value.trim();
  const id=+$('fieldEditId').value||0;
  if(!customer_id)return alert('Bitte Kunde auswählen.');
  if(!name)return alert('Bitte Feldname eingeben.');
  if(!fmPendingGeometry)return alert('Bitte Feld auf der Karte einzeichnen.');
  const obj={customer_id,name,hectares:+$('fieldHectares').value||null,crop:$('fieldCrop').value.trim()||null,notes:$('fieldNotes').value.trim()||null,geometry:fmPendingGeometry,updated_at:new Date().toISOString()};
  try{
    if(id) await update('fields',obj,'id=eq.'+id);
    else await insert('fields',{...obj,created_by:me.id},false);
    fmCancelFieldEditor();
    await fmReloadFieldData();
  }catch(e){alert('Feld konnte nicht gespeichert werden: '+e.message)}
}
function fmCancelFieldEditor(){
  $('fieldEditor').hidden=true;fmPendingGeometry=null;
  if(fmFieldDrawLayer)fmFieldDrawLayer.clearLayers();
}
async function fmReloadFieldData(){
  [fields,orderFields,workFieldSegments]=await Promise.all([
    select('fields','select=*&order=name.asc'),
    select('order_fields','select=*&order=created_at.asc'),
    select('work_field_segments','select=*&order=started_at.asc')
  ]);
  fmRenderCustomerFields();fmRenderOrderFieldChoices();fmPopulateWorkFields();fmRenderWorkHistory();fmRenderFieldTimeline();renderOrders();
}
$('fieldCustomer')?.addEventListener('change',()=>{fmRenderCustomerFields();fmInitFieldMap()});
$('saveField')?.addEventListener('click',fmSaveField);
$('cancelField')?.addEventListener('click',fmCancelFieldEditor);
document.querySelector('nav button[data-page="kunden"]')?.addEventListener('click',()=>setTimeout(()=>{fmPopulateFieldCustomer();fmInitFieldMap()},80));

function fmSelectedOrderFieldIds(){
  return [...document.querySelectorAll('#orderFieldChoices input[type="checkbox"]:checked')].map(x=>+x.value);
}
function fmRenderOrderFieldChoices(){
  const box=$('orderFieldChoices');if(!box)return;
  const customerId=+$('custSel')?.value||0;
  const list=fmCustomerFields(customerId);
  box.innerHTML=customerId?(list.map(f=>`<label class="field-check"><input type="checkbox" value="${f.id}"><span><b>${esc(f.name)}</b><small>${f.hectares?Number(f.hectares).toFixed(2)+' ha':''}${f.crop?' · '+esc(f.crop):''}</small></span></label>`).join('')||'<p class="muted">Dieser Kunde hat noch keine Felder.</p>'):'<p class="muted">Nach Kundenauswahl werden dessen Felder angezeigt.</p>';
}
$('custSel')?.addEventListener('change',fmRenderOrderFieldChoices);

const fmOldSaveOrderClick=$('saveOrder')?.onclick;
if(fmOldSaveOrderClick){
  $('saveOrder').onclick=async function(ev){
    const selected=fmSelectedOrderFieldIds();
    const before=new Set(orders.map(o=>+o.id));
    await fmOldSaveOrderClick.call(this,ev);
    const created=orders.find(o=>!before.has(+o.id));
    if(created&&selected.length){
      try{
        await req('order_fields',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(selected.map(field_id=>({order_id:created.id,field_id,created_by:me.id,added_during_work:false})))});
        orderFields=await select('order_fields','select=*&order=created_at.asc')||[];
        renderOrders();
      }catch(e){console.warn('Felder zum Auftrag:',e)}
    }
  };
}

const fmV11OrderCard=orderCard;
orderCard=function(o,done=false){
  let html=fmV11OrderCard(o,done);
  const ids=fmOrderFieldIds(o.id);
  if(!ids.length)return html;
  const fieldHtml=`<div class="order-fields"><b>Felder:</b> ${ids.map(id=>esc(fmFieldName(id))).join(' · ')}</div>`;
  const segs=workFieldSegments.filter(s=>workSessions.some(ws=>+ws.id===+s.work_session_id&&+ws.order_id===+o.id));
  const byField={};
  segs.forEach(s=>{
    const end=s.ended_at?new Date(s.ended_at).getTime():Date.now();
    const sec=Math.max(0,Math.floor((end-new Date(s.started_at).getTime())/1000));
    byField[s.field_id]=(byField[s.field_id]||0)+sec;
  });
  const timeHtml=Object.keys(byField).length?`<div class="order-field-times">${Object.entries(byField).map(([id,sec])=>`<span>${esc(fmFieldName(+id))}: <b>${fmDurationShort(sec)}</b></span>`).join('')}</div>`:'';
  return html.replace(/<\/div>\s*$/,fieldHtml+timeHtml+'</div>');
};

function fmPopulateWorkFields(){
  const el=$('workField');if(!el)return;
  const customerId=+$('workCustomer')?.value||0, orderId=+$('workOrder')?.value||0;
  const linked=new Set(fmOrderFieldIds(orderId));
  const list=fmCustomerFields(customerId);
  const current=el.value;
  el.innerHTML='<option value="">Ohne Feld</option>'+list.map(f=>`<option value="${f.id}">${linked.has(+f.id)?'★ ':''}${esc(f.name)}${f.hectares?' · '+Number(f.hectares).toFixed(2)+' ha':''}</option>`).join('');
  if(current&&list.some(f=>String(f.id)===String(current)))el.value=current;
}
$('workCustomer')?.addEventListener('change',()=>setTimeout(fmPopulateWorkFields,0));
$('workOrder')?.addEventListener('change',fmPopulateWorkFields);

function fmCurrentFieldId(sessionId){
  const segs=workFieldSegments.filter(s=>+s.work_session_id===+sessionId).sort((a,b)=>new Date(a.started_at)-new Date(b.started_at));
  return segs.length?+segs[segs.length-1].field_id:0;
}
function fmOpenFieldSegment(sessionId){
  return workFieldSegments.find(s=>+s.work_session_id===+sessionId&&!s.ended_at)||null;
}
async function fmEnsureOrderField(orderId,fieldId,addedDuring=true){
  if(!orderId||!fieldId||orderFields.some(x=>+x.order_id===+orderId&&+x.field_id===+fieldId))return;
  try{
    await req('order_fields',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({order_id:orderId,field_id:fieldId,created_by:me.id,added_during_work:addedDuring})});
    orderFields.push({order_id:orderId,field_id:fieldId,created_by:me.id,added_during_work:addedDuring});
  }catch(e){console.warn(e)}
}
async function fmStartFieldSegment(session,fieldId){
  if(!session||!fieldId)return;
  await fmEnsureOrderField(session.order_id,fieldId,true);
  const rows=await insert('work_field_segments',{work_session_id:session.id,field_id:fieldId,started_at:new Date().toISOString(),created_by:me.id},true);
  workFieldSegments.push(rows[0]);
  fmRenderFieldTimeline();
}
async function fmCloseFieldSegment(sessionId){
  const seg=fmOpenFieldSegment(sessionId);if(!seg)return;
  const end=new Date().toISOString();
  await update('work_field_segments',{ended_at:end},'id=eq.'+seg.id);
  seg.ended_at=end;
  fmRenderFieldTimeline();
}
async function fmSwitchWorkField(){
  const s=fmMyActiveSession();if(!s)return;
  if(s.status==='paused')return alert('Bitte zuerst die Pause beenden.');
  const available=fmCustomerFields(s.customer_id);
  if(!available.length)return alert('Für diesen Kunden sind noch keine Felder angelegt.');
  const names=available.map((f,i)=>`${i+1}: ${f.name}`).join('\n');
  const val=prompt(`Welches Feld soll jetzt bearbeitet werden?\n\n${names}\n\nNummer eingeben:`);
  if(!val)return;
  const f=available[+val-1];if(!f)return alert('Ungültige Auswahl.');
  await fmCloseFieldSegment(s.id);
  await fmStartFieldSegment(s,f.id);
  $('workField').value=f.id;
  fmRenderWorkTime();
}
$('workChangeField')?.addEventListener('click',fmSwitchWorkField);

const fmV11StartWork=fmStartWork;
fmStartWork=async function(){
  const before=new Set(workSessions.map(s=>+s.id));
  await fmV11StartWork();
  const s=workSessions.find(x=>!before.has(+x.id)&&x.user_id===me.id);
  const fieldId=+$('workField')?.value||0;
  if(s&&fieldId){try{await fmStartFieldSegment(s,fieldId)}catch(e){console.warn(e)}}
  fmRenderFieldTimeline();
};
const fmV11PauseWork=fmPauseWork;
fmPauseWork=async function(){
  const s=fmMyActiveSession();
  if(s){try{await fmCloseFieldSegment(s.id)}catch(e){}}
  await fmV11PauseWork();
  fmRenderFieldTimeline();
};
const fmV11ResumeWork=fmResumeWork;
fmResumeWork=async function(){
  const s=fmMyActiveSession();
  const lastField=s?fmCurrentFieldId(s.id):0;
  await fmV11ResumeWork();
  const now=fmMyActiveSession();
  if(now&&lastField){try{await fmStartFieldSegment(now,lastField)}catch(e){}}
  fmRenderFieldTimeline();
};
const fmV11StopWork=fmStopWork;
fmStopWork=async function(){
  const s=fmMyActiveSession();
  if(s){try{await fmCloseFieldSegment(s.id)}catch(e){}}
  await fmV11StopWork();
  fmRenderFieldTimeline();
};

function fmRenderFieldTimeline(){
  if(!$('workFieldTimeline'))return;
  const s=fmMyActiveSession();
  $('workFieldControl').hidden=!s;
  if(!s){$('workFieldTimeline').innerHTML='';return}
  const current=fmOpenFieldSegment(s.id)||workFieldSegments.filter(x=>+x.work_session_id===+s.id).sort((a,b)=>new Date(b.started_at)-new Date(a.started_at))[0];
  $('workCurrentField').textContent=current?fmFieldName(current.field_id):'Ohne Feld';
  const segs=workFieldSegments.filter(x=>+x.work_session_id===+s.id);
  $('workFieldTimeline').innerHTML=segs.map(seg=>{
    const end=seg.ended_at?new Date(seg.ended_at).getTime():Date.now();
    const sec=Math.max(0,Math.floor((end-new Date(seg.started_at).getTime())/1000));
    return `<span><b>${esc(fmFieldName(seg.field_id))}</b> ${fmDurationShort(sec)}</span>`;
  }).join('');
}

const fmV11RenderWorkTime=fmRenderWorkTime;
fmRenderWorkTime=function(){
  fmV11RenderWorkTime();
  fmPopulateWorkFields();
  fmRenderFieldTimeline();
};

const fmV11RenderLiveMap=fmRenderLiveMap;
fmRenderLiveMap=function(){
  fmV11RenderLiveMap();
  if(!fmMap||typeof L==='undefined')return;
  fmLiveFieldLayers.forEach(l=>{try{fmMap.removeLayer(l)}catch(_){}});
  fmLiveFieldLayers=[];
  fields.forEach(f=>{
    const layer=fmGeoLayer(f,{weight:1,fillOpacity:.05,dashArray:'5 5'});
    if(layer){layer.bindTooltip(esc(f.name));layer.addTo(fmMap);fmLiveFieldLayers.push(layer)}
  });
};

setInterval(()=>{
  if(fmMyActiveSession()) fmRenderFieldTimeline();
},30000);
