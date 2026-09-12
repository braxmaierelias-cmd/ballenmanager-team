
/* FarmManager V13.6 – eigenes Feld-Zeichenwerkzeug ohne Leaflet Draw
   Hintergrund: app.js nutzt den Namen "L" selbst. Leaflet Draw greift intern
   auf "L" zu und kollidiert damit. Diese Version verwendet ausschließlich
   window.L und ein eigenes, touch-taugliches Zeichenwerkzeug. */
(function(){
  const el = id => document.getElementById(id);
  const status = t => { if(el('fieldMapProvider')) el('fieldMapProvider').textContent=t; };
  const Leaf = () => (window.L && typeof window.L.map === 'function') ? window.L : null;

  let drawing = false;
  let points = [];
  let pointLayer = null;
  let lineLayer = null;
  let drawToolbar = null;

  function mapLatLngToGeoJSON(latlngs){
    return {
      type:'Polygon',
      coordinates:[latlngs.map(p=>[p.lng,p.lat]).concat([[latlngs[0].lng,latlngs[0].lat]])]
    };
  }

  function polygonAreaHa(latlngs){
    const Lf=Leaf();
    if(!Lf || latlngs.length<3) return 0;
    try{
      if(Lf.GeometryUtil && Lf.GeometryUtil.geodesicArea){
        return Lf.GeometryUtil.geodesicArea(latlngs)/10000;
      }
    }catch(_){}
    // fallback: approximate projected shoelace in WebMercator
    try{
      const pts=latlngs.map(ll=>Lf.CRS.EPSG3857.project(ll));
      let a=0;
      for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        a += (pts[j].x*pts[i].y - pts[i].x*pts[j].y);
      }
      return Math.abs(a/2)/10000;
    }catch(_){ return 0; }
  }

  function clearDraft(){
    points=[];
    try{ if(pointLayer) pointLayer.clearLayers(); }catch(_){}
    try{ if(lineLayer) lineLayer.setLatLngs([]); }catch(_){}
  }

  function endDrawingUI(){
    drawing=false;
    const btn=el('fmDrawFieldBtn');
    if(btn) btn.textContent='✎ Feld einzeichnen';
    const done=el('fmDrawDoneBtn'), undo=el('fmDrawUndoBtn'), cancel=el('fmDrawCancelBtn');
    if(done) done.hidden=true;
    if(undo) undo.hidden=true;
    if(cancel) cancel.hidden=true;
    status('Karte aktiv');
  }

  function cancelDrawing(){
    clearDraft();
    endDrawingUI();
  }

  function finishDrawing(){
    if(points.length<3){
      alert('Bitte mindestens 3 Eckpunkte setzen.');
      return;
    }
    fmPendingGeometry=mapLatLngToGeoJSON(points);

    const ha=polygonAreaHa(points);
    if(el('fieldHectares')) el('fieldHectares').value = ha ? ha.toFixed(2) : '';
    if(el('fieldEditId')) el('fieldEditId').value='';
    if(el('fieldEditorTitle')) el('fieldEditorTitle').textContent='Neues Feld';
    if(el('fieldEditor')) el('fieldEditor').hidden=false;

    // Draft as filled polygon
    const Lf=Leaf();
    try{
      if(lineLayer) fmFieldMap.removeLayer(lineLayer);
      lineLayer = Lf.polygon(points,{weight:3,fillOpacity:.18}).addTo(fmFieldMap);
    }catch(_){}

    endDrawingUI();
    status('Feldgrenze eingezeichnet');
    setTimeout(()=>el('fieldName')?.focus(),50);
  }

  function undoPoint(){
    if(!points.length) return;
    points.pop();
    renderDraft();
  }

  function renderDraft(){
    const Lf=Leaf();
    if(!Lf || !fmFieldMap) return;
    if(!pointLayer) pointLayer = new Lf.LayerGroup().addTo(fmFieldMap);
    pointLayer.clearLayers();
    points.forEach((p,i)=>{
      Lf.circleMarker(p,{
        radius:6,weight:2,fillOpacity:1
      }).bindTooltip(String(i+1),{permanent:false,direction:'top'}).addTo(pointLayer);
    });

    if(!lineLayer){
      lineLayer = Lf.polyline(points,{weight:3}).addTo(fmFieldMap);
    }else{
      try{ lineLayer.setLatLngs(points); }catch(_){}
    }

    if(el('fmDrawDoneBtn')) el('fmDrawDoneBtn').disabled = points.length<3;
    status(`Einzeichnen aktiv · ${points.length} Punkt${points.length===1?'':'e'}`);
  }

  function startDrawing(){
    if(!fmFieldMap) buildMap();
    if(!fmFieldMap) return;

    clearDraft();
    drawing=true;

    if(el('fieldEditor')) el('fieldEditor').hidden=false;
    if(el('fieldEditId')) el('fieldEditId').value='';
    if(el('fieldEditorTitle')) el('fieldEditorTitle').textContent='Neues Feld';
    if(el('fieldName')) el('fieldName').value='';
    if(el('fieldHectares')) el('fieldHectares').value='';
    if(el('fieldCrop')) el('fieldCrop').value='';
    if(el('fieldNotes')) el('fieldNotes').value='';
    if(el('fieldCustomer')) el('fieldCustomer').value='';
    fmPendingGeometry=null;

    const btn=el('fmDrawFieldBtn');
    if(btn) btn.textContent='Eckpunkte antippen …';
    ['fmDrawDoneBtn','fmDrawUndoBtn','fmDrawCancelBtn'].forEach(id=>{ if(el(id)) el(id).hidden=false; });
    if(el('fmDrawDoneBtn')) el('fmDrawDoneBtn').disabled=true;

    status('Einzeichnen aktiv · Karte antippen');
  }

  function addToolbar(){
    if(drawToolbar || !el('fieldMap')) return;
    const box=document.createElement('div');
    box.id='fmFieldDrawToolbar';
    box.style.cssText='position:absolute;top:12px;left:12px;z-index:800;display:flex;gap:6px;flex-wrap:wrap;max-width:90%;';

    box.innerHTML=`
      <button id="fmDrawFieldBtn" type="button" style="width:auto;margin:0;padding:9px 11px;box-shadow:0 2px 10px rgba(0,0,0,.18)">✎ Feld einzeichnen</button>
      <button id="fmDrawDoneBtn" type="button" hidden style="width:auto;margin:0;padding:9px 11px;background:#5f8e49">✓ Fertig</button>
      <button id="fmDrawUndoBtn" type="button" hidden class="secondary" style="width:auto;margin:0;padding:9px 11px">↶ Punkt zurück</button>
      <button id="fmDrawCancelBtn" type="button" hidden class="secondary" style="width:auto;margin:0;padding:9px 11px">Abbrechen</button>
    `;
    const wrap=el('fieldMap').parentElement;
    if(getComputedStyle(wrap).position==='static') wrap.style.position='relative';
    wrap.appendChild(box);
    drawToolbar=box;

    el('fmDrawFieldBtn').addEventListener('click',startDrawing);
    el('fmDrawDoneBtn').addEventListener('click',finishDrawing);
    el('fmDrawUndoBtn').addEventListener('click',undoPoint);
    el('fmDrawCancelBtn').addEventListener('click',cancelDrawing);
  }

  function drawExistingFields(){
    const Lf=Leaf();
    if(!Lf || !fmFieldMap || !fmFieldDisplayLayer) return;
    try{ fmFieldDisplayLayer.clearLayers(); }catch(_){}
    const bounds=[];

    (fields||[]).forEach(f=>{
      try{
        const layer=Lf.geoJSON(
          {type:'Feature',geometry:f.geometry,properties:{}},
          {style:{weight:2,fillOpacity:.13}}
        );
        const customer=cust.find(c=>+c.id===+f.customer_id);
        const cname=customer ? (customer.name || customer.company || '') : 'Nicht zugeordnet';
        layer.bindTooltip(`${esc(f.name)} · ${esc(cname)}`);
        layer.addTo(fmFieldDisplayLayer);
        bounds.push(layer.getBounds());
      }catch(err){ console.warn(err); }
    });

    if(bounds.length){
      try{
        let b=bounds[0];
        for(let i=1;i<bounds.length;i++) b.extend(bounds[i]);
        fmFieldMap.fitBounds(b,{padding:[20,20],maxZoom:15});
      }catch(_){}
    }
  }

  function buildMap(){
    const host=el('fieldMap');
    const Lf=Leaf();
    if(!host) return;
    if(!Lf){
      status('Leaflet nicht verfügbar');
      host.innerHTML='<div style="padding:25px;color:#7a4f4f"><b>Kartenbibliothek konnte nicht geladen werden.</b></div>';
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
      pointLayer=null;
      lineLayer=null;
      drawing=false;
      points=[];

      // remove prior toolbar if page reinitializes
      if(drawToolbar){ try{drawToolbar.remove();}catch(_){} drawToolbar=null; }

      host.innerHTML='';
      const fresh=document.createElement('div');
      fresh.id='fieldMapInner';
      fresh.style.width='100%';
      fresh.style.height='100%';
      host.appendChild(fresh);

      fmFieldMap=Lf.map(fresh,{zoomControl:true,attributionControl:true}).setView([49.47,8.44],10);
      Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,
        attribution:'© OpenStreetMap'
      }).addTo(fmFieldMap);

      fmFieldDrawLayer=new Lf.FeatureGroup().addTo(fmFieldMap);
      fmFieldDisplayLayer=new Lf.FeatureGroup().addTo(fmFieldMap);
      pointLayer=new Lf.LayerGroup().addTo(fmFieldMap);

      fmFieldMap.on('click',function(e){
        if(!drawing) return;
        points.push(e.latlng);
        renderDraft();
      });

      drawExistingFields();
      addToolbar();

      setTimeout(()=>{ try{fmFieldMap.invalidateSize(true)}catch(_){} },150);
      status('Karte aktiv');
    }catch(err){
      console.error('V13.6 Kartenfehler:',err);
      status('Kartenfehler: '+(err?.message||'unbekannt'));
      host.innerHTML='<div style="padding:25px;color:#7a4f4f"><b>Karte konnte nicht gestartet werden.</b><br><small>'+String(err?.message||'Unbekannter Fehler')+'</small></div>';
    }
  }

  // Override all legacy map/draw helpers that might use free identifier L
  fmInitFieldMap=buildMap;
  fmDrawAllFields=drawExistingFields;
  fmGeoLayer=function(f,opts={}){
    const Lf=Leaf();
    if(!Lf) return null;
    try{
      return Lf.geoJSON(
        {type:'Feature',geometry:f.geometry,properties:{}},
        {style:{weight:2,fillOpacity:.16,...opts}}
      );
    }catch(_){ return null; }
  };

  // The existing "+ Neues Feld" button now directly activates our drawing mode
  setTimeout(()=>{
    const old=el('newFieldButton');
    if(old){
      const n=old.cloneNode(true);
      old.replaceWith(n);
      n.addEventListener('click',()=>{
        if(!fmFieldMap) buildMap();
        startDrawing();
      });
    }

    const nav=document.querySelector('nav button[data-page="felder"]');
    if(nav){
      nav.addEventListener('click',()=>setTimeout(()=>{
        try{
          if(typeof fmPopulateFieldCustomer==='function') fmPopulateFieldCustomer();
          if(typeof fmRenderAllFields==='function') fmRenderAllFields();
        }catch(_){}
        buildMap();
      },180));
    }

    if(el('p-felder')?.classList.contains('active')) buildMap();
  },350);

  window.addEventListener('orientationchange',()=>setTimeout(buildMap,400));
})();
