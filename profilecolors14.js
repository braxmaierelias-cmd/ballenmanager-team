
/* FarmManager V14.8 – Mitarbeiterfarben */
(function(){
const E=id=>document.getElementById(id);
const DEFAULT='#5F8E49';
const COLORS=['#5F8E49','#2F80ED','#9B51E0','#EB5757','#F2994A','#F2C94C','#27AE60','#00A6A6','#2D9CDB','#6C5CE7','#E84393','#8D6E63','#34495E','#111111'];

function validColor(v){return /^#[0-9a-f]{6}$/i.test(v||'')?v:DEFAULT}
function currentProfile(){return profiles.find(x=>x.id===selectedTeamProfile)}

function ensureColorEditor(){
  if(E('tpEditColor148'))return;
  const notes=E('tpEditNotes');
  if(!notes)return;

  const grid=notes.closest('.grid')||notes.parentElement?.parentElement;
  const notesWrap=notes.parentElement;

  const wrap=document.createElement('div');
  wrap.className='full employee-color-wrap148';
  wrap.innerHTML=`
    <label>Mitarbeiterfarbe</label>
    <div class="employee-color-row148">
      <input id="tpEditColor148" type="color" value="${DEFAULT}">
      <div id="tpColorPalette148" class="employee-color-palette148"></div>
      <span id="tpColorValue148">${DEFAULT}</span>
    </div>
    <small class="muted">Diese Farbe wird für den Mitarbeiter in Team, Live-Karte und Fahrtaufzeichnung verwendet.</small>
  `;
  if(grid && notesWrap) grid.insertBefore(wrap,notesWrap);
  else notesWrap?.before(wrap);

  const pal=E('tpColorPalette148');
  pal.innerHTML=COLORS.map(c=>`<button type="button" class="color-dot148" data-color148="${c}" style="background:${c}" title="${c}"></button>`).join('');
  pal.querySelectorAll('[data-color148]').forEach(b=>b.onclick=()=>{
    E('tpEditColor148').value=b.dataset.color148;
    E('tpColorValue148').textContent=b.dataset.color148.toUpperCase();
  });
  E('tpEditColor148').oninput=()=>E('tpColorValue148').textContent=E('tpEditColor148').value.toUpperCase();
}

function applyTeamCardColors(){
  document.querySelectorAll('[data-team]').forEach(card=>{
    const p=profiles.find(x=>x.id===card.dataset.team);
    const c=validColor(p?.color);
    card.style.setProperty('--employee-color',c);
    card.style.borderLeft=`6px solid ${c}`;
    let dot=card.querySelector('.employee-color-dot148');
    if(!dot){
      dot=document.createElement('span');
      dot.className='employee-color-dot148';
      const top=card.querySelector('.teamtop')||card.firstElementChild;
      if(top)top.prepend(dot);
    }
    if(dot)dot.style.background=c;
  });
}

const oldRenderTeam148=renderTeam;
renderTeam=function(){
  oldRenderTeam148();
  applyTeamCardColors();
};

const oldRenderProfile148=renderTeamProfile;
renderTeamProfile=function(){
  oldRenderProfile148();
  ensureColorEditor();
  const p=currentProfile();
  const c=validColor(p?.color);
  if(E('tpEditColor148'))E('tpEditColor148').value=c;
  if(E('tpColorValue148'))E('tpColorValue148').textContent=c.toUpperCase();
  if(E('tpName'))E('tpName').style.borderLeft=`6px solid ${c}`;
};

setTimeout(()=>{
  ensureColorEditor();
  const save=E('saveTeamProfile');
  if(save&&!save.dataset.v148){
    save.dataset.v148='1';
    const old=save.onclick;
    save.onclick=async function(ev){
      if(old)await old.call(this,ev);
      if(!selectedTeamProfile)return;
      const color=validColor(E('tpEditColor148')?.value);
      try{
        await update('profiles',{color},'id=eq.'+encodeURIComponent(selectedTeamProfile));
        const p=profiles.find(x=>x.id===selectedTeamProfile);if(p)p.color=color;
        renderTeam();renderTeamProfile();
      }catch(err){alert('Farbe konnte nicht gespeichert werden: '+err.message)}
    };
  }
  applyTeamCardColors();
},1400);

/* Farbpunkt auch in Arbeitszeit-Historie ergänzen */
const oldHistory148=fmRenderWorkHistory;
fmRenderWorkHistory=function(){
  oldHistory148();
  const list=(myRole==='admin'?workSessions:workSessions.filter(s=>s.user_id===me?.id)).slice(0,60);
  [...document.querySelectorAll('#workHistory .work-row')].forEach((row,i)=>{
    const s=list[i];if(!s)return;
    const p=profiles.find(x=>x.id===s.user_id),c=validColor(p?.color);
    row.style.borderLeft=`5px solid ${c}`;
  });
};

setTimeout(()=>{try{renderTeam();fmRenderWorkHistory()}catch(_){}},2200);
})();
