
/* FarmManager V16 – Kalkulationen speichern/bearbeiten/löschen */
(function(){
const E=id=>document.getElementById(id);
let costRows160=[];
const money160=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(+v||0);
const n160=id=>+(E(id)?.value||0);
function costObject160(){
  return {
    name:E('costName152').value.trim(),
    category:E('costCategory152').value.trim()||null,
    machine_id:+E('costMachine152').value||null,
    hours:n160('costHours152'),
    diesel_l_per_h:n160('costDieselUse152'),
    diesel_price:n160('costDieselPrice152'),
    labor_per_h:n160('costLabor152'),
    machine_per_h:n160('costMachineRate152'),
    other_costs:n160('costOther152'),
    markup_percent:n160('costMarkup152'),
    notes:E('costNotes152').value.trim()||null,
    updated_at:new Date().toISOString()
  };
}
function calcStored160(c){
  const diesel=(+c.hours||0)*(+c.diesel_l_per_h||0)*(+c.diesel_price||0);
  const labor=(+c.hours||0)*(+c.labor_per_h||0);
  const machine=(+c.hours||0)*(+c.machine_per_h||0);
  const base=diesel+labor+machine+(+c.other_costs||0);
  return {diesel,labor,machine,base,price:base*(1+(+c.markup_percent||0)/100)};
}
function reset160(){
  E('costId152').value='';
  E('costName152').value='';
  E('costCategory152').value='';
  E('costMachine152').value='';
  E('costHours152').value='1';
  ['costDieselUse152','costDieselPrice152','costLabor152','costMachineRate152','costOther152','costMarkup152'].forEach(id=>E(id).value='0');
  E('costNotes152').value='';
  E('deleteCostCalc152').hidden=true;
  if(typeof calcCost==='function')try{calcCost()}catch(_){}
  ['calcDiesel152','calcLabor152','calcMachine152','calcBase152','calcPrice152'].forEach(id=>{if(E(id))E(id).textContent='0,00 €'});
}
function fill160(c){
  E('costId152').value=c.id;
  E('costName152').value=c.name||'';
  E('costCategory152').value=c.category||'';
  E('costMachine152').value=c.machine_id||'';
  E('costHours152').value=c.hours??0;
  E('costDieselUse152').value=c.diesel_l_per_h??0;
  E('costDieselPrice152').value=c.diesel_price??0;
  E('costLabor152').value=c.labor_per_h??0;
  E('costMachineRate152').value=c.machine_per_h??0;
  E('costOther152').value=c.other_costs??0;
  E('costMarkup152').value=c.markup_percent??0;
  E('costNotes152').value=c.notes||'';
  E('deleteCostCalc152').hidden=false;
  const x=calcStored160(c);
  E('calcDiesel152').textContent=money160(x.diesel);
  E('calcLabor152').textContent=money160(x.labor);
  E('calcMachine152').textContent=money160(x.machine);
  E('calcBase152').textContent=money160(x.base);
  E('calcPrice152').textContent=money160(x.price);
  E('mgmtCosts152').scrollIntoView({behavior:'smooth',block:'start'});
}
function render160(){
  const box=E('costList152');if(!box)return;
  box.innerHTML=costRows160.map(c=>{
    const x=calcStored160(c),m=machines.find(z=>+z.id===+c.machine_id);
    return `<div class="cost-saved160">
      <div>
        <b>${esc(c.name)}</b>
        <p>${c.category?esc(c.category)+' · ':''}${m?esc(m.name)+' · ':''}${(+c.hours||0).toLocaleString('de-DE')} h</p>
        <small>Kosten ${money160(x.base)} · empfohlener Preis <strong>${money160(x.price)}</strong></small>
      </div>
      <div class="cost-saved-actions160">
        <button class="secondary compact" data-cost-edit160="${c.id}">Bearbeiten</button>
        <button class="danger compact" data-cost-delete160="${c.id}">Löschen</button>
      </div>
    </div>`;
  }).join('')||'<p class="muted">Noch keine Kalkulation gespeichert.</p>';
  box.querySelectorAll('[data-cost-edit160]').forEach(b=>b.onclick=()=>{const c=costRows160.find(x=>+x.id===+b.dataset.costEdit160);if(c)fill160(c)});
  box.querySelectorAll('[data-cost-delete160]').forEach(b=>b.onclick=async()=>{if(!confirm('Kalkulation wirklich löschen?'))return;try{await remove('cost_calculations','id=eq.'+b.dataset.costDelete160);await load160();const id=+E('costId152').value||0;if(id===+b.dataset.costDelete160)reset160()}catch(e){alert(e.message)}});
}
async function load160(){
  if(!token)return;
  try{costRows160=await select('cost_calculations','select=*&order=updated_at.desc,id.desc')||[];render160()}catch(e){console.warn('Kalkulationen:',e)}
}
async function save160(){
  const obj=costObject160();
  if(!obj.name)return alert('Bitte eine Bezeichnung für die Kalkulation eingeben.');
  try{
    const id=+E('costId152').value||0;
    if(id)await update('cost_calculations',obj,'id=eq.'+id);
    else await insert('cost_calculations',{...obj,created_by:me.id},false);
    await load160();
    reset160();
    alert('Kalkulation gespeichert.');
  }catch(e){alert('Kalkulation konnte nicht gespeichert werden: '+e.message)}
}
async function deleteCurrent160(){
  const id=+E('costId152').value||0;if(!id)return;
  if(!confirm('Kalkulation wirklich löschen?'))return;
  try{await remove('cost_calculations','id=eq.'+id);reset160();await load160()}catch(e){alert(e.message)}
}
function setup160(){
  if(!E('saveCostCalc152'))return;
  E('saveCostCalc152').onclick=save160;
  E('resetCostCalc152').onclick=reset160;
  E('newCostCalc152').onclick=reset160;
  E('deleteCostCalc152').onclick=deleteCurrent160;
  document.querySelector('nav button[data-page="management"]')?.addEventListener('click',()=>setTimeout(load160,180));
}
const oldLoad160=load;
load=async function(){await oldLoad160();await load160()};
setTimeout(async()=>{setup160();await load160()},2300);
})();
