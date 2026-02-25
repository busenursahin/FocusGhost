// ── Shared constants, theme, and utility functions ────────────────────────────

export const THEMES = {
  dark: {
    bg: "#1a1f2e", bgDeep: "#12151f", bgOuter: "#07080f",
    glass: "rgba(255,255,255,0.06)", glassBright: "rgba(255,255,255,0.10)",
    border: "rgba(255,255,255,0.08)", borderLight: "rgba(255,255,255,0.14)",
    text: "#e8e4f0", textMuted: "rgba(232,228,240,0.45)", textSoft: "rgba(232,228,240,0.7)",
    lavender: "#c4b5f7", mint: "#86efce", peach: "#fdb99b",
    red: "#ff8080", yellow: "#f7d070",
    navBg: "rgba(26,31,46,0.97)",
    inputBg: "rgba(255,255,255,0.06)",
    cardBg: "#1e2338",
    sceneBg: "linear-gradient(180deg,#0c1020 0%,#131828 45%,#1a1f2e 100%)",
    sceneBuilding: "#0d1020", sceneBuildingFace: "#111624",
    sceneWindow: "rgba(255,215,120,0.55)",
    sceneFrame: "rgba(170,150,120,0.4)",
    sceneCurtain: "rgba(120,85,100,0.5)",
    focusBg: "#0c1020",
    sunMoon: "#f0e8c8", sunMoonShadow: "#0c1020",
    starColor: "rgba(255,255,255,0.75)",
    moonVisible: true,
  },
  light: {
    bg: "#f0ece6", bgDeep: "#e8e3dc", bgOuter: "#ddd8d0",
    glass: "#ffffff", glassBright: "rgba(255,255,255,0.95)",
    border: "rgba(0,0,0,0.08)", borderLight: "rgba(0,0,0,0.14)",
    text: "#2d2840", textMuted: "rgba(45,40,64,0.58)", textSoft: "rgba(45,40,64,0.78)",
    lavender: "#7c5cbf", mint: "#2a9d6f", peach: "#d4713a",
    red: "#d94f4f", yellow: "#c49a0a",
    navBg: "rgba(240,236,230,0.97)",
    inputBg: "rgba(0,0,0,0.04)",
    cardBg: "#ffffff",
    sceneBg: "linear-gradient(180deg,#87ceeb 0%,#b8e0f7 50%,#ddf0f8 100%)",
    sceneBuilding: "#c8b8a2", sceneBuildingFace: "#d4c4ac",
    sceneWindow: "rgba(255,240,180,0.9)",
    sceneFrame: "rgba(160,120,80,0.5)",
    sceneCurtain: "rgba(180,140,100,0.4)",
    focusBg: "#87ceeb",
    sunMoon: "#FFD700", sunMoonShadow: "transparent",
    starColor: "rgba(255,255,255,0.0)",
    moonVisible: false,
  },
};

// Mutable ref pattern — App.jsx sets ThemeCtx.current on every render
export const ThemeCtx = { current: THEMES.dark };
export function useT() { return ThemeCtx.current; }

export const ACTIVITY_MODES = {
  read:     { label:"Okuma",      emoji:"📚",
    dark:  { color:"#c4b5f7", glow:"rgba(196,181,247,0.28)" },
    light: { color:"#7c5cbf", glow:"rgba(124,92,191,0.22)" },
    duration:25*60 },
  work:     { label:"Çalışma",    emoji:"✏️",
    dark:  { color:"#86efce", glow:"rgba(134,239,206,0.25)" },
    light: { color:"#2a9d6f", glow:"rgba(42,157,111,0.22)" },
    duration:25*60 },
  research: { label:"Araştırma",  emoji:"🔍",
    dark:  { color:"#93c5fd", glow:"rgba(147,197,253,0.25)" },
    light: { color:"#2563eb", glow:"rgba(37,99,235,0.22)" },
    duration:30*60 },
  code:     { label:"Kodlama",    emoji:"💻",
    dark:  { color:"#6ee7b7", glow:"rgba(110,231,183,0.25)" },
    light: { color:"#059669", glow:"rgba(5,150,105,0.22)" },
    duration:25*60 },
  /* --- Düzenleme modu ileride kullanmak için yorumda ---
  clean: { label:"Düzenleme", emoji:"🧹",
    dark:  { color:"#fdb99b", glow:"rgba(253,185,155,0.25)" },
    light: { color:"#d4713a", glow:"rgba(212,113,58,0.22)" },
    duration:20*60 },
  */
};

export function getModeColor(mode, theme) {
  const m = ACTIVITY_MODES[mode];
  if (!m) return { color: "#888", background: "rgba(136,136,136,0.15)" };
  return m[theme] || m.dark;
}

export const PROJECT_COLORS = ["#c4b5f7","#86efce","#fdb99b","#ff8080","#f7d070","#80c8ff","#ff9de2","#a8e6cf"];

export const KANBAN_COLS = [
  { id:"todo",       label:"Yapılacak",    color:"#93c5fd" },
  { id:"inprogress", label:"Devam Ediyor", color:"#fbbf24" },
  { id:"done",       label:"Tamamlandı",   color:"#86efce" },
];

export const DEFAULT_PROJECTS = [
  { id:"p1", name:"Kişisel", color:"#c4b5f7", totalSec:0 },
  { id:"p2", name:"İş",      color:"#86efce", totalSec:0 },
  { id:"p3", name:"Ders",    color:"#fdb99b", totalSec:0 },
];

export function fmt(s) {
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

export function fmtDuration(sec) {
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  if (h > 0) return `${h}s ${m}dk`;
  if (m > 0) return `${m}dk ${s > 0 ? s+"s" : ""}`.trim();
  return `${sec}s`;
}

export function fmtTime(date) {
  return `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
}

export function fmtDate(date) {
  const d = new Date(date);
  const today = new Date(); const yest = new Date(); yest.setDate(yest.getDate()-1);
  if (d.toDateString()===today.toDateString()) return "Bugün";
  if (d.toDateString()===yest.toDateString()) return "Dün";
  return d.toLocaleDateString("tr-TR", {day:"numeric",month:"short"});
}
