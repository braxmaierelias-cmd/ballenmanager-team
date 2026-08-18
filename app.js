const SUPABASE_URL="https://hejaptzggbyqjjzireev.supabase.co";
const SUPABASE_KEY="sb_publishable_FVs1qFyjyqHnr8m_4YvEaw_uZqModyE";
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const money=n=>(+n||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
let sales=[], inventory=[];

function calc(){
 let q=+$('qty').value||0,u=+$('unit').value||0,k=+$('km').value||0,p=+$('kmprice').value||0;
 let transport=k*p*($('roundtrip').checked?2:1);
 let total=q*u+transport;$('total').textContent=money(total);return {total,km:k*($('roundtrip').checked?2:1)};
}
['qty','unit','km','kmprice','roundtrip'].forEach(x=>$(x).addEventListener('input',calc));

async function sessionUI(){
 const {data:{session}}=await db.auth.getSession();
 if(!session){ $('authCard').hidden=false;$('app').hidden=true;return; }
 $('authCard').hidden=true;$('app').hidden=false;$('userEmail').textContent=session.user.email;
 const {data:p}=await db.from('profiles').select('role').eq('id',session.user.id).maybeSingle();
 $('role').textContent=p?.role==='admin'?'Administrator':'Teammitglied';
 await loadAll();
}

$('login').onclick=async()=>{
 $('authMsg').textContent='Anmeldung läuft …';
 const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
 $('authMsg').textContent=error?error.message:''; if(!error) sessionUI();
};
$('signup').onclick=async()=>{
 $('authMsg').textContent='Konto wird angelegt …';
 const email=$('email').value.trim();
 const allowed=['eliasbraxx@gmail.com','bweers@streitert-hexe.de','larsst00@web.de','simonburnikel9@gmail.com'];
 if(!allowed.includes(email.toLowerCase())){ $('authMsg').textContent='Diese E-Mail ist nicht für das Team freigegeben.';return; }
 const {error}=await db.auth.signUp({email,password:$('password').value});
 $('authMsg').textContent=error?error.message:'Konto angelegt. Falls Supabase eine Bestätigung verlangt, E-Mail bestätigen und danach anmelden.';
};
$('logout').onclick=async()=>{await db.auth.signOut();sessionUI();};

async function loadAll(){
 const [s,i]=await Promise.all([
   db.from('sales').select('*').order('created_at',{ascending:false}),
   db.from('inventory').select('*').order('product')
 ]);
 sales=s.data||[];inventory=i.data||[];render();
}

function render(){
 $('sold').textContent=sales.reduce((a,s)=>a+(+s.quantity||0),0);
 $('revenue').textContent=money(sales.reduce((a,s)=>a+(+s.total||0),0));
 $('sales').innerHTML=sales.length?sales.map(s=>`<div class="sale"><b>${s.quantity} × ${s.product} – ${money(s.total)}</b><span>${new Date(s.created_at).toLocaleString('de-DE')}${s.customer?' · '+s.customer:''} · Stück ${(+s.unit_price).toFixed(2)} € · ${s.kilometers} km</span></div>`).join(''):'<p>Noch keine Verkäufe gespeichert.</p>';
 $('inventory').innerHTML=inventory.map(i=>`<div class="invrow"><div><b>${i.product}</b><small>Bestand / Standardpreis</small></div><input data-q="${i.id}" type="number" min="0" value="${i.quantity}"><input data-p="${i.id}" type="number" min="0" step=".01" value="${i.default_unit_price}"></div>`).join('');
 document.querySelectorAll('[data-q],[data-p]').forEach(el=>el.onchange=saveInventory);
 const selected=inventory.find(i=>i.product===$('product').value);if(selected && +$('unit').value===0)$('unit').value=selected.default_unit_price;
 calc();
}
$('product').onchange=()=>{const i=inventory.find(x=>x.product===$('product').value);if(i)$('unit').value=i.default_unit_price;calc();};

async function saveInventory(e){
 const id=+e.target.dataset.q||+e.target.dataset.p;
 const row=inventory.find(x=>x.id===id); if(!row)return;
 const q=document.querySelector(`[data-q="${id}"]`),p=document.querySelector(`[data-p="${id}"]`);
 const {data:{user}}=await db.auth.getUser();
 const {error}=await db.from('inventory').update({quantity:+q.value||0,default_unit_price:+p.value||0,updated_at:new Date().toISOString(),updated_by:user.id}).eq('id',id);
 if(error)alert(error.message);else await loadAll();
}

$('save').onclick=async()=>{
 const q=+$('qty').value||0;if(q<=0)return alert('Bitte Anzahl Ballen eingeben.');
 const {data:{user}}=await db.auth.getUser();const c=calc();
 const payload={created_by:user.id,customer:$('customer').value.trim()||null,product:$('product').value,quantity:q,unit_price:+$('unit').value||0,kilometers:c.km,kilometer_price:+$('kmprice').value||0};
 const {error}=await db.from('sales').insert(payload);if(error)return alert(error.message);
 const inv=inventory.find(i=>i.product===payload.product);if(inv)await db.from('inventory').update({quantity:Math.max(0,inv.quantity-q),updated_at:new Date().toISOString(),updated_by:user.id}).eq('id',inv.id);
 await loadAll();alert('Verkauf gespeichert und synchronisiert.');
};

$('export').onclick=()=>{
 let rows=[['Datum','Kunde','Produkt','Anzahl','Stückpreis','Kilometer','Kilometerpreis','Gesamt'],...sales.map(s=>[new Date(s.created_at).toLocaleString('de-DE'),s.customer||'',s.product,s.quantity,s.unit_price,s.kilometers,s.kilometer_price,s.total])];
 let csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\n');
 let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='ballenmanager-verkaeufe.csv';a.click();
};
db.auth.onAuthStateChange(()=>sessionUI());sessionUI();if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
