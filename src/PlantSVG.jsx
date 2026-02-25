import { getModeColor, ACTIVITY_MODES, fmtDate } from "./constants.js";

// ── PlantPot ──────────────────────────────────────────────────────────────────
export function PlantPot({ type, color, small, large }) {
  const w = small ? 30 : large ? 56 : 44;
  const h = small ? 46 : large ? 86 : 68;
  return (
    <svg width={w} height={h} viewBox="0 0 44 68">
      {/* ── READ: Elegant tulip / lavender bloom ── */}
      {type === "read" && <>
        <line x1="22" y1="43" x2="22" y2="18" stroke="#5a9035" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M22 37 Q13 31 15 23" fill="none" stroke="#5a9035" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M22 32 Q31 26 29 20" fill="none" stroke="#5a9035" strokeWidth="1.8" strokeLinecap="round"/>
        <ellipse cx="22" cy="11" rx="7" ry="9" fill={color} opacity="0.85"/>
        <ellipse cx="15" cy="16" rx="4.5" ry="7" fill={color} opacity="0.65" transform="rotate(-22,15,16)"/>
        <ellipse cx="29" cy="16" rx="4.5" ry="7" fill={color} opacity="0.65" transform="rotate(22,29,16)"/>
        <ellipse cx="20" cy="9" rx="2.5" ry="3.5" fill="rgba(255,255,255,0.3)"/>
      </>}

      {/* ── WORK: Succulent rosette ── */}
      {type === "work" && <>
        {Array.from({length:8},(_,i)=>{
          const a=i*45; const r=a*Math.PI/180;
          const cx=22+Math.cos(r)*10, cy=27+Math.sin(r)*8;
          return <ellipse key={i} cx={cx} cy={cy} rx="5" ry="8.5"
            fill={color} opacity="0.70"
            transform={`rotate(${a-90},${cx},${cy})`}/>;
        })}
        {Array.from({length:6},(_,i)=>{
          const a=i*60+30; const r=a*Math.PI/180;
          const cx=22+Math.cos(r)*5.5, cy=27+Math.sin(r)*4.5;
          return <ellipse key={i} cx={cx} cy={cy} rx="3.5" ry="5.5"
            fill={color} opacity="0.88"
            transform={`rotate(${a-90},${cx},${cy})`}/>;
        })}
        <circle cx="22" cy="27" r="4.5" fill={color}/>
        <circle cx="21" cy="26" r="2" fill="rgba(255,255,255,0.5)"/>
      </>}

      {/* ── CLEAN: Daisy with round petals ── */}
      {type === "clean" && <>
        <line x1="22" y1="43" x2="22" y2="26" stroke="#6aaa3a" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M22 37 Q12 33 15 25" fill="none" stroke="#6aaa3a" strokeWidth="1.8" strokeLinecap="round"/>
        {Array.from({length:9},(_,i)=>{
          const a=i*40; const rad=a*Math.PI/180;
          const px=22+Math.cos(rad)*9.5, py=18+Math.sin(rad)*9.5;
          return <ellipse key={i} cx={px} cy={py} rx="4.2" ry="6.5"
            fill={color} opacity="0.85" transform={`rotate(${a},${px},${py})`}/>;
        })}
        <circle cx="22" cy="18" r="6.5" fill="#f7d070"/>
        <circle cx="22" cy="18" r="4" fill="#e8b020"/>
        <circle cx="20" cy="16.5" r="1.3" fill="rgba(255,255,255,0.5)"/>
      </>}

      {/* ── RESEARCH: Daisy (papatya) ── */}
      {type === "research" && <>
        <line x1="22" y1="43" x2="22" y2="26" stroke="#6aaa3a" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M22 37 Q12 33 15 25" fill="none" stroke="#6aaa3a" strokeWidth="1.8" strokeLinecap="round"/>
        {Array.from({length:9},(_,i)=>{
          const a=i*40; const rad=a*Math.PI/180;
          const px=22+Math.cos(rad)*9.5, py=18+Math.sin(rad)*9.5;
          return <ellipse key={i} cx={px} cy={py} rx="4.2" ry="6.5"
            fill={color} opacity="0.85" transform={`rotate(${a},${px},${py})`}/>;
        })}
        <circle cx="22" cy="18" r="6.5" fill="#f7d070"/>
        <circle cx="22" cy="18" r="4" fill="#e8b020"/>
        <circle cx="20" cy="16.5" r="1.3" fill="rgba(255,255,255,0.5)"/>
      </>}

      {/* ── CODE: Cactus (kaktüs) ── */}
      {type === "code" && <>
        <rect x="18" y="18" width="8" height="26" rx="4" fill={color} opacity="0.9"/>
        <rect x="9" y="24" width="10" height="5" rx="2.5" fill={color} opacity="0.8"/>
        <rect x="9" y="17" width="5" height="12" rx="2.5" fill={color} opacity="0.8"/>
        <rect x="25" y="28" width="10" height="5" rx="2.5" fill={color} opacity="0.8"/>
        <rect x="30" y="20" width="5" height="14" rx="2.5" fill={color} opacity="0.8"/>
        {[[22,22],[22,29],[22,36],[13,20],[13,26],[32,24],[32,31]].map(([cx,cy],i)=>(
          <circle key={i} cx={cx} cy={cy} r="1" fill="rgba(255,255,255,0.5)"/>
        ))}
        <rect x="20" y="20" width="2" height="18" rx="1" fill="rgba(255,255,255,0.2)"/>
      </>}

      {/* ── Pot ── */}
      <ellipse cx="22" cy="45" rx="13" ry="3.5" fill="#3a2415"/>
      <ellipse cx="22" cy="44" rx="10" ry="2" fill="#2a1a0e"/>
      <rect x="7" y="41" width="30" height="6" rx="3" fill="#c07045"/>
      <path d="M10 47 L34 47 L31 63 L13 63 Z" fill="#9e5632"/>
      <path d="M10 47 L34 47 L34 51 L10 51 Z" fill="rgba(192,112,69,0.5)"/>
      <path d="M12 50 Q12.5 58 13 62" stroke="rgba(255,200,160,0.18)" strokeWidth="1.5" strokeLinecap="round"/>
      <ellipse cx="22" cy="64" rx="16" ry="3.5" fill="#7a3f1e" opacity="0.6"/>
    </svg>
  );
}

