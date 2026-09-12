
/* FarmManager V13.2 – Kartenfix für Safari/iPad
   Wichtig: greift auf die globalen `let`-Variablen aus features.js direkt zu. */
(function(){
  function $(id){ return document.getElementById(id); }

  function setStatus(t){
    const el=$('fieldMapProvider');
    if(el) el.textContent=t;
  }

  function installDrawHandler(){
    if(typeof L==='undefined' || !fmFieldMap) return;

    // Alle alten Created-Handler entfernen (V12 verlangte vorher einen Kunden).
    try{ fmFieldMap.off(L.Draw.Event.CREATED); }catch(_){}

    fmFieldMap.on(L.Draw.Event.CREATED, function(e){
      try{
        if(fmFieldDrawLayer) fmFieldDrawLayer.clearLayers();
        fmFieldDrawLayer.addLayer(e.layer);
        fmPendingGeometry = e.layer.toGeoJSON().geometry;

        let ha=0;
        try{
          if(L.GeometryUtil && L.GeometryUtil.geodesicArea){
            const rings=e.layer.getLatLngs();
            const ring=Array.isArray(rings[0]) ? rings[0] : rings;
            ha=L.GeometryUtil.geodesicArea(ring)/10000;
          }
        }catch(_){}

        if($('fieldHectares')) $('fieldHectares').value = ha ? ha.toFixed(2) : '';
        if($('fieldEditId')) $('fieldEditId').value='';
        if($('fieldEditorTitle')) $('fieldEditorTitle').textContent='Neues Feld';
        if($('fieldEditor')) $('fieldEditor').hidden=false;
        if($('fieldName')) $('fieldName').focus();
        setStatus('Feldgrenze eingezeichnet');
      }catch(err){
        console.error(err);
        alert('Die Feldgrenze konnte nicht übernommen werden.');
      }
    });
  }

  const oldInit = fmInitFieldMap;
  fmInitFieldMap = function(){
    const el=$('fieldMap');
    if(!el) return;

    if(typeof L==='undefined'){
      setStatus('Kartenbibliothek fehlt');
      el.innerHTML='<div style="padding:24px">Karte konnte nicht geladen werden.</div>';
      return;
    }

    try{
      // Wenn die Karte schon von der bestehenden V12/V13-Logik erzeugt wurde:
      if(fmFieldMap){
        installDrawHandler();
        if(typeof fmDrawAllFields==='function') fmDrawAllFields();
        setTimeout(()=>{ try{ fmFieldMap.invalidateSize(true); }catch(_){} },150);
        setStatus('Karte aktiv');
        return;
      }

      // Sonst einmalig mit der vorhandenen Originalfunktion erzeugen.
      oldInit();

      if(fmFieldMap){
        installDrawHandler();
        if(typeof fmDrawAllFields==='function') fmDrawAllFields();
        setTimeout(()=>{ try{ fmFieldMap.invalidateSize(true); }catch(_){} },180);
        setStatus('Karte aktiv');
      }else{
        setStatus('Karte konnte nicht initialisiert werden');
      }
    }catch(err){
      console.error('Feldkartenfehler:', err);
      setStatus('Kartenfehler');
      // Wenn nur "already initialized" auftrat, bestehende Karte trotzdem weiterverwenden.
      try{
        if(fmFieldMap){
          installDrawHandler();
          fmFieldMap.invalidateSize(true);
          setStatus('Karte aktiv');
        }
      }catch(_){}
    }
  };

  function newField(){
    fmPendingGeometry=null;
    if($('fieldEditId')) $('fieldEditId').value='';
    if($('fieldName')) $('fieldName').value='';
    if($('fieldHectares')) $('fieldHectares').value='';
    if($('fieldCrop')) $('fieldCrop').value='';
    if($('fieldNotes')) $('fieldNotes').value='';
    if($('fieldCustomer')) $('fieldCustomer').value='';
    if($('fieldEditorTitle')) $('fieldEditorTitle').textContent='Neues Feld';
    if($('fieldEditor')) $('fieldEditor').hidden=false;
    try{ if(fmFieldDrawLayer) fmFieldDrawLayer.clearLayers(); }catch(_){}
    fmInitFieldMap();
    alert('Oben links auf der Karte das Polygon-Symbol wählen und die Feldgrenze einzeichnen.');
  }

  setTimeout(function(){
    const b=$('newFieldButton');
    if(b){
      const clone=b.cloneNode(true);
      b.replaceWith(clone);
      clone.addEventListener('click', newField);
    }

    const nav=document.querySelector('nav button[data-page="felder"]');
    if(nav){
      nav.addEventListener('click',()=>setTimeout(()=>{
        try{
          if(typeof fmPopulateFieldCustomer==='function') fmPopulateFieldCustomer();
          if(typeof fmRenderAllFields==='function') fmRenderAllFields();
        }catch(_){}
        fmInitFieldMap();
      },120));
    }

    if($('p-felder')?.classList.contains('active')) fmInitFieldMap();
  },300);

  window.addEventListener('resize',()=>setTimeout(()=>{
    try{ if(fmFieldMap) fmFieldMap.invalidateSize(true); }catch(_){}
  },150));
})();
