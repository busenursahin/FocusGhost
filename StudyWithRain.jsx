import { useState, useEffect, useRef, useCallback } from "react";

// ── ASMR Sound Engine (Web Audio API) ─────────────────────────────────────────
// Each sound is procedurally generated — no external files needed.

function createAudioCtx() {
  return new (window.AudioContext || window.webkitAudioContext)();
}

// 🌧️ Rain — white noise filtered to sound like rain
function createRainNodes(ctx) {
  const bufSize = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;

  const hipass = ctx.createBiquadFilter();
  hipass.type = "highpass"; hipass.frequency.value = 800;

  const lopass = ctx.createBiquadFilter();
  lopass.type = "lowpass"; lopass.frequency.value = 4000;

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;

  // Occasional drip variations
  const panner = ctx.createStereoPanner();
  panner.pan.value = 0;

  src.connect(hipass); hipass.connect(lopass); lopass.connect(gainNode); gainNode.connect(panner); panner.connect(ctx.destination);
  src.start();
  return { gainNode, src };
}

// ☕ Coffee Shop — low hum + murmur (brown noise + resonances)
function createCoffeeNodes(ctx) {
  const bufSize = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bufSize; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 12;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;

  const filter1 = ctx.createBiquadFilter();
  filter1.type = "bandpass"; filter1.frequency.value = 350; filter1.Q.value = 0.8;

  const filter2 = ctx.createBiquadFilter();
  filter2.type = "bandpass"; filter2.frequency.value = 1200; filter2.Q.value = 1.2;

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;

  // Add subtle crockery clink — random click
  const clickBuf = ctx.createBuffer(1, 2048, ctx.sampleRate);
  const cd = clickBuf.getChannelData(0);
  for (let i = 0; i < 2048; i++) cd[i] = Math.exp(-i/80) * (Math.random()*2-1);

  src.connect(filter1); filter1.connect(gainNode);
  src.connect(filter2); filter2.connect(gainNode);
  gainNode.connect(ctx.destination);
  src.start();
  return { gainNode, src };
}

// 🔥 Fireplace — crackling (low rumble + random pops)
function createFireNodes(ctx) {
  const bufSize = ctx.sampleRate * 5;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bufSize; i++) {
    const white = Math.random() * 2 - 1;
    // Random crackle pops
    const pop = Math.random() < 0.0003 ? (Math.random() * 2 - 1) * 8 : 0;
    last = (last + 0.04 * white) / 1.04;
    data[i] = last * 6 + pop * Math.exp(-Math.random() * 20);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;

  const lopass = ctx.createBiquadFilter();
  lopass.type = "lowpass"; lopass.frequency.value = 1800;

  const peaking = ctx.createBiquadFilter();
  peaking.type = "peaking"; peaking.frequency.value = 200; peaking.gain.value = 8;

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;

  src.connect(lopass); lopass.connect(peaking); peaking.connect(gainNode); gainNode.connect(ctx.destination);
  src.start();
  return { gainNode, src };
}

// 🌊 Ocean — slow swooshing waves
function createOceanNodes(ctx) {
  const bufSize = ctx.sampleRate * 6;
  const buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;

  const lopass = ctx.createBiquadFilter();
  lopass.type = "lowpass"; lopass.frequency.value = 600;

  // LFO for wave swell
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.12;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.35;
  lfo.connect(lfoGain);

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  lfoGain.connect(gainNode.gain);

  src.connect(lopass); lopass.connect(gainNode); gainNode.connect(ctx.destination);
  src.start(); lfo.start();
  return { gainNode, src, lfo };
}

const SOUNDS = {
  rain:   { emoji:"🌧️", label:"Yağmur",   create: createRainNodes,   vol: 0.35 },
  coffee: { emoji:"☕",  label:"Kahve",     create: createCoffeeNodes, vol: 0.45 },
  fire:   { emoji:"🔥",  label:"Şömine",    create: createFireNodes,   vol: 0.40 },
  ocean:  { emoji:"🌊",  label:"Okyanus",   create: createOceanNodes,  vol: 0.38 },
};

// Hook to manage all sounds
function useAsmr() {
  const ctxRef    = useRef(null);
  const nodesRef  = useRef({});
  const [active, setActive]   = useState(null);   // currently playing sound key
  const [volume, setVolume]   = useState(0.7);    // master volume 0–1
  const [loading, setLoading] = useState(false);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = createAudioCtx();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const stopAll = useCallback(() => {
    Object.values(nodesRef.current).forEach(n => {
      if (n.gainNode) { n.gainNode.gain.setTargetAtTime(0, ctxRef.current?.currentTime||0, 0.4); }
      if (n.lfo) { try { n.lfo.stop(ctxRef.current?.currentTime + 0.5); } catch(e){} }
    });
    nodesRef.current = {};
  }, []);

  const play = useCallback((key) => {
    const ctx = ensureCtx();
    setLoading(true);
    // fade out current
    if (active && nodesRef.current[active]) {
      const cur = nodesRef.current[active];
      cur.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      setTimeout(() => { try { cur.src.stop(); } catch(e){} }, 1500);
    }
    if (active === key) {
      // toggle off
      setActive(null);
      setLoading(false);
      return;
    }
    const sound = SOUNDS[key];
    const nodes = sound.create(ctx);
    const targetVol = sound.vol * volume;
    nodes.gainNode.gain.setValueAtTime(0, ctx.currentTime);
    nodes.gainNode.gain.setTargetAtTime(targetVol, ctx.currentTime + 0.1, 0.8);
    nodesRef.current[key] = nodes;
    setActive(key);
    setLoading(false);
  }, [active, volume, ensureCtx]);

  const adjustVolume = useCallback((v) => {
    setVolume(v);
    if (active && nodesRef.current[active]) {
      const sound = SOUNDS[active];
      nodesRef.current[active].gainNode.gain.setTargetAtTime(sound.vol * v, ctxRef.current?.currentTime||0, 0.2);
    }
  }, [active]);

  // Auto-start rain on focus begin, auto-stop on pause
  const autoPlay = useCallback((shouldPlay, preferredKey = "rain") => {
    if (shouldPlay && !active) play(preferredKey);
    else if (!shouldPlay && active) {
      if (nodesRef.current[active]) {
        const ctx = ctxRef.current;
        nodesRef.current[active].gainNode.gain.setTargetAtTime(0, ctx?.currentTime||0, 0.8);
        const src = nodesRef.current[active].src;
        const lfo = nodesRef.current[active].lfo;
        setTimeout(() => { try { src.stop(); } catch(e){} if(lfo){try{lfo.stop();}catch(e){}} }, 2000);
      }
      nodesRef.current = {};
      setActive(null);
    }
  }, [active, play]);

  useEffect(() => () => stopAll(), []);

  return { active, volume, loading, play, adjustVolume, autoPlay };
}

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: "#1a1f2e", bgDeep: "#12151f", bgOuter: "#07080f",
    glass: "rgba(255,255,255,0.06)", glassBright: "rgba(255,255,255,0.10)",
    border: "rgba(255,255,255,0.08)", borderLight: "rgba(255,255,255,0.14)",
    text: "#e8e4f0", textMuted: "rgba(232,228,240,0.45)", textSoft: "rgba(232,228,240,0.7)",
    lavender: "#c4b5f7", mint: "#86efce", peach: "#fdb99b",
    red: "#ff8080", yellow: "#f7d070",
    navBg: "rgba(26,31,46,0.97)",
    inputBg: "rgba(255,255,255,0.06)",
    cardBg: "#1e2338",
    sceneBg: "linear-gradient(180deg,#0c1020 0%,#131828 45%,#1a1f2e 100%)",
    sceneBuilding: "#0d1020", sceneBuildingFace: "#111624",
    sceneWindow: "rgba(255,215,120,0.55)",
    sceneFrame: "rgba(170,150,120,0.4)",
    sceneCurtain: "rgba(120,85,100,0.5)",
    focusBg: "#0c1020",
    sunMoon: "#f0e8c8", sunMoonShadow: "#0c1020",
    starColor: "rgba(255,255,255,0.75)",
    moonVisible: true,
  },
  light: {
    bg: "#f5f0e8", bgDeep: "#ede8df", bgOuter: "#d4cfc6",
    glass: "rgba(0,0,0,0.04)", glassBright: "rgba(0,0,0,0.07)",
    border: "rgba(0,0,0,0.08)", borderLight: "rgba(0,0,0,0.14)",
    text: "#2d2840", textMuted: "rgba(45,40,64,0.45)", textSoft: "rgba(45,40,64,0.65)",
    lavender: "#7c5cbf", mint: "#2a9d6f", peach: "#d4713a",
    red: "#d94f4f", yellow: "#c49a0a",
    navBg: "rgba(245,240,232,0.97)",
    inputBg: "rgba(0,0,0,0.04)",
    cardBg: "#ede8df",
    sceneBg: "linear-gradient(180deg,#87ceeb 0%,#b8e0f7 50%,#ddf0f8 100%)",
    sceneBuilding: "#c8b8a2", sceneBuildingFace: "#d4c4ac",
    sceneWindow: "rgba(255,240,180,0.9)",
    sceneFrame: "rgba(160,120,80,0.5)",
    sceneCurtain: "rgba(180,140,100,0.4)",
    focusBg: "#87ceeb",
    sunMoon: "#FFD700", sunMoonShadow: "transparent",
    starColor: "rgba(255,255,255,0.0)",
    moonVisible: false,
  },
};

// C is always the current theme — set dynamically in App, components receive it as prop
// For backward compat at module level (overridden in App context via ThemeCtx)
const C = THEMES.dark;

// Theme context so all components can read current theme without prop drilling
const ThemeCtx = { current: THEMES.dark };
function useT() { return ThemeCtx.current; }

const ACTIVITY_MODES = {
  read:  { label:"Okuma",     emoji:"📚",
    dark:  { color:"#c4b5f7", glow:"rgba(196,181,247,0.28)" },
    light: { color:"#7c5cbf", glow:"rgba(124,92,191,0.22)" },
    duration:25*60 },
  work:  { label:"Çalışma",   emoji:"✏️",
    dark:  { color:"#86efce", glow:"rgba(134,239,206,0.25)" },
    light: { color:"#2a9d6f", glow:"rgba(42,157,111,0.22)" },
    duration:25*60 },
  clean: { label:"Düzenleme", emoji:"🧹",
    dark:  { color:"#fdb99b", glow:"rgba(253,185,155,0.25)" },
    light: { color:"#d4713a", glow:"rgba(212,113,58,0.22)" },
    duration:20*60 },
};

function getModeColor(mode, theme) {
  return ACTIVITY_MODES[mode][theme] || ACTIVITY_MODES[mode].dark;
}

const PROJECT_COLORS = ["#c4b5f7","#86efce","#fdb99b","#ff8080","#f7d070","#80c8ff","#ff9de2","#a8e6cf"];

const DEFAULT_PROJECTS = [
  { id:"p1", name:"Kişisel", color:"#c4b5f7", totalSec:0 },
  { id:"p2", name:"İş",      color:"#86efce", totalSec:0 },
  { id:"p3", name:"Ders",    color:"#fdb99b", totalSec:0 },
];

