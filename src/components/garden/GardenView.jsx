import { ACTIVITY_MODES, getModeColor, fmtDate } from "../../constants.js";
import { PlantPot, GardenSky, GardenShelf, GardenScene } from "../../PlantSVG.jsx";
import { ProjectBadge } from "../ProjectBadge.jsx";

export function GardenView({ plants, projects, T, theme, big }) {
  const totalPlants = plants.length;
  const todayPlants = plants.filter(p => new Date(p.plantedAt).toDateString() === new Date().toDateString()).length;

  if (big) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "row", width: "100%", overflow: "hidden", animation: "fadeUp 0.35s ease" }}>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: `1px solid ${T.border}` }}>
          <GardenSky theme={theme} big style={{ flex: 1, minHeight: 0 }} />
          <GardenShelf plants={plants} theme={theme} big />
          {totalPlants > 0 && (
            <div style={{ flexShrink: 0, maxHeight: "40%", overflowY: "auto", padding: "14px 24px 20px", borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.textMuted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
                Tüm Bitkiler ({totalPlants})
              </div>
              {[...plants].reverse().map(plant => {
                const proj = projects.find(p => p.id === plant.projectId);
                const mode = ACTIVITY_MODES[plant.type];
                const pc = getModeColor(plant.type, theme).color;
                return (
                  <div key={plant.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, padding: "10px 12px", background: pc + "10", borderRadius: 14, border: `1px solid ${pc}22` }}>
                    <PlantPot type={plant.type} color={pc} small />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{mode?.emoji} {mode?.label}</div>
                      <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>{fmtDate(new Date(plant.plantedAt))}</div>
                    </div>
                    {proj && <ProjectBadge project={proj} small />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ width: 300, flexShrink: 0, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", padding: "24px 20px", borderLeft: `1px solid ${T.border}` }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>🌱 Bahçem</div>
            <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, marginTop: 4 }}>
              {totalPlants === 0 ? "Henüz hiç bitki yok" : `${totalPlants} bitki · Bugün ${todayPlants} yeni`}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[{ l: "Okuma", k: "read", emoji: "📚" }, { l: "Çalışma", k: "work", emoji: "✏️" }, { l: "Araştırma", k: "research", emoji: "🔍" }, { l: "Kodlama", k: "code", emoji: "💻" }].map(({ l, k, emoji }) => {
              const mc = getModeColor(k, theme);
              const cnt = plants.filter(p => p.type === k).length;
              return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, background: mc.color + "14", border: `1px solid ${mc.color}33`, borderRadius: 14, padding: "12px 16px" }}>
                  <span style={{ fontSize: 22 }}>{emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted }}>{l}</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: mc.color }}>{cnt}</div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16, background: T.glass, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: T.lavender }}>{totalPlants}</div>
            <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, marginTop: 2 }}>toplam bitki</div>
            {todayPlants > 0 && <div style={{ fontSize: 11, color: T.mint, fontWeight: 700, marginTop: 6 }}>+{todayPlants} bugün 🌿</div>}
          </div>

          {totalPlants === 0 && (
            <div style={{ marginTop: "auto", textAlign: "center", padding: "24px 0", opacity: 0.5 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🪴</div>
              <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, lineHeight: 1.7 }}>Her tamamlanan pomodoro<br />bahçene bir çiçek ekler</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", animation: "fadeUp 0.35s ease" }}>
      <div style={{ padding: "16px 18px 12px", flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>🌱 Bahçem</div>
        <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, marginTop: 3 }}>
          {totalPlants === 0 ? "Henüz hiç bitki yok — ilk pomodoronu tamamla!" : `${totalPlants} bitki · Bugün ${todayPlants} yeni`}
        </div>
      </div>

      {totalPlants === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 40 }}>
          <div style={{ fontSize: 56, opacity: 0.22 }}>🪴</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textMuted, textAlign: "center" }}>Bahçen seni bekliyor...</div>
          <div style={{ fontSize: 12, color: T.textMuted, textAlign: "center", maxWidth: 240, lineHeight: 1.6 }}>Her tamamlanan pomodoro<br />bahçene bir çiçek ekler 🌸</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 20px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[{ l: "Okuma", k: "read" }, { l: "Çalışma", k: "work" }, { l: "Araştırma", k: "research" }, { l: "Kodlama", k: "code" }].map(({ l, k }) => {
              const mc = getModeColor(k, theme);
              const cnt = plants.filter(p => p.type === k).length;
              return (
                <div key={k} style={{ flex: 1, background: mc.color + "18", border: `1px solid ${mc.color}44`, borderRadius: 14, padding: "8px 4px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: mc.color }}>{cnt}</div>
                  <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700 }}>{l}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginBottom: 16 }}><GardenScene plants={plants} theme={theme} tall={false} big={false} /></div>
          <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: 18, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 10 }}>Son Dikilen Bitkiler</div>
            {[...plants].reverse().slice(0, 8).map(plant => {
              const proj = projects.find(p => p.id === plant.projectId);
              const mode = ACTIVITY_MODES[plant.type];
              const pc = getModeColor(plant.type, theme).color;
              return (
                <div key={plant.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px 10px", background: pc + "10", borderRadius: 12, border: `1px solid ${pc}22` }}>
                  <PlantPot type={plant.type} color={pc} small />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{mode.emoji} {mode.label}</div>
                    <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>{fmtDate(new Date(plant.plantedAt))}</div>
                  </div>
                  {proj && <ProjectBadge project={proj} small />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
