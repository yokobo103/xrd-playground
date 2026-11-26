(() => {
 'use strict';
 const $=id=>document.getElementById(id),cyan='#62e6e0',gold='#ffc66b',muted='#a8bbce',peak=XRD.angle(4,1),tilt=peak*Math.PI/360;
 const offset=(tilt+Math.asin(1.5*XRD.wavelength/4-Math.sin(tilt)))*180/Math.PI;
 let angle=offset,count=2,time=0,raf=0,mode='',announcement=0,chartMap=null;
 const text=(x,y,s,extra='')=>`<text x="${x}" y="${y}" ${extra}>${s}</text>`;
 const line=(a,b,color,extra='')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" ${extra}/>`;
 const path=(d,color,width=2,extra='')=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;
 function frame(id){const el=$(id),w=el.clientWidth,h=el.clientHeight;el.setAttribute('viewBox',`0 0 ${w} ${h}`);return {el,w,h};}
 function scene(data){
  const {el,w,h}=frame('wave-scene'),cx=w*.29,cy=h*.56,r=Math.min(w*.59,h*.73),phi=angle*Math.PI/180,detector=[cx+r*Math.cos(phi),cy-r*Math.sin(phi)];
  const scale=count===1?15:Math.min(15,125/(4*(count-1))),center=data.atoms[Math.floor((count-1)/2)],mean=data.atoms.reduce((s,p)=>[s[0]+p[0]/count,s[1]+p[1]/count],[0,0]);
  const atoms=data.atoms.map(p=>[cx+(p[0]-mean[0])*scale,cy-(p[1]-mean[1])*scale]);
  let svg=`<defs><marker id="wave-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="${muted}"/></marker></defs>`;
  // Faint spokes convey scattering in many directions; selected paths share a detector.
  atoms.forEach((p,i)=>{const color=i%2?gold:cyan;for(let j=0;j<10;j++){const a=2*Math.PI*j/10;svg+=line([p[0]+9*Math.cos(a),p[1]+9*Math.sin(a)],[p[0]+23*Math.cos(a),p[1]+23*Math.sin(a)],color,'opacity=".15"');}svg+=line([10,p[1]],p,muted,'opacity=".35" marker-end="url(#wave-arrow)"');svg+=line(p,detector,color,`opacity="${count===16?.22:.75}" stroke-width="1.5"`);});
  let arc='';for(let a=10;a<=34;a+=.25){const t=a*Math.PI/180;arc+=(a===10?'M':'L')+(cx+r*Math.cos(t))+' '+(cy-r*Math.sin(t));}svg+=path(arc,muted,1.5,'stroke-dasharray="4 4"');
  svg+=line([cx,cy],[cx+r,cy],muted,'stroke-dasharray="3 5" opacity=".5"');
  atoms.forEach((p,i)=>{svg+=`<circle cx="${p[0]}" cy="${p[1]}" r="${count===16?3.7:6}" fill="${i%2?gold:cyan}"/>`;if(count<=2)svg+=text(p[0]-13,p[1]-10,String(i+1),'text-anchor="end"');});
  svg+=`<rect x="${detector[0]-10}" y="${detector[1]-13}" width="20" height="26" rx="4" fill="${gold}"/>`;
  svg+=text(Math.min(w-4,detector[0]+13),Math.max(25,detector[1]-23),'検出器','text-anchor="end"');
  svg+=text(10,26,'入射X線 →','style="fill:#a8bbce;font-size:12px"');svg+=text(w-5,h-8,`${count}個 / 間隔4 Åで固定`,'text-anchor="end" style="font-size:12px"');
  svg+=text(cx+r*.62,cy+20,`散乱角 ${angle.toFixed(2)}°`,'text-anchor="middle" style="font-size:12px"');
  el.innerHTML=svg;
 }
 function arrivals(data){
  const el=$('arrival-waves');el.style.height=(count===16?396:238)+'px';const {w,h}=frame('arrival-waves'),left=66,right=w-14,span=right-left,step=count===16?17:48,amp=count===16?6:16,first=33,sumY=h-61;
  let svg=text(left,14,'山と山？ それとも、山と谷？','style="font-size:12px;fill:#a8bbce"');
  const sample=phase=>{let d='';for(let i=0;i<=140;i++){const t=i/140*3*Math.PI+time;d+=(i?'L':'M')+(left+i/140*span)+' '+(phase.y-phase.value(t));}return d;};
  for(let j=0;j<count;j++){const y=first+j*step,color=j%2?gold:cyan;svg+=text(0,y+4,`原子${j+1}`,'style="font-size:12px"');svg+=line([left,y],[right,y],'#2c3e52');svg+=path(sample({y,value:t=>amp*Math.cos(t+data.phases[j])}),color,count===16?1.4:2);}
  svg+=line([0,sumY-39],[w,sumY-39],'#2c3e52');svg+=text(0,sumY+4,`合計÷${count}`,'style="font-size:12px"');svg+=line([left,sumY],[right,sumY],'#2c3e52');
  svg+=path(sample({y:sumY,value:t=>30*data.phases.reduce((s,p)=>s+Math.cos(t+p),0)/count}),gold,3);
  svg+=text(right,h-8,'時間 →（各行は同じ時刻）','text-anchor="end" style="font-size:12px;fill:#a8bbce"');
  el.innerHTML=svg;
 }
 function pattern(){
  const {el,w,h}=frame('wave-pattern'),left=45,right=w-15,top=18,bottom=h-38,x=a=>left+(a-10)/24*(right-left),y=v=>bottom-v*(bottom-top);
  let svg='';for(const v of [0,.5,1]){svg+=line([left,y(v)],[right,y(v)],'#2c3e52');svg+=text(left-7,y(v)+4,Math.round(v*100)+'','text-anchor="end" style="font-size:12px"');}
  for(const a of [10,16,22,28,34])svg+=text(x(a),bottom+19,String(a),'text-anchor="middle" style="font-size:12px"');svg+=text((left+right)/2,h-2,'検出器の散乱角（°）','text-anchor="middle" style="font-size:12px"');
  const curve=n=>{let d='';for(let i=0;i<=720;i++){const a=10+24*i/720;d+=(i?'L':'M')+x(a)+' '+y(XRD.scatterArray(a,n).relative);}return d;};
  if(count===16)svg+=path(curve(2),muted,1.5,'stroke-dasharray="5 5"');svg+=path(curve(count),cyan,2.3);
  const current=XRD.scatterArray(angle,count);svg+=line([x(angle),top],[x(angle),bottom],gold,'stroke-dasharray="3 4"');svg+=`<circle cx="${x(angle)}" cy="${y(current.relative)}" r="5" fill="${gold}"/>`;
  svg+=text(left,11,'強さ（%）','style="font-size:12px;fill:#a8bbce"');el.innerHTML=svg;chartMap={left,right};
 }
 function observe(data){
  const message=count===1?'原子1個なら、打ち消す相手がいない。このモデルでは方向を変えても強さは同じ。':data.relative>.97?`${count}個から届く波の山がそろった。合計の波が大きくなる。この角度がピーク。`:data.relative<.01?`${count}個から波は届いている。でも、足すと打ち消し合ってほぼゼロになる。`:count===16?'隣どうしの小さなずれが16個ぶん積み重なる。角度が少し違うだけで、合計の波が弱くなる。':'2つの波の山がずれている。角度を動かすと、足した波の大きさが変わる。';
  clearTimeout(announcement);announcement=setTimeout(()=>{$('wave-observation').textContent=message;},mode==='scan'?180:70);
 }
 function render(){
  if($('waves-intro').hidden)return;const data=XRD.scatterArray(angle,count);
  $('wave-angle').value=angle;$('wave-angle-value').textContent=angle.toFixed(2)+'°';$('wave-strength').textContent=Math.round(data.relative*100)+'%';$('wave-fill').style.width=data.relative*100+'%';document.querySelector('.wave-receiver').classList.toggle('aligned',data.relative>.97);
  document.querySelectorAll('[data-atoms]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.atoms===count));$('wave-chart-note').textContent=count===16?'実線：16個 / 点線：2個（最大を100%にそろえて比較）':`${count}個の原子の波を足した結果`;
  scene(data);arrivals(data);pattern();observe(data);
 }
 function stop(){cancelAnimationFrame(raf);mode='';$('wave-scan').textContent='自動で角度を動かす';$('wave-play').textContent='波をゆっくり再生（4秒）';}
 function animate(kind){
  if(mode===kind){stop();render();return;}stop();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){if(kind==='scan')angle=peak;else time+=Math.PI/4;render();return;}
  mode=kind;const start=performance.now(),duration=kind==='scan'?8500:4000,t0=time;
  if(kind==='scan')$('wave-scan').textContent='走査を止める';else $('wave-play').textContent='波の再生を止める';
  function tick(now){if($('waves-intro').hidden){stop();return;}const t=Math.min(1,(now-start)/duration);if(kind==='scan'){angle=10+24*t;render();}else{time=t0+4*Math.PI*t;arrivals(XRD.scatterArray(angle,count));}if(t<1)raf=requestAnimationFrame(tick);else{stop();render();}}raf=requestAnimationFrame(tick);
 }
 $('wave-angle').oninput=e=>{stop();angle=+e.target.value;render();};$('wave-align').onclick=()=>{stop();angle=peak;render();};$('wave-offset').onclick=()=>{stop();angle=offset;render();};
 document.querySelectorAll('[data-atoms]').forEach(b=>b.onclick=()=>{stop();count=+b.dataset.atoms;render();});$('wave-scan').onclick=()=>animate('scan');$('wave-play').onclick=()=>animate('play');
 $('wave-pattern').onclick=e=>{if(!chartMap)return;const x=e.clientX-e.currentTarget.getBoundingClientRect().left;if(x<chartMap.left||x>chartMap.right)return;stop();angle=10+24*(x-chartMap.left)/(chartMap.right-chartMap.left);render();};
 window.hideWaves=()=>{stop();clearTimeout(announcement);$('waves-intro').hidden=true;$('waves-tab').classList.remove('active');$('waves-tab').setAttribute('aria-pressed','false');};
 window.showWaves=()=>{cancelAnimationFrame(animation);if(window.hideOrigin)window.hideOrigin();document.querySelector('.experiment').hidden=true;$('challenge').hidden=true;$('waves-intro').hidden=false;document.querySelectorAll('[data-stage]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});$('waves-tab').classList.add('active');$('waves-tab').setAttribute('aria-pressed','true');render();};
 $('waves-tab').onclick=window.showWaves;$('waves-reset').onclick=()=>{stop();angle=offset;count=2;time=0;render();};$('waves-next').onclick=()=>enter(0);
 new ResizeObserver(render).observe($('waves-intro'));window.showWaves();
})();
