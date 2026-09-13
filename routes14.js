
/* FarmManager V14.7 – Fahrtaufzeichnung / GPS-Routen */
(function(){
const E=id=>document.getElementById(id);
const LF=()=>window.L&&typeof window.L.map==='function'?window.L:null;

let routeTracks147=[];
let routePoints147=[];
let activeRoute147=null;
let routeWatch147=null;
let routeMap147=null;
let routeLayers147=[];
let selectedRoute147=null;

/* ---------------- UI ---------------- */
function ensureRouteUi147(){
  const page=E('p-livekarte'); if(!page||E('routeTracker147'))return;

  const head=page.querySelector('.pagehead')||page.firstElementChild;
  const box=document.createElement('div');
  box.id='routeTracker147';
  box.className='card route-tracker147';
  box.innerHTML=`
    <div class="sectionhead">
      <div><span class="section-kicker">FAHRTAUFZEICHNUNG</span><h3>Fahrt aufzeichnen</h3></div>
      <span id="routeState147" class="route-state147">Bereit</span>
    </div>
    <div class="grid">
      <div><label>Name der Fahrt</label><input id="routeName147" placeholder="z. B. Anfahrt Feld 4"></div>
      <div><label>Maschine</label><select id="routeMachine147"></select></div>
      <div><label>Auftrag (optional)</label><select id="routeOrder147"></select></div>
      <div class="full"><label>Notiz</label><input id="routeNotes147" placeholder="Optional"></div>
    </div>
    <div class="route-live-stats147">
      <span><small>Strecke</small><b id="routeDistance147">0,00 km</b></span>
      <span><small>Dauer</small><b id="routeDuration147">00:00:00</b></span>
      <span><small>GPS-Punkte</small><b id="routePointsCount147">0</b></span>
    </div>
    <div class="rowbuttons">
      <button id="routeStart147">▶ Fahrt starten</button>
      <button id="routeStop147" class="danger" hidden>■ Fahrt beenden & speichern</button>
    </div>
    <p class="muted route-hint147">Die Fahrt kann unabhängig von einer Arbeitszeit gestartet werden. Bei laufender Arbeitszeit startet die Aufzeichnung automatisch, falls noch keine Fahrt läuft.</p>
  `;

  const mapCard=E('liveMap')?.closest('.live-map-card') || E('liveMap')?.closest('.card') || E('liveMap')?.parentElement;
  const grid=mapCard?.closest('.live-grid');
  const listCard=page.querySelector('.live-list-card');
  let side=E('liveSideColumn150');

  if(grid && mapCard){
    if(!side){
      side=document.createElement('div');
      side.id='liveSideColumn150';
      side.className='live-side-column150';
      if(listCard && listCard.parentElement===grid){
        grid.insertBefore(side,listCard);
        side.appendChild(listCard);
      }else{
        grid.appendChild(side);
        if(listCard) side.appendChild(listCard);
      }
    }
    side.insertBefore(box,side.firstChild);
  }else if(mapCard){
    mapCard.after(box);
  }else{
    page.appendChild(box);
  }

  const hist=document.createElement('div');
  hist.className='card route-history147';
  hist.innerHTML=`<div class="sectionhead"><div><span class="section-kicker">GESPEICHERTE FAHRTEN</span><h3>Fahrtenverlauf</h3></div></div><div id="routeHistory147"></div>`;
  if(side) side.appendChild(hist);
  else if(mapCard) mapCard.after(hist);
  else page.appendChild(hist);

  E('routeStart147').onclick=()=>startIndependent147();
  E('routeStop147').onclick=()=>stopRoute147();
}

function populateRouteSelectors147(){
  ensureRouteUi147();
  const m=E('routeMachine147'),o=E('routeOrder147');if(!m||!o)return;
  const mv=m.value,ov=o.value;
  const machineList=(machines||[]).filter(x=>(x.machine_kind||'maschinenpark')!=='anbaugeraet'&&x.active!==false);
  m.innerHTML='<option value="">Keine Maschine</option>'+machineList.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  o.innerHTML='<option value="">Kein Auftrag</option>'+(orders||[]).filter(x=>x.status!=='storniert').map(x=>`<option value="${x.id}">#${x.id} · ${esc(x.order_type)} · ${esc(x.customers?.name||'Kunde')}</option>`).join('');
  if(mv)m.value=mv;if(ov)o.value=ov;
}

/* ---------------- Daten ---------------- */
async function loadRoutes147(){
  if(!token||!me)return;
  ensureRouteUi147();populateRouteSelectors147();
  try{
    routeTracks147=await select('route_tracks','select=*&order=started_at.desc&limit=150')||[];
    activeRoute147=routeTracks147.find(x=>x.user_id===me.id&&x.status==='running')||null;
    if(activeRoute147){
      routePoints147=await select('route_track_points','select=*&route_track_id=eq.'+activeRoute147.id+'&order=id.asc')||[];
      resumeWatch147();
    }else routePoints147=[];
    renderRouteState147();
    renderRouteHistory147();
    renderLiveRouteMap147();
  }catch(e){console.warn('Fahrten laden:',e)}
}

function hav147(a,b){
  const R=6371000,rad=x=>x*Math.PI/180;
  const dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude);
  const la1=rad(a.latitude),la2=rad(b.latitude);
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
function duration147(track){
  const a=new Date(track.started_at).getTime(),b=track.ended_at?new Date(track.ended_at).getTime():Date.now();
  return Math.max(0,Math.floor((b-a)/1000));
}
function dur147(sec){
  sec=Math.max(0,sec||0);const h=String(Math.floor(sec/3600)).padStart(2,'0'),m=String(Math.floor((sec%3600)/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');return `${h}:${m}:${s}`;
}
function routeDistance147(){
  if(activeRoute147)return +activeRoute147.distance_m||0;
  return 0;
}

/* ---------------- Start / Stop ---------------- */
async function createRoute147(opts={}){
  if(activeRoute147)return activeRoute147;
  const rows=await insert('route_tracks',{
    user_id:me.id,
    work_session_id:opts.work_session_id||null,
    order_id:opts.order_id||(+E('routeOrder147')?.value||null),
    machine_id:opts.machine_id||(+E('routeMachine147')?.value||null),
    name:opts.name||E('routeName147')?.value.trim()||null,
    notes:opts.notes||E('routeNotes147')?.value.trim()||null,
    status:'running',
    started_at:new Date().toISOString(),
    distance_m:0,
    updated_at:new Date().toISOString()
  },true);
  activeRoute147=rows[0];routeTracks147.unshift(activeRoute147);routePoints147=[];
  resumeWatch147();renderRouteState147();renderRouteHistory147();return activeRoute147;
}
async function startIndependent147(){
  try{await createRoute147({})}catch(e){alert('Fahrt konnte nicht gestartet werden: '+e.message)}
}
function resumeWatch147(){
  if(!activeRoute147||routeWatch147!==null)return;
  if(!navigator.geolocation){alert('GPS wird auf diesem Gerät nicht unterstützt.');return}
  routeWatch147=navigator.geolocation.watchPosition(savePoint147,err=>{
    if(E('routeState147'))E('routeState147').textContent='GPS: '+(err.message||'Fehler');
  },{enableHighAccuracy:true,maximumAge:3000,timeout:20000});
}
async function savePoint147(pos){
  if(!activeRoute147)return;
  const c=pos.coords;
  if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude))return;
  if(c.accuracy&&c.accuracy>120)return;

  const p={latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy||null,speed:c.speed,heading:c.heading,recorded_at:new Date().toISOString()};
  const last=routePoints147[routePoints147.length-1];
  const delta=last?hav147(last,p):0;
  if(last&&delta<2.5)return;

  try{
    const rows=await insert('route_track_points',{route_track_id:activeRoute147.id,...p},true);
    routePoints147.push(rows[0]);
    activeRoute147.distance_m=(+activeRoute147.distance_m||0)+delta;
    await update('route_tracks',{distance_m:activeRoute147.distance_m,updated_at:new Date().toISOString()},'id=eq.'+activeRoute147.id);
    renderRouteState147();renderLiveRouteMap147();
  }catch(e){console.warn('GPS-Punkt speichern:',e)}
}
async function stopRoute147(){
  if(!activeRoute147)return;
  const r=activeRoute147;
  if(routeWatch147!==null&&navigator.geolocation){navigator.geolocation.clearWatch(routeWatch147);routeWatch147=null}
  const end=new Date().toISOString(),secs=duration147(r);
  try{
    await update('route_tracks',{status:'completed',ended_at:end,duration_seconds:secs,distance_m:+r.distance_m||0,updated_at:end},'id=eq.'+r.id);
    r.status='completed';r.ended_at=end;r.duration_seconds=secs;
    activeRoute147=null;routePoints147=[];
    renderRouteState147();renderRouteHistory147();renderLiveRouteMap147();
  }catch(e){alert('Fahrt konnte nicht beendet werden: '+e.message)}
}

/* ---------------- Auto mit Arbeitszeit ---------------- */
const oldStartWork147=fmStartWork;
fmStartWork=async function(){
  const before=new Set(workSessions.map(x=>+x.id));
  await oldStartWork147();
  const ws=workSessions.find(x=>!before.has(+x.id)&&x.user_id===me.id)||fmMyActiveSession();
  if(ws&&!activeRoute147){
    try{
      await createRoute147({
        work_session_id:ws.id,
        order_id:ws.order_id,
        machine_id:ws.machine_id,
        name:'Arbeitsfahrt · '+(ws.work_type||'Arbeit')
      });
    }catch(e){console.warn('Automatische Fahrtaufzeichnung:',e)}
  }
};
const oldStopWork147=fmStopWork;
fmStopWork=async function(){
  const ws=fmMyActiveSession();
  const shouldStop=!!(activeRoute147&&ws&&+activeRoute147.work_session_id===+ws.id);
  await oldStopWork147();
  if(shouldStop&&activeRoute147)await stopRoute147();
};

/* ---------------- Ansicht ---------------- */
function renderRouteState147(){
  ensureRouteUi147();
  const running=!!activeRoute147;
  E('routeStart147').hidden=running;E('routeStop147').hidden=!running;
  E('routeState147').textContent=running?'Aufzeichnung läuft':'Bereit';
  E('routeDistance147').textContent=((running?+activeRoute147.distance_m:0)/1000).toFixed(2).replace('.',',')+' km';
  E('routeDuration147').textContent=running?dur147(duration147(activeRoute147)):'00:00:00';
  E('routePointsCount147').textContent=running?routePoints147.length:0;
  ['routeName147','routeMachine147','routeOrder147','routeNotes147'].forEach(id=>{if(E(id))E(id).disabled=running});
}
setInterval(()=>{if(activeRoute147)renderRouteState147()},1000);

function renderRouteHistory147(){
  const box=E('routeHistory147');if(!box)return;
  box.innerHTML=routeTracks147.filter(x=>x.status==='completed').map(r=>`
    <div class="route-row147">
      <div>
        <b>${esc(r.name||'Fahrt')}</b>
        <p>${new Date(r.started_at).toLocaleString('de-DE')} · ${((+r.distance_m||0)/1000).toFixed(2).replace('.',',')} km · ${dur147(r.duration_seconds||duration147(r))}</p>
        <small>${esc(profileName(r.user_id))}${r.machine_id?' · '+esc(machines.find(m=>+m.id===+r.machine_id)?.name||'Maschine'):''}${r.order_id?' · Auftrag #'+r.order_id:''}</small>
      </div>
      <div class="route-actions147">
        <button class="secondary compact" data-route-show="${r.id}">Auf Karte</button>
        <button class="danger compact" data-route-del="${r.id}">Löschen</button>
      </div>
    </div>`).join('')||'<p class="muted">Noch keine gespeicherten Fahrten.</p>';

  box.querySelectorAll('[data-route-show]').forEach(b=>b.onclick=async()=>{
    const id=+b.dataset.routeShow;
    selectedRoute147=routeTracks147.find(x=>+x.id===id)||null;
    try{
      routePoints147=await select('route_track_points','select=*&route_track_id=eq.'+id+'&order=id.asc')||[];
      if(!routePoints147.length){
        alert('Für diese Fahrt sind keine GPS-Streckenpunkte gespeichert.');
        return;
      }
      renderLiveRouteMap147();
      setTimeout(()=>{
        try{routeMap147?.invalidateSize(true)}catch(_){}
        E('liveMap')?.scrollIntoView({behavior:'smooth',block:'center'});
      },120);
    }catch(err){
      alert('Strecke konnte nicht geladen werden: '+(err?.message||err));
    }
  });
  box.querySelectorAll('[data-route-del]').forEach(b=>b.onclick=async()=>{
    const id=+b.dataset.routeDel;if(!confirm('Gespeicherte Fahrt wirklich löschen?'))return;
    try{await remove('route_tracks','id=eq.'+id);routeTracks147=routeTracks147.filter(x=>+x.id!==id);if(selectedRoute147?.id===id){selectedRoute147=null;routePoints147=[]}renderRouteHistory147();renderLiveRouteMap147()}catch(e){alert(e.message)}
  });
}

/* ---------------- Live-Karte inklusive Routen ---------------- */
function renderLiveRouteMap147(){
  const host=E('liveMap'),L=LF();if(!host||!L)return;
  try{
    if(routeMap147){try{routeMap147.remove()}catch(_){} routeMap147=null}
    host.innerHTML='';
    const inner=document.createElement('div');inner.id='routeMap147Inner';inner.style.width='100%';inner.style.height='100%';host.appendChild(inner);
    routeMap147=L.map(inner,{zoomControl:true,attributionControl:true}).setView([49.5,8.5],9);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(routeMap147);
    routeLayers147=[];const fit=[];

    (typeof fields!=='undefined'?fields:[]).forEach(f=>{if(!f.geometry)return;try{const ly=L.geoJSON({type:'Feature',geometry:f.geometry,properties:{}},{style:{weight:2,fillOpacity:.06}}).addTo(routeMap147);ly.bindTooltip(esc(f.name||'Feld'));fit.push(ly.getBounds());routeLayers147.push(ly)}catch(_){}});

    (liveLocations||[]).forEach(loc=>{
      const lat=+loc.latitude,lng=+loc.longitude;if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
      const machine=machines.find(m=>+m.id===+loc.machine_id),user=profiles.find(p=>p.id===loc.user_id);
      const userColor=user?.color||'#5F8E49';
      const mk=L.circleMarker([lat,lng],{radius:8,weight:3,fillOpacity:.85,color:userColor,fillColor:userColor}).addTo(routeMap147);
      mk.bindPopup(`<b>${esc(machine?.name||'Maschine')}</b><br>${esc(user?.display_name||user?.email||'Mitarbeiter')}`);routeLayers147.push(mk);fit.push(L.latLngBounds([[lat,lng],[lat,lng]]));
    });

    if(routePoints147.length){
      const pts=routePoints147.map(p=>[+p.latitude,+p.longitude]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
      if(pts.length){
        const routeUserId=(activeRoute147||selectedRoute147)?.user_id;
        const routeUser=profiles.find(p=>p.id===routeUserId);
        const routeColor=routeUser?.color||'#5F8E49';
        const line=L.polyline(pts,{weight:5,color:routeColor}).addTo(routeMap147);routeLayers147.push(line);fit.push(line.getBounds());
        const shownRoute=activeRoute147||selectedRoute147;
        if(shownRoute){
          line.bindPopup(`<b>${esc(shownRoute.name||'Fahrt')}</b><br>${((+shownRoute.distance_m||0)/1000).toFixed(2).replace('.',',')} km · ${dur147(shownRoute.duration_seconds||duration147(shownRoute))}`);
        }
        L.circleMarker(pts[0],{radius:6,weight:2,fillOpacity:1,color:routeColor,fillColor:routeColor}).addTo(routeMap147).bindTooltip('Start');
        L.circleMarker(pts[pts.length-1],{radius:6,weight:2,fillOpacity:1,color:routeColor,fillColor:routeColor}).addTo(routeMap147).bindTooltip(activeRoute147?'Aktuell':'Ziel');
      }
    }
    if(fit.length){let b=fit[0];for(let i=1;i<fit.length;i++)b.extend(fit[i]);routeMap147.fitBounds(b,{padding:[25,25],maxZoom:16})}
    setTimeout(()=>{try{routeMap147.invalidateSize(true)}catch(_){}},120);
  }catch(e){console.warn('Routenkarte:',e)}
}
fmRenderLiveMap=renderLiveRouteMap147;
document.querySelector('nav button[data-page="livekarte"]')?.addEventListener('click',()=>setTimeout(async()=>{
  try{liveLocations=await select('live_locations','select=*&active=eq.true&order=updated_at.desc')||[]}catch(_){}
  renderLiveRouteMap147();
},180));

/* ---------------- App Load ---------------- */
const oldLoad147=load;
load=async function(){
  await oldLoad147();
  ensureRouteUi147();populateRouteSelectors147();
  await loadRoutes147();
};
setTimeout(()=>{ensureRouteUi147();populateRouteSelectors147();loadRoutes147()},2400);
})();