// ── Garden Sky ─────────────────────────────────────────────────────────────────
export function GardenSky({ theme, big, style }) {
  const isLight = theme === "light";
  return (
    <div style={{background:isLight?"linear-gradient(180deg,#87ceeb 0%,#b8e4f7 100%)":"linear-gradient(180deg,#080e1e 0%,#0e1428 100%)",position:"relative",overflow:"hidden",...style}}>
      {!isLight&&[[8,8],[22,14],[40,6],[60,18],[75,9],[88,20],[50,25],[35,35],[80,40],[15,45]].map(([x,y],i)=>(
        <div key={i} style={{position:"absolute",left:`${x}%`,top:`${y}%`,width:2,height:2,borderRadius:"50%",background:"rgba(255,255,255,0.7)"}}/>
      ))}
      {isLight&&[[20,15],[62,22],[45,8]].map(([x,y],i)=>(
        <div key={i} style={{position:"absolute",left:`${x}%`,top:`${y}%`,display:"flex"}}>
          <div style={{width:36,height:18,borderRadius:"50%",background:"rgba(255,255,255,0.85)"}}/>
          <div style={{width:28,height:14,borderRadius:"50%",background:"rgba(255,255,255,0.9)",marginLeft:-8,marginTop:4}}/>
        </div>
      ))}
      {!isLight&&<>
        <div style={{position:"absolute",top:"10%",right:"8%",width:32,height:32,borderRadius:"50%",background:"#f0e8c8",boxShadow:"0 0 20px rgba(240,232,200,0.5)"}}/>
        <div style={{position:"absolute",top:"10%",right:"5%",width:32,height:32,borderRadius:"50%",background:"#080e1e"}}/>
      </>}
      {isLight&&<div style={{position:"absolute",top:"10%",left:"5%",width:40,height:40,borderRadius:"50%",background:"#FFD700",boxShadow:"0 0 24px rgba(255,215,0,0.7)"}}/>}
      <div style={{position:"absolute",right:big?28:12,bottom:0,opacity:0.75,animation:"float 3s ease infinite"}}>
        <svg width={big?52:26} height={big?64:32} viewBox="0 0 80 80">
          <path d="M12 65 Q18 72 24 65 Q30 75 36 65 Q42 72 48 65 Q54 75 60 65 Q66 72 68 65 L68 42 Q68 10 40 10 Q12 10 12 42 Z" fill="rgba(240,236,255,0.9)"/>
          <ellipse cx="33" cy="40" rx="4" ry="4" fill="#6b5fa0"/>
          <ellipse cx="47" cy="40" rx="4" ry="4" fill="#6b5fa0"/>
          <circle cx="35" cy="38.5" r="1.3" fill="white" opacity="0.7"/>
          <circle cx="49" cy="38.5" r="1.3" fill="white" opacity="0.7"/>
          <path d="M35 52 Q40 56 45 52" fill="none" stroke="#6b5fa0" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

// ── Garden Shelf (wooden shelf with plants) ────────────────────────────────────
export function GardenShelf({ plants, theme, big }) {
  const isLight = theme === "light";
  return (
    <div style={{background:isLight?"#a0724a":"#6b4422",padding:big?"14px 20px 18px":"10px 12px 14px",position:"relative",flexShrink:0,width:"100%"}}>
      {[0,1,2,3,4,5,6,7,8,9,10].map(i=>(
        <div key={i} style={{position:"absolute",left:`${i*10}%`,top:0,bottom:0,width:1,background:"rgba(0,0,0,0.07)"}}/>
      ))}
      <div style={{display:"flex",flexWrap:"wrap",gap:big?10:6,position:"relative",zIndex:1,minHeight:big?110:90}}>
        {plants.length===0 && (
          <div style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.3)",fontSize:12,fontWeight:600}}>
            Henüz bitki yok 🪴
          </div>
        )}
        {plants.map((plant,idx)=>{
          const pc=getModeColor(plant.type,theme).color;
          return (
            <div key={plant.id} title={`${ACTIVITY_MODES[plant.type]?.label} · ${fmtDate(new Date(plant.plantedAt))}`}
              style={{animation:idx===plants.length-1?"popIn 0.55s cubic-bezier(0.34,1.56,0.64,1)":"none"}}>
              <PlantPot type={plant.type} color={pc} large/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── GardenScene: sky + shelf (used in mobile / no-plants full-height) ──────────
export function GardenScene({ plants, theme, tall, big }) {
  return (
    <div style={{display:"flex",flexDirection:"column",width:"100%",height:"100%",flex:tall?1:"none",borderRadius:big?0:20,overflow:"hidden",border:big?"none":"1px solid rgba(0,0,0,0.09)"}}>
      <GardenSky theme={theme} big={big} style={{flex:tall?1:"none",height:tall?undefined:72,minHeight:tall?140:undefined}}/>
      <GardenShelf plants={plants} theme={theme} big={big}/>
    </div>
  );
}
