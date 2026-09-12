
/* FarmManager V14 – Live-Karte + Mehrfachfelder */
(function(){
const $14=id=>document.getElementById(id);
const Leaf=()=>window.L&&typeof window.L.map==='function'?window.L:null;

/* LIVE-KARTE */
let liveMap14=null, liveLayers14=[];
function clearLive14(){
  if(!liveMap14)return;
  liveLayers14.forEach(l=>{try{liveMap14.removeLayer(l)}catch(_){}});liveLayers14=[];
}
function renderLive14(){
  const host=$14('liveMap'), Lf=Leaf(); if(!host||!Lf)return;
  try{
    try{if(fmMap&&typeof fmMap.remove==='function')fmMap.remove()}catch(_){}
    fmMap=null;
    if(!liveMap14){
      host.innerHTML='';
      const inner=document.createElement('div');
      inner.id='liveMap14Inner';inner.style.width='100%';inner.style.height='100%';
      host.appendChild(inner);
      liveMap14=Lf.map(inner,{zoomControl:true,attributionControl:true}).setView([49.47,8.44],9);
      Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(liveMap14);
    }
    clearLive14();
    const bounds=[];
    (typeof fields!=='undefined'?fields:[]).forEach(f=>{
      if(!f.geometry)return;
      try{
        const ly=Lf.geoJSON({type:'Feature',geometry:f.geometry,properties:{}},{style:{weight:2,fillOpacity:.08}}).addTo(liveMap14);
        ly.bindTooltip(esc(f.name||'Feld')); liveLayers14.push(ly); bounds.push(ly.getBounds());
      }catch(_){}
    });
    (liveLocations||[]).forEach(loc=>{
      const lat=+loc.latitude,lng=+loc.longitude;
      if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
      const machine=machines.find(m=>+m.id===+loc.machine_id);
      const user=profiles.find(p=>p.id===loc.user_id);
      const marker=Lf.circleMarker([lat,lng],{radius:9,weight:3,fillOpacity:.85}).addTo(liveMap14);
      marker.bindPopup(`<b>${esc(machine?.name||'Maschine')}</b><br>${esc(user?.display_name||user?.email||'Mitarbeiter')}`);
      liveLayers14.push(marker);bounds.push(Lf.latLngBounds([[lat,lng],[lat,lng]]));
    });
    if(bounds.length){
      let b=bounds[0];for(let i=1;i<bounds.length;i++)b.extend(bounds[i]);
      liveMap14.fitBounds(b,{padding:[25,25],maxZoom:16});
    }
    setTimeout(()=>{try{liveMap14.invalidateSize(true)}catch(_){}},150);
  }catch(err){
    console.error('Live-Karte V14',err);
    host.innerHTML=`<div style="padding:24px;color:#8b5555"><b>Live-Karte konnte nicht geladen werden.</b><br><small>${esc(err.message||'Unbekannter Fehler')}</small></div>`;
  }
}
fmRenderLiveMap=renderLive14;
if(typeof fmRefreshLocations==='function'){
  fmRefreshLocations=async function(){
    if(!token)return;
    try{
      liveLocations=await select('live_locations','select=*&active=eq.true&order=updated_at.desc')||[];
      renderLive14();
    }catch(e){console.warn(e)}
  };
}
document.querySelector('nav button[data-page="livekarte"]')?.addEventListener('click',()=>setTimeout(async()=>{
  try{liveLocations=await select('live_locations','select=*&active=eq.true&order=updated_at.desc')||[]}catch(_){}
  renderLive14();
},180));

/* ARBEITSZEIT: MEHRERE FELDER */
function ensureWorkMulti(){
  const single=$14('workField'); if(!single||$14('workFieldMulti'))return;
  single.style.display='none';
  const box=document.createElement('div');
  box.className='full work-multi-field-wrap';
  box.innerHTML=`<label>Felder / Schläge für diese Arbeitszeit</label>
    <div id="workFieldMulti" class="field-choice-list"></div>
    <small class="muted">Mehrere Felder können gleichzeitig ausgewählt werden.</small>`;
  single.parentElement.appendChild(box);
}
function selectedWorkFields14(){
  return [...document.querySelectorAll('#workFieldMulti input:checked')].map(x=>+x.value).filter(Boolean);
}
function renderWorkFields14(){
  ensureWorkMulti();
  const box=$14('workFieldMulti'); if(!box)return;
  const customerId=+($14('workCustomer')?.value||0), orderId=+($14('workOrder')?.value||0);
  const list=typeof fmCustomerFields==='function'?fmCustomerFields(customerId):[];
  const linked=new Set(typeof fmOrderFieldIds==='function'?fmOrderFieldIds(orderId):[]);
  const prev=new Set(selectedWorkFields14());
  box.innerHTML=customerId?(list.map(f=>`<label class="field-check">
      <input type="checkbox" value="${f.id}" ${(prev.has(+f.id)||linked.has(+f.id))?'checked':''}>
      <span><b>${linked.has(+f.id)?'★ ':''}${esc(f.name)}</b><small>${f.hectares?Number(f.hectares).toFixed(2)+' ha':''}${f.crop?' · '+esc(f.crop):''}</small></span>
    </label>`).join('')||'<p class="muted">Keine Felder vorhanden.</p>'):'<p class="muted">Zuerst Kunde auswählen.</p>';
}
const oldPopulateWorkFields14=fmPopulateWorkFields;
fmPopulateWorkFields=function(){oldPopulateWorkFields14();renderWorkFields14()};
$14('workCustomer')?.addEventListener('change',()=>setTimeout(renderWorkFields14,0));
$14('workOrder')?.addEventListener('change',()=>setTimeout(renderWorkFields14,0));

const oldStartWork14=fmStartWork;
fmStartWork=async function(){
  const ids=selectedWorkFields14();
  if($14('workField'))$14('workField').value=ids[0]||'';
  const before=new Set(workSessions.map(s=>+s.id));
  await oldStartWork14();
  const s=workSessions.find(x=>!before.has(+x.id)&&x.user_id===me?.id)||fmMyActiveSession();
  if(!s)return;
  for(const id of ids){try{await fmEnsureOrderField(s.order_id,id,false)}catch(e){console.warn(e)}}
  if(ids.length&&!fmOpenFieldSegment(s.id)){try{await fmStartFieldSegment(s,ids[0])}catch(e){console.warn(e)}}
  fmRenderFieldTimeline();renderOrders();
};

/* AUFTRAGSEDITOR: MEHRERE FELDER */
function ensureOrderFields14(){
  const editor=$14('fmOrderEditor138'); if(!editor||$14('fmOeFields14'))return;
  const notes=$14('fmOeNotes')?.closest('.full');
  const box=document.createElement('div');box.className='full';
  box.innerHTML=`<label>Felder / Schläge</label><div id="fmOeFields14" class="field-choice-list"></div>
    <small class="muted">Mehrere Felder können ausgewählt werden.</small>`;
  if(notes)notes.parentElement.insertBefore(box,notes);
}
function renderOrderFields14(orderId){
  ensureOrderFields14(); const box=$14('fmOeFields14'); if(!box)return;
  const o=orders.find(x=>+x.id===+orderId); if(!o)return;
  const customerId=+($14('fmOeCustomer')?.value||o.customer_id||0);
  const list=typeof fmCustomerFields==='function'?fmCustomerFields(customerId):[];
  const selected=new Set(typeof fmOrderFieldIds==='function'?fmOrderFieldIds(orderId):[]);
  box.innerHTML=customerId?(list.map(f=>`<label class="field-check"><input type="checkbox" value="${f.id}" ${selected.has(+f.id)?'checked':''}>
      <span><b>${esc(f.name)}</b><small>${f.hectares?Number(f.hectares).toFixed(2)+' ha':''}${f.crop?' · '+esc(f.crop):''}</small></span>
    </label>`).join('')||'<p class="muted">Keine Felder vorhanden.</p>'):'<p class="muted">Kein Kunde ausgewählt.</p>';
}
function selectedOrderFields14(){
  return [...document.querySelectorAll('#fmOeFields14 input:checked')].map(x=>+x.value).filter(Boolean);
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-edit138]');if(!b)return;
  setTimeout(()=>{
    const id=+b.dataset.edit138;renderOrderFields14(id);
    if($14('fmOeCustomer'))$14('fmOeCustomer').onchange=()=>renderOrderFields14(id);
  },80);
});
setTimeout(()=>{
  ensureOrderFields14();
  const save=$14('fmOeSave'); if(!save||save.dataset.v14bound)return;
  save.dataset.v14bound='1';
  const old=save.onclick;
  save.onclick=async function(e){
    const orderId=+($14('fmOeId')?.value||0), selected=selectedOrderFields14();
    if(old)await old.call(this,e);
    if(!orderId)return;
    try{
      await remove('order_fields','order_id=eq.'+orderId);
      for(const fieldId of selected){
        await insert('order_fields',{order_id:orderId,field_id:fieldId,added_during_work:false,created_by:me.id},false);
      }
      if(typeof fmReloadFieldData==='function')await fmReloadFieldData();
    }catch(err){alert('Feldzuordnung konnte nicht gespeichert werden: '+err.message)}
  };
},1300);

setTimeout(()=>{
  ensureWorkMulti();renderWorkFields14();ensureOrderFields14();
  if($14('p-livekarte')?.classList.contains('active'))renderLive14();
},1300);
})();
