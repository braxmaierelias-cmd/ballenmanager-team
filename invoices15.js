
/* FarmManager V15.1 – Rechnungen */
(function(){
const E=id=>document.getElementById(id);
let invoices151=[], invoiceItems151=[], localItems151=[];

const money151=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(+v||0);
const today151=()=>new Date().toISOString().slice(0,10);
const addDays151=(date,days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)};

function invoiceCustomerName151(id){
  const c=cust.find(x=>+x.id===+id);return c?.name||'Kein Kunde';
}
function unitLabel151(u){
  return ({stueck:'Stück',km:'km',m2:'m²',stunden:'h',ha:'ha'})[u]||u||'';
}
async function nextNumber151(){
  try{
    const r=await req('rpc/next_invoice_number',{method:'POST',body:'{}'});
    return typeof r==='string'?r:(Array.isArray(r)?r[0]:r);
  }catch(_){return 'RE-'+new Date().getFullYear()+'-NEU'}
}
async function loadInvoices151(){
  if(!token)return;
  try{
    invoices151=await select('invoices','select=*&order=invoice_date.desc,id.desc')||[];
    invoiceItems151=await select('invoice_items','select=*&order=invoice_id.asc,sort_order.asc,id.asc')||[];
    renderInvoiceList151();
  }catch(e){console.warn('Rechnungen laden:',e)}
}
function populateInvoiceSelectors151(){
  const c=E('invoiceCustomer151'),o=E('invoiceOrder151');if(!c||!o)return;
  const cv=c.value,ov=o.value;
  c.innerHTML='<option value="">Kunde wählen …</option>'+cust.map(x=>`<option value="${x.id}">${esc(x.name)}${x.company?' · '+esc(x.company):''}</option>`).join('');
  o.innerHTML='<option value="">Keinen Auftrag übernehmen</option>'+orders.map(x=>`<option value="${x.id}">#${x.id} · ${esc(x.order_type)} · ${esc(x.customers?.name||invoiceCustomerName151(x.customer_id))}</option>`).join('');
  if(cv)c.value=cv;if(ov)o.value=ov;
}
function newItem151(data={}){
  return {description:data.description||'',quantity:data.quantity??1,unit:data.unit||'stueck',unit_price:data.unit_price??0};
}
function renderItems151(){
  const box=E('invoiceItems151');if(!box)return;
  box.innerHTML=localItems151.map((it,i)=>`
    <div class="invoice-item151" data-i151="${i}">
      <input class="invoice-desc151" value="${esc(it.description)}" placeholder="Beschreibung">
      <input class="invoice-qty151" type="number" min="0" step="0.01" value="${it.quantity}">
      <select class="invoice-unit151">
        <option value="stueck" ${it.unit==='stueck'?'selected':''}>Stück</option>
        <option value="km" ${it.unit==='km'?'selected':''}>km</option>
        <option value="m2" ${it.unit==='m2'?'selected':''}>m²</option>
        <option value="stunden" ${it.unit==='stunden'?'selected':''}>Stunden</option>
        <option value="ha" ${it.unit==='ha'?'selected':''}>Hektar</option>
      </select>
      <input class="invoice-price151" type="number" min="0" step="0.01" value="${it.unit_price}">
      <b class="invoice-line-total151">${money151((+it.quantity||0)*(+it.unit_price||0))}</b>
      <button class="danger compact invoice-remove151" type="button">×</button>
    </div>`).join('');
  box.querySelectorAll('.invoice-item151').forEach(row=>{
    const i=+row.dataset.i151;
    row.querySelector('.invoice-desc151').oninput=e=>{localItems151[i].description=e.target.value};
    row.querySelector('.invoice-qty151').oninput=e=>{localItems151[i].quantity=+e.target.value||0;renderTotals151();row.querySelector('.invoice-line-total151').textContent=money151(localItems151[i].quantity*localItems151[i].unit_price)};
    row.querySelector('.invoice-unit151').onchange=e=>localItems151[i].unit=e.target.value;
    row.querySelector('.invoice-price151').oninput=e=>{localItems151[i].unit_price=+e.target.value||0;renderTotals151();row.querySelector('.invoice-line-total151').textContent=money151(localItems151[i].quantity*localItems151[i].unit_price)};
    row.querySelector('.invoice-remove151').onclick=()=>{localItems151.splice(i,1);if(!localItems151.length)localItems151=[newItem151()];renderItems151();renderTotals151()};
  });
  renderTotals151();
}
function renderTotals151(){
  const net=localItems151.reduce((s,x)=>s+(+x.quantity||0)*(+x.unit_price||0),0);
  const vat=net*((+E('invoiceVat151')?.value||0)/100);
  E('invoiceNet151').textContent=money151(net);
  E('invoiceVatAmount151').textContent=money151(vat);
  E('invoiceGross151').textContent=money151(net+vat);
}
async function resetInvoice151(){
  E('invoiceId151').value='';
  E('invoiceEditorTitle151').textContent='Neue Rechnung';
  E('invoiceNumber151').value=await nextNumber151();
  E('invoiceStatus151').value='entwurf';
  E('invoiceCustomer151').value='';
  E('invoiceOrder151').value='';
  E('invoiceDate151').value=today151();
  E('invoiceDue151').value=addDays151(today151(),14);
  E('invoiceVat151').value='19';
  E('invoiceNotes151').value='';
  E('deleteInvoice151').hidden=true;
  E('closeInvoice151').hidden=true;
  localItems151=[newItem151()];
  renderItems151();
}
function loadOrderIntoInvoice151(id){
  const o=orders.find(x=>+x.id===+id);if(!o)return;
  E('invoiceCustomer151').value=o.customer_id||'';
  const items=o.order_items||[];
  localItems151=items.length?items.map(x=>newItem151({
    description:x.product||x.description||o.order_type,
    quantity:x.amount||x.quantity||1,
    unit:x.unit||'stueck',
    unit_price:x.unit_price||0
  })):[newItem151({description:o.order_type,quantity:1,unit:'stueck',unit_price:0})];
  renderItems151();
}
async function saveInvoice151(){
  const customer_id=+E('invoiceCustomer151').value||0;
  if(!customer_id)return alert('Bitte Kunde auswählen.');
  if(!localItems151.length||!localItems151.some(x=>x.description.trim()))return alert('Bitte mindestens eine Rechnungsposition eingeben.');

  const id=+E('invoiceId151').value||0;
  const obj={
    invoice_number:E('invoiceNumber151').value.trim(),
    customer_id,
    order_id:+E('invoiceOrder151').value||null,
    invoice_date:E('invoiceDate151').value||today151(),
    due_date:E('invoiceDue151').value||null,
    status:E('invoiceStatus151').value,
    vat_rate:+E('invoiceVat151').value||0,
    notes:E('invoiceNotes151').value.trim()||null,
    updated_at:new Date().toISOString()
  };
  try{
    let invoiceId=id;
    if(id) await update('invoices',obj,'id=eq.'+id);
    else{
      const rows=await insert('invoices',{...obj,created_by:me.id},true);
      invoiceId=rows[0].id;
      E('invoiceId151').value=invoiceId;
    }
    await remove('invoice_items','invoice_id=eq.'+invoiceId);
    for(let i=0;i<localItems151.length;i++){
      const x=localItems151[i];if(!x.description.trim())continue;
      await insert('invoice_items',{
        invoice_id:invoiceId,description:x.description.trim(),quantity:+x.quantity||0,unit:x.unit||null,unit_price:+x.unit_price||0,sort_order:i
      },false);
    }
    await loadInvoices151();
    alert('Rechnung wurde gespeichert.');
    openInvoice151(invoiceId);
  }catch(e){alert('Rechnung konnte nicht gespeichert werden: '+e.message)}
}
function invoiceTotalsFromRows151(id){
  const rows=invoiceItems151.filter(x=>+x.invoice_id===+id);
  const net=rows.reduce((s,x)=>s+(+x.quantity||0)*(+x.unit_price||0),0);
  const inv=invoices151.find(x=>+x.id===+id);const vat=net*((+inv?.vat_rate||0)/100);
  return {net,vat,gross:net+vat};
}
function renderInvoiceList151(){
  const box=E('invoiceList151');if(!box)return;
  box.innerHTML=invoices151.map(inv=>{
    const t=invoiceTotalsFromRows151(inv.id);
    return `<div class="invoice-row151">
      <div><b>${esc(inv.invoice_number)}</b><p>${esc(invoiceCustomerName151(inv.customer_id))} · ${new Date(inv.invoice_date+'T12:00:00').toLocaleDateString('de-DE')} · ${money151(t.gross)}</p><small>${esc(inv.status)}</small></div>
      <div class="invoice-actions151"><button class="secondary compact" data-inv-edit151="${inv.id}">Bearbeiten</button><button class="secondary compact" data-inv-print151="${inv.id}">Drucken / PDF</button></div>
    </div>`;
  }).join('')||'<p class="muted">Noch keine Rechnungen.</p>';
  box.querySelectorAll('[data-inv-edit151]').forEach(b=>b.onclick=()=>openInvoice151(+b.dataset.invEdit151));
  box.querySelectorAll('[data-inv-print151]').forEach(b=>b.onclick=()=>{openInvoice151(+b.dataset.invPrint151);setTimeout(printInvoice151,100)});
}
function openInvoice151(id){
  const inv=invoices151.find(x=>+x.id===+id);if(!inv)return;
  E('invoiceId151').value=inv.id;
  E('invoiceEditorTitle151').textContent='Rechnung bearbeiten';
  E('invoiceNumber151').value=inv.invoice_number;
  E('invoiceStatus151').value=inv.status;
  E('invoiceCustomer151').value=inv.customer_id||'';
  E('invoiceOrder151').value=inv.order_id||'';
  E('invoiceDate151').value=inv.invoice_date||'';
  E('invoiceDue151').value=inv.due_date||'';
  E('invoiceVat151').value=String(inv.vat_rate??19);
  E('invoiceNotes151').value=inv.notes||'';
  localItems151=invoiceItems151.filter(x=>+x.invoice_id===+id).map(newItem151);
  if(!localItems151.length)localItems151=[newItem151()];
  E('deleteInvoice151').hidden=false;E('closeInvoice151').hidden=false;
  renderItems151();
  E('invoiceEditor151').scrollIntoView({behavior:'smooth',block:'start'});
}
async function deleteInvoice151(){
  const id=+E('invoiceId151').value||0;if(!id)return;
  if(!confirm('Rechnung wirklich löschen?'))return;
  try{await remove('invoices','id=eq.'+id);await loadInvoices151();await resetInvoice151()}catch(e){alert(e.message)}
}
function printInvoice151(){
  const c=cust.find(x=>+x.id===+E('invoiceCustomer151').value);
  if(!c)return alert('Bitte Kunde auswählen.');
  const net=localItems151.reduce((s,x)=>s+x.quantity*x.unit_price,0),rate=+E('invoiceVat151').value||0,vat=net*rate/100,gross=net+vat;
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(E('invoiceNumber151').value)}</title>
  <style>body{font-family:Arial,sans-serif;color:#222;padding:45px;max-width:900px;margin:auto}h1{margin:0 0 30px}.top{display:flex;justify-content:space-between}.box{margin:28px 0}.meta{display:grid;grid-template-columns:160px 1fr;gap:7px}table{width:100%;border-collapse:collapse;margin-top:25px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th:nth-child(n+2),td:nth-child(n+2){text-align:right}.totals{margin-left:auto;width:330px;margin-top:25px}.totals div{display:flex;justify-content:space-between;padding:7px}.gross{font-size:20px;font-weight:bold;border-top:2px solid #222}.notes{margin-top:35px;white-space:pre-wrap}@media print{button{display:none}}</style></head><body>
  <div class="top"><div><h1>Rechnung</h1><b>FarmManager</b></div><div><b>${esc(E('invoiceNumber151').value)}</b></div></div>
  <div class="box"><b>Rechnung an:</b><br>${esc(c.name)}${c.company?'<br>'+esc(c.company):''}${c.address?'<br>'+esc(c.address):''}</div>
  <div class="meta"><span>Rechnungsdatum:</span><b>${new Date(E('invoiceDate151').value+'T12:00:00').toLocaleDateString('de-DE')}</b><span>Fällig am:</span><b>${E('invoiceDue151').value?new Date(E('invoiceDue151').value+'T12:00:00').toLocaleDateString('de-DE'):'—'}</b></div>
  <table><thead><tr><th>Leistung</th><th>Menge</th><th>Einheit</th><th>Einzelpreis</th><th>Gesamt</th></tr></thead><tbody>
  ${localItems151.filter(x=>x.description.trim()).map(x=>`<tr><td>${esc(x.description)}</td><td>${x.quantity}</td><td>${esc(unitLabel151(x.unit))}</td><td>${money151(x.unit_price)}</td><td>${money151(x.quantity*x.unit_price)}</td></tr>`).join('')}
  </tbody></table>
  <div class="totals"><div><span>Netto</span><b>${money151(net)}</b></div><div><span>MwSt. ${rate}%</span><b>${money151(vat)}</b></div><div class="gross"><span>Gesamt</span><b>${money151(gross)}</b></div></div>
  ${E('invoiceNotes151').value?'<div class="notes">'+esc(E('invoiceNotes151').value)+'</div>':''}
  <script>window.onload=()=>window.print()<\/script></body></html>`;
  const w=window.open('','_blank');if(!w)return alert('Pop-up wurde blockiert. Bitte Pop-ups für FarmManager erlauben.');w.document.write(html);w.document.close();
}

function setup151(){
  if(!E('p-rechnungen'))return;
  populateInvoiceSelectors151();
  E('addInvoiceItem151').onclick=()=>{localItems151.push(newItem151());renderItems151()};
  E('invoiceVat151').onchange=renderTotals151;
  E('invoiceOrder151').onchange=()=>{const id=+E('invoiceOrder151').value||0;if(id)loadOrderIntoInvoice151(id)};
  E('saveInvoice151').onclick=saveInvoice151;
  E('deleteInvoice151').onclick=deleteInvoice151;
  E('printInvoice151').onclick=printInvoice151;
  E('newInvoice151').onclick=resetInvoice151;
  E('closeInvoice151').onclick=resetInvoice151;
  document.querySelector('nav button[data-page="rechnungen"]')?.addEventListener('click',()=>setTimeout(()=>{populateInvoiceSelectors151();loadInvoices151()},80));
}
const oldLoad151=load;
load=async function(){await oldLoad151();populateInvoiceSelectors151();await loadInvoices151()};
setTimeout(async()=>{setup151();await loadInvoices151();await resetInvoice151()},1700);
})();
