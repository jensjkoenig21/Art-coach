
/* ART COACH V1.3 – Figurenatelier + iPad Canvas Fix */
(() => {
  const V='1.3';
  document.title='ART COACH V1.3 Figurenatelier';
  document.querySelectorAll('.sidefoot').forEach(x=>x.innerHTML='ART COACH V1.3<br>iPad-first · lokal gespeichert');
  const pill=[...document.querySelectorAll('.pill')].find(x=>x.textContent.includes('ART COACH'));
  if(pill) pill.textContent='ART COACH · V1.3';

  if(typeof state!=='undefined'){
    state.figureAge=state.figureAge||'adult';
    state.figureView=state.figureView||'front';
    state.poseDepth=state.poseDepth||{};
    state.poseBlueprint=state.poseBlueprint||null;
  }

  const ageProfiles={
    child:{label:'Kind',heads:6.0,shoulder:.84,pelvis:.92,limb:.88,head:1.16,note:'Größerer Kopfanteil, schmalere Schultern und relativ kürzere Gliedmaßen.'},
    teen:{label:'Jugendliche/r',heads:7.0,shoulder:.94,pelvis:.97,limb:.96,head:1.06,note:'Übergangsproportionen: bereits gestreckt, aber noch etwas kompakter als beim Erwachsenen.'},
    adult:{label:'Erwachsene/r',heads:7.5,shoulder:1,pelvis:1,limb:1,head:1,note:'Naturalistische Orientierung mit ungefähr 7,5 Kopfhöhen.'}
  };

  function cp(o){return JSON.parse(JSON.stringify(o))}
  function mid(a,b){return[(a[0]+b[0])/2,(a[1]+b[1])/2]}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function line(a,b,cls='v13-bone'){return `<line class="${cls}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`}
  function joint(k,a,major=false){return `<circle class="v13-joint ${major?'major':''}" data-v13="${k}" cx="${a[0]}" cy="${a[1]}" r="${major?12:10}"/>`}
  function ik(a,t,l1,l2,side=1){
    let dx=t[0]-a[0],dy=t[1]-a[1],d=Math.max(1,Math.hypot(dx,dy)),dc=clamp(d,Math.abs(l1-l2)+1,l1+l2-1);
    let ux=dx/d,uy=dy/d,x=(l1*l1-l2*l2+dc*dc)/(2*dc),h=Math.sqrt(Math.max(0,l1*l1-x*x));
    return[a[0]+ux*x-side*uy*h,a[1]+uy*x+side*ux*h]
  }
  function ageAdjusted(p){
    p=cp(p); const a=ageProfiles[state.figureAge||'adult']; const c=180;
    for(const k of ['ls','rs']) p[k][0]=c+(p[k][0]-c)*a.shoulder;
    for(const k of ['lh','rh']) p[k][0]=c+(p[k][0]-c)*a.pelvis;
    // head size handled in render; limb endpoints gently compact/extend around proximal joint
    for(const pair of [['lw','ls'],['rw','rs'],['la','lh'],['ra','rh']]){
      const q=p[pair[0]], root=p[pair[1]];
      q[0]=root[0]+(q[0]-root[0])*a.limb; q[1]=root[1]+(q[1]-root[1])*a.limb;
    }
    return p;
  }

  function sidePoint(k,p){
    const depth=state.poseDepth||{};
    const center=180;
    const x=center+(depth[k]??({
      head:0,ls:-8,rs:8,lh:-5,rh:5,lw:-18,rw:18,la:-10,ra:10
    }[k]||0));
    return [x,p[k][1]];
  }

  function renderFigure(){
    if(!poseModel) return;
    const svg=document.getElementById('v13Svg'); if(!svg)return;
    const p=ageAdjusted(poseModel), a=ageProfiles[state.figureAge||'adult'];
    const front=(state.figureView||'front')==='front';
    const q=front?p:Object.fromEntries(['head','ls','rs','lh','rh','lw','rw','la','ra'].map(k=>[k,sidePoint(k,p)]));
    let arm1=76*a.limb,arm2=72*a.limb,leg1=100*a.limb,leg2=105*a.limb;
    let le=ik(q.ls,q.lw,arm1,arm2,p.elbowL||1), re=ik(q.rs,q.rw,arm1,arm2,p.elbowR||-1),
        lk=ik(q.lh,q.la,leg1,leg2,p.kneeL||1), rk=ik(q.rh,q.ra,leg1,leg2,p.kneeR||-1);
    const shoulder=mid(q.ls,q.rs), hip=mid(q.lh,q.rh), torso=mid(shoulder,hip);
    svg.innerHTML=`
      <line class="v13-guide" x1="180" y1="25" x2="180" y2="475"/>
      <polygon class="v13-torso" points="${q.ls} ${q.rs} ${q.rh} ${q.lh}"/>
      ${line(q.ls,le)}${line(le,q.lw)}${line(q.rs,re)}${line(re,q.rw)}
      ${line(q.lh,lk)}${line(lk,q.la)}${line(q.rh,rk)}${line(rk,q.ra)}
      ${line(q.ls,q.rs)}${line(q.lh,q.rh)}${line(shoulder,q.head)}
      <ellipse class="v13-torso" cx="${q.head[0]}" cy="${q.head[1]}" rx="${22*a.head*(front?1:.72)}" ry="${28*a.head}"/>
      ${joint('head',q.head,true)}${joint('ls',q.ls,true)}${joint('rs',q.rs,true)}
      ${joint('lh',q.lh,true)}${joint('rh',q.rh,true)}
      ${joint('lw',q.lw)}${joint('rw',q.rw)}${joint('la',q.la)}${joint('ra',q.ra)}
      ${front?joint('torso',torso,true):''}
      <text class="v13-label" x="14" y="24">${front?'VORDERANSICHT':'SEITENANSICHT'}</text>`;
    bindFigure();
  }

  let drag=null,lastPt=null;
  function svgPoint(svg,e){let pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;return pt.matrixTransform(svg.getScreenCTM().inverse())}
  function bindFigure(){
    const svg=document.getElementById('v13Svg'); if(!svg)return;
    svg.querySelectorAll('[data-v13]').forEach(n=>n.onpointerdown=e=>{
      drag=n.dataset.v13; lastPt=svgPoint(svg,e); svg.setPointerCapture?.(e.pointerId); e.preventDefault();
    });
    svg.onpointermove=e=>{
      if(!drag)return; const pt=svgPoint(svg,e), front=(state.figureView||'front')==='front';
      if(front){
        if(drag==='torso'){
          const dx=pt.x-lastPt.x,dy=pt.y-lastPt.y;
          ['head','ls','rs','lh','rh'].forEach(k=>{poseModel[k][0]+=dx;poseModel[k][1]+=dy});
          lastPt=pt;
        } else {
          poseModel[drag]=[clamp(pt.x,30,330),clamp(pt.y,30,470)];
        }
      }else{
        state.poseDepth=state.poseDepth||{};
        state.poseDepth[drag]=clamp(pt.x-180,-115,115);
        if(drag==='head') poseModel.head[1]=clamp(pt.y,30,470);
        if(['lw','rw','la','ra'].includes(drag)) poseModel[drag][1]=clamp(pt.y,30,470);
      }
      state.customPose=cp(poseModel); renderFigure();
    };
    svg.onpointerup=svg.onpointercancel=()=>{if(drag){drag=null;state.customPose=cp(poseModel);saveProject()}};
  }

  function setView(v){state.figureView=v; saveProject(); document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===v));renderFigure()}
  function setAge(v){state.figureAge=v;saveProject();document.querySelectorAll('[data-age]').forEach(b=>b.classList.toggle('on',b.dataset.age===v));updateAgeNote();renderFigure()}
  function updateAgeNote(){const e=document.getElementById('v13AgeNote');if(e)e.textContent=ageProfiles[state.figureAge||'adult'].note}
  function setV13Mode(m){
    state.mannequinMode=m;saveProject();
    const st=document.getElementById('v13Stage');st?.classList.toggle('volume',m==='volume');
    document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
  }
  function saveBlueprint(){
    state.customPose=cp(poseModel);
    state.poseBlueprint={pose:cp(poseModel),depth:cp(state.poseDepth||{}),age:state.figureAge||'adult',view:state.figureView||'front',preset:state.posePreset||'',savedAt:new Date().toISOString()};
    localStorage.setItem('artCoachV1',JSON.stringify(state));
    renderBlueprint();
    toast('Figur als Bauplan übernommen');
    document.getElementById('v13Blueprint')?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function renderBlueprint(){
    let old=document.getElementById('v13Blueprint'); if(old)old.remove();
    if(!state.poseBlueprint)return;
    const plan=document.querySelector('#plan .card:last-of-type'); if(!plan)return;
    const a=ageProfiles[state.poseBlueprint.age]||ageProfiles.adult;
    const h=Number(state.height||30), head=h/a.heads;
    const box=document.createElement('div');box.id='v13Blueprint';box.className='v13-blueprint';
    box.innerHTML=`<div class="eyebrow">Übernommenes Grundgerüst</div><h2 style="margin:5px 0">Deine Figur ist im Bauplan gespeichert</h2>
      <p class="small">${a.label} · ${a.heads.toFixed(1).replace('.',',')} Kopfhöhen · Pose aus der Posenwerkstatt. Vorder- und Seiteninformation bleiben im Projekt erhalten.</p>
      <div class="v13-blueprint-grid"><div><span class="small">Figur</span><b>${h.toFixed(0)} cm</b></div><div><span class="small">Kopf</span><b>${head.toFixed(1).replace('.',',')} cm</b></div><div><span class="small">Alterstyp</span><b>${a.label}</b></div><div><span class="small">Ansichten</span><b>Front + Seite</b></div></div>
      <div class="actions"><button class="btn secondary" onclick="openPoseWorkshop()">Pose weiter bearbeiten</button><button class="btn primary" onclick="show('studio')">Mit Grundgerüst ins Atelier →</button></div>`;
    plan.appendChild(box);
  }

  function buildWorkshop(){
    const w=document.querySelector('.poseWorkshop'); if(!w)return;
    w.innerHTML=`<div class="eyebrow">Posenwerkstatt · V1.3</div><h2>Figurenatelier – Haltung und Proportion räumlich planen</h2>
      <p class="small">Wähle eine Ausgangspose und bearbeite danach Kopf, Schulterachse, Becken, Rumpf, Hände und Füße. Die Seitenansicht ergänzt die Tiefe.</p>
      <div class="poseTabs" id="poseTabs"></div><div class="poseGrid" id="poseGrid"></div>
      <div class="v13-grid">
        <div>
          <div class="v13-toolbar">
            <button data-view="front" onclick="v13.setView('front')">↔ Vorderansicht</button>
            <button data-view="side" onclick="v13.setView('side')">◐ Seitenansicht</button>
          </div>
          <div id="v13Stage" class="v13-stage ${state.mannequinMode==='volume'?'volume':''}">
            <svg id="v13Svg" viewBox="0 0 360 500"></svg>
            <div class="v13-hint">● Große Punkte: Kopf, Schulter, Becken & Rumpf · kleine Punkte: Hände/Füße</div>
          </div>
        </div>
        <div>
          <div class="eyebrow">Proportion</div><h2 style="margin:5px 0 8px">Alter & Körperbau</h2>
          <div class="v13-toolbar">
            <button data-age="child" onclick="v13.setAge('child')">🧒 Kind</button>
            <button data-age="teen" onclick="v13.setAge('teen')">🧑 Jugendliche/r</button>
            <button data-age="adult" onclick="v13.setAge('adult')">🧍 Erwachsene/r</button>
          </div>
          <p id="v13AgeNote" class="v13-age-note"></p>
          <div class="eyebrow" style="margin-top:20px">Darstellung</div>
          <div class="v13-toolbar"><button data-mode="skeleton" onclick="v13.setMode('skeleton')">🦴 Grundgerüst</button><button data-mode="volume" onclick="v13.setMode('volume')">🧍 Volumen</button></div>
          <div class="v13-sidecard"><b>Was lässt sich jetzt verändern?</b><p class="small">Vorderansicht: gesamte Rumpflage, Kopf, Schulter- und Beckenpunkte sowie Hände/Füße. Seitenansicht: räumliche Tiefe und Vor-/Zurückbewegung.</p></div>
          <div class="actions"><button class="btn secondary" onclick="resetPose();setTimeout(v13.render,0)">↺ Pose zurücksetzen</button><button class="btn primary" onclick="v13.blueprint()">📐 Diese Figur als Bauplan übernehmen</button></div>
          <p class="small"><b>Kunst-Coach:</b> Anatomische Proportionen sind Ausgangspunkte. Bewusste Abweichungen dürfen Ausdruck erzeugen – wichtig ist, dass du ihre Wirkung begründen kannst.</p>
        </div>
      </div>`;
    renderPoseTabs();renderPoseGrid();updateAgeNote();
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===(state.figureView||'front')));
    document.querySelectorAll('[data-age]').forEach(b=>b.classList.toggle('on',b.dataset.age===(state.figureAge||'adult')));
    document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===(state.mannequinMode||'skeleton')));
    renderFigure();
  }

  // Keep existing preset catalogue, but route its rendering into the V1.3 figure.
  const oldSelectPreset=selectPreset;
  selectPreset=function(id){oldSelectPreset(id);setTimeout(renderFigure,0)};
  const oldSelectCat=selectPoseCategory;
  selectPoseCategory=function(k){oldSelectCat(k);};

  // Replace workshop init after the original V1.2.2 script has loaded.
  const oldInit=initPoseWorkshop;
  initPoseWorkshop=function(){
    oldInit();
    buildWorkshop();
  };

  // iPad/Retina canvas fix: backing-store coordinates now exactly match CSS coordinates.
  initDraftCanvas=function(){
    let old=document.getElementById('draftCanvas'); if(!old)return;
    const c=old.cloneNode(false); old.replaceWith(c);
    let ctx=null,drawing=false,last=null,dpr=1;
    function resize(){
      const r=c.getBoundingClientRect(); dpr=Math.max(1,window.devicePixelRatio||1);
      const saved=state.draftImage||'';
      c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);
      ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#383832';
      draftCtx=ctx;
      if(saved){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,r.width,r.height);im.src=saved}
    }
    function pos(e){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left),y:(e.clientY-r.top)}}
    resize();
    c.onpointerdown=e=>{drawing=true;last=pos(e);c.setPointerCapture?.(e.pointerId);e.preventDefault()};
    c.onpointermove=e=>{if(!drawing)return;const q=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(q.x,q.y);ctx.stroke();last=q;e.preventDefault()};
    const end=()=>{if(!drawing)return;drawing=false;saveDraftImage()};
    c.onpointerup=end;c.onpointercancel=end;
    window.addEventListener('resize',()=>setTimeout(resize,120),{passive:true});
    c.dataset.ready='v13';
  };
  saveDraftImage=function(){
    const c=document.getElementById('draftCanvas');if(!c)return;
    try{state.draftImage=c.toDataURL('image/jpeg',.78);localStorage.setItem('artCoachV1',JSON.stringify(state))}catch(e){}
  };
  clearDraft=function(){
    const c=document.getElementById('draftCanvas');if(!c||!draftCtx)return;
    draftCtx.save();draftCtx.setTransform(1,0,0,1,0,0);draftCtx.clearRect(0,0,c.width,c.height);draftCtx.restore();
    state.draftImage='';saveProject();
  };

  window.v13={setView,setAge,setMode:setV13Mode,blueprint:saveBlueprint,render:renderFigure};

  setTimeout(()=>{
    initDraftCanvas();
    initPoseWorkshop();
    renderBlueprint();
  },80);
})();
