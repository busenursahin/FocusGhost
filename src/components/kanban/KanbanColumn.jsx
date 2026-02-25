import { useState } from "react";
import { useT } from "../../constants.js";
import { KanbanCard } from "./KanbanCard.jsx";

export function KanbanColumn({ col, cards, onAddCard, onDeleteCard, onDragStart, onDrop, theme }) {
  const T = useT();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleAdd = () => {
    if (newTitle.trim()) { onAddCard(col.id, newTitle.trim()); }
    setNewTitle(""); setAdding(false);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(col.id); }}
      style={{
        flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
        background: dragOver ? `${col.color}12` : T.glass,
        border: `1px solid ${dragOver ? col.color + "55" : T.border}`,
        borderRadius: 16, padding: "14px 12px", transition: "all 0.2s", minHeight: 200,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: T.text, flex: 1, letterSpacing: 0.3 }}>{col.label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1px 8px" }}>{cards.length}</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {cards.map(card => (
          <KanbanCard
            key={card.id}
            card={card}
            col={col.id}
            onDelete={onDeleteCard}
            onDragStart={() => onDragStart(card.id)}
            theme={theme}
          />
        ))}
      </div>

      {adding ? (
        <div style={{ marginTop: 8 }}>
          <textarea
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); }
              if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
            }}
            placeholder="Kart başlığı..."
            rows={2}
            style={{ width: "100%", resize: "none", background: T.cardBg, border: `1px solid ${col.color}66`, borderRadius: 10, padding: "8px 10px", fontSize: 12, color: T.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button onClick={handleAdd} style={{ flex: 1, background: col.color, border: "none", borderRadius: 8, padding: "6px", fontSize: 11, fontWeight: 700, color: "#1a1f2e", cursor: "pointer" }}>Ekle</button>
            <button onClick={() => { setAdding(false); setNewTitle(""); }} style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: T.textMuted, cursor: "pointer" }}>İptal</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{ marginTop: 8, width: "100%", background: "transparent", border: `1px dashed ${T.border}`, borderRadius: 10, padding: "7px", fontSize: 11, fontWeight: 600, color: T.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 0.2s" }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Kart ekle
        </button>
      )}
    </div>
  );
}
