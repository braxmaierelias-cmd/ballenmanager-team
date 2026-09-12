
/* FarmManager V14.4 – robuster Feldauswahl-Fix bei Auftrag erstellen */
(function(){
const E=id=>document.getElementById(id);
let createFieldRows14=[];

function selectedIds(){
  return [...document.querySelectorAll('#orderFieldChoices input[type="checkbox"]:checked')]
    .map(x=>+x.value).filter(Boolean);
}

async function loadCreateFields(){
  const box=E('orderFieldChoices');
  if(!box)return;

  const customerId=+(E('custSel')?.value||0);
  if(!customerId){
    createFieldRows14=[];
    box.innerHTML='<p class="muted">Zuerst Kunde auswählen.</p>';
    return;
  }

  const keep=new Set(selectedIds());
  box.innerHTML='<p class="muted">Felder werden geladen …</p>';

  try{
    createFieldRows14=await select(
      'fields',
      'select=id,name,customer_id,hectares,crop&customer_id=eq.'+encodeURIComponent(customerId)+'&order=name.asc'
    )||[];

    box.innerHTML=createFieldRows14.length
      ? `<div class="field-select-head"><b>${createFieldRows14.length} Feld${createFieldRows14.length===1?'':'er'} verfügbar</b><button type="button" id="selectAllOrderFields14" class="secondary compact">Alle auswählen</button></div>`+
        createFieldRows14.map(f=>`
          <label class="field-check create-order-field-check">
            <input type="checkbox" value="${f.id}" ${keep.has(+f.id)?'checked':''}>
            <span>
              <b>${esc(f.name)}</b>
              <small>${f.hectares?Number(f.hectares).toFixed(2)+' ha':''}${f.crop?' · '+esc(f.crop):''}</small>
            </span>
          </label>
        `).join('')
      : '<p class="muted">Für diesen Kunden sind noch keine Felder angelegt.</p>';

    E('selectAllOrderFields14')?.addEventListener('click',()=>{
      box.querySelectorAll('input[type="checkbox"]').forEach(x=>x.checked=true);
    });
  }catch(err){
    console.error('Felder laden V14.4',err);
    box.innerHTML='<p class="muted">Felder konnten nicht geladen werden.</p>';
  }
}

async function linkFieldsToOrder(orderId,ids){
  if(!orderId||!ids.length)return;
  for(const fieldId of ids){
    try{
      await req('order_fields?on_conflict=order_id,field_id',{
        method:'POST',
        headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},
        body:JSON.stringify({
          order_id:orderId,
          field_id:fieldId,
          added_during_work:false,
          created_by:me.id
        })
      });
    }catch(err){
      console.warn('Feldzuordnung',fieldId,err);
      throw err;
    }
  }
}

E('custSel')?.addEventListener('change',()=>setTimeout(loadCreateFields,10));
document.querySelector('nav button[data-page="verkauf"]')?.addEventListener('click',()=>setTimeout(loadCreateFields,120));

/* Vorhandene Renderer auf direkte DB-Abfrage umbiegen */
if(typeof fmRenderOrderFieldChoices==='function'){
  fmRenderOrderFieldChoices=function(){loadCreateFields()};
}

/* Speichern zuverlässig nach dem eigentlichen Auftrag */
setTimeout(()=>{
  const save=E('saveOrder');
  if(!save||save.dataset.v144)return;
  save.dataset.v144='1';

  const old=save.onclick;
  save.onclick=async function(ev){
    const ids=selectedIds();
    const before=new Set((orders||[]).map(o=>+o.id));

    if(old) await old.call(this,ev);

    if(!ids.length)return;

    let created=(orders||[]).find(o=>!before.has(+o.id));

    if(!created){
      try{
        const recent=await select(
          'orders',
          'select=id,created_at,created_by&created_by=eq.'+encodeURIComponent(me.id)+'&order=id.desc&limit=10'
        )||[];
        created=recent.find(o=>!before.has(+o.id));
      }catch(_){}
    }

    if(!created){
      alert('Der Auftrag wurde gespeichert, aber die Feldzuordnung konnte nicht erkannt werden.');
      return;
    }

    try{
      await linkFieldsToOrder(created.id,ids);
      if(typeof fmReloadFieldData==='function')await fmReloadFieldData();
      else if(typeof load==='function')await load();
    }catch(err){
      alert('Auftrag wurde erstellt, aber die Felder konnten nicht gespeichert werden: '+err.message);
    }
  };
},1600);

setTimeout(loadCreateFields,1100);
})();