function fmt(s) {
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}
function fmtDuration(sec) {
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  if (h > 0) return `${h}s ${m}dk`;
  if (m > 0) return `${m}dk ${s > 0 ? s+"s" : ""}`.trim();
  return `${sec}s`;
}
function fmtTime(date) {
  return `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
}
function fmtDate(date) {
  const d = new Date(date);
  const today = new Date(); const yest = new Date(); yest.setDate(yest.getDate()-1);
  if (d.toDateString()===today.toDateString()) return "Bugün";
  if (d.toDateString()===yest.toDateString()) return "Dün";
  return d.toLocaleDateString("tr-TR", {day:"numeric",month:"short"});
}

// ── Rain ───────────────────────────────────────────────────────────────────────
function Rain() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width = c.offsetWidth, H = c.height = c.offsetHeight;
    const drops = Array.from({length:80}, () => ({ x:Math.random()*W, y:Math.random()*H, speed:1.8+Math.random()*2.5, len:10+Math.random()*18, op:0.07+Math.random()*0.2 }));
    let raf;
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      drops.forEach(d => {
        ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-1,d.y+d.len);
        ctx.strokeStyle=`rgba(160,185,255,${d.op})`; ctx.lineWidth=1; ctx.stroke();
        d.y += d.speed; if (d.y>H) { d.y=-d.len; d.x=Math.random()*W; }
      });
      raf = requestAnimationFrame(draw);
    };
    draw(); return ()=>cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene({ big, T }) {
  const isLight = T.moonVisible === false;
  return (
    <div style={{position:"absolute",inset:0,background:T.sceneBg,overflow:"hidden"}}>
      {/* Sun (light) or Moon (dark) */}
      {isLight ? (
        /* Sun with rays */
        <>
          <div style={{position:"absolute",top:big?55:14,left:big?55:28,width:big?50:30,height:big?50:30,borderRadius:"50%",background:"#FFD700",boxShadow:`0 0 ${big?40:20}px rgba(255,215,0,0.7), 0 0 ${big?80:40}px rgba(255,200,0,0.3)`,transition:"all 0.8s"}}/>
          {/* Clouds */}
          {(big?[[30,30],[55,18],[70,40],[15,50]]:[[20,22],[55,14],[78,28]]).map(([cx,cy],i)=>(
            <div key={i} style={{position:"absolute",left:`${cx}%`,top:cy,display:"flex",gap:-4}}>
              <div style={{width:big?36:22,height:big?18:11,borderRadius:"50%",background:"rgba(255,255,255,0.85)"}}/>
              <div style={{width:big?28:18,height:big?14:9,borderRadius:"50%",background:"rgba(255,255,255,0.9)",marginLeft:-8,marginTop:3}}/>
              <div style={{width:big?20:14,height:big?12:8,borderRadius:"50%",background:"rgba(255,255,255,0.8)",marginLeft:-6,marginTop:5}}/>
            </div>
          ))}
        </>
      ) : (
        /* Moon */
        <>
          <div style={{position:"absolute",top:big?70:20,right:big?55:28,width:big?44:26,height:big?44:26,borderRadius:"50%",background:"#f0e8c8",boxShadow:"0 0 24px rgba(240,232,200,0.45)",transition:"all 0.8s"}}/>
          <div style={{position:"absolute",top:big?70:20,right:big?44:20,width:big?44:26,height:big?44:26,borderRadius:"50%",background:"#0c1020",transition:"all 0.8s"}}/>
          {/* Stars */}
          {[[12,14],[28,8],[55,18],[78,6],[88,22],[40,28],[65,12],[20,32]].map(([x,y],i)=>(<div key={i} style={{position:"absolute",left:`${x}%`,top:y,width:2,height:2,borderRadius:"50%",background:"rgba(255,255,255,0.75)",boxShadow:"0 0 4px rgba(255,255,255,0.5)"}}/>))}
        </>
      )}
      {/* Buildings / trees */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:big?90:65,background:T.sceneBuilding}}>
        {isLight ? (
          /* Daytime: lighter buildings + trees */
          <>
            {[[0,38,22],[20,52,18],[38,34,20],[58,48,24],[78,32,16]].map(([l,h,w],i)=>(
              <div key={i} style={{position:"absolute",bottom:0,left:`${l}%`,width:w,height:h,background:T.sceneBuildingFace}}>
                {[[3,8],[3,20],[12,8],[12,20]].map(([wx,wy],j)=>(<div key={j} style={{position:"absolute",left:wx,top:wy,width:4,height:4,background:T.sceneWindow,borderRadius:1}}/>))}
              </div>
            ))}
            {/* Trees */}
            {[[8,0],[44,0],[68,0],[88,0]].map(([l,b],i)=>(
              <div key={i} style={{position:"absolute",bottom:b,left:`${l}%`}}>
                <div style={{width:0,height:0,borderLeft:"8px solid transparent",borderRight:"8px solid transparent",borderBottom:`${16+i*4}px solid #5a8a3a`,marginLeft:-8}}/>
                <div style={{width:6,height:8,background:"#7a5c3a",margin:"0 auto"}}/>
              </div>
            ))}
          </>
        ) : (
          /* Nighttime buildings */
          <>
            {[[0,38,22],[20,52,18],[38,34,20],[58,48,24],[78,32,16]].map(([l,h,w],i)=>(
              <div key={i} style={{position:"absolute",bottom:0,left:`${l}%`,width:w,height:h,background:T.sceneBuildingFace}}>
                {[[3,8],[3,20],[12,8],[12,20]].map(([wx,wy],j)=>(<div key={j} style={{position:"absolute",left:wx,top:wy,width:4,height:4,background:T.sceneWindow,borderRadius:1}}/>))}
              </div>
            ))}
          </>
        )}
      </div>
      {/* Window frame */}
      {!big && <>
        <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:7,background:T.sceneFrame,transform:"translateX(-50%)"}}/>
        <div style={{position:"absolute",top:"52%",left:0,right:0,height:7,background:T.sceneFrame}}/>
        <div style={{position:"absolute",inset:0,border:`7px solid ${T.sceneFrame}`,pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:0,left:0,bottom:0,width:18,background:`linear-gradient(90deg,${T.sceneCurtain},transparent)`}}/>
        <div style={{position:"absolute",top:0,right:0,bottom:0,width:18,background:`linear-gradient(-90deg,${T.sceneCurtain},transparent)`}}/>
      </>}
      {/* Rain (dark only) / Birds (light only) */}
      {!isLight ? <Rain/> : (
        // Tiny animated birds in light mode
        <div style={{position:"absolute",top:big?40:10,left:"30%",display:"flex",gap:12,opacity:0.4}}>
          {[0,1,2].map(i=>(<div key={i} style={{fontSize:10,animation:`float ${1.2+i*0.3}s ease infinite alternate`,animationDelay:`${i*0.4}s`}}>🐦</div>))}
        </div>
      )}
    </div>
  );
}

// ── Ghost Base ─────────────────────────────────────────────────────────────────
function GhostBase({ bobY=0, blink, running, children }) {
  return (<>
    <path d={`M12 65 Q18 ${72+bobY} 24 65 Q30 ${75+bobY} 36 65 Q42 ${72+bobY} 48 65 Q54 ${75+bobY} 60 65 Q66 ${72+bobY} 68 65 L68 42 Q68 10 40 10 Q12 10 12 42 Z`} fill="rgba(240,236,255,0.93)"/>
    {blink ? <><line x1="29" y1="40" x2="37" y2="40" stroke="#6b5fa0" strokeWidth="2.5" strokeLinecap="round"/><line x1="43" y1="40" x2="51" y2="40" stroke="#6b5fa0" strokeWidth="2.5" strokeLinecap="round"/></> : <><ellipse cx="33" cy="40" rx="4" ry={running?5:4} fill="#6b5fa0"/><ellipse cx="47" cy="40" rx="4" ry={running?5:4} fill="#6b5fa0"/><circle cx="35" cy="38" r="1.5" fill="white" opacity="0.8"/><circle cx="49" cy="38" r="1.5" fill="white" opacity="0.8"/></>}
    <ellipse cx="24" cy="48" rx="5" ry="3" fill="rgba(255,140,140,0.28)"/>
    <ellipse cx="56" cy="48" rx="5" ry="3" fill="rgba(255,140,140,0.28)"/>
    {running ? <path d="M34 54 Q40 60 46 54" fill="none" stroke="#6b5fa0" strokeWidth="2" strokeLinecap="round"/> : <path d="M35 53 Q40 57 45 53" fill="none" stroke="#6b5fa0" strokeWidth="2" strokeLinecap="round"/>}
    {[{x:6,y:18},{x:66,y:16},{x:36,y:6}].map((p,i)=>(<text key={i} x={p.x} y={p.y} fontSize="10" opacity={running?0.8:0.2} fill="white" style={{transition:"opacity 0.6s"}}>{"✦✧✦"[i]}</text>))}
    {children}
  </>);
}

function GhostRead({ running, color, big }) {
  const [frame,setFrame]=useState(0); const [blink,setBlink]=useState(false); const [pageFlip,setPageFlip]=useState(false);
  useEffect(()=>{ if(!running)return; const t=setInterval(()=>setFrame(f=>(f+1)%6),500); return()=>clearInterval(t); },[running]);
  useEffect(()=>{ const b=()=>{ setBlink(true); setTimeout(()=>setBlink(false),140); setTimeout(b,4000+Math.random()*2000); }; const t=setTimeout(b,1500); return()=>clearTimeout(t); },[]);
  useEffect(()=>{ if(!running)return; const t=setInterval(()=>{ setPageFlip(true); setTimeout(()=>setPageFlip(false),400); },4000); return()=>clearInterval(t); },[running]);
  const bobY=running?[0,-2,-4,-2,0,2][frame]:0; const sc=big?1.7:1;
  return (
    <svg width={90*sc} height={110*sc} viewBox="0 0 90 110" style={{filter:`drop-shadow(0 0 ${big?22:12}px ${color}66)`,transform:`translateY(${bobY}px)`,transition:"transform 0.5s ease",flexShrink:0}}>
      <GhostBase bobY={bobY} blink={blink} running={running}>
        {running&&<><path d="M12 52 Q2 50 4 40" fill="none" stroke="rgba(240,236,255,0.9)" strokeWidth="9" strokeLinecap="round"/><path d="M68 52 Q78 50 76 40" fill="none" stroke="rgba(240,236,255,0.9)" strokeWidth="9" strokeLinecap="round"/></>}
        {running&&<>
          <ellipse cx="45" cy="76" rx="26" ry="3" fill="rgba(0,0,0,0.15)"/>
          <path d="M19 62 Q32 60 45 62 L45 76 Q32 74 19 76 Z" fill="#f8f4ff" stroke={color} strokeWidth="0.8"/>
          <path d="M45 62 Q58 60 71 62 L71 76 Q58 74 45 76 Z" fill="#f8f4ff" stroke={color} strokeWidth="0.8"/>
          <line x1="45" y1="62" x2="45" y2="76" stroke={color} strokeWidth="1.5"/>
          {[65,68,71,74].map((y,i)=>(<g key={i}><line x1={22} y1={y} x2={42} y2={y} stroke={color} strokeWidth="0.7" opacity="0.5"/><line x1={48} y1={y} x2={68} y2={y} stroke={color} strokeWidth="0.7" opacity="0.5"/></g>))}
          <line x1={22} y1={65} x2={42} y2={65} stroke={color} strokeWidth="1.2" opacity="0.9"/>
          <path d="M64 62 L67 62 L67 56 L65.5 58 L64 56 Z" fill={color} opacity="0.8"/>
        </>}
      </GhostBase>
    </svg>
  );
}

