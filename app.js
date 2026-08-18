const SUPA_URL="https://hejaptzggbyqjjzireev.supabase.co";
const APIKEY="sb_publishable_FVs1qFyjyqHnr8m_4YvEaw_uZqModyE";
const $=id=>document.getElementById(id);
const money=n=>(+n||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const L={reserviert:'Reserviert',bestaetigt:'Bestätigt',bereit:'Bereit',lieferung_geplant:'Lieferung geplant',geliefert:'Geliefert',abgeholt:'Abgeholt',abgeschlossen:'Abgeschlossen',storniert:'Storniert'};
const reserve=new Set(['reserviert','bestaetigt','bereit','lieferung_geplant']);
let token=null,refreshToken=null,me=null,inv=[],cust=[],orders=[],cat='Ballen';

function saveSession(s){token=s.access_token||null;refreshToken=s.refresh_token||null;me=s.user||null;
 if(token) localStorage.setItem('bm_session',JSON.stringify({access_token:token,refresh_token:refreshToken,user:me}));
}
function clearSession(){token=refreshToken=null;me=null;localStorage.removeItem('bm_session');}
function authHeaders(){return {'apikey':APIKEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'};}
async function login(email,password){
 const r=await fetch(SUPA_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'apikey':APIKEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok) throw new Error(j.error_description||j.msg||j.message||('Login fehlgeschlagen ('+r.status+')'));
 saveSession(j);return j;
}
async function refresh(){
 if(!refreshToken) return false;
 const r=await fetch(SUPA_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':APIKEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken})});
 const j=await r.json().catch(()=>({})); if(!r.ok) return false; saveSession(j); return true;
}
async function req(path,opts={},retry=true){
 let r=await fetch(SUPA_URL+'/rest/v1/'+path,{...opts,headers:{...authHeaders(),...(opts.headers||{})}});
 if(r.status===401 && retry && await refresh()) return req(path,opts,false);
 if(!r.ok){const t=await r.text();throw new Error(t||('Datenbankfehler '+r.status));}
 const text=await r.text();return text?JSON.parse(text):null;
}
const q=s=>encodeURIComponent(s);
async function select(table,query=''){return await req(table+(query?'?'+query:''),{headers:{Prefer:'count=exact'}});}
async function insert(table,obj,returning=true){return await req(table,{method:'POST',headers:{Prefer:returning?'return=representation':'return=minimal'},body:JSON.stringify(obj)});}
async function update(table,obj,filter){return await req(table+'?'+filter,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(obj)});}
async function remove(table,filter){return await req(table+'?'+filter,{method:'DELETE',headers:{Prefer:'return=minimal'}});}

function page(p){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));$('p-'+p).classList.add('active');document.querySelector(`nav button[data-page="${p}"]`)?.classList.add('active');}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>page(b.dataset.page));

async function session(){
 if(!token){$('auth').hidden=false;$('app').hidden=true;return}
 $('auth').hidden=true;$('app').hidden=false;$('who').textContent=me?.email||'';
 try{
   const p=await select('profiles','select=role&id=eq.'+encodeURIComponent(me.id));
   $('role').textContent=p?.[0]?.role==='admin'?'Administrator':'Teammitglied';
   await load();
 }catch(e){
   if(String(e.message).includes('JWT')||String(e.message).includes('401')){clearSession();$('auth').hidden=false;$('app').hidden=true;}
   else console.error(e);
 }
}
$('login').onclick=async()=>{
 try{
   $('authmsg').textContent='Anmeldung läuft …';
   await login($('email').value.trim(),$('password').value);
   $('authmsg').textContent='';
   await session();
 }catch(e){$('authmsg').textContent=e.message;}
};
$('logout').onclick=async()=>{clearSession();$('auth').hidden=false;$('app').hidden=true;};

