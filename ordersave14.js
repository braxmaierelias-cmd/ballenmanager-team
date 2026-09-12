
/* FarmManager V14.5 – atomisches Auftrag-Speichern */
(function(){
const E=id=>document.getElementById(id);

function selectedFields145(){
  return [...document.querySelectorAll('#orderFieldChoices input[type="checkbox"]:checked')]
    .map(x=>+x.value).filter(Boolean);
}

function currentProduct145(){
  if(cat==='Ballen') return E('product')?.value||'Ballen';
  if(cat==='Mulchen') return E('mulchType')?.value||'Mulchen';
  return cat;
}

async function saveOrder145(){
  const customer_id=+(E('custSel')?.value||0);
  if(!customer_id) return alert('Bitte Kunde auswählen.');

  const amount=+(E('amount')?.value||0);
  if(amount<=0) return alert('Bitte Menge eingeben.');

  const unit=E('unit')?.value||'stueck';
  const product=currentProduct145();

  // Bestandsprüfung für Ballen
  if(cat==='Ballen' && reserve.has(E('status').value)){
    const stock=inv.find(i=>i.product===product);
    if(stock && stock.reservation_enabled===false){
      return alert('Reservierungen sind für dieses Gut deaktiviert.');
    }
    const free=(stock?.quantity||0)-resProd(product);
    if(amount>free && !confirm(`Nur ${Math.max(0,free)} frei. Auftrag trotzdem anlegen?`)) return;
  }

  const btn=E('saveOrder');
  const oldText=btn.textContent;
  btn.disabled=true;
  btn.textContent='Auftrag wird gespeichert …';

  try{
    const fieldIds=selectedFields145();
    const assigned=E('assignedTo')?.value||null;
    const machine_id=+(E('orderMachine142')?.value||0)||null;
    const implement_id=+(E('orderImplement142')?.value||0)||null;

    const result=await req('rpc/create_order_full',{
      method:'POST',
      body:JSON.stringify({
        p_customer_id:customer_id,
        p_order_type:cat,
        p_status:E('status')?.value||'reserviert',
        p_delivery_type:E('delivery')?.value||'Abholung',
        p_delivery_date:E('date')?.value||null,
        p_kilometers:calc(),
        p_kilometer_price:+(E('travelPrice')?.value||0),
        p_notes:E('notes')?.value.trim()||null,
        p_assigned_to:assigned,
        p_product:product,
        p_amount:amount,
        p_unit:unit,
        p_unit_price:+(E('unitPrice')?.value||0),
        p_machine_id:machine_id,
        p_implement_id:implement_id,
        p_field_ids:fieldIds
      })
    });

    // Formular grob zurücksetzen
    E('amount').value='1';
    E('notes').value='';
    document.querySelectorAll('#orderFieldChoices input[type="checkbox"]').forEach(x=>x.checked=false);

    // Auftrag ist zu diesem Zeitpunkt sicher vollständig in der DB gespeichert.
    try{
      await load();
    }catch(refreshErr){
      console.warn('Auftrag gespeichert, Aktualisierung fehlgeschlagen:',refreshErr);
    }

    alert('Auftrag wurde erfolgreich gespeichert.');
    page('auftraege');
  }catch(err){
    console.error('Auftrag speichern V14.5:',err);
    alert('Auftrag konnte nicht gespeichert werden: '+(err?.message||err));
  }finally{
    btn.disabled=false;
    btn.textContent=oldText;
  }
}

setTimeout(()=>{
  const btn=E('saveOrder');
  if(!btn)return;
  // Alle alten Save-Wrapper bewusst ersetzen.
  btn.onclick=saveOrder145;
  btn.dataset.v145='1';
},1500);
})();
