(function(root){
  'use strict';
  const wavelength=1.5406, rad=Math.PI/180;
  function spacing(a,h,k,l=0){return a/Math.hypot(h,k,l);}
  function planePolygon(indices,m,extent=1){
    const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    if(!indices.some(v=>v!==0))return [];
    const points=[],add=p=>{if(!points.some(q=>Math.hypot(...p.map((v,i)=>v-q[i]))<1e-8))points.push(p);};
    for(let axis=0;axis<3;axis++)for(const s of [0,extent])for(const t of [0,extent]){
      const other=[0,1,2].filter(i=>i!==axis),a=[0,0,0],b=[0,0,0];a[other[0]]=b[other[0]]=s;a[other[1]]=b[other[1]]=t;b[axis]=extent;
      const da=dot(indices,a)-m,db=dot(indices,b)-m;
      if(Math.abs(da)<1e-9)add(a);if(Math.abs(db)<1e-9)add(b);
      if(da*db<0)add(a.map((v,i)=>v+(b[i]-v)*da/(da-db)));
    }
    if(points.length<3)return [];
    const center=[0,1,2].map(i=>points.reduce((s,p)=>s+p[i],0)/points.length),u=cross(indices,Math.abs(indices[0])<.9*Math.hypot(...indices)?[1,0,0]:[0,1,0]),v=cross(indices,u);
    return points.sort((a,b)=>{const aa=a.map((x,i)=>x-center[i]),bb=b.map((x,i)=>x-center[i]);return Math.atan2(dot(aa,v),dot(aa,u))-Math.atan2(dot(bb,v),dot(bb,u));});
  }
  function planeTrace(h,k,m,extent=4){
    const points=[];
    function add(x,y){if(x>=-1e-9&&x<=extent+1e-9&&y>=-1e-9&&y<=extent+1e-9&&!points.some(p=>Math.hypot(p[0]-x,p[1]-y)<1e-8))points.push([x,y]);}
    if(k){add(0,m/k);add(extent,(m-h*extent)/k);}
    if(h){add(m/h,0);add((m-k*extent)/h,extent);}
    return points.length===2?points:[];
  }
  function angle(a,q){return 2*Math.asin(wavelength*Math.sqrt(q)/(2*a))/rad;}
  function width(twoTheta,size){return Math.hypot(.12,.9*wavelength/(size*10*Math.cos(twoTheta*rad/2))/rad);}
  function factor(h,k,l,center){return ((1+center*Math.cos(Math.PI*(h+k+l)))**2+(center*Math.sin(Math.PI*(h+k+l)))**2)/(1+center)**2;}
  function reflections(a,center=0,size=60){
    const groups=new Map();
    for(let h=-6;h<=6;h++)for(let k=-6;k<=6;k++)for(let l=-6;l<=6;l++){
      const q=h*h+k*k+l*l;if(!q||wavelength*Math.sqrt(q)/(2*a)>=1)continue;
      const x=angle(a,q);if(x<15||x>100)continue;
      if(!groups.has(q))groups.set(q,{q,x,area:0,multiplicity:0,labels:new Set()});
      const p=groups.get(q);p.area+=factor(h,k,l,center)/48;p.multiplicity++;
      p.labels.add([Math.abs(h),Math.abs(k),Math.abs(l)].sort((a,b)=>b-a).join(''));
    }
    return [...groups.values()].sort((a,b)=>a.x-b.x).map(p=>({...p,labels:[...p.labels],fwhm:width(p.x,size)}));
  }
  function intensity(x,peaks){return peaks.reduce((v,p)=>v+p.area*.15/p.fwhm*Math.exp(-4*Math.log(2)*((x-p.x)/p.fwhm)**2),0);}
  function coherence(a,twoTheta,n=8){const delta=2*a*Math.sin(twoTheta*rad/2)/wavelength;let re=0,im=0;for(let i=0;i<n;i++){re+=Math.cos(2*Math.PI*i*delta);im+=Math.sin(2*Math.PI*i*delta);}return {delta,value:(re*re+im*im)/(n*n)};}
  function scatterArray(twoTheta,count=2,d=4){
    // Fixed incident direction (1,0), fixed atom chain normal to Bragg planes.
    // The detector alone moves; phase uses the full incident + outgoing path difference.
    const tilt=angle(d,1)*rad/2,phi=twoTheta*rad,normal=[-Math.sin(tilt),Math.cos(tilt)],outgoing=[Math.cos(phi),Math.sin(phi)];
    const atoms=Array.from({length:count},(_,i)=>normal.map(v=>v*d*i));
    const phases=atoms.map(([x,y])=>2*Math.PI*((1-outgoing[0])*x-outgoing[1]*y)/wavelength);
    const re=phases.reduce((s,p)=>s+Math.cos(p),0),im=phases.reduce((s,p)=>s+Math.sin(p),0),amplitude=Math.hypot(re,im);
    return {atoms,phases,re,im,amplitude,intensity:amplitude**2,count,relative:amplitude**2/count**2,cycles:d*(Math.sin(tilt)+Math.sin(phi-tilt))/wavelength};
  }
  const api={wavelength,spacing,planeTrace,planePolygon,angle,width,factor,reflections,intensity,coherence,scatterArray};
  if(typeof module!=='undefined')module.exports=api;else root.XRD=api;
})(typeof globalThis!=='undefined'?globalThis:this);