async function load(){
 [inv,cust,orders]=await Promise.all([
   select('inventory','select=*&order=product.asc'),
   select('customers','select=*&order=name.asc'),
   select('orders','select=*,customers(id,name,company),order_items(*)&order=created_at.desc')
 ]);
 render();
}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function itemAmount(i){return +(i.amount??i.quantity??0)}
function orderVal(o){return (o.order_items||[]).reduce((a,i)=>a+itemAmount(i)*(+i.unit_price||0),0)+(+o.kilometers||0)*(+o.kilometer_price||0)}
function resProd(p){return orders.filter(o=>reserve.has(o.status)&&o.order_type==='Ballen').flatMap(o=>o.order_items||[]).filter(i=>i.product===p).reduce((a,i)=>a+itemAmount(i),0)}
function render(){
 $('custSel').innerHTML='<option value="">Kunde wählen …</option>'+cust.map(c=>`<option value="${c.id}">${esc(c.company||c.name)}</option>`).join('');
 $('kOpen').textContent=orders.filter(o=>!['abgeschlossen','storniert'].includes(o.status)).length;
 $('kRes').textContent=inv.reduce((a,i)=>a+resProd(i.product),0);
 $('kDel').textContent=orders.filter(o=>o.status==='lieferung_geplant').length;
 $('kPay').textContent=orders.filter(o=>o.payment_status!=='bezahlt'&&o.status!=='storniert').length;
 $('recent').innerHTML=orders.slice(0,5).map(card).join('')||'<p class="muted">Noch keine Aufträge.</p>';
 renderCustomers();renderOrders();renderInv();syncPrice();calc();
}
document.querySelectorAll('.cat').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('.cat').forEach(x=>x.classList.remove('active'));b.classList.add('active');cat=b.dataset.cat;$('formTitle').textContent=cat;
 $('productWrap').hidden=cat!=='Ballen';$('mulchWrap').hidden=cat!=='Mulchen';
 if(cat==='Ballen'){$('unit').innerHTML='<option value="stueck">Stück</option>';$('amountLabel').textContent='Anzahl Ballen';$('priceLabel').textContent='Preis pro Stück (€)';}
 else{$('unit').innerHTML='<option value="km">Kilometer</option><option value="m2">Quadratmeter</option>';$('amountLabel').textContent='Menge';$('priceLabel').textContent='Preis pro Einheit (€)';}
 syncPrice();calc();
});
$('unit').onchange=()=>{const u=$('unit').value;$('amountLabel').textContent=u==='km'?'Arbeitsstrecke (km)':u==='m2'?'Fläche (m²)':'Anzahl Ballen';$('priceLabel').textContent=u==='km'?'Preis pro km (€)':u==='m2'?'Preis pro m² (€)':'Preis pro Stück (€)';calc();};
function syncPrice(){if(cat==='Ballen'){const i=inv.find(x=>x.product===$('product').value);$('unitPrice').value=i?.default_unit_price||0}}
$('product').onchange=()=>{syncPrice();calc();};
['amount','unitPrice','travelKm','travelPrice','roundtrip'].forEach(x=>$(x).addEventListener('input',calc));
function calc(){const a=+$('amount').value||0,p=+$('unitPrice').value||0,k=+$('travelKm').value||0,kp=+$('travelPrice').value||0;const billed=k*($('roundtrip').checked?2:1);$('total').textContent=money(a*p+billed*kp);return billed;}
$('saveOrder').onclick=async()=>{
 try{
 const customer_id=+$('custSel').value||null;if(!customer_id)return alert('Bitte Kunde auswählen.');
 const amount=+$('amount').value||0;if(amount<=0)return alert('Bitte Menge eingeben.');
 const u=$('unit').value;let product=cat==='Ballen'?$('product').value:cat==='Mulchen'?$('mulchType').value:cat;
 if(cat==='Ballen'&&reserve.has($('status').value)){const free=(inv.find(i=>i.product===product)?.quantity||0)-resProd(product);if(amount>free&&!confirm(`Nur ${Math.max(0,free)} Ballen frei. Trotzdem anlegen?`))return;}
 const km=calc();
 const rows=await insert('orders',{customer_id,order_type:cat,status:$('status').value,payment_status:'offen',delivery_type:$('delivery').value,delivery_date:$('date').value||null,kilometers:km,kilometer_price:+$('travelPrice').value||0,notes:$('notes').value.trim()||null,created_by:me.id},true);
 const o=rows[0]; const qtyLegacy=u==='stueck'?Math.round(amount):1;
 try{await insert('order_items',{order_id:o.id,product,quantity:qtyLegacy,amount,unit:u,unit_price:+$('unitPrice').value||0,description:cat},false);}
 catch(e){await remove('orders','id=eq.'+o.id);throw e;}
 $('notes').value='';$('amount').value=1;await load();page('auftraege');
 }catch(e){alert(e.message);}
};
$('addCustomer').onclick=async()=>{
 try{const name=$('cn').value.trim();if(!name)return alert('Name fehlt.');
 await insert('customers',{name,company:$('cc').value.trim()||null,phone:$('cp').value.trim()||null,email:$('ce').value.trim()||null,address:$('ca').value.trim()||null,notes:$('cno').value.trim()||null,created_by:me.id},false);
 ['cn','cc','cp','ce','ca','cno'].forEach(x=>$(x).value='');await load();}catch(e){alert(e.message);}
};
$('custSearch').oninput=renderCustomers;
function renderCustomers(){const qv=($('custSearch').value||'').toLowerCase();$('customers').innerHTML=cust.filter(c=>[c.name,c.company,c.phone,c.email].join(' ').toLowerCase().includes(qv)).map(c=>`<div class="customer"><h4>${esc(c.company||c.name)}</h4><p>${c.company?esc(c.name)+' · ':''}${esc(c.phone||'')}${c.email?' · '+esc(c.email):''}</p></div>`).join('')||'<p class="muted">Keine Kunden.</p>';}
$('fstatus').onchange=renderOrders;$('osearch').oninput=renderOrders;
function card(o){const i=(o.order_items||[])[0]||{},unit=i.unit==='m2'?'m²':i.unit==='km'?'km':'Stk.';return `<div class="order"><div class="topline"><div><h4>#${o.id} · ${esc(o.customers?.company||o.customers?.name||'Kunde')}</h4><p>${esc(o.order_type)} · ${itemAmount(i)} ${unit} · ${esc(i.product||'')} · ${money(orderVal(o))}</p></div><span class="badge ${o.status}">${L[o.status]||o.status}</span></div><p>Zahlung: <b>${o.payment_status==='bezahlt'?'Bezahlt':o.payment_status==='teilbezahlt'?'Teilbezahlt':'Offen'}</b></p><div class="actions"><select data-s="${o.id}">${Object.entries(L).map(([k,v])=>`<option value="${k}" ${o.status===k?'selected':''}>${v}</option>`).join('')}</select><select data-p="${o.id}"><option value="offen" ${o.payment_status==='offen'?'selected':''}>Offen</option><option value="teilbezahlt" ${o.payment_status==='teilbezahlt'?'selected':''}>Teilbezahlt</option><option value="bezahlt" ${o.payment_status==='bezahlt'?'selected':''}>Bezahlt</option></select></div></div>`;}
function renderOrders(){const f=$('fstatus').value,qv=($('osearch').value||'').toLowerCase();$('orders').innerHTML=orders.filter(o=>(!f||o.status===f)&&[o.order_type,o.customers?.name,o.customers?.company].join(' ').toLowerCase().includes(qv)).map(card).join('')||'<p class="muted">Keine Aufträge.</p>';document.querySelectorAll('[data-s]').forEach(x=>x.onchange=changeS);document.querySelectorAll('[data-p]').forEach(x=>x.onchange=changeP);}
async function changeP(e){try{await update('orders',{payment_status:e.target.value,updated_at:new Date().toISOString()},'id=eq.'+(+e.target.dataset.p));await load();}catch(x){alert(x.message)}}
async function changeS(e){try{const id=+e.target.dataset.s,o=orders.find(x=>x.id===id),ns=e.target.value;if(o?.order_type==='Ballen'&&['geliefert','abgeholt','abgeschlossen'].includes(ns)&&!o.stock_committed){for(const it of o.order_items||[]){const ii=inv.find(x=>x.product===it.product);if(ii)await update('inventory',{quantity:Math.max(0,+ii.quantity-itemAmount(it)),updated_at:new Date().toISOString(),updated_by:me.id},'id=eq.'+ii.id)}await update('orders',{status:ns,stock_committed:true,updated_at:new Date().toISOString()},'id=eq.'+id)}else{await update('orders',{status:ns,updated_at:new Date().toISOString()},'id=eq.'+id)}await load();}catch(x){alert(x.message)}}
function renderInv(){$('inventory').innerHTML=inv.map(i=>{const r=resProd(i.product),free=Math.max(0,+i.quantity-r);return `<div class="stock"><div><b>${i.product}</b><div class="invedit"><label>Gesamt<input data-q="${i.id}" value="${i.quantity}" type="number" min="0"></label><label>Stückpreis<input data-pr="${i.id}" value="${i.default_unit_price}" type="number" min="0" step=".01"></label></div></div><div class="metric"><b>${i.quantity}</b><small>Gesamt</small></div><div class="metric"><b>${r}</b><small>Reserviert</small></div><div class="metric"><b>${free}</b><small>Frei</small></div></div>`}).join('');document.querySelectorAll('[data-q],[data-pr]').forEach(x=>x.onchange=saveInv);}
async function saveInv(e){try{const id=+(e.target.dataset.q||e.target.dataset.pr),qq=document.querySelector(`[data-q="${id}"]`),p=document.querySelector(`[data-pr="${id}"]`);await update('inventory',{quantity:+qq.value||0,default_unit_price:+p.value||0,updated_at:new Date().toISOString(),updated_by:me.id},'id=eq.'+id);await load();}catch(x){alert(x.message)}}

try{const saved=JSON.parse(localStorage.getItem('bm_session')||'null');if(saved)saveSession(saved);}catch(e){}
session();
