import { useT } from "../../constants.js";

export function Modal({ title, onClose, children }) {
  const T = useT();
  return (
    <div
      style={{ position: "absolute", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: T.cardBg, border: `1px solid ${T.borderLight}`, borderRadius: 24, padding: 20, width: 320, maxHeight: 500, overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{title}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
