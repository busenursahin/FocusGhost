export function WeeklyBarChart({ timeLogs, T }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i); return d;
  });
  const DAY_LABELS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const data = days.map(d => {
    const ds = d.toDateString();
    const sec = timeLogs.filter(l => new Date(l.startTime).toDateString() === ds).reduce((a, l) => a + l.durationSec, 0);
    return { label: DAY_LABELS[d.getDay()], sec, isToday: ds === new Date().toDateString() };
  });
  const maxSec = Math.max(...data.map(d => d.sec), 1);
  const BAR_H = 120;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: BAR_H, padding: "0 4px" }}>
        {data.map(({ label, sec, isToday }, i) => {
          const pct = sec / maxSec;
          const h = Math.max(pct * BAR_H, sec > 0 ? 6 : 2);
          const color = isToday ? T.lavender : T.mint;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
              {sec > 0 && <div style={{ fontSize: 8, fontWeight: 700, color, opacity: 0.85 }}>{sec >= 3600 ? `${Math.floor(sec / 3600)}s` : `${Math.floor(sec / 60)}dk`}</div>}
              <div
                title={`${label}: ${Math.floor(sec / 60)} dk`}
                style={{
                  width: "100%", height: h,
                  background: sec > 0 ? `linear-gradient(180deg, ${color}dd 0%, ${color}88 100%)` : T.border,
                  borderRadius: "6px 6px 3px 3px",
                  transition: "height 0.5s cubic-bezier(0.34,1.56,0.64,1)",
                  boxShadow: sec > 0 ? `0 0 8px ${color}44` : "none",
                  outline: isToday ? `2px solid ${color}88` : "none",
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, padding: "6px 4px 0", marginTop: 2 }}>
        {data.map(({ label, isToday }, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, fontWeight: isToday ? 800 : 600, color: isToday ? T.lavender : T.textMuted }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
