export function DurationPicker({ value, onChange, color, T, disabled }) {
  const presets = [5, 10, 15, 20, 25, 30, 45, 60];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center", padding: "8px 12px", background: T.glass, border: `1px solid ${T.border}`, borderRadius: 16 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, flexShrink: 0, marginRight: 2 }}>⏱ Süre:</span>
      {presets.map(min => (
        <button
          key={min}
          onClick={() => !disabled && onChange(min)}
          style={{
            border: "none", cursor: disabled ? "not-allowed" : "pointer",
            padding: "4px 9px", borderRadius: 10,
            background: value === min ? color + "22" : T.glass,
            color: value === min ? color : T.textMuted,
            fontSize: 10, fontWeight: 700,
            outline: `1.5px solid ${value === min ? color + "55" : T.border}`,
            transition: "all 0.2s", opacity: disabled ? 0.45 : 1,
            boxShadow: value === min ? `0 2px 8px ${color}33` : "none",
          }}
        >
          {min}dk
        </button>
      ))}
    </div>
  );
}
