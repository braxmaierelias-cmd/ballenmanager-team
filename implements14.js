
/* FarmManager V14.2 – Maschinenpark + Anbaugeräte */
(function(){
const E=id=>document.getElementById(id);

function machinePark(){return (machines||[]).filter(m=>(m.machine_kind||'maschinenpark')!=='anbaugeraet' && m.active!==false)}
function implements(){return (machines||[]).filter(m=>(m.machine_kind||'maschinenpark')==='anbaugeraet' && m.active!==false)}

function optionList(list,selected=''){
  return '<option value="">—</option>'+list.map(m=>`<option value="${m.id}" ${String(selected)===String(m.id)?'selected':''}>${esc(m.name)}${m.category?' · '+esc(m.category):''}${m.width_m?' · '+Number(m.width_m).toFixed(2)+' m':''}</option>`).join('');
}

/* ---------- Maschinen-Seite in Maschinenpark + Anbaugeräte aufteilen ---------- */
function setupMachineTabs(){
  const page=E('p-maschinen'); if(!page||E('machineTabs142'))return;
  const head=page.querySelector('.pagehead');
  if(!head)return;

  const tabs=document.createElement('div');
  tabs.id='machineTabs142';
  tabs.className='machine-tabs';
  tabs.innerHTML=`<button class="active" data-mtab="park">Maschinenpark</button><button data-mtab="implement">Anbaugeräte</button>`;
  head.after(tabs);

  const btn=E('newMachineTop');
  if(btn) btn.textContent='+ Neue Maschine';

  tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
    page.dataset.machineTab=b.dataset.mtab;
    if(btn)btn.textContent=b.dataset.mtab==='implement'?'+ Neues Anbaugerät':'+ Neue Maschine';
    renderMachines();
  });
  page.dataset.machineTab='park';
}

function ensureMachineExtraFields(){
  const form=E('machineFormCard')||E('machineId')?.closest('.card');
  if(!form||E('machineKind142'))return;

  const grid=form.querySelector('.grid');
  if(!grid)return;

  const kindWrap=document.createElement('div');
  kindWrap.innerHTML=`<label>Typ</label><select id="machineKind142"><option value="maschinenpark">Maschinenpark</option><option value="anbaugeraet">Anbaugerät</option></select>`;
  grid.insertBefore(kindWrap,grid.firstChild);

  const widthWrap=document.createElement('div');
  widthWrap.id='machineWidthWrap142';
  widthWrap.innerHTML=`<label>Arbeitsbreite (m)</label><input id="machineWidth142" type="number" step="0.01" min="0" placeholder="z. B. 3.00">`;
  grid.insertBefore(widthWrap,kindWrap.nextSibling);

  E('machineKind142').onchange=()=>{
    widthWrap.hidden=E('machineKind142').value!=='anbaugeraet';
  };
  widthWrap.hidden=true;
}

function fillMachineExtra(m){
  ensureMachineExtraFields();
  const kind=m?.machine_kind||'maschinenpark';
  E('machineKind142').value=kind;
  E('machineWidth142').value=m?.width_m??'';
  E('machineWidthWrap142').hidden=kind!=='anbaugeraet';
}

const oldResetMachine142=resetMachine;
resetMachine=function(){
  oldResetMachine142();
  ensureMachineExtraFields();
  const tab=E('p-maschinen')?.dataset.machineTab||'park';
  const kind=tab==='implement'?'anbaugeraet':'maschinenpark';
  E('machineKind142').value=kind;
  E('machineWidth142').value='';
  E('machineWidthWrap142').hidden=kind!=='anbaugeraet';
};

