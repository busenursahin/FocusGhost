import { useRef, useEffect } from "react";

function Rain() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width = c.offsetWidth, H = c.height = c.offsetHeight;
    const drops = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      speed: 1.8 + Math.random() * 2.5,
      len: 10 + Math.random() * 18,
      op: 0.07 + Math.random() * 0.2,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      drops.forEach(d => {
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 1, d.y + d.len);
        ctx.strokeStyle = `rgba(160,185,255,${d.op})`; ctx.lineWidth = 1; ctx.stroke();
        d.y += d.speed; if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
      });
      raf = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

export function Scene({ big, T }) {
  const isLight = T.moonVisible === false;
  return (
    <div style={{ position: "absolute", inset: 0, background: T.sceneBg, overflow: "hidden" }}>
      {isLight ? (
        <>
          <div style={{ position: "absolute", top: big ? 55 : 14, left: big ? 55 : 28, width: big ? 50 : 30, height: big ? 50 : 30, borderRadius: "50%", background: "#FFD700", boxShadow: `0 0 ${big ? 40 : 20}px rgba(255,215,0,0.7), 0 0 ${big ? 80 : 40}px rgba(255,200,0,0.3)`, transition: "all 0.8s" }} />
          {(big ? [[30, 30], [55, 18], [70, 40], [15, 50]] : [[20, 22], [55, 14], [78, 28]]).map(([cx, cy], i) => (
            <div key={i} style={{ position: "absolute", left: `${cx}%`, top: cy, display: "flex", gap: -4 }}>
              <div style={{ width: big ? 36 : 22, height: big ? 18 : 11, borderRadius: "50%", background: "rgba(255,255,255,0.85)" }} />
              <div style={{ width: big ? 28 : 18, height: big ? 14 : 9, borderRadius: "50%", background: "rgba(255,255,255,0.9)", marginLeft: -8, marginTop: 3 }} />
              <div style={{ width: big ? 20 : 14, height: big ? 12 : 8, borderRadius: "50%", background: "rgba(255,255,255,0.8)", marginLeft: -6, marginTop: 5 }} />
            </div>
          ))}
        </>
      ) : (
        <>
          <div style={{ position: "absolute", top: big ? 70 : 20, right: big ? 55 : 28, width: big ? 44 : 26, height: big ? 44 : 26, borderRadius: "50%", background: "#f0e8c8", boxShadow: "0 0 24px rgba(240,232,200,0.45)", transition: "all 0.8s" }} />
          <div style={{ position: "absolute", top: big ? 70 : 20, right: big ? 44 : 20, width: big ? 44 : 26, height: big ? 44 : 26, borderRadius: "50%", background: "#0c1020", transition: "all 0.8s" }} />
          {[[12, 14], [28, 8], [55, 18], [78, 6], [88, 22], [40, 28], [65, 12], [20, 32]].map(([x, y], i) => (
            <div key={i} style={{ position: "absolute", left: `${x}%`, top: y, width: 2, height: 2, borderRadius: "50%", background: "rgba(255,255,255,0.75)", boxShadow: "0 0 4px rgba(255,255,255,0.5)" }} />
          ))}
        </>
      )}

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: big ? 90 : 65, background: T.sceneBuilding }}>
        {isLight ? (
          <>
            {[[0, 38, 22], [20, 52, 18], [38, 34, 20], [58, 48, 24], [78, 32, 16]].map(([l, h, w], i) => (
              <div key={i} style={{ position: "absolute", bottom: 0, left: `${l}%`, width: w, height: h, background: T.sceneBuildingFace }}>
                {[[3, 8], [3, 20], [12, 8], [12, 20]].map(([wx, wy], j) => (
                  <div key={j} style={{ position: "absolute", left: wx, top: wy, width: 4, height: 4, background: T.sceneWindow, borderRadius: 1 }} />
                ))}
              </div>
            ))}
            {[[8, 0], [44, 0], [68, 0], [88, 0]].map(([l, b], i) => (
              <div key={i} style={{ position: "absolute", bottom: b, left: `${l}%` }}>
                <div style={{ width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: `${16 + i * 4}px solid #5a8a3a`, marginLeft: -8 }} />
                <div style={{ width: 6, height: 8, background: "#7a5c3a", margin: "0 auto" }} />
              </div>
            ))}
          </>
        ) : (
          <>
            {[[0, 38, 22], [20, 52, 18], [38, 34, 20], [58, 48, 24], [78, 32, 16]].map(([l, h, w], i) => (
              <div key={i} style={{ position: "absolute", bottom: 0, left: `${l}%`, width: w, height: h, background: T.sceneBuildingFace }}>
                {[[3, 8], [3, 20], [12, 8], [12, 20]].map(([wx, wy], j) => (
                  <div key={j} style={{ position: "absolute", left: wx, top: wy, width: 4, height: 4, background: T.sceneWindow, borderRadius: 1 }} />
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {!big && (
        <>
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 7, background: T.sceneFrame, transform: "translateX(-50%)" }} />
          <div style={{ position: "absolute", top: "52%", left: 0, right: 0, height: 7, background: T.sceneFrame }} />
          <div style={{ position: "absolute", inset: 0, border: `7px solid ${T.sceneFrame}`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 18, background: `linear-gradient(90deg,${T.sceneCurtain},transparent)` }} />
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 18, background: `linear-gradient(-90deg,${T.sceneCurtain},transparent)` }} />
        </>
      )}

      {!isLight ? <Rain /> : (
        <div style={{ position: "absolute", top: big ? 40 : 10, left: "30%", display: "flex", gap: 12, opacity: 0.4 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ fontSize: 10, animation: `float ${1.2 + i * 0.3}s ease infinite alternate`, animationDelay: `${i * 0.4}s` }}>🐦</div>
          ))}
        </div>
      )}
    </div>
  );
}
