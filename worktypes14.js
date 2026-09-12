
(function(){
const E=id=>document.getElementById(id); let types=[];
const labels={km:'Kilometer',m2:'Quadratmeter',stunden:'Stunden',ha:'Hektar'};
async function loadTypes(){
 if(!token)return;
 try{types=await select('work_types','select=*&active=eq.true&order=sort_order.asc,name.asc')||[]; renderCards(); renderManager(); renderWorkSelect()}catch(e){console.warn(e)}
}
function activate(name){
 cat=name; document.querySelectorAll('.cat').forEach(x=>x.classList.toggle('active',x.dataset.cat===name));
 E('formTitle').textContent=name; E('productWrap').hidden=name!=='Ballen'; E('mulchWrap').hidden=name!=='Mulchen';
 if(name==='Ballen') E('unit').innerHTML='<option value="stueck">Stück</option>';
 else {const t=types.find(x=>x.name===name), us=t?.units?.length?t.units:['km','m2','stunden','ha'];
 E('unit').innerHTML=us.map(u=>`<option value="${u}">${labels[u]||u}</option>`).join('')}
 syncLabels();syncPrice();calc()
}
function renderCards(){
 const box=document.querySelector('#p-verkauf .cats'); if(!box)return;
 box.querySelectorAll('.dynamic-worktype').forEach(x=>x.remove());
 [...box.querySelectorAll('.cat:not([data-cat="Ballen"])')].forEach(x=>x.style.display='none');
 types.forEach(t=>{const b=document.createElement('button');b.className='cat dynamic-worktype';b.dataset.cat=t.name;
 b.innerHTML=`<span>${esc(t.icon||'⚙️')}</span><b>${esc(t.name)}</b><small>${esc((t.units||[]).map(u=>u==='m2'?'m²':u==='stunden'?'h':u).join(' · '))}</small>`;
 b.onclick=()=>activate(t.name);box.appendChild(b)})
}
function renderWorkSelect(){const sel=E('workType'); if(!sel)return; const cur=sel.value,names=['Ballen',...types.map(x=>x.name)];
 sel.innerHTML=names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join(''); if(names.includes(cur))sel.value=cur}
function ensureManager(){
 if(E('workTypeManager'))return;
 const page=E('p-verkauf'), cats=page?.querySelector('.cats'); if(!page||!cats)return;
 const card=document.createElement('div');card.id='workTypeManager';card.className='card worktype-manager';card.hidden=true;
 card.innerHTML=`<div class="sectionhead"><div><span class="section-kicker">ARBEITEN & KATEGORIEN</span><h3>Arbeit / Maschine hinzufügen</h3></div><button id="closeWorkTypeManager" class="secondary compact">Schließen</button></div>
 <p class="muted">Neue Arbeiten wie Mulde, Häckseln oder Pflügen anlegen. Sie stehen danach dem ganzen Team zur Verfügung.</p>
 <div class="grid"><div><label>Name *</label><input id="newWorkTypeName" placeholder="z. B. Mulde"></div><div><label>Symbol</label><input id="newWorkTypeIcon" placeholder="🚜"></div>
 <div class="full"><label>Abrechnungseinheiten</label><div class="unit-checks">
 <label><input type="checkbox" value="km" checked> km</label><label><input type="checkbox" value="m2" checked> m²</label><label><input type="checkbox" value="stunden" checked> Stunden</label><label><input type="checkbox" value="ha" checked> ha</label>
 </div></div></div><button id="saveWorkType">+ Hinzufügen</button><div id="workTypeList"></div>`;
 cats.after(card);
 E('closeWorkTypeManager').onclick=()=>card.hidden=true;
 E('saveWorkType').onclick=saveType;
}
function renderManager(){ensureManager();const box=E('workTypeList');if(!box)return;
 box.innerHTML=types.map(t=>`<div class="worktype-row"><div><b>${esc(t.icon||'⚙️')} ${esc(t.name)}</b><small>${esc((t.units||[]).map(u=>labels[u]||u).join(' · '))}</small></div><button class="danger compact" data-wtdel="${t.id}">Löschen</button></div>`).join('');
 box.querySelectorAll('[data-wtdel]').forEach(b=>b.onclick=async()=>{const t=types.find(x=>+x.id===+b.dataset.wtdel);if(!t)return;
 if(!confirm(`„${t.name}“ aus der Auswahl entfernen? Alte Aufträge bleiben erhalten.`))return;
 await update('work_types',{active:false},'id=eq.'+t.id);await loadTypes();if(cat===t.name)activate('Ballen')})
}
async function saveType(){
 const name=E('newWorkTypeName').value.trim(); if(!name)return alert('Bitte Namen eingeben.');
 const units=[...document.querySelectorAll('#workTypeManager .unit-checks input:checked')].map(x=>x.value); if(!units.length)return alert('Mindestens eine Einheit wählen.');
 try{await insert('work_types',{name,icon:E('newWorkTypeIcon').value.trim()||'⚙️',units,active:true,sort_order:100+types.length,created_by:me.id},false);
 E('newWorkTypeName').value='';E('newWorkTypeIcon').value='';await loadTypes();activate(name)}catch(e){alert('Konnte nicht angelegt werden: '+e.message)}
}
ensureManager();
E('manageWorkTypes')?.addEventListener('click',()=>{ensureManager();E('workTypeManager').hidden=false;E('workTypeManager').scrollIntoView({behavior:'smooth'})});
document.querySelector('.cat[data-cat="Ballen"]')?.addEventListener('click',()=>activate('Ballen'));
document.querySelector('nav button[data-page="verkauf"]')?.addEventListener('click',()=>setTimeout(loadTypes,100));
const oldLoad=load; load=async function(){await oldLoad();await loadTypes()};
setTimeout(loadTypes,900);
})();
