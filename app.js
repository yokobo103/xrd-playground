'use strict';
const $=id=>document.getElementById(id), C={cyan:'#62e6e0',gold:'#ffc66b',muted:'#a8bbce',line:'#2c3e52',violet:'#b5a1ff'};
let state={stage:0,a:4,center:0,size:60,detector:XRD.angle(4,1),focus:1}, answers=[null,null,null];
const lessons=[
 {eyebrow:'実験 01 / まず1組の面だけ',question:'面の間隔を広げると、波がそろう角度はどう変わる？',title:'遠回りが増える。\nだから、浅い角度でそろう。',choices:['左へ動く','右へ動く','位置は変わらない'],correct:0,feedback:'間隔が広いほど、同じ波長ぶんの道のり差になる角度は小さくなります。ピークは左へ。',next:'総合図で、ほかの面も見よう →'},
 {eyebrow:'実験 03 / 中央にも原子を置く',question:'すき間の中央に同じ原子を置くと、何が起きる？',title:'原子を足したのに、\n波が打ち消し合う。',choices:['全部のピークが高くなる','一部のピークが消える','全部のピークが右へ動く'],correct:1,feedback:'(100)では中央の原子の波が半周期ずれ、打ち消し合います。(110)では同じ位相なので残ります。',next:'次は「サイズ」を変える →'},
 {eyebrow:'実験 04 / 並びが続く長さを変える',question:'規則正しい並びが短くなると、ピークはどうなる？',title:'短い並びほど、\n角度の選り好みが弱くなる。',choices:['ピークが細くなる','中心が右へずれる','ピークが広がる'],correct:2,feedback:'長い並びでは少しの角度ずれが大きな波のずれになります。短い並びは多少ずれても強め合い、広いピークになります。',next:'最後の1問へ →'}
];
const text=(x,y,s,extra='')=>`<text x="${x}" y="${y}" ${extra}>${s}</text>`;
const line=(x,y,x2,y2,col=C.line,extra='')=>`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${col}" ${extra}/>`;
const path=(d,col,width=2,extra='')=>`<path d="${d}" fill="none" stroke="${col}" stroke-width="${width}" ${extra}/>`;
function surface(id){const el=$(id),w=el.clientWidth||400,h=el.clientHeight;el.setAttribute('viewBox',`0 0 ${w} ${h}`);return {el,w,h};}
function slider(id,label,min,max,step,value,low,high,unit){return `<label for="${id}">${label}<span class="value" id="${id}-value">${value}${unit}</span></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><div class="ends"><span>${low}</span><span>${high}</span></div>`;}
function enter(stage){
 if(window.hideWaves)window.hideWaves();
 if(window.hideOrigin)window.hideOrigin();
 state={stage,a:4,center:0,size:60,detector:XRD.angle(4,1),focus:stage===2?2:1};
 const l=lessons[stage];$('challenge').hidden=true;document.querySelector('.experiment').hidden=false;
 document.querySelectorAll('[data-stage]').forEach(b=>{const on=+b.dataset.stage===stage;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});
 $('eyebrow').textContent=l.eyebrow;$('question').textContent=l.question;$('why-title').innerHTML=l.title.replace('\n','<br>');$('next').textContent=l.next;
 $('choices').innerHTML=l.choices.map((s,i)=>`<button data-choice="${i}" aria-pressed="${answers[stage]===i}">${s}</button>`).join('');
 $('feedback').textContent=answers[stage]===null?'予想を選んでも、そのままつまみを動かしてもOK。':l.feedback;
 if(stage===0){$('controls').innerHTML=slider('spacing','格子の一辺 a',3.2,5,.01,4,'狭い','広い',' Å')+`<div class="button-row"><button id="expand">広げてみる</button><button id="match">検出角をピークに合わせる</button></div>`;}
 if(stage===1){$('controls').innerHTML=slider('center','中央の原子の入り具合',0,1,.01,0,'角だけ（単純立方）','中央にも（体心立方）','')+`<div class="button-row"><button id="add-center">中央にも原子を置く</button><button data-focus="1">(100)を見る</button><button data-focus="2">(110)を見る</button></div>`;}
 if(stage===2){$('controls').innerHTML=slider('size','結晶子サイズ L',5,100,1,60,'短い並び','長い並び',' nm')+`<div class="button-row"><button id="small">小さくしてみる</button><button id="large">大きくしてみる</button></div>`;}
 bind();render();
}
function bind(){
 const bindings=[['spacing','a'],['center','center'],['size','size']];bindings.forEach(([id,key])=>{if($(id))$(id).oninput=e=>{cancelAnimationFrame(animation);state[key]=+e.target.value;render();};});
 if($('expand'))$('expand').onclick=()=>animate('a',4.8);
 if($('match'))$('match').onclick=()=>animate('detector',XRD.angle(state.a,1));
 if($('add-center'))$('add-center').onclick=()=>animate('center',state.center>.99?0:1);
 if($('small'))$('small').onclick=()=>animate('size',5);
 if($('large'))$('large').onclick=()=>animate('size',100);
 document.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>{state.focus=+b.dataset.focus;render();});
 document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const i=+b.dataset.choice,l=lessons[state.stage];answers[state.stage]=i;document.querySelectorAll('[data-choice]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('feedback').textContent=(i===l.correct?'その予想で合っています。':'動かして、予想と比べてみよう。')+' '+l.feedback;});
}
let animation=0;
function animate(key,value){cancelAnimationFrame(animation);const start=state[key],stage=state.stage,time=performance.now();if(matchMedia('(prefers-reduced-motion: reduce)').matches){state[key]=value;render();return;}function tick(now){if(state.stage!==stage)return;const t=Math.min(1,(now-time)/750);state[key]=start+(value-start)*(t*t*(3-2*t));render();if(t<1)animation=requestAnimationFrame(tick);}animation=requestAnimationFrame(tick);}
function crystal(){
 const {el,w,h}=surface('crystal');let s='';
 if(state.stage===0){
  const gap=state.a*Math.min(9,(h-48)/20),cy=h*.46,cx=w*.51;
  for(let row=-2;row<=2;row++){const y=cy+row*gap;s+=line(28,y,w-28,y,C.line);for(let col=-3;col<=3;col++){const x=cx+col*gap;if(x>23&&x<w-23)s+=`<circle cx="${x}" cy="${y}" r="5" fill="${C.cyan}"/>`;}}
  s+=line(28,cy,28,cy+gap,C.gold,'stroke-width="2"');s+=line(23,cy,33,cy,C.gold)+line(23,cy+gap,33,cy+gap,C.gold);s+=text(38,cy+gap*.5+4,`d = ${state.a.toFixed(2)} Å`,'style="fill:'+C.gold+'"');
  const th=state.detector*Math.PI/360,dx=Math.min(w*.36,120),dy=dx*Math.tan(th),sy=cy-gap;
  s+=path(`M ${cx-dx} ${sy-dy} L ${cx} ${sy} L ${cx+dx} ${sy-dy}`,C.gold,2.5);s+=text(cx-dx,sy-dy-12,'X線','font-size="12"');s+=text(w-25,h-8,'(100)の面：この断面では横の列','text-anchor="end" style="fill:'+C.muted+';font-size:12px"');
 }else if(state.stage===1){
  const scale=Math.min(w*.28,83),cx=w*.5,cy=h*.55;const p=([x,y,z])=>[cx+(x-y)*scale,cy+(x+y)*scale*.34-z*scale];
  for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++){const a=p([x,y,z]);[[1-x,y,z],[x,1-y,z],[x,y,1-z]].forEach(v=>{const b=p(v);s+=line(...a,...b,C.line,'stroke-width="1.5"');});}
  for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++){const a=p([x,y,z]);s+=`<circle cx="${a[0]}" cy="${a[1]}" r="8" fill="${C.cyan}"/>`;}
  const m=p([.5,.5,.5]);s+=`<circle cx="${m[0]}" cy="${m[1]}" r="10" fill="${C.gold}" opacity="${state.center}"/><circle cx="${m[0]}" cy="${m[1]}" r="13" fill="none" stroke="${C.gold}" stroke-dasharray="3 4" opacity=".6"/>`;
  s+=text(w*.5,h-10,'a = 4.00 Å のまま、中央の原子だけを変える','text-anchor="middle" style="font-size:12px;fill:'+C.muted+'"');
 }else{
  const n=Math.round(4+(state.size-5)/95*11),gap=Math.min(12,(w-70)/n),left=(w-(n-1)*gap)/2,top=(h-(n-1)*gap)/2-10;
  for(let x=0;x<n;x++)for(let y=0;y<n;y++)s+=`<circle cx="${left+x*gap}" cy="${top+y*gap}" r="2.4" fill="${C.cyan}"/>`;
  const y=top+(n-1)*gap+17;s+=line(left,y,left+(n-1)*gap,y,C.gold,'stroke-width="2"');s+=text(w*.5,h-5,`並びが続く長さ L = ${Math.round(state.size)} nm`,'text-anchor="middle"');
 }
 el.innerHTML=s;
}
function chart(){
 const {el,w,h}=surface('plot'),zoom=state.stage===2,single=state.stage===0,focusAngle=XRD.angle(state.a,state.focus),range=zoom?[XRD.angle(4,2)-2.6,XRD.angle(4,2)+2.6]:single?[15,35]:[15,90],left=48,right=w-13,top=32,bottom=h-42;
 const current=XRD.reflections(state.a,state.center,state.size).filter(p=>!single||p.q===1),reference=XRD.reflections(4,0,60).filter(p=>!single||p.q===1);
 const ymax=zoom?.4:single?.17:1.15,xx=x=>left+(x-range[0])/(range[1]-range[0])*(right-left),yy=y=>bottom-y/ymax*(bottom-top);
 let s=`<defs><clipPath id="plotclip"><rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/></clipPath></defs>`;
 s+=text(left,16,'相対強度（同じ尺度）','style="font-size:12px;fill:'+C.muted+'"');
 for(let i=0;i<=3;i++){const val=i*ymax/3,y=yy(val);s+=line(left,y,right,y,C.line);s+=text(left-8,y+4,val.toFixed(single?2:1),'text-anchor="end" style="font-size:12px;fill:'+C.muted+'"');}
 const ticks=zoom?[30,32,34]:single?[15,20,25,30,35]:w<370?[20,40,60,80]:[20,30,40,50,60,70,80,90];ticks.filter(v=>v>=range[0]&&v<=range[1]).forEach(v=>{s+=text(xx(v),bottom+20,v+'','text-anchor="middle" style="font-size:12px"');});
 s+=text((left+right)/2,h-5,'散乱角 2θ（°）  → 大きい角度','text-anchor="middle" style="font-size:12px"');
 function curve(peaks){let d='';const n=Math.max(1600,Math.round(w*4));for(let i=0;i<=n;i++){const x=range[0]+i/n*(range[1]-range[0]);d+=(i?'L':'M')+xx(x).toFixed(2)+' '+yy(XRD.intensity(x,peaks)).toFixed(2);}return d;}
 s+='<g clip-path="url(#plotclip)">'+path(curve(reference),C.muted,1.5,'stroke-dasharray="5 4"')+path(curve(current),C.cyan,2.3);
 if(state.stage===0)s+=line(xx(state.detector),top,xx(state.detector),bottom,C.gold,'stroke-dasharray="3 5"');
 const fp=current.find(p=>p.q===state.focus);if(fp){s+=line(xx(fp.x),top+18,xx(fp.x),bottom,C.cyan,'opacity=".35"');}
 s+='</g>';
 if(fp)s+=text(Math.max(left+17,Math.min(right-22,xx(fp.x))),top+14,`(${state.focus===1?'100':'110'})`,'text-anchor="middle"');
 el.innerHTML=s;
 if(state.stage===0){const d=focusAngle-XRD.angle(4,1);$('readout').innerHTML=`この面のピーク <strong>${focusAngle.toFixed(2)}°</strong> <span>（はじめから ${d>=0?'+':''}${d.toFixed(2)}°）</span><br>まず(100)の寄与1本だけ。次の総合図で全ピークを見る。`;}
 if(state.stage===1){const f=XRD.factor(state.focus===1?1:1,state.focus===1?0:1,0,state.center);$('readout').innerHTML=`(${state.focus===1?'100':'110'}) の強度係数 <strong>${Math.round(f*100)}%</strong> / 元の格子 = 100%<br>${state.focus===1?'中央が同じ原子で埋まると、このピークは消える。':'こちらは波がそろう。中央を埋めてもピークは残る。'}`;}
 if(state.stage===2)$('readout').innerHTML=`ピークの幅 <strong>${XRD.width(focusAngle,state.size).toFixed(2)}°</strong> / 中心は <strong>${focusAngle.toFixed(2)}°</strong> のまま<br>横軸を拡大中。広がると山は低くなる（面積は一定）。`;
}
function mechanism(){
 const {el,w,h}=surface('mechanism'),start=95,end=w-12,span=end-start;let s='';
 function wave(y,phase,amp,col,label){s+=text(0,y+4,label,'style="font-size:12px"');let d='';for(let i=0;i<=180;i++){const x=start+i/180*span,v=y-Math.sin(i/180*Math.PI*7+phase)*amp;d+=(i?'L':'M')+x+' '+v;}s+=path(d,col,2);}
 if(state.stage===0){
  const c=XRD.coherence(state.a,state.detector);wave(26,0,12,C.cyan,'上の面の波');wave(66,2*Math.PI*c.delta,12,C.gold,'隣の面の波');
  s+=text(0,112,`道のり差 ${c.delta.toFixed(2)} 波長`,'style="font-size:12px"');
  const bx=Math.min(w*.52,220),bw=Math.max(45,w-bx-60);s+=`<rect x="${bx}" y="96" width="${bw}" height="12" rx="6" fill="${C.line}"/><rect x="${bx}" y="96" width="${bw*c.value}" height="12" rx="6" fill="${C.cyan}"/>`+text(w-2,108,`${Math.round(c.value*100)}%`,'text-anchor="end" style="font-size:12px"');
  $('why-text').textContent=`検出角は 2θ = ${state.detector.toFixed(2)}°。${Math.abs(c.delta-1)<.005?'道のりの差がちょうど1波長。山と山が重なり、強く届きます。':'格子を動かすと、同じ検出角では波の山がずれます。「検出角をピークに合わせる」で、そろう角度を探そう。'} 棒は8枚の面から来る波の一致度。`;
 }else if(state.stage===1){
  const odd=state.focus===1,phase=odd?Math.PI:0;wave(20,0,12,C.cyan,'角の原子');wave(59,phase,12*state.center,C.gold,'中央の原子');wave(101,0,12*(1+(odd?-1:1)*state.center),C.violet,'足した波');
  $('why-text').textContent=odd?'(100)では中央の原子が半周期ずれた波を返す。山と谷が重なり、同じ強さなら合計はゼロ。原子が消えたのではなく、届く波が打ち消された。':'(110)では中央の原子の波も1周期ぶんずれて、山どうしが重なる。この面のピークは残る。上のグラフは、原子の総散乱能をそろえて比較しています。';
 }else{
  s+=text(0,18,'角度が、ピークから少しずれたとき','style="font-size:12px"');
  [8,24].forEach((n,j)=>{const y=49+j*48;s+=text(0,y+4,j?'長い並び':'短い並び','style="font-size:12px"');for(let i=0;i<n;i++){const x=start+(i+.5)/24*span,phase=i*.23;s+=line(x,y,x+Math.sin(phase)*12,y-Math.cos(phase)*12,j?C.muted:C.cyan,'stroke-width="2"');}});
  $('why-text').textContent='矢印は各面から来る波の位相。短い並びは少し角度がずれても向きが近い。長い並びではずれが積み重なって打ち消し合い、「ぴったりの角度」だけが強く残る。';
 }
 el.innerHTML=s;
}
function render(){
 if(document.querySelector('.experiment').hidden)return;
 if($('spacing')){$('spacing').value=state.a;$('spacing-value').textContent=state.a.toFixed(2)+' Å';}
 if($('center')){$('center').value=state.center;$('center-value').textContent=Math.round(state.center*100)+'%';$('add-center').textContent=state.center>.99?'中央の原子を取り除く':'中央にも原子を置く';}
 if($('size')){$('size').value=state.size;$('size-value').textContent=Math.round(state.size)+' nm';}
 document.querySelectorAll('[data-focus]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.focus===state.focus));
 $('model-caption').textContent=['単純立方格子・断面の模式図','単位格子1個の模式図','規則正しい並びの模式図'][state.stage];
 $('chart-caption').textContent=state.stage===2?'(110)ピークを拡大':state.stage===0?'1組の面 (100) だけ表示':'粉末XRDのモデル';
 $('takeaway').textContent=['つまみを右へ。ピークは左へ。次に波をそろえてみよう。','(100)と(110)を切り替えて、足した波を比べよう。','変わるのは間隔ではなく、並びが続く長さ。'][state.stage];
 crystal();chart();mechanism();
}
document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{cancelAnimationFrame(animation);enter(+b.dataset.stage);});
$('reset').onclick=()=>{cancelAnimationFrame(animation);answers[state.stage]=null;enter(state.stage);};
$('next').onclick=()=>{cancelAnimationFrame(animation);if(state.stage===0)window.showOrigin({a:state.a});else if(state.stage<2)enter(state.stage+1);else{document.querySelector('.experiment').hidden=true;$('challenge').hidden=false;$('challenge').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}};
$('back').onclick=()=>enter(0);
document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{$('final-feedback').textContent=+b.dataset.answer===0?'正解。間隔が狭くなると、波がそろう角度は大きくなる。位置＝間隔、消える条件＝並び、幅＝並びの長さ。この3つを区別できた！':+b.dataset.answer===1?'小さくなると主に「幅」が変わる。今回は「位置」が右へ動いたので、間隔が狭くなったと考えます。実験1に戻って確かめよう。':'中央の原子は一部のピークを打ち消す。全部の位置が右へ動く場合は、格子の間隔が狭くなったと考えます。';});
enter(0);new ResizeObserver(()=>render()).observe(document.querySelector('.experiment .workspace'));
if(document.modelContext?.registerTool){
 try{Promise.resolve(document.modelContext.registerTool({name:'configure_xrd_experiment',title:'XRD実験の条件を変える',description:'実験を選び、画面と同じ結晶条件を設定して計算結果を返す。',inputSchema:{type:'object',properties:{stage:{type:'integer',minimum:0,maximum:2},value:{type:'number'}},required:['stage','value'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||!Number.isInteger(input.stage)||input.stage<0||input.stage>2||!Number.isFinite(input.value))throw Error('Invalid experiment');const ranges=[[3.2,5],[0,1],[5,100]],r=ranges[input.stage];if(input.value<r[0]||input.value>r[1])throw Error('Value outside experiment range');cancelAnimationFrame(animation);enter(input.stage);state[['a','center','size'][input.stage]]=input.value;render();return {stage:state.stage,a:state.a,center:state.center,size:state.size,firstPeakDegrees:XRD.angle(state.a,1),width110:XRD.width(XRD.angle(state.a,2),state.size)};}})).catch(()=>{});}catch{}
}
