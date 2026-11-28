(() => {
 'use strict';
 const $=id=>document.getElementById(id),gold='#ffc66b',cyan='#62e6e0',presets=['100','101','110','111','200','210'];
 let model={a:4,center:0,size:60,name:'100',orbit:32},plotMap=null,ghostA=4,committedA=4;
 const hkl=()=>model.name.split('').map(Number),qOf=name=>name.split('').reduce((s,n)=>s+n*n,0);
 function planeHasAtoms(n,level,extent,center){
  for(let x=0;x<=extent;x++)for(let y=0;y<=extent;y++)for(let z=0;z<=extent;z++)if(n[0]*x+n[1]*y+n[2]*z===level)return true;
  if(center>0)for(let x=0;x<extent;x++)for(let y=0;y<extent;y++)for(let z=0;z<extent;z++)if(n[0]*(2*x+1)+n[1]*(2*y+1)+n[2]*(2*z+1)===2*level)return true;
  return false;
 }
 const angleLabel=angle=>Number.isFinite(angle)?angle.toFixed(2)+'°':'この波長では回折しない';
 const text=(x,y,s,extra='')=>`<text x="${x}" y="${y}" ${extra}>${s}</text>`;
 const line=(a,b,color,extra='')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" ${extra}/>`;
 function frame(id){const el=$(id),w=el.clientWidth,h=el.clientHeight;el.setAttribute('viewBox',`0 0 ${w} ${h}`);return {el,w,h};}
 function cube(id,bonus=false){
  const {el,w,h}=frame(id);if(!w||!h)return;
  const n=hkl(),q=qOf(model.name),extent=bonus?1:2,yaw=model.orbit*Math.PI/180,pitch=.42,scale=Math.min(w/(extent*2.4),h/(extent*2.45))*(bonus?1:model.a/4);
  const project=p=>{const [x,y,z]=p.map(v=>v-extent/2),u=x*Math.cos(yaw)-y*Math.sin(yaw),v=x*Math.sin(yaw)+y*Math.cos(yaw);return [w/2+scale*u,h*.48+scale*(v*Math.sin(pitch)-z*Math.cos(pitch)),v*Math.cos(pitch)+z*Math.sin(pitch)];};
  const items=[];
  for(let axis=0;axis<3;axis++)for(const b of [0,extent])for(const c of [0,extent]){const other=[0,1,2].filter(i=>i!==axis),p=[0,0,0],r=[0,0,0];p[other[0]]=r[other[0]]=b;p[other[1]]=r[other[1]]=c;r[axis]=extent;const a=project(p),d=project(r);items.push({depth:(a[2]+d[2])/2,svg:line(a,d,'#657b92','stroke-width="1.3"')});}
  const m=n.reduce((s,v)=>s+v,0);
  let emptyDrawn=false;
  for(const level of bonus?[1]:[m,m+1]){const points=XRD.planePolygon(n,level,extent).map(project);if(points.length){const empty=!planeHasAtoms(n,level,extent,model.center);if(empty)emptyDrawn=true;items.push({depth:points.reduce((s,p)=>s+p[2],0)/points.length,svg:`<polygon points="${points.map(p=>p.slice(0,2).join(',')).join(' ')}" fill="${empty?'#8fb4d9':gold}" fill-opacity="${empty?.07:(bonus?.26:.17)}" stroke="${empty?'#8fb4d9':gold}" stroke-width="1.6"${empty?' stroke-dasharray="5 4"':' filter="url(#origin-plane-glow)"'}/>`});}}
  for(let x=0;x<=extent;x++)for(let y=0;y<=extent;y++)for(let z=0;z<=extent;z++){const p=project([x,y,z]);items.push({depth:p[2]+.01,svg:`<circle cx="${p[0]}" cy="${p[1]}" r="${bonus?5:3.6}" fill="${cyan}" stroke="#111f30" stroke-width="1"/>`});}
  if(!bonus&&model.center>0)for(let x=.5;x<extent;x++)for(let y=.5;y<extent;y++)for(let z=.5;z<extent;z++){const p=project([x,y,z]);items.push({depth:p[2]+.01,svg:`<circle cx="${p[0]}" cy="${p[1]}" r="4.3" fill="${gold}" opacity="${model.center}"/>`});}
  let svg=(bonus?'':'<defs><filter id="origin-plane-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>')+items.sort((a,b)=>a.depth-b.depth).map(v=>v.svg).join('');
  if(!bonus){const a=project([1,1,1]),b=project(n.map(v=>1+v/q));svg+=line(a,b,gold,'stroke-width="4"');for(const p of [a,b])svg+=`<circle cx="${p[0]}" cy="${p[1]}" r="3.6" fill="${gold}"/>`;svg+=text(w/2,20,`(${model.name}) の平行な2枚`,'text-anchor="middle"');if(emptyDrawn)svg+=text(w/2,38,'破線は原子の載らない面（間隔を示す補助面）','text-anchor="middle" style="font-size:11px;fill:#a8bbce"');svg+=text(w/2,h-6,`面間隔 d = ${XRD.spacing(model.a,...n).toFixed(2)} Å`,'text-anchor="middle"');}
  for(let axis=0;axis<3;axis++){const end=[0,0,0];end[axis]=extent*1.2;const a=project([0,0,0]),b=project(end),color=[cyan,'#b5a1ff',gold][axis];svg+=line(a,b,color,'stroke-width="2"');svg+=text(b[0],b[1]-8,['x','y','z'][axis],'text-anchor="middle"');if(bonus&&n[axis]){end[axis]=1/n[axis];const p=project(end);svg+=`<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="${color}" stroke="#111f30" stroke-width="1.5"/>`;}}
  el.innerHTML=svg;
 }
 function select(name){model.name=name;render();}
 function chart(peaks){
  const {el,w,h}=frame('origin-plot'),left=46,right=w-14,top=32,bottom=h-42,xx=x=>left+(x-15)/75*(right-left),yy=y=>bottom-y/1.3*(bottom-top),selected=peaks.find(p=>p.q===qOf(model.name));
  plotMap={left,right,peaks};let svg=`<defs><clipPath id="origin-clip"><rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/></clipPath><filter id="peak-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  svg+=text(left,16,'相対強度（尺度は固定）','style="font-size:12px;fill:#a8bbce"');
  for(const v of [0,.5,1]){svg+=line([left,yy(v)],[right,yy(v)],'#2c3e52');svg+=text(left-8,yy(v)+4,v.toFixed(1),'text-anchor="end" style="font-size:12px"');}
  for(const x of [20,40,60,80])svg+=text(xx(x),bottom+20,String(x),'text-anchor="middle" style="font-size:12px"');svg+=text((left+right)/2,h-5,'散乱角 2θ（°）','text-anchor="middle"');
  function curve(list,color,width){let d='';for(let i=0;i<=2100;i++){const x=15+75*i/2100;d+=(i?'L':'M')+xx(x).toFixed(2)+' '+yy(XRD.intensity(x,list)).toFixed(2);}return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}"/>`;}
  const ghostPeaks=ghostA!==model.a?XRD.reflections(ghostA,model.center,model.size).filter(p=>p.x<=90):null;
  svg+='<g clip-path="url(#origin-clip)">'+(ghostPeaks?curve(ghostPeaks,'#8fa3b8',1.3).replace('/>',' stroke-dasharray="5 4"/>'):'')+curve(peaks,cyan,1.8)+(selected?curve([selected],gold,3).replace('/>',' filter="url(#peak-glow)"/>'):'');
  for(const p of peaks){const active=p===selected;svg+=`<circle cx="${xx(p.x)}" cy="${yy(XRD.intensity(p.x,[p]))}" r="${active?5:3}" fill="${active?gold:cyan}" opacity="${p.area<1e-10?.4:1}"/>`;}
  if(selected)svg+=line([xx(selected.x),top+17],[xx(selected.x),bottom],gold,'stroke-dasharray="4 5" opacity=".7"');svg+='</g>';
  if(selected)svg+=text(Math.max(left+22,Math.min(right-24,xx(selected.x))),top+12,`(${model.name})`,'text-anchor="middle"');el.innerHTML=svg;
 }
 function bonus(){
  if(!$('indices-bonus').open)return;cube('indices-cube',true);
  const n=hkl();$('indices-readout').innerHTML=`<table class="indices-table"><thead><tr><th>軸</th><th>面が軸を切る位置</th><th>逆数 → 番号</th></tr></thead><tbody>${n.map((v,i)=>`<tr><th>${['x','y','z'][i]}</th><td>${v===0?'平行（∞）':v===1?'一辺の位置（1）':`一辺の 1/${v}`}</td><td>${v===0?'1/∞ → 0':v===1?'1/1 → 1':`1 ÷ (1/${v}) → ${v}`}</td></tr>`).join('')}</tbody></table><p>3つを並べると <b>(${model.name})</b>。${model.name==='101'?'x と z は1の位置で切り、y 軸とは平行。':model.name==='100'?'x は1の位置で切り、y・z 軸とは平行。':model.name==='200'?'x を半分の位置で切る面。同じ向きの (100) より面間隔は半分。なお、この代表面そのものには原子は載っていない。(100) の原子層のちょうど中間を通る、間隔を示すための補助面。':''}</p>`;
 }
 function render(){
  if($('origin').hidden)return;
  if($('origin-diff')){const now=XRD.angle(model.a,1),before=XRD.angle(ghostA,1),dd=now-before;
   $('origin-diff').textContent=Math.abs(ghostA-model.a)<1e-9?`a = ${model.a.toFixed(2)} Å が基準。a を変えて離すと、前のパターンが灰色で残る。`:`a ${ghostA.toFixed(2)} → ${model.a.toFixed(2)} Å：全部のピークが${dd>0?'高角度':'低角度'}側へ（最初のピーク ${before.toFixed(2)}° → ${now.toFixed(2)}°）。面間隔が狭い → そろう角度は大きい。`;}
  const n=hkl(),q=qOf(model.name),angle=XRD.angle(model.a,q),peaks=XRD.reflections(model.a,model.center,model.size).filter(p=>p.x<=90),f=XRD.factor(...n,model.center);
  const names=[...new Set([...presets,...peaks.flatMap(p=>p.labels)])].filter(name=>XRD.angle(model.a,qOf(name))<=90).sort((a,b)=>qOf(a)-qOf(b)||a.localeCompare(b));
  if(!names.includes(model.name))names.push(model.name);
  $('reflection-select').innerHTML=names.map(name=>`<option value="${name}" ${name===model.name?'selected':''}>(${name}) · ${angleLabel(XRD.angle(model.a,qOf(name)))}${qOf(name)===2?' · (101)/(110)は同角度':''}</option>`).join('');
  document.querySelectorAll('[data-plane]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.plane===model.name));
  $('origin-readout').innerHTML=`<strong>(${model.name}) → ${angleLabel(angle)}</strong><br>${!Number.isFinite(angle)?'面間隔が波長の半分より狭く、この波長ではBragg条件を満たす角度がありません。':angle>90?'このピークは表示範囲の右側（90°より大きい角度）。':f<1e-8?'この面の波は打ち消し合うため、ピークが消える。目印は元の位置。':q===2?'立方晶では (101) と (110) は向きが違っても同じ間隔。ピークは同じ位置に重なる。':'金色のピークは、左の面と同じ間隔をもつ面の寄与をまとめたもの。'}`;
  $('origin-chain').innerHTML=`<span>選んだ面 <b>(${model.name})</b></span><span>面の間隔 <b>${XRD.spacing(model.a,...n).toFixed(2)} Å</b></span><span>波がそろう角度 2θ <b>${angleLabel(angle)}</b></span><span>ピークの幅 <b>${Number.isFinite(angle)?XRD.width(angle,model.size).toFixed(2)+'°':'—'}</b></span>`;
  $('combined-a').value=model.a;$('combined-a-value').textContent=model.a.toFixed(2)+' Å';$('combined-center').value=model.center;$('combined-center-value').textContent=Math.round(model.center*100)+'%';$('combined-size').value=model.size;$('combined-size-value').textContent=model.size+' nm';$('orbit').value=model.orbit;
  $('origin-structure').textContent=model.center===0?'単純立方・2 × 2 × 2 単位格子':model.center===1?'体心立方・2 × 2 × 2 単位格子':'中央の原子の入り具合を変化中';
  cube('origin-lattice');chart(peaks);bonus();
  if(window.Stage3D)Stage3D.origin({a:model.a,center:model.center,name:model.name});
 }
 for(const id of ['plane-controls','indices-presets'])$(id).innerHTML=presets.map(name=>`<button type="button" data-plane="${name}" aria-pressed="${name===model.name}">(${name})</button>`).join('');
 document.querySelectorAll('[data-plane]').forEach(b=>b.onclick=()=>select(b.dataset.plane));
 $('reflection-select').onchange=e=>select(e.target.value);
 $('origin-plot').onclick=e=>{if(!plotMap)return;const bounds=e.currentTarget.getBoundingClientRect(),x=e.clientX-bounds.left;if(x<plotMap.left||x>plotMap.right)return;const angle=15+75*(x-plotMap.left)/(plotMap.right-plotMap.left),p=plotMap.peaks.reduce((a,b)=>Math.abs(b.x-angle)<Math.abs(a.x-angle)?b:a);select(p.q===qOf(model.name)?model.name:p.q===2?'101':p.labels[0]);};
 for(const [id,key] of [['combined-a','a'],['combined-center','center'],['combined-size','size'],['orbit','orbit']])$(id).oninput=e=>{model[key]=+e.target.value;render();};
 $('indices-bonus').ontoggle=bonus;
 window.hideOrigin=()=>{};
 window.showOrigin=(options={})=>{if(Number.isFinite(options.a))model={...model,a:options.a,center:0,size:60,name:'100'};render();$('origin').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};
 if($('origin-tab'))$('origin-tab').onclick=()=>window.showOrigin();
 $('origin-reset').onclick=()=>{model={a:4,center:0,size:60,name:'100',orbit:32};ghostA=4;committedA=4;render();};
 if($('combined-a'))$('combined-a').addEventListener('change',()=>{ghostA=model.a;committedA=model.a;render();});
 window.addEventListener('stage3d-ready',()=>render());
 new ResizeObserver(render).observe($('origin'));render();
})();