const oldRenderMachines142=renderMachines;
renderMachines=function(){
  setupMachineTabs();ensureMachineExtraFields();

  const page=E('p-maschinen');
  const tab=page?.dataset.machineTab||'park';
  const list=tab==='implement'?implements():machinePark();

  const box=E('machineList');
  if(box){
    box.innerHTML='<div class="machinegrid">'+list.map(m=>`
      <div class="machinecard">
        <h4>${esc(m.name)}</h4>
        <p>${esc(m.category||'')}${m.machine_kind==='anbaugeraet'&&m.width_m?' · '+Number(m.width_m).toFixed(2)+' m Arbeitsbreite':''}</p>
        <div class="machinefacts">
          <span>Betriebsstunden<br><b>${m.operating_hours||0} h</b></span>
          <span>Kosten<br><b>${money(m.costs)}</b></span>
          <span>Nächste Wartung<br><b>${m.next_service_date||'—'}</b></span>
          <span>Zuletzt genutzt<br><b>${esc(profileName(m.last_used_by))}</b></span>
        </div>
        <button class="secondary" data-medit142="${m.id}">Bearbeiten</button>
      </div>`).join('')+'</div>';
  }

  document.querySelectorAll('[data-medit142]').forEach(b=>b.onclick=()=>{
    const m=machines.find(x=>+x.id===+b.dataset.medit142); if(!m)return;
    E('machineId').value=m.id;
    E('machineName').value=m.name||'';
    E('machineCategory').value=m.category||'';
    E('machineHours').value=m.operating_hours||0;
    E('machineCosts').value=m.costs||0;
    E('machineLastService').value=m.last_service_date||'';
    E('machineNextService').value=m.next_service_date||'';
    E('machineInterval').value=m.service_interval_hours||'';
    E('machineLastUser').value=m.last_used_by||'';
    E('machineActive').value=String(m.active!==false);
    E('machineNotes').value=m.notes||'';
    fillMachineExtra(m);
    const form=E('machineFormCard')||E('machineId').closest('.card');
    if(form){form.hidden=false;form.scrollIntoView({behavior:'smooth',block:'start'})}
  });
};

setTimeout(()=>{
  setupMachineTabs();ensureMachineExtraFields();

  const save=E('saveMachine');
  if(save && !save.dataset.v142){
    save.dataset.v142='1';
    save.onclick=async()=>{
      const name=E('machineName').value.trim(); if(!name)return;
      const obj={
        name,
        category:E('machineCategory').value.trim()||null,
        machine_kind:E('machineKind142').value,
        width_m:E('machineKind142').value==='anbaugeraet'?(+E('machineWidth142').value||null):null,
        operating_hours:+E('machineHours').value||0,
        costs:+E('machineCosts').value||0,
        last_service_date:E('machineLastService').value||null,
        next_service_date:E('machineNextService').value||null,
        service_interval_hours:+E('machineInterval').value||null,
        last_used_by:E('machineLastUser').value||null,
        active:E('machineActive').value==='true',
        notes:E('machineNotes').value.trim()||null,
        updated_at:new Date().toISOString()
      };
      const id=+E('machineId').value||0;
      if(id)await update('machines',obj,'id=eq.'+id);
      else await insert('machines',{...obj,created_by:me.id},false);
      resetMachine();await load();
      const form=E('machineFormCard');if(form)form.hidden=true;
    };
  }

  const top=E('newMachineTop');
  if(top && !top.dataset.v142){
    top.dataset.v142='1';
    top.onclick=()=>{
      resetMachine();
      const form=E('machineFormCard')||E('machineId').closest('.card');
      if(form){form.hidden=false;form.scrollIntoView({behavior:'smooth',block:'start'})}
    };
  }
},800);

/* ---------- Arbeitszeit: Maschine + Anbaugerät ---------- */
function ensureWorkImplement(){
  const machine=E('workMachine');if(!machine||E('workImplement142'))return;
  const wrap=document.createElement('div');
  wrap.innerHTML=`<label>Anbaugerät</label><select id="workImplement142"></select>`;
  machine.parentElement.after(wrap);
}
function populateWorkMachineSelectors(){
  ensureWorkImplement();
  const m=E('workMachine'),i=E('workImplement142');if(!m||!i)return;
  const mv=m.value,iv=i.value;
  m.innerHTML='<option value="">Maschine wählen …</option>'+machinePark().map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  i.innerHTML='<option value="">Kein Anbaugerät</option>'+implements().map(x=>`<option value="${x.id}">${esc(x.name)}${x.width_m?' · '+Number(x.width_m).toFixed(2)+' m':''}</option>`).join('');
  if(mv)m.value=mv;if(iv)i.value=iv;
}
const oldPopulateWorkSelectors142=fmPopulateWorkSelectors;
fmPopulateWorkSelectors=function(){oldPopulateWorkSelectors142();populateWorkMachineSelectors()};

const oldStartWork142=fmStartWork;
fmStartWork=async function(){
  const before=new Set(workSessions.map(s=>+s.id));
  await oldStartWork142();
  const s=workSessions.find(x=>!before.has(+x.id)&&x.user_id===me.id)||fmMyActiveSession();
  if(s){
    const implement_id=+E('workImplement142')?.value||null;
    try{await update('work_sessions',{implement_id,updated_at:new Date().toISOString()},'id=eq.'+s.id);s.implement_id=implement_id}catch(e){console.warn(e)}
  }
};

