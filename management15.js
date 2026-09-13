
/* FarmManager V15.2 – Management */
(function(){
const E=id=>document.getElementById(id);
let diesel152=[],parts152=[],costs152=[];
const money=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(+v||0);
const num=(id)=>+(E(id)?.value||0);

function setupTabs152(){
  document.querySelectorAll('[data-mgmt-tab152]').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('[data-mgmt-tab152]').forEach(x=>x.classList.toggle('active',x===b));
    ['diesel','parts','costs'].forEach(k=>{
      const map={diesel:'mgmtDiesel152',parts:'mgmtParts152',costs:'mgmtCosts152'};
      E(map[k]).hidden=b.dataset.mgmtTab152!==k;
    });
  });
}

async function loadManagement152(){
  if(!token)return;
  try{
    [diesel152,parts152,costs152]=await Promise.all([
      select('diesel_reserves','select=*&order=name.asc'),
      select('spare_parts','select=*&order=name.asc'),
      select('cost_calculations','select=*&order=updated_at.desc')
    ]);
    renderDiesel152();renderParts152();renderCosts152();populateCostMachines152();
  }catch(e){console.warn('Management laden:',e)}
}

/* DIESEL */
function resetDiesel152(){
  E('dieselId152').value='';E('dieselName152').value='';E('dieselCapacity152').value='';
  E('dieselCurrent152').value='';E('dieselMin152').value='';E('dieselPrice152').value='';
  E('dieselNotes152').value='';E('dieselFormTitle152').textContent='Dieselreserve anlegen';E('dieselForm152').hidden=false;
}
async function saveDiesel152(){
  const name=E('dieselName152').value.trim();if(!name)return alert('Bitte Bezeichnung eingeben.');
  const obj={name,capacity_l:num('dieselCapacity152'),current_l:num('dieselCurrent152'),min_l:num('dieselMin152'),
    price_per_l:num('dieselPrice152')||null,notes:E('dieselNotes152').value.trim()||null,updated_at:new Date().toISOString()};
  const id=+E('dieselId152').value||0;
  try{
    if(id)await update('diesel_reserves',obj,'id=eq.'+id);
    else await insert('diesel_reserves',{...obj,created_by:me.id},false);
    E('dieselForm152').hidden=true;await loadManagement152();
  }catch(e){alert('Dieselbestand konnte nicht gespeichert werden: '+e.message)}
}
function editDiesel152(id){
  const d=diesel152.find(x=>+x.id===+id);if(!d)return;
  E('dieselId152').value=d.id;E('dieselName152').value=d.name||'';E('dieselCapacity152').value=d.capacity_l||0;
  E('dieselCurrent152').value=d.current_l||0;E('dieselMin152').value=d.min_l||0;E('dieselPrice152').value=d.price_per_l||'';
  E('dieselNotes152').value=d.notes||'';E('dieselFormTitle152').textContent='Dieselreserve bearbeiten';E('dieselForm152').hidden=false;
  E('dieselForm152').scrollIntoView({behavior:'smooth'});
}
function renderDiesel152(){
  const total=diesel152.reduce((s,x)=>s+(+x.current_l||0),0);
  const capacity=diesel152.reduce((s,x)=>s+(+x.capacity_l||0),0);
  const value=diesel152.reduce((s,x)=>s+(+x.current_l||0)*(+x.price_per_l||0),0);
  const low=diesel152.filter(x=>(+x.current_l||0)<=(+x.min_l||0)).length;
  E('dieselSummary152').innerHTML=`
    <div><small>Diesel gesamt</small><b>${total.toLocaleString('de-DE')} l</b></div>
    <div><small>Kapazität</small><b>${capacity.toLocaleString('de-DE')} l</b></div>
    <div><small>Warenwert</small><b>${money(value)}</b></div>
    <div><small>Unter Mindestbestand</small><b>${low}</b></div>`;
  E('dieselList152').innerHTML=diesel152.map(d=>{
    const pct=d.capacity_l>0?Math.min(100,(+d.current_l/+d.capacity_l)*100):0;
    const low=(+d.current_l||0)<=(+d.min_l||0);
    return `<div class="management-row152 ${low?'warning152':''}">
      <div class="management-main152"><b>${esc(d.name)}</b><p>${(+d.current_l||0).toLocaleString('de-DE')} l von ${(+d.capacity_l||0).toLocaleString('de-DE')} l${d.price_per_l?' · '+money(d.price_per_l)+'/l':''}</p>
      <div class="fuel-bar152"><i style="width:${pct}%"></i></div></div>
      <div class="management-actions152"><button class="secondary compact" data-diesel-edit152="${d.id}">Bearbeiten</button><button class="danger compact" data-diesel-del152="${d.id}">Löschen</button></div>
    </div>`;
  }).join('')||'<div class="card"><p class="muted">Noch keine Dieselreserve angelegt.</p></div>';
  document.querySelectorAll('[data-diesel-edit152]').forEach(b=>b.onclick=()=>editDiesel152(+b.dataset.dieselEdit152));
  document.querySelectorAll('[data-diesel-del152]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Dieselbestand wirklich löschen?'))return;await remove('diesel_reserves','id=eq.'+b.dataset.dieselDel152);await loadManagement152();
  });
}

