(function(root){
  'use strict';
  // Pure math for the question-chain toys. No DOM. Physics formulas delegate to XRD (physics.js).
  const XRD = (typeof module!=='undefined' && typeof require==='function') ? require('./physics.js') : root.XRD;
  const lambda = XRD.wavelength, rad = Math.PI/180;

  // --- Q1: two adjacent planes, Bragg geometry -------------------------------
  // detour (path difference) between the wave scattered by the lower plane and
  // the wave scattered by the upper plane, in units of the wavelength.
  function detourWaves(d, twoTheta){ return 2*d*Math.sin(twoTheta*rad/2)/lambda; }
  // Sum of two unit waves whose phase differs by 2*pi*detourWaves.
  // amplitude is normalised to 1 when perfectly aligned.
  function sumWave(d, twoTheta){
    const dw = detourWaves(d, twoTheta), phi = 2*Math.PI*dw;
    const re = 1+Math.cos(phi), im = Math.sin(phi);
    const amplitude = Math.hypot(re, im)/2;           // 1 at integer, 0 at half-integer
    return { detour: dw, phase: phi, amplitude, intensity: amplitude*amplitude };
  }
  // Smallest order n>=1 whose Bragg angle for spacing d falls at/above twoThetaMin,
  // and the aligned / cancelling detector angles nearest a given 2theta.
  function alignedAngle(d, n){ const s = n*lambda/(2*d); return s>=1 ? NaN : 2*Math.asin(s)/rad; }
  function nearestAligned(d, twoTheta){
    let best=NaN, bestDist=Infinity;
    for(let n=1;n<=8;n++){ const a=alignedAngle(d,n); if(!Number.isFinite(a)) continue;
      const dist=Math.abs(a-twoTheta); if(dist<bestDist){bestDist=dist;best=a;} }
    return best;
  }
  function nearestCancelled(d, twoTheta){
    let best=NaN, bestDist=Infinity;
    for(let n=0;n<=8;n++){ const a=alignedAngle(d, n+0.5); if(!Number.isFinite(a)) continue;
      const dist=Math.abs(a-twoTheta); if(dist<bestDist){bestDist=dist;best=a;} }
    return best;
  }
  // --- Q1 regularity strip: N planes, spacing jitter -------------------------
  // Deterministic pseudo-random (mulberry32) so renders are stable.
  function rng(seed){ let t=seed>>>0; return ()=>{ t+=0x6D2B79F5; let r=Math.imul(t^t>>>15,1|t); r^=r+Math.imul(r^r>>>7,61|r); return ((r^r>>>14)>>>0)/4294967296; }; }
  // Plane offsets along the stack normal: x_j = j*d + jitter_j (jitter in Angstrom).
  function planeOffsets(nPlanes, d, jitterFraction, seed){
    const rand=rng(seed==null?1234:seed), offs=[]; let x=0;
    for(let j=0;j<nPlanes;j++){ if(j>0) x += d + (rand()*2-1)*jitterFraction*d; offs.push(x); }
    return offs;
  }
  function stackIntensity(twoTheta, offsets){
    const k = 2*Math.sin(twoTheta*rad/2)/lambda; // detour per Angstrom, in waves
    let re=0, im=0;
    for(const x of offsets){ const p=2*Math.PI*k*x; re+=Math.cos(p); im+=Math.sin(p); }
    const n=offsets.length||1; return (re*re+im*im)/(n*n);
  }
  function stackCurve(nPlanes, d, jitterFraction, seed, from=10, to=40, steps=300){
    const offs=planeOffsets(nPlanes, d, jitterFraction, seed), pts=[];
    for(let i=0;i<=steps;i++){ const t=from+(to-from)*i/steps; pts.push([t, stackIntensity(t, offs)]); }
    return pts;
  }
  // --- Q3 families ------------------------------------------------------------
  // Reflection groups of the cubic model, in angle order (= widest spacing first).
  function families(a, center, size){ return XRD.reflections(a, center||0, size||60).filter(p=>p.x<=90); }
  // FCC selection rule on a group's labels: every label has all digits even or all odd.
  function fccAllowed(labels){
    return labels.some(lab=>{ const ds=lab.split('').map(Number);
      return ds.every(v=>v%2===0) || ds.every(v=>v%2===1); });
  }
  function naclFamilies(size){
    return families(5.64, 0, size||60).filter(g=>fccAllowed(g.labels));
  }
  // Higher orders of the widest-spacing family (q0): groups whose q is q0 * n^2.
  function higherOrders(groups){
    if(!groups.length) return [];
    const q0=groups[0].q;
    return groups.filter(g=>{ const r=g.q/q0, n=Math.round(Math.sqrt(r)); return n>=1 && n*n===r; });
  }
  const api={ detourWaves, sumWave, alignedAngle, nearestAligned, nearestCancelled,
              planeOffsets, stackIntensity, stackCurve, families, fccAllowed, naclFamilies, higherOrders };
  if(typeof module!=='undefined') module.exports=api; else root.TOYS=api;
})(typeof globalThis!=='undefined'?globalThis:this);
