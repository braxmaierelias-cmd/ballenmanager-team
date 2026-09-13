
/* FarmManager V14.6 – Arbeitszeiten löschen, 4 Anbaugeräte, zwei Kalender */
(function(){
const E=id=>document.getElementById(id);
let orderImplRows146=[], workImplRows146=[];
let personalMonth146=new Date(), teamMonth146=new Date();

/* ===================== Hilfen ===================== */
function activeImplements146(){
  return (machines||[]).filter(m=>(m.machine_kind||'maschinenpark')==='anbaugeraet' && m.active!==false);
}
function fmtDate146(v){return v?new Date(v+'T12:00:00').toLocaleDateString('de-DE'):'—'}
function implName146(id){return machines.find(m=>+m.id===+id)?.name||'Anbaugerät'}
function checkedIds146(sel){return [...document.querySelectorAll(sel+' input[type="checkbox"]:checked')].map(x=>+x.value).filter(Boolean)}
function enforceMax4(boxId){
  const box=E(boxId);if(!box)return;
  box.querySelectorAll('input[type="checkbox"]').forEach(ch=>{
    ch.onchange=()=>{
      const checked=[...box.querySelectorAll('input:checked')];
      if(checked.length>4){ch.checked=false;alert('Es können maximal 4 Anbaugeräte ausgewählt werden.')}
      const c=box.querySelector('.impl-count146');if(c)c.textContent=`${[...box.querySelectorAll('input:checked')].length}/4 ausgewählt`;
    };
  });
}

/* ===================== Arbeitszeiten löschen ===================== */
function addWorkDeleteButtons146(){
  if(!E('workHistory')||!me)return;
  const list=(myRole==='admin'?workSessions:workSessions.filter(s=>s.user_id===me.id)).slice(0,60);
  const rows=[...E('workHistory').querySelectorAll('.work-row')];
  rows.forEach((row,i)=>{
    const s=list[i];if(!s||row.querySelector('.work-delete146'))return;
    if(!(s.user_id===me.id||myRole==='admin'))return;
    const right=row.querySelector('.work-row-right')||row;
    const b=document.createElement('button');
    b.className='danger compact work-delete146';
    b.textContent='Löschen';
    b.onclick=async()=>{
      if(!confirm(`Arbeitszeit vom ${new Date(s.started_at).toLocaleDateString('de-DE')} wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`))return;
      try{
        await remove('work_sessions','id=eq.'+s.id);
        workSessions=workSessions.filter(x=>+x.id!==+s.id);
        if(typeof workFieldSegments!=='undefined')workFieldSegments=workFieldSegments.filter(x=>+x.work_session_id!==+s.id);
        workImplRows146=workImplRows146.filter(x=>+x.work_session_id!==+s.id);
        fmRenderWorkHistory();
      }catch(err){alert('Arbeitszeit konnte nicht gelöscht werden: '+err.message)}
    };
    right.appendChild(b);
  });
}
const oldHistory146=fmRenderWorkHistory;
fmRenderWorkHistory=function(){oldHistory146();addWorkDeleteButtons146()};

/* ===================== bis zu 4 Anbaugeräte – Arbeitszeit ===================== */
function ensureWorkImplMulti146(){
  const single=E('workImplement142');if(!single||E('workImplMulti146'))return;
  single.parentElement.style.display='none';
  const wrap=document.createElement('div');
  wrap.className='full';
  wrap.innerHTML=`<label>Anbaugeräte <span class="muted">(max. 4)</span></label>
    <div id="workImplMulti146" class="multi-impl146"></div>`;
  single.parentElement.after(wrap);
}
function renderWorkImplMulti146(session=null){
  ensureWorkImplMulti146();const box=E('workImplMulti146');if(!box)return;
  const selected=new Set(session?workImplRows146.filter(x=>+x.work_session_id===+session.id).map(x=>+x.implement_id):checkedIds146('#workImplMulti146'));
  box.innerHTML=`<div class="impl-count146">${selected.size}/4 ausgewählt</div>`+activeImplements146().map(m=>`
    <label class="impl-choice146"><input type="checkbox" value="${m.id}" ${selected.has(+m.id)?'checked':''}>
      <span><b>${esc(m.name)}</b><small>${m.width_m?Number(m.width_m).toFixed(2)+' m Arbeitsbreite':''}</small></span></label>`).join('');
  enforceMax4('workImplMulti146');
}
const oldWorkTime146=fmRenderWorkTime;
fmRenderWorkTime=function(){
  oldWorkTime146();
  const s=fmMyActiveSession();
  renderWorkImplMulti146(s||null);
  if(E('workImplMulti146'))E('workImplMulti146').querySelectorAll('input').forEach(x=>x.disabled=!!s);
};
const oldStartWork146=fmStartWork;
fmStartWork=async function(){
  const ids=checkedIds146('#workImplMulti146').slice(0,4);
  if(E('workImplement142'))E('workImplement142').value=ids[0]||'';
  const before=new Set(workSessions.map(x=>+x.id));
  await oldStartWork146();
  const s=workSessions.find(x=>!before.has(+x.id)&&x.user_id===me.id)||fmMyActiveSession();
  if(!s)return;
  try{
    await remove('work_session_implements','work_session_id=eq.'+s.id);
    for(const id of ids){
      await insert('work_session_implements',{work_session_id:s.id,implement_id:id,created_by:me.id},false);
    }
    workImplRows146=await select('work_session_implements','select=*')||[];
    renderWorkImplMulti146(s);
  }catch(err){console.warn('Anbaugeräte Arbeitszeit:',err)}
};

/* ===================== bis zu 4 Anbaugeräte – Auftrag erstellen ===================== */
function ensureOrderImplMulti146(){
  const single=E('orderImplement142');if(!single||E('orderImplMulti146'))return;
  single.parentElement.style.display='none';
  const wrap=document.createElement('div');
  wrap.className='full';
  wrap.innerHTML=`<label>Anbaugeräte <span class="muted">(max. 4)</span></label>
    <div id="orderImplMulti146" class="multi-impl146"></div>`;
  single.parentElement.after(wrap);
}
function renderOrderImplMulti146(selectedIds=[]){
  ensureOrderImplMulti146();const box=E('orderImplMulti146');if(!box)return;
  const selected=new Set(selectedIds);
  box.innerHTML=`<div class="impl-count146">${selected.size}/4 ausgewählt</div>`+activeImplements146().map(m=>`
    <label class="impl-choice146"><input type="checkbox" value="${m.id}" ${selected.has(+m.id)?'checked':''}>
      <span><b>${esc(m.name)}</b><small>${m.width_m?Number(m.width_m).toFixed(2)+' m Arbeitsbreite':''}</small></span></label>`).join('');
  enforceMax4('orderImplMulti146');
}

/* Auftrag-Speichern vollständig ersetzen, mit 4 Anbaugeräten */
async function saveOrder146(){
  const customer_id=+(E('custSel')?.value||0); if(!customer_id)return alert('Bitte Kunde auswählen.');
  const amount=+(E('amount')?.value||0); if(amount<=0)return alert('Bitte Menge eingeben.');
  const unit=E('unit')?.value||'stueck';
  const product=cat==='Ballen'?(E('product')?.value||'Ballen'):cat==='Mulchen'?(E('mulchType')?.value||'Mulchen'):cat;
  if(cat==='Ballen'&&reserve.has(E('status').value)){
    const stock=inv.find(i=>i.product===product);
    if(stock&&stock.reservation_enabled===false)return alert('Reservierungen sind für dieses Gut deaktiviert.');
    const free=(stock?.quantity||0)-resProd(product);
    if(amount>free&&!confirm(`Nur ${Math.max(0,free)} frei. Auftrag trotzdem anlegen?`))return;
  }
  const implIds=checkedIds146('#orderImplMulti146').slice(0,4);
  const fieldIds=[...document.querySelectorAll('#orderFieldChoices input[type="checkbox"]:checked')].map(x=>+x.value).filter(Boolean);
  const btn=E('saveOrder'), old=btn.textContent;btn.disabled=true;btn.textContent='Auftrag wird gespeichert …';
  try{
    await req('rpc/create_order_full',{
      method:'POST',
      body:JSON.stringify({
        p_customer_id:customer_id,p_order_type:cat,p_status:E('status')?.value||'reserviert',
        p_delivery_type:E('delivery')?.value||'Abholung',p_delivery_date:E('date')?.value||null,
        p_kilometers:calc(),p_kilometer_price:+(E('travelPrice')?.value||0),p_notes:E('notes')?.value.trim()||null,
        p_assigned_to:E('assignedTo')?.value||null,p_product:product,p_amount:amount,p_unit:unit,
        p_unit_price:+(E('unitPrice')?.value||0),p_machine_id:+(E('orderMachine142')?.value||0)||null,
        p_implement_id:implIds[0]||null,p_field_ids:fieldIds,p_implement_ids:implIds
      })
    });
    E('amount').value='1';E('notes').value='';
    document.querySelectorAll('#orderFieldChoices input:checked,#orderImplMulti146 input:checked').forEach(x=>x.checked=false);
    await load();alert('Auftrag wurde erfolgreich gespeichert.');page('auftraege');
  }catch(err){alert('Auftrag konnte nicht gespeichert werden: '+(err?.message||err))}
  finally{btn.disabled=false;btn.textContent=old}
}

/* Auftragseditor mit max. 4 Anbaugeräten */
function ensureEditorImpl146(){
  const editor=E('fmOrderEditor138');if(!editor||E('fmOeImplMulti146'))return;
  const old=E('fmOeImplement142');if(old)old.parentElement.style.display='none';
  const grid=editor.querySelector('.grid');if(!grid)return;
  const wrap=document.createElement('div');wrap.className='full';
  wrap.innerHTML=`<label>Anbaugeräte <span class="muted">(max. 4)</span></label><div id="fmOeImplMulti146" class="multi-impl146"></div>`;
  grid.appendChild(wrap);
}
function renderEditorImpl146(orderId){
  ensureEditorImpl146();const box=E('fmOeImplMulti146');if(!box)return;
  const sel=new Set(orderImplRows146.filter(x=>+x.order_id===+orderId).map(x=>+x.implement_id));
  box.innerHTML=`<div class="impl-count146">${sel.size}/4 ausgewählt</div>`+activeImplements146().map(m=>`
    <label class="impl-choice146"><input type="checkbox" value="${m.id}" ${sel.has(+m.id)?'checked':''}><span><b>${esc(m.name)}</b><small>${m.width_m?Number(m.width_m).toFixed(2)+' m':''}</small></span></label>`).join('');
  enforceMax4('fmOeImplMulti146');
}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-edit138]');if(!b)return;
  setTimeout(()=>renderEditorImpl146(+b.dataset.edit138),120);
});
setTimeout(()=>{
  ensureEditorImpl146();
  const save=E('fmOeSave');if(!save||save.dataset.v146impl)return;
  save.dataset.v146impl='1';const old=save.onclick;
  save.onclick=async function(ev){
    const id=+E('fmOeId').value||0, ids=checkedIds146('#fmOeImplMulti146').slice(0,4);
    if(old)await old.call(this,ev);
    if(!id)return;
    try{
      await remove('order_implements','order_id=eq.'+id);
      for(const impl of ids)await insert('order_implements',{order_id:id,implement_id:impl,created_by:me.id},false);
      await update('orders',{implement_id:ids[0]||null,updated_at:new Date().toISOString()},'id=eq.'+id);
      orderImplRows146=await select('order_implements','select=*')||[];
    }catch(err){alert('Anbaugeräte konnten nicht gespeichert werden: '+err.message)}
  };
},1800);

