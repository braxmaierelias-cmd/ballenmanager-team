
/* FarmManager V15.3 – Management: Diesel + Ersatzteile + Kosten */
(function(){
const E=id=>document.getElementById(id);
let diesel=[],parts=[],costs=[],fuelLogs=[],movements=[];
const money=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(+v||0);
const n=id=>+(E(id)?.value||0);
const machinePark=()=> (machines||[]).filter(m=>(m.machine_kind||'maschinenpark')!=='anbaugeraet'&&m.active!==false);

function setupTabs(){
 document.querySelectorAll('[data-mgmt-tab152]').forEach(b=>b.onclick=()=>{
   document.querySelectorAll('[data-mgmt-tab152]').forEach(x=>x.classList.toggle('active',x===b));
   E('mgmtDiesel152').hidden=b.dataset.mgmtTab152!=='diesel';
   E('mgmtParts152').hidden=b.dataset.mgmtTab152!=='parts';
   E('mgmtCosts152').hidden=b.dataset.mgmtTab152!=='costs';
 });
}
function ensureDieselAdvanced(){
 const panel=E('mgmtDiesel152'); if(!panel||E('fuelMachineCard153'))return;
 const summary=E('dieselSummary152');
 const html=document.createElement('div');
 html.innerHTML=`
 <div class="diesel-subtabs153">
   <button class="active" data-diesel-tab153="machines">Traktor-Verbrauch</button>
   <button data-diesel-tab153="reserve">Eigene Dieselreserve</button>
 </div>
 <div id="dieselMachines153">
   <div class="card" id="fuelMachineCard153">
    <div class="sectionhead"><div><span class="section-kicker">TANKUNGEN</span><h3>Tankung für Traktor / Maschine eintragen</h3></div></div>
    <div class="grid">
      <div><label>Maschine *</label><select id="fuelMachine153"></select></div>
      <div><label>Datum</label><input id="fuelDate153" type="date"></div>
      <div><label>Getankte Liter *</label><input id="fuelLiters153" type="number" min="0" step="0.1"></div>
      <div><label>Betriebsstunden aktuell</label><input id="fuelHours153" type="number" min="0" step="0.1"></div>
      <div><label>Preis €/l</label><input id="fuelPrice153" type="number" min="0" step="0.001"></div>
      <div><label>Entnahme aus eigenem Tank</label><select id="fuelReserve153"></select></div>
      <div class="full"><label>Notiz</label><input id="fuelNotes153"></div>
    </div>
    <button id="saveFuel153">Tankung speichern</button>
   </div>
   <div id="machineFuelOverview153"></div>
  </div>
  <div id="dieselReserve153" hidden>
    <div class="card">
      <div class="sectionhead"><div><span class="section-kicker">BESTANDSKONTROLLE</span><h3>Eigene Dieselreserve</h3></div></div>
      <div class="grid">
        <div><label>Tank</label><select id="moveReserve153"></select></div>
        <div><label>Bewegung</label><select id="moveType153"><option value="zugang">Zugang / Lieferung</option><option value="entnahme">Entnahme</option><option value="korrektur">Bestand korrigieren</option></select></div>
        <div><label>Liter</label><input id="moveLiters153" type="number" min="0" step="0.1"></div>
        <div><label>Preis €/l</label><input id="movePrice153" type="number" min="0" step="0.001"></div>
        <div><label>Datum</label><input id="moveDate153" type="date"></div>
        <div class="full"><label>Notiz</label><input id="moveNotes153"></div>
      </div>
      <button id="saveMove153">Dieselbewegung buchen</button>
    </div>
    <div id="dieselMovementList153" class="card"></div>
  </div>`;
 summary.after(html);
 document.querySelectorAll('[data-diesel-tab153]').forEach(b=>b.onclick=()=>{
   document.querySelectorAll('[data-diesel-tab153]').forEach(x=>x.classList.toggle('active',x===b));
   E('dieselMachines153').hidden=b.dataset.dieselTab153!=='machines';
   E('dieselReserve153').hidden=b.dataset.dieselTab153!=='reserve';
 });
 E('fuelDate153').value=new Date().toISOString().slice(0,10);
 E('moveDate153').value=new Date().toISOString().slice(0,10);
 E('saveFuel153').onclick=saveFuel;
 E('saveMove153').onclick=saveMovement;
}
function populateFuelSelectors(){
 ensureDieselAdvanced();
 const m=E('fuelMachine153'),r=E('fuelReserve153'),mr=E('moveReserve153'); if(!m||!r||!mr)return;
 m.innerHTML='<option value="">Maschine wählen …</option>'+machinePark().map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
 const opts='<option value="">Kein eigener Tank</option>'+diesel.map(x=>`<option value="${x.id}">${esc(x.name)} · ${(+x.current_l||0).toLocaleString('de-DE')} l</option>`).join('');
 r.innerHTML=opts; mr.innerHTML='<option value="">Tank wählen …</option>'+diesel.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
}
async function saveFuel(){
 const machine_id=+E('fuelMachine153').value||0, liters=n('fuelLiters153'); if(!machine_id||liters<=0)return alert('Bitte Maschine und Liter eingeben.');
 const reserve_id=+E('fuelReserve153').value||null;
 try{
   await insert('machine_fuel_logs',{
     machine_id,log_date:E('fuelDate153').value||new Date().toISOString().slice(0,10),
     liters,operating_hours:n('fuelHours153')||null,price_per_l:n('fuelPrice153')||null,
     source_tank_id:reserve_id,notes:E('fuelNotes153').value.trim()||null,created_by:me.id
   },false);
   if(reserve_id){
     const d=diesel.find(x=>+x.id===reserve_id);
     if(d){
       const newQty=Math.max(0,(+d.current_l||0)-liters);
       await update('diesel_reserves',{current_l:newQty,updated_at:new Date().toISOString()},'id=eq.'+reserve_id);
       await insert('diesel_movements',{reserve_id,movement_type:'entnahme',liters,movement_date:E('fuelDate153').value||new Date().toISOString().slice(0,10),machine_id,price_per_l:n('fuelPrice153')||null,notes:'Tankung '+(machines.find(x=>+x.id===machine_id)?.name||''),created_by:me.id},false);
     }
   }
   E('fuelLiters153').value='';E('fuelHours153').value='';E('fuelNotes153').value='';
   await loadManagement();
 }catch(e){alert('Tankung konnte nicht gespeichert werden: '+e.message)}
}
async function saveMovement(){
 const reserve_id=+E('moveReserve153').value||0,liters=n('moveLiters153'); if(!reserve_id||liters<=0)return alert('Bitte Tank und Liter eingeben.');
 const type=E('moveType153').value,d=diesel.find(x=>+x.id===reserve_id); if(!d)return;
 let current=+d.current_l||0;
 if(type==='zugang')current+=liters;
 else if(type==='entnahme')current=Math.max(0,current-liters);
 else if(type==='korrektur')current=liters;
 try{
   await update('diesel_reserves',{current_l:current,price_per_l:n('movePrice153')||d.price_per_l||null,updated_at:new Date().toISOString()},'id=eq.'+reserve_id);
   await insert('diesel_movements',{reserve_id,movement_type:type,liters,movement_date:E('moveDate153').value||new Date().toISOString().slice(0,10),price_per_l:n('movePrice153')||null,notes:E('moveNotes153').value.trim()||null,created_by:me.id},false);
   E('moveLiters153').value='';E('moveNotes153').value='';await loadManagement();
 }catch(e){alert('Dieselbewegung konnte nicht gespeichert werden: '+e.message)}
}
function machineStats(machineId){
 const logs=fuelLogs.filter(x=>+x.machine_id===+machineId).sort((a,b)=>String(a.log_date).localeCompare(String(b.log_date))||a.id-b.id);
 const liters=logs.reduce((s,x)=>s+(+x.liters||0),0),cost=logs.reduce((s,x)=>s+(+x.liters||0)*(+x.price_per_l||0),0);
 const withH=logs.filter(x=>x.operating_hours!=null);
 let hourDiff=0;
 if(withH.length>=2)hourDiff=(+withH[withH.length-1].operating_hours||0)-(+withH[0].operating_hours||0);
 const lph=hourDiff>0?liters/hourDiff:null;
 return {logs,liters,cost,hourDiff,lph};
}
function renderMachineFuel(){
 const box=E('machineFuelOverview153');if(!box)return;
 box.innerHTML='<div class="machine-fuel-grid153">'+machinePark().map(m=>{
   const st=machineStats(m.id),last=st.logs[st.logs.length-1];
   return `<div class="card machine-fuel-card153">
    <div class="sectionhead"><div><span class="section-kicker">MASCHINE</span><h3>${esc(m.name)}</h3></div><span class="fuel-pill153">${st.lph!=null?st.lph.toFixed(1).replace('.',',')+' l/h':'— l/h'}</span></div>
    <div class="fuel-stats153">
      <div><small>Getankt gesamt</small><b>${st.liters.toFixed(1).replace('.',',')} l</b></div>
      <div><small>Betriebsstunden Zeitraum</small><b>${st.hourDiff>0?st.hourDiff.toFixed(1).replace('.',',')+' h':'—'}</b></div>
      <div><small>Kraftstoffkosten</small><b>${money(st.cost)}</b></div>
      <div><small>Letzte Tankung</small><b>${last?new Date(last.log_date+'T12:00:00').toLocaleDateString('de-DE'):'—'}</b></div>
    </div>
    <div class="fuel-log-mini153">${st.logs.slice().reverse().slice(0,5).map(x=>`<div><span>${new Date(x.log_date+'T12:00:00').toLocaleDateString('de-DE')}</span><b>${(+x.liters).toFixed(1)} l</b><span>${x.operating_hours!=null?(+x.operating_hours).toFixed(1)+' h':'—'}</span><button class="danger compact" data-fuellog-del153="${x.id}">×</button></div>`).join('')||'<p class="muted">Noch keine Tankungen.</p>'}</div>
   </div>`;
 }).join('')+'</div>';
 document.querySelectorAll('[data-fuellog-del153]').forEach(b=>b.onclick=async()=>{if(!confirm('Tankung löschen?'))return;await remove('machine_fuel_logs','id=eq.'+b.dataset.fuellogDel153);await loadManagement()});
}
function renderReserveMovement(){
 const box=E('dieselMovementList153');if(!box)return;
 box.innerHTML='<h3>Letzte Dieselbewegungen</h3>'+movements.slice(0,30).map(x=>{
   const d=diesel.find(z=>+z.id===+x.reserve_id),m=machines.find(z=>+z.id===+x.machine_id);
   return `<div class="movement-row153"><span>${new Date(x.movement_date+'T12:00:00').toLocaleDateString('de-DE')}</span><b>${esc(d?.name||'Tank')}</b><span>${esc(x.movement_type)}</span><strong>${(+x.liters||0).toFixed(1)} l</strong><span>${m?esc(m.name):''}</span></div>`;
 }).join('')||'<p class="muted">Noch keine Bewegungen.</p>';
}

/* existing V15.2 basics: diesel/parts/costs */
function renderDiesel(){
 const total=diesel.reduce((s,x)=>s+(+x.current_l||0),0),capacity=diesel.reduce((s,x)=>s+(+x.capacity_l||0),0),value=diesel.reduce((s,x)=>s+(+x.current_l||0)*(+x.price_per_l||0),0),low=diesel.filter(x=>(+x.current_l||0)<=(+x.min_l||0)).length;
 E('dieselSummary152').innerHTML=`<div><small>Eigener Diesel</small><b>${total.toLocaleString('de-DE')} l</b></div><div><small>Kapazität</small><b>${capacity.toLocaleString('de-DE')} l</b></div><div><small>Warenwert</small><b>${money(value)}</b></div><div><small>Nachbestellen</small><b>${low}</b></div>`;
 E('dieselList152').innerHTML=diesel.map(d=>`<div class="management-row152"><div class="management-main152"><b>${esc(d.name)}</b><p>${(+d.current_l||0).toLocaleString('de-DE')} l / ${(+d.capacity_l||0).toLocaleString('de-DE')} l · ${d.price_per_l?money(d.price_per_l)+'/l':'kein Preis'}</p></div><div class="management-actions152"><button class="secondary compact" data-dedit="${d.id}">Bearbeiten</button><button class="danger compact" data-ddel="${d.id}">Löschen</button></div></div>`).join('')||'<p class="muted">Noch kein eigener Dieseltank.</p>';
 document.querySelectorAll('[data-dedit]').forEach(b=>b.onclick=()=>editDiesel(+b.dataset.dedit));document.querySelectorAll('[data-ddel]').forEach(b=>b.onclick=async()=>{if(confirm('Tank löschen?')){await remove('diesel_reserves','id=eq.'+b.dataset.ddel);await loadManagement()}});
}
function editDiesel(id){const d=diesel.find(x=>+x.id===id);if(!d)return;E('dieselId152').value=d.id;E('dieselName152').value=d.name||'';E('dieselCapacity152').value=d.capacity_l||0;E('dieselCurrent152').value=d.current_l||0;E('dieselMin152').value=d.min_l||0;E('dieselPrice152').value=d.price_per_l||'';E('dieselNotes152').value=d.notes||'';E('dieselForm152').hidden=false}
async function saveDiesel(){const name=E('dieselName152').value.trim();if(!name)return alert('Bezeichnung fehlt.');const obj={name,capacity_l:n('dieselCapacity152'),current_l:n('dieselCurrent152'),min_l:n('dieselMin152'),price_per_l:n('dieselPrice152')||null,notes:E('dieselNotes152').value.trim()||null,updated_at:new Date().toISOString()};const id=+E('dieselId152').value||0;if(id)await update('diesel_reserves',obj,'id=eq.'+id);else await insert('diesel_reserves',{...obj,created_by:me.id},false);E('dieselForm152').hidden=true;await loadManagement()}
function renderParts(){const value=parts.reduce((s,x)=>s+(+x.quantity||0)*(+x.unit_cost||0),0),low=parts.filter(x=>(+x.quantity||0)<=(+x.min_quantity||0)).length;E('partsSummary152').innerHTML=`<div><small>Positionen</small><b>${parts.length}</b></div><div><small>Lagerwert</small><b>${money(value)}</b></div><div><small>Nachbestellen</small><b>${low}</b></div>`;E('partsList152').innerHTML=parts.map(p=>`<div class="management-row152"><div><b>${esc(p.name)}</b><p>${(+p.quantity||0)} ${esc(p.unit||'Stück')} · ${money(p.unit_cost)}</p></div></div>`).join('')||'<p class="muted">Noch keine Ersatzteile.</p>'}
function populateCostMachines(){if(!E('costMachine152'))return;E('costMachine152').innerHTML='<option value="">Keine Maschine</option>'+machinePark().map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}
function calcCost(){const h=n('costHours152'),dieselCost=h*n('costDieselUse152')*n('costDieselPrice152'),labor=h*n('costLabor152'),mach=h*n('costMachineRate152'),base=dieselCost+labor+mach+n('costOther152'),price=base*(1+n('costMarkup152')/100);E('calcDiesel152').textContent=money(dieselCost);E('calcLabor152').textContent=money(labor);E('calcMachine152').textContent=money(mach);E('calcBase152').textContent=money(base);E('calcPrice152').textContent=money(price)}
function renderCosts(){E('costList152').innerHTML=costs.map(c=>`<div class="management-row152"><div><b>${esc(c.name)}</b><p>${(+c.hours||0)} h · Diesel ${(+c.diesel_l_per_h||0)} l/h</p></div></div>`).join('')||'<p class="muted">Noch keine Kalkulationen.</p>'}

async function loadManagement(){
 if(!token)return;
 ensureDieselAdvanced();
 [diesel,parts,costs,fuelLogs,movements]=await Promise.all([
  select('diesel_reserves','select=*&order=name.asc'),select('spare_parts','select=*&order=name.asc'),select('cost_calculations','select=*&order=updated_at.desc'),
  select('machine_fuel_logs','select=*&order=log_date.desc,id.desc'),select('diesel_movements','select=*&order=movement_date.desc,id.desc')
 ]);
 renderDiesel();renderParts();renderCosts();populateFuelSelectors();populateCostMachines();renderMachineFuel();renderReserveMovement();
}
function setup(){
 setupTabs();ensureDieselAdvanced();
 E('newDiesel152').onclick=()=>{E('dieselId152').value='';E('dieselName152').value='';E('dieselCapacity152').value='';E('dieselCurrent152').value='';E('dieselMin152').value='';E('dieselPrice152').value='';E('dieselNotes152').value='';E('dieselForm152').hidden=false};
 E('closeDiesel152').onclick=()=>E('dieselForm152').hidden=true;E('saveDiesel152').onclick=saveDiesel;
 ['costHours152','costDieselUse152','costDieselPrice152','costLabor152','costMachineRate152','costOther152','costMarkup152'].forEach(id=>E(id)?.addEventListener('input',calcCost));
 document.querySelector('nav button[data-page="management"]')?.addEventListener('click',()=>setTimeout(loadManagement,50));
}
const oldLoad=load;load=async function(){await oldLoad();await loadManagement()};
setTimeout(async()=>{setup();await loadManagement()},1800);
})();