function GhostWork({ running, color, big }) {
  const [frame,setFrame]=useState(0); const [blink,setBlink]=useState(false); const [penX,setPenX]=useState(0);
  useEffect(()=>{ if(!running)return; const t=setInterval(()=>setFrame(f=>(f+1)%4),550); return()=>clearInterval(t); },[running]);
  useEffect(()=>{ const b=()=>{ setBlink(true); setTimeout(()=>setBlink(false),140); setTimeout(b,3200+Math.random()*2000); }; const t=setTimeout(b,1800); return()=>clearTimeout(t); },[]);
  useEffect(()=>{ if(!running)return; let dir=1,pos=0; const t=setInterval(()=>{ pos+=dir*1.5; if(pos>16)dir=-1; if(pos<0){dir=1;pos=0;} setPenX(pos); },80); return()=>clearInterval(t); },[running]);
  const headTilt=running?[0,-2,0,2][frame]:0; const sc=big?1.7:1;
  return (
    <svg width={110*sc} height={115*sc} viewBox="0 0 110 115" style={{filter:`drop-shadow(0 0 ${big?22:12}px ${color}66)`,flexShrink:0}}>
      {running&&<>
        <rect x="5" y="84" width="100" height="6" rx="3" fill="#2a2040" stroke={color} strokeWidth="0.8" opacity="0.8"/>
        <rect x="12" y="90" width="5" height="14" rx="2" fill="#2a2040" opacity="0.6"/><rect x="93" y="90" width="5" height="14" rx="2" fill="#2a2040" opacity="0.6"/>
        <rect x="72" y="70" width="3" height="14" rx="1.5" fill="#3a3050" opacity="0.8"/>
        <ellipse cx="73.5" cy="68" rx="9" ry="5" fill="none" stroke="#3a3050" strokeWidth="2" opacity="0.8"/>
        <ellipse cx="73.5" cy="70" rx="7" ry="3" fill={color} opacity="0.25"/>
        <rect x="22" y="76" width="44" height="8" rx="1" fill="#f8f4ff" opacity="0.9"/>
        {[0,1,2].map(i=>(<line key={i} x1={25} y1={78+i*2.2} x2={25+penX+(i<2?16:8)} y2={78+i*2.2} stroke={color} strokeWidth="0.8" opacity="0.7"/>))}
      </>}
      <g transform={`translate(15,0) rotate(${headTilt},40,40)`} style={{transition:"transform 0.4s ease"}}>
        <GhostBase blink={blink} running={running}>
          {running&&<><path d="M10 54 Q0 58 2 70 Q6 76 14 76" fill="none" stroke="rgba(240,236,255,0.9)" strokeWidth="9" strokeLinecap="round"/><path d="M60 52 Q68 48 66 42" fill="none" stroke="rgba(240,236,255,0.9)" strokeWidth="9" strokeLinecap="round"/></>}
          {running&&<g transform={`translate(${penX-2},8)`}><rect x="5" y="68" width="4" height="18" rx="1.5" fill="#f0d060" transform="rotate(-30,7,77)"/><polygon points="5,86 9,86 7,91" fill="#f4b860" transform="rotate(-30,7,87)"/><rect x="5" y="68" width="4" height="3" rx="1" fill="#ff9999" transform="rotate(-30,7,70)"/></g>}
        </GhostBase>
      </g>
      {running&&<><circle cx="78" cy="28" r="1.5" fill="rgba(255,255,255,0.3)"/><circle cx="82" cy="23" r="2.5" fill="rgba(255,255,255,0.25)"/><circle cx="88" cy="17" r="5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/><text x="85" y="20" fontSize="7" textAnchor="middle" fill={color} opacity="0.8">💡</text></>}
    </svg>
  );
}

function GhostClean({ running, color, big }) {
  const [frame,setFrame]=useState(0); const [blink,setBlink]=useState(false); const [sweepAngle,setSweepAngle]=useState(0);
  useEffect(()=>{ if(!running)return; const t=setInterval(()=>setFrame(f=>(f+1)%4),450); return()=>clearInterval(t); },[running]);
  useEffect(()=>{ const b=()=>{ setBlink(true); setTimeout(()=>setBlink(false),140); setTimeout(b,3000+Math.random()*2000); }; const t=setTimeout(b,1200); return()=>clearTimeout(t); },[]);
  useEffect(()=>{ if(!running)return; let angle=-20,dir=1; const t=setInterval(()=>{ angle+=dir*2.5; if(angle>20)dir=-1; if(angle<-20)dir=1; setSweepAngle(angle); },40); return()=>clearInterval(t); },[running]);
  const bobY=running?[0,-3,0,3][frame]:0; const sc=big?1.7:1;
  return (
    <svg width={110*sc} height={115*sc} viewBox="0 0 110 115" style={{filter:`drop-shadow(0 0 ${big?22:12}px ${color}66)`,transform:`translateY(${bobY}px)`,transition:"transform 0.5s ease",flexShrink:0}}>
      {running&&<line x1="5" y1="92" x2="105" y2="92" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>}
      {running&&[0,1,2,3].map(i=>(<circle key={i} cx={18+i*8+(sweepAngle>0?sweepAngle*0.5:0)} cy={88-i*3} r={1.5+i*0.5} fill={color} opacity={0.15+i*0.05} style={{transition:"cx 0.1s"}}/>))}
      {running&&<><rect x={78} y={87} width={22} height={4} rx="1" fill="#9b87d4" opacity="0.75"/><rect x={78} y={83} width={18} height={4} rx="1" fill={color} opacity="0.75"/><rect x={78} y={79} width={20} height={4} rx="1" fill="#6b9fd4" opacity="0.75"/><text x="82" y="77" fontSize="9">📚</text></>}
      <g transform="translate(8,0)">
        <GhostBase bobY={bobY} blink={blink} running={running}>
          {running&&<><path d="M12 50 Q4 54 6 64" fill="none" stroke="rgba(240,236,255,0.9)" strokeWidth="9" strokeLinecap="round"/><path d="M60 50 Q68 44 64 36" fill="none" stroke="rgba(240,236,255,0.9)" strokeWidth="9" strokeLinecap="round"/></>}
          {running&&<g transform={`rotate(${sweepAngle},36,76)`} style={{transformOrigin:"36px 76px",transition:"transform 0.05s"}}>
            <line x1="36" y1="76" x2="36" y2="20" stroke="#b08040" strokeWidth="3.5" strokeLinecap="round"/>
            <ellipse cx="36" cy="78" rx="18" ry="5" fill="#c4a060" opacity="0.9"/>
            {[-14,-10,-6,-2,2,6,10,14].map((ox,i)=>(<line key={i} x1={36+ox} y1="78" x2={36+ox+(ox<0?-1:1)} y2="87" stroke="#a08030" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>))}
          </g>}
          {running&&<text x="52" y="25" fontSize="10" opacity="0.9">✨</text>}
        </GhostBase>
      </g>
    </svg>
  );
}

function Ghost({ activityMode, running, color, big }) {
  if (activityMode==="read")  return <GhostRead running={running} color={color} big={big}/>;
  if (activityMode==="work")  return <GhostWork running={running} color={color} big={big}/>;
  if (activityMode==="clean") return <GhostClean running={running} color={color} big={big}/>;
  return <GhostWork running={running} color={color} big={big}/>;
}

// ── Ring ───────────────────────────────────────────────────────────────────────
function Ring({ progress, remaining, color, big }) {
  const r=big?92:68; const circ=2*Math.PI*r; const size=(r+14)*2;
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="11"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ*(1-progress)}
          style={{transition:"stroke-dashoffset 1s linear, stroke 0.5s",filter:`drop-shadow(0 0 ${big?16:8}px ${color}99)`}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
        <div style={{fontSize:big?56:34,fontWeight:200,color:"#fff",letterSpacing:-2,fontVariantNumeric:"tabular-nums",textShadow:big?`0 0 40px ${color}99`:"none"}}>{fmt(remaining)}</div>
        <div style={{fontSize:big?12:10,fontWeight:600,color,letterSpacing:1.5,textTransform:"uppercase",opacity:0.9}}>{Math.round(progress*100)}%</div>
      </div>
    </div>
  );
}

