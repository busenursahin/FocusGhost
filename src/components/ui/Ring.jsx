import { useT } from "../../constants.js";
import { fmt } from "../../constants.js";

export function Ring({ progress, remaining, color, big }) {
  const T = useT();
  const r = big ? 92 : 68;
  const circ = 2 * Math.PI * r;
  const size = (r + 14) * 2;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth="11" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s", filter: `drop-shadow(0 0 ${big ? 16 : 8}px ${color}99)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <div style={{ fontSize: big ? 56 : 34, fontWeight: 200, color: T.text, letterSpacing: -2, fontVariantNumeric: "tabular-nums", textShadow: big ? `0 0 40px ${color}99` : "none" }}>
          {fmt(remaining)}
        </div>
        <div style={{ fontSize: big ? 12 : 10, fontWeight: 600, color, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.9 }}>
          {Math.round(progress * 100)}%
        </div>
      </div>
    </div>
  );
}
