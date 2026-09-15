
/* FarmManager V16 – Rechnungsportal */
(function(){
const E=id=>document.getElementById(id);
const MAX_ITEMS=5;
let invoices160=[], invoiceItems160=[];
let currentItems160=Array.from({length:MAX_ITEMS},()=>blankItem160());

const money160=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(+v||0);
const today160=()=>new Date().toISOString().slice(0,10);
const addDays160=(date,days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)};
const unitText160=u=>({stueck:'Stück',km:'km',m2:'m²',stunden:'Stunden',ha:'Hektar'})[u]||u||'';
function blankItem160(){return {description:'',quantity:1,unit:'stueck',unit_price:0}}
function normalizeItem160(x={}){return {description:x.description||x.product||'',quantity:+(x.quantity??x.amount??1)||0,unit:x.unit||'stueck',unit_price:+x.unit_price||0}}
function customer160(id){return cust.find(x=>+x.id===+id)}
function invoiceRows160(id){return invoiceItems160.filter(x=>+x.invoice_id===+id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))}
function calc160(items=currentItems160,rate=+(E('invoiceVat160')?.value||0)){
  const used=items.filter(x=>String(x.description||'').trim());
  const net=used.reduce((s,x)=>s+(+x.quantity||0)*(+x.unit_price||0),0);
  const vat=net*(rate/100);
  return {net,vat,gross:net+vat};
}
function renderTotals160(){
  const t=calc160();
  E('invoiceNet160').textContent=money160(t.net);
  E('invoiceVatAmount160').textContent=money160(t.vat);
  E('invoiceGross160').textContent=money160(t.gross);
}
function renderItems160(){
  const box=E('invoiceItems160'); if(!box)return;
  box.innerHTML=currentItems160.map((x,i)=>`
    <div class="invoice-position160" data-pos160="${i}">
      <div class="invoice-pos-number160">${i+1}</div>
      <input class="pos-desc160" value="${esc(x.description||'')}" placeholder="Leistung ${i+1}">
      <input class="pos-qty160" type="number" min="0" step="0.01" value="${x.quantity}">
      <select class="pos-unit160">
        <option value="stueck" ${x.unit==='stueck'?'selected':''}>Stück</option>
        <option value="km" ${x.unit==='km'?'selected':''}>km</option>
        <option value="m2" ${x.unit==='m2'?'selected':''}>m²</option>
        <option value="stunden" ${x.unit==='stunden'?'selected':''}>Stunden</option>
        <option value="ha" ${x.unit==='ha'?'selected':''}>Hektar</option>
      </select>
      <input class="pos-price160" type="number" min="0" step="0.01" value="${x.unit_price}">
      <b class="pos-total160">${money160((+x.quantity||0)*(+x.unit_price||0))}</b>
    </div>`).join('');
  box.querySelectorAll('.invoice-position160').forEach(row=>{
    const i=+row.dataset.pos160;
    row.querySelector('.pos-desc160').oninput=e=>{currentItems160[i].description=e.target.value;renderTotals160()};
    row.querySelector('.pos-qty160').oninput=e=>{currentItems160[i].quantity=+e.target.value||0;row.querySelector('.pos-total160').textContent=money160(currentItems160[i].quantity*currentItems160[i].unit_price);renderTotals160()};
    row.querySelector('.pos-unit160').onchange=e=>currentItems160[i].unit=e.target.value;
    row.querySelector('.pos-price160').oninput=e=>{currentItems160[i].unit_price=+e.target.value||0;row.querySelector('.pos-total160').textContent=money160(currentItems160[i].quantity*currentItems160[i].unit_price);renderTotals160()};
  });
  renderTotals160();
}
async function nextNumber160(){
  try{
    const x=await req('rpc/next_invoice_number',{method:'POST',body:'{}'});
    return Array.isArray(x)?x[0]:x;
  }catch(_){return 'RE-'+new Date().getFullYear()+'-NEU'}
}
function populateSelectors160(){
  const cs=E('invoiceCustomer160'),os=E('invoiceOrder160'); if(!cs||!os)return;
  const cv=cs.value,ov=os.value;
  cs.innerHTML='<option value="">Kunde wählen …</option>'+cust.map(c=>`<option value="${c.id}">${esc(c.name)}${c.company?' · '+esc(c.company):''}</option>`).join('');
  os.innerHTML='<option value="">Keinen Auftrag übernehmen</option>'+orders.map(o=>`<option value="${o.id}">#${o.id} · ${esc(o.order_type)} · ${esc(o.customers?.name||customer160(o.customer_id)?.name||'Kunde')}</option>`).join('');
  if(cv)cs.value=cv;if(ov)os.value=ov;
}
function customerToInvoice160(){
  const c=customer160(E('invoiceCustomer160').value);
  if(!c)return;
  E('invoiceCustomerName160').value=c.name||'';
  E('invoiceCustomerCompany160').value=c.company||'';
  E('invoiceCustomerAddress160').value=c.address||'';
  if(!E('invoiceEmail160').value)E('invoiceEmail160').value=c.email||'';
}
function importOrder160(id){
  const o=orders.find(x=>+x.id===+id); if(!o)return;
  E('invoiceCustomer160').value=o.customer_id||'';
  customerToInvoice160();
  const rows=(o.order_items||[]).map(normalizeItem160);
  if(+o.kilometers>0 && +o.kilometer_price>0){
    rows.push(normalizeItem160({description:'Fahrtkosten / Anfahrt',quantity:+o.kilometers,unit:'km',unit_price:+o.kilometer_price}));
  }
  currentItems160=Array.from({length:MAX_ITEMS},(_,i)=>rows[i]||blankItem160());
  E('invoiceReference160').value='Auftrag #'+o.id;
  E('invoiceSubject160').value='Rechnung für '+(o.order_type||'Leistung');
  E('invoiceIntro160').value='Vielen Dank für Ihren Auftrag. Wir berechnen Ihnen folgende Leistungen:';
  renderItems160();
}
async function resetInvoice160(){
  E('invoiceId160').value='';
  E('invoiceEditorTitle160').textContent='Neue Rechnung';
  E('invoiceNumber160').value=await nextNumber160();
  E('invoiceStatus160').value='entwurf';
  E('invoiceCustomer160').value='';
  E('invoiceOrder160').value='';
  E('invoiceCustomerName160').value='';
  E('invoiceCustomerCompany160').value='';
  E('invoiceCustomerAddress160').value='';
  E('invoiceDate160').value=today160();
  E('invoiceDue160').value=addDays160(today160(),14);
  E('invoiceServicePeriod160').value='';
  E('invoiceVat160').value='19';
  E('invoiceSubject160').value='Rechnung';
  E('invoiceSalutation160').value='';
  E('invoiceIntro160').value='Vielen Dank für Ihren Auftrag. Wir berechnen Ihnen folgende Leistungen:';
  E('invoicePaymentTerms160').value='Zahlbar innerhalb von 14 Tagen ohne Abzug.';
  E('invoiceFooter160').value='';
  E('invoiceReference160').value='';
  E('invoiceEmail160').value='';
  E('invoiceEmailSubject160').value='Ihre Rechnung '+E('invoiceNumber160').value;
  E('invoiceEmailMessage160').value='Guten Tag,\n\nim Anhang finden Sie Ihre Rechnung.\n\nVielen Dank für Ihren Auftrag.';
  E('deleteInvoice160').hidden=true;
  E('invoiceSendStatus160').textContent='';
  currentItems160=Array.from({length:MAX_ITEMS},()=>blankItem160());
  renderItems160();
}
function invoiceObject160(){
  return {
    invoice_number:E('invoiceNumber160').value.trim(),
    customer_id:+E('invoiceCustomer160').value||null,
    order_id:+E('invoiceOrder160').value||null,
    invoice_date:E('invoiceDate160').value||today160(),
    due_date:E('invoiceDue160').value||null,
    status:E('invoiceStatus160').value,
    vat_rate:+E('invoiceVat160').value||0,
    notes:null,
    recipient_email:E('invoiceEmail160').value.trim()||null,
    subject:E('invoiceSubject160').value.trim()||'Rechnung',
    salutation:E('invoiceSalutation160').value.trim()||null,
    intro_text:E('invoiceIntro160').value.trim()||null,
    service_period:E('invoiceServicePeriod160').value.trim()||null,
    payment_terms:E('invoicePaymentTerms160').value.trim()||null,
    customer_name_override:E('invoiceCustomerName160').value.trim()||null,
    customer_company_override:E('invoiceCustomerCompany160').value.trim()||null,
    customer_address_override:E('invoiceCustomerAddress160').value.trim()||null,
    reference:E('invoiceReference160').value.trim()||null,
    email_subject:E('invoiceEmailSubject160').value.trim()||null,
    email_message:E('invoiceEmailMessage160').value.trim()||null,
    footer_text:E('invoiceFooter160').value.trim()||null,
    updated_at:new Date().toISOString()
  };
}
async function saveInvoice160(showAlert=true){
  const obj=invoiceObject160();
  if(!obj.customer_id && !obj.customer_name_override)return alert('Bitte Kunde auswählen oder Kundennamen eintragen.');
  if(!currentItems160.some(x=>String(x.description||'').trim()))return alert('Bitte mindestens eine Rechnungsposition eintragen.');
  try{
    let id=+E('invoiceId160').value||0;
    if(id) await update('invoices',obj,'id=eq.'+id);
    else{
      const rows=await insert('invoices',{...obj,created_by:me.id},true);
      id=rows[0].id;E('invoiceId160').value=id;
    }
    await remove('invoice_items','invoice_id=eq.'+id);
    for(let i=0;i<MAX_ITEMS;i++){
      const x=currentItems160[i];
      if(!String(x.description||'').trim())continue;
      await insert('invoice_items',{invoice_id:id,description:x.description.trim(),quantity:+x.quantity||0,unit:x.unit||'stueck',unit_price:+x.unit_price||0,sort_order:i},false);
    }
    await loadInvoices160();
    E('deleteInvoice160').hidden=false;
    if(showAlert)alert('Rechnung gespeichert.');
    return id;
  }catch(e){alert('Rechnung konnte nicht gespeichert werden: '+e.message);return null}
}
async function loadInvoices160(){
  if(!token)return;
  [invoices160,invoiceItems160]=await Promise.all([
    select('invoices','select=*&order=invoice_date.desc,id.desc'),
    select('invoice_items','select=*&order=invoice_id.asc,sort_order.asc,id.asc')
  ]);
  renderArchive160();renderStats160();
}
function invoiceTotalById160(id){
  const inv=invoices160.find(x=>+x.id===+id);
  const rows=invoiceRows160(id).map(normalizeItem160);
  return calc160(rows,+inv?.vat_rate||0);
}
function renderStats160(){
  E('invDraft160').textContent=invoices160.filter(x=>x.status==='entwurf').length;
  E('invSent160').textContent=invoices160.filter(x=>x.status==='versendet').length;
  E('invPaid160').textContent=invoices160.filter(x=>x.status==='bezahlt').length;
  E('invOpenValue160').textContent=money160(invoices160.filter(x=>x.status!=='bezahlt').reduce((s,x)=>s+invoiceTotalById160(x.id).gross,0));
}
function displayCustomer160(inv){
  return inv.customer_name_override||customer160(inv.customer_id)?.name||'Kunde';
}
function renderArchive160(){
  const box=E('invoiceList160');if(!box)return;
  const q=(E('invoiceSearch160')?.value||'').toLowerCase();
  const rows=invoices160.filter(x=>(x.invoice_number+' '+displayCustomer160(x)).toLowerCase().includes(q));
  box.innerHTML=rows.map(inv=>`
    <div class="invoice-row160">
      <div>
        <b>${esc(inv.invoice_number)}</b>
        <p>${esc(displayCustomer160(inv))} · ${new Date(inv.invoice_date+'T12:00:00').toLocaleDateString('de-DE')} · ${money160(invoiceTotalById160(inv.id).gross)}</p>
        <small class="invoice-status160 status-${inv.status}">${esc(inv.status)}${inv.sent_at?' · gesendet '+new Date(inv.sent_at).toLocaleDateString('de-DE'):''}</small>
      </div>
      <div class="invoice-row-actions160">
        <button class="secondary compact" data-open160="${inv.id}">Bearbeiten</button>
        <button class="secondary compact" data-pdf160="${inv.id}">PDF</button>
      </div>
    </div>`).join('')||'<p class="muted">Keine Rechnungen gefunden.</p>';
  box.querySelectorAll('[data-open160]').forEach(b=>b.onclick=()=>openInvoice160(+b.dataset.open160));
  box.querySelectorAll('[data-pdf160]').forEach(b=>b.onclick=async()=>{openInvoice160(+b.dataset.pdf160);setTimeout(()=>previewPdf160(),120)});
}
function openInvoice160(id){
  const inv=invoices160.find(x=>+x.id===+id);if(!inv)return;
  E('invoiceId160').value=inv.id;
  E('invoiceEditorTitle160').textContent='Rechnung bearbeiten';
  E('invoiceNumber160').value=inv.invoice_number||'';
  E('invoiceStatus160').value=inv.status||'entwurf';
  E('invoiceCustomer160').value=inv.customer_id||'';
  E('invoiceOrder160').value=inv.order_id||'';
  E('invoiceDate160').value=inv.invoice_date||today160();
  E('invoiceDue160').value=inv.due_date||'';
  E('invoiceVat160').value=String(inv.vat_rate??19);
  E('invoiceServicePeriod160').value=inv.service_period||'';
  E('invoiceSubject160').value=inv.subject||'Rechnung';
  E('invoiceSalutation160').value=inv.salutation||'';
  E('invoiceIntro160').value=inv.intro_text||'';
  E('invoicePaymentTerms160').value=inv.payment_terms||'';
  E('invoiceFooter160').value=inv.footer_text||'';
  E('invoiceReference160').value=inv.reference||'';
  E('invoiceCustomerName160').value=inv.customer_name_override||customer160(inv.customer_id)?.name||'';
  E('invoiceCustomerCompany160').value=inv.customer_company_override||customer160(inv.customer_id)?.company||'';
  E('invoiceCustomerAddress160').value=inv.customer_address_override||customer160(inv.customer_id)?.address||'';
  E('invoiceEmail160').value=inv.recipient_email||customer160(inv.customer_id)?.email||'';
  E('invoiceEmailSubject160').value=inv.email_subject||('Ihre Rechnung '+inv.invoice_number);
  E('invoiceEmailMessage160').value=inv.email_message||'Guten Tag,\n\nim Anhang finden Sie Ihre Rechnung.';
  const rows=invoiceRows160(id).map(normalizeItem160);
  currentItems160=Array.from({length:MAX_ITEMS},(_,i)=>rows[i]||blankItem160());
  E('deleteInvoice160').hidden=false;
  renderItems160();
  E('invoiceEditorTitle160').scrollIntoView({behavior:'smooth',block:'start'});
}
async function deleteInvoice160(){
  const id=+E('invoiceId160').value||0;if(!id)return;
  if(!confirm('Rechnung wirklich löschen?'))return;
  try{await remove('invoices','id=eq.'+id);await loadInvoices160();await resetInvoice160()}catch(e){alert(e.message)}
}

