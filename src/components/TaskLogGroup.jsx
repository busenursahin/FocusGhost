import { useState } from "react";
import { useT, getModeColor, fmtDuration, fmtTime } from "../constants.js";
import { ProjectBadge } from "./ProjectBadge.jsx";

export function TaskLogGroup({ taskId, taskName, logs, projects, theme }) {
  const T = useT();
  const [expanded, setExpanded] = useState(false);
  const totalSec = logs.reduce((a, l) => a + l.durationSec, 0);
  const allDone  = logs.every(l => l.completed);
  const hasTask  = !!taskId;
  const proj     = projects.find(p => p.id === logs[0]?.projectId);
  const mc       = getModeColor(logs[0]?.activityMode || "work", theme);
  const startT   = fmtTime(new Date(logs[logs.length - 1].startTime));
  const endT     = fmtTime(new Date(logs[0].endTime));
  const barColor = hasTask ? (allDone ? T.mint : mc.color) : T.textMuted;

  return (
    <div style={{ marginBottom: 6, borderRadius: 14, overflow: "hidden", border: `1px solid ${hasTask ? (allDone ? T.mint + "30" : mc.color + "25") : T.border}` }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: hasTask ? T.glass : T.bg, cursor: "pointer", userSelect: "none", opacity: hasTask ? 1 : 0.65 }}
      >
        <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: barColor, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            {!hasTask && <span style={{ fontSize: 9, color: T.textMuted }}>📌</span>}
            <span style={{ fontSize: 13, fontWeight: hasTask ? 700 : 500, color: hasTask ? T.text : T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: hasTask ? "normal" : "italic" }}>
              {hasTask ? taskName : "Görevsiz oturum"}
            </span>
            {!allDone && hasTask && (
              <span style={{ fontSize: 9, fontWeight: 700, color: T.yellow, background: "rgba(247,208,112,0.15)", border: "1px solid rgba(247,208,112,0.3)", borderRadius: 6, padding: "1px 6px", flexShrink: 0 }}>eksik</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {hasTask && <ProjectBadge project={proj} small />}
            <span style={{ fontSize: 9, color: mc.color, fontWeight: 700, background: mc.color + "15", border: `1px solid ${mc.color}33`, borderRadius: 5, padding: "1px 6px" }}>
              {logs[0]?.activityEmoji} {logs[0]?.activityLabel}
            </span>
            <span style={{ fontSize: 9, color: T.textMuted, fontWeight: 600 }}>{startT}–{endT}</span>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: hasTask ? (allDone ? T.mint : mc.color) : T.textMuted }}>{fmtDuration(totalSec)}</div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 600 }}>{logs.length} oturum</div>
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, marginLeft: 4, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>▾</div>
      </div>

      {expanded && (
        <div style={{ background: T.bg, borderTop: `1px solid ${T.border}` }}>
          {logs.map((l, i) => {
            const isComplete = l.completed;
            return (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px 8px 30px", borderBottom: i < logs.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ width: 2, height: 28, borderRadius: 2, background: isComplete ? T.mint + "88" : T.yellow + "88", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: T.textSoft, fontWeight: 600 }}>
                    {fmtTime(new Date(l.startTime))} – {fmtTime(new Date(l.endTime))}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isComplete ? T.mint : T.yellow }}>{fmtDuration(l.durationSec)}</div>
                  {!isComplete && <div style={{ fontSize: 9, color: T.yellow, fontWeight: 600 }}>eksik</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
