import { useT, fmtDuration } from "../constants.js";

export function ProjectCard({ project, logs, onEdit }) {
  const T = useT();
  const projLogs = logs.filter(l => l.projectId === project.id);
  const totalSec = projLogs.reduce((a, l) => a + l.durationSec, 0);
  const sessions = projLogs.length;
  const completed = projLogs.filter(l => l.completed).length;

  return (
    <div style={{ background: T.glass, border: `1px solid ${project.color}33`, borderRadius: 18, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: project.color, boxShadow: `0 0 8px ${project.color}88` }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{project.name}</span>
        </div>
        <button onClick={onEdit} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 13, padding: 4 }}>✏️</button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {[
          { value: fmtDuration(totalSec), label: "Toplam Süre" },
          { value: sessions,              label: "Oturum"      },
          { value: `${sessions > 0 ? Math.round((completed / sessions) * 100) : 0}%`, label: "Tamamlanma" },
        ].map(({ value, label }) => (
          <div key={label} style={{ flex: 1, background: `${project.color}10`, border: `1px solid ${project.color}22`, borderRadius: 12, padding: "8px 10px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: project.color }}>{value}</div>
            <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 600, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {sessions > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(completed / sessions) * 100}%`, background: project.color, borderRadius: 2, transition: "width 0.5s" }} />
          </div>
        </div>
      )}
    </div>
  );
}
