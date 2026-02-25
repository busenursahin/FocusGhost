import { useState, useEffect } from "react";
import { useT, getModeColor } from "../constants.js";
import { PlantPot } from "../PlantSVG.jsx";

const PLANT_OPTIONS = [
  { type: "read",     label: "Lavanta",  desc: "Sakin & Odaklı",    emoji: "🪻" },
  { type: "work",     label: "Sukulent", desc: "Güçlü & Verimli",   emoji: "🌵" },
  { type: "research", label: "Papatya",  desc: "Meraklı & Keşifçi", emoji: "🌼" },
  { type: "code",     label: "Kaktüs",   desc: "Sağlam & Kararlı",  emoji: "🌵" },
];
const AUTO_SELECT_SECONDS = 15;

export function PlantPickerModal({ onSelect, defaultType, theme }) {
  const T = useT();
  const [selected, setSelected] = useState(null);
  const [countdown, setCountdown] = useState(AUTO_SELECT_SECONDS);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); onSelect(defaultType); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handlePick = (type) => {
    setSelected(type);
    setTimeout(() => onSelect(type), 380);
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}>
      <div style={{ background: T.bg, border: `1px solid ${T.borderLight}`, borderRadius: 28, padding: "28px 24px 24px", width: 340, boxShadow: "0 32px 80px rgba(0,0,0,0.7)", animation: "popIn 0.45s cubic-bezier(0.34,1.56,0.64,1)" }}>

        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 46, marginBottom: 8, lineHeight: 1 }}>🎉</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.text, marginBottom: 4 }}>Pomodoro tamamlandı!</div>
          <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>Bahçene hangi bitkiyi dikmek istersin?</div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {PLANT_OPTIONS.map(({ type, label, desc, emoji }) => {
            const mc = getModeColor(type, theme);
            const isSelected = selected === type;
            const isDefault = type === defaultType && !selected;
            return (
              <button
                key={type}
                onClick={() => handlePick(type)}
                style={{
                  flex: 1, border: "none", cursor: selected ? "default" : "pointer",
                  background: isSelected ? mc.color + "28" : isDefault ? mc.color + "14" : T.glass,
                  borderRadius: 20, padding: "14px 6px 12px",
                  outline: `2px solid ${isSelected ? mc.color : isDefault ? mc.color + "66" : T.border}`,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                  transform: isSelected ? "scale(1.08)" : "scale(1)",
                  boxShadow: isSelected ? `0 8px 24px ${mc.color}44` : isDefault ? `0 4px 12px ${mc.color}22` : "none",
                  opacity: selected && !isSelected ? 0.4 : 1,
                }}
              >
                <PlantPot type={type} color={mc.color} />
                <div style={{ fontSize: 11, fontWeight: 800, color: isSelected || isDefault ? mc.color : T.text }}>{label}</div>
                <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 600, textAlign: "center" }}>{emoji} {desc}</div>
                {isDefault && !isSelected && (
                  <div style={{ fontSize: 8, color: mc.color, fontWeight: 700, background: mc.color + "18", borderRadius: 6, padding: "1px 6px" }}>Varsayılan</div>
                )}
              </button>
            );
          })}
        </div>

        {!selected && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>Otomatik seçim</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.textSoft }}>{countdown}s</span>
            </div>
            <div style={{ height: 4, background: T.glass, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(countdown / AUTO_SELECT_SECONDS) * 100}%`, background: getModeColor(defaultType, theme).color, borderRadius: 2, transition: "width 1s linear", opacity: 0.8 }} />
            </div>
          </div>
        )}
        {selected && (
          <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: getModeColor(selected, theme).color, animation: "fadeIn 0.3s" }}>
            🌱 Bahçene ekleniyor...
          </div>
        )}
      </div>
    </div>
  );
}
