import { useT, fmtDuration, fmtTime } from "../constants.js";
import { ProjectBadge } from "./ProjectBadge.jsx";

export function LogEntry({ log, projects }) {
  const T = useT();
  const proj = projects.find(p => p.id === log.projectId);
  const isComplete = log.completed;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.glass, borderRadius: 14, border: `1px solid ${isComplete ? "rgba(134,239,206,0.15)" : "rgba(247,208,112,0.15)"}`, marginBottom: 6 }}>
      <div style={{ width: 3, height: 36, borderRadius: 2, background: isComplete ? T.mint : T.yellow, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {log.taskName || log.activityLabel}
          </span>
          {!isComplete && (
            <span style={{ fontSize: 9, fontWeight: 700, color: T.yellow, background: "rgba(247,208,112,0.15)", border: "1px solid rgba(247,208,112,0.3)", borderRadius: 6, padding: "1px 6px", flexShrink: 0 }}>eksik</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ProjectBadge project={proj} small />
          <span style={{ fontSize: 9, color: T.textMuted, fontWeight: 600 }}>{log.activityEmoji} {log.activityLabel}</span>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: isComplete ? T.mint : T.yellow }}>{fmtDuration(log.durationSec)}</div>
        <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 600 }}>{fmtTime(new Date(log.startTime))}–{fmtTime(new Date(log.endTime))}</div>
      </div>
    </div>
  );
}
