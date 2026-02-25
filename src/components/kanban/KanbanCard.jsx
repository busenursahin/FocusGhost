import { useState } from "react";
import { useT, ACTIVITY_MODES, getModeColor, KANBAN_COLS } from "../../constants.js";

export function KanbanCard({ card, col, onDelete, onDragStart, theme }) {
  const T = useT();
  const [hovered, setHovered] = useState(false);
  const colMeta = KANBAN_COLS.find(c => c.id === col);
  const modeMeta = card.mode ? ACTIVITY_MODES[card.mode] : null;
  const modeColor = modeMeta ? getModeColor(card.mode, theme || "dark") : null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.cardBg,
        border: `1px solid ${card.fromTask ? (modeColor?.color + "33" || T.border) : T.border}`,
        borderRadius: 12, padding: "10px 12px", marginBottom: 8,
        cursor: "grab", position: "relative",
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.18)" : "0 1px 4px rgba(0,0,0,0.1)",
        transform: hovered ? "translateY(-1px)" : "none",
        transition: "all 0.15s ease", userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ width: 3, borderRadius: 2, background: card.fromTask ? (modeColor?.color || colMeta?.color) : (colMeta?.color || T.border), alignSelf: "stretch", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: T.text, lineHeight: 1.5, display: "block" }}>{card.title}</span>
          {card.fromTask && modeMeta && (
            <span style={{ fontSize: 10, fontWeight: 700, color: modeColor?.color, background: modeColor?.color + "18", border: `1px solid ${modeColor?.color}33`, borderRadius: 5, padding: "1px 6px", marginTop: 4, display: "inline-block" }}>
              {modeMeta.emoji} {modeMeta.label}
            </span>
          )}
          {card.fromTask && card.duration && (
            <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, marginLeft: card.mode ? 5 : 0 }}>⏱ {card.duration}dk</span>
          )}
        </div>
        {hovered && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(card.id); }}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0, opacity: 0.6 }}
          >×</button>
        )}
      </div>
    </div>
  );
}