const oldRenderWorkTime142=fmRenderWorkTime;
fmRenderWorkTime=function(){
  oldRenderWorkTime142();
  ensureWorkImplement();populateWorkMachineSelectors();
  const s=fmMyActiveSession();
  if(E('workImplement142')){
    E('workImplement142').disabled=!!s;
    if(s)E('workImplement142').value=s.implement_id||'';
  }
};

/* ---------- Auftrag erstellen: Maschine + Anbaugerät ---------- */
function ensureOrderMachineFields(){
  if(E('orderMachine142'))return;
  const assigned=E('assignedTo')?.parentElement;if(!assigned)return;
  const m=document.createElement('div');
  m.innerHTML=`<label>Maschine</label><select id="orderMachine142"></select>`;
  const i=document.createElement('div');
  i.innerHTML=`<label>Anbaugerät</label><select id="orderImplement142"></select>`;
  assigned.after(m,i);
}
function populateOrderMachineFields(){
  ensureOrderMachineFields();
  const m=E('orderMachine142'),i=E('orderImplement142');if(!m||!i)return;
  const mv=m.value,iv=i.value;
  m.innerHTML='<option value="">Keine Maschine</option>'+machinePark().map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  i.innerHTML='<option value="">Kein Anbaugerät</option>'+implements().map(x=>`<option value="${x.id}">${esc(x.name)}${x.width_m?' · '+Number(x.width_m).toFixed(2)+' m':''}</option>`).join('');
  if(mv)m.value=mv;if(iv)i.value=iv;
}

setTimeout(()=>{
  ensureOrderMachineFields();populateOrderMachineFields();
  const save=E('saveOrder');
  if(save&&!save.dataset.v142){
    save.dataset.v142='1';
    const old=save.onclick;
    save.onclick=async function(ev){
      const before=new Set(orders.map(o=>+o.id));
      await old.call(this,ev);
      const created=orders.find(o=>!before.has(+o.id));
      if(created){
        try{
          await update('orders',{
            machine_id:+E('orderMachine142').value||null,
            implement_id:+E('orderImplement142').value||null,
            updated_at:new Date().toISOString()
          },'id=eq.'+created.id);
          await load();
        }catch(e){console.warn(e)}
      }
    };
  }
},900);

/* ---------- Auftragseditor: Maschine + Anbaugerät ---------- */
function ensureEditorMachineFields(){
  const editor=E('fmOrderEditor138');if(!editor||E('fmOeMachine142'))return;
  const grid=editor.querySelector('.grid');if(!grid)return;
  const a=document.createElement('div');a.innerHTML=`<label>Maschine</label><select id="fmOeMachine142"></select>`;
  const b=document.createElement('div');b.innerHTML=`<label>Anbaugerät</label><select id="fmOeImplement142"></select>`;
  grid.append(a,b);
}
function fillEditorMachineFields(orderId){
  ensureEditorMachineFields();
  const o=orders.find(x=>+x.id===+orderId);if(!o)return;
  E('fmOeMachine142').innerHTML=optionList(machinePark(),o.machine_id);
  E('fmOeImplement142').innerHTML=optionList(implements(),o.implement_id);
}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-edit138]');if(!b)return;
  setTimeout(()=>fillEditorMachineFields(+b.dataset.edit138),80);
});
setTimeout(()=>{
  ensureEditorMachineFields();
  const save=E('fmOeSave');
  if(save&&!save.dataset.v142machine){
    save.dataset.v142machine='1';const old=save.onclick;
    save.onclick=async function(ev){
      const id=+E('fmOeId').value||0;
      if(old)await old.call(this,ev);
      if(id)await update('orders',{
        machine_id:+E('fmOeMachine142').value||null,
        implement_id:+E('fmOeImplement142').value||null,
        updated_at:new Date().toISOString()
      },'id=eq.'+id);
    };
  }
},1200);

/* refresh after normal loads */
const oldLoad142=load;
load=async function(){await oldLoad142();setupMachineTabs();populateWorkMachineSelectors();populateOrderMachineFields();};

setTimeout(()=>{setupMachineTabs();populateWorkMachineSelectors();populateOrderMachineFields();renderMachines()},1300);
})();
