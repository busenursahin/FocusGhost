import { useState, useEffect } from "react";

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

// ── Okuma: Ghost with floating book ───────────────────────────────────────────
export function GhostRead({ running, color, big }) {
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

// ── Çalışma: Ghost with pen and paper ─────────────────────────────────────────
export function GhostWork({ running, color, big }) {
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

// ── Düzenleme: Ghost with broom (commented mode, kept for future use) ──────────
export function GhostClean({ running, color, big }) {
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

// ── Araştırma: Ghost with magnifying glass ─────────────────────────────────────
export function GhostResearch({ running, color, big }) {
  const [frame,setFrame]=useState(0); const [blink,setBlink]=useState(false); const [glassX,setGlassX]=useState(0);
  useEffect(()=>{ if(!running)return; const t=setInterval(()=>setFrame(f=>(f+1)%4),600); return()=>clearInterval(t); },[running]);
  useEffect(()=>{ const b=()=>{ setBlink(true); setTimeout(()=>setBlink(false),140); setTimeout(b,3500+Math.random()*2000); }; const t=setTimeout(b,1200); return()=>clearTimeout(t); },[]);
  useEffect(()=>{ if(!running)return; let dir=1,x=0; const t=setInterval(()=>{ x+=dir*1.2; if(x>8)dir=-1; if(x<-8)dir=1; setGlassX(x); },60); return()=>clearInterval(t); },[running]);
  const headTilt=running?[0,-3,0,3][frame]:0; const sc=big?1.7:1;
  return (
    <svg width={110*sc} height={115*sc} viewBox="0 0 110 115" style={{filter:`drop-shadow(0 0 ${big?22:12}px ${color}66)`,flexShrink:0}}>
      {running&&<>
        <rect x="5" y="84" width="100" height="6" rx="3" fill="#1a2040" stroke={color} strokeWidth="0.8" opacity="0.8"/>
        <rect x="12" y="90" width="5" height="14" rx="2" fill="#1a2040" opacity="0.6"/>
        <rect x="93" y="90" width="5" height="14" rx="2" fill="#1a2040" opacity="0.6"/>
        <rect x="18" y="74" width="32" height="10" rx="1.5" fill="#f0f4ff" opacity="0.9"/>
        {[77,79.5,82].map((y,i)=><line key={i} x1={21} y1={y} x2={21+[22,16,19][i]} y2={y} stroke={color} strokeWidth="0.7" opacity="0.6"/>)}
      </>}
      <g transform={`translate(10,0) rotate(${headTilt},40,40)`} style={{transition:"transform 0.4s ease"}}>
        <GhostBase blink={blink} running={running}>
          {running&&<>
            <path d="M10 54 Q2 58 4 68" fill="none" stroke="rgba(240,236,255,0.9)" strokeWidth="9" strokeLinecap="round"/>
            <path d="M60 50 Q70 46 72 56" fill="none" stroke="rgba(240,236,255,0.9)" strokeWidth="9" strokeLinecap="round"/>
            <g transform={`translate(${glassX},0)`}>
              <circle cx="76" cy="64" r="9.5" fill="rgba(147,197,253,0.12)" stroke={color} strokeWidth="2.5"/>
              <line x1="82" y1="71" x2="88" y2="78" stroke={color} strokeWidth="3" strokeLinecap="round"/>
              <circle cx="73" cy="61" r="2.5" fill="rgba(255,255,255,0.45)"/>
              <circle cx="78" cy="58" r="1.2" fill="rgba(255,255,255,0.3)"/>
            </g>
          </>}
        </GhostBase>
      </g>
      {running&&<>
        <text x="85" y="28" fontSize="11" fill={color} opacity={[0.9,0.2,0.6,0.2][frame]} style={{transition:"opacity 0.5s"}}>?</text>
        <text x="76" y="16" fontSize="8"  fill={color} opacity={[0.2,0.8,0.2,0.5][frame]} style={{transition:"opacity 0.5s"}}>?</text>
        <text x="94" y="20" fontSize="7"  fill={color} opacity={[0.4,0.3,0.9,0.2][frame]} style={{transition:"opacity 0.5s"}}>?</text>
      </>}
    </svg>
  );
}

// ── Kodlama: Ghost with laptop ─────────────────────────────────────────────────
export function GhostCode({ running, color, big }) {
  const [frame,setFrame]=useState(0); const [blink,setBlink]=useState(false); const [bobY,setBobY]=useState(0); const [keyIdx,setKeyIdx]=useState(0);
  useEffect(()=>{ if(!running)return; const t=setInterval(()=>{ setFrame(f=>(f+1)%6); setBobY(b=>b===0?-2:0); setKeyIdx(k=>(k+1)%9); },400); return()=>clearInterval(t); },[running]);
  useEffect(()=>{ const b=()=>{ setBlink(true); setTimeout(()=>setBlink(false),140); setTimeout(b,2800+Math.random()*2000); }; const t=setTimeout(b,1000); return()=>clearTimeout(t); },[]);
  const codeSnippets=["if(x){","fn()","</>","=> {","[]","//ok","===","null","i++"];
  const sc=big?1.7:1;
  return (
    <svg width={110*sc} height={115*sc} viewBox="0 0 110 115" style={{filter:`drop-shadow(0 0 ${big?22:12}px ${color}66)`,transform:`translateY(${bobY}px)`,transition:"transform 0.3s ease",flexShrink:0}}>
      {running&&<>
        <rect x="10" y="68" width="80" height="18" rx="3" fill="#0d1117" stroke={color} strokeWidth="1" opacity="0.95"/>
        <rect x="13" y="71" width="74" height="12" rx="2" fill={color} opacity="0.08"/>
        <rect x="14" y="72" width="72" height="1.5" rx="1" fill={color} opacity="0.25"/>
        <text x="16" y="80" fontSize="6.5" fill={color} opacity="0.85" fontFamily="monospace">{codeSnippets[frame]}</text>
        <text x="45" y="78" fontSize="5.5" fill={color} opacity="0.45" fontFamily="monospace">{codeSnippets[(frame+2)%9]}</text>
        <rect x={16+codeSnippets[frame].length*4} y="73" width="1.5" height="8" rx="1" fill={color} opacity={frame%2===0?0.9:0.1}/>
        <rect x="8" y="86" width="84" height="8" rx="3" fill="#1a1a2e" stroke={color} strokeWidth="0.7" opacity="0.9"/>
        {[0,1,2,3,4,5,6,7,8].map(i=>(
          <rect key={i} x={13+i*9} y={88} width={7} height={3.5} rx="1" fill={color} opacity={i===keyIdx&&running?0.55:0.18}/>
        ))}
        <rect x="12" y="94" width="5" height="10" rx="2" fill="#1a1a2e" opacity="0.5"/>
        <rect x="93" y="94" width="5" height="10" rx="2" fill="#1a1a2e" opacity="0.5"/>
      </>}
      <g transform="translate(10,0)">
        <GhostBase bobY={bobY} blink={blink} running={running}>
          {running&&<>
            <path d="M10 56 Q2 62 8 72" fill="none" stroke="rgba(240,236,255,0.9)" strokeWidth="9" strokeLinecap="round"/>
            <path d="M60 56 Q68 62 62 72" fill="none" stroke="rgba(240,236,255,0.9)" strokeWidth="9" strokeLinecap="round"/>
          </>}
        </GhostBase>
      </g>
      {running&&<>
        <text x="22" y={28-frame*2} fontSize="9"  fill={color} opacity={0.7-frame*0.08} fontFamily="monospace" style={{transition:"all 0.4s"}}>{"{}"}</text>
        <text x="52" y={22-frame*1.5} fontSize="8" fill={color} opacity={0.6-frame*0.07} fontFamily="monospace" style={{transition:"all 0.4s"}}>{"</>"}</text>
        <text x="76" y={32-frame*2.5} fontSize="7" fill={color} opacity={0.5-frame*0.06} fontFamily="monospace" style={{transition:"all 0.4s"}}>{"();"}</text>
      </>}
    </svg>
  );
}

// ── Ghost router ───────────────────────────────────────────────────────────────
export function Ghost({ activityMode, running, color, big }) {
  if (activityMode==="read")     return <GhostRead running={running} color={color} big={big}/>;
  if (activityMode==="work")     return <GhostWork running={running} color={color} big={big}/>;
  if (activityMode==="research") return <GhostResearch running={running} color={color} big={big}/>;
  if (activityMode==="code")     return <GhostCode running={running} color={color} big={big}/>;
  if (activityMode==="clean")    return <GhostClean running={running} color={color} big={big}/>;
  return <GhostWork running={running} color={color} big={big}/>;
}
