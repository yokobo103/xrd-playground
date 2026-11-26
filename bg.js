(()=>{const cv=document.createElement('canvas');cv.id='bg-fx';cv.setAttribute('aria-hidden','true');
cv.style.cssText='position:fixed;inset:0;z-index:-1;pointer-events:none';
document.body.prepend(cv);const ctx=cv.getContext('2d');
let timer=0;
function gauss(){return (Math.random()+Math.random()+Math.random())/1.5-1;}
function draw(){
 const dpr=Math.min(1.5,devicePixelRatio||1),W=innerWidth,H=innerHeight;
 cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
 // all-over faint grain
 for(let i=0;i<1100;i++){const a=.012+Math.random()*.03;ctx.fillStyle=`rgba(190,225,255,${a})`;ctx.fillRect(Math.random()*W,Math.random()*H,1,1);}
 // ring cluster, partly offscreen at top-right
 const cx=W-70,cy=30,scale=Math.min(1.15,Math.max(.7,W/1100));
 const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,360*scale);
 glow.addColorStop(0,'rgba(98,230,224,.10)');glow.addColorStop(.6,'rgba(98,230,224,.04)');glow.addColorStop(1,'rgba(98,230,224,0)');
 ctx.fillStyle=glow;ctx.fillRect(cx-380*scale,cy-380*scale,760*scale,760*scale);
 const rings=[{r:64,a:.85},{r:118,a:.6},{r:178,a:.42},{r:246,a:.28}];
 for(const ring of rings){const R=ring.r*scale,phase=Math.random()*6.28,phase2=Math.random()*6.28;
  const n=Math.floor(R*16);
  for(let i=0;i<n;i++){const ang=Math.random()*Math.PI*2;
   const az=.5+.3*Math.sin(3*ang+phase)+.2*Math.sin(7*ang+phase2);
   const rr=R+gauss()*3.4,al=ring.a*az*(.18+.82*Math.random());
   if(al<.02)continue;
   const x=cx+Math.cos(ang)*rr,y=cy+Math.sin(ang)*rr,s=.6+Math.random()*1.4;
   ctx.fillStyle=Math.random()<.22?`rgba(98,230,224,${al})`:`rgba(200,242,255,${al})`;
   ctx.beginPath();ctx.arc(x,y,s,0,6.29);ctx.fill();}}
 // beam stop shadow at ring center
 ctx.fillStyle='rgba(3,7,12,.55)';ctx.beginPath();ctx.arc(cx,cy,17*scale,0,6.29);ctx.fill();
 ctx.strokeStyle='rgba(160,210,240,.14)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,17*scale,0,6.29);ctx.stroke();
}
draw();addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(draw,220);});
})();