function Dots({idx,color}) {
  const T = useT();
  return (
    <div style={{display:"flex",gap:8}}>
      {[0,1,2,3].map(i=>(<div key={i} style={{width:i===idx?22:7,height:7,borderRadius:4,background:i<=idx?color:T.border,opacity:i<idx?0.45:1,boxShadow:i===idx?`0 0 8px ${color}88`:"none",transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)"}}/>))}
    </div>
  );
}

function Toast({msg,show}) {
  const T = useT();
  return (
    <div style={{position:"absolute",top:82,left:"50%",transform:`translateX(-50%) translateY(${show?0:-12}px)`,opacity:show?1:0,transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)",background:"rgba(20,24,38,0.96)",backdropFilter:"blur(16px)",border:`1px solid ${T.borderLight}`,borderRadius:20,padding:"10px 22px",fontSize:12,fontWeight:700,color:T.text,whiteSpace:"nowrap",zIndex:999,pointerEvents:"none",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
      {msg}
    </div>
  );
}

// ── Project Badge ─────────────────────────────────────────────────────────────
function ProjectBadge({ project, small }) {
  const T = useT();
  if (!project) return <span style={{fontSize:small?9:10,color:T.textMuted,fontWeight:600}}>Proje yok</span>;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,background:`${project.color}18`,border:`1px solid ${project.color}44`,borderRadius:8,padding:small?"2px 7px":"3px 9px",fontSize:small?9:10,fontWeight:700,color:project.color}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:project.color,display:"inline-block"}}/>
      {project.name}
    </span>
  );
}

// ── Time Log Entry ─────────────────────────────────────────────────────────────
function LogEntry({ log, projects }) {
  const T = useT();
  const proj = projects.find(p=>p.id===log.projectId);
  const isComplete = log.completed;
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.glass,borderRadius:14,border:`1px solid ${isComplete?"rgba(134,239,206,0.15)":"rgba(247,208,112,0.15)"}`,marginBottom:6}}>
      <div style={{width:3,height:36,borderRadius:2,background:isComplete?T.mint:T.yellow,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
          <span style={{fontSize:12,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{log.taskName||log.activityLabel}</span>
          {!isComplete && <span style={{fontSize:9,fontWeight:700,color:T.yellow,background:"rgba(247,208,112,0.15)",border:"1px solid rgba(247,208,112,0.3)",borderRadius:6,padding:"1px 6px",flexShrink:0}}>eksik</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <ProjectBadge project={proj} small/>
          <span style={{fontSize:9,color:T.textMuted,fontWeight:600}}>{log.activityEmoji} {log.activityLabel}</span>
        </div>
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontSize:13,fontWeight:700,color:isComplete?T.mint:T.yellow}}>{fmtDuration(log.durationSec)}</div>
        <div style={{fontSize:9,color:T.textMuted,fontWeight:600}}>{fmtTime(new Date(log.startTime))}–{fmtTime(new Date(log.endTime))}</div>
      </div>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, logs, onEdit }) {
  const T = useT();
  const projLogs = logs.filter(l=>l.projectId===project.id);
  const totalSec = projLogs.reduce((a,l)=>a+l.durationSec,0);
  const sessions = projLogs.length;
  const completed = projLogs.filter(l=>l.completed).length;
  return (
    <div style={{background:T.glass,border:`1px solid ${project.color}33`,borderRadius:18,padding:14,marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:project.color,boxShadow:`0 0 8px ${project.color}88`}}/>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>{project.name}</span>
        </div>
        <button onClick={onEdit} style={{background:"transparent",border:"none",cursor:"pointer",color:T.textMuted,fontSize:13,padding:4}}>✏️</button>
      </div>
      <div style={{display:"flex",gap:8}}>
        <div style={{flex:1,background:`${project.color}10`,border:`1px solid ${project.color}22`,borderRadius:12,padding:"8px 10px"}}>
          <div style={{fontSize:15,fontWeight:700,color:project.color}}>{fmtDuration(totalSec)}</div>
          <div style={{fontSize:9,color:T.textMuted,fontWeight:600,marginTop:2}}>Toplam Süre</div>
        </div>
        <div style={{flex:1,background:`${project.color}10`,border:`1px solid ${project.color}22`,borderRadius:12,padding:"8px 10px"}}>
          <div style={{fontSize:15,fontWeight:700,color:project.color}}>{sessions}</div>
          <div style={{fontSize:9,color:T.textMuted,fontWeight:600,marginTop:2}}>Oturum</div>
        </div>
        <div style={{flex:1,background:`${project.color}10`,border:`1px solid ${project.color}22`,borderRadius:12,padding:"8px 10px"}}>
          <div style={{fontSize:15,fontWeight:700,color:project.color}}>{sessions>0?Math.round((completed/sessions)*100):0}%</div>
          <div style={{fontSize:9,color:T.textMuted,fontWeight:600,marginTop:2}}>Tamamlanma</div>
        </div>
      </div>
      {/* Progress bar */}
      {sessions > 0 && (
        <div style={{marginTop:10}}>
          <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(completed/sessions)*100}%`,background:project.color,borderRadius:2,transition:"width 0.5s"}}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  const T = useT();
  return (
    <div style={{position:"absolute",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#1e2338",border:`1px solid ${T.borderLight}`,borderRadius:24,padding:20,width:320,maxHeight:500,overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:14,fontWeight:700,color:T.text}}>{title}</span>
          <button onClick={onClose} style={{background:"transparent",border:"none",cursor:"pointer",color:T.textMuted,fontSize:18,lineHeight:1}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Activity Selector ─────────────────────────────────────────────────────────
function ActivitySelector({ current, onChange, disabled, T, theme }) {
  return (
    <div style={{display:"flex",gap:8,marginBottom:14}}>
      {Object.entries(ACTIVITY_MODES).map(([k,m])=>{
        const active=current===k;
        const mc = getModeColor(k, theme);
        return (
          <button key={k} onClick={()=>!disabled&&onChange(k)} style={{flex:1,border:"none",cursor:disabled?"not-allowed":"pointer",padding:"10px 4px",borderRadius:16,background:active?mc.color+"20":T.glass,color:active?mc.color:T.textMuted,fontSize:11,fontWeight:700,outline:`1.5px solid ${active?mc.color+"55":T.border}`,transition:"all 0.3s",display:"flex",flexDirection:"column",alignItems:"center",gap:3,opacity:disabled&&!active?0.4:1,transform:active?"scale(1.04)":"scale(1)",boxShadow:active?`0 4px 16px ${mc.color}33`:"none"}}>
            <span style={{fontSize:20}}>{m.emoji}</span>
            <span>{m.label}</span>
            {active&&<div style={{width:14,height:2.5,borderRadius:2,background:mc.color,marginTop:1}}/>}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [theme, setTheme]           = useState("dark");
  const T = THEMES[theme];
  ThemeCtx.current = T; // sync for useT() hook
  const [actMode, setActMode]       = useState("work");
  const [remaining, setRemaining]   = useState(ACTIVITY_MODES.work.duration);
  const [running, setRunning]       = useState(false);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [tab, setTab]               = useState("timer");
  const [showControls, setShowControls] = useState(true);
  const [isBrowserFS, setIsBrowserFS]   = useState(false);  // browser fullscreen active
  const appRef = useRef(null);  // ref on the outermost div

  // Projects & Logs
  const [projects, setProjects]     = useState(DEFAULT_PROJECTS);
  const [timeLogs, setTimeLogs]     = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("p1");

  // Tasks
  const [tasks, setTasks]           = useState([
    {id:"1",text:"Makale oku",pomos:0,done:false,active:true,projectId:"p3"},
    {id:"2",text:"Notları düzenle",pomos:0,done:false,active:false,projectId:"p2"},
    {id:"3",text:"Proje özeti yaz",pomos:0,done:false,active:false,projectId:"p2"},
    {id:"4",text:"Masa temizliği",pomos:0,done:true,active:false,projectId:"p1"},
  ]);
  const [inputOpen, setInputOpen]   = useState(false);
  const [inputText, setInputText]   = useState("");
  const [taskProjectId, setTaskProjectId] = useState("p1");

  // Modals
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject]     = useState(null);
  const [newProjName, setNewProjName]           = useState("");
  const [newProjColor, setNewProjColor]         = useState(PROJECT_COLORS[0]);
  const [showLogDetail, setShowLogDetail]       = useState(false);

  // Toast
  const [toast, setToast] = useState({show:false,msg:""});

  // Session tracking
  const sessionStartRef  = useRef(null);
  const sessionStartRem  = useRef(null);
  const intervalRef      = useRef(null);
  const toastRef         = useRef(null);
  const hideRef          = useRef(null);
  const inputRef         = useRef(null);

  // ASMR
  const asmr = useAsmr();
  const [autoSoundEnabled, setAutoSoundEnabled] = useState(true);
  const [lastSound, setLastSound] = useState("rain");

  const _modeBase = ACTIVITY_MODES[actMode];
  const cfg = { ..._modeBase, ...getModeColor(actMode, theme) };
  const progress = remaining / cfg.duration;
  const isFocus = running && tab === "timer";
  const activeTask = tasks.find(t=>t.active&&!t.done);

  // ── Controls auto-hide ──────────────────────────────────────────────────────
  useEffect(() => {
    if (running) { clearTimeout(hideRef.current); hideRef.current=setTimeout(()=>setShowControls(false),3000); }
    else { clearTimeout(hideRef.current); setShowControls(true); }
  }, [running]);


  // u2500u2500 Auto sound on focus start/stop u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (autoSoundEnabled) asmr.autoPlay(running, lastSound); }, [running]);
  const handleTap = useCallback(() => {
    if (!running) return;
    setShowControls(true); clearTimeout(hideRef.current);
    hideRef.current = setTimeout(()=>setShowControls(false), 3000);
  }, [running]);

  const toggleBrowserFS = useCallback(() => {
    setIsBrowserFS(f => !f);
  }, []);



  const showToast = useCallback((msg) => {
    setToast({show:true,msg}); clearTimeout(toastRef.current);
    toastRef.current = setTimeout(()=>setToast(t=>({...t,show:false})), 2800);
  }, []);

  // ── Record a time log ───────────────────────────────────────────────────────
  const recordLog = useCallback((completed, endRem) => {
    if (!sessionStartRef.current) return;
    const startTime = sessionStartRef.current;
    const endTime = new Date();
    const plannedDuration = sessionStartRem.current || cfg.duration;
    const actualDuration = Math.round((endTime - startTime) / 1000);
    if (actualDuration < 5) return; // ignore accidental

    const log = {
      id: Date.now()+"",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSec: actualDuration,
      plannedSec: plannedDuration,
      activityMode: actMode,
      activityLabel: cfg.label,
      activityEmoji: cfg.emoji,
      projectId: activeProjectId,
      taskName: activeTask ? activeTask.text : null,
      taskId: activeTask ? activeTask.id : null,
      completed,
      date: startTime.toDateString(),
    };
    setTimeLogs(prev => [log, ...prev]);

    // Update task pomos if completed
    if (completed && activeTask) {
      setTasks(prev => prev.map(t => t.id===activeTask.id ? {...t, pomos: t.pomos+1} : t));
    }

    sessionStartRef.current = null;
    sessionStartRem.current = null;
  }, [actMode, cfg, activeProjectId, activeTask]);

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (running) {
      if (!sessionStartRef.current) {
        sessionStartRef.current = new Date();
        sessionStartRem.current = remaining;
      }
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clearInterval(intervalRef.current); setRunning(false); return 0; }
          return r-1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // ── On finish (remaining hits 0 while was running) ──────────────────────────
  const prevRunningRef = useRef(false);
  useEffect(() => {
    if (prevRunningRef.current && !running && remaining === 0) {
      recordLog(true, 0);
      setSessionIdx(i=>(i+1)%4);
      const msgs = { read:"📚 Harika okudun! Mola~", work:"✏️ Süpersin! Mola zamanı~", clean:"🧹 Tertemiz! Aferin~" };
      showToast(msgs[actMode]);
    }
    prevRunningRef.current = running;
  }, [running]);

  // ── Pause mid-session ───────────────────────────────────────────────────────
  const pauseTimer = useCallback(() => {
    if (running) {
      recordLog(false, remaining);
      setRunning(false);
    }
  }, [running, remaining, recordLog]);

// Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "f" || e.key === "F") toggleBrowserFS();
      if (e.key === " ") { e.preventDefault(); running ? pauseTimer() : setRunning(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleBrowserFS, running, pauseTimer]);


  const resetTimer = useCallback(() => {
    if (running) recordLog(false, remaining);
    setRunning(false);
    setRemaining(cfg.duration);
    sessionStartRef.current = null;
  }, [running, remaining, cfg, recordLog]);

  const skipTimer = useCallback(() => {
    if (running) recordLog(false, remaining);
    setRunning(false);
    setRemaining(0);
    sessionStartRef.current = null;
  }, [running, remaining, recordLog]);

  const switchActivity = useCallback((mode) => {
    if (running) recordLog(false, remaining);
    clearInterval(intervalRef.current);
    setRunning(false); setActMode(mode); setRemaining(ACTIVITY_MODES[mode].duration);
    sessionStartRef.current = null;
  }, [running, remaining, recordLog]);

  // ── Project helpers ─────────────────────────────────────────────────────────
  const saveProject = () => {
    if (!newProjName.trim()) return;
    if (editingProject) {
      setProjects(prev=>prev.map(p=>p.id===editingProject.id?{...p,name:newProjName.trim(),color:newProjColor}:p));
    } else {
      const np = {id:"p"+Date.now(), name:newProjName.trim(), color:newProjColor, totalSec:0};
      setProjects(prev=>[...prev,np]);
    }
    setShowProjectModal(false); setEditingProject(null); setNewProjName(""); setNewProjColor(PROJECT_COLORS[0]);
  };
  const openNewProject = () => { setEditingProject(null); setNewProjName(""); setNewProjColor(PROJECT_COLORS[0]); setShowProjectModal(true); };
  const openEditProject = (p) => { setEditingProject(p); setNewProjName(p.name); setNewProjColor(p.color); setShowProjectModal(true); };

  // ── Task helpers ─────────────────────────────────────────────────────────────
  const addTask = () => {
    if (!inputText.trim()) return;
    setTasks(prev=>[{id:Date.now()+"",text:inputText.trim(),pomos:0,done:false,active:false,projectId:taskProjectId},...prev]);
    setInputText(""); setInputOpen(false); showToast("✅ Görev eklendi");
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalSec     = timeLogs.reduce((a,l)=>a+l.durationSec,0);
  const completedLogs = timeLogs.filter(l=>l.completed).length;
  const incompleteLogs = timeLogs.filter(l=>!l.completed).length;

  // Group logs by date
  const logsByDate = timeLogs.reduce((acc,l) => {
    const d = fmtDate(new Date(l.startTime));
    if (!acc[d]) acc[d]=[];
    acc[d].push(l);
    return acc;
  }, {});

  const now = new Date();
  const clock = `${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;

  const CTL_BTN = {width:52,height:52,borderRadius:18,border:"1px solid rgba(255,255,255,0.16)",background:"rgba(255,255,255,0.09)",backdropFilter:"blur(10px)",color:"rgba(255,255,255,0.65)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"};

  // ── Shared render helpers ───────────────────────────────────────────────────
  const fmtH = s => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}s ${m}dk`:`${m}dk`; };

  return (
    <div ref={appRef} style={{position:isBrowserFS?"fixed":"relative",inset:isBrowserFS?0:"auto",zIndex:isBrowserFS?9999:"auto",minHeight:isBrowserFS?"unset":"100vh",background:isBrowserFS?T.bg:T.bgOuter,display:"flex",alignItems:"center",justifyContent:"center",padding:isBrowserFS?0:20,transition:"all 0.4s ease"}}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Nunito',system-ui,sans-serif}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
        input,button,select{font-family:'Nunito',system-ui,sans-serif}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes glow{0%,100%{opacity:0.6}50%{opacity:1}}
        @keyframes slideD{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideU{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes soundBar0{from{height:3px}to{height:9px}}
        @keyframes soundBar1{from{height:5px}to{height:12px}}
        @keyframes soundBar2{from{height:4px}to{height:10px}}
        @keyframes soundBar3{from{height:6px}to{height:14px}}
        @keyframes soundBar4{from{height:3px}to{height:8px}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        input[type=range]{-webkit-appearance:none;background:rgba(255,255,255,0.08);border-radius:4px;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#c4b5f7;cursor:pointer;box-shadow:0 0 6px rgba(196,181,247,0.6)}
      `}</style>

      {/* ══════════════════════════════════════════════════
           DESKTOP LAYOUT (fullscreen mode)
      ══════════════════════════════════════════════════ */}
      {isBrowserFS && (
        <div style={{display:"flex",width:"100%",height:"100vh",fontFamily:"'Nunito',system-ui,sans-serif",background:T.bg,color:T.text,overflow:"hidden"}}>

          {/* ── LEFT SIDEBAR ── */}
          <div style={{width:240,flexShrink:0,background:T.bgDeep,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"}}>
            {/* Logo */}
            <div style={{padding:"20px 20px 16px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <span style={{fontSize:24}}>👻</span>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:T.text}}>FocusGhost</div>
                  <div style={{fontSize:10,color:T.textMuted,fontWeight:600}}>Pomodoro Tracker</div>
                </div>
                <button onClick={toggleBrowserFS} title="Küçült" style={{marginLeft:"auto",background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,padding:"4px 6px",cursor:"pointer",color:T.textMuted,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                </button>
              </div>
              {/* Theme toggle */}
              <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{width:"100%",background:T.glass,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:7,color:T.textSoft,fontSize:11,fontWeight:700,transition:"all 0.2s"}}>
                <span style={{fontSize:14}}>{theme==="dark"?"🌙":"☀️"}</span>
                <span>{theme==="dark"?"Koyu Mod":"Açık Mod"}</span>
                <span style={{marginLeft:"auto",fontSize:9,color:T.textMuted}}>Değiştir</span>
              </button>
            </div>

            {/* Nav items */}
            <div style={{padding:"12px 12px",flexShrink:0}}>
              <div style={{fontSize:9,fontWeight:800,color:T.textMuted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8,paddingLeft:8}}>Menü</div>
              {[
                {icon:"⏱️",label:"Timer",key:"timer"},
                {icon:"📁",label:"Projeler",key:"projects"},
                {icon:"🕐",label:"Kayıtlar",key:"logs"},
                {icon:"📊",label:"İstatistik",key:"stats"},
              ].map(({icon,label,key})=>(
                <button key={key} onClick={()=>setTab(key)} style={{width:"100%",border:"none",cursor:"pointer",borderRadius:12,background:tab===key?cfg.color+"18":"transparent",padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:3,color:tab===key?cfg.color:T.textSoft,fontSize:13,fontWeight:tab===key?700:500,outline:tab===key?`1px solid ${cfg.color}33`:"none",transition:"all 0.2s",textAlign:"left"}}>
                  <span style={{fontSize:18,width:22,textAlign:"center"}}>{icon}</span>
                  <span>{label}</span>
                  {tab===key && <div style={{marginLeft:"auto",width:5,height:5,borderRadius:"50%",background:cfg.color}}/>}
                </button>
              ))}
            </div>

            {/* Active session + project info */}
            <div style={{padding:"0 12px",flex:1,overflowY:"auto"}}>
              <div style={{fontSize:9,fontWeight:800,color:T.textMuted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8,paddingLeft:8}}>Projeler</div>
              {projects.map(p=>{
                const pSec = timeLogs.filter(l=>l.projectId===p.id).reduce((a,l)=>a+l.durationSec,0);
                return (
                  <button key={p.id} onClick={()=>setActiveProjectId(p.id)} style={{width:"100%",border:"none",cursor:"pointer",borderRadius:12,background:activeProjectId===p.id?`${p.color}18`:"transparent",padding:"9px 14px",display:"flex",alignItems:"center",gap:9,marginBottom:3,outline:activeProjectId===p.id?`1px solid ${p.color}33`:"none",transition:"all 0.2s",textAlign:"left"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:p.color,flexShrink:0,boxShadow:activeProjectId===p.id?`0 0 6px ${p.color}`:"none"}}/>
                    <span style={{fontSize:12,fontWeight:600,color:activeProjectId===p.id?p.color:T.textSoft,flex:1}}>{p.name}</span>
                    <span style={{fontSize:10,color:T.textMuted,fontWeight:600}}>{fmtDuration(pSec)}</span>
                  </button>
                );
              })}
              <button onClick={openNewProject} style={{width:"100%",border:`1px dashed ${T.border}`,cursor:"pointer",borderRadius:12,background:"transparent",padding:"8px 14px",display:"flex",alignItems:"center",gap:8,marginTop:4,color:T.textMuted,fontSize:11,fontWeight:600,transition:"all 0.2s"}}>
                <span style={{fontSize:14}}>+</span> Yeni Proje
              </button>
            </div>

            {/* Bottom stats */}
            <div style={{padding:12,borderTop:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {[{e:"✅",v:completedLogs,l:"Tamamlandı"},{e:"⚠️",v:incompleteLogs,l:"Eksik"},{e:"⏱️",v:fmtDuration(totalSec),l:"Toplam"},{e:"🔥",v:`${Math.max(0,timeLogs.length)}`,l:"Oturum"}].map(({e,v,l})=>(
                  <div key={l} style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
                    <div style={{fontSize:12}}>{e}</div>
                    <div style={{fontSize:12,fontWeight:700,color:T.text}}>{v}</div>
                    <div style={{fontSize:8,color:T.textMuted,fontWeight:700}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",height:"100vh"}}>

            {/* Top bar */}
            <div style={{height:56,flexShrink:0,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"0 28px",gap:16,background:T.bg}}>
              <div style={{flex:1}}>
                <div style={{fontSize:18,fontWeight:800,color:T.text}}>
                  {tab==="timer"&&"⏱️ Timer"}
                  {tab==="projects"&&"📁 Projeler"}
                  {tab==="logs"&&"🕐 Zaman Kayıtları"}
                  {tab==="stats"&&"📊 İstatistikler"}
                </div>
              </div>
              {/* Running pill */}
              {running && (
                <div style={{display:"flex",alignItems:"center",gap:8,background:cfg.color+"18",border:`1px solid ${cfg.color}44`,borderRadius:20,padding:"6px 14px"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:cfg.color,animation:"glow 1.5s infinite"}}/>
                  <span style={{fontSize:12,fontWeight:700,color:cfg.color}}>{cfg.emoji} {fmt(remaining)}</span>
                </div>
              )}
              <span style={{fontSize:12,color:T.textMuted,fontWeight:600}}>{clock}</span>
            </div>

            {/* ── TIMER TAB (desktop) ── */}
            {tab==="timer" && (
              <div style={{flex:1,display:"flex",overflow:"hidden"}}>

                {/* Center: Timer + Ghost */}
                <div style={{flex:"0 0 480px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,padding:32,borderRight:`1px solid ${T.border}`,position:"relative",overflow:"hidden"}}>
                  {/* Scene background */}
                  <div style={{position:"absolute",inset:0,opacity:0.25,pointerEvents:"none"}}>
                    <Scene big T={T}/>
                  </div>
                  <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
                    {/* Activity mode pills */}
                    <div style={{display:"flex",gap:8}}>
                      {Object.entries(ACTIVITY_MODES).map(([k,m])=>{
                        const active=actMode===k;
                        const mc=getModeColor(k,theme);
                        return (
                          <button key={k} onClick={()=>!running&&switchActivity(k)} style={{border:"none",cursor:running?"not-allowed":"pointer",padding:"8px 16px",borderRadius:20,background:active?mc.color+"22":T.glass,color:active?mc.color:T.textMuted,fontSize:12,fontWeight:700,outline:`1.5px solid ${active?mc.color+"55":T.border}`,transition:"all 0.25s",opacity:running&&!active?0.4:1}}>
                            {m.emoji} {m.label}
                          </button>
                        );
                      })}
                    </div>

                    <Ghost activityMode={actMode} running={running} color={cfg.color} big/>
                    <Ring progress={progress} remaining={remaining} color={cfg.color} big/>
                    <Dots idx={sessionIdx} color={cfg.color}/>

                    {/* Active project badge */}
                    <div style={{display:"flex",alignItems:"center",gap:8,background:T.glass,border:`1px solid ${T.border}`,borderRadius:20,padding:"8px 20px"}}>
                      <span style={{fontSize:12,color:T.textMuted,fontWeight:600}}>Proje:</span>
                      {projects.map(p=>(
                        <button key={p.id} onClick={()=>setActiveProjectId(p.id)} style={{border:"none",cursor:"pointer",background:activeProjectId===p.id?`${p.color}22`:"transparent",borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700,color:activeProjectId===p.id?p.color:T.textMuted,outline:activeProjectId===p.id?`1px solid ${p.color}55`:"none",transition:"all 0.2s",display:"flex",alignItems:"center",gap:4}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:p.color,display:"inline-block"}}/>{p.name}
                        </button>
                      ))}
                    </div>

                    {/* Controls */}
                    <div style={{display:"flex",alignItems:"center",gap:16}}>
                      <button onClick={resetTimer} style={{width:48,height:48,borderRadius:16,border:`1px solid ${T.border}`,background:T.glass,color:T.textMuted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                      </button>
                      <button onClick={()=>running?pauseTimer():setRunning(true)} style={{width:72,height:72,borderRadius:"50%",border:"none",cursor:"pointer",background:`radial-gradient(circle at 35% 35%, ${cfg.color}ee, ${cfg.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 28px ${cfg.color}55,0 4px 16px rgba(0,0,0,0.2)`,transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)"}}>
                        {running
                          ? <div style={{display:"flex",gap:5}}><div style={{width:5,height:20,borderRadius:3,background:"#fff"}}/><div style={{width:5,height:20,borderRadius:3,background:"#fff"}}/></div>
                          : <div style={{width:0,height:0,borderTop:"11px solid transparent",borderBottom:"11px solid transparent",borderLeft:"20px solid #fff",marginLeft:4}}/>
                        }
                      </button>
                      <button onClick={skipTimer} style={{width:48,height:48,borderRadius:16,border:`1px solid ${T.border}`,background:T.glass,color:T.textMuted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="5,4 15,12 5,20"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                      </button>
                    </div>

                    {/* ASMR row */}
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      {Object.entries(SOUNDS).map(([key,s])=>{
                        const isActive=asmr.active===key;
                        return (
                          <button key={key} onClick={()=>{asmr.play(key);if(asmr.active!==key)setLastSound(key);}} style={{border:"none",cursor:"pointer",borderRadius:14,padding:"8px 14px",background:isActive?cfg.color+"22":T.glass,outline:`1px solid ${isActive?cfg.color+"55":T.border}`,color:isActive?cfg.color:T.textMuted,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}>
                            <span style={{fontSize:16}}>{s.emoji}</span>
                            <span>{s.label}</span>
                            {isActive&&<div style={{display:"flex",gap:1.5,alignItems:"flex-end",height:10}}>
                              {[0,1,2].map(i=>(<div key={i} style={{width:2.5,borderRadius:1,background:cfg.color,animation:`soundBar${i} ${0.5+i*0.15}s ease infinite alternate`}}/>))}
                            </div>}
                          </button>
                        );
                      })}
                      {asmr.active && (
                        <input type="range" min="0" max="1" step="0.05" value={asmr.volume}
                          onChange={e=>asmr.adjustVolume(parseFloat(e.target.value))}
                          style={{width:80,height:4,accentColor:cfg.color,cursor:"pointer",marginLeft:4}}
                        />
                      )}
                    </div>

                    {/* Keyboard hint */}
                    <div style={{display:"flex",gap:12,fontSize:10,color:T.textMuted,fontWeight:600}}>
                      <span style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:6,padding:"2px 8px"}}>Space</span>
                      <span>Başlat/Durdur</span>
                      <span style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:6,padding:"2px 8px"}}>F</span>
                      <span>Küçült</span>
                    </div>
                  </div>
                </div>

                {/* Right panel: Tasks */}
                <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                  <div style={{padding:"20px 24px 0",flexShrink:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                      <span style={{fontSize:14,fontWeight:700,color:T.text}}>📋 Görevler</span>
                      <button onClick={()=>{setInputOpen(o=>!o);setTimeout(()=>inputRef.current?.focus(),80);}} style={{background:cfg.color+"22",border:`1px solid ${cfg.color}44`,borderRadius:10,padding:"6px 14px",fontSize:11,fontWeight:700,color:cfg.color,cursor:"pointer"}}>
                        {inputOpen?"İptal":"+ Görev Ekle"}
                      </button>
                    </div>
                    {inputOpen && (
                      <div style={{marginBottom:14}}>
                        <div style={{display:"flex",gap:8,marginBottom:8}}>
                          <input ref={inputRef} value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="Yeni görev..." maxLength={50} style={{flex:1,background:T.inputBg,border:`1px solid ${T.borderLight}`,borderRadius:12,padding:"10px 14px",color:T.text,fontSize:13}}/>
                          <button onClick={addTask} style={{background:cfg.color,color:"#1a1f2e",border:"none",borderRadius:12,padding:"10px 18px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Ekle</button>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          {projects.map(p=>(
                            <button key={p.id} onClick={()=>setTaskProjectId(p.id)} style={{border:"none",cursor:"pointer",background:taskProjectId===p.id?`${p.color}22`:"transparent",borderRadius:8,padding:"4px 10px",fontSize:10,fontWeight:700,color:taskProjectId===p.id?p.color:T.textMuted,outline:taskProjectId===p.id?`1px solid ${p.color}55`:"none",transition:"all 0.2s",display:"flex",alignItems:"center",gap:4}}>
                              <span style={{width:5,height:5,borderRadius:"50%",background:p.color,display:"inline-block"}}/>{p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{flex:1,overflowY:"auto",padding:"0 24px 24px"}}>
                    {tasks.length===0 && (
                      <div style={{textAlign:"center",padding:40,color:T.textMuted,fontSize:13}}>
                        <div style={{fontSize:36,marginBottom:8}}>📋</div>
                        Henüz görev yok
                      </div>
                    )}
                    {tasks.map(t=>{
                      const proj=projects.find(p=>p.id===t.projectId);
                      return (
                        <div key={t.id} onClick={()=>setTasks(p=>p.map(x=>({...x,active:x.id===t.id&&!x.done?!x.active:false})))} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:t.active?cfg.color+"10":T.glass,borderRadius:14,cursor:"pointer",border:`1px solid ${t.active?cfg.color+"33":T.border}`,opacity:t.done?0.4:1,transition:"all 0.2s",marginBottom:8}}>
                          <div onClick={e=>{e.stopPropagation();const found=tasks.find(x=>x.id===t.id);if(found&&!found.done)showToast("✨ Görevi tamamladın!");setTasks(p=>p.map(x=>x.id===t.id?{...x,done:!x.done,active:false}:x));}} style={{width:22,height:22,borderRadius:8,flexShrink:0,cursor:"pointer",border:`1.5px solid ${t.done?T.mint:T.border}`,background:t.done?T.mint+"28":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                            {t.done&&<span style={{fontSize:12,color:T.mint,fontWeight:700}}>✓</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,color:T.text,textDecoration:t.done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.text}</div>
                            <div style={{marginTop:3}}><ProjectBadge project={proj} small/></div>
                          </div>
                          <span style={{fontSize:11,color:T.textMuted,background:T.glass,padding:"3px 9px",borderRadius:8,flexShrink:0}}>🍅 {t.pomos}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── PROJECTS TAB (desktop) ── */}
            {tab==="projects" && (
              <div style={{flex:1,overflowY:"auto",padding:28}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <span style={{fontSize:14,fontWeight:700,color:T.textSoft}}>Tüm Projeler</span>
                  <button onClick={openNewProject} style={{background:T.lavender+"22",border:`1px solid ${T.lavender}44`,borderRadius:12,padding:"8px 18px",fontSize:12,fontWeight:700,color:T.lavender,cursor:"pointer"}}>+ Yeni Proje</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
                  {projects.map(p=><ProjectCard key={p.id} project={p} logs={timeLogs} onEdit={()=>openEditProject(p)}/>)}
                </div>
              </div>
            )}

            {/* ── LOGS TAB (desktop) ── */}
            {tab==="logs" && (
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{padding:"20px 28px 16px",flexShrink:0,borderBottom:`1px solid ${T.border}`}}>
                  <div style={{display:"flex",gap:12}}>
                    {[{e:"⏱️",v:fmtDuration(totalSec),l:"Toplam Çalışma",c:T.mint},{e:"✅",v:completedLogs,l:"Tamamlanan",c:T.mint},{e:"⚠️",v:incompleteLogs,l:"Eksik",c:T.yellow}].map(({e,v,l,c})=>(
                      <div key={l} style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:14,padding:"10px 18px",display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:18}}>{e}</span>
                        <div><div style={{fontSize:16,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:10,color:T.textMuted,fontWeight:600}}>{l}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"16px 28px"}}>
                  {Object.keys(logsByDate).length===0 && (
                    <div style={{textAlign:"center",padding:80,color:T.textMuted}}>
                      <div style={{fontSize:52,marginBottom:12}}>👻</div>
                      <div style={{fontSize:14,fontWeight:600}}>Henüz kayıt yok</div>
                      <div style={{fontSize:12,marginTop:4}}>Timer'ı başlat!</div>
                    </div>
                  )}
                  {Object.entries(logsByDate).map(([date,logs])=>{
                    const daySec=logs.reduce((a,l)=>a+l.durationSec,0);
                    return (
                      <div key={date} style={{marginBottom:20}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,padding:"4px 0",borderBottom:`1px solid ${T.border}`}}>
                          <span style={{fontSize:12,fontWeight:700,color:T.textMuted}}>{date}</span>
                          <span style={{fontSize:12,fontWeight:700,color:T.textSoft}}>{fmtDuration(daySec)}</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:8}}>
                          {logs.map(l=><LogEntry key={l.id} log={l} projects={projects}/>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STATS TAB (desktop) ── */}
            {tab==="stats" && (
              <div style={{flex:1,overflowY:"auto",padding:28}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
                  {[{e:"⏱️",v:fmtDuration(totalSec),l:"Toplam Süre",c:T.lavender},{e:"✅",v:completedLogs,l:"Tamamlanan",c:T.mint},{e:"⚠️",v:incompleteLogs,l:"Yarıda Bırakılan",c:T.yellow},{e:"📁",v:projects.length,l:"Aktif Proje",c:T.peach}].map(({e,v,l,c})=>(
                    <div key={l} style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:20,padding:20}}>
                      <div style={{fontSize:28,marginBottom:8}}>{e}</div>
                      <div style={{fontSize:26,fontWeight:700,color:c}}>{v}</div>
                      <div style={{fontSize:11,color:T.textMuted,marginTop:4,fontWeight:600}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:20,padding:20}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.textSoft,marginBottom:16}}>Mod Dağılımı</div>
                    {Object.entries(ACTIVITY_MODES).map(([k,m])=>{
                      const modSec=timeLogs.filter(l=>l.activityMode===k).reduce((a,l)=>a+l.durationSec,0);
                      const pct=totalSec>0?Math.round((modSec/totalSec)*100):0;
                      const mc=getModeColor(k,theme);
                      return (
                        <div key={k} style={{marginBottom:14}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                            <span style={{fontSize:12,fontWeight:700,color:mc.color}}>{m.emoji} {m.label}</span>
                            <span style={{fontSize:12,fontWeight:700,color:T.textMuted}}>{fmtDuration(modSec)} · {pct}%</span>
                          </div>
                          <div style={{height:8,background:T.glass,borderRadius:4,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${pct}%`,background:mc.color,borderRadius:4,transition:"width 0.6s",opacity:0.85}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:20,padding:20}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.textSoft,marginBottom:16}}>Proje Dağılımı</div>
                    {projects.map(p=>{
                      const pSec=timeLogs.filter(l=>l.projectId===p.id).reduce((a,l)=>a+l.durationSec,0);
                      const pct=totalSec>0?Math.round((pSec/totalSec)*100):0;
                      return (
                        <div key={p.id} style={{marginBottom:14}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:"50%",background:p.color,display:"inline-block"}}/><span style={{fontSize:12,fontWeight:700,color:T.textSoft}}>{p.name}</span></div>
                            <span style={{fontSize:12,fontWeight:700,color:T.textMuted}}>{fmtDuration(pSec)}</span>
                          </div>
                          <div style={{height:8,background:T.glass,borderRadius:4,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${pct}%`,background:p.color,borderRadius:4,transition:"width 0.6s",opacity:0.85}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Project modal */}
          {showProjectModal && (
            <Modal title={editingProject?"Projeyi Düzenle":"Yeni Proje"} onClose={()=>{setShowProjectModal(false);setEditingProject(null);}}>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:700,color:T.textMuted,display:"block",marginBottom:6}}>Proje Adı</label>
                <input value={newProjName} onChange={e=>setNewProjName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveProject()} placeholder="ör: Kişisel, İş, Ders..." maxLength={30} style={{width:"100%",background:T.inputBg,border:`1px solid ${T.borderLight}`,borderRadius:12,padding:"10px 14px",color:T.text,fontSize:13}}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:T.textMuted,display:"block",marginBottom:8}}>Renk</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {PROJECT_COLORS.map(col=>(
                    <button key={col} onClick={()=>setNewProjColor(col)} style={{width:32,height:32,borderRadius:"50%",background:col,border:newProjColor===col?"3px solid white":"3px solid transparent",cursor:"pointer",boxShadow:newProjColor===col?`0 0 12px ${col}88`:"none",transition:"all 0.2s"}}/>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setShowProjectModal(false);setEditingProject(null);}} style={{flex:1,background:T.glass,border:`1px solid ${T.border}`,borderRadius:14,padding:"11px",fontSize:12,fontWeight:700,color:T.textMuted,cursor:"pointer"}}>İptal</button>
                <button onClick={saveProject} style={{flex:2,background:newProjColor,border:"none",borderRadius:14,padding:"11px",fontSize:12,fontWeight:700,color:"#1a1f2e",cursor:"pointer"}}>{editingProject?"Kaydet":"Oluştur"}</button>
              </div>
              {editingProject && <button onClick={()=>{setProjects(prev=>prev.filter(p=>p.id!==editingProject.id));setShowProjectModal(false);setEditingProject(null);if(activeProjectId===editingProject.id)setActiveProjectId(projects[0]?.id||"");}} style={{width:"100%",background:"rgba(255,80,80,0.1)",border:"1px solid rgba(255,80,80,0.3)",borderRadius:14,padding:"10px",fontSize:12,fontWeight:700,color:"#ff8080",cursor:"pointer",marginTop:8}}>Projeyi Sil</button>}
            </Modal>
          )}
          <Toast msg={toast.msg} show={toast.show}/>
        </div>
      )}

      {!isBrowserFS && (
      <div onClick={handleTap} style={{width:390,height:844,background:isFocus?T.focusBg:T.bg,borderRadius:54,boxShadow:"0 0 0 10px #0d0f18,0 0 0 12px #161926,0 50px 120px rgba(0,0,0,0.85)",overflow:"hidden",position:"relative",display:"flex",flexDirection:"column",fontFamily:"'Nunito',system-ui,sans-serif",cursor:isFocus?"pointer":"default",transition:"background 0.5s ease",userSelect:"none"}}>

        {/* ══ FOCUS FULLSCREEN ══ */}
        {isFocus && (
          <div style={{position:"absolute",inset:0,zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
            <Scene big T={T}/>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)"}}/>
            <div style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center",gap:18}}>
              <Ghost activityMode={actMode} running color={cfg.color} big/>
              <Ring progress={progress} remaining={remaining} color={cfg.color} big/>
              <Dots idx={sessionIdx} color={cfg.color}/>
              {/* Active task + project */}
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,animation:"fadeIn 0.6s"}}>
                {activeTask && <div style={{background:"rgba(255,255,255,0.07)",backdropFilter:"blur(12px)",border:`1px solid ${T.borderLight}`,borderRadius:20,padding:"7px 20px",fontSize:12,fontWeight:600,color:T.textSoft,maxWidth:260,textAlign:"center"}}>{cfg.emoji} {activeTask.text}</div>}
                <ProjectBadge project={projects.find(p=>p.id===activeProjectId)}/>
              </div>
            </div>
            {/* Controls overlay */}
            <div style={{position:"absolute",inset:0,zIndex:3,display:"flex",flexDirection:"column",justifyContent:"space-between",opacity:showControls?1:0,transition:"opacity 0.6s",pointerEvents:showControls?"auto":"none"}}>
              <div style={{padding:"56px 28px 16px",background:"linear-gradient(180deg,rgba(0,0,0,0.65) 0%,transparent 100%)",display:"flex",justifyContent:"space-between",alignItems:"center",animation:"slideD 0.4s"}}>
                <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.5)"}}>{clock}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{background:"rgba(255,255,255,0.1)",backdropFilter:"blur(10px)",border:`1px solid ${T.borderLight}`,borderRadius:14,padding:"6px 16px",fontSize:11,fontWeight:700,color:cfg.color,display:"flex",alignItems:"center",gap:7}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:cfg.color,display:"inline-block",animation:"glow 1.5s infinite"}}/>
                    {cfg.emoji} {cfg.label}
                  </div>
                  <button onClick={e=>{e.stopPropagation();toggleBrowserFS();}} title={isBrowserFS?"Tam ekrandan çık":"Tam ekran"} style={{width:32,height:32,borderRadius:12,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.1)",backdropFilter:"blur(10px)",color:"rgba(255,255,255,0.7)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {isBrowserFS
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
                    }
                  </button>
                </div>
              </div>
              <div style={{padding:"16px 36px 52px",background:"linear-gradient(0deg,rgba(0,0,0,0.7) 0%,transparent 100%)",display:"flex",flexDirection:"column",alignItems:"center",gap:16,animation:"slideU 0.4s"}}>
                {/* Sound indicator + quick switcher */}
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {Object.entries(SOUNDS).map(([key,s])=>{
                    const isActive = asmr.active===key;
                    return (
                      <button key={key} onClick={e=>{e.stopPropagation();asmr.play(key);if(asmr.active!==key)setLastSound(key);}} style={{
                        width:isActive?52:38,height:38,borderRadius:14,border:"none",cursor:"pointer",
                        background:isActive?"rgba(196,181,247,0.2)":"rgba(255,255,255,0.07)",
                        outline:isActive?"1.5px solid rgba(196,181,247,0.5)":"1px solid rgba(255,255,255,0.1)",
                        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,
                        transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                      }}>
                        <span style={{fontSize:14}}>{s.emoji}</span>
                        {isActive && <div style={{display:"flex",gap:1,alignItems:"flex-end",height:6}}>
                          {[0,1,2].map(i=>(<div key={i} style={{width:2,borderRadius:1,background:"#c4b5f7",animation:`soundBar${i} ${0.5+i*0.15}s ease infinite alternate`}}/>))}
                        </div>}
                      </button>
                    );
                  })}
                  {/* Volume quick control */}
                  {asmr.active && (
                    <input type="range" min="0" max="1" step="0.05" value={asmr.volume}
                      onClick={e=>e.stopPropagation()}
                      onChange={e=>{e.stopPropagation();asmr.adjustVolume(parseFloat(e.target.value));}}
                      style={{width:70,height:4,accentColor:"#c4b5f7",cursor:"pointer"}}
                    />
                  )}
                </div>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.28)",fontWeight:600}}>Gizlemek için ekrana dokun</span>
                <div style={{display:"flex",alignItems:"center",gap:18}}>
                  <button onClick={e=>{e.stopPropagation();resetTimer();}} style={CTL_BTN}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                  <button onClick={e=>{e.stopPropagation();pauseTimer();}} style={{width:76,height:76,borderRadius:"50%",border:"none",cursor:"pointer",background:`radial-gradient(circle at 35% 35%, ${cfg.color}ee, ${cfg.color}99)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 36px ${cfg.color}66,0 4px 20px rgba(0,0,0,0.4)`}}>
                    <div style={{display:"flex",gap:5}}><div style={{width:5,height:22,borderRadius:3,background:"#fff"}}/><div style={{width:5,height:22,borderRadius:3,background:"#fff"}}/></div>
                  </button>
                  <button onClick={e=>{e.stopPropagation();skipTimer();}} style={CTL_BTN}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="5,4 15,12 5,20"/><line x1="19" y1="5" x2="19" y2="19"/></svg></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ NORMAL MODE ══ */}
        {!isFocus && <>
          {/* Dynamic Island */}
          <div style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",width:running?172:116,height:33,background:"#000",borderRadius:20,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",gap:7,transition:"width 0.45s cubic-bezier(0.34,1.56,0.64,1)",padding:"0 14px"}}>
            {running&&<><div style={{width:7,height:7,borderRadius:"50%",background:cfg.color,boxShadow:`0 0 8px ${cfg.color}`,animation:"glow 2s infinite"}}/><span style={{fontSize:11,fontWeight:700,color:"#fff"}}>{fmt(remaining)}</span></>}
          </div>
          <div style={{height:58,display:"flex",alignItems:"flex-end",justifyContent:"space-between",padding:"0 28px 8px",flexShrink:0,fontSize:13,fontWeight:700,color:T.textSoft,position:"relative",zIndex:2}}>
            <span>{clock}</span>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{background:theme==="dark"?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.07)",border:`1px solid ${T.border}`,borderRadius:20,padding:"4px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"all 0.3s",color:T.textSoft,fontSize:11,fontWeight:700}}>
                <span style={{fontSize:14}}>{theme==="dark"?"🌙":"☀️"}</span>
                <span>{theme==="dark"?"Koyu":"Açık"}</span>
              </button>
              <button onClick={toggleBrowserFS} title={isBrowserFS?"Tam ekrandan çık":"Tam ekran"} style={{background:isBrowserFS?"rgba(196,181,247,0.15)":"rgba(255,255,255,0.07)",border:`1px solid ${isBrowserFS?T.lavender+"55":T.border}`,borderRadius:20,padding:"4px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"all 0.3s",color:isBrowserFS?T.lavender:T.textSoft,fontSize:11,fontWeight:700}}>
                {isBrowserFS
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
                }
                <span>{isBrowserFS?"Küçült":"⛶ Tam"}</span>
              </button>
            </div>
          </div>
          <Toast msg={toast.msg} show={toast.show}/>

          {/* ── TIMER TAB ── */}
          {tab==="timer" && (
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",animation:"fadeUp 0.35s ease"}}>
              <div style={{position:"relative",height:128,flexShrink:0,overflow:"hidden"}}><Scene big={false} T={T}/></div>
              <div style={{flex:1,overflowY:"auto",padding:"14px 18px 0"}}>

                <ActivitySelector current={actMode} onChange={switchActivity} disabled={running} T={T} theme={theme}/>

                {/* Ghost + Ring */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:12}}>
                  <Ghost activityMode={actMode} running={running} color={cfg.color} big={false}/>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                    <Ring progress={progress} remaining={remaining} color={cfg.color} big={false}/>
                    <Dots idx={sessionIdx} color={cfg.color}/>
                  </div>
                </div>

                {/* Project selector */}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"10px 12px",background:T.glass,border:`1px solid ${T.border}`,borderRadius:16}}>
                  <span style={{fontSize:11,fontWeight:700,color:T.textMuted,flexShrink:0}}>Proje:</span>
                  <div style={{flex:1,display:"flex",gap:6,flexWrap:"wrap"}}>
                    {projects.map(p=>(
                      <button key={p.id} onClick={()=>setActiveProjectId(p.id)} style={{border:"none",cursor:"pointer",background:activeProjectId===p.id?`${p.color}22`:"transparent",borderRadius:8,padding:"3px 8px",fontSize:10,fontWeight:700,color:activeProjectId===p.id?p.color:T.textMuted,outline:activeProjectId===p.id?`1px solid ${p.color}55`:"none",transition:"all 0.2s",display:"flex",alignItems:"center",gap:4}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:p.color,display:"inline-block"}}/>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Controls */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:12}}>
                  <button onClick={resetTimer} style={{width:46,height:46,borderRadius:16,border:`1px solid ${T.border}`,background:T.glass,color:T.textMuted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </button>
                  <button onClick={()=>running?pauseTimer():setRunning(true)} style={{width:68,height:68,borderRadius:"50%",border:"none",cursor:"pointer",background:`radial-gradient(circle at 35% 35%, ${cfg.color}ee, ${cfg.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 24px ${cfg.color}55,0 4px 14px rgba(0,0,0,0.3)`,transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)"}}>
                    {running ? <div style={{display:"flex",gap:5}}><div style={{width:5,height:20,borderRadius:3,background:"#fff"}}/><div style={{width:5,height:20,borderRadius:3,background:"#fff"}}/></div> : <div style={{width:0,height:0,borderTop:"11px solid transparent",borderBottom:"11px solid transparent",borderLeft:"20px solid #fff",marginLeft:4}}/>}
                  </button>
                  <button onClick={skipTimer} style={{width:46,height:46,borderRadius:16,border:`1px solid ${T.border}`,background:T.glass,color:T.textMuted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="5,4 15,12 5,20"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                  </button>
                </div>

                {/* ASMR Sound Panel */}
                <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:18,padding:"12px 14px",marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:11,fontWeight:700,color:T.textSoft}}>🎧 ASMR Sesleri</span>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {/* Auto toggle */}
                      <button onClick={()=>setAutoSoundEnabled(a=>!a)} style={{background:autoSoundEnabled?"rgba(196,181,247,0.2)":T.glass,border:`1px solid ${autoSoundEnabled?"rgba(196,181,247,0.4)":T.border}`,borderRadius:10,padding:"3px 9px",fontSize:9,fontWeight:700,color:autoSoundEnabled?T.lavender:T.textMuted,cursor:"pointer",transition:"all 0.2s"}}>
                        {autoSoundEnabled?"⚡ Otomatik":"⚡ Manuel"}
                      </button>
                    </div>
                  </div>
                  {/* Sound buttons */}
                  <div style={{display:"flex",gap:7,marginBottom:asmr.active?10:0}}>
                    {Object.entries(SOUNDS).map(([key,s])=>{
                      const isActive = asmr.active===key;
                      return (
                        <button key={key} onClick={()=>{ asmr.play(key); if(!isActive){setLastSound(key);} }} style={{flex:1,border:"none",cursor:"pointer",borderRadius:14,padding:"8px 4px",background:isActive?"rgba(196,181,247,0.15)":T.glass,outline:`1.5px solid ${isActive?T.lavender+"55":T.border}`,transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",display:"flex",flexDirection:"column",alignItems:"center",gap:2,transform:isActive?"scale(1.05)":"scale(1)",boxShadow:isActive?`0 4px 14px rgba(196,181,247,0.25)`:"none"}}>
                          <span style={{fontSize:18}}>{s.emoji}</span>
                          <span style={{fontSize:8,fontWeight:700,color:isActive?T.lavender:T.textMuted}}>{s.label}</span>
                          {isActive && (
                            <div style={{display:"flex",gap:1.5,alignItems:"flex-end",height:10}}>
                              {[0,1,2,3,4].map(i=>(
                                <div key={i} style={{width:2,borderRadius:1,background:T.lavender,animation:`soundBar${i} ${0.6+i*0.1}s ease infinite alternate`,height:`${4+i*2}px`}}/>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Volume slider */}
                  {asmr.active && (
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:12,color:T.textMuted}}>🔈</span>
                      <input type="range" min="0" max="1" step="0.05" value={asmr.volume}
                        onChange={e=>asmr.adjustVolume(parseFloat(e.target.value))}
                        style={{flex:1,height:4,accentColor:T.lavender,cursor:"pointer"}}
                      />
                      <span style={{fontSize:12,color:T.textMuted}}>🔊</span>
                    </div>
                  )}
                </div>

                {/* Mini stats */}
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  {[{e:"✅",v:completedLogs,l:"Tamamlandı",c:T.mint},{e:"⚠️",v:incompleteLogs,l:"Eksik",c:T.yellow},{e:"⏱️",v:fmtDuration(totalSec),l:"Toplam",c:T.lavender}].map(({e,v,l,c})=>(
                    <div key={l} style={{flex:1,background:T.glass,border:`1px solid ${T.border}`,borderRadius:14,padding:"9px 6px",display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
                      <span style={{fontSize:14}}>{e}</span>
                      <span style={{fontSize:13,fontWeight:700,color:c}}>{v}</span>
                      <span style={{fontSize:9,color:T.textMuted,fontWeight:700}}>{l}</span>
                    </div>
                  ))}
                </div>

                {/* Tasks */}
                <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:20,padding:14,marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <span style={{fontSize:12,fontWeight:700,color:T.textSoft}}>📋 Görevler</span>
                    <button onClick={()=>{setInputOpen(o=>!o);setTimeout(()=>inputRef.current?.focus(),80);}} style={{width:28,height:28,borderRadius:10,border:"none",background:cfg.color+"22",color:cfg.color,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{inputOpen?"×":"+"}</button>
                  </div>
                  {inputOpen && (
                    <div style={{marginBottom:10}}>
                      <div style={{display:"flex",gap:8,marginBottom:6}}>
                        <input ref={inputRef} value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="Yeni görev..." maxLength={50} style={{flex:1,background:T.inputBg,border:`1px solid ${T.borderLight}`,borderRadius:12,padding:"9px 12px",color:T.text,fontSize:13}}/>
                        <button onClick={addTask} style={{background:cfg.color,color:"#1a1f2e",border:"none",borderRadius:12,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Ekle</button>
                      </div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {projects.map(p=>(
                          <button key={p.id} onClick={()=>setTaskProjectId(p.id)} style={{border:"none",cursor:"pointer",background:taskProjectId===p.id?`${p.color}22`:"transparent",borderRadius:8,padding:"3px 8px",fontSize:9,fontWeight:700,color:taskProjectId===p.id?p.color:T.textMuted,outline:taskProjectId===p.id?`1px solid ${p.color}55`:"none",transition:"all 0.2s",display:"flex",alignItems:"center",gap:4}}>
                            <span style={{width:5,height:5,borderRadius:"50%",background:p.color,display:"inline-block"}}/>
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {tasks.map(t=>{
                      const proj = projects.find(p=>p.id===t.projectId);
                      return (
                        <div key={t.id} onClick={()=>setTasks(p=>p.map(x=>({...x,active:x.id===t.id&&!x.done?!x.active:false})))} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:t.active?"rgba(196,181,247,0.09)":T.glass,borderRadius:14,cursor:"pointer",border:`1px solid ${t.active?"rgba(196,181,247,0.22)":T.border}`,opacity:t.done?0.38:1,transition:"all 0.2s"}}>
                          <div onClick={e=>{e.stopPropagation();const found=tasks.find(x=>x.id===t.id);if(found&&!found.done)showToast("✨ Görevi tamamladın!");setTasks(p=>p.map(x=>x.id===t.id?{...x,done:!x.done,active:false}:x));}} style={{width:20,height:20,borderRadius:7,flexShrink:0,cursor:"pointer",border:`1.5px solid ${t.done?T.mint:T.border}`,background:t.done?T.mint+"28":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                            {t.done&&<span style={{fontSize:11,color:T.mint,fontWeight:700}}>✓</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:T.textSoft,textDecoration:t.done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.text}</div>
                            <div style={{marginTop:2}}><ProjectBadge project={proj} small/></div>
                          </div>
                          <span style={{fontSize:11,color:T.textMuted,background:"rgba(255,255,255,0.05)",padding:"2px 7px",borderRadius:8,flexShrink:0}}>🍅 {t.pomos}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PROJECTS TAB ── */}
          {tab==="projects" && (
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",animation:"fadeUp 0.35s ease"}}>
              <div style={{padding:"16px 18px 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
                <span style={{fontSize:18,fontWeight:800,color:T.text}}>📁 Projeler</span>
                <button onClick={openNewProject} style={{background:T.lavender+"22",border:`1px solid ${T.lavender}44`,borderRadius:12,padding:"7px 14px",fontSize:11,fontWeight:700,color:T.lavender,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:14}}>+</span> Yeni Proje
                </button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
                {projects.map(p=>(
                  <ProjectCard key={p.id} project={p} logs={timeLogs} onEdit={()=>openEditProject(p)}/>
                ))}
                {projects.length===0 && <div style={{textAlign:"center",padding:40,color:T.textMuted,fontSize:12}}>Henüz proje yok</div>}
              </div>
            </div>
          )}

          {/* ── LOGS TAB ── */}
          {tab==="logs" && (
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",animation:"fadeUp 0.35s ease"}}>
              <div style={{padding:"16px 18px 0",flexShrink:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontSize:18,fontWeight:800,color:T.text}}>🕐 Zaman Kayıtları</span>
                  <span style={{fontSize:11,fontWeight:600,color:T.textMuted}}>{timeLogs.length} kayıt</span>
                </div>
                {/* Summary pills */}
                <div style={{display:"flex",gap:8,marginBottom:4}}>
                  <div style={{flex:1,background:T.mint+"18",border:`1px solid ${T.mint}33`,borderRadius:14,padding:"8px 12px",display:"flex",flexDirection:"column",gap:2}}>
                    <span style={{fontSize:15,fontWeight:700,color:T.mint}}>{fmtDuration(totalSec)}</span>
                    <span style={{fontSize:9,color:T.textMuted,fontWeight:700}}>Toplam Çalışma</span>
                  </div>
                  <div style={{flex:1,background:T.mint+"18",border:`1px solid ${T.mint}33`,borderRadius:14,padding:"8px 12px",display:"flex",flexDirection:"column",gap:2}}>
                    <span style={{fontSize:15,fontWeight:700,color:T.mint}}>{completedLogs}</span>
                    <span style={{fontSize:9,color:T.textMuted,fontWeight:700}}>Tamamlanan 🍅</span>
                  </div>
                  <div style={{flex:1,background:T.yellow+"18",border:`1px solid ${T.yellow}33`,borderRadius:14,padding:"8px 12px",display:"flex",flexDirection:"column",gap:2}}>
                    <span style={{fontSize:15,fontWeight:700,color:T.yellow}}>{incompleteLogs}</span>
                    <span style={{fontSize:9,color:T.textMuted,fontWeight:700}}>Eksik ⚠️</span>
                  </div>
                </div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"8px 18px 20px"}}>
                {Object.keys(logsByDate).length===0 && (
                  <div style={{textAlign:"center",padding:60,color:T.textMuted,fontSize:12}}>
                    <div style={{fontSize:40,marginBottom:10}}>👻</div>
                    Henüz kayıt yok.<br/>Timer'ı başlat!
                  </div>
                )}
                {Object.entries(logsByDate).map(([date,logs])=>{
                  const daySec = logs.reduce((a,l)=>a+l.durationSec,0);
                  return (
                    <div key={date}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,marginTop:4}}>
                        <span style={{fontSize:11,fontWeight:700,color:T.textMuted}}>{date}</span>
                        <span style={{fontSize:11,fontWeight:700,color:T.textSoft}}>{fmtDuration(daySec)}</span>
                      </div>
                      {logs.map(l=><LogEntry key={l.id} log={l} projects={projects}/>)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STATS TAB ── */}
          {tab==="stats" && (
            <div style={{flex:1,overflowY:"auto",padding:"16px 18px",animation:"fadeUp 0.4s ease"}}>
              <div style={{fontSize:18,fontWeight:800,color:T.text,marginBottom:14}}>📊 İstatistikler</div>
              {/* Overall */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                {[
                  {e:"⏱️",v:fmtDuration(totalSec),l:"Toplam Süre",c:T.lavender},
                  {e:"✅",v:completedLogs,l:"Tamamlanan",c:T.mint},
                  {e:"⚠️",v:incompleteLogs,l:"Yarıda Bırakılan",c:T.yellow},
                  {e:"📁",v:projects.length,l:"Aktif Proje",c:T.peach},
                ].map(({e,v,l,c})=>(
                  <div key={l} style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:18,padding:14}}>
                    <div style={{fontSize:20,marginBottom:5}}>{e}</div>
                    <div style={{fontSize:22,fontWeight:700,color:c}}>{v}</div>
                    <div style={{fontSize:10,color:T.textMuted,marginTop:2,fontWeight:600}}>{l}</div>
                  </div>
                ))}
              </div>
              {/* Mod dağılımı */}
              <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:20,padding:14,marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:T.textSoft,marginBottom:10}}>Mod Dağılımı</div>
                {Object.entries(ACTIVITY_MODES).map(([k,m])=>{
                  const modSec = timeLogs.filter(l=>l.activityMode===k).reduce((a,l)=>a+l.durationSec,0);
                  const pct = totalSec>0?Math.round((modSec/totalSec)*100):0;
                  return (
                    <div key={k} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:11,fontWeight:700,color:m.color}}>{m.emoji} {m.label}</span>
                        <span style={{fontSize:11,fontWeight:700,color:T.textMuted}}>{fmtDuration(modSec)} · {pct}%</span>
                      </div>
                      <div style={{height:6,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:m.color,borderRadius:3,transition:"width 0.6s",opacity:0.85}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Proje dağılımı */}
              <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:20,padding:14,marginBottom:20}}>
                <div style={{fontSize:12,fontWeight:700,color:T.textSoft,marginBottom:10}}>Proje Dağılımı</div>
                {projects.map(p=>{
                  const pSec = timeLogs.filter(l=>l.projectId===p.id).reduce((a,l)=>a+l.durationSec,0);
                  const pct = totalSec>0?Math.round((pSec/totalSec)*100):0;
                  return (
                    <div key={p.id} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:"50%",background:p.color,display:"inline-block"}}/><span style={{fontSize:11,fontWeight:700,color:T.textSoft}}>{p.name}</span></div>
                        <span style={{fontSize:11,fontWeight:700,color:T.textMuted}}>{fmtDuration(pSec)}</span>
                      </div>
                      <div style={{height:6,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:p.color,borderRadius:3,transition:"width 0.6s",opacity:0.85}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Nav */}
          <div style={{background:T.navBg,backdropFilter:"blur(20px)",borderTop:`1px solid ${T.border}`,display:"flex",padding:"10px 12px 20px",gap:2,flexShrink:0}}>
            {[
              {icon:"⏱️",label:"Timer",key:"timer"},
              {icon:"📁",label:"Projeler",key:"projects"},
              {icon:"🕐",label:"Kayıtlar",key:"logs"},
              {icon:"📊",label:"İstatistik",key:"stats"},
            ].map(({icon,label,key})=>(
              <button key={key} onClick={()=>setTab(key)} style={{flex:1,border:"none",cursor:"pointer",borderRadius:16,background:tab===key?cfg.color+"18":"transparent",padding:"8px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,transition:"all 0.2s"}}>
                <span style={{fontSize:18}}>{icon}</span>
                <span style={{fontSize:9,fontWeight:700,color:tab===key?cfg.color:T.textMuted}}>{label}</span>
              </button>
            ))}
          </div>

          {/* ── PROJECT MODAL ── */}
          {showProjectModal && (
            <Modal title={editingProject?"Projeyi Düzenle":"Yeni Proje"} onClose={()=>{setShowProjectModal(false);setEditingProject(null);}}>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:700,color:T.textMuted,display:"block",marginBottom:6}}>Proje Adı</label>
                <input value={newProjName} onChange={e=>setNewProjName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveProject()} placeholder="ör: Kişisel, İş, Ders..." maxLength={30} style={{width:"100%",background:T.inputBg,border:`1px solid ${T.borderLight}`,borderRadius:12,padding:"10px 14px",color:T.text,fontSize:13}}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:T.textMuted,display:"block",marginBottom:8}}>Renk</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {PROJECT_COLORS.map(col=>(
                    <button key={col} onClick={()=>setNewProjColor(col)} style={{width:32,height:32,borderRadius:"50%",background:col,border:newProjColor===col?"3px solid white":"3px solid transparent",cursor:"pointer",boxShadow:newProjColor===col?`0 0 12px ${col}88`:"none",transition:"all 0.2s"}}/>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setShowProjectModal(false);setEditingProject(null);}} style={{flex:1,background:T.glass,border:`1px solid ${T.border}`,borderRadius:14,padding:"11px",fontSize:12,fontWeight:700,color:T.textMuted,cursor:"pointer"}}>İptal</button>
                <button onClick={saveProject} style={{flex:2,background:newProjColor,border:"none",borderRadius:14,padding:"11px",fontSize:12,fontWeight:700,color:"#1a1f2e",cursor:"pointer"}}>
                  {editingProject?"Kaydet":"Oluştur"}
                </button>
              </div>
              {editingProject && (
                <button onClick={()=>{setProjects(prev=>prev.filter(p=>p.id!==editingProject.id));setShowProjectModal(false);setEditingProject(null);if(activeProjectId===editingProject.id)setActiveProjectId(projects[0]?.id||"");}} style={{width:"100%",background:"rgba(255,80,80,0.1)",border:"1px solid rgba(255,80,80,0.3)",borderRadius:14,padding:"10px",fontSize:12,fontWeight:700,color:"#ff8080",cursor:"pointer",marginTop:8}}>Projeyi Sil</button>
              )}
            </Modal>
          )}
        </>}
      </div>
      )}
    </div>
  );
}
