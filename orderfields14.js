
/* FarmManager V14.3 – Mehrfach-Feldauswahl bei Auftrag erstellen */
(function(){
const E=id=>document.getElementById(id);

function selectedCreateFields(){
  return [...document.querySelectorAll('#orderFieldChoices input[type="checkbox"]:checked')]
    .map(x=>+x.value).filter(Boolean);
}

function renderCreateFields(){
  const box=E('orderFieldChoices');
  if(!box)return;

  const customerId=+(E('custSel')?.value||0);
  if(!customerId){
    box.innerHTML='<p class="muted">Zuerst Kunde auswählen.</p>';
    return;
  }

  const list=(typeof fields!=='undefined'?fields:[]).filter(f=>+f.customer_id===customerId);
  const prev=new Set(selectedCreateFields());

  box.innerHTML=list.length?list.map(f=>`
    <label class="field-check create-order-field-check">
      <input type="checkbox" value="${f.id}" ${prev.has(+f.id)?'checked':''}>
      <span>
        <b>${esc(f.name)}</b>
        <small>${f.hectares?Number(f.hectares).toFixed(2)+' ha':''}${f.crop?' · '+esc(f.crop):''}</small>
      </span>
    </label>
  `).join(''):'<p class="muted">Für diesen Kunden sind noch keine Felder angelegt.</p>';
}

E('custSel')?.addEventListener('change',()=>setTimeout(renderCreateFields,0));

/* bestehende Renderer ersetzen/ergänzen */
if(typeof fmRenderOrderFieldChoices==='function'){
  fmRenderOrderFieldChoices=renderCreateFields;
}

/* Speichern: alle ausgewählten Felder mit neuem Auftrag verknüpfen */
setTimeout(()=>{
  const save=E('saveOrder');
  if(!save||save.dataset.v143)return;
  save.dataset.v143='1';

  const old=save.onclick;
  save.onclick=async function(ev){
    const selected=selectedCreateFields();
    const before=new Set(orders.map(o=>+o.id));

    if(old) await old.call(this,ev);

    // Nach erfolgreichem Speichern neuen Auftrag finden
    const created=orders.find(o=>!before.has(+o.id));
    if(!created||!selected.length)return;

    try{
      // Doppelte Einträge vermeiden
      for(const fieldId of selected){
        const exists=(typeof orderFields!=='undefined'?orderFields:[])
          .some(x=>+x.order_id===+created.id&&+x.field_id===+fieldId);
        if(exists)continue;

        await insert('order_fields',{
          order_id:created.id,
          field_id:fieldId,
          added_during_work:false,
          created_by:me.id
        },false);
      }

      if(typeof fmReloadFieldData==='function') await fmReloadFieldData();
    }catch(err){
      alert('Auftrag wurde erstellt, aber die Felder konnten nicht vollständig gespeichert werden: '+err.message);
    }
  };
},1200);

document.querySelector('nav button[data-page="verkauf"]')?.addEventListener('click',()=>setTimeout(renderCreateFields,120));

setTimeout(renderCreateFields,1000);
})();
