(function(root){
  'use strict';
  // Pure scroll-state machine + chart data for the FLOW part (flow3d.js).
  // No DOM, no three.js: the browser reads window.FLOW, Node tests require()
  // it directly. All physics delegates to XRD (physics.js) and TOYS (toys.js).
  const XRD = (typeof module!=='undefined' && typeof require==='function') ? require('./physics.js') : root.XRD;
  const TOYS = (typeof module!=='undefined' && typeof require==='function') ? require('./toys.js') : root.TOYS;

  const SALT_A = 5.64;        // the flow's one and only sample: salt (NaCl)
  const A_MIN = 4.95;         // lattice constant after the spacing beat
  // Beat weights are in 100vh units; flow3d.js sets the beat spacer heights
  // from these, so this table is the single source of truth for the layout.
  const BEATS = [
    { id:'device',   w:1.1 },  // a: the instrument, whole picture
    { id:'measure',  w:1.6 },  // b: arms swing, the chart grows
    { id:'dive',     w:1.8 },  // c: into the sample, down to the lattice
    { id:'wave',     w:1.8 },  // d: wavefronts vs the plane stack -> the peak
    { id:'spacing',  w:1.2 },  // e: plane spacing changes -> peaks move
    { id:'families', w:1.2 },  // f: plane families accumulate -> peaks multiply
    { id:'center',   w:1.4 }   // g: centre atoms enter -> some peaks vanish
  ];
  const totalW = BEATS.reduce((s,b)=>s+b.w,0);
  let _acc = 0;
  BEATS.forEach(b=>{ b.from = _acc/totalW; _acc += b.w; b.to = b.from + b.w/totalW; });
  const B = {}; BEATS.forEach(b=>{ B[b.id]=b; });

  const CAPTIONS = [
    '粉末XRD：粉にX線を当てて、出てくる強さを角度ごとに測る方法',
    'まず測ってみる ― 検出器が角度を掃くと、ピークが育っていく',
    '試料の中をのぞく ― 粉の粒へ潜っていく',
    '拡大すると、原子が規則正しく並んでいる',
    'ピークってそもそもなんなん？ ― 波は、面の積み重なりに当たる',
    '角度がずれると、みんなの散乱はバラバラに届いて消え合う',
    'ピークっていうのは、こういうこと ― 全員の散乱が、そろって届いた瞬間',
    'ある角度って、どう決まってるん？ ― 面同士の距離が変わると、ピークが動く',
    'なんで複数ピーク出るん？ ― 面の組がいっぱいあるから',
    'なんで高さが違うん？ 消えるやつもあるし ― 中央に原子が入ると、打ち消し合う',
    'ピークの本数・位置・高さ ― それが物質の指紋になる'
  ];
  // Caption i is shown for p in [CAP_BOUNDS[i], CAP_BOUNDS[i+1]).
  const CAP_BOUNDS = [
    0,
    B.measure.from,
    B.dive.from,
    B.dive.from + 0.50*(B.dive.to-B.dive.from),
    B.wave.from,
    B.wave.from + 0.30*(B.wave.to-B.wave.from),
    B.wave.from + 0.62*(B.wave.to-B.wave.from),
    B.spacing.from,
    B.families.from,
    B.center.from,
    B.center.from + 0.70*(B.center.to-B.center.from),
    1
  ];

  // Salt pattern from the page's own physics: cubic reflections of the
  // rock-salt lattice constant, FCC-filtered (the NaCl selection rule).
  function saltGroups(a, t){
    return XRD.reflections(a, t||0, 60)
      .filter(p=>p.x<=90)
      .filter(g=>TOYS.fccAllowed(g.labels));
  }
  function chartGroups(a, t, count){
    const g = saltGroups(a, t);
    return (count==null || count>=g.length) ? g : g.slice(0, count);
  }

  // The wave beat's plane stack: the salt lattice's own layers, spacing a/2.
  const STACK_OFFS = TOYS.planeOffsets(6, SALT_A/2, 0, 1234);
  const WAVE_DET_FROM = 24;
  const WAVE_DET_TO = 2*Math.asin(XRD.wavelength/(2*(SALT_A/2)))*180/Math.PI; // ~31.7 deg

  function clamp01(v){ return Math.max(0, Math.min(1, v)); }
  function ease(t){ t=clamp01(t); return t*t*(3-2*t); }
  function local(p, b){ return clamp01((p-b.from)/(b.to-b.from)); }

  // p in [0,1] (scroll progress through the flow) -> full scene state.
  // Every continuous channel is monotonic in p by construction.
  function state(p){
    p = clamp01(p);
    let beat = BEATS.length-1;
    for(let i=0;i<BEATS.length;i++){ if(p < BEATS[i].to || i===BEATS.length-1){ beat=i; break; } }
    const beatLocal = local(p, BEATS[beat]);

    // b: the scan (2theta 15 -> 90 across the measure beat)
    let scanX = 15;
    if(p>=B.measure.to) scanX = 90;
    else if(p>=B.measure.from) scanX = 15 + 75*local(p, B.measure);
    const scanning = p>=B.measure.from && p<B.measure.to;
    const pushIn = p<B.measure.from ? 0 : p>=B.measure.to ? 1 : local(p, B.measure);

    // c: the dive (0 at the device, 1 landed on the lattice)
    const dive = p<B.dive.from ? 0 : p>=B.dive.to ? 1 : local(p, B.dive);

    // d: wavefronts. The detector angle sweeps from off-Bragg to the angle
    // where the whole stack scatters in phase, then holds there.
    let det = null, waveAmp = 0, hl = 0;
    if(p>=B.wave.from && p<B.wave.to){
      const L = local(p, B.wave);
      det = WAVE_DET_FROM + (WAVE_DET_TO-WAVE_DET_FROM)*ease(Math.min(1, L/0.62));
      waveAmp = clamp01(Math.min(L/0.12, (1-L)/0.08));
      hl = TOYS.stackIntensity(det, STACK_OFFS);
    }

    // e: the lattice spacing shrinks; the peaks move to higher angles.
    let aNow = SALT_A;
    if(p>=B.spacing.to) aNow = A_MIN;
    else if(p>=B.spacing.from) aNow = SALT_A + (A_MIN-SALT_A)*ease(local(p, B.spacing));

    // f: plane families accumulate one by one (chart + stage lighting).
    const famAll = saltGroups(aNow, 0).length;
    let famCount = famAll;
    if(p>=B.families.from && p<B.families.to){
      const L = local(p, B.families);
      famCount = 1 + Math.min(famAll-1, Math.floor(L*famAll));
    }

    // g: centre atoms fade in; the all-odd families cancel out.
    let centerT = 0;
    if(p>=B.center.to) centerT = 1;
    else if(p>=B.center.from) centerT = ease(Math.min(1, local(p, B.center)/0.7));

    let captionIdx = CAPTIONS.length-1;
    for(let i=0;i<CAPTIONS.length;i++){ if(p < CAP_BOUNDS[i+1]){ captionIdx=i; break; } }

    return {
      p, beat, beatLocal,
      scanX, scanning, pushIn, dive,
      det, waveAmp, hl,
      a: aNow, famCount, famAll, centerT,
      captionIdx, chartShow: p>=B.measure.from
    };
  }

  const api = { BEATS, CAPTIONS, CAP_BOUNDS, SALT_A, A_MIN,
                state, saltGroups, chartGroups, STACK_OFFS,
                WAVE_DET_FROM, WAVE_DET_TO };
  if(typeof module!=='undefined') module.exports = api; else root.FLOW = api;
})(typeof globalThis!=='undefined'?globalThis:this);
