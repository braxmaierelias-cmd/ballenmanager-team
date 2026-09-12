
/* FarmManager V13.7 – Bedienungsupdate */
(function(){
  const byId = id => document.getElementById(id);
  const confirmDelete = text => confirm(text + '\n\nDiese Aktion kann nicht rückgängig gemacht werden.');

  /* Kunden löschen */
  const prevRenderCustomers = renderCustomers;
  renderCustomers = function(){
    prevRenderCustomers();

    document.querySelectorAll('#customers .customer').forEach(card => {
      if(card.querySelector('.delete-customer-btn')) return;
      const editBtn = card.querySelector('[data-edit-c]');
      if(!editBtn) return;
      const id = +editBtn.dataset.editC;

      const actions = document.createElement('div');
      actions.className = 'customer-actions';
      editBtn.parentElement.appendChild(actions);
      actions.appendChild(editBtn);

      const del = document.createElement('button');
      del.className = 'danger compact delete-customer-btn';
      del.textContent = 'Löschen';
      del.onclick = async () => {
        const c = cust.find(x => +x.id === id);
        if(!c) return;

        const linked = orders.filter(o => +o.customer_id === id).length;
        if(linked){
          alert(`Dieser Kunde hat noch ${linked} verknüpfte(n) Auftrag/Aufträge und kann deshalb nicht gelöscht werden.`);
          return;
        }

        if(!confirmDelete(`Kunde „${c.name}“ wirklich löschen?`)) return;

        try{
          if(typeof fields !== 'undefined'){
            for(const f of fields.filter(f => +f.customer_id === id)){
              await update('fields',{customer_id:null,updated_at:new Date().toISOString()},'id=eq.'+f.id);
            }
          }
          await remove('customers','id=eq.'+id);
          await load();
        }catch(err){
          alert('Kunde konnte nicht gelöscht werden: ' + err.message);
        }
      };
      actions.appendChild(del);
    });
  };

  /* Bestand löschen */
  const prevRenderInv = renderInv;
  renderInv = function(){
    prevRenderInv();

    document.querySelectorAll('#inventory .stock').forEach(stock => {
      if(stock.querySelector('.delete-inventory-btn')) return;

      const input = stock.querySelector('[data-in]');
      if(!input) return;
      const id = +input.dataset.in;
      const item = inv.find(x => +x.id === id);

      const save = stock.querySelector('[data-isave]');
      if(!save) return;

      const actions = document.createElement('div');
      actions.className = 'inventory-actions';
      save.parentElement.insertBefore(actions, save);
      actions.appendChild(save);

      const del = document.createElement('button');
      del.className = 'danger delete-inventory-btn';
      del.textContent = 'Gut löschen';
      del.onclick = async () => {
        if(!item) return;

        const activeUses = orders.filter(o =>
          !['abgeschlossen','storniert'].includes(o.status) &&
          (o.order_items || []).some(oi => oi.product === item.product)
        ).length;

        if(activeUses){
          alert(`„${item.product}“ wird noch in ${activeUses} aktivem Auftrag/Aufträgen verwendet.`);
          return;
        }

        if(!confirmDelete(`Gut „${item.product}“ wirklich löschen?`)) return;

        try{
          await remove('inventory','id=eq.'+id);
          await load();
        }catch(err){
          alert('Gut konnte nicht gelöscht werden: ' + err.message);
        }
      };
      actions.appendChild(del);
    });
  };

  /* Eigene abgeschlossene Arbeitszeiten löschen */
  const prevWorkHistory = fmRenderWorkHistory;
  fmRenderWorkHistory = function(){
    prevWorkHistory();

    const list = (myRole === 'admin'
      ? workSessions
      : workSessions.filter(x => x.user_id === me?.id)
    ).slice(0,60);

    const rows = [...document.querySelectorAll('#workHistory .work-row')];

    rows.forEach((row,i) => {
      const s = list[i];
      if(!s || s.user_id !== me?.id || s.status !== 'completed') return;
      if(row.querySelector('.delete-work-row')) return;

      const right = row.querySelector('.work-row-right');
      if(!right) return;

      const del = document.createElement('button');
      del.className = 'danger compact delete-work-row';
      del.textContent = 'Löschen';
      del.onclick = async () => {
        if(!confirmDelete('Diesen gespeicherten Arbeitstag wirklich löschen?')) return;

        try{
          await remove('work_field_segments','work_session_id=eq.'+s.id);
          await remove('work_sessions','id=eq.'+s.id);
          workSessions = workSessions.filter(x => +x.id !== +s.id);

          if(typeof workFieldSegments !== 'undefined'){
            workFieldSegments = workFieldSegments.filter(x => +x.work_session_id !== +s.id);
          }

          fmRenderWorkHistory();
          renderOrders();
        }catch(err){
          alert('Arbeitszeit konnte nicht gelöscht werden: ' + err.message);
        }
      };
      right.appendChild(del);
    });
  };

  /* Aktive Aufträge bearbeiten */
  const prevRenderOrders = renderOrders;
  renderOrders = function(){
    prevRenderOrders();

    document.querySelectorAll('#orders .order').forEach(card => {
      if(card.querySelector('.edit-active-order')) return;

      const heading = card.querySelector('h4')?.textContent || '';
      const match = heading.match(/#(\d+)/);
      if(!match) return;
      const id = +match[1];

      const btn = document.createElement('button');
      btn.className = 'secondary edit-active-order';
      btn.textContent = 'Auftrag bearbeiten';
      btn.onclick = () => {
        if(typeof fmOpenCompletedOrderEdit === 'function'){
          fmOpenCompletedOrderEdit(id);
          if(byId('completedOrderEditTitle')){
            byId('completedOrderEditTitle').textContent = `Auftrag #${id} bearbeiten`;
          }
        }else{
          alert('Bearbeitungsansicht konnte nicht geöffnet werden.');
        }
      };
      card.appendChild(btn);
    });
  };

  /* Maschinen: Liste zuerst, Formular per Button */
  function setupMachinesPage(){
    const page = byId('p-maschinen');
    if(!page || page.dataset.v137setup) return;
    page.dataset.v137setup = '1';

    const pagehead = page.querySelector('.pagehead');
    const cards = [...page.querySelectorAll(':scope > .card')];
    const form = cards.find(c => c.querySelector('#machineId'));
    const list = cards.find(c => c.querySelector('#machineList'));
    if(!pagehead || !form || !list) return;

    form.id = 'machineFormCard';
    form.hidden = true;
    page.insertBefore(list, form);

    const btn = document.createElement('button');
    btn.id = 'newMachineTop';
    btn.className = 'compact';
    btn.textContent = '+ Neue Maschine';
    pagehead.appendChild(btn);

    btn.onclick = () => {
      resetMachine();
      form.hidden = false;
      if(byId('machineFormTitle')) byId('machineFormTitle').textContent = 'Neue Maschine anlegen';
      form.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(() => byId('machineName')?.focus(), 150);
    };

    if(byId('cancelMachine')){
      const oldCancel = byId('cancelMachine').onclick;
      byId('cancelMachine').onclick = () => {
        if(oldCancel) oldCancel();
        form.hidden = true;
      };
    }
  }

  const prevRenderMachines = renderMachines;
  renderMachines = function(){
    prevRenderMachines();
    setupMachinesPage();

    document.querySelectorAll('[data-medit]').forEach(b => {
      if(b.dataset.v137bound) return;
      b.dataset.v137bound = '1';
      const old = b.onclick;

      b.onclick = (e) => {
        if(old) old.call(b,e);
        const form = byId('machineFormCard');
        if(form){
          form.hidden = false;
          if(byId('machineFormTitle')) byId('machineFormTitle').textContent = 'Maschine bearbeiten';
          setTimeout(() => form.scrollIntoView({behavior:'smooth',block:'start'}), 40);
        }
      };
    });
  };

  /* Team: Mitglieder zuerst */
  function setupTeamPage(){
    const page = byId('p-team');
    if(!page || page.dataset.v137setup) return;
    page.dataset.v137setup = '1';

    const pagehead = page.querySelector('.pagehead');
    const newCard = byId('newUserCard');
    const list = byId('teamListView');
    if(!pagehead || !newCard || !list) return;

    page.insertBefore(list,newCard);
    newCard.hidden = true;

    const btn = document.createElement('button');
    btn.id = 'newTeamTop';
    btn.className = 'compact';
    btn.textContent = '+ Mitglied anlegen';
    btn.hidden = myRole !== 'admin';
    pagehead.appendChild(btn);

    btn.onclick = () => {
      newCard.hidden = false;
      newCard.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(() => byId('newUserName')?.focus(), 150);
    };

    if(!newCard.querySelector('.close-new-user')){
      const close = document.createElement('button');
      close.className = 'secondary compact close-new-user';
      close.textContent = 'Schließen';
      close.onclick = () => { newCard.hidden = true; };

      const h = newCard.querySelector('h3');
      if(h){
        const wrap = document.createElement('div');
        wrap.className = 'sectionhead';
        h.parentNode.insertBefore(wrap,h);
        wrap.appendChild(h);
        wrap.appendChild(close);
      }
    }
  }

  const prevRenderTeam = renderTeam;
  renderTeam = function(){
    prevRenderTeam();
    setupTeamPage();
    const btn = byId('newTeamTop');
    if(btn) btn.hidden = myRole !== 'admin';
  };

  setTimeout(() => {
    try{
      setupMachinesPage();
      setupTeamPage();
      renderCustomers();
      renderInv();
      if(typeof fmRenderWorkHistory === 'function') fmRenderWorkHistory();
      renderOrders();
      renderMachines();
      renderTeam();
    }catch(e){
      console.warn('FarmManager V13.7:',e);
    }
  },900);
})();
