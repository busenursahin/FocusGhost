import { useT } from "../../constants.js";

export function Toast({ msg, show }) {
  const T = useT();
  return (
    <div style={{
      position: "absolute", top: 82, left: "50%",
      transform: `translateX(-50%) translateY(${show ? 0 : -12}px)`,
      opacity: show ? 1 : 0,
      transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      background: "rgba(20,24,38,0.96)", backdropFilter: "blur(16px)",
      border: `1px solid ${T.borderLight}`, borderRadius: 20,
      padding: "10px 22px", fontSize: 12, fontWeight: 700, color: T.text,
      whiteSpace: "nowrap", zIndex: 999, pointerEvents: "none",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      {msg}
    </div>
  );
}