/* ===================== Kalender komplett neu ===================== */
function installCalendars146(){
  const page=E('p-kalender');if(!page||page.dataset.v146)return;
  page.dataset.v146='1';
  page.innerHTML=`
    <div class="pagehead"><div><span class="section-kicker">PLANUNG</span><h2>Kalender</h2></div></div>
    <div id="calEditor146" class="card" hidden>
      <div class="sectionhead"><h3 id="calEditorTitle146">Termin</h3><button id="calClose146" class="secondary compact">Schließen</button></div>
      <input type="hidden" id="calId146"><input type="hidden" id="calVis146">
      <div class="grid">
        <div class="full"><label>Titel *</label><input id="calTitleInput146"></div>
        <div><label>Startdatum *</label><input id="calStartDate146" type="date"></div>
        <div><label>Enddatum *</label><input id="calEndDate146" type="date"></div>
        <div><label>Von</label><input id="calStartTime146" type="time"></div>
        <div><label>Bis</label><input id="calEndTime146" type="time"></div>
        <div class="full"><label>Notiz</label><textarea id="calNotes146"></textarea></div>
      </div>
      <div class="rowbuttons"><button id="calSave146">Speichern</button><button id="calDelete146" class="danger" hidden>Löschen</button></div>
    </div>

    <div class="calendar-section146">
      <div class="sectionhead"><div><span class="section-kicker">MEIN KALENDER</span><h3>Nur meine Termine</h3></div><button id="calNewPersonal146" class="compact">+ Mein Termin</button></div>
      <div class="calendar-layout">
        <div class="card calendar-card"><div class="calendar-nav"><button id="pPrev146" class="secondary compact">‹</button><strong id="pTitle146"></strong><button id="pNext146" class="secondary compact">›</button></div>
        <div class="calendar-week"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div><div id="pGrid146" class="calendar-grid"></div></div>
        <div class="card"><h3>Meine Termine</h3><div id="pList146"></div></div>
      </div>
    </div>

    <div class="calendar-section146">
      <div class="sectionhead"><div><span class="section-kicker">TEAM-KALENDER</span><h3>Für alle sichtbar</h3></div><button id="calNewTeam146" class="compact">+ Team-Termin</button></div>
      <div class="calendar-layout">
        <div class="card calendar-card"><div class="calendar-nav"><button id="tPrev146" class="secondary compact">‹</button><strong id="tTitle146"></strong><button id="tNext146" class="secondary compact">›</button></div>
        <div class="calendar-week"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div><div id="tGrid146" class="calendar-grid"></div></div>
        <div class="card"><h3>Termine für alle</h3><div id="tList146"></div></div>
      </div>
    </div>`;

  E('calClose146').onclick=()=>E('calEditor146').hidden=true;
  E('calNewPersonal146').onclick=()=>openCal146(null,'private');
  E('calNewTeam146').onclick=()=>openCal146(null,'team');
  E('calSave146').onclick=saveCal146;
  E('calDelete146').onclick=deleteCal146;
  E('pPrev146').onclick=()=>{personalMonth146=new Date(personalMonth146.getFullYear(),personalMonth146.getMonth()-1,1);renderCalendars146()};
  E('pNext146').onclick=()=>{personalMonth146=new Date(personalMonth146.getFullYear(),personalMonth146.getMonth()+1,1);renderCalendars146()};
  E('tPrev146').onclick=()=>{teamMonth146=new Date(teamMonth146.getFullYear(),teamMonth146.getMonth()-1,1);renderCalendars146()};
  E('tNext146').onclick=()=>{teamMonth146=new Date(teamMonth146.getFullYear(),teamMonth146.getMonth()+1,1);renderCalendars146()};
}
function eventsForDay146(list,iso){return list.filter(e=>iso>=e.event_date&&iso<=(e.end_date||e.event_date))}
function calendarHtml146(date,list,prefix){
  const y=date.getFullYear(),m=date.getMonth(),start=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();
  E(prefix+'Title146').textContent=date.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
  let h='';for(let i=0;i<start;i++)h+='<div class="calday empty"></div>';
  for(let d=1;d<=days;d++){
    const iso=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,ev=eventsForDay146(list,iso);
    h+=`<button class="calday" data-cal146="${iso}"><b>${d}</b>${ev.slice(0,3).map(x=>`<span>${esc(x.title)}</span>`).join('')}</button>`;
  }
  E(prefix+'Grid146').innerHTML=h;
}
function eventRows146(list,target){
  E(target).innerHTML=list.sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date))).map(e=>`
    <div class="calendar-event146"><div><b>${esc(e.title)}</b><p>${fmtDate146(e.event_date)}${e.end_date&&e.end_date!==e.event_date?' – '+fmtDate146(e.end_date):''}${e.start_time?' · '+String(e.start_time).slice(0,5):''}</p></div>
    <button class="secondary compact" data-caledit146="${e.id}">Bearbeiten</button></div>`).join('')||'<p class="muted">Keine Termine.</p>';
}
function renderCalendars146(){
  if(!E('p-kalender'))return;
  installCalendars146();
  const personal=calendarEvents.filter(e=>e.visibility==='private'&&e.created_by===me?.id);
  const team=calendarEvents.filter(e=>(e.visibility||'team')==='team');
  calendarHtml146(personalMonth146,personal,'p');
  calendarHtml146(teamMonth146,team,'t');
  eventRows146(personal.filter(e=>new Date(e.event_date+'T12:00:00').getMonth()===personalMonth146.getMonth()),'pList146');
  eventRows146(team.filter(e=>new Date(e.event_date+'T12:00:00').getMonth()===teamMonth146.getMonth()),'tList146');
  document.querySelectorAll('[data-caledit146]').forEach(b=>b.onclick=()=>openCal146(+b.dataset.caledit146));
}
function openCal146(id=null,vis='private'){
  installCalendars146();
  const ev=id?calendarEvents.find(x=>+x.id===+id):null;
  E('calId146').value=ev?.id||'';
  E('calVis146').value=ev?.visibility||vis;
  E('calEditorTitle146').textContent=ev?'Termin bearbeiten':(vis==='team'?'Team-Termin anlegen':'Meinen Termin anlegen');
  E('calTitleInput146').value=ev?.title||'';
  const today=new Date().toISOString().slice(0,10);
  E('calStartDate146').value=ev?.event_date||today;
  E('calEndDate146').value=ev?.end_date||ev?.event_date||today;
  E('calStartTime146').value=ev?.start_time?String(ev.start_time).slice(0,5):'';
  E('calEndTime146').value=ev?.end_time?String(ev.end_time).slice(0,5):'';
  E('calNotes146').value=ev?.notes||'';
  E('calDelete146').hidden=!ev;
  E('calEditor146').hidden=false;E('calEditor146').scrollIntoView({behavior:'smooth',block:'start'});
}
async function saveCal146(){
  const title=E('calTitleInput146').value.trim(),start=E('calStartDate146').value,end=E('calEndDate146').value||start;
  if(!title||!start)return alert('Titel und Startdatum fehlen.');
  if(end<start)return alert('Das Enddatum darf nicht vor dem Startdatum liegen.');
  const obj={title,event_date:start,end_date:end,start_time:E('calStartTime146').value||null,end_time:E('calEndTime146').value||null,
    notes:E('calNotes146').value.trim()||null,visibility:E('calVis146').value||'private',updated_at:new Date().toISOString()};
  const id=+E('calId146').value||0;
  try{
    if(id)await update('calendar_events',obj,'id=eq.'+id);
    else await insert('calendar_events',{...obj,created_by:me.id},false);
    E('calEditor146').hidden=true;await load();
  }catch(err){alert('Termin konnte nicht gespeichert werden: '+err.message)}
}
async function deleteCal146(){
  const id=+E('calId146').value||0;if(!id)return;
  if(!confirm('Termin wirklich löschen?'))return;
  try{await remove('calendar_events','id=eq.'+id);E('calEditor146').hidden=true;await load()}catch(err){alert('Termin konnte nicht gelöscht werden: '+err.message)}
}
renderCalendar=function(){renderCalendars146()};

/* ===================== Daten laden ===================== */
const oldLoad146=load;
load=async function(){
  await oldLoad146();
  try{
    [orderImplRows146,workImplRows146]=await Promise.all([
      select('order_implements','select=*'),
      select('work_session_implements','select=*')
    ]);
  }catch(e){console.warn('Anbaugeräte-Verknüpfungen:',e)}
  renderWorkImplMulti146(fmMyActiveSession());
  renderOrderImplMulti146([]);
  renderCalendars146();
  addWorkDeleteButtons146();
};

setTimeout(()=>{
  installCalendars146();
  ensureWorkImplMulti146();renderWorkImplMulti146(fmMyActiveSession());
  ensureOrderImplMulti146();renderOrderImplMulti146([]);
  ensureEditorImpl146();
  const save=E('saveOrder');if(save)save.onclick=saveOrder146;
  renderCalendars146();addWorkDeleteButtons146();
},2200);
})();