/* ERSATZTEILE */
function resetPart152(){
  ['partId152','partName152','partNumber152','partCategory152','partQty152','partMin152','partCost152','partLocation152','partNotes152'].forEach(id=>E(id).value='');
  E('partUnit152').value='Stück';E('partFormTitle152').textContent='Ersatzteil anlegen';E('partForm152').hidden=false;
}
async function savePart152(){
  const name=E('partName152').value.trim();if(!name)return alert('Bitte Bezeichnung eingeben.');
  const obj={name,part_number:E('partNumber152').value.trim()||null,category:E('partCategory152').value.trim()||null,
    quantity:num('partQty152'),min_quantity:num('partMin152'),unit:E('partUnit152').value.trim()||'Stück',
    unit_cost:num('partCost152'),location:E('partLocation152').value.trim()||null,notes:E('partNotes152').value.trim()||null,updated_at:new Date().toISOString()};
  const id=+E('partId152').value||0;
  if(id)await update('spare_parts',obj,'id=eq.'+id);else await insert('spare_parts',{...obj,created_by:me.id},false);
  E('partForm152').hidden=true;await loadManagement152();
}
function editPart152(id){
  const p=parts152.find(x=>+x.id===+id);if(!p)return;
  E('partId152').value=p.id;E('partName152').value=p.name||'';E('partNumber152').value=p.part_number||'';E('partCategory152').value=p.category||'';
  E('partQty152').value=p.quantity||0;E('partMin152').value=p.min_quantity||0;E('partUnit152').value=p.unit||'Stück';E('partCost152').value=p.unit_cost||0;
  E('partLocation152').value=p.location||'';E('partNotes152').value=p.notes||'';E('partFormTitle152').textContent='Ersatzteil bearbeiten';E('partForm152').hidden=false;
  E('partForm152').scrollIntoView({behavior:'smooth'});
}
function renderParts152(){
  const total=parts152.reduce((s,x)=>s+(+x.quantity||0),0),value=parts152.reduce((s,x)=>s+(+x.quantity||0)*(+x.unit_cost||0),0);
  const low=parts152.filter(x=>(+x.quantity||0)<=(+x.min_quantity||0)).length;
  E('partsSummary152').innerHTML=`<div><small>Positionen</small><b>${parts152.length}</b></div><div><small>Menge gesamt</small><b>${total.toLocaleString('de-DE')}</b></div><div><small>Lagerwert</small><b>${money(value)}</b></div><div><small>Nachbestellen</small><b>${low}</b></div>`;
  E('partsList152').innerHTML=parts152.map(p=>`<div class="management-row152 ${(+p.quantity||0)<=(+p.min_quantity||0)?'warning152':''}">
    <div class="management-main152"><b>${esc(p.name)}</b><p>${p.part_number?esc(p.part_number)+' · ':''}${(+p.quantity||0).toLocaleString('de-DE')} ${esc(p.unit||'Stück')} · ${money(p.unit_cost)} / Einheit${p.location?' · '+esc(p.location):''}</p></div>
    <div class="management-actions152"><button class="secondary compact" data-part-edit152="${p.id}">Bearbeiten</button><button class="danger compact" data-part-del152="${p.id}">Löschen</button></div>
  </div>`).join('')||'<div class="card"><p class="muted">Noch keine Ersatzteile angelegt.</p></div>';
  document.querySelectorAll('[data-part-edit152]').forEach(b=>b.onclick=()=>editPart152(+b.dataset.partEdit152));
  document.querySelectorAll('[data-part-del152]').forEach(b=>b.onclick=async()=>{if(!confirm('Ersatzteil wirklich löschen?'))return;await remove('spare_parts','id=eq.'+b.dataset.partDel152);await loadManagement152()});
}

