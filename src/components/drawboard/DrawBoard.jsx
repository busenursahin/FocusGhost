import { useState, useRef, useEffect, useCallback } from "react";
import { GhostDraw } from "../../GhostSVG.jsx";

/* ─────────────────────────────────────────────
   DrawBoard — Excalidraw-style canvas component
   ───────────────────────────────────────────── */

const TOOLS = [
  { id:"select",  key:"V", label:"Seç",        icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l14 9-7 1-3 7L5 3z"/></svg> },
  { id:"_sep1" },
  { id:"pencil",  key:"P", label:"Kalem",       icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> },
  { id:"line",    key:"L", label:"Çizgi",       icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="19" x2="19" y2="5"/></svg> },
  { id:"arrow",   key:"A", label:"Ok",          icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/></svg> },
  { id:"_sep2" },
  { id:"rect",    key:"R", label:"Dikdörtgen",  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> },
  { id:"ellipse", key:"E", label:"Elips",       icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="10" ry="10"/></svg> },
  { id:"diamond", key:"D", label:"Elmas",       icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 12 12 22 2 12"/></svg> },
  { id:"_sep3" },
  { id:"text",    key:"T", label:"Metin",       icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg> },
  { id:"eraser",  key:"X", label:"Silgi",       icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg> },
  { id:"_sep4" },
  { id:"hand",    key:"H", label:"El",          icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2V17c0 2.8 2.2 5 5 5h4a5 5 0 0 0 5-5v-1a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2"/></svg> },
];

const SNAP_DIST = 24;
const HANDLE_R = 5;
const LS_KEY = "fg_drawboards";

function useLocalDrawboards() {
  const [boards, setBoards] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) return p; }
    } catch {}
    return [{ id:"b1", name:"Tahta 1", elements:[], history:[[]], histIdx:0, offset:{x:0,y:0}, zoom:1 }];
  });
  const counterRef = useRef(boards.length);
  const save = useCallback((b) => { try { localStorage.setItem(LS_KEY, JSON.stringify(b)); } catch {} }, []);
  return { boards, setBoards, counterRef, save };
}

