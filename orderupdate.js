
/* FarmManager V13.8 – Auftragsverwaltung erweitert */
(function(){
  const el = id => document.getElementById(id);
  const nowIso = () => new Date().toISOString();

  function orderById(id){ return orders.find(o => +o.id === +id); }

  function completedSorted(){
    const list = orders.filter(o => o.status === 'abgeschlossen');
    return list.slice().sort((a,b)=>{
      const as = a.completed_sort, bs = b.completed_sort;
      if(as != null && bs != null) return +as - +bs;
      if(as != null) return -1;
      if(bs != null) return 1;
      return new Date(b.completed_at || b.updated_at || b.created_at || 0) -
             new Date(a.completed_at || a.updated_at || a.created_at || 0);
    });
  }

  async function normalizeCompletedSort(){
    const list = completedSorted();
    for(let i=0;i<list.length;i++){
      if(+list[i].completed_sort !== i+1){
        await update('orders',{completed_sort:i+1,updated_at:nowIso()},'id=eq.'+list[i].id);
        list[i].completed_sort=i+1;
      }
    }
  }

  async function moveCompleted(id,dir){
    await normalizeCompletedSort();
    const list = completedSorted();
    const i = list.findIndex(o => +o.id === +id);
    const j = i + dir;
    if(i < 0 || j < 0 || j >= list.length) return;

    const a=list[i], b=list[j];
    const av=+a.completed_sort, bv=+b.completed_sort;
    await update('orders',{completed_sort:bv,updated_at:nowIso()},'id=eq.'+a.id);
    await update('orders',{completed_sort:av,updated_at:nowIso()},'id=eq.'+b.id);
    a.completed_sort=bv; b.completed_sort=av;
    renderOrders();
  }

  async function deleteOrder(id){
    const o=orderById(id);
    if(!o) return;

    const extra = o.order_type === 'Ballen' && o.stock_committed
      ? '\n\nHinweis: Bereits abgebuchter Bestand wird dabei NICHT automatisch zurückgebucht.'
      : '';

    if(!confirm(`Auftrag #${id} wirklich endgültig löschen?${extra}\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) return;

    try{
      await remove('orders','id=eq.'+id);
      await load();
    }catch(err){
      alert('Auftrag konnte nicht gelöscht werden: '+err.message);
    }
  }

  /* -------- eigener zuverlässiger Auftragseditor -------- */
  function ensureEditor(){
    let box=el('fmOrderEditor138');
    if(box) return box;

    box=document.createElement('div');
    box.id='fmOrderEditor138';
    box.className='card fm-order-editor';
    box.hidden=true;
    box.innerHTML=`
      <div class="sectionhead">
        <div><span class="section-kicker">AUFTRAG BEARBEITEN</span><h3 id="fmOeTitle">Auftrag</h3></div>
        <button id="fmOeClose" class="secondary compact">Schließen</button>
      </div>
      <input type="hidden" id="fmOeId">
      <div class="grid">
        <div><label>Kunde</label><select id="fmOeCustomer"></select></div>
        <div><label>Zuständiger Mitarbeiter</label><select id="fmOeAssigned"></select></div>
        <div><label>Zahlungsstatus</label>
          <select id="fmOePayment">
            <option value="offen">Offen</option>
            <option value="teilbezahlt">Teilbezahlt</option>
            <option value="bezahlt">Bezahlt</option>
          </select>
        </div>
        <div><label>Termin</label><input id="fmOeDate" type="date"></div>
        <div><label>Produkt / Leistung</label><input id="fmOeProduct"></div>
        <div><label>Menge</label><input id="fmOeAmount" type="number" step="0.01"></div>
        <div><label>Einheit</label>
          <select id="fmOeUnit">
            <option value="stueck">Stück</option>
            <option value="km">Kilometer</option>
            <option value="m2">m²</option>
            <option value="stunden">Stunden</option>
            <option value="ha">Hektar</option>
          </select>
        </div>
        <div><label>Preis pro Einheit (€)</label><input id="fmOePrice" type="number" step="0.01"></div>
        <div class="full"><label>Notiz</label><textarea id="fmOeNotes"></textarea></div>
      </div>
      <div class="rowbuttons">
        <button id="fmOeSave">Änderungen speichern</button>
        <button id="fmOeDelete" class="danger">Auftrag löschen</button>
      </div>
    `;

    const page=el('p-auftraege');
    page.insertBefore(box,page.querySelector('.completed-card'));

    el('fmOeClose').onclick=()=>{box.hidden=true};
    el('fmOeSave').onclick=saveEditor;
    el('fmOeDelete').onclick=()=>deleteOrder(+el('fmOeId').value);

    return box;
  }

  function openEditor(id){
    const o=orderById(id);
    if(!o) return;
    const i=(o.order_items||[])[0]||{};
    const box=ensureEditor();

    el('fmOeId').value=o.id;
    el('fmOeTitle').textContent=`Auftrag #${o.id}`;
    el('fmOeCustomer').innerHTML =
      '<option value="">Kein Kunde</option>'+
      cust.map(c=>`<option value="${c.id}" ${+o.customer_id===+c.id?'selected':''}>${esc(c.name)}${c.company?' · '+esc(c.company):''}</option>`).join('');
    el('fmOeAssigned').innerHTML =
      '<option value="">Nicht zugeordnet</option>'+
      profiles.filter(p=>p.active!==false).map(p=>`<option value="${p.id}" ${o.assigned_to===p.id?'selected':''}>${esc(p.display_name||p.email)}</option>`).join('');
    el('fmOePayment').value=o.payment_status||'offen';
    el('fmOeDate').value=o.delivery_date||'';
    el('fmOeProduct').value=i.product||o.order_type||'';
    el('fmOeAmount').value=itemAmount(i)||0;
    el('fmOeUnit').value=i.unit||'stueck';
    el('fmOePrice').value=+i.unit_price||0;
    el('fmOeNotes').value=o.notes||'';

    box.hidden=false;
    box.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function saveEditor(){
    const id=+el('fmOeId').value;
    const o=orderById(id);
    if(!o) return;

    const amount=+el('fmOeAmount').value||0;
    const price=+el('fmOePrice').value||0;
    const product=el('fmOeProduct').value.trim()||o.order_type;

    try{
      await update('orders',{
        customer_id:+el('fmOeCustomer').value||null,
        assigned_to:el('fmOeAssigned').value||null,
        payment_status:el('fmOePayment').value,
        delivery_date:el('fmOeDate').value||null,
        notes:el('fmOeNotes').value.trim()||null,
        updated_at:nowIso()
      },'id=eq.'+id);

      const item=(o.order_items||[])[0];
      if(item){
        await update('order_items',{
          product,
          amount,
          quantity:el('fmOeUnit').value==='stueck'?Math.round(amount):1,
          unit:el('fmOeUnit').value,
          unit_price:price,
          description:o.order_type
        },'id=eq.'+item.id);
      }else{
        await insert('order_items',{
          order_id:id,
          product,
          amount,
          quantity:el('fmOeUnit').value==='stueck'?Math.round(amount):1,
          unit:el('fmOeUnit').value,
          unit_price:price,
          description:o.order_type
        },false);
      }

      el('fmOrderEditor138').hidden=true;
      await load();
      page('auftraege');
    }catch(err){
      alert('Auftrag konnte nicht gespeichert werden: '+err.message);
    }
  }

  /* -------- Kunden jetzt wirklich immer löschbar -------- */
  const prevCustomers138=renderCustomers;
  renderCustomers=function(){
    prevCustomers138();

    document.querySelectorAll('.delete-customer-btn').forEach(old=>{
      const id = +old.closest('.customer')?.querySelector('[data-edit-c]')?.dataset.editC;
      if(!id) return;

      const n=old.cloneNode(true);
      old.replaceWith(n);
      n.onclick=async()=>{
        const c=cust.find(x=>+x.id===id);
        if(!c) return;

        if(!confirm(`Kunde „${c.name}“ wirklich löschen?\n\nVerknüpfte Aufträge bleiben erhalten und haben danach keinen Kunden mehr. Arbeitszeiten bleiben ebenfalls erhalten.\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) return;

        try{
          if(typeof fields!=='undefined'){
            for(const f of fields.filter(f=>+f.customer_id===id)){
              await update('fields',{customer_id:null,updated_at:nowIso()},'id=eq.'+f.id);
            }
          }
          await remove('customers','id=eq.'+id);
          await load();
        }catch(err){
          alert('Kunde konnte nicht gelöscht werden: '+err.message);
        }
      };
    });
  };

  /* -------- Auftragsansicht erweitern -------- */
  const prevOrders138=renderOrders;
  renderOrders=function(){
    prevOrders138();
    ensureEditor();

    // V13.7-Bearbeiten-Buttons ersetzen
    document.querySelectorAll('.edit-active-order').forEach(b=>b.remove());

    // Aktive Aufträge
    document.querySelectorAll('#orders .order').forEach(card=>{
      const m=(card.querySelector('h4')?.textContent||'').match(/#(\d+)/);
      if(!m) return;
      const id=+m[1];

      if(!card.querySelector('[data-edit138]')){
        const actions=document.createElement('div');
        actions.className='order-admin-actions';
        actions.innerHTML=`
          <button class="secondary" data-edit138="${id}">Bearbeiten</button>
          <button class="danger" data-delete138="${id}">Löschen</button>
        `;
        card.appendChild(actions);
      }
    });

    // Abgeschlossene in gespeicherter manueller Reihenfolge anzeigen
    const container=el('completedOrders');
    const cards=[...container.querySelectorAll('.order')];
    const map=new Map();
    cards.forEach(c=>{
      const m=(c.querySelector('h4')?.textContent||'').match(/#(\d+)/);
      if(m) map.set(+m[1],c);
    });

    const sorted=completedSorted();
    sorted.forEach((o,idx)=>{
      const card=map.get(+o.id);
      if(!card) return;

      let actions=card.querySelector('.completed-admin-actions');
      if(!actions){
        actions=document.createElement('div');
        actions.className='completed-admin-actions';
        card.appendChild(actions);
      }
      actions.innerHTML=`
        <button class="secondary compact" data-up138="${o.id}" ${idx===0?'disabled':''}>↑ Nach oben</button>
        <button class="secondary compact" data-down138="${o.id}" ${idx===sorted.length-1?'disabled':''}>↓ Nach unten</button>
        <button class="secondary compact" data-edit138="${o.id}">Bearbeiten</button>
        <button class="danger compact" data-delete138="${o.id}">Löschen</button>
      `;
      container.appendChild(card);
    });

    document.querySelectorAll('[data-edit138]').forEach(b=>b.onclick=()=>openEditor(+b.dataset.edit138));
    document.querySelectorAll('[data-delete138]').forEach(b=>b.onclick=()=>deleteOrder(+b.dataset.delete138));
    document.querySelectorAll('[data-up138]').forEach(b=>b.onclick=()=>moveCompleted(+b.dataset.up138,-1));
    document.querySelectorAll('[data-down138]').forEach(b=>b.onclick=()=>moveCompleted(+b.dataset.down138,1));
  };

  setTimeout(()=>{
    try{
      renderCustomers();
      renderOrders();
    }catch(e){ console.warn('V13.8 init',e); }
  },1000);

  window.fmOpenOrderEditor138=openEditor;
})();
