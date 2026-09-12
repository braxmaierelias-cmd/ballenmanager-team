
/* FarmManager V13.1 – robuster Felder/Karten-Fix */
(function(){
  function byId(id){ return document.getElementById(id); }

  function mapStatus(text){
    const el=byId('fieldMapProvider');
    if(el) el.textContent=text;
  }

  function ensureMapHeight(){
    const el=byId('fieldMap');
    if(el && (!el.style.height || el.clientHeight < 200)) el.style.height='520px';
  }

  function safeDrawAll(){
    try{
      if(typeof fmDrawAllFields==='function') fmDrawAllFields();
    }catch(e){ console.warn('Felder zeichnen:',e); }
  }

  window.fmInitFieldMap = function(){
    const el=byId('fieldMap');
    if(!el) return;
    ensureMapHeight();

    if(typeof L==='undefined'){
      mapStatus('Karte konnte nicht geladen werden');
      el.innerHTML='<div style="padding:24px;color:#68766b">Kartenbibliothek konnte nicht geladen werden. Bitte Seite neu laden.</div>';
      return;
    }

    try{
      if(!window.fmFieldMap){
        window.fmFieldMap = L.map(el,{zoomControl:true}).setView([49.47,8.44],10);

        // Main street/topographic map
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
          maxZoom:19,
          attribution:'© OpenStreetMap'
        }).addTo(window.fmFieldMap);

        window.fmFieldDrawLayer = new L.FeatureGroup().addTo(window.fmFieldMap);
        window.fmFieldDisplayLayer = new L.FeatureGroup().addTo(window.fmFieldMap);

        if(L.Control && L.Control.Draw){
          const control = new L.Control.Draw({
            draw:{
              polyline:false,
              rectangle:false,
              circle:false,
              circlemarker:false,
              marker:false,
              polygon:{
                allowIntersection:false,
                showArea:true,
                shapeOptions:{weight:3}
              }
            },
            edit:false
          });
          window.fmFieldMap.addControl(control);

          // Remove any older V12 draw handler that forced a customer selection.
          window.fmFieldMap.off(L.Draw.Event.CREATED);
          window.fmFieldMap.on(L.Draw.Event.CREATED,function(e){
            try{
              window.fmFieldDrawLayer.clearLayers();
              window.fmFieldDrawLayer.addLayer(e.layer);
              window.fmPendingGeometry=e.layer.toGeoJSON().geometry;

              let ha=0;
              try{
                if(L.GeometryUtil && L.GeometryUtil.geodesicArea){
                  ha=L.GeometryUtil.geodesicArea(e.layer.getLatLngs()[0])/10000;
                }
              }catch(_){}

              if(byId('fieldHectares')) byId('fieldHectares').value=ha?ha.toFixed(2):'';
              if(byId('fieldEditId')) byId('fieldEditId').value='';
              if(byId('fieldEditorTitle')) byId('fieldEditorTitle').textContent='Neues Feld';
              if(byId('fieldEditor')) byId('fieldEditor').hidden=false;
              if(byId('fieldName')) byId('fieldName').focus();
              mapStatus('Feldgrenze eingezeichnet');
            }catch(err){
              console.error(err);
              alert('Die Feldgrenze konnte nicht übernommen werden.');
            }
          });
        }
      }

      mapStatus('Karte aktiv');
      safeDrawAll();
      setTimeout(function(){
        try{ window.fmFieldMap.invalidateSize(true); }catch(_){}
      },150);
    }catch(err){
      console.error('Kartenfehler:',err);
      mapStatus('Kartenfehler');
    }
  };

  function prepareNewField(){
    try{
      window.fmPendingGeometry=null;
      if(byId('fieldEditId')) byId('fieldEditId').value='';
      if(byId('fieldName')) byId('fieldName').value='';
      if(byId('fieldHectares')) byId('fieldHectares').value='';
      if(byId('fieldCrop')) byId('fieldCrop').value='';
      if(byId('fieldNotes')) byId('fieldNotes').value='';
      if(byId('fieldCustomer')) byId('fieldCustomer').value='';
      if(byId('fieldEditorTitle')) byId('fieldEditorTitle').textContent='Neues Feld';
      if(byId('fieldEditor')) byId('fieldEditor').hidden=false;
      if(window.fmFieldDrawLayer) window.fmFieldDrawLayer.clearLayers();
      window.fmInitFieldMap();
      alert('Tippe oben links auf das Polygon-Symbol und zeichne die Feldgrenze ein. Danach Feldname, Notiz und optional den Kunden eintragen und speichern.');
    }catch(e){ console.error(e); }
  }

  // Replace old New Field click handler completely.
  setTimeout(function(){
    const old=byId('newFieldButton');
    if(old){
      const clone=old.cloneNode(true);
      old.replaceWith(clone);
      clone.addEventListener('click',prepareNewField);
    }

    const nav=document.querySelector('nav button[data-page="felder"]');
    if(nav){
      nav.addEventListener('click',function(){
        setTimeout(function(){
          try{
            if(typeof fmPopulateFieldCustomer==='function') fmPopulateFieldCustomer();
            if(typeof fmRenderAllFields==='function') fmRenderAllFields();
          }catch(_){}
          window.fmInitFieldMap();
        },120);
      });
    }

    // If fields page is already open (e.g. page reload while logged in)
    if(byId('p-felder')?.classList.contains('active')) window.fmInitFieldMap();
  },250);

  // Re-initialize after window rotation / resize
  window.addEventListener('resize',function(){
    setTimeout(function(){
      try{ if(window.fmFieldMap) window.fmFieldMap.invalidateSize(true); }catch(_){}
    },120);
  });
})();