export default function DrawBoard({ T, theme }) {
  const accent = "#e94560";
  const isDark = theme === "dark";

  // Board management
  const { boards, setBoards, counterRef, save } = useLocalDrawboards();
  const [activeBoardId, setActiveBoardId] = useState(null);
  const activeBoard = boards.find(b => b.id === activeBoardId);

  // Confirm dialog
  const [confirmDel, setConfirmDel] = useState(null); // board id to delete

  // Canvas refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const textRef = useRef(null);

  // Drawing state
  const [tool, setToolState] = useState("select");
  const [elements, setElements] = useState([]);
  const historyRef = useRef([[]]);
  const histIdxRef = useRef(0);
  const [offset, setOffset] = useState({x:0, y:0});
  const [zoom, setZoom] = useState(1);
  const [selectedEls, setSelectedEls] = useState([]);
  const drawingRef = useRef(false);
  const startRef = useRef({x:0,y:0});
  const currentElRef = useRef(null);
  const pencilPathRef = useRef([]);
  const panStartRef = useRef(null);
  const dragStartRef = useRef(null);
  const marqueeRef = useRef(null);
  const resizeStartRef = useRef(null);
  const spaceRef = useRef(false);
  const prevToolRef = useRef("select");
  const activeTextRef = useRef(null);
  const editingShapeRef = useRef(null);
  const elCounterRef = useRef(0);
  const clipboardRef = useRef(null);
  const renderReqRef = useRef(null);

  // Props
  const [props, setProps] = useState({
    strokeColor:"#e94560", fillColor:"#533483",
    strokeWidth:2, opacity:1, dash:"solid", fontSize:20, fill:false
  });

  // ── Helpers ──
  const toWorld = useCallback((cx, cy) => ({x:(cx-offset.x)/zoom, y:(cy-offset.y)/zoom}), [offset, zoom]);
  const genId = useCallback(() => "el_"+(++elCounterRef.current), []);
  const snap = useCallback(() => ({
    id: genId(), strokeColor:props.strokeColor, fillColor:props.fillColor,
    strokeWidth:props.strokeWidth, opacity:props.opacity, dash:props.dash,
    fontSize:props.fontSize, fill:props.fill
  }), [genId, props]);

  const setTool = useCallback((t) => {
    setToolState(t);
    const c = canvasRef.current;
    if(c) c.style.cursor = t==="hand"?"grab":t==="select"?"default":t==="eraser"?"cell":"crosshair";
  }, []);

  // ── BBox / Hit ──
  const getBBox = useCallback((e) => {
    if (!e) return null;
    if (e.type === "pencil") {
      if (!e.path || !e.path.length) return null;
      const xs = e.path.map(p=>p.x), ys = e.path.map(p=>p.y);
      const x = Math.min(...xs), y = Math.min(...ys);
      return {x, y, w:Math.max(...xs)-x, h:Math.max(...ys)-y};
    }
    if (e.type === "text") {
      const c = canvasRef.current; if(!c) return null;
      const ctx = c.getContext("2d");
      ctx.font = `${e.fontSize}px 'Caveat',cursive`;
      const m = ctx.measureText(e.text||"M");
      return {x:e.x, y:e.y-e.fontSize, w:Math.max(m.width,20), h:e.fontSize*1.2};
    }
    const x = Math.min(e.x1,e.x2), y = Math.min(e.y1,e.y2);
    return {x, y, w:Math.abs(e.x2-e.x1), h:Math.abs(e.y2-e.y1)};
  }, []);

  const hitTest = useCallback((e, wx, wy) => {
    const bb = getBBox(e); if(!bb) return false;
    return wx>=bb.x-8&&wx<=bb.x+bb.w+8&&wy>=bb.y-8&&wy<=bb.y+bb.h+8;
  }, [getBBox]);

  const boxIn = useCallback((bb,mx,my,mw,mh) => {
    if(!bb) return false;
    return bb.x<mx+mw&&bb.x+bb.w>mx&&bb.y<my+mh&&bb.y+bb.h>my;
  }, []);

  const getHandles = useCallback((bb) => {
    const {x,y,w,h} = bb;
    const cx=x+w/2, cy=y+h/2;
    return [
      {id:"nw",x,y,cur:"nw-resize"},{id:"n",x:cx,y,cur:"n-resize"},{id:"ne",x:x+w,y,cur:"ne-resize"},
      {id:"e",x:x+w,y:cy,cur:"e-resize"},{id:"se",x:x+w,y:y+h,cur:"se-resize"},
      {id:"s",x:cx,y:y+h,cur:"s-resize"},{id:"sw",x,y:y+h,cur:"sw-resize"},{id:"w",x,y:cy,cur:"w-resize"},
    ];
  }, []);

  const hitHandle = useCallback((bb, wx, wy) => {
    const r = HANDLE_R / zoom;
    for (const h of getHandles(bb)) {
      if (Math.abs(wx-h.x)<=r && Math.abs(wy-h.y)<=r) return h;
    }
    return null;
  }, [zoom, getHandles]);

  // ── Connector helpers ──
  const findSnapShape = useCallback((wx, wy, excludeId, els) => {
    let best = null, bestD = SNAP_DIST;
    for (const el of els) {
      if (el.id === excludeId) continue;
      if (["pencil","text","line","arrow"].includes(el.type)) continue;
      const bb = getBBox(el); if(!bb) continue;
      const cx=bb.x+bb.w/2, cy=bb.y+bb.h/2;
      const pts = [{x:cx,y:bb.y},{x:cx,y:bb.y+bb.h},{x:bb.x,y:cy},{x:bb.x+bb.w,y:cy},{x:cx,y:cy}];
      for (const p of pts) {
        const d = Math.hypot(wx-p.x,wy-p.y);
        if (d<bestD) { bestD=d; best=el; }
      }
    }
    return best;
  }, [getBBox]);

  const shapeAnchor = useCallback((el, fromX, fromY) => {
    const bb = getBBox(el); if(!bb) return null;
    const cx=bb.x+bb.w/2, cy=bb.y+bb.h/2;
    const dx=fromX-cx, dy=fromY-cy;
    if(dx===0&&dy===0) return {x:cx,y:bb.y};
    const absX=Math.abs(dx), absY=Math.abs(dy);
    if(el.type==="ellipse"){const rx=bb.w/2,ry=bb.h/2,len=Math.hypot(dx/rx,dy/ry);return{x:cx+dx/len,y:cy+dy/len};}
    if(el.type==="diamond"){const rx=bb.w/2,ry=bb.h/2,t=Math.min(rx/absX,ry/absY);return{x:cx+dx*t,y:cy+dy*t};}
    const tx=absX>0?(dx>0?bb.w/2:-bb.w/2)/dx:Infinity;
    const ty=absY>0?(dy>0?bb.h/2:-bb.h/2)/dy:Infinity;
    const t2=Math.min(Math.abs(tx),Math.abs(ty));
    return {x:cx+dx*t2,y:cy+dy*t2};
  }, [getBBox]);

  const resolveConnectors = useCallback((els) => {
    for (const el of els) {
      if(el.type!=="arrow") continue;
      if(el.startShape){const sh=els.find(e=>e.id===el.startShape);if(sh){const a=shapeAnchor(sh,el.x2,el.y2);if(a){el.x1=a.x;el.y1=a.y;}}else delete el.startShape;}
      if(el.endShape){const sh=els.find(e=>e.id===el.endShape);if(sh){const a=shapeAnchor(sh,el.x1,el.y1);if(a){el.x2=a.x;el.y2=a.y;}}else delete el.endShape;}
    }
  }, [shapeAnchor]);

  // ── Resize ──
  const applyResize = useCallback((el, origEl, handle, dx, dy) => {
    const obb = getBBox(origEl); if(!obb) return;
    if(el.type==="text"){
      const origH=origEl.fontSize*1.2;
      const newH=Math.max(8,origH+(handle.id.includes("s")?dy:handle.id.includes("n")?-dy:0)+(handle.id.includes("e")?dx:handle.id.includes("w")?-dx:0));
      el.fontSize=Math.max(8,Math.round(origEl.fontSize*(newH/origH)));
      if(handle.id.includes("n"))el.y=origEl.y+dy;
      if(handle.id.includes("w"))el.x=origEl.x+dx;
      return;
    }
    if(el.type==="pencil"){
      const ow=Math.max(1,obb.w),oh=Math.max(1,obb.h);
      let nx1=obb.x,ny1=obb.y,nx2=obb.x+obb.w,ny2=obb.y+obb.h;
      if(handle.id.includes("n"))ny1+=dy;if(handle.id.includes("s"))ny2+=dy;
      if(handle.id.includes("w"))nx1+=dx;if(handle.id.includes("e"))nx2+=dx;
      nx2=Math.max(nx1+1,nx2);ny2=Math.max(ny1+1,ny2);
      const sx=(nx2-nx1)/ow,sy=(ny2-ny1)/oh;
      el.path=origEl.path.map(p=>({x:nx1+(p.x-obb.x)*sx,y:ny1+(p.y-obb.y)*sy}));
      return;
    }
    let x1=origEl.x1,y1=origEl.y1,x2=origEl.x2,y2=origEl.y2;
    const minX=Math.min(x1,x2),minY=Math.min(y1,y2),maxX=Math.max(x1,x2),maxY=Math.max(y1,y2);
    let nx1=minX,ny1=minY,nx2=maxX,ny2=maxY;
    if(handle.id.includes("n"))ny1+=dy;if(handle.id.includes("s"))ny2+=dy;
    if(handle.id.includes("w"))nx1+=dx;if(handle.id.includes("e"))nx2+=dx;
    if(nx2-nx1<4){if(handle.id.includes("w"))nx1=nx2-4;else nx2=nx1+4;}
    if(ny2-ny1<4){if(handle.id.includes("n"))ny1=ny2-4;else ny2=ny1+4;}
    if(["line","arrow"].includes(el.type)){
      const ow=Math.max(1,maxX-minX),oh=Math.max(1,maxY-minY);
      const sx=(nx2-nx1)/ow,sy=(ny2-ny1)/oh;
      el.x1=nx1+(origEl.x1-minX)*sx;el.y1=ny1+(origEl.y1-minY)*sy;
      el.x2=nx1+(origEl.x2-minX)*sx;el.y2=ny1+(origEl.y2-minY)*sy;
    } else {
      el.x1=nx1;el.y1=ny1;el.x2=nx2;el.y2=ny2;
    }
  }, [getBBox]);

  // ── Draw element ──
  const drawEl = useCallback((c, e) => {
    c.save();
    c.globalAlpha = e.opacity;
    c.strokeStyle = e.strokeColor;
    c.fillStyle = e.fillColor;
    c.lineWidth = e.strokeWidth;
    c.lineCap="round"; c.lineJoin="round";
    if(e.dash==="dashed")c.setLineDash([8,5]);
    else if(e.dash==="dotted")c.setLineDash([2,6]);
    else c.setLineDash([]);

    const drawLabel = (text,color,cx,cy,maxW,fs) => {
      if(!text)return;
      c.save();c.font=`${fs}px 'Caveat',cursive`;c.fillStyle=color;c.textAlign="center";c.textBaseline="middle";
      const words=text.split(" "),lineH=fs*1.2;let lines=[],line="";
      for(const w of words){const test=line?line+" "+w:w;if(c.measureText(test).width>maxW&&line){lines.push(line);line=w;}else line=test;}
      if(line)lines.push(line);
      const totalH=lines.length*lineH;let sy=cy-(totalH-lineH)/2;
      for(const l of lines){c.fillText(l,cx,sy);sy+=lineH;}
      c.restore();
    };

    if(e.type==="pencil"){
      if(!e.path||e.path.length<2){c.restore();return;}
      c.beginPath();c.moveTo(e.path[0].x,e.path[0].y);
      for(let i=1;i<e.path.length;i++){const p=e.path[i-1],q=e.path[i];c.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}
      c.stroke();
    } else if(e.type==="line"){
      c.beginPath();c.moveTo(e.x1,e.y1);c.lineTo(e.x2,e.y2);c.stroke();
      if(e.label){const mx=(e.x1+e.x2)/2,my=(e.y1+e.y2)/2;drawLabel(e.label,e.strokeColor,mx,my-14,120,e.labelSize||16);}
    } else if(e.type==="arrow"){
      c.beginPath();c.moveTo(e.x1,e.y1);c.lineTo(e.x2,e.y2);c.stroke();
      const a=Math.atan2(e.y2-e.y1,e.x2-e.x1),l=14+e.strokeWidth;
      c.beginPath();c.moveTo(e.x2,e.y2);c.lineTo(e.x2-l*Math.cos(a-0.45),e.y2-l*Math.sin(a-0.45));c.moveTo(e.x2,e.y2);c.lineTo(e.x2-l*Math.cos(a+0.45),e.y2-l*Math.sin(a+0.45));c.stroke();
      if(e.label){const mx=(e.x1+e.x2)/2,my=(e.y1+e.y2)/2;drawLabel(e.label,e.strokeColor,mx,my-14,120,e.labelSize||16);}
    } else if(e.type==="rect"){
      const x=Math.min(e.x1,e.x2),y=Math.min(e.y1,e.y2),w=Math.abs(e.x2-e.x1),h=Math.abs(e.y2-e.y1);
      if(e.fill)c.fillRect(x,y,w,h);c.strokeRect(x,y,w,h);
      if(e.label)drawLabel(e.label,e.strokeColor,(e.x1+e.x2)/2,(e.y1+e.y2)/2,w-12,e.labelSize||18);
    } else if(e.type==="ellipse"){
      const cx2=(e.x1+e.x2)/2,cy2=(e.y1+e.y2)/2,rx=Math.abs(e.x2-e.x1)/2,ry=Math.abs(e.y2-e.y1)/2;
      c.beginPath();c.ellipse(cx2,cy2,rx,ry,0,0,Math.PI*2);if(e.fill)c.fill();c.stroke();
      if(e.label)drawLabel(e.label,e.strokeColor,cx2,cy2,(rx*2-12)*0.85,e.labelSize||18);
    } else if(e.type==="diamond"){
      const cx2=(e.x1+e.x2)/2,cy2=(e.y1+e.y2)/2,rx=Math.abs(e.x2-e.x1)/2,ry=Math.abs(e.y2-e.y1)/2;
      c.beginPath();c.moveTo(cx2,cy2-ry);c.lineTo(cx2+rx,cy2);c.lineTo(cx2,cy2+ry);c.lineTo(cx2-rx,cy2);c.closePath();
      if(e.fill)c.fill();c.stroke();
      if(e.label)drawLabel(e.label,e.strokeColor,cx2,cy2,(rx-8),e.labelSize||18);
    } else if(e.type==="text"){
      c.font=`${e.fontSize}px 'Caveat',cursive`;c.fillStyle=e.strokeColor;c.fillText(e.text,e.x,e.y);
    }
    c.restore();
  }, []);

  // ── Render ──
  const render = useCallback(() => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const bgColor = isDark ? "#1a1a2e" : "#f0f0f0";
    ctx.fillStyle = bgColor;
    ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(offset.x,offset.y);ctx.scale(zoom,zoom);
    // grid
    const gridColor = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)";
    ctx.save();ctx.strokeStyle=gridColor;ctx.lineWidth=1/zoom;
    const gs=40,sx=Math.floor(-offset.x/zoom/gs)*gs,sy=Math.floor(-offset.y/zoom/gs)*gs,ex=sx+W/zoom+gs,ey=sy+H/zoom+gs;
    for(let x=sx;x<ex;x+=gs){ctx.beginPath();ctx.moveTo(x,sy);ctx.lineTo(x,ey);ctx.stroke();}
    for(let y=sy;y<ey;y+=gs){ctx.beginPath();ctx.moveTo(sx,y);ctx.lineTo(ex,y);ctx.stroke();}
    ctx.restore();
    elements.forEach(e=>{
      const editing = editingShapeRef.current;
      if(editing && editing.id===e.id && e.label){
        const clone={...e,label:""};drawEl(ctx,clone);
      } else drawEl(ctx,e);
    });
    if(currentElRef.current) drawEl(ctx,currentElRef.current);
    // selection
    ctx.save();ctx.strokeStyle=accent;ctx.lineWidth=1.5/zoom;ctx.setLineDash([5/zoom,3/zoom]);
    for(const e of selectedEls){const bb=getBBox(e);if(bb)ctx.strokeRect(bb.x-4/zoom,bb.y-4/zoom,bb.w+8/zoom,bb.h+8/zoom);}
    if(selectedEls.length===1){
      const bb=getBBox(selectedEls[0]);
      if(bb){
        const pad=4/zoom;
        const hbb={x:bb.x-pad,y:bb.y-pad,w:bb.w+pad*2,h:bb.h+pad*2};
        ctx.setLineDash([]);ctx.strokeStyle=accent;ctx.fillStyle="#fff";ctx.lineWidth=1.5/zoom;
        for(const h of getHandles(hbb)){const r=HANDLE_R/zoom;ctx.beginPath();ctx.arc(h.x,h.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();}
      }
    }
    ctx.restore();
    // marquee
    const m = marqueeRef.current;
    if(m){
      const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1);
      ctx.save();ctx.strokeStyle=accent;ctx.fillStyle="rgba(233,69,96,0.07)";ctx.lineWidth=1.5/zoom;ctx.setLineDash([5/zoom,3/zoom]);
      ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);ctx.restore();
    }
    ctx.restore();
  }, [elements, selectedEls, offset, zoom, isDark, drawEl, getBBox, getHandles]);

  // ── History ──
  const saveHistory = useCallback((els) => {
    const h = historyRef.current;
    const idx = histIdxRef.current;
    historyRef.current = h.slice(0, idx+1);
    historyRef.current.push(JSON.parse(JSON.stringify(els)));
    histIdxRef.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if(histIdxRef.current > 0){
      histIdxRef.current--;
      const els = JSON.parse(JSON.stringify(historyRef.current[histIdxRef.current]));
      setElements(els);
      setSelectedEls([]);
    }
  }, []);

  const redo = useCallback(() => {
    if(histIdxRef.current < historyRef.current.length - 1){
      histIdxRef.current++;
      const els = JSON.parse(JSON.stringify(historyRef.current[histIdxRef.current]));
      setElements(els);
      setSelectedEls([]);
    }
  }, []);

  // ── Board operations ──
  const openBoard = useCallback((id) => {
    const b = boards.find(x=>x.id===id);
    if(!b) return;
    setActiveBoardId(id);
    setElements(JSON.parse(JSON.stringify(b.elements||[])));
    historyRef.current = JSON.parse(JSON.stringify(b.history||[[]]));
    histIdxRef.current = b.histIdx||0;
    setOffset(b.offset||{x:0,y:0});
    setZoom(b.zoom||1);
    setSelectedEls([]);
    currentElRef.current = null;
    drawingRef.current = false;
  }, [boards]);

  const saveCurrent = useCallback(() => {
    if(!activeBoardId) return boards;
    return boards.map(b => b.id===activeBoardId ? {
      ...b, elements:JSON.parse(JSON.stringify(elements)),
      history:JSON.parse(JSON.stringify(historyRef.current)),
      histIdx:histIdxRef.current, offset, zoom
    } : b);
  }, [activeBoardId, boards, elements, offset, zoom]);

  const goHome = useCallback(() => {
    const updated = saveCurrent();
    setBoards(updated);
    save(updated);
    setActiveBoardId(null);
  }, [saveCurrent, setBoards, save]);

  const newBoard = useCallback(() => {
    counterRef.current++;
    const b = {id:"b"+counterRef.current, name:"Tahta "+counterRef.current, elements:[], history:[[]], histIdx:0, offset:{x:0,y:0}, zoom:1};
    const updated = [...saveCurrent(), b];
    setBoards(updated);
    save(updated);
    openBoard(b.id);
  }, [saveCurrent, setBoards, save, openBoard, counterRef]);

  const deleteBoard = useCallback((id) => {
    if(boards.length <= 1) return;
    const updated = boards.filter(b=>b.id!==id);
    setBoards(updated);
    save(updated);
    if(activeBoardId===id) setActiveBoardId(null);
  }, [boards, setBoards, save, activeBoardId]);

  // ── Canvas resize ──
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current, ct = containerRef.current;
      if(!c||!ct) return;
      c.width = ct.clientWidth;
      c.height = ct.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [activeBoardId]);

  // ── Render loop ──
  useEffect(() => {
    if(!activeBoardId) return;
    if(renderReqRef.current) cancelAnimationFrame(renderReqRef.current);
    renderReqRef.current = requestAnimationFrame(render);
  }, [render, activeBoardId]);

  // ── Auto-save ──
  useEffect(() => {
    if(!activeBoardId) return;
    const t = setTimeout(() => {
      const updated = saveCurrent();
      setBoards(updated);
      save(updated);
    }, 1500);
    return () => clearTimeout(t);
  }, [elements, offset, zoom]);

  // ── Text input handling ──
  const hideText = useCallback(() => {
    const inp = textRef.current; if(!inp || inp.style.display!=="block") return;
    if(editingShapeRef.current){
      editingShapeRef.current.label = inp.value;
      editingShapeRef.current.labelSize = props.fontSize;
      saveHistory(elements);
      editingShapeRef.current = null;
    } else if(activeTextRef.current){
      if(inp.value.trim()){
        activeTextRef.current.text = inp.value;
        const newEls = [...elements, activeTextRef.current];
        setElements(newEls);
        saveHistory(newEls);
      }
      activeTextRef.current = null;
    }
    inp.style.display = "none";
    inp.value = "";
  }, [elements, props.fontSize, saveHistory]);

  const showText = useCallback((wx, wy) => {
    const inp = textRef.current; if(!inp) return;
    const sx=wx*zoom+offset.x, sy=wy*zoom+offset.y;
    inp.style.display="block";
    inp.style.left=sx+"px";
    inp.style.top=(sy-props.fontSize)+"px";
    inp.style.fontSize=(props.fontSize*zoom)+"px";
    inp.style.color=props.strokeColor;
    inp.style.width="";
    inp.style.textAlign="";
    inp.value="";inp.focus();
    editingShapeRef.current = null;
    activeTextRef.current = {type:"text",text:"",x:wx,y:wy,fontSize:props.fontSize,...snap()};
  }, [zoom, offset, props, snap]);

  const editShapeLabel = useCallback((el) => {
    const inp = textRef.current; if(!inp) return;
    const shapeTypes = ["rect","ellipse","diamond","line","arrow"];
    if(!shapeTypes.includes(el.type)) return;
    const bb = getBBox(el); if(!bb) return;
    editingShapeRef.current = el;
    activeTextRef.current = null;
    const cx=bb.x+bb.w/2, cy=bb.y+bb.h/2;
    const fs = el.labelSize || 18;
    const sx=cx*zoom+offset.x, sy=cy*zoom+offset.y;
    const inputW=Math.max(120,bb.w*zoom-16);
    inp.style.display="block";
    inp.style.left=(sx-inputW/2)+"px";
    inp.style.top=(sy-fs*zoom*0.6)+"px";
    inp.style.fontSize=(fs*zoom)+"px";
    inp.style.color=el.strokeColor;
    inp.style.width=inputW+"px";
    inp.style.textAlign="center";
    inp.value=el.label||"";
    inp.focus();
    inp.select();
  }, [getBBox, zoom, offset]);

  // ── Mouse handlers ──
  const onMouseDown = useCallback((e) => {
    if(e.button!==0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const {x:wx,y:wy} = {x:(cx-offset.x)/zoom, y:(cy-offset.y)/zoom};

    if(spaceRef.current){panStartRef.current={x:cx-offset.x,y:cy-offset.y};canvasRef.current.style.cursor="grabbing";return;}
    if(tool==="hand"){panStartRef.current={x:cx-offset.x,y:cy-offset.y};canvasRef.current.style.cursor="grabbing";return;}
    hideText();
    if(tool==="text"){showText(wx,wy);return;}
    if(tool==="select"){
      if(selectedEls.length===1){
        const bb=getBBox(selectedEls[0]);
        if(bb){
          const pad=4/zoom;
          const hbb={x:bb.x-pad,y:bb.y-pad,w:bb.w+pad*2,h:bb.h+pad*2};
          const h=hitHandle(hbb,wx,wy);
          if(h){resizeStartRef.current={handle:h,el:selectedEls[0],origEl:JSON.parse(JSON.stringify(selectedEls[0])),wx,wy};canvasRef.current.style.cursor=h.cur;return;}
        }
      }
      const cs=selectedEls.find(el=>hitTest(el,wx,wy));
      if(cs){dragStartRef.current={wx,wy,origEls:JSON.parse(JSON.stringify(selectedEls))};return;}
      let hit=null;for(let i=elements.length-1;i>=0;i--){if(hitTest(elements[i],wx,wy)){hit=elements[i];break;}}
      if(hit){
        if(e.shiftKey){const newSel=[...selectedEls];const i=newSel.indexOf(hit);if(i===-1)newSel.push(hit);else newSel.splice(i,1);setSelectedEls(newSel);}
        else setSelectedEls([hit]);
        dragStartRef.current={wx,wy,origEls:JSON.parse(JSON.stringify(hit?[hit]:[]))};
      } else {
        setSelectedEls([]);
        marqueeRef.current={x1:wx,y1:wy,x2:wx,y2:wy};
      }
      return;
    }
    if(tool==="eraser"){
      for(let i=elements.length-1;i>=0;i--){
        if(hitTest(elements[i],wx,wy)){
          const newEls=[...elements];newEls.splice(i,1);setElements(newEls);saveHistory(newEls);return;
        }
      }
      return;
    }
    drawingRef.current=true;startRef.current={x:wx,y:wy};
    if(tool==="pencil"){pencilPathRef.current=[{x:wx,y:wy}];currentElRef.current={type:"pencil",path:pencilPathRef.current,...snap()};}
    else currentElRef.current={type:tool,x1:wx,y1:wy,x2:wx,y2:wy,...snap()};
  }, [tool, elements, selectedEls, offset, zoom, getBBox, hitTest, hitHandle, hideText, showText, snap, saveHistory]);

  const onMouseMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect(); if(!rect) return;
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const {x:wx,y:wy} = {x:(cx-offset.x)/zoom, y:(cy-offset.y)/zoom};

    if(panStartRef.current){setOffset({x:cx-panStartRef.current.x,y:cy-panStartRef.current.y});return;}
    if(resizeStartRef.current){
      const dx=wx-resizeStartRef.current.wx, dy=wy-resizeStartRef.current.wy;
      applyResize(resizeStartRef.current.el,resizeStartRef.current.origEl,resizeStartRef.current.handle,dx,dy);
      resolveConnectors(elements);
      setElements([...elements]);return;
    }
    if(tool==="select"&&dragStartRef.current){
      const dx=wx-dragStartRef.current.wx, dy=wy-dragStartRef.current.wy;
      dragStartRef.current.origEls.forEach((orig,i)=>{
        const el=selectedEls[i];if(!el)return;
        if(el.type==="pencil")el.path=orig.path.map(p=>({x:p.x+dx,y:p.y+dy}));
        else if(el.type==="text"){el.x=orig.x+dx;el.y=orig.y+dy;}
        else{el.x1=orig.x1+dx;el.y1=orig.y1+dy;el.x2=orig.x2+dx;el.y2=orig.y2+dy;}
      });
      resolveConnectors(elements);
      setElements([...elements]);return;
    }
    if(tool==="select"&&marqueeRef.current){
      marqueeRef.current.x2=wx;marqueeRef.current.y2=wy;
      const mx=Math.min(marqueeRef.current.x1,marqueeRef.current.x2),my=Math.min(marqueeRef.current.y1,marqueeRef.current.y2);
      const mw=Math.abs(marqueeRef.current.x2-marqueeRef.current.x1),mh=Math.abs(marqueeRef.current.y2-marqueeRef.current.y1);
      setSelectedEls(elements.filter(el=>boxIn(getBBox(el),mx,my,mw,mh)));
      setElements([...elements]);// trigger render
      return;
    }
    if(!drawingRef.current) return;
    if(tool==="pencil"){pencilPathRef.current.push({x:wx,y:wy});currentElRef.current.path=pencilPathRef.current;}
    else{
      currentElRef.current.x2=wx;currentElRef.current.y2=wy;
      if(tool==="arrow"){
        const sn=findSnapShape(wx,wy,currentElRef.current.id,elements);
        if(sn){const a=shapeAnchor(sn,currentElRef.current.x1,currentElRef.current.y1);if(a){currentElRef.current.x2=a.x;currentElRef.current.y2=a.y;}}
      }
    }
    setElements([...elements]);// trigger render
  }, [tool, elements, selectedEls, offset, zoom, getBBox, boxIn, applyResize, resolveConnectors, findSnapShape, shapeAnchor]);

  const onMouseUp = useCallback(() => {
    if(panStartRef.current){panStartRef.current=null;canvasRef.current.style.cursor=spaceRef.current?"grab":tool==="hand"?"grab":"crosshair";return;}
    if(resizeStartRef.current){saveHistory(elements);resizeStartRef.current=null;canvasRef.current.style.cursor="default";return;}
    if(dragStartRef.current){saveHistory(elements);dragStartRef.current=null;return;}
    if(marqueeRef.current){marqueeRef.current=null;setElements([...elements]);return;}
    if(!drawingRef.current) return;
    drawingRef.current=false;
    if(currentElRef.current){
      const ce=currentElRef.current;
      const skip=ce.type==="pencil"?(ce.path?.length||0)<2:(Math.abs(ce.x2-ce.x1)<3&&Math.abs(ce.y2-ce.y1)<3);
      if(!skip){
        if(ce.type==="arrow"){
          const ss=findSnapShape(ce.x1,ce.y1,ce.id,elements);
          if(ss){ce.startShape=ss.id;const a=shapeAnchor(ss,ce.x2,ce.y2);if(a){ce.x1=a.x;ce.y1=a.y;}}
          const se=findSnapShape(ce.x2,ce.y2,ce.id,elements);
          if(se){ce.endShape=se.id;const a=shapeAnchor(se,ce.x1,ce.y1);if(a){ce.x2=a.x;ce.y2=a.y;}}
        }
        const newEls=[...elements,ce];
        setElements(newEls);
        saveHistory(newEls);
      }
      currentElRef.current=null;
    }
  }, [tool, elements, saveHistory, findSnapShape, shapeAnchor]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
    const delta=e.deltaY>0?-0.1:0.1;
    const wx=(cx-offset.x)/zoom, wy=(cy-offset.y)/zoom;
    const nz=Math.max(0.1,Math.min(5,zoom+delta));
    setZoom(nz);
    setOffset({x:cx-wx*nz, y:cy-wy*nz});
  }, [offset, zoom]);

  // ── Keyboard ──
  useEffect(() => {
    if(!activeBoardId) return;
    const onKeyDown = (e) => {
      if(textRef.current && textRef.current.style.display==="block") return;
      if(document.activeElement && (document.activeElement.tagName==="INPUT"||document.activeElement.tagName==="TEXTAREA")) return;
      if(e.code==="Space"&&!spaceRef.current){e.preventDefault();spaceRef.current=true;prevToolRef.current=tool;if(canvasRef.current)canvasRef.current.style.cursor="grab";}
      const ctrl=e.ctrlKey||e.metaKey;
      const keyMap={v:"select",p:"pencil",l:"line",a:"arrow",r:"rect",e:"ellipse",d:"diamond",t:"text",h:"hand",x:"eraser"};
      if(!ctrl&&keyMap[e.key]) setTool(keyMap[e.key]);
      if((e.key==="Delete"||e.key==="Backspace")&&selectedEls.length){
        const ids=new Set(selectedEls.map(x=>x.id));
        const newEls=elements.filter(el=>!ids.has(el.id));
        setElements(newEls);setSelectedEls([]);saveHistory(newEls);
      }
      if(e.key==="Enter"&&selectedEls.length===1){
        const el=selectedEls[0];
        const shapeable=["rect","ellipse","diamond","line","arrow"];
        if(shapeable.includes(el.type)){e.preventDefault();editShapeLabel(el);}
        else if(el.type==="text"){
          e.preventDefault();
          const inp=textRef.current;if(!inp)return;
          const sx=el.x*zoom+offset.x, sy=(el.y-el.fontSize)*zoom+offset.y;
          inp.style.display="block";
          inp.style.left=sx+"px";inp.style.top=sy+"px";
          inp.style.fontSize=(el.fontSize*zoom)+"px";
          inp.style.color=el.strokeColor;
          inp.style.width="";inp.style.textAlign="";
          inp.value=el.text;inp.focus();inp.select();
          editingShapeRef.current=null;
          const newEls=elements.filter(x=>x!==el);
          setElements(newEls);
          activeTextRef.current={...el};
        }
      }
      if(ctrl&&e.code==="KeyZ"){e.preventDefault();undo();}
      if(ctrl&&e.code==="KeyY"){e.preventDefault();redo();}
      if(ctrl&&e.code==="KeyC"&&selectedEls.length){
        e.preventDefault();
        clipboardRef.current=selectedEls.map(el=>JSON.parse(JSON.stringify(el)));
      }
      if(ctrl&&e.code==="KeyV"&&clipboardRef.current?.length){
        e.preventDefault();
        const d=16/zoom;
        const offsetEl=(el)=>{
          const clone={...el,id:genId()};
          if(el.type==="pencil") return {...clone,path:el.path.map(p=>({x:p.x+d,y:p.y+d}))};
          if(el.type==="text") return {...clone,x:el.x+d,y:el.y+d};
          return {...clone,x1:el.x1+d,y1:el.y1+d,x2:el.x2+d,y2:el.y2+d};
        };
        const pasted=clipboardRef.current.map(offsetEl);
        const newEls=[...elements,...pasted];
        setElements(newEls);setSelectedEls(pasted);saveHistory(newEls);
      }
      if(e.key==="Escape"){setTool("select");hideText();setSelectedEls([]);}
    };
    const onKeyUp = (e) => {
      if(e.code==="Space"&&spaceRef.current){spaceRef.current=false;panStartRef.current=null;setTool(prevToolRef.current||"select");}
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown, true); window.removeEventListener("keyup", onKeyUp); };
  }, [activeBoardId, tool, elements, selectedEls, setTool, undo, redo, hideText, saveHistory, editShapeLabel, zoom, offset, genId]);

  // ── Text input event ──
  useEffect(() => {
    const inp = textRef.current; if(!inp) return;
    const onInput = () => {
      if(editingShapeRef.current){editingShapeRef.current.label=inp.value;setElements(e=>[...e]);}
      else if(activeTextRef.current){activeTextRef.current.text=inp.value;setElements(e=>[...e]);}
    };
    const onKD = (e) => {
      if(e.key==="Escape") hideText();
      else if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();hideText();}
    };
    inp.addEventListener("input",onInput);
    inp.addEventListener("keydown",onKD);
    return () => { inp.removeEventListener("input",onInput); inp.removeEventListener("keydown",onKD); };
  }, [hideText]);

  // ── Styles ──
  const S = {
    surface: isDark ? "rgba(22,33,62,0.92)" : "rgba(255,255,255,0.97)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
    text: isDark ? "#eaeaea" : "#222",
    textDim: isDark ? "#8892a4" : "#888",
    btnBg: "transparent",
    btnHover: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
    inputRange: isDark ? "#0f3460" : "#dde3ea",
  };

  // ══════════════════════════════════════════
  //  HOME VIEW (board grid)
  // ══════════════════════════════════════════
  if (!activeBoardId) {
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"auto",background:T.bg}}>
        {/* Toolbar */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px 0"}}>
          <div style={{fontSize:15,fontWeight:600,color:T.textSoft,fontFamily:"'DM Mono',monospace",letterSpacing:0.5}}>Tahtalarım</div>
          <button onClick={newBoard} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 18px",background:accent,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:`0 0 20px ${accent}33`}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Yeni Tahta
          </button>
        </div>

        {/* Grid */}
        <div style={{padding:20,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:16,alignContent:"start",overflowY:"auto",flex:1}}>
          {boards.map(b => (
            <div key={b.id} onClick={()=>openBoard(b.id)} style={{borderRadius:14,border:`1px solid ${T.border}`,background:T.cardBg||T.surface,cursor:"pointer",transition:"all 0.2s",overflow:"hidden",position:"relative",height:160}}>
              <div style={{width:"100%",height:120,background:isDark?"#111827":"#f5f6f8",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:32,opacity:0.3}}>✏️</span>
              </div>
              <div style={{padding:"8px 12px",display:"flex",alignItems:"center",gap:8,borderTop:`1px solid ${T.border}`}}>
                <span style={{flex:1,fontSize:12,fontWeight:600,color:T.textSoft,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.name}</span>
                {boards.length > 1 && <button onClick={(e)=>{e.stopPropagation();setConfirmDel(b.id);}} style={{width:24,height:24,border:"none",background:"transparent",color:T.textMuted,borderRadius:6,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>}
              </div>
            </div>
          ))}
          {/* New board card */}
          <div onClick={newBoard} style={{borderRadius:14,border:`2px dashed ${T.border}`,height:160,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",color:T.textMuted,transition:"all 0.2s"}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span style={{fontSize:12}}>Yeni tahta</span>
          </div>
        </div>

        {/* Confirm delete dialog */}
        {confirmDel && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}
            onClick={()=>setConfirmDel(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surface||T.bg,border:`1px solid ${T.border}`,borderRadius:14,padding:"24px 28px",maxWidth:320,textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,0.6)"}}>
              <p style={{fontSize:14,color:T.textSoft,marginBottom:20,lineHeight:1.5}}>
                "{boards.find(b=>b.id===confirmDel)?.name}" tahtasını silmek istediğinizden emin misiniz?
              </p>
              <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                <button onClick={()=>{deleteBoard(confirmDel);setConfirmDel(null);}}
                  style={{padding:"8px 20px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,background:accent,border:"none",color:"#fff"}}>
                  Sil
                </button>
                <button onClick={()=>setConfirmDel(null)}
                  style={{padding:"8px 20px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,background:"transparent",border:`1px solid ${T.border}`,color:T.textMuted}}>
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════
  //  EDITOR VIEW
  // ══════════════════════════════════════════
  return (
    <div ref={containerRef} style={{flex:1,position:"relative",overflow:"hidden",background:isDark?"#1a1a2e":"#f0f0f0"}}>
      {/* Canvas */}
      <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,cursor:"crosshair",touchAction:"none"}}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
        onWheel={onWheel}
        onDoubleClick={(e) => {
          const rect = canvasRef.current.getBoundingClientRect();
          const cx2 = e.clientX - rect.left, cy2 = e.clientY - rect.top;
          const wx = (cx2-offset.x)/zoom, wy = (cy2-offset.y)/zoom;
          for(let i=elements.length-1;i>=0;i--){
            if(hitTest(elements[i],wx,wy)){
              const el=elements[i];
              if(["rect","ellipse","diamond","line","arrow"].includes(el.type)){editShapeLabel(el);setSelectedEls([el]);}
              else if(el.type==="text"){
                const inp=textRef.current;if(!inp)return;
                inp.style.display="block";
                inp.style.left=(el.x*zoom+offset.x)+"px";
                inp.style.top=((el.y-el.fontSize)*zoom+offset.y)+"px";
                inp.style.fontSize=(el.fontSize*zoom)+"px";
                inp.style.color=el.strokeColor;
                inp.style.width="";inp.style.textAlign="";
                inp.value=el.text;inp.focus();inp.select();
                editingShapeRef.current=null;
                setElements(elements.filter(x=>x!==el));
                activeTextRef.current={...el};
              }
              return;
            }
          }
          // Empty area double-click → open text mode
          hideText();
          showText(wx, wy);
        }}
      />

      {/* Grid bg via CSS */}
      <div style={{position:"absolute",inset:0,backgroundImage:isDark
        ?"linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)"
        :"linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)",
        backgroundSize:"40px 40px",pointerEvents:"none",zIndex:0}}/>

      {/* Top bar */}
      <div style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:8,
        background:S.surface,border:`1px solid ${S.border}`,borderRadius:12,padding:"6px 12px",zIndex:100,backdropFilter:"blur(20px)",
        boxShadow:"0 8px 32px rgba(0,0,0,0.4)",whiteSpace:"nowrap"}}>
        <button onClick={goHome} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",border:`1px solid ${S.border}`,
          background:"transparent",color:S.textDim,borderRadius:7,cursor:"pointer",fontSize:12,fontFamily:"'DM Mono',monospace"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Tahtalar
        </button>
        <input type="text" value={activeBoard?.name||"Tahta"}
          onChange={(e)=>{const v=e.target.value;setBoards(bs=>bs.map(b=>b.id===activeBoardId?{...b,name:v}:b));}}
          onKeyDown={(e)=>{if(e.key==="Enter")e.target.blur();e.stopPropagation();}}
          style={{fontFamily:"'Caveat',cursive",fontSize:20,fontWeight:600,color:accent,background:"transparent",
            border:"1px solid transparent",borderRadius:6,padding:"2px 8px",minWidth:80,maxWidth:180,cursor:"text",
            transition:"all 0.15s",outline:"none"}}
          onFocus={(e)=>{e.target.style.borderColor=accent;e.target.style.background=`${accent}12`;}}
          onBlur={(e)=>{e.target.style.borderColor="transparent";e.target.style.background="transparent";}}
        />
        <button onClick={()=>{const newEls=[];setElements(newEls);setSelectedEls([]);saveHistory(newEls);}} style={{padding:"5px 12px",border:`1px solid ${S.border}`,background:"transparent",color:S.textDim,borderRadius:7,cursor:"pointer",fontSize:12,fontFamily:"'DM Mono',monospace"}}>🗑 Temizle</button>
        <button onClick={undo} style={{padding:"5px 12px",border:`1px solid ${S.border}`,background:"transparent",color:S.textDim,borderRadius:7,cursor:"pointer",fontSize:12,fontFamily:"'DM Mono',monospace"}}>↩ Geri Al</button>
        <button onClick={redo} style={{padding:"5px 12px",border:`1px solid ${S.border}`,background:"transparent",color:S.textDim,borderRadius:7,cursor:"pointer",fontSize:12,fontFamily:"'DM Mono',monospace"}}>↪ İleri Al</button>
        <button onClick={()=>{
          const c=canvasRef.current;if(!c)return;
          const tmp=document.createElement("canvas");tmp.width=c.width;tmp.height=c.height;
          const tc=tmp.getContext("2d");tc.fillStyle=isDark?"#1a1a2e":"#f0f0f0";tc.fillRect(0,0,c.width,c.height);
          tc.save();tc.translate(offset.x,offset.y);tc.scale(zoom,zoom);
          elements.forEach(e=>drawEl(tc,e));tc.restore();
          const a=document.createElement("a");a.download="drawboard.png";a.href=tmp.toDataURL();a.click();
        }} style={{padding:"5px 12px",border:`1px solid ${S.border}`,background:"transparent",color:S.textDim,borderRadius:7,cursor:"pointer",fontSize:12,fontFamily:"'DM Mono',monospace"}}>⬇ PNG</button>
      </div>

      {/* Left toolbar */}
      <div style={{position:"absolute",top:"50%",left:16,transform:"translateY(-50%)",background:S.surface,
        border:`1px solid ${S.border}`,borderRadius:16,padding:"10px 8px",display:"flex",flexDirection:"column",gap:4,
        zIndex:100,backdropFilter:"blur(20px)",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
        {TOOLS.map((t,i) => {
          if(t.id.startsWith("_sep")) return <div key={t.id} style={{height:1,background:S.border,margin:"4px 6px"}}/>;
          return (
            <button key={t.id} onClick={()=>setTool(t.id)} title={`${t.label} [${t.key}]`}
              style={{width:42,height:42,border:"none",background:tool===t.id?accent:"transparent",
                borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                color:tool===t.id?"#fff":S.textDim,boxShadow:tool===t.id?`0 0 16px ${accent}66`:"none",transition:"all 0.15s"}}>
              {t.icon}
            </button>
          );
        })}
      </div>

      {/* Ghost draw animation above props panel */}
      <div style={{position:"absolute",top:70,right:16,width:200,display:"flex",justifyContent:"center",pointerEvents:"none",zIndex:100}}>
        <GhostDraw running={true} color={accent} big={false}/>
      </div>

      {/* Right props panel */}
      <div style={{position:"absolute",top:195,right:16,background:S.surface,border:`1px solid ${S.border}`,
        borderRadius:14,padding:14,width:200,zIndex:100,backdropFilter:"blur(20px)",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
        <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:S.textDim,textTransform:"uppercase",letterSpacing:1.5,marginBottom:12}}>Özellikler</div>
        {/* Color */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <label style={{fontSize:11,color:S.textDim}}>Renk</label>
          <input type="color" value={props.strokeColor} onChange={e=>setProps(p=>({...p,strokeColor:e.target.value}))}
            style={{width:32,height:32,border:`2px solid ${S.border}`,borderRadius:8,cursor:"pointer",padding:0,background:"none"}}/>
        </div>
        {/* Fill color */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <label style={{fontSize:11,color:S.textDim}}>Dolgu Rengi</label>
          <input type="color" value={props.fillColor} onChange={e=>setProps(p=>({...p,fillColor:e.target.value}))}
            style={{width:32,height:32,border:`2px solid ${S.border}`,borderRadius:8,cursor:"pointer",padding:0,background:"none"}}/>
        </div>
        {/* Stroke width */}
        <div style={{marginBottom:10}}>
          <label style={{fontSize:11,color:S.textDim}}>Kalınlık: {props.strokeWidth}px</label>
          <input type="range" min="1" max="20" value={props.strokeWidth} onChange={e=>setProps(p=>({...p,strokeWidth:+e.target.value}))}
            style={{width:"100%",height:4,borderRadius:2,background:S.inputRange,outline:"none",marginTop:4,accentColor:accent}}/>
        </div>
        {/* Opacity */}
        <div style={{marginBottom:10}}>
          <label style={{fontSize:11,color:S.textDim}}>Opaklık: {Math.round(props.opacity*100)}%</label>
          <input type="range" min="10" max="100" value={Math.round(props.opacity*100)} onChange={e=>setProps(p=>({...p,opacity:+e.target.value/100}))}
            style={{width:"100%",height:4,borderRadius:2,background:S.inputRange,outline:"none",marginTop:4,accentColor:accent}}/>
        </div>
        {/* Dash */}
        <div style={{marginBottom:10}}>
          <label style={{fontSize:11,color:S.textDim}}>Çizgi tipi</label>
          <div style={{display:"flex",gap:6,marginTop:4}}>
            {["solid","dashed","dotted"].map(d => (
              <button key={d} onClick={()=>setProps(p=>({...p,dash:d}))}
                style={{flex:1,height:28,border:`1px solid ${props.dash===d?accent:S.border}`,background:props.dash===d?`${accent}22`:"transparent",
                  borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="24" height="8"><line x1="2" y1="4" x2="22" y2="4" stroke={S.textDim} strokeWidth="2"
                  strokeDasharray={d==="dashed"?"4,3":d==="dotted"?"1,4":"none"}/></svg>
              </button>
            ))}
          </div>
        </div>
        {/* Font size */}
        <div style={{marginBottom:10}}>
          <label style={{fontSize:11,color:S.textDim}}>Yazı boyutu</label>
          <div style={{display:"flex",gap:4,marginTop:4}}>
            {[{l:"S",v:14},{l:"M",v:20},{l:"L",v:28},{l:"XL",v:40}].map(({l,v}) => (
              <button key={l} onClick={()=>setProps(p=>({...p,fontSize:v}))}
                style={{flex:1,height:26,border:`1px solid ${props.fontSize===v?accent:S.border}`,background:props.fontSize===v?`${accent}22`:"transparent",
                  color:S.textDim,borderRadius:6,cursor:"pointer",fontSize:10,fontFamily:"'DM Mono',monospace"}}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {/* Fill toggle */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <label style={{fontSize:11,color:S.textDim}}>Doldurucu</label>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:11,color:S.textDim}}>
            <input type="checkbox" checked={props.fill} onChange={e=>setProps(p=>({...p,fill:e.target.checked}))} style={{accentColor:accent}}/>Açık
          </label>
        </div>
      </div>

      {/* Zoom control */}
      <div style={{position:"absolute",bottom:16,right:16,display:"flex",alignItems:"center",gap:6,
        background:S.surface,border:`1px solid ${S.border}`,borderRadius:10,padding:"6px 10px",backdropFilter:"blur(20px)",zIndex:100}}>
        <button onClick={()=>{const nz=Math.max(0.1,zoom-0.1);setZoom(nz);}} style={{width:28,height:28,border:`1px solid ${S.border}`,background:"transparent",color:S.text,borderRadius:6,cursor:"pointer",fontSize:16}}>−</button>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:S.textDim,minWidth:42,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
        <button onClick={()=>{const nz=Math.min(5,zoom+0.1);setZoom(nz);}} style={{width:28,height:28,border:`1px solid ${S.border}`,background:"transparent",color:S.text,borderRadius:6,cursor:"pointer",fontSize:16}}>+</button>
        <button onClick={()=>{setZoom(1);setOffset({x:0,y:0});}} style={{height:28,border:`1px solid ${S.border}`,background:"transparent",color:S.text,borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",padding:"0 8px"}}>Sıfırla</button>
      </div>


      {/* Hint */}
      <div style={{position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",fontFamily:"'DM Mono',monospace",fontSize:11,color:S.textDim,pointerEvents:"none",opacity:0.5,zIndex:100}}>
        Space ile kaydır • Ctrl+Scroll ile yakınlaştır • V ile seç
      </div>

      {/* Text input */}
      <input ref={textRef} type="text" placeholder="Yazın..." style={{position:"absolute",border:"none",outline:"none",background:"transparent",
        fontFamily:"'Caveat',cursive",color:"#fff",fontSize:20,zIndex:200,minWidth:100,whiteSpace:"nowrap",caretColor:accent,display:"none"}}/>
    </div>
  );
}
