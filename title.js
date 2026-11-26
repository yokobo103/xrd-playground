(()=>{const cv=document.getElementById('title-peaks');if(!cv)return;const ctx=cv.getContext('2d');
const peaks=[{x:.16,h:.55},{x:.30,h:.9},{x:.47,h:.65},{x:.63,h:1},{x:.79,h:.5},{x:.90,h:.75}];
let det=.30,active=false,raf=0,t0=performance.now();
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function size(){const r=cv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);cv.width=Math.max(1,r.width*d);cv.height=Math.max(1,r.height*d);ctx.setTransform(d,0,0,d,0,0);}
function draw(now){const w=cv.clientWidth,h=cv.clientHeight,base=h-14;
 if(!active&&!reduce)det=.5+.38*Math.sin((now-t0)/2600);
 ctx.clearRect(0,0,w,h);
 ctx.strokeStyle='rgba(168,187,206,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,base);ctx.lineTo(w,base);ctx.stroke();
 for(const p of peaks){const px=p.x*w,dist=Math.abs(det-p.x),boost=Math.max(0,1-dist/.09),hh=p.h*(h-30)*(.55+.65*boost);
  ctx.beginPath();for(let i=0;i<=60;i++){const gx=px-26+52*i/60,y=base-hh*Math.exp(-((gx-px)*(gx-px))/72);i?ctx.lineTo(gx,y):ctx.moveTo(gx,y);}
  ctx.strokeStyle=boost>.55?'#ffc66b':'rgba(98,230,224,.75)';ctx.lineWidth=boost>.55?2.4:1.6;ctx.shadowBlur=boost>.55?14:0;ctx.shadowColor='rgba(255,198,107,.8)';ctx.stroke();ctx.shadowBlur=0;}
 const dx=det*w;ctx.strokeStyle='rgba(255,198,107,.65)';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(dx,8);ctx.lineTo(dx,base);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle='#ffc66b';ctx.beginPath();ctx.moveTo(dx-5,0);ctx.lineTo(dx+5,0);ctx.lineTo(dx,7);ctx.closePath();ctx.fill();
 if(!active&&!reduce)raf=requestAnimationFrame(draw);}
function pos(e){const r=cv.getBoundingClientRect();det=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));}
cv.addEventListener('pointerenter',e=>{active=true;cancelAnimationFrame(raf);pos(e);draw(performance.now());});
cv.addEventListener('pointermove',e=>{pos(e);draw(performance.now());});
cv.addEventListener('pointerleave',()=>{active=false;t0=performance.now();draw(performance.now());});
addEventListener('resize',()=>{size();draw(performance.now());});
size();draw(performance.now());})();
