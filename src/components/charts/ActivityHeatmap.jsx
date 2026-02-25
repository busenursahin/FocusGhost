function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export function ActivityHeatmap({ timeLogs, T, theme }) {
  const WEEKS = 15;
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - WEEKS * 7 + 1);

  const dayMap = {};
  timeLogs.forEach(l => {
    const key = new Date(l.startTime).toDateString();
    dayMap[key] = (dayMap[key] || 0) + l.durationSec;
  });
  const maxSec = Math.max(...Object.values(dayMap), 1);

  const cols = [];
  for (let w = 0; w < WEEKS; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const key = date.toDateString();
      const sec = dayMap[key] || 0;
      const intensity = sec > 0 ? Math.min(Math.pow(sec / maxSec, 0.5), 1) : 0;
      const isToday = key === new Date().toDateString();
      col.push({ date, sec, intensity, isToday, future: date > today });
    }
    cols.push(col);
  }

  const accent = theme === "dark" ? T.mint : T.lavender;
  const CELL = 14, GAP = 3;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: GAP }}>
        {cols.map((col, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
            {col.map(({ date, sec, intensity, isToday, future }, di) => {
              const bg = future
                ? "transparent"
                : intensity === 0
                  ? T.border
                  : `rgba(${hexToRgb(accent)},${0.15 + intensity * 0.85})`;
              return (
                <div
                  key={di}
                  title={future ? "" : `${date.toLocaleDateString("tr-TR")}: ${Math.floor(sec / 60)} dk`}
                  style={{
                    width: CELL, height: CELL, borderRadius: 3,
                    background: bg,
                    outline: isToday ? `2px solid ${accent}` : "none",
                    outlineOffset: 1,
                    cursor: sec > 0 ? "pointer" : "default",
                    transition: "transform 0.1s",
                    flexShrink: 0,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 9, color: T.textMuted }}>Az</span>
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <div key={v} style={{ width: 10, height: 10, borderRadius: 2, background: v === 0 ? T.border : `rgba(${hexToRgb(accent)},${0.15 + v * 0.85})` }} />
        ))}
        <span style={{ fontSize: 9, color: T.textMuted }}>Çok</span>
      </div>
    </div>
  );
}
