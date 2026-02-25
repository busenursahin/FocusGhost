export function DonutChart({ data, T, size = 140 }) {
  const total = data.reduce((a, d) => a + d.value, 0);

  if (total === 0) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: T.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>Veri yok</span>
      </div>
    );
  }

  const R = 50, r = 30, cx = 60, cy = 60;
  let cumAngle = -Math.PI / 2;
  const slices = data.filter(d => d.value > 0).map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const startA = cumAngle;
    cumAngle += angle;
    return { ...d, startA, endA: cumAngle, angle };
  });

  function arc(startA, endA) {
    const x1 = cx + R * Math.cos(startA), y1 = cy + R * Math.sin(startA);
    const x2 = cx + R * Math.cos(endA),   y2 = cy + R * Math.sin(endA);
    const ix1 = cx + r * Math.cos(startA), iy1 = cy + r * Math.sin(startA);
    const ix2 = cx + r * Math.cos(endA),   iy2 = cy + r * Math.sin(endA);
    const large = endA - startA > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} L${ix2},${iy2} A${r},${r},0,${large},0,${ix1},${iy1} Z`;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
      {slices.map((s, i) => (
        <path key={i} d={arc(s.startA, s.endA)} fill={s.color} opacity={0.9}>
          <title>{s.label}: {Math.round(s.value / total * 100)}%</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={r - 2} fill="none" />
    </svg>
  );
}
