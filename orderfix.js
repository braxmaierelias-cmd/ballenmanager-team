
/* FarmManager V13.9 – Löschfix + doppelte Bearbeiten-Buttons entfernen */
(function(){
  const el = id => document.getElementById(id);

  async function deleteOrderAbsolutely(id){
    const o = orders.find(x => +x.id === +id);
    if(!o) return;

    const msg = o.order_type === 'Ballen' && o.stock_committed
      ? `Auftrag #${id} wirklich endgültig löschen?\n\nHinweis: Bereits abgebuchter Bestand wird NICHT automatisch zurückgebucht.\n\nDiese Aktion kann nicht rückgängig gemacht werden.`
      : `Auftrag #${id} wirklich endgültig löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`;

    if(!confirm(msg)) return;

    try{
      // Verknüpfte Arbeitszeiten bleiben als Historie erhalten.
      // Supabase setzt order_id automatisch auf NULL.
      await remove('orders','id=eq.'+id);
      await load();
      page('auftraege');
    }catch(err){
      alert('Auftrag konnte nicht gelöscht werden: ' + err.message);
    }
  }

  function removeDuplicateEditButtons(){
    document.querySelectorAll('#completedOrders .order').forEach(card=>{
      const topEdit = card.querySelector('[data-edit138]');
      if(!topEdit) return;

      [...card.querySelectorAll('button')].forEach(btn=>{
        if(btn === topEdit) return;
        if((btn.textContent || '').trim() === 'Bearbeiten'){
          btn.remove();
        }
      });
    });

    document.querySelectorAll('#orders .order').forEach(card=>{
      const topEdit = card.querySelector('[data-edit138]');
      if(!topEdit) return;

      [...card.querySelectorAll('button')].forEach(btn=>{
        if(btn === topEdit) return;
        if((btn.textContent || '').trim() === 'Bearbeiten'){
          btn.remove();
        }
      });
    });
  }

  function rebindDeleteButtons(){
    document.querySelectorAll('[data-delete138]').forEach(btn=>{
      const id = +btn.dataset.delete138;
      const clone = btn.cloneNode(true);
      btn.replaceWith(clone);
      clone.onclick = ()=>deleteOrderAbsolutely(id);
    });
  }

  const previousRenderOrders139 = renderOrders;
  renderOrders = function(){
    previousRenderOrders139();
    removeDuplicateEditButtons();
    rebindDeleteButtons();
  };

  setTimeout(()=>{
    try{
      renderOrders();
    }catch(e){
      console.warn('V13.9 init',e);
    }
  },900);
})();
