
/* FarmManager V15.3 – übersichtliches Rechnungsportal, auftragsnah */
(function(){
const E=id=>document.getElementById(id);
let invoices=[],invoiceItems=[],localItems=[];
const money=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(+v||0);
const today=()=>new Date().toISOString().slice(0,10);
const addDays=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const cname=id=>cust.find(c=>+c.id===+id)?.name||'Kunde';
const unitLabel=u=>({stueck:'Stück',km:'km',m2:'m²',stunden:'h',ha:'ha'})[u]||u||'';

async function nextNo(){try{return await req('rpc/next_invoice_number',{method:'POST',body:'{}'})}catch(_){return 'RE-'+new Date().getFullYear()+'-NEU'}}
function item(d={}){return {description:d.description||'',quantity:+(d.quantity??1),unit:d.unit||'stueck',unit_price:+(d.unit_price||0)}}
function totals(rows=localItems,rate=+(E('invoiceVat151')?.value||0)){const net=rows.reduce((s,x)=>s+x.quantity*x.unit_price,0),vat=net*rate/100;return{net,vat,gross:net+vat}}
function renderTotals(){const t=totals();E('invoiceNet151').textContent=money(t.net);E('invoiceVatAmount151').textContent=money(t.vat);E('invoiceGross151').textContent=money(t.gross)}
function renderItems(){
 E('invoiceItems151').innerHTML=localItems.map((x,i)=>`<div class="invoice-item151" data-i="${i}"><input class="desc" value="${esc(x.description)}" placeholder="Leistung / Produkt"><input class="qty" type="number" min="0" step="0.01" value="${x.quantity}"><select class="unit"><option value="stueck" ${x.unit==='stueck'?'selected':''}>Stück</option><option value="km" ${x.unit==='km'?'selected':''}>km</option><option value="m2" ${x.unit==='m2'?'selected':''}>m²</option><option value="stunden" ${x.unit==='stunden'?'selected':''}>Stunden</option><option value="ha" ${x.unit==='ha'?'selected':''}>Hektar</option></select><input class="price" type="number" min="0" step="0.01" value="${x.unit_price}"><b>${money(x.quantity*x.unit_price)}</b><button class="danger compact rem">×</button></div>`).join('');
 E('invoiceItems151').querySelectorAll('.invoice-item151').forEach(row=>{const i=+row.dataset.i;row.querySelector('.desc').oninput=e=>localItems[i].description=e.target.value;row.querySelector('.qty').oninput=e=>{localItems[i].quantity=+e.target.value||0;renderItems()};row.querySelector('.unit').onchange=e=>localItems[i].unit=e.target.value;row.querySelector('.price').oninput=e=>{localItems[i].unit_price=+e.target.value||0;renderItems()};row.querySelector('.rem').onclick=()=>{localItems.splice(i,1);if(!localItems.length)localItems=[item()];renderItems()}});
 renderTotals();
}
function populate(){
 const c=E('invoiceCustomer151'),o=E('invoiceOrder151');if(!c||!o)return;
 const cv=c.value,ov=o.value;c.innerHTML='<option value="">Kunde wählen …</option>'+cust.map(x=>`<option value="${x.id}">${esc(x.name)}${x.company?' · '+esc(x.company):''}</option>`).join('');
 o.innerHTML='<option value="">Keinen Auftrag übernehmen</option>'+orders.map(x=>`<option value="${x.id}">#${x.id} · ${esc(x.order_type)} · ${esc(x.customers?.name||cname(x.customer_id))}</option>`).join('');
 if(cv)c.value=cv;if(ov)o.value=ov;
}
function orderFields(id){const ids=(typeof orderFields!=='undefined'?orderFields:[]).filter(x=>+x.order_id===+id).map(x=>+x.field_id);return (typeof fields!=='undefined'?fields:[]).filter(f=>ids.includes(+f.id))}
function showOrderInfo(o){
 if(!o){E('invoiceOrderInfo153').innerHTML='';return}
 const m=machines.find(x=>+x.id===+o.machine_id),fs=orderFields(o.id);
 E('invoiceOrderInfo153').innerHTML=`<div><b>Auftrag #${o.id} · ${esc(o.order_type)}</b><span>${o.delivery_date?new Date(o.delivery_date+'T12:00:00').toLocaleDateString('de-DE'):'Kein Termin'}${m?' · '+esc(m.name):''}${fs.length?' · '+fs.map(f=>esc(f.name)).join(', '):''}</span></div>`;
}
function importOrder(id){
 const o=orders.find(x=>+x.id===+id);if(!o)return;E('invoiceCustomer151').value=o.customer_id||'';
 const rows=(o.order_items||[]).map(x=>item({description:x.product||x.description||o.order_type,quantity:x.amount||x.quantity||1,unit:x.unit||'stueck',unit_price:x.unit_price||0}));
 if(+o.kilometers>0&&+o.kilometer_price>0)rows.push(item({description:'Anfahrt / Fahrtkosten',quantity:+o.kilometers,unit:'km',unit_price:+o.kilometer_price}));
 localItems=rows.length?rows:[item({description:o.order_type})];showOrderInfo(o);renderItems();
}
async function reset(){
 E('invoiceId151').value='';E('invoiceEditorTitle151').textContent='Neue Rechnung';E('invoiceNumber151').value=await nextNo();E('invoiceStatus151').value='entwurf';E('invoiceCustomer151').value='';E('invoiceOrder151').value='';E('invoiceDate151').value=today();E('invoiceDue151').value=addDays(today(),14);E('invoiceVat151').value='19';E('invoiceNotes151').value='';E('deleteInvoice151').hidden=true;E('closeInvoice151').hidden=true;localItems=[item()];showOrderInfo(null);renderItems();
}
async function loadInvoices(){
 [invoices,invoiceItems]=await Promise.all([select('invoices','select=*&order=invoice_date.desc,id.desc'),select('invoice_items','select=*&order=invoice_id.asc,sort_order.asc,id.asc')]);
 renderList();renderKpis();
}
function invTotals(id){const inv=invoices.find(x=>+x.id===+id),rows=invoiceItems.filter(x=>+x.invoice_id===+id).map(x=>item(x));return totals(rows,+inv?.vat_rate||0)}
function renderKpis(){const draft=invoices.filter(x=>x.status==='entwurf').length,sent=invoices.filter(x=>x.status==='versendet').length,paid=invoices.filter(x=>x.status==='bezahlt').length,open=invoices.filter(x=>x.status!=='bezahlt').reduce((s,x)=>s+invTotals(x.id).gross,0);E('invDraftCount153').textContent=draft;E('invSentCount153').textContent=sent;E('invPaidCount153').textContent=paid;E('invOpenValue153').textContent=money(open)}
function renderList(){
 const q=(E('invoiceSearch153')?.value||'').toLowerCase();
 const rows=invoices.filter(x=>(x.invoice_number+' '+cname(x.customer_id)).toLowerCase().includes(q));
 E('invoiceList151').innerHTML=rows.map(x=>`<div class="invoice-row151"><div><b>${esc(x.invoice_number)}</b><p>${esc(cname(x.customer_id))} · ${new Date(x.invoice_date+'T12:00:00').toLocaleDateString('de-DE')} · ${money(invTotals(x.id).gross)}</p><small class="invoice-status153 status-${x.status}">${esc(x.status)}</small></div><div class="invoice-actions151"><button class="secondary compact" data-edit="${x.id}">Bearbeiten</button><button class="secondary compact" data-print="${x.id}">PDF / Drucken</button></div></div>`).join('')||'<p class="muted">Keine Rechnungen gefunden.</p>';
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openInvoice(+b.dataset.edit));document.querySelectorAll('[data-print]').forEach(b=>b.onclick=()=>{openInvoice(+b.dataset.print);setTimeout(printInvoice,100)});
}
function openInvoice(id){const x=invoices.find(z=>+z.id===+id);if(!x)return;E('invoiceId151').value=x.id;E('invoiceEditorTitle151').textContent='Rechnung bearbeiten';E('invoiceNumber151').value=x.invoice_number;E('invoiceStatus151').value=x.status;E('invoiceCustomer151').value=x.customer_id||'';E('invoiceOrder151').value=x.order_id||'';E('invoiceDate151').value=x.invoice_date||'';E('invoiceDue151').value=x.due_date||'';E('invoiceVat151').value=String(x.vat_rate??19);E('invoiceNotes151').value=x.notes||'';localItems=invoiceItems.filter(z=>+z.invoice_id===id).map(item);if(!localItems.length)localItems=[item()];E('deleteInvoice151').hidden=false;E('closeInvoice151').hidden=false;showOrderInfo(orders.find(o=>+o.id===+x.order_id));renderItems();E('invoiceEditor151').scrollIntoView({behavior:'smooth'})}
async function save(){
 const customer_id=+E('invoiceCustomer151').value||0;if(!customer_id)return alert('Bitte Kunde auswählen.');
 const id=+E('invoiceId151').value||0,obj={invoice_number:E('invoiceNumber151').value.trim(),customer_id,order_id:+E('invoiceOrder151').value||null,invoice_date:E('invoiceDate151').value||today(),due_date:E('invoiceDue151').value||null,status:E('invoiceStatus151').value,vat_rate:+E('invoiceVat151').value||0,notes:E('invoiceNotes151').value.trim()||null,updated_at:new Date().toISOString()};
 let iid=id;if(id)await update('invoices',obj,'id=eq.'+id);else{iid=(await insert('invoices',{...obj,created_by:me.id},true))[0].id;E('invoiceId151').value=iid}await remove('invoice_items','invoice_id=eq.'+iid);for(let i=0;i<localItems.length;i++){const x=localItems[i];if(!x.description.trim())continue;await insert('invoice_items',{invoice_id:iid,description:x.description.trim(),quantity:x.quantity,unit:x.unit,unit_price:x.unit_price,sort_order:i},false)}await loadInvoices();alert('Rechnung gespeichert.');openInvoice(iid)}
async function del(){const id=+E('invoiceId151').value||0;if(id&&confirm('Rechnung wirklich löschen?')){await remove('invoices','id=eq.'+id);await loadInvoices();await reset()}}
function printInvoice(){const c=cust.find(x=>+x.id===+E('invoiceCustomer151').value);if(!c)return;const t=totals(),rate=+E('invoiceVat151').value||0;const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(E('invoiceNumber151').value)}</title><style>body{font-family:Arial,sans-serif;color:#222;padding:45px;max-width:900px;margin:auto}h1{font-size:34px}.top{display:flex;justify-content:space-between}.box{margin:28px 0}.meta{display:grid;grid-template-columns:160px 1fr;gap:7px}table{width:100%;border-collapse:collapse;margin-top:25px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th:nth-child(n+2),td:nth-child(n+2){text-align:right}.totals{margin-left:auto;width:330px;margin-top:25px}.totals div{display:flex;justify-content:space-between;padding:7px}.gross{font-size:20px;font-weight:bold;border-top:2px solid #222}.notes{margin-top:35px;white-space:pre-wrap}</style></head><body><div class="top"><div><h1>Rechnung</h1><b>FarmManager</b></div><b>${esc(E('invoiceNumber151').value)}</b></div><div class="box"><b>Rechnung an:</b><br>${esc(c.name)}${c.company?'<br>'+esc(c.company):''}${c.address?'<br>'+esc(c.address):''}</div><div class="meta"><span>Rechnungsdatum:</span><b>${new Date(E('invoiceDate151').value+'T12:00:00').toLocaleDateString('de-DE')}</b><span>Fällig am:</span><b>${E('invoiceDue151').value?new Date(E('invoiceDue151').value+'T12:00:00').toLocaleDateString('de-DE'):'—'}</b></div><table><thead><tr><th>Leistung</th><th>Menge</th><th>Einheit</th><th>Einzelpreis</th><th>Gesamt</th></tr></thead><tbody>${localItems.filter(x=>x.description.trim()).map(x=>`<tr><td>${esc(x.description)}</td><td>${x.quantity}</td><td>${esc(unitLabel(x.unit))}</td><td>${money(x.unit_price)}</td><td>${money(x.quantity*x.unit_price)}</td></tr>`).join('')}</tbody></table><div class="totals"><div><span>Netto</span><b>${money(t.net)}</b></div><div><span>MwSt. ${rate}%</span><b>${money(t.vat)}</b></div><div class="gross"><span>Gesamt</span><b>${money(t.gross)}</b></div></div>${E('invoiceNotes151').value?'<div class="notes">'+esc(E('invoiceNotes151').value)+'</div>':''}<script>window.onload=()=>window.print()<\/script></body></html>`;const w=window.open('','_blank');if(!w)return alert('Pop-up blockiert.');w.document.write(html);w.document.close()}
function setup(){populate();E('addInvoiceItem151').onclick=()=>{localItems.push(item());renderItems()};E('invoiceVat151').onchange=renderTotals;E('invoiceOrder151').onchange=()=>{const id=+E('invoiceOrder151').value||0;if(id)importOrder(id);else showOrderInfo(null)};E('saveInvoice151').onclick=save;E('deleteInvoice151').onclick=del;E('printInvoice151').onclick=printInvoice;E('newInvoice151').onclick=reset;E('closeInvoice151').onclick=reset;E('invoiceSearch153').oninput=renderList;document.querySelector('nav button[data-page="rechnungen"]')?.addEventListener('click',()=>setTimeout(()=>{populate();loadInvoices()},60))}
const oldLoad=load;load=async function(){await oldLoad();populate();await loadInvoices()};
setTimeout(async()=>{setup();await loadInvoices();await reset()},1800);
})();
