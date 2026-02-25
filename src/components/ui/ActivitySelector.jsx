import { ACTIVITY_MODES, getModeColor } from "../../constants.js";

export function ActivitySelector({ current, onChange, disabled, T, theme }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
      {Object.entries(ACTIVITY_MODES).map(([k, m]) => {
        const active = current === k;
        const mc = getModeColor(k, theme);
        return (
          <button
            key={k}
            onClick={() => !disabled && onChange(k)}
            style={{
              flex: 1, border: "none", cursor: disabled ? "not-allowed" : "pointer",
              padding: "10px 4px", borderRadius: 16,
              background: active ? mc.color + "20" : T.glass,
              color: active ? mc.color : T.textMuted,
              fontSize: 11, fontWeight: 700,
              outline: `1.5px solid ${active ? mc.color + "55" : T.border}`,
              transition: "all 0.3s", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3,
              opacity: disabled && !active ? 0.4 : 1,
              transform: active ? "scale(1.04)" : "scale(1)",
              boxShadow: active ? `0 4px 16px ${mc.color}33` : "none",
            }}
          >
            <span style={{ fontSize: 20 }}>{m.emoji}</span>
            <span>{m.label}</span>
            {active && <div style={{ width: 14, height: 2.5, borderRadius: 2, background: mc.color, marginTop: 1 }} />}
          </button>
        );
      })}
    </div>
  );
}
