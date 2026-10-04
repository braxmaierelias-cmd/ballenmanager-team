/* Compact dashboard: uses the same authorized in-memory data as the app. */
(function () {
  const dayKey = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Berlin'}).format(new Date());
  const dateOf = o => String(o.delivery_date || '').slice(0,10);
  const dateLabel = d => new Date(d+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
  function draw() {
    const host = document.getElementById('todayContent');
    if (!host || !me) return;
    const today = dayKey();
    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('de-DE',{timeZone:'Europe/Berlin',weekday:'long',day:'numeric',month:'long'});
    const open = orders.filter(o => !['abgeschlossen','storniert','geliefert','abgeholt'].includes(o.status));
    const scheduled = open.filter(o => dateOf(o) >= today).sort((a,b) => dateOf(a).localeCompare(dateOf(b)) || Number(a.id)-Number(b.id));
    const todays = scheduled.filter(o => dateOf(o) === today);
    const next = scheduled[0];
    const row = (o, featured=false) => `<button class="today-order${featured?' today-next':''}" data-today-order="${esc(o.id)}"><span><small>${featured ? (dateOf(o)===today?'ALS NÄCHSTES HEUTE':'NÄCHSTER GEPLANTER AUFTRAG') : 'HEUTE'}${dateOf(o)!==today?' · '+dateLabel(dateOf(o)):''}</small><strong>${esc(o.customers?.name || 'Kunde')} · ${esc(o.order_type || 'Auftrag')}</strong><span>#${esc(o.id)} · ${o.assigned_to?esc(profileName(o.assigned_to)):'Noch nicht zugeteilt'}</span></span><span class="today-arrow">Details →</span></button>`;
    let html = next ? row(next,true) : '<div class="today-empty"><strong>Keine anstehenden Aufträge terminiert</strong><p>Lege einen Auftrag an oder ergänze ein Datum in der Auftragsverwaltung.</p></div>';
    if (todays.length>1) html += `<details class="today-details"><summary>Weitere Aufträge heute (${todays.length-1})</summary>${todays.slice(1).map(o=>row(o)).join('')}</details>`;
    const sessions = typeof workSessions!=='undefined' ? workSessions.filter(s=>['running','paused'].includes(s.status)) : [];
    html += `<details class="today-details"><summary>${sessions.filter(s=>s.status==='running').length} laufende Einsätze${sessions.some(s=>s.status==='paused')?' · '+sessions.filter(s=>s.status==='paused').length+' pausiert':''}</summary>${sessions.length?sessions.map(s=>`<div class="today-session"><strong>${esc(profileName(s.user_id))}</strong><span>${esc(machines.find(m=>String(m.id)===String(s.machine_id))?.name || 'Ohne Maschine')} · ${s.status==='paused'?'Pausiert':'Läuft'}</span></div>`).join(''):'<p class="today-muted">Keine laufende Arbeitszeit in den geladenen Daten.</p>'}<button class="linkbtn compact" onclick="page('livekarte')">Live-Karte öffnen →</button></details>`;
    const overdue = open.filter(o=>dateOf(o) && dateOf(o)<today).length;
    const undated = open.filter(o=>!dateOf(o)).length;
    const service = machines.filter(m=>m.active!==false && m.next_service_date && m.next_service_date<=today).length;
    const empty = inv.filter(i=>Number(i.quantity)-resProd(i.product)<=0).length;
    const notices = [[overdue,`${overdue} Aufträge überfällig`,'auftraege'],[undated,`${undated} Aufträge ohne Termin`,'auftraege'],[service,`${service} Wartungen fällig`,'maschinen'],[empty,`${empty} Bestandspositionen ohne freien Bestand`,'bestand']].filter(n=>n[0]);
    if(notices.length) html += '<div class="today-notices">'+notices.map(n=>`<button onclick="page('${n[2]}')">${n[1]} →</button>`).join('')+'</div>';
    host.innerHTML = html;
    host.querySelectorAll('[data-today-order]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.todayOrder;
      document.getElementById('fstatus').value='';
      document.getElementById('osearch').value='';
      page('auftraege');renderOrders();
      const control=Array.from(document.querySelectorAll('#orders [data-edit138], #orders [data-s]')).find(x=>String(x.dataset.edit138||x.dataset.s)===id);
      const card=control?.closest('.order');
      if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.tabIndex=-1;card.focus({preventScroll:true});}
    });
    document.getElementById('todayWork').textContent = typeof fmMyActiveSession==='function' && fmMyActiveSession() ? 'Meine Arbeitszeit öffnen' : 'Arbeitszeit starten';
  }
  const previousRender=render;
  render=function(){const result=previousRender.apply(this,arguments);draw();return result;};
  if(typeof fmRenderWorkTime==='function'){
    const previousWork=fmRenderWorkTime;
    fmRenderWorkTime=function(){const result=previousWork.apply(this,arguments);draw();return result;};
  }
  const previousPage=page;
  page=function(p){const result=previousPage.apply(this,arguments);if(p==='start')draw();return result;};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw();});
  draw();
})();
