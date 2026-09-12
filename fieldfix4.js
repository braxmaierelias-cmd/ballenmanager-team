
/* FarmManager V13.4 – Leaflet-Namenskonflikt behoben
   In app.js existiert bereits eine Variable "L" für Status-Texte.
   Deshalb wird Leaflet hier immer explizit über window.L angesprochen. */
(function(){
  const el = id => document.getElementById(id);
  const status = t => { if(el('fieldMapProvider')) el('fieldMapProvider').textContent=t; };

  function leaflet(){
    return window.L && typeof window.L.map === 'function' ? window.L : null;
  }

  function drawExistingFields(){
    const Leaf = leaflet();
    if(!Leaf || !fmFieldMap || !fmFieldDisplayLayer) return;

    try{ fmFieldDisplayLayer.clearLayers(); }catch(_){}
    const bounds=[];

    (fields || []).forEach(f=>{
      try{
        const layer=Leaf.geoJSON(
          {type:'Feature',geometry:f.geometry,properties:{}},
          {style:{weight:2,fillOpacity:.13}}
        );
        const customer = cust.find(c=>+c.id===+f.customer_id);
        const cname = customer ? (customer.name || customer.company || '') : 'Nicht zugeordnet';
        layer.bindTooltip(`${esc(f.name)} · ${esc(cname)}`);
        layer.addTo(fmFieldDisplayLayer);
        bounds.push(layer.getBounds());
      }catch(err){
        console.warn('Feld konnte nicht gezeichnet werden:',err);
      }
    });

    if(bounds.length){
      try{
        let b=bounds[0];
        for(let i=1;i<bounds.length;i++) b.extend(bounds[i]);
        fmFieldMap.fitBounds(b,{padding:[20,20],maxZoom:15});
      }catch(_){}
    }
  }

  function buildFreshMap(){
    const host=el('fieldMap');
    if(!host) return;

    const Leaf=leaflet();
    if(!Leaf){
      status('Leaflet nicht verfügbar');
      host.innerHTML='<div style="padding:25px;color:#7a4f4f"><b>Kartenbibliothek konnte nicht gestartet werden.</b><br><small>window.L.map ist nicht verfügbar.</small></div>';
      return;
    }

    try{
      host.style.height='520px';

      try{
        if(fmFieldMap && typeof fmFieldMap.remove==='function') fmFieldMap.remove();
      }catch(_){}

      fmFieldMap=null;
      fmFieldDrawLayer=null;
      fmFieldDisplayLayer=null;

      host.innerHTML='';
      const fresh=document.createElement('div');
      fresh.id='fieldMapInner';
      fresh.style.width='100%';
      fresh.style.height='100%';
      host.appendChild(fresh);

      fmFieldMap=Leaf.map(fresh,{
        zoomControl:true,
        attributionControl:true
      }).setView([49.47,8.44],10);

      Leaf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,
        attribution:'© OpenStreetMap'
      }).addTo(fmFieldMap);

      fmFieldDrawLayer=new Leaf.FeatureGroup();
      fmFieldDisplayLayer=new Leaf.FeatureGroup();
      fmFieldMap.addLayer(fmFieldDrawLayer);
      fmFieldMap.addLayer(fmFieldDisplayLayer);

      if(Leaf.Control && Leaf.Control.Draw){
        const drawControl=new Leaf.Control.Draw({
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

        fmFieldMap.on(Leaf.Draw.Event.CREATED,function(e){
          try{
            fmFieldDrawLayer.clearLayers();
            fmFieldDrawLayer.addLayer(e.layer);
            fmPendingGeometry=e.layer.toGeoJSON().geometry;

            let ha=0;
            try{
              if(Leaf.GeometryUtil && Leaf.GeometryUtil.geodesicArea){
                const latlngs=e.layer.getLatLngs();
                const ring=Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
                ha=Leaf.GeometryUtil.geodesicArea(ring)/10000;
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
      }else{
        status('Karte aktiv · Zeichenwerkzeug fehlt');
      }

      drawExistingFields();

      setTimeout(()=>{
        try{ fmFieldMap.invalidateSize(true); }catch(_){}
      },150);

      if(Leaf.Control && Leaf.Control.Draw) status('Karte aktiv');

    }catch(err){
      console.error('V13.4 Kartenfehler:',err);
      status('Kartenfehler: '+(err?.message||'unbekannt'));
      host.innerHTML='<div style="padding:25px;color:#7a4f4f"><b>Karte konnte nicht gestartet werden.</b><br><small>'+String(err?.message||'Unbekannter Fehler')+'</small></div>';
    }
  }

  fmInitFieldMap=buildFreshMap;

  // Auch Hilfsfunktionen für Felder auf Leaflet via window.L umbiegen
  fmGeoLayer=function(f,opts={}){
    const Leaf=leaflet();
    if(!Leaf) return null;
    try{
      return Leaf.geoJSON(
        {type:'Feature',geometry:f.geometry,properties:{}},
        {style:{weight:2,fillOpacity:.16,...opts}}
      );
    }catch(e){ return null; }
  };

  fmDrawAllFields=drawExistingFields;

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
    try{ fmFieldDrawLayer?.clearLayers(); }catch(_){}
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