/* KOSTEN */
function populateCostMachines152(){
  const sel=E('costMachine152');if(!sel)return;const v=sel.value;
  sel.innerHTML='<option value="">Keine Maschine</option>'+(machines||[]).filter(m=>(m.machine_kind||'maschinenpark')!=='anbaugeraet').map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  if(v)sel.value=v;
}
function calc152(){
  const h=num('costHours152'),diesel=h*num('costDieselUse152')*num('costDieselPrice152'),labor=h*num('costLabor152'),machine=h*num('costMachineRate152'),other=num('costOther152');
  const base=diesel+labor+machine+other,price=base*(1+num('costMarkup152')/100);
  E('calcDiesel152').textContent=money(diesel);E('calcLabor152').textContent=money(labor);E('calcMachine152').textContent=money(machine);E('calcBase152').textContent=money(base);E('calcPrice152').textContent=money(price);
  return {diesel,labor,machine,base,price};
}
function resetCost152(){
  E('costId152').value='';E('costName152').value='';E('costCategory152').value='';E('costMachine152').value='';E('costHours152').value='1';
  ['costDieselUse152','costDieselPrice152','costLabor152','costMachineRate152','costOther152','costMarkup152'].forEach(id=>E(id).value='0');
  E('costNotes152').value='';E('deleteCostCalc152').hidden=true;calc152();
}
async function saveCost152(){
  const name=E('costName152').value.trim();if(!name)return alert('Bitte Bezeichnung eingeben.');
  const obj={name,category:E('costCategory152').value.trim()||null,machine_id:+E('costMachine152').value||null,hours:num('costHours152'),
    diesel_l_per_h:num('costDieselUse152'),diesel_price:num('costDieselPrice152'),labor_per_h:num('costLabor152'),
    machine_per_h:num('costMachineRate152'),other_costs:num('costOther152'),markup_percent:num('costMarkup152'),
    notes:E('costNotes152').value.trim()||null,updated_at:new Date().toISOString()};
  const id=+E('costId152').value||0;
  if(id)await update('cost_calculations',obj,'id=eq.'+id);else await insert('cost_calculations',{...obj,created_by:me.id},false);
  await loadManagement152();resetCost152();
}
function editCost152(id){
  const c=costs152.find(x=>+x.id===+id);if(!c)return;
  E('costId152').value=c.id;E('costName152').value=c.name||'';E('costCategory152').value=c.category||'';E('costMachine152').value=c.machine_id||'';
  E('costHours152').value=c.hours||0;E('costDieselUse152').value=c.diesel_l_per_h||0;E('costDieselPrice152').value=c.diesel_price||0;
  E('costLabor152').value=c.labor_per_h||0;E('costMachineRate152').value=c.machine_per_h||0;E('costOther152').value=c.other_costs||0;
  E('costMarkup152').value=c.markup_percent||0;E('costNotes152').value=c.notes||'';E('deleteCostCalc152').hidden=false;calc152();
  E('mgmtCosts152').scrollIntoView({behavior:'smooth'});
}
function storedPrice152(c){
  const base=(+c.hours||0)*((+c.diesel_l_per_h||0)*(+c.diesel_price||0)+(+c.labor_per_h||0)+(+c.machine_per_h||0))+(+c.other_costs||0);
  return base*(1+(+c.markup_percent||0)/100);
}
function renderCosts152(){
  E('costList152').innerHTML=costs152.map(c=>`<div class="management-row152"><div class="management-main152"><b>${esc(c.name)}</b><p>${c.category?esc(c.category)+' · ':''}${(+c.hours||0).toLocaleString('de-DE')} h · Empfehlung ${money(storedPrice152(c))}</p></div><div class="management-actions152"><button class="secondary compact" data-cost-edit152="${c.id}">Öffnen</button></div></div>`).join('')||'<p class="muted">Noch keine Kalkulation gespeichert.</p>';
  document.querySelectorAll('[data-cost-edit152]').forEach(b=>b.onclick=()=>editCost152(+b.dataset.costEdit152));
}

function setupManagement152(){
  setupTabs152();
  E('newDiesel152').onclick=resetDiesel152;E('closeDiesel152').onclick=()=>E('dieselForm152').hidden=true;E('saveDiesel152').onclick=saveDiesel152;
  E('newPart152').onclick=resetPart152;E('closePart152').onclick=()=>E('partForm152').hidden=true;E('savePart152').onclick=savePart152;
  E('newCostCalc152').onclick=resetCost152;E('saveCostCalc152').onclick=saveCost152;E('resetCostCalc152').onclick=resetCost152;
  E('deleteCostCalc152').onclick=async()=>{const id=+E('costId152').value||0;if(!id||!confirm('Kalkulation wirklich löschen?'))return;await remove('cost_calculations','id=eq.'+id);await loadManagement152();resetCost152()};
  ['costHours152','costDieselUse152','costDieselPrice152','costLabor152','costMachineRate152','costOther152','costMarkup152'].forEach(id=>E(id).addEventListener('input',calc152));
  document.querySelector('nav button[data-page="management"]')?.addEventListener('click',()=>setTimeout(loadManagement152,50));
  resetCost152();
}

const oldLoad152=load;
load=async function(){await oldLoad152();await loadManagement152()};
setTimeout(async()=>{setupManagement152();await loadManagement152()},1800);
})();
