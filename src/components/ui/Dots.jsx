import { useT } from "../../constants.js";

export function Dots({ idx, color }) {
  const T = useT();
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            width: i === idx ? 22 : 7,
            height: 7,
            borderRadius: 4,
            background: i <= idx ? color : T.border,
            opacity: i < idx ? 0.45 : 1,
            boxShadow: i === idx ? `0 0 8px ${color}88` : "none",
            transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      ))}
    </div>
  );
}