function buildPdf160(){
  if(!window.jspdf?.jsPDF)throw new Error('PDF-Modul konnte nicht geladen werden.');
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const green=[84,128,67], dark=[35,48,39], grey=[105,116,107];
  const obj=invoiceObject160(),t=calc160();
  const customerName=obj.customer_name_override||customer160(obj.customer_id)?.name||'';
  const customerCompany=obj.customer_company_override||customer160(obj.customer_id)?.company||'';
  const customerAddress=obj.customer_address_override||customer160(obj.customer_id)?.address||'';
  const used=currentItems160.filter(x=>String(x.description||'').trim());

  doc.setFillColor(...green);doc.rect(0,0,210,8,'F');
  doc.setTextColor(...dark);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('FarmManager',18,23);
  doc.setFontSize(8);doc.setTextColor(...grey);doc.setFont('helvetica','normal');doc.text('BETRIEBSMANAGEMENT',18,28);

  doc.setTextColor(...dark);doc.setFont('helvetica','bold');doc.setFontSize(26);doc.text(obj.subject||'RECHNUNG',18,49);
  doc.setFontSize(9);doc.setFont('helvetica','normal');
  const rightX=132;
  doc.text('Rechnungsnummer:',rightX,44);doc.setFont('helvetica','bold');doc.text(obj.invoice_number||'',190,44,{align:'right'});
  doc.setFont('helvetica','normal');doc.text('Rechnungsdatum:',rightX,50);doc.setFont('helvetica','bold');doc.text(new Date(obj.invoice_date+'T12:00:00').toLocaleDateString('de-DE'),190,50,{align:'right'});
  doc.setFont('helvetica','normal');doc.text('Fällig am:',rightX,56);doc.setFont('helvetica','bold');doc.text(obj.due_date?new Date(obj.due_date+'T12:00:00').toLocaleDateString('de-DE'):'—',190,56,{align:'right'});
  if(obj.reference){doc.setFont('helvetica','normal');doc.text('Referenz:',rightX,62);doc.setFont('helvetica','bold');doc.text(obj.reference,190,62,{align:'right'})}

  doc.setFontSize(9);doc.setFont('helvetica','bold');doc.text('Rechnung an:',18,67);
  doc.setFont('helvetica','normal');let cy=73;
  [customerName,customerCompany,...String(customerAddress||'').split('\n')].filter(Boolean).forEach(line=>{doc.text(String(line),18,cy);cy+=5});
  if(obj.service_period){doc.setFont('helvetica','bold');doc.text('Leistungszeitraum:',18,cy+4);doc.setFont('helvetica','normal');doc.text(obj.service_period,52,cy+4);cy+=9}

  let textY=Math.max(cy+4,91);
  if(obj.salutation){doc.text(obj.salutation,18,textY);textY+=6}
  if(obj.intro_text){
    const lines=doc.splitTextToSize(obj.intro_text,174);doc.text(lines,18,textY);textY+=lines.length*4.5+3;
  }

  const body=used.map((x,i)=>[
    String(i+1),
    x.description,
    String((+x.quantity||0).toLocaleString('de-DE')),
    unitText160(x.unit),
    money160(x.unit_price),
    money160((+x.quantity||0)*(+x.unit_price||0))
  ]);
  doc.autoTable({
    startY:textY+2,
    head:[['Pos.','Leistung','Menge','Einheit','Einzelpreis','Gesamt']],
    body,
    theme:'grid',
    styles:{font:'helvetica',fontSize:8,textColor:dark,cellPadding:2.6,lineColor:[218,226,215],lineWidth:.2},
    headStyles:{fillColor:green,textColor:[255,255,255],fontStyle:'bold'},
    columnStyles:{0:{cellWidth:12},1:{cellWidth:69},2:{cellWidth:20,halign:'right'},3:{cellWidth:20},4:{cellWidth:28,halign:'right'},5:{cellWidth:30,halign:'right'}}
  });

  let y=doc.lastAutoTable.finalY+8;
  doc.setFontSize(9);doc.setTextColor(...dark);
  doc.text('Netto:',145,y);doc.text(money160(t.net),190,y,{align:'right'});y+=6;
  doc.text('MwSt. '+(+obj.vat_rate||0)+' %:',145,y);doc.text(money160(t.vat),190,y,{align:'right'});y+=7;
  doc.setFillColor(239,246,235);doc.roundedRect(140,y-5,52,11,1.5,1.5,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('Gesamtbetrag:',144,y+2);doc.text(money160(t.gross),189,y+2,{align:'right'});y+=16;
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);
  if(obj.payment_terms){
    const lines=doc.splitTextToSize(obj.payment_terms,174);doc.text(lines,18,y);y+=lines.length*4.3+4;
  }
  if(obj.footer_text){
    const lines=doc.splitTextToSize(obj.footer_text,174);doc.setTextColor(...grey);doc.text(lines,18,y);
  }
  doc.setDrawColor(...green);doc.line(18,282,192,282);doc.setTextColor(...grey);doc.setFontSize(7);doc.text('FarmManager · Rechnung '+(obj.invoice_number||''),18,287);
  return doc;
}
function previewPdf160(){
  try{
    const doc=buildPdf160();
    const url=doc.output('bloburl');
    window.open(url,'_blank');
  }catch(e){alert(e.message)}
}
async function sendInvoice160(){
  const email=E('invoiceEmail160').value.trim();
  if(!email || !email.includes('@'))return alert('Bitte eine gültige E-Mail-Adresse eintragen.');
  E('invoiceSendStatus160').textContent='Rechnung wird vorbereitet …';
  const id=await saveInvoice160(false);if(!id){E('invoiceSendStatus160').textContent='';return}
  try{
    const doc=buildPdf160();
    const pdfBase64=doc.output('datauristring').split(',')[1];
    E('invoiceSendStatus160').textContent='E-Mail wird versendet …';
    const r=await fetch(SUPA_URL+'/functions/v1/send-invoice-email',{
      method:'POST',
      headers:{apikey:APIKEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({
        to:email,
        subject:E('invoiceEmailSubject160').value.trim()||('Ihre Rechnung '+E('invoiceNumber160').value),
        message:E('invoiceEmailMessage160').value.trim()||'Im Anhang finden Sie Ihre Rechnung.',
        invoiceNumber:E('invoiceNumber160').value,
        pdfBase64
      })
    });
    const raw=await r.text();let data={};try{data=JSON.parse(raw)}catch(_){}
    if(!r.ok)throw new Error(data.error||raw||'E-Mail-Versand fehlgeschlagen');
    const sentAt=new Date().toISOString();
    await update('invoices',{status:'versendet',email_status:'versendet',sent_at:sentAt,recipient_email:email,updated_at:sentAt},'id=eq.'+id);
    E('invoiceStatus160').value='versendet';
    E('invoiceSendStatus160').textContent='✓ Rechnung wurde per E-Mail versendet.';
    await loadInvoices160();
  }catch(e){
    E('invoiceSendStatus160').textContent='Versand nicht möglich: '+e.message;
  }
}
function setup160(){
  if(!E('p-rechnungen'))return;
  populateSelectors160();
  E('invoiceCustomer160').onchange=customerToInvoice160;
  E('invoiceOrder160').onchange=()=>{const id=+E('invoiceOrder160').value||0;if(id)importOrder160(id)};
  E('invoiceVat160').onchange=renderTotals160;
  E('newInvoice160').onclick=resetInvoice160;
  E('saveInvoice160').onclick=()=>saveInvoice160(true);
  E('previewInvoice160').onclick=previewPdf160;
  E('sendInvoice160').onclick=sendInvoice160;
  E('deleteInvoice160').onclick=deleteInvoice160;
  E('invoiceSearch160').oninput=renderArchive160;
  document.querySelector('nav button[data-page="rechnungen"]')?.addEventListener('click',()=>setTimeout(()=>{populateSelectors160();loadInvoices160()},80));
}
const oldLoad160=load;
load=async function(){await oldLoad160();populateSelectors160();await loadInvoices160()};
setTimeout(async()=>{setup160();await loadInvoices160();await resetInvoice160()},1900);
})();
