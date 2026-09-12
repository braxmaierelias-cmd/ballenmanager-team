
/* FarmManager V13.3 – Feldkarte komplett neu initialisieren, ohne alte Wrapper */
(function(){
  const el = id => document.getElementById(id);
  const status = t => { if(el('fieldMapProvider')) el('fieldMapProvider').textContent=t; };

  function buildFreshMap(){
    const host=el('fieldMap');
    if(!host) return;

    if(typeof L==='undefined'){
      status('Kartenbibliothek nicht geladen');
      host.innerHTML='<div style="padding:25px">Die Kartenbibliothek konnte nicht geladen werden.</div>';
      return;
    }

    try{
      host.style.height='520px';

      // Alte/störende Leaflet-Instanz sauber entfernen.
      try{
        if(fmFieldMap && typeof fmFieldMap.remove==='function') fmFieldMap.remove();
      }catch(_){}
      fmFieldMap=null;
      fmFieldDrawLayer=null;
      fmFieldDisplayLayer=null;

      // Leaflet kann eine Container-ID intern markieren. Darum einen komplett neuen Untercontainer verwenden.
      host.innerHTML='';
      const fresh=document.createElement('div');
      fresh.id='fieldMapInner';
      fresh.style.width='100%';
      fresh.style.height='100%';
      host.appendChild(fresh);

      fmFieldMap=L.map(fresh,{
        zoomControl:true,
        attributionControl:true
      }).setView([49.47,8.44],10);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,
        attribution:'© OpenStreetMap'
      }).addTo(fmFieldMap);

      fmFieldDrawLayer=new L.FeatureGroup();
      fmFieldDisplayLayer=new L.FeatureGroup();
      fmFieldMap.addLayer(fmFieldDrawLayer);
      fmFieldMap.addLayer(fmFieldDisplayLayer);

      if(L.Control && L.Control.Draw){
        const drawControl=new L.Control.Draw({
          position:'topleft',
          draw:{
            polyline:false,
            rectangle:false,
            circle:false,
            circlemarker:false,
            marker:false,
            polygon:{
              allowIntersection:false,
              showArea:true,
              repeatMode:false,
              shapeOptions:{weight:3}
            }
          },
          edit:false
        });
        fmFieldMap.addControl(drawControl);

        fmFieldMap.on(L.Draw.Event.CREATED, function(e){
          try{
            fmFieldDrawLayer.clearLayers();
            fmFieldDrawLayer.addLayer(e.layer);
            fmPendingGeometry=e.layer.toGeoJSON().geometry;

            let ha=0;
            try{
              if(L.GeometryUtil && L.GeometryUtil.geodesicArea){
                const ll=e.layer.getLatLngs();
                const ring=Array.isArray(ll[0]) ? ll[0] : ll;
                ha=L.GeometryUtil.geodesicArea(ring)/10000;
              }
            }catch(_){}

            if(el('fieldHectares')) el('fieldHectares').value=ha ? ha.toFixed(2) : '';
            if(el('fieldEditId')) el('fieldEditId').value='';
            if(el('fieldEditorTitle')) el('fieldEditorTitle').textContent='Neues Feld';
            if(el('fieldEditor')) el('fieldEditor').hidden=false;
            status('Feldgrenze eingezeichnet');
            setTimeout(()=>el('fieldName')?.focus(),50);
          }catch(err){
            console.error(err);
            status('Fehler beim Einzeichnen');
          }
        });
      } else {
        status('Zeichenwerkzeug nicht geladen');
      }

      // Vorhandene Felder einzeichnen
      try{
        if(typeof fmDrawAllFields==='function') fmDrawAllFields();
      }catch(e){console.warn(e)}

      setTimeout(()=>{
        try{fmFieldMap.invalidateSize(true)}catch(_){}
      },150);

      if(!(L.Control && L.Control.Draw)) {
        status('Karte aktiv · Zeichnen nicht verfügbar');
      } else {
        status('Karte aktiv');
      }

    }catch(err){
      console.error('V13.3 Kartenfehler:',err);
      status('Kartenfehler: '+(err?.message||'unbekannt'));
      host.innerHTML='<div style="padding:25px;color:#7a4f4f"><b>Karte konnte nicht gestartet werden.</b><br><small>'+(err?.message||'Unbekannter Fehler')+'</small></div>';
    }
  }

  // V13-Funktion vollständig ersetzen
  fmInitFieldMap=buildFreshMap;

  function openNewField(){
    fmPendingGeometry=null;
    if(el('fieldEditId')) el('fieldEditId').value='';
    if(el('fieldName')) el('fieldName').value='';
    if(el('fieldHectares')) el('fieldHectares').value='';
    if(el('fieldCrop')) el('fieldCrop').value='';
    if(el('fieldNotes')) el('fieldNotes').value='';
    if(el('fieldCustomer')) el('fieldCustomer').value='';
    if(el('fieldEditorTitle')) el('fieldEditorTitle').textContent='Neues Feld';
    if(el('fieldEditor')) el('fieldEditor').hidden=false;

    if(!fmFieldMap) buildFreshMap();
    try{fmFieldDrawLayer?.clearLayers()}catch(_){}
    alert('Oben links das Polygon-Symbol wählen. Dann die Eckpunkte des Feldes antippen und am ersten Punkt abschließen.');
  }

  setTimeout(()=>{
    const old=el('newFieldButton');
    if(old){
      const n=old.cloneNode(true);
      old.replaceWith(n);
      n.addEventListener('click',openNewField);
    }

    const nav=document.querySelector('nav button[data-page="felder"]');
    if(nav){
      nav.addEventListener('click',()=>setTimeout(()=>{
        try{
          if(typeof fmPopulateFieldCustomer==='function') fmPopulateFieldCustomer();
          if(typeof fmRenderAllFields==='function') fmRenderAllFields();
        }catch(_){}
        buildFreshMap();
      },180));
    }

    if(el('p-felder')?.classList.contains('active')) buildFreshMap();
  },350);

  window.addEventListener('orientationchange',()=>setTimeout(buildFreshMap,400));
})();
