import { useRef } from "react";
import { useT, KANBAN_COLS } from "../../constants.js";
import { KanbanColumn } from "./KanbanColumn.jsx";

export function KanbanBoard({ project, cards, onClose, onAddCard, onDeleteCard, onMoveCard, theme }) {
  const T = useT();
  const dragCardId = useRef(null);

  const handleDragStart = (cardId) => { dragCardId.current = cardId; };
  const handleDrop = (targetColId) => {
    if (!dragCardId.current) return;
    onMoveCard(dragCardId.current, targetColId);
    dragCardId.current = null;
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", flexDirection: "column", padding: "32px 40px 40px" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, flexShrink: 0 }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: project.color, boxShadow: `0 0 12px ${project.color}` }} />
        <span style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{project.name}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "3px 12px", border: "1px solid rgba(255,255,255,0.12)" }}>Kanban</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18" /><path d="M6 6l12 12" />
          </svg>
          Kapat
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        {KANBAN_COLS.map(col => (
          <KanbanColumn
            key={col.id}
            col={col}
            cards={cards.filter(c => c.col === col.id)}
            onAddCard={onAddCard}
            onDeleteCard={onDeleteCard}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
}
