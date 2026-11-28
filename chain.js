(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const cyan='#62e6e0', gold='#ffc66b', muted='#a8bbce', violet='#b5a1ff', lineC='#2c3e52', grey='#8fa3b8';
 const text=(x,y,s,extra='')=>`<text x="${x}" y="${y}" ${extra}>${s}</text>`;
 const seg=(a,b,color,extra='')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" ${extra}/>`;
 const path=(d,color,width=2,extra='')=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;
 function frame(id){const el=$(id);if(!el)return null;const w=el.clientWidth,h=el.clientHeight;el.setAttribute('viewBox',`0 0 ${w} ${h}`);return {el,w,h};}

 /* ================= Q0: measure first — the scan grows the whole pattern ================= */
 const q0samples={
  salt:{label:'塩（NaCl）', note:'食塩。2種類の原子が、規則正しく交互に並んだ結晶。', peaks:()=>TOYS.naclFamilies(60)},
  metal:{label:'金属（体心の並び）', note:'真ん中にも原子が入った並び方。鉄など金属に多いタイプ。', peaks:()=>TOYS.families(4,1,60)},
  big:{label:'大きな結晶（大きいセル）', note:'1つの単位（セル）が大きい結晶。面の組がたくさんある。', peaks:()=>TOYS.families(8,0,60)}
 };
 const q0={ sample:'salt', phase:'idle', scanX:15, trace:null, peaks:[], seed:11 };
 function q0rng(seed){ let t=seed>>>0; return ()=>{ t+=0x6D2B79F5; let r=Math.imul(t^t>>>15,1|t); r^=r+Math.imul(r^r>>>7,61|r); return ((r^r>>>14)>>>0)/4294967296; }; }
 function q0BuildTrace(){
  q0.peaks=q0samples[q0.sample].peaks();
  const rand=q0rng(q0.seed), pts=[], N=1600;
  for(let i=0;i<=N;i++){ const x=15+75*i/N, v=XRD.intensity(x,q0.peaks);
   const amp=0.006+0.085*Math.sqrt(Math.max(v,0));
   pts.push([x, Math.max(0, v+(rand()*2-1)*amp)]); }
  q0.trace=pts;
 }
 function q0Instrument(){
  const f=frame('q0-instrument'); if(!f) return; const {el,w,h}=f;
  const sx=w*0.40, sy=h*0.60, R=Math.min(w*0.34, sy-16);
  const ang=q0.scanX*Math.PI/180, dx=sx+R*Math.cos(ang), dy=sy-R*Math.sin(ang);
  let svg='';
  let arc=''; for(let a=0;a<=90;a+=5){ const px=sx+R*Math.cos(a*Math.PI/180), py=sy-R*Math.sin(a*Math.PI/180); arc+=(a?'L':'M')+px.toFixed(1)+' '+py.toFixed(1); }
  svg+=path(arc,lineC,1.4,'stroke-dasharray="3 5"');
  svg+=`<rect x="14" y="${sy-9}" width="28" height="18" fill="none" stroke="${muted}" stroke-width="1.6"/>`;
  svg+=text(28, sy+30, '線源', 'text-anchor="middle" style="font-size:11px;fill:#a8bbce"');
  svg+=seg([42,sy],[sx,sy],gold,'stroke-width="2.5"');
  svg+=seg([sx,sy],[w-14,sy],gold,'stroke-width="1.4" stroke-dasharray="4 5" opacity=".65"');
  svg+=text(w-14, sy+30, '直進ビーム', 'text-anchor="end" style="font-size:11px;fill:#a8bbce"');
  svg+=seg([sx,sy-30],[sx,sy+30],cyan,'stroke-width="4"');
  svg+=text(sx, sy+48, '試料', 'text-anchor="middle" style="font-size:11px;fill:#a8bbce"');
  svg+=seg([sx,sy],[dx,dy],gold,'stroke-width="2.5"');
  let small=''; for(let a=0;a<=q0.scanX;a+=3){ const px=sx+40*Math.cos(a*Math.PI/180), py=sy-40*Math.sin(a*Math.PI/180); small+=(a?'L':'M')+px.toFixed(1)+' '+py.toFixed(1); }
  svg+=path(small,muted,1.2);
  svg+=text(sx+54, sy-16, '2θ', 'style="font-size:12px;fill:#eaf6ff"');
  svg+=`<g transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)}) rotate(${(-q0.scanX).toFixed(1)})"><rect x="-12" y="-6" width="24" height="12" fill="#b5a1ff" stroke="#0b1421" stroke-width="1"/></g>`;
  svg+=text(dx, dy-14, '検出器', 'text-anchor="middle" style="font-size:11px;fill:#a8bbce"');
  svg+=text(10, 16, `検出器の角度 2θ = ${q0.scanX.toFixed(1)}°`, 'style="font-size:12px;fill:#a8bbce"');
  el.innerHTML=svg;
 }
 function q0Plot(){
  const f=frame('q0-plot'); if(!f) return; const {el,w,h}=f;
  const range=[15,90], left=46,right=w-12,top=26,bottom=h-38, ymax=1.15;
  const xx=x=>left+(x-range[0])/(range[1]-range[0])*(right-left), yy=v=>bottom-v/ymax*(bottom-top);
  let svg=`<defs><clipPath id="q0-clip"><rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/></clipPath></defs>`;
  svg+=text(left,15,'相対強度','style="font-size:12px;fill:#a8bbce"');
  for(const v of [0,.5,1]){ svg+=seg([left,yy(v)],[right,yy(v)],lineC)+text(left-7,yy(v)+4,v.toFixed(1),'text-anchor="end" style="font-size:12px"'); }
  for(const t of [20,40,60,80]) svg+=text(xx(t),bottom+19,String(t),'text-anchor="middle" style="font-size:12px"');
  svg+=text((left+right)/2,h-2,'検出器の角度 2θ（°）','text-anchor="middle" style="font-size:12px"');
  svg+=text(right,15,q0samples[q0.sample].label,'text-anchor="end" style="font-size:12px;fill:#a8bbce"');
  svg+='<g clip-path="url(#q0-clip)">';
  if(q0.trace){
   let d=''; for(const pt of q0.trace){ if(pt[0]>q0.scanX+1e-9) break; d+=(d?'L':'M')+xx(pt[0]).toFixed(1)+' '+yy(pt[1]).toFixed(1); }
   if(d) svg+=path(d,cyan,2);
   if(q0.phase==='scanning') svg+=seg([xx(q0.scanX),top],[xx(q0.scanX),bottom],gold,'stroke-dasharray="3 4" opacity=".85"');
   if(q0.phase==='done'){ for(const g of q0.peaks){ if(g.area<=1e-6) continue; svg+=`<circle cx="${xx(g.x).toFixed(1)}" cy="${yy(XRD.intensity(g.x,[g])).toFixed(1)}" r="3" fill="${cyan}"/>`; } }
  } else {
   svg+=text((left+right)/2,(top+bottom)/2,'まだ測っていません','text-anchor="middle" style="font-size:13px;fill:#a8bbce"');
  }
  svg+='</g>';
  el.innerHTML=svg;
 }
 function q0Render(){ q0Instrument(); q0Plot(); if(window.Q0Three)Q0Three.setScan(q0.scanX); }
 function q0SetSample(key){
  if(q0.phase==='scanning') return;
  q0.sample=key; q0.phase='idle'; q0.scanX=15; q0.trace=null; q0.peaks=q0samples[key].peaks();
  document.querySelectorAll('[data-q0-sample]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.q0Sample===key));
  $('q0-sample-note').textContent=q0samples[key].note;
  $('q0-start').textContent='測定スタート';
  $('q0-status').innerHTML='試料を選んで「測定スタート」を押すと、検出器が角度を掃いて、パターンが育っていきます。';
  q0Render();
  if(window.Q0Three)Q0Three.setSample(key);
 }
 function q0Finish(){
  q0.phase='done'; q0.scanX=90;
  const n=q0.peaks.filter(g=>g.area>1e-6).length;
  const btn=$('q0-start'); btn.disabled=false; btn.textContent='もう一度測る';
  document.querySelectorAll('[data-q0-sample]').forEach(b=>b.disabled=false);
  if(window.Q0Three)Q0Three.setScanBusy(false);
  $('q0-status').innerHTML=`測り終わった。<strong>${q0samples[q0.sample].label}</strong> のピークは <strong>${n} 本</strong>。この図が、このページでほどいていく題材です。`;
  q0Render();
 }
 function q0Start(){
  if(q0.phase==='scanning') return;
  if(window.Q0Three&&Q0Three.isDiving()) return;
  q0BuildTrace(); q0.seed+=13; q0.phase='scanning'; q0.scanX=15;
  const btn=$('q0-start'); btn.disabled=true; btn.textContent='測定中…';
  document.querySelectorAll('[data-q0-sample]').forEach(b=>b.disabled=true);
  if(window.Q0Three)Q0Three.setScanBusy(true);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){ q0Finish(); return; }
  const t0=performance.now(), DUR=9000;
  (function step(now){
   if(q0.phase!=='scanning') return;
   const p=Math.min(1,(now-t0)/DUR); q0.scanX=15+75*p;
   $('q0-status').innerHTML=`測定中… 検出器は 2θ = <strong>${q0.scanX.toFixed(1)}°</strong> を走査中`;
   q0Render();
   if(p<1) requestAnimationFrame(step); else q0Finish();
  })(t0);
 }
 if($('q0-plot')){
  document.querySelectorAll('[data-q0-sample]').forEach(b=>b.onclick=()=>q0SetSample(b.dataset.q0Sample));
  $('q0-start').onclick=q0Start;
  new ResizeObserver(q0Render).observe($('q0'));
  q0SetSample('salt');
 }

 /* ================= Q1: Bragg two-plane toy + regularity strip ================= */
 const q1={ d:4, twoTheta:TOYS.alignedAngle(4,1), planes:16, jitter:0, time:0 };
 function q1Scene(){
  const f=frame('q1-scene'); if(!f) return; const {el,w,h}=f;
  const th=q1.twoTheta*Math.PI/360, c=Math.cos(th), s=Math.sin(th);
  const pxPerA=Math.min(30, 118/q1.d), dPx=q1.d*pxPerA, lamPx=pxPerA*XRD.wavelength;
  const y1=h*0.30, A=[w*0.40,y1], B=[w*0.40,y1+dPx];
  const inn=[c,s], out=[c,-s], perpIn=[-s,c], perpOut=[s,c];
  const Lin=Math.min(150, w*0.34), Sout=Math.min(160, w*0.36);
  const S1=[A[0]-inn[0]*Lin, A[1]-inn[1]*Lin];
  const S2=[A[0]+dPx*c*perpIn[0]-inn[0]*Lin, A[1]+dPx*c*perpIn[1]-inn[1]*Lin];
  const C=[B[0]-inn[0]*dPx*s, B[1]-inn[1]*dPx*s];
  const D=[B[0]+out[0]*dPx*s, B[1]+out[1]*dPx*s];
  const E1=[A[0]+out[0]*Sout, A[1]+out[1]*Sout];
  const E2=[B[0]+out[0]*(Sout+dPx*s), B[1]+out[1]*(Sout+dPx*s)];
  let svg='';
  // planes with atoms
  for(const [py] of [[y1],[y1+dPx]]){
    svg+=seg([14,py],[w-14,py],'#3d5a76','stroke-width="1.6"');
    for(let x=24;x<w-16;x+=34) svg+=`<circle cx="${x}" cy="${py}" r="4.4" fill="${cyan}"/>`;
  }
  svg+=text(16,y1-10,'上の面','style="font-size:12px;fill:#a8bbce"');
  svg+=text(16,y1+dPx+22,'下の面','style="font-size:12px;fill:#a8bbce"');
  // d bracket
  const bx=w-30; svg+=seg([bx,y1],[bx,y1+dPx],gold,'stroke-width="2"')+seg([bx-5,y1],[bx+5,y1],gold)+seg([bx-5,y1+dPx],[bx+5,y1+dPx],gold);
  svg+=text(bx-8,y1+dPx/2+4,`d = ${q1.d.toFixed(2)} Å`,'text-anchor="end" style="fill:#ffc66b"');
  // wavefronts (dashed)
  const wf=(P,perp,len)=>{const a=[P[0]-perp[0]*len,P[1]-perp[1]*len],b=[P[0]+perp[0]*len,P[1]+perp[1]*len];return seg(a,b,muted,'stroke-dasharray="3 5" opacity=".45"');};
  svg+=wf(S1,perpIn,26)+wf(E1,perpOut,30);
  // detour highlight + wavelength ticks
  svg+=seg(C,B,violet,'stroke-width="5" opacity=".55"')+seg(B,D,violet,'stroke-width="5" opacity=".55"');
  const detPx=2*dPx*s;
  (function(){ let remain=detPx, from=C, dir=inn, left1=dPx*s;
    let pos=lamPx;
    while(pos<detPx-1){
      let p;
      if(pos<=left1){ p=[C[0]+inn[0]*pos, C[1]+inn[1]*pos]; const pp=[-inn[1],inn[0]]; svg+=seg([p[0]-pp[0]*6,p[1]-pp[1]*6],[p[0]+pp[0]*6,p[1]+pp[1]*6],'#e8e2ff','stroke-width="2"'); }
      else { const q=pos-left1; p=[B[0]+out[0]*q, B[1]+out[1]*q]; const pp=[-out[1],out[0]]; svg+=seg([p[0]-pp[0]*6,p[1]-pp[1]*6],[p[0]+pp[0]*6,p[1]+pp[1]*6],'#e8e2ff','stroke-width="2"'); }
      pos+=lamPx;
    } })();
  // sine waves along rays
  function wave(S,dir,L0,len,color){
    const perp=[-dir[1],dir[0]]; let d='';
    const steps=Math.max(24,Math.floor(len/3));
    for(let i=0;i<=steps;i++){ const u=len*i/steps, ph=2*Math.PI*(L0+u)/lamPx - q1.time;
      const x=S[0]+dir[0]*u+perp[0]*7*Math.sin(ph), y=S[1]+dir[1]*u+perp[1]*7*Math.sin(ph);
      d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1); }
    return path(d,color,2);
  }
  svg+=wave(S1,inn,0,Lin,cyan)+wave(A,out,Lin,Sout,cyan);
  svg+=wave(S2,inn,0,Lin+dPx*s,muted)+wave(B,out,Lin+dPx*s,Sout+dPx*s,gold);
  svg+=`<circle cx="${A[0]}" cy="${A[1]}" r="4" fill="${gold}"/><circle cx="${B[0]}" cy="${B[1]}" r="4" fill="${gold}"/>`;
  svg+=text(S1[0]+2,S1[1]-12,'入射X線','style="font-size:12px;fill:#a8bbce"');
  svg+=text(E1[0]-4,E1[1]-14,'検出器へ','text-anchor="end" style="font-size:12px;fill:#a8bbce"');
  const dw=TOYS.detourWaves(q1.d,q1.twoTheta);
  svg+=text(B[0]+14,B[1]+34,`紫の遠回り = ${dw.toFixed(2)} 波長（目盛り1つ = 1波長）`,'style="font-size:12px;fill:#b5a1ff"');
  el.innerHTML=svg;
 }
 function q1Detector(){
  const f=frame('q1-detector'); if(!f) return; const {el,w,h}=f;
  const dw=TOYS.detourWaves(q1.d,q1.twoTheta), sum=TOYS.sumWave(q1.d,q1.twoTheta);
  const left=86,right=w-12,span=right-left;
  const row=(y,phase,amp,color,label,width)=>{ let d=''; for(let i=0;i<=160;i++){ const u=i/160, ph=u*4*Math.PI+phase-q1.time; d+=(i?'L':'M')+(left+u*span)+' '+(y-amp*Math.sin(ph)); }
    return text(0,y+4,label,'style="font-size:12px"')+seg([left,y],[right,y],lineC)+path(d,color,width||2); };
  let svg=row(34,0,13,cyan,'上の面の波');
  svg+=row(86,-2*Math.PI*dw,13,gold,'下の面の波');
  const aligned=sum.amplitude>0.97, cancelled=sum.amplitude<0.05;
  svg+=seg([0,128],[w,128],lineC);
  svg+=row(152,0,26*sum.amplitude,aligned?gold:violet,'合計',3);
  svg+=text(right,h-4,aligned?'山と山がそろった':cancelled?'山と谷で打ち消し合った':'山がずれている','text-anchor="end" style="font-size:12px;fill:#a8bbce"');
  el.innerHTML=svg;
  $('q1-read').innerHTML=`道のり差 <strong>${dw.toFixed(2)} 波長</strong> ／ 合成波の振幅 <strong>${Math.round(sum.amplitude*100)}%</strong> ／ 検出される強さ <strong>${Math.round(sum.intensity*100)}%</strong>`;
  document.querySelector('.q1-receiver')?.classList.toggle('aligned', sum.intensity>0.94);
 }
 function q1Stack(){
  const f=frame('q1-stack'); if(!f) return; const {el,w,h}=f;
  const left=44,right=w-12,top=14,bottom=h-34, x=t=>left+(t-10)/30*(right-left), y=v=>bottom-v*(bottom-top);
  let svg='';
  for(const v of [0,.5,1]){ svg+=seg([left,y(v)],[right,y(v)],lineC)+text(left-7,y(v)+4,Math.round(v*100)+'','text-anchor="end" style="font-size:12px"'); }
  for(const t of [10,20,30,40]) svg+=text(x(t),bottom+19,String(t),'text-anchor="middle" style="font-size:12px"');
  svg+=text((left+right)/2,h-2,'検出器の角度 2θ（°）','text-anchor="middle" style="font-size:12px"');
  const pts=TOYS.stackCurve(q1.planes, q1.d, q1.jitter, 1234, 10, 40, 300);
  let d=''; pts.forEach((p,i)=>{ d+=(i?'L':'M')+x(p[0]).toFixed(1)+' '+y(Math.min(1,p[1])).toFixed(1); });
  svg+=path(d,cyan,2.2);
  const pk=TOYS.alignedAngle(q1.d,1); svg+=seg([x(pk),top],[x(pk),bottom],gold,'stroke-dasharray="3 4" opacity=".7"');
  el.innerHTML=svg;
  const mx=Math.max(...pts.map(p=>p[1]));
  $('q1-stack-note').textContent = q1.jitter<=0.001
    ? `面 ${q1.planes} 枚・乱れなし：そろう角度（金色の破線）にだけ、鋭いピークが立つ。`
    : `面 ${q1.planes} 枚・乱れ ${Math.round(q1.jitter*100)}%：いちばん高い所でも ${Math.round(mx*100)}%。そろう角度が定まらず、ピークがなだらかになる。`;
 }
 function q1Render(){ q1Scene(); q1Detector(); q1Stack();
  $('q1-d-value').textContent=q1.d.toFixed(2)+' Å';
  $('q1-ang-value').textContent=q1.twoTheta.toFixed(2)+'°';
  $('q1-jitter-value').textContent=Math.round(q1.jitter*100)+'%';
  document.querySelectorAll('[data-q1-planes]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.q1Planes===q1.planes));
 }
 if($('q1-d')){
  $('q1-d').oninput=e=>{ q1.d=+e.target.value; q1Render(); };
  $('q1-ang').oninput=e=>{ q1.twoTheta=+e.target.value; q1Scene(); q1Detector();
    $('q1-ang-value').textContent=q1.twoTheta.toFixed(2)+'°'; };
  $('q1-align').onclick=()=>{ q1.twoTheta=TOYS.nearestAligned(q1.d,q1.twoTheta); $('q1-ang').value=q1.twoTheta; q1Render(); };
  $('q1-cancel').onclick=()=>{ q1.twoTheta=TOYS.nearestCancelled(q1.d,q1.twoTheta); $('q1-ang').value=q1.twoTheta; q1Render(); };
  $('q1-jitter').oninput=e=>{ q1.jitter=+e.target.value; q1Stack(); $('q1-jitter-value').textContent=Math.round(q1.jitter*100)+'%'; };
  document.querySelectorAll('[data-q1-planes]').forEach(b=>b.onclick=()=>{ q1.planes=+b.dataset.q1Planes; q1Render(); });
  $('q1-reset').onclick=()=>{ q1={...q1,d:4,twoTheta:TOYS.alignedAngle(4,1),planes:16,jitter:0}; $('q1-d').value=4; $('q1-ang').value=q1.twoTheta; $('q1-jitter').value=0; q1Render(); };
  new ResizeObserver(()=>{ q1Scene(); q1Detector(); q1Stack(); }).observe($('q1'));
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    (function loop(){ q1.time+=0.045; q1Scene(); q1Detector(); requestAnimationFrame(loop); })();
  }
  q1Render();
 }

 /* ================= Q2: peak position (single family, ghost) ================= */
 const q2={ a:4, ghostA:4 };
 function q2Planes(){
  const f=frame('q2-planes'); if(!f) return; const {el,w,h}=f;
  const gap=q2.a*Math.min(11,(h-70)/5), cy=h*0.40, cx=w*0.5;
  let svg='';
  for(let row=-2;row<=2;row++){ const y=cy+row*gap; svg+=seg([26,y],[w-26,y],lineC);
    for(let col=-3;col<=3;col++){ const x=cx+col*gap; if(x>22&&x<w-22) svg+=`<circle cx="${x}" cy="${y}" r="5" fill="${cyan}"/>`; } }
  svg+=seg([30,cy],[30,cy+gap],gold,'stroke-width="2"')+seg([25,cy],[35,cy],gold)+seg([25,cy+gap],[35,cy+gap],gold);
  svg+=text(42,cy+gap/2+4,`d = ${q2.a.toFixed(2)} Å`,'style="fill:#ffc66b"');
  const pk=XRD.angle(q2.a,1), th=pk*Math.PI/360, dx=Math.min(w*0.33,120), dy=dx*Math.tan(th), sy=cy-gap;
  svg+=path(`M ${cx-dx} ${sy-dy} L ${cx} ${sy} L ${cx+dx} ${sy-dy}`,gold,2.5);
  svg+=text(cx-dx,sy-dy-10,'X線','style="font-size:12px"');
  svg+=text(w-20,h-8,`そろう角度 2θ = ${pk.toFixed(2)}°`,'text-anchor="end" style="font-size:12px;fill:#a8bbce"');
  el.innerHTML=svg;
 }
 function q2Plot(){
  const f=frame('q2-plot'); if(!f) return; const {el,w,h}=f;
  const range=[12,38], left=46,right=w-12,top=26,bottom=h-38, ymax=0.17;
  const xx=x=>left+(x-range[0])/(range[1]-range[0])*(right-left), yy=v=>bottom-v/ymax*(bottom-top);
  let svg=`<defs><clipPath id="q2-clip"><rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/></clipPath></defs>`;
  svg+=text(left,15,'相対強度','style="font-size:12px;fill:#a8bbce"');
  for(const v of [0,.5,1]){ const val=v*ymax; svg+=seg([left,yy(val)],[right,yy(val)],lineC)+text(left-7,yy(val)+4,val.toFixed(2),'text-anchor="end" style="font-size:12px"'); }
  for(const t of [15,20,25,30,35]) svg+=text(xx(t),bottom+19,String(t),'text-anchor="middle" style="font-size:12px"');
  svg+=text((left+right)/2,h-2,'横軸 = 検出器の角度 2θ（°）','text-anchor="middle" style="font-size:12px"');
  const curve=a=>{ const pk=XRD.reflections(a,0,60).filter(p=>p.q===1); let d='';
    for(let i=0;i<=900;i++){ const x=range[0]+(range[1]-range[0])*i/900; d+=(i?'L':'M')+xx(x).toFixed(1)+' '+yy(XRD.intensity(x,pk)).toFixed(1); } return d; };
  svg+='<g clip-path="url(#q2-clip)">';
  if(Math.abs(q2.ghostA-q2.a)>1e-9) svg+=path(curve(q2.ghostA),grey,1.6,'stroke-dasharray="5 4"');
  svg+=path(curve(q2.a),cyan,2.3);
  const pk=XRD.angle(q2.a,1); svg+=seg([xx(pk),top+8],[xx(pk),bottom],gold,'stroke-dasharray="3 4" opacity=".8"');
  svg+='</g>';
  svg+=text(Math.max(left+30,Math.min(right-30,xx(pk))),top+2,`いま ${pk.toFixed(2)}°`,'text-anchor="middle" style="fill:#ffc66b"');
  if(Math.abs(q2.ghostA-q2.a)>1e-9){ const gp=XRD.angle(q2.ghostA,1); svg+=text(Math.max(left+30,Math.min(right-30,xx(gp))),bottom-6,`前 ${gp.toFixed(2)}°`,'text-anchor="middle" style="fill:#8fa3b8;font-size:12px"'); }
  el.innerHTML=svg;
  const now=XRD.angle(q2.a,1), before=XRD.angle(q2.ghostA,1), d=now-before;
  $('q2-diff').innerHTML = Math.abs(q2.ghostA-q2.a)<1e-9
    ? `基準は a = ${q2.a.toFixed(2)} Å、ピークは ${now.toFixed(2)}°。つまみを動かすと、前の位置が灰色で残る。`
    : `a ${q2.ghostA.toFixed(2)} → ${q2.a.toFixed(2)} Å：ピークは ${before.toFixed(2)}° → ${now.toFixed(2)}°（${d>0?'高角度':'低角度'}側へ ${d>=0?'+':''}${d.toFixed(2)}°）`;
 }
 function q2Render(){ q2Planes(); q2Plot(); $('q2-a-value').textContent=q2.a.toFixed(2)+' Å'; }
 if($('q2-a')){
  $('q2-a').oninput=e=>{ q2.a=+e.target.value; q2Render(); };
  $('q2-a').onchange=e=>{ q2.ghostA=q2.a; q2Plot(); };
  $('q2-commit').onclick=()=>{ q2.ghostA=q2.a; q2Plot(); };
  // ghost semantics: while dragging, ghostA is the last committed a; on release it re-baselines.
  $('q2-reset').onclick=()=>{ q2.a=4; q2.ghostA=4; $('q2-a').value=4; q2Render(); };
  new ResizeObserver(q2Render).observe($('q2'));
  q2Render();
 }

 /* ================= Q3: many peaks — add families / higher orders / NaCl ================= */
 const q3={ mode:'cubic', count:1, higher:false };
 function q3Groups(){ return q3.mode==='nacl' ? TOYS.naclFamilies(60) : TOYS.families(4,0,60); }
 function q3Plot(){
  const f=frame('q3-plot'); if(!f) return; const {el,w,h}=f;
  const groups=q3Groups(), included=groups.slice(0,q3.count), higher=TOYS.higherOrders(groups);
  const range=[15,90], left=46,right=w-12,top=26,bottom=h-38, ymax=1.15;
  const xx=x=>left+(x-range[0])/(range[1]-range[0])*(right-left), yy=v=>bottom-v/ymax*(bottom-top);
  let svg=`<defs><clipPath id="q3-clip"><rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/></clipPath></defs>`;
  svg+=text(left,15,'相対強度','style="font-size:12px;fill:#a8bbce"');
  for(const v of [0,.5,1]){ svg+=seg([left,yy(v)],[right,yy(v)],lineC)+text(left-7,yy(v)+4,v.toFixed(1),'text-anchor="end" style="font-size:12px"'); }
  for(const t of [20,40,60,80]) svg+=text(xx(t),bottom+19,String(t),'text-anchor="middle" style="font-size:12px"');
  svg+=text((left+right)/2,h-2,'検出器の角度 2θ（°）','text-anchor="middle" style="font-size:12px"');
  const curve=list=>{ let d=''; for(let i=0;i<=1500;i++){ const x=range[0]+(range[1]-range[0])*i/1500; d+=(i?'L':'M')+xx(x).toFixed(1)+' '+yy(XRD.intensity(x,list)).toFixed(1); } return d; };
  svg+='<g clip-path="url(#q3-clip)">'+path(curve(included),cyan,2);
  if(q3.higher){ const hs=included.filter(g=>higher.includes(g)); if(hs.length) svg+=path(curve(hs),gold,3); }
  for(const g of included) svg+=`<circle cx="${xx(g.x)}" cy="${yy(XRD.intensity(g.x,[g]))}" r="3" fill="${q3.higher&&higher.includes(g)?gold:cyan}"/>`;
  svg+='</g>';
  el.innerHTML=svg;
  $('q3-count').innerHTML=`いま <strong>${q3.count} 組</strong> ／ 全 ${groups.length} 組 ・ ピーク <strong>${included.filter(g=>g.area>1e-6).length} 本</strong>`+
    (q3.higher?` ・ 金色は「同じ面の組の、高次（遠回り2波長・3波長…）」`:'');
 }
 function q3Render(){ q3Plot();
  document.querySelectorAll('[data-q3-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.q3Mode===q3.mode));
  $('q3-higher').setAttribute('aria-pressed',q3.higher);
  $('q3-add').disabled=q3.count>=q3Groups().length; $('q3-remove').disabled=q3.count<=1;
 }
 if($('q3-plot')){
  $('q3-add').onclick=()=>{ q3.count=Math.min(q3Groups().length,q3.count+1); q3Render(); };
  $('q3-remove').onclick=()=>{ q3.count=Math.max(1,q3.count-1); q3Render(); };
  $('q3-all').onclick=()=>{ q3.count=q3Groups().length; q3Render(); };
  document.querySelectorAll('[data-q3-mode]').forEach(b=>b.onclick=()=>{ q3.mode=b.dataset.q3Mode; q3.count=1; q3Render(); });
  $('q3-higher').onclick=()=>{ q3.higher=!q3.higher; q3Render(); };
  new ResizeObserver(q3Render).observe($('q3'));
  q3Render();
 }

 /* ================= Q5: more complex crystals ================= */
 const q5presets={
  base:{label:'基準：単純立方（a = 4 Å）', a:4, center:0},
  big:{label:'大きいセル（a = 8 Å）', a:8, center:0},
  bcc:{label:'中央にも原子（体心）', a:4, center:1},
  bigbcc:{label:'大きいセル＋体心', a:8, center:1}
 };
 const q5={ key:'base' };
 function q5Plot(){
  const f=frame('q5-plot'); if(!f) return; const {el,w,h}=f;
  const cur=q5presets[q5.key], base=q5presets.base;
  const groups=TOYS.families(cur.a,cur.center,60), baseGroups=TOYS.families(base.a,base.center,60);
  const range=[15,90], left=46,right=w-12,top=26,bottom=h-38, ymax=1.15;
  const xx=x=>left+(x-range[0])/(range[1]-range[0])*(right-left), yy=v=>bottom-v/ymax*(bottom-top);
  let svg=`<defs><clipPath id="q5-clip"><rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/></clipPath></defs>`;
  svg+=text(left,15,'相対強度','style="font-size:12px;fill:#a8bbce"');
  for(const v of [0,.5,1]){ svg+=seg([left,yy(v)],[right,yy(v)],lineC)+text(left-7,yy(v)+4,v.toFixed(1),'text-anchor="end" style="font-size:12px"'); }
  for(const t of [20,40,60,80]) svg+=text(xx(t),bottom+19,String(t),'text-anchor="middle" style="font-size:12px"');
  svg+=text((left+right)/2,h-2,'検出器の角度 2θ（°）','text-anchor="middle" style="font-size:12px"');
  const curve=list=>{ let d=''; for(let i=0;i<=1500;i++){ const x=range[0]+(range[1]-range[0])*i/1500; d+=(i?'L':'M')+xx(x).toFixed(1)+' '+yy(XRD.intensity(x,list)).toFixed(1); } return d; };
  svg+='<g clip-path="url(#q5-clip)">'+path(curve(baseGroups),grey,1.4,'stroke-dasharray="5 4"')+path(curve(groups),cyan,2)+'</g>';
  el.innerHTML=svg;
  const vis=groups.filter(g=>g.area>1e-6).length, visBase=baseGroups.filter(g=>g.area>1e-6).length;
  const notes={
    base:`基準のパターン。ピークは ${visBase} 本。`,
    big:`セルが2倍になると、面の組が増えてピークは ${vis} 本に。近いピークどうしが重なり合う場所も出てくる。`,
    bcc:`中央に原子が入ると、打ち消し合う面が出て、ピークは ${vis} 本に減る（基準は ${visBase} 本）。位置は動かない。`,
    bigbcc:`大きいセル＋体心。ピークは ${vis} 本。増える効果と消える効果が同時に出る。`
  };
  $('q5-read').innerHTML=`<strong>${cur.label}</strong> ・ ピーク <strong>${vis} 本</strong>（灰色の破線は基準）。${notes[q5.key]}`;
 }
 function q5Render(){ q5Plot(); document.querySelectorAll('[data-q5]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.q5===q5.key)); }
 if($('q5-plot')){
  document.querySelectorAll('[data-q5]').forEach(b=>b.onclick=()=>{ q5.key=b.dataset.q5; q5Render(); });
  new ResizeObserver(q5Render).observe($('q5'));
  q5Render();
 }
})();
