import { useState, useEffect, useRef, useCallback } from "react";
import posthog from "posthog-js";
import {
  THEMES, ThemeCtx,
  ACTIVITY_MODES, getModeColor,
  PROJECT_COLORS, DEFAULT_PROJECTS,
  fmt, fmtDuration, fmtDate,
} from "./constants.js";
import { Ghost } from "./GhostSVG.jsx";
import { PlantPot } from "./PlantSVG.jsx";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { useAsmr, SOUNDS } from "./hooks/useAsmr.js";
import { Ring } from "./components/ui/Ring.jsx";
import { Dots } from "./components/ui/Dots.jsx";
import { Toast } from "./components/ui/Toast.jsx";
import { Modal } from "./components/ui/Modal.jsx";
import { DurationPicker } from "./components/ui/DurationPicker.jsx";
import { Scene } from "./components/scene/Scene.jsx";
import { GardenView } from "./components/garden/GardenView.jsx";
import { KanbanBoard } from "./components/kanban/KanbanBoard.jsx";
import { WeeklyBarChart } from "./components/charts/WeeklyBarChart.jsx";
import { ActivityHeatmap } from "./components/charts/ActivityHeatmap.jsx";
import { DonutChart } from "./components/charts/DonutChart.jsx";
import { ProjectBadge } from "./components/ProjectBadge.jsx";
import { ProjectCard } from "./components/ProjectCard.jsx";
import { TaskLogGroup } from "./components/TaskLogGroup.jsx";
import { PlantPickerModal } from "./components/PlantPickerModal.jsx";
import { FeedbackModal } from "./components/FeedbackModal.jsx";

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [theme, setTheme]           = useLocalStorage("fg_theme", "dark");
  const T = THEMES[theme];
  ThemeCtx.current = T; // sync for useT() hook
  const [actMode, setActMode]       = useState("work");
  const [remaining, setRemaining]   = useState(ACTIVITY_MODES.work.duration);
  const [running, setRunning]       = useState(false);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [isBreak, setIsBreak]       = useState(false);
  const [breakRemaining, setBreakRemaining] = useState(0);
  const [breakRunning, setBreakRunning]     = useState(false);
  const breakIntervalRef = useRef(null);
  const [tab, setTab]               = useState("timer");
  const [showControls, setShowControls] = useState(true);
  const [isBrowserFS, setIsBrowserFS]   = useState(() => window.innerWidth >= 768);  // auto-fullscreen on desktop
  const appRef = useRef(null);  // ref on the outermost div

  // Responsive: switch between desktop and phone layout on resize
  useEffect(() => {
    const onResize = () => setIsBrowserFS(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Projects & Logs
  const [projects, setProjects]     = useLocalStorage("fg_projects", DEFAULT_PROJECTS);
  const [timeLogs, setTimeLogs]     = useLocalStorage("fg_timelogs", []);
  const [activeProjectId, setActiveProjectId] = useLocalStorage("fg_activeProject", "p1");
  const [gardenPlants, setGardenPlants] = useLocalStorage("fg_gardenPlants", []);
  const [customDurations, setCustomDurations] = useLocalStorage("fg_durations", { read: 25, work: 25, research: 30, code: 25 });
  const [kanbanCards, setKanbanCards]   = useLocalStorage("fg_kanban", {});
  const [kanbanProjId, setKanbanProjId] = useState(null);
  const [showPlantPicker, setShowPlantPicker] = useState(false);
  const [pendingPlantInfo, setPendingPlantInfo] = useState(null); // { projectId, plantedAt, activityMode }
  const [showFeedback, setShowFeedback] = useState(false);

  // Tasks
  const [tasks, setTasks]           = useLocalStorage("fg_tasks", [
    { id:"t1", text:"Makale oku",       mode:"read",   projectId:null, duration:25, createdAt: Date.now()-2*86400000 },
    { id:"t2", text:"Notları düzenle",  mode:"work",   projectId:null, duration:25, createdAt: Date.now()-1*86400000 },
    { id:"t3", text:"Proje özeti yaz",  mode:"work",   projectId:null, duration:25, createdAt: Date.now() },
  ]);
  const [inputOpen, setInputOpen]   = useState(false);
  const [inputText, setInputText]   = useState("");
  const [taskProjectId, setTaskProjectId] = useState(null);
  const [taskMode, setTaskMode]     = useState("work");
  const [taskDuration, setTaskDuration] = useState(25); // dakika

  // Modals
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject]     = useState(null);
  const [newProjName, setNewProjName]           = useState("");
  const [newProjColor, setNewProjColor]         = useState(PROJECT_COLORS[0]);
  const [showLogDetail, setShowLogDetail]       = useState(false);

  // Toast
  const [toast, setToast] = useState({show:false,msg:""});

  // Session tracking
  const sessionStartRef  = useRef(null);
  const sessionStartRem  = useRef(null);
  const intervalRef      = useRef(null);
  const toastRef         = useRef(null);
  const hideRef          = useRef(null);
  const inputRef         = useRef(null);

  // ASMR
  const asmr = useAsmr();
  const [autoSoundEnabled, setAutoSoundEnabled] = useState(false);
  const [lastSound, setLastSound] = useState("rain");

  const _modeBase = ACTIVITY_MODES[actMode];
  const cfg = { ..._modeBase, ...getModeColor(actMode, theme), duration: customDurations[actMode] * 60 };
  const progress = remaining / cfg.duration;
  const isFocus = running && tab === "timer";
  const activeTask = tasks.find(t=>t.active&&!t.done);

  // ── Controls auto-hide ──────────────────────────────────────────────────────
  useEffect(() => {
    if (running) { clearTimeout(hideRef.current); hideRef.current=setTimeout(()=>setShowControls(false),3000); }
    else { clearTimeout(hideRef.current); setShowControls(true); }
  }, [running]);


  // u2500u2500 Auto sound on focus start/stop u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (autoSoundEnabled) asmr.autoPlay(running, lastSound); }, [running]);
  const handleTap = useCallback(() => {
    if (!running) return;
    setShowControls(true); clearTimeout(hideRef.current);
    hideRef.current = setTimeout(()=>setShowControls(false), 3000);
  }, [running]);

  const toggleBrowserFS = useCallback(() => {
    setIsBrowserFS(f => !f);
  }, []);



  const showToast = useCallback((msg) => {
    setToast({show:true,msg}); clearTimeout(toastRef.current);
    toastRef.current = setTimeout(()=>setToast(t=>({...t,show:false})), 2800);
  }, []);

  // ── Record a time log ───────────────────────────────────────────────────────
  const recordLog = useCallback((completed, endRem) => {
    if (!sessionStartRef.current) return;
    const startTime = sessionStartRef.current;
    const endTime = new Date();
    const plannedDuration = sessionStartRem.current || cfg.duration;
    const actualDuration = Math.round((endTime - startTime) / 1000);
    if (actualDuration < 5) return; // ignore accidental

    const log = {
      id: Date.now()+"",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSec: actualDuration,
      plannedSec: plannedDuration,
      activityMode: actMode,
      activityLabel: cfg.label,
      activityEmoji: cfg.emoji,
      projectId: activeProjectId,
      taskName: activeTask ? activeTask.text : null,
      taskId: activeTask ? activeTask.id : null,
      completed,
      date: startTime.toDateString(),
    };
    setTimeLogs(prev => [log, ...prev]);

    // Analytics
    posthog.capture(completed ? "pomodoro_completed" : "pomodoro_interrupted", {
      activity_mode: actMode,
      planned_sec: plannedDuration,
      actual_sec: actualDuration,
      has_task: !!activeTask,
      has_project: !!activeProjectId,
    });

    // Update task pomos if completed
    if (completed && activeTask) {
      setTasks(prev => prev.map(t => t.id===activeTask.id ? {...t, pomos: t.pomos+1} : t));
    }

    sessionStartRef.current = null;
    sessionStartRem.current = null;
  }, [actMode, cfg, activeProjectId, activeTask]);

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (running) {
      if (!sessionStartRef.current) {
        sessionStartRef.current = new Date();
        sessionStartRem.current = remaining;
        posthog.capture("timer_started", {
          activity_mode: actMode,
          duration_min: Math.round(remaining / 60),
          has_task: !!activeTask,
          has_project: !!activeProjectId,
          theme,
        });
      }
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clearInterval(intervalRef.current); setRunning(false); return 0; }
          return r-1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // ── On finish (remaining hits 0 while was running) ──────────────────────────
  const prevRunningRef = useRef(false);
  useEffect(() => {
    if (prevRunningRef.current && !running && remaining === 0) {
      recordLog(true, 0);
      const newIdx = (sessionIdx + 1) % 4;
      setSessionIdx(newIdx);
      setPendingPlantInfo({ projectId: activeProjectId, plantedAt: new Date().toISOString(), activityMode: actMode });
      setShowPlantPicker(true);
      // Reset timer for next session, break will start after plant picker
      setRemaining(customDurations[actMode] * 60);
      // Store newIdx for break duration
      pendingBreakIdxRef.current = newIdx;
    }
    prevRunningRef.current = running;
  }, [running]);

  const pendingBreakIdxRef = useRef(0);

  // ── Break helpers ────────────────────────────────────────────────────────────
  const startBreak = useCallback((newSessionIdx) => {
    const isLong = newSessionIdx === 0;
    const dur = isLong ? 15 * 60 : 5 * 60;
    setBreakRemaining(dur);
    setIsBreak(true);
    setBreakRunning(true); // useEffect will start the interval
    showToast(isLong ? "🎉 Uzun mola! 15 dakika dinlen." : "☕ Kısa mola! 5 dakika dinlen.");
  }, [showToast]);

  const skipBreak = useCallback(() => {
    clearInterval(breakIntervalRef.current);
    setIsBreak(false);
    setBreakRunning(false);
    setBreakRemaining(0);
  }, []);

  // Pause/resume break
  useEffect(() => {
    if (!isBreak) return;
    if (breakRunning) {
      clearInterval(breakIntervalRef.current);
      breakIntervalRef.current = setInterval(() => {
        setBreakRemaining(r => {
          if (r <= 1) {
            clearInterval(breakIntervalRef.current);
            setBreakRunning(false);
            setIsBreak(false);
            showToast("☀️ Mola bitti! Hazır olduğunda başlat.");
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      clearInterval(breakIntervalRef.current);
    }
    return () => clearInterval(breakIntervalRef.current);
  }, [breakRunning, isBreak]);

  // ── Pause mid-session ───────────────────────────────────────────────────────
  const pauseTimer = useCallback(() => {
    if (running) {
      recordLog(false, remaining);
      setRunning(false);
    }
  }, [running, remaining, recordLog]);

// Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "f" || e.key === "F") toggleBrowserFS();
      if (e.key === " ") { e.preventDefault(); running ? pauseTimer() : setRunning(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleBrowserFS, running, pauseTimer]);


  const resetTimer = useCallback(() => {
    if (running) recordLog(false, remaining);
    setRunning(false);
    setRemaining(cfg.duration);
    sessionStartRef.current = null;
  }, [running, remaining, cfg, recordLog]);

  const skipTimer = useCallback(() => {
    if (running) recordLog(false, remaining);
    setRunning(false);
    setRemaining(0);
    sessionStartRef.current = null;
  }, [running, remaining, recordLog]);

  const switchActivity = useCallback((mode) => {
    if (running) recordLog(false, remaining);
    clearInterval(intervalRef.current);
    setRunning(false); setActMode(mode); setRemaining(customDurations[mode] * 60);
    sessionStartRef.current = null;
  }, [running, remaining, recordLog, customDurations]);

  // ── Plant selection after pomodoro ──────────────────────────────────────────
  const handlePlantSelect = useCallback((type) => {
    if (!pendingPlantInfo) return;
    setGardenPlants(prev => [...prev, {
      id: Date.now()+"",
      type,
      plantedAt: pendingPlantInfo.plantedAt,
      projectId: pendingPlantInfo.projectId,
    }]);
    setShowPlantPicker(false);
    setPendingPlantInfo(null);
    const names = { read:"Lavanta 🪻", work:"Sukulent 🌵", research:"Papatya 🌼", code:"Kaktüs 🌵" };
    showToast(`🌱 ${names[type]||type} bahçene eklendi!`);
    // Start break after plant is picked
    startBreak(pendingBreakIdxRef.current);
  }, [pendingPlantInfo, showToast, startBreak]);

  // ── Duration change helper ───────────────────────────────────────────────────
  const changeDuration = useCallback((mins) => {
    if (running) return;
    setCustomDurations(prev => ({ ...prev, [actMode]: mins }));
    setRemaining(mins * 60);
    sessionStartRef.current = null;
  }, [running, actMode]);

  // ── Force complete (test/dev) ────────────────────────────────────────────────
  const forceComplete = useCallback(() => {
    clearInterval(intervalRef.current);
    if (!sessionStartRef.current) {
      sessionStartRef.current = new Date(Date.now() - 5000);
      sessionStartRem.current = cfg.duration;
    }
    setRunning(false);
    setRemaining(0);
  }, [cfg.duration]);

  // ── Kanban helpers ───────────────────────────────────────────────────────────

  // Projeye ait görevleri kanban'a otomatik ekle (zaten varsa atlıyor)
  const syncTasksToKanban = useCallback((projId) => {
    const projTasks = tasks.filter(t => t.projectId === projId);
    if (!projTasks.length) return;
    setKanbanCards(prev => {
      const existing = prev[projId] || [];
      const existingIds = new Set(existing.map(c => c.id));
      const newCards = projTasks
        .filter(t => !existingIds.has("task_" + t.id))
        .map(t => ({
          id: "task_" + t.id,
          title: t.text,
          col: "todo",
          fromTask: true,
          mode: t.mode || null,
          duration: t.duration || null,
          createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        }));
      if (!newCards.length) return prev;
      return { ...prev, [projId]: [...existing, ...newCards] };
    });
  }, [tasks, setKanbanCards]);

  // Board açılınca görevleri senkronize et
  useEffect(() => {
    if (kanbanProjId) syncTasksToKanban(kanbanProjId);
  }, [kanbanProjId]); // eslint-disable-line

  const addKanbanCard = useCallback((projId, colId, title) => {
    setKanbanCards(prev => ({
      ...prev,
      [projId]: [...(prev[projId] || []), { id: Date.now()+"k", title, col: colId, createdAt: new Date().toISOString() }],
    }));
  }, [setKanbanCards]);

  const deleteKanbanCard = useCallback((projId, cardId) => {
    setKanbanCards(prev => ({
      ...prev,
      [projId]: (prev[projId] || []).filter(c => c.id !== cardId),
    }));
  }, [setKanbanCards]);

  const moveKanbanCard = useCallback((projId, cardId, targetCol) => {
    setKanbanCards(prev => ({
      ...prev,
      [projId]: (prev[projId] || []).map(c => c.id === cardId ? { ...c, col: targetCol } : c),
    }));
  }, [setKanbanCards]);

  // ── Dev: Seed dummy data ─────────────────────────────────────────────────────
  const seedDummyData = useCallback(() => {
    const now = Date.now();
    const day = 86400000;

    const demoProjects = [
      { id:"p1", name:"Startup",     color:"#c4b5f7", totalSec:14400 },
      { id:"p2", name:"Freelance",   color:"#86efce", totalSec:10800 },
      { id:"p3", name:"Açık Kaynak", color:"#fdb99b", totalSec: 7200 },
    ];

    const demoTasks = [
      { id:"d1", text:"Makale oku",                   mode:"read",     projectId:null, duration:25, createdAt: now - 2*day },
      { id:"d2", text:"Notları düzenle",              mode:"work",     projectId:null, duration:25, createdAt: now - 1*day },
      { id:"d3", text:"Proje özeti yaz",              mode:"work",     projectId:"p1", duration:25, createdAt: now - 4*day },
      { id:"d4", text:"Auth modülü refaktörü",        mode:"code",     projectId:"p1", duration:25, createdAt: now - 3*day },
      { id:"d5", text:"Performans darboğazı analizi", mode:"research", projectId:"p1", duration:30, createdAt: now - 5*day },
      { id:"d6", text:"REST API entegrasyonu",        mode:"code",     projectId:"p2", duration:25, createdAt: now - 6*day },
      { id:"d7", text:"CI/CD pipeline kurulumu",      mode:"research", projectId:"p3", duration:30, createdAt: now },
    ];

    // Last 14 days — developer-heavy (code + research dominant)
    const slots = [
      { mode:"read",     task:["d1","Makale oku"],                   proj:null },
      { mode:"work",     task:["d2","Notları düzenle"],              proj:null },
      { mode:"work",     task:["d3","Proje özeti yaz"],              proj:"p1" },
      { mode:"code",     task:["d4","Auth modülü refaktörü"],        proj:"p1" },
      { mode:"research", task:["d5","Performans darboğazı analizi"], proj:"p1" },
      { mode:"code",     task:["d6","REST API entegrasyonu"],        proj:"p2" },
      { mode:"research", task:["d7","CI/CD pipeline kurulumu"],      proj:"p3" },
      { mode:"code",     task:null,                                   proj:"p2" },
      { mode:"work",     task:null,                                   proj:null },
    ];
    const demoLogs = [];
    let lid = 1;
    for (let d = 13; d >= 0; d--) {
      // Weekends lighter, weekdays 2-4 sessions
      const weekday = new Date(now - d*day).getDay();
      const sessions = (weekday === 0 || weekday === 6) ? 1 : [2,3,4,3,2,4,3][d%7];
      for (let s = 0; s < sessions; s++) {
        const slot = slots[(d * 3 + s) % slots.length];
        const dur = slot.mode === "research" ? 30*60 : 25*60;
        const startTime = new Date(now - d*day + (9 + s*1.5) * 3600000);
        demoLogs.push({
          id: `dl${lid++}`,
          activityMode: slot.mode,
          activityLabel: { read:"Okuma", work:"Çalışma", research:"Araştırma", code:"Kodlama" }[slot.mode],
          projectId: slot.proj,
          taskId:   slot.task ? slot.task[0] : null,
          taskName: slot.task ? slot.task[1] : null,
          durationSec: dur,
          startedAt: startTime.toISOString(),
          endedAt: new Date(startTime.getTime() + dur*1000).toISOString(),
        });
      }
    }

    // Garden: code & research dominant
    const plantTypes = ["code","code","research","work","code","research","code","work","research","code","read","code"];
    const plantProjs = ["p1","p2","p3","p1","p2","p1","p3","p2","p1","p3","p2","p1"];
    const demoPlants = plantTypes.map((type, i) => ({
      id: `dp${i+1}`,
      type,
      projectId: plantProjs[i],
      plantedAt: new Date(now - (12-i) * day * 1.5).toISOString(),
    }));

    const demoKanban = {
      p1: [
        { id:"k1",  title:"Kullanıcı kimlik doğrulama sistemi", col:"done",       createdAt: new Date(now-8*day).toISOString() },
        { id:"k2",  title:"Dashboard tasarımı",                 col:"done",       createdAt: new Date(now-7*day).toISOString() },
        { id:"k3",  title:"Profil sayfası bileşenleri",         col:"inprogress", createdAt: new Date(now-4*day).toISOString() },
        { id:"k4",  title:"Bildirim sistemi entegrasyonu",       col:"inprogress", createdAt: new Date(now-2*day).toISOString() },
        { id:"k5",  title:"Dark mode desteği",                  col:"todo",       createdAt: new Date(now-1*day).toISOString() },
        { id:"k6",  title:"Performans optimizasyonu",            col:"todo",       createdAt: new Date(now).toISOString() },
      ],
      p2: [
        { id:"k7",  title:"API endpoint tasarımı",              col:"done",       createdAt: new Date(now-10*day).toISOString() },
        { id:"k8",  title:"Veritabanı şeması oluşturma",        col:"done",       createdAt: new Date(now-9*day).toISOString() },
        { id:"k9",  title:"REST API geliştirme",                col:"inprogress", createdAt: new Date(now-5*day).toISOString() },
        { id:"k10", title:"Postman koleksiyonu hazırlama",       col:"todo",       createdAt: new Date(now-3*day).toISOString() },
        { id:"k11", title:"Entegrasyon testleri",               col:"todo",       createdAt: new Date(now).toISOString() },
      ],
      p3: [
        { id:"k12", title:"CI pipeline kurulumu",               col:"done",       createdAt: new Date(now-6*day).toISOString() },
        { id:"k13", title:"Docker image yapılandırması",         col:"inprogress", createdAt: new Date(now-3*day).toISOString() },
        { id:"k14", title:"Deployment otomasyonu",              col:"todo",       createdAt: new Date(now-1*day).toISOString() },
        { id:"k15", title:"Monitoring & alerting",              col:"todo",       createdAt: new Date(now).toISOString() },
      ],
    };

    setProjects(demoProjects);
    setTasks(demoTasks);
    setTimeLogs(demoLogs);
    setGardenPlants(demoPlants);
    setKanbanCards(demoKanban);
  }, [setProjects, setTasks, setTimeLogs, setGardenPlants, setKanbanCards]);

  // ── Project helpers ─────────────────────────────────────────────────────────
  const saveProject = () => {
    if (!newProjName.trim()) return;
    if (editingProject) {
      setProjects(prev=>prev.map(p=>p.id===editingProject.id?{...p,name:newProjName.trim(),color:newProjColor}:p));
    } else {
      const np = {id:"p"+Date.now(), name:newProjName.trim(), color:newProjColor, totalSec:0};
      setProjects(prev=>[...prev,np]);
    }
    setShowProjectModal(false); setEditingProject(null); setNewProjName(""); setNewProjColor(PROJECT_COLORS[0]);
  };
  const openNewProject = () => { setEditingProject(null); setNewProjName(""); setNewProjColor(PROJECT_COLORS[0]); setShowProjectModal(true); };
  const openEditProject = (p) => { setEditingProject(p); setNewProjName(p.name); setNewProjColor(p.color); setShowProjectModal(true); };

  // ── Task helpers ─────────────────────────────────────────────────────────────
  const addTask = () => {
    if (!inputText.trim()) return;
    const newId = Date.now()+"";
    const newTask = { id:newId, text:inputText.trim(), pomos:0, done:false, active:false, projectId:taskProjectId, mode:taskMode, duration:taskDuration };
    setTasks(prev=>[newTask,...prev]);
    // Projeye atanmışsa kanban'ın "Yapılacak" kolonuna da ekle
    if (taskProjectId) {
      setKanbanCards(prev => ({
        ...prev,
        [taskProjectId]: [...(prev[taskProjectId]||[]), {
          id: "task_" + newId,
          title: inputText.trim(),
          col: "todo",
          fromTask: true,
          mode: taskMode || null,
          duration: taskDuration || null,
          createdAt: new Date().toISOString(),
        }],
      }));
    }
    setInputText(""); setInputOpen(false); setTaskProjectId(null); showToast("✅ Görev eklendi");
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalSec     = timeLogs.reduce((a,l)=>a+l.durationSec,0);
  const completedLogs = timeLogs.filter(l=>l.completed).length;
  const incompleteLogs = timeLogs.filter(l=>!l.completed).length;

  // Group logs by date
  const logsByDate = timeLogs.reduce((acc,l) => {
    const d = fmtDate(new Date(l.startTime));
    if (!acc[d]) acc[d]=[];
    acc[d].push(l);
    return acc;
  }, {});

  // Group logs by date → taskId (Clockify-style)
  const logsByDateAndTask = Object.entries(logsByDate).map(([date, logs]) => {
    const taskMap = {};
    logs.forEach(l => {
      const key = l.taskId || ("__notask__" + l.activityMode);
      if (!taskMap[key]) taskMap[key] = { taskId: l.taskId||null, taskName: l.taskName||l.activityLabel, logs: [] };
      taskMap[key].logs.push(l);
    });
    const daySec = logs.reduce((a,l)=>a+l.durationSec,0);
    return { date, daySec, taskGroups: Object.values(taskMap) };
  });

  const now = new Date();
  const clock = `${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;

  const CTL_BTN = {width:52,height:52,borderRadius:18,border:"1px solid rgba(255,255,255,0.16)",background:"rgba(255,255,255,0.09)",backdropFilter:"blur(10px)",color:"rgba(255,255,255,0.65)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"};

  // ── Shared render helpers ───────────────────────────────────────────────────
  const fmtH = s => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}s ${m}dk`:`${m}dk`; };

  return (
    <div ref={appRef} style={{position:isBrowserFS?"fixed":"relative",inset:isBrowserFS?0:"auto",zIndex:isBrowserFS?9999:"auto",minHeight:isBrowserFS?"unset":"100vh",background:isBrowserFS?T.bg:T.bgOuter,display:"flex",alignItems:"center",justifyContent:"center",padding:isBrowserFS?0:20,transition:"all 0.4s ease"}}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Nunito',system-ui,sans-serif}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
        input,button,select{font-family:'Nunito',system-ui,sans-serif}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes glow{0%,100%{opacity:0.6}50%{opacity:1}}
        @keyframes slideD{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideU{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes soundBar0{from{height:3px}to{height:9px}}
        @keyframes soundBar1{from{height:5px}to{height:12px}}
        @keyframes soundBar2{from{height:4px}to{height:10px}}
        @keyframes soundBar3{from{height:6px}to{height:14px}}
        @keyframes soundBar4{from{height:3px}to{height:8px}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.2)}to{opacity:1;transform:scale(1)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        input[type=range]{-webkit-appearance:none;background:${T.border};border-radius:4px;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:${T.lavender};cursor:pointer;box-shadow:0 0 6px ${T.lavender}99}
      `}</style>

      {/* ══════════════════════════════════════════════════
           DESKTOP LAYOUT (fullscreen mode)
      ══════════════════════════════════════════════════ */}
      {isBrowserFS && (
        <div style={{display:"flex",width:"100%",height:"100vh",fontFamily:"'Nunito',system-ui,sans-serif",background:T.bg,color:T.text,overflow:"hidden"}}>

          {/* ── LEFT SIDEBAR ── */}
          <div style={{width:240,flexShrink:0,background:T.bgDeep,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"}}>
            {/* Logo */}
            <div style={{padding:"20px 20px 16px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <span style={{fontSize:24}}>👻</span>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:T.text}}>FocusGhost</div>
                  <div style={{fontSize:10,color:T.textMuted,fontWeight:600}}>Pomodoro Tracker</div>
                </div>
                <button onClick={toggleBrowserFS} title="Küçült" style={{marginLeft:"auto",background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,padding:"4px 6px",cursor:"pointer",color:T.textMuted,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                </button>
              </div>
              {/* Theme toggle */}
              <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{width:"100%",background:T.glass,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:7,color:T.textSoft,fontSize:11,fontWeight:700,transition:"all 0.2s"}}>
                <span style={{fontSize:14}}>{theme==="dark"?"🌙":"☀️"}</span>
                <span>{theme==="dark"?"Koyu Mod":"Açık Mod"}</span>
                <span style={{marginLeft:"auto",fontSize:9,color:T.textMuted}}>Değiştir</span>
              </button>
            </div>

            {/* Nav items */}
            <div style={{padding:"12px 12px",flexShrink:0}}>
              <div style={{fontSize:9,fontWeight:800,color:T.textMuted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8,paddingLeft:8}}>Menü</div>
              {[
                {icon:"⏱️",label:"Timer",key:"timer"},
                {icon:"📁",label:"Projeler",key:"projects"},
                {icon:"🕐",label:"Kayıtlar",key:"logs"},
                {icon:"📊",label:"İstatistik",key:"stats"},
                {icon:"🌱",label:"Bahçem",key:"garden"},
              ].map(({icon,label,key})=>(
                <button key={key} onClick={()=>setTab(key)} style={{width:"100%",border:"none",cursor:"pointer",borderRadius:12,background:tab===key?cfg.color+"18":"transparent",padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:3,color:tab===key?cfg.color:T.textSoft,fontSize:13,fontWeight:tab===key?700:500,outline:tab===key?`1px solid ${cfg.color}33`:"none",transition:"all 0.2s",textAlign:"left"}}>
                  <span style={{fontSize:18,width:22,textAlign:"center"}}>{icon}</span>
                  <span>{label}</span>
                  {tab===key && <div style={{marginLeft:"auto",width:5,height:5,borderRadius:"50%",background:cfg.color}}/>}
                </button>
              ))}
              {/* Geri Bildirim */}
              <button onClick={()=>setShowFeedback(true)} style={{width:"100%",border:`1px solid ${T.border}`,cursor:"pointer",borderRadius:12,background:"transparent",padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginTop:8,color:T.textSoft,fontSize:13,fontWeight:500,transition:"all 0.2s",textAlign:"left"}}>
                <span style={{fontSize:18,width:22,textAlign:"center"}}>💬</span>
                <span>Geri Bildirim</span>
              </button>
            </div>

            {/* Active session + project / garden info */}
            <div style={{padding:"0 12px",flex:1,overflowY:"auto"}}>
              {tab === "garden" ? (
                /* ── Garden sidebar summary ── */
                <>
                  <div style={{fontSize:9,fontWeight:800,color:T.textMuted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8,paddingLeft:8}}>Bahçe Özeti</div>
                  {/* Total count */}
                  <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px 10px",textAlign:"center",marginBottom:10}}>
                    <div style={{fontSize:30,fontWeight:800,color:T.lavender}}>{gardenPlants.length}</div>
                    <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginTop:2}}>toplam bitki</div>
                    <div style={{fontSize:10,color:T.textMuted,fontWeight:600,marginTop:4}}>
                      Bugün: <span style={{color:T.mint,fontWeight:700}}>{gardenPlants.filter(p=>new Date(p.plantedAt).toDateString()===new Date().toDateString()).length}</span>
                    </div>
                  </div>
                  {/* Per-mode breakdown */}
                  {[{k:"read",l:"Okuma"},{k:"work",l:"Çalışma"},{k:"research",l:"Araştırma"},{k:"code",l:"Kodlama"}].map(({k,l})=>{
                    const mc=getModeColor(k,theme);
                    const cnt=gardenPlants.filter(p=>p.type===k).length;
                    const m=ACTIVITY_MODES[k];
                    if(!m) return null;
                    return (
                      <div key={k} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:cnt>0?mc.color+"12":"transparent",borderRadius:10,marginBottom:4,border:`1px solid ${cnt>0?mc.color+"22":T.border}`}}>
                        <span style={{fontSize:15}}>{m.emoji}</span>
                        <span style={{fontSize:12,fontWeight:600,color:T.textSoft,flex:1}}>{l}</span>
                        <span style={{fontSize:14,fontWeight:800,color:cnt>0?mc.color:T.textMuted}}>{cnt}</span>
                      </div>
                    );
                  })}
                  {/* Latest plant preview */}
                  {gardenPlants.length > 0 && (
                    <div style={{marginTop:10}}>
                      <div style={{fontSize:9,fontWeight:800,color:T.textMuted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:6,paddingLeft:2}}>Son Eklenen</div>
                      {[...gardenPlants].reverse().slice(0,3).map(plant=>{
                        const pc=getModeColor(plant.type,theme).color;
                        const mode=ACTIVITY_MODES[plant.type];
                        return (
                          <div key={plant.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:T.glass,borderRadius:10,marginBottom:4}}>
                            <PlantPot type={plant.type} color={pc} small/>
                            <div>
                              <div style={{fontSize:11,fontWeight:700,color:T.textSoft}}>{mode.emoji} {mode.label}</div>
                              <div style={{fontSize:9,color:T.textMuted}}>{fmtDate(new Date(plant.plantedAt))}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* ── Normal projects list ── */
                <>
                  <div style={{fontSize:9,fontWeight:800,color:T.textMuted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8,paddingLeft:8}}>Projeler</div>
                  {projects.map(p=>{
                    const pSec = timeLogs.filter(l=>l.projectId===p.id).reduce((a,l)=>a+l.durationSec,0);
                    const cardCount = (kanbanCards[p.id]||[]).length;
                    return (
                      <div key={p.id} style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}>
                        <button onClick={()=>setActiveProjectId(p.id)} style={{flex:1,border:"none",cursor:"pointer",borderRadius:12,background:activeProjectId===p.id?`${p.color}18`:"transparent",padding:"9px 12px",display:"flex",alignItems:"center",gap:9,outline:activeProjectId===p.id?`1px solid ${p.color}33`:"none",transition:"all 0.2s",textAlign:"left",minWidth:0}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:p.color,flexShrink:0,boxShadow:activeProjectId===p.id?`0 0 6px ${p.color}`:"none"}}/>
                          <span style={{fontSize:12,fontWeight:600,color:activeProjectId===p.id?p.color:T.textSoft,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                          <span style={{fontSize:10,color:T.textMuted,fontWeight:600,flexShrink:0}}>{fmtDuration(pSec)}</span>
                        </button>
                        <button
                          onClick={()=>setKanbanProjId(p.id)}
                          title={`${p.name} — Kanban Board`}
                          style={{width:28,height:28,flexShrink:0,border:`1px solid ${kanbanProjId===p.id?p.color+"55":T.border}`,borderRadius:8,background:kanbanProjId===p.id?`${p.color}18`:T.glass,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",position:"relative"}}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={kanbanProjId===p.id?p.color:T.textMuted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="4" height="16" rx="1"/>
                          </svg>
                          {cardCount > 0 && <span style={{position:"absolute",top:-4,right:-4,width:14,height:14,borderRadius:"50%",background:p.color,fontSize:8,fontWeight:800,color:"#1a1f2e",display:"flex",alignItems:"center",justifyContent:"center"}}>{cardCount > 9?"9+":cardCount}</span>}
                        </button>
                      </div>
                    );
                  })}
                  <button onClick={openNewProject} style={{width:"100%",border:`1px dashed ${T.border}`,cursor:"pointer",borderRadius:12,background:"transparent",padding:"8px 14px",display:"flex",alignItems:"center",gap:8,marginTop:4,color:T.textMuted,fontSize:11,fontWeight:600,transition:"all 0.2s"}}>
                    <span style={{fontSize:14}}>+</span> Yeni Proje
                  </button>
                </>
              )}
            </div>

            {/* Bottom stats */}
            <div style={{padding:12,borderTop:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {[{e:"✅",v:completedLogs,l:"Tamamlandı"},{e:"⚠️",v:incompleteLogs,l:"Eksik"},{e:"⏱️",v:fmtDuration(totalSec),l:"Toplam"},{e:"🔥",v:`${Math.max(0,timeLogs.length)}`,l:"Oturum"}].map(({e,v,l})=>(
                  <div key={l} style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
                    <div style={{fontSize:12}}>{e}</div>
                    <div style={{fontSize:12,fontWeight:700,color:T.text}}>{v}</div>
                    <div style={{fontSize:8,color:T.textMuted,fontWeight:700}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",height:"100vh"}}>

            {/* Top bar */}
            <div style={{height:56,flexShrink:0,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"0 28px",gap:16,background:T.bg}}>
              <div style={{flex:1}}>
                <div style={{fontSize:18,fontWeight:800,color:T.text}}>
                  {tab==="timer"&&"⏱️ Timer"}
                  {tab==="projects"&&"📁 Projeler"}
                  {tab==="logs"&&"🕐 Zaman Kayıtları"}
                  {tab==="stats"&&"📊 İstatistikler"}
                  {tab==="garden"&&"🌱 Bahçem"}
                </div>
              </div>
              {/* Running pill */}
              {running && (
                <div style={{display:"flex",alignItems:"center",gap:8,background:cfg.color+"18",border:`1px solid ${cfg.color}44`,borderRadius:20,padding:"6px 14px"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:cfg.color,animation:"glow 1.5s infinite"}}/>
                  <span style={{fontSize:12,fontWeight:700,color:cfg.color}}>{cfg.emoji} {fmt(remaining)}</span>
                </div>
              )}
              <span style={{fontSize:12,color:T.textMuted,fontWeight:600}}>{clock}</span>
            </div>

            {/* ── TIMER TAB (desktop) ── */}
            {tab==="timer" && (
              <div style={{flex:1,display:"flex",overflow:"hidden"}}>

                {/* Center: Timer + Ghost */}
                <div style={{flex:"0 0 480px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,padding:32,borderRight:`1px solid ${T.border}`,position:"relative",overflow:"hidden"}}>
                  {/* ── BREAK OVERLAY ── */}
                  {isBreak && (
                    <div style={{position:"absolute",inset:0,zIndex:20,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,background:theme==="dark"?"rgba(8,14,30,0.96)":"rgba(240,236,230,0.97)",animation:"fadeIn 0.4s ease"}}>
                      <div style={{fontSize:48}}>☕</div>
                      <div style={{fontSize:16,fontWeight:800,color:T.text}}>{pendingBreakIdxRef.current===0?"Uzun Mola":"Kısa Mola"}</div>
                      <div style={{fontSize:56,fontWeight:900,color:T.mint,fontVariantNumeric:"tabular-nums",letterSpacing:-1}}>{fmt(breakRemaining)}</div>
                      <div style={{fontSize:12,color:T.textMuted,fontWeight:600,textAlign:"center",maxWidth:240,lineHeight:1.6}}>
                        {pendingBreakIdxRef.current===0?"Harika iş! 4 pomodoro tamamladın.\n15 dakika gerçekten dinlen 🌿":"Gözlerini dinlendir, su iç, biraz uzan ✨"}
                      </div>
                      <div style={{display:"flex",gap:12,marginTop:4}}>
                        <button onClick={skipBreak} style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:14,padding:"10px 22px",fontSize:12,fontWeight:700,color:T.textMuted,cursor:"pointer"}}>Molayı Atla</button>
                        <button onClick={()=>setBreakRunning(r=>!r)} style={{background:T.mint+"22",border:`1px solid ${T.mint}44`,borderRadius:14,padding:"10px 22px",fontSize:12,fontWeight:700,color:T.mint,cursor:"pointer"}}>
                          {breakRunning?"⏸ Durdur":"▶ Devam"}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Scene background */}
                  <div style={{position:"absolute",inset:0,opacity:0.25,pointerEvents:"none"}}>
                    <Scene big T={T}/>
                  </div>
                  <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
                    {/* Active mode indicator */}
                    <div style={{display:"flex",alignItems:"center",gap:8,background:cfg.color+"18",border:`1px solid ${cfg.color}44`,borderRadius:20,padding:"6px 16px"}}>
                      <span style={{width:7,height:7,borderRadius:"50%",background:cfg.color,display:"inline-block",animation:"glow 1.5s infinite"}}/>
                      <span style={{fontSize:12,fontWeight:700,color:cfg.color}}>{cfg.emoji} {cfg.label}</span>
                    </div>

                    <Ghost activityMode={actMode} running={running} color={cfg.color} big/>
                    <Ring progress={progress} remaining={remaining} color={cfg.color} big/>
                    <Dots idx={sessionIdx} color={cfg.color}/>

                    {/* Controls */}
                    <div style={{display:"flex",alignItems:"center",gap:16}}>
                      <button onClick={resetTimer} style={{width:48,height:48,borderRadius:16,border:`1px solid ${T.border}`,background:T.glass,color:T.textMuted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                      </button>
                      <button onClick={()=>running?pauseTimer():setRunning(true)} style={{width:72,height:72,borderRadius:"50%",border:"none",cursor:"pointer",background:`radial-gradient(circle at 35% 35%, ${cfg.color}ee, ${cfg.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 28px ${cfg.color}55,0 4px 16px rgba(0,0,0,0.2)`,transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)"}}>
                        {running
                          ? <div style={{display:"flex",gap:5}}><div style={{width:5,height:20,borderRadius:3,background:"#fff"}}/><div style={{width:5,height:20,borderRadius:3,background:"#fff"}}/></div>
                          : <div style={{width:0,height:0,borderTop:"11px solid transparent",borderBottom:"11px solid transparent",borderLeft:"20px solid #fff",marginLeft:4}}/>
                        }
                      </button>
                      <button onClick={skipTimer} style={{width:48,height:48,borderRadius:16,border:`1px solid ${T.border}`,background:T.glass,color:T.textMuted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="5,4 15,12 5,20"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                      </button>
                    </div>

                    {/* ASMR row */}
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                        {Object.entries(SOUNDS).map(([key,s])=>{
                          const isActive=asmr.active===key;
                          return (
                            <button key={key} onClick={()=>{asmr.play(key);if(asmr.active!==key)setLastSound(key);}} style={{border:"none",cursor:"pointer",borderRadius:14,padding:"8px 14px",background:isActive?cfg.color+"22":T.glass,outline:`1px solid ${isActive?cfg.color+"55":T.border}`,color:isActive?cfg.color:T.textMuted,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}>
                              <span style={{fontSize:16}}>{s.emoji}</span>
                              <span>{s.label}</span>
                              {isActive&&<div style={{display:"flex",gap:1.5,alignItems:"flex-end",height:10}}>
                                {[0,1,2].map(i=>(<div key={i} style={{width:2.5,borderRadius:1,background:cfg.color,animation:`soundBar${i} ${0.5+i*0.15}s ease infinite alternate`}}/>))}
                              </div>}
                            </button>
                          );
                        })}
                        {asmr.active && (
                          <input type="range" min="0" max="1" step="0.05" value={asmr.volume}
                            onChange={e=>asmr.adjustVolume(parseFloat(e.target.value))}
                            style={{width:80,height:4,accentColor:cfg.color,cursor:"pointer",marginLeft:4}}
                          />
                        )}
                      </div>
                      {/* Auto-sound toggle */}
                      <button onClick={()=>setAutoSoundEnabled(v=>!v)} style={{alignSelf:"flex-start",border:"none",cursor:"pointer",borderRadius:10,padding:"5px 12px",background:autoSoundEnabled?cfg.color+"18":T.glass,outline:`1px solid ${autoSoundEnabled?cfg.color+"44":T.border}`,color:autoSoundEnabled?cfg.color:T.textMuted,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",gap:5,transition:"all 0.2s"}}>
                        <span style={{fontSize:12}}>{autoSoundEnabled?"🔔":"🔕"}</span>
                        Pomodoro başlayınca otomatik çal
                        <span style={{width:24,height:13,borderRadius:7,background:autoSoundEnabled?cfg.color:T.border,display:"inline-flex",alignItems:"center",padding:"0 2px",transition:"all 0.2s",flexShrink:0}}>
                          <span style={{width:9,height:9,borderRadius:"50%",background:"#fff",display:"block",marginLeft:autoSoundEnabled?"12px":"0",transition:"margin 0.2s"}}/>
                        </span>
                      </button>
                    </div>

                    {/* Force Complete (test — dev only) */}
                    {import.meta.env.DEV && (
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <button onClick={forceComplete} title="Pomodoro'yu anında tamamlar — test için" style={{background:"rgba(247,208,112,0.1)",border:`1px dashed ${T.yellow}55`,borderRadius:12,padding:"6px 18px",fontSize:11,fontWeight:700,color:T.yellow,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}>
                          ⚡ Hızlı Tamamla <span style={{fontSize:9,opacity:0.6}}>(test)</span>
                        </button>
                        <button onClick={seedDummyData} title="SS için demo data ekler" style={{background:"rgba(147,197,253,0.1)",border:"1px dashed rgba(147,197,253,0.4)",borderRadius:12,padding:"6px 18px",fontSize:11,fontWeight:700,color:"#93c5fd",cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}>
                          🌱 Demo Data <span style={{fontSize:9,opacity:0.6}}>(test)</span>
                        </button>
                      </div>
                    )}

                    {/* Keyboard hint */}
                    <div style={{display:"flex",gap:12,fontSize:10,color:T.textMuted,fontWeight:600}}>
                      <span style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:6,padding:"2px 8px"}}>Space</span>
                      <span>Başlat/Durdur</span>
                      <span style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:6,padding:"2px 8px"}}>F</span>
                      <span>Küçült</span>
                    </div>
                  </div>
                </div>

                {/* Right panel: Tasks */}
                <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                  <div style={{padding:"20px 24px 0",flexShrink:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                      <span style={{fontSize:14,fontWeight:700,color:T.text}}>📋 Görevler</span>
                      <button onClick={()=>{setInputOpen(o=>!o);setTimeout(()=>inputRef.current?.focus(),80);}} style={{background:cfg.color+"22",border:`1px solid ${cfg.color}44`,borderRadius:10,padding:"6px 14px",fontSize:11,fontWeight:700,color:cfg.color,cursor:"pointer"}}>
                        {inputOpen?"İptal":"+ Görev Ekle"}
                      </button>
                    </div>
                    {inputOpen && (
                      <div style={{marginBottom:14,background:T.glass,border:`1px solid ${T.border}`,borderRadius:16,padding:"14px 16px"}}>
                        <div style={{display:"flex",gap:8,marginBottom:10}}>
                          <input ref={inputRef} value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="Yeni görev..." maxLength={50} style={{flex:1,background:T.inputBg,border:`1px solid ${T.borderLight}`,borderRadius:12,padding:"10px 14px",color:T.text,fontSize:13}}/>
                          <button onClick={addTask} style={{background:cfg.color,color:"#1a1f2e",border:"none",borderRadius:12,padding:"10px 18px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Ekle</button>
                        </div>
                        {/* Mode selector */}
                        <div style={{marginBottom:8}}>
                          <div style={{fontSize:10,fontWeight:700,color:T.textMuted,marginBottom:5}}>⚡ Mod</div>
                          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                            {Object.entries(ACTIVITY_MODES).map(([k,m])=>{
                              const mc=getModeColor(k,theme);
                              return (
                                <button key={k} onClick={()=>{ setTaskMode(k); setTaskDuration(Math.round(ACTIVITY_MODES[k].duration/60)); }} style={{border:"none",cursor:"pointer",background:taskMode===k?mc.color+"22":"transparent",borderRadius:8,padding:"4px 10px",fontSize:10,fontWeight:700,color:taskMode===k?mc.color:T.textMuted,outline:taskMode===k?`1px solid ${mc.color}55`:"none",transition:"all 0.2s",display:"flex",alignItems:"center",gap:4}}>
                                  <span>{m.emoji}</span>{m.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {/* Duration picker */}
                        <div style={{marginBottom:8}}>
                          <div style={{fontSize:10,fontWeight:700,color:T.textMuted,marginBottom:5}}>⏱ Süre</div>
                          <DurationPicker value={taskDuration} onChange={setTaskDuration} color={getModeColor(taskMode,theme).color} T={T} disabled={false}/>
                        </div>
                        {/* Project selector */}
                        <div>
                          <div style={{fontSize:10,fontWeight:700,color:T.textMuted,marginBottom:5}}>📁 Proje</div>
                          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                            <button onClick={()=>setTaskProjectId(null)} style={{border:"none",cursor:"pointer",background:taskProjectId===null?T.border:"transparent",borderRadius:8,padding:"4px 10px",fontSize:10,fontWeight:700,color:taskProjectId===null?T.textSoft:T.textMuted,outline:taskProjectId===null?`1px solid ${T.borderLight}`:"none",transition:"all 0.2s",display:"flex",alignItems:"center",gap:4}}>
                              — Projesiz
                            </button>
                            {projects.map(p=>(
                              <button key={p.id} onClick={()=>setTaskProjectId(p.id)} style={{border:"none",cursor:"pointer",background:taskProjectId===p.id?`${p.color}22`:"transparent",borderRadius:8,padding:"4px 10px",fontSize:10,fontWeight:700,color:taskProjectId===p.id?p.color:T.textMuted,outline:taskProjectId===p.id?`1px solid ${p.color}55`:"none",transition:"all 0.2s",display:"flex",alignItems:"center",gap:4}}>
                                <span style={{width:5,height:5,borderRadius:"50%",background:p.color,display:"inline-block"}}/>{p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{flex:1,overflowY:"auto",padding:"0 24px 24px"}}>
                    {tasks.length===0 && (
                      <div style={{textAlign:"center",padding:40,color:T.textMuted,fontSize:13}}>
                        <div style={{fontSize:36,marginBottom:8}}>📋</div>
                        Henüz görev yok
                      </div>
                    )}
                    {tasks.map(t=>{
                      const proj=projects.find(p=>p.id===t.projectId);
                      return (
                        <div key={t.id} onClick={()=>{if(t.done)return;const willBeActive=!t.active;setTasks(p=>p.map(x=>({...x,active:x.id===t.id?willBeActive:false})));if(willBeActive){if(t.mode)switchActivity(t.mode);if(t.duration)setRemaining(t.duration*60);}}} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",background:t.active?cfg.color+"12":T.glass,borderRadius:14,cursor:"pointer",border:`1px solid ${t.active?cfg.color+"44":T.border}`,opacity:t.done?0.4:1,transition:"all 0.2s",marginBottom:8,boxShadow:t.active&&running?`0 0 0 2px ${cfg.color}33`:"none",position:"relative",overflow:"hidden"}}>
                          {/* Clockify-style active bar */}
                          {t.active&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:cfg.color,borderRadius:"14px 0 0 14px"}}/>}
                          <div onClick={e=>{e.stopPropagation();const found=tasks.find(x=>x.id===t.id);if(found&&!found.done)showToast("✨ Görevi tamamladın!");setTasks(p=>p.map(x=>x.id===t.id?{...x,done:!x.done,active:false}:x));}} style={{width:22,height:22,borderRadius:8,flexShrink:0,cursor:"pointer",border:`1.5px solid ${t.done?T.mint:t.active?cfg.color:T.border}`,background:t.done?T.mint+"28":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",marginLeft:t.active?6:0}}>
                            {t.done&&<span style={{fontSize:12,color:T.mint,fontWeight:700}}>✓</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                              <span style={{fontSize:13,fontWeight:t.active?700:600,color:t.active?T.text:T.textSoft,textDecoration:t.done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.text}</span>
                              {t.active&&running&&<span style={{fontSize:9,fontWeight:800,color:cfg.color,background:cfg.color+"18",border:`1px solid ${cfg.color}44`,borderRadius:20,padding:"1px 7px",flexShrink:0,display:"flex",alignItems:"center",gap:3}}><span style={{width:5,height:5,borderRadius:"50%",background:cfg.color,display:"inline-block",animation:"glow 1.2s infinite"}}/>çalışıyor</span>}
                              {t.active&&!running&&<span style={{fontSize:9,fontWeight:700,color:T.textMuted,background:T.glass,border:`1px solid ${T.border}`,borderRadius:20,padding:"1px 7px",flexShrink:0}}>⏸ duraklatıldı</span>}
                            </div>
                            <div style={{display:"flex",gap:5,alignItems:"center"}}>
                              {t.mode&&ACTIVITY_MODES[t.mode]&&(()=>{const mc=getModeColor(t.mode,theme);return(<span style={{fontSize:9,fontWeight:700,color:mc.color,background:mc.color+"18",border:`1px solid ${mc.color}33`,borderRadius:6,padding:"1px 6px"}}>{ACTIVITY_MODES[t.mode].emoji} {ACTIVITY_MODES[t.mode].label}</span>);})()}
                              {t.duration&&<span style={{fontSize:9,fontWeight:700,color:T.textMuted,background:T.glass,border:`1px solid ${T.border}`,borderRadius:6,padding:"1px 6px"}}>⏱ {t.duration}dk</span>}
                              <ProjectBadge project={proj} small/>
                            </div>
                          </div>
                          <span style={{fontSize:11,color:t.active?cfg.color:T.textMuted,background:t.active?cfg.color+"18":T.glass,padding:"3px 9px",borderRadius:8,flexShrink:0,fontWeight:t.active?700:400}}>🍅 {t.pomos}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── PROJECTS TAB (desktop) ── */}
            {tab==="projects" && (
              <div style={{flex:1,overflowY:"auto",padding:28}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <span style={{fontSize:14,fontWeight:700,color:T.textSoft}}>Tüm Projeler</span>
                  <button onClick={openNewProject} style={{background:T.lavender+"22",border:`1px solid ${T.lavender}44`,borderRadius:12,padding:"8px 18px",fontSize:12,fontWeight:700,color:T.lavender,cursor:"pointer"}}>+ Yeni Proje</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
                  {projects.map(p=><ProjectCard key={p.id} project={p} logs={timeLogs} onEdit={()=>openEditProject(p)}/>)}
                </div>
              </div>
            )}

            {/* ── LOGS TAB (desktop) ── */}
            {tab==="logs" && (
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{padding:"20px 28px 16px",flexShrink:0,borderBottom:`1px solid ${T.border}`}}>
                  <div style={{display:"flex",gap:12}}>
                    {[{e:"⏱️",v:fmtDuration(totalSec),l:"Toplam Çalışma",c:T.mint},{e:"✅",v:completedLogs,l:"Tamamlanan",c:T.mint},{e:"⚠️",v:incompleteLogs,l:"Eksik",c:T.yellow}].map(({e,v,l,c})=>(
                      <div key={l} style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:14,padding:"10px 18px",display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:18}}>{e}</span>
                        <div><div style={{fontSize:16,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:10,color:T.textMuted,fontWeight:600}}>{l}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"16px 28px"}}>
                  {logsByDateAndTask.length===0 && (
                    <div style={{textAlign:"center",padding:80,color:T.textMuted}}>
                      <div style={{fontSize:52,marginBottom:12}}>👻</div>
                      <div style={{fontSize:14,fontWeight:600}}>Henüz kayıt yok</div>
                      <div style={{fontSize:12,marginTop:4}}>Timer'ı başlat!</div>
                    </div>
                  )}
                  {logsByDateAndTask.map(({date,daySec,taskGroups})=>(
                    <div key={date} style={{marginBottom:24}}>
                      {/* Date header */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:6,borderBottom:`1px solid ${T.border}`}}>
                        <span style={{fontSize:12,fontWeight:800,color:T.textMuted,letterSpacing:0.5}}>{date}</span>
                        <span style={{fontSize:12,fontWeight:700,color:T.textSoft}}>{fmtDuration(daySec)}</span>
                      </div>
                      {/* Task groups */}
                      {taskGroups.map(({taskId,taskName,logs})=>(
                        <TaskLogGroup key={taskId||taskName} taskId={taskId} taskName={taskName} logs={logs} projects={projects} theme={theme}/>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── STATS TAB (desktop) ── */}
            {tab==="stats" && (()=>{
              const modeDonutData = Object.entries(ACTIVITY_MODES).map(([k,m])=>({
                label: m.label,
                value: timeLogs.filter(l=>l.activityMode===k).reduce((a,l)=>a+l.durationSec,0),
                color: getModeColor(k,theme).color,
              }));
              const projDonutData = projects.map(p=>({
                label: p.name,
                value: timeLogs.filter(l=>l.projectId===p.id).reduce((a,l)=>a+l.durationSec,0),
                color: p.color,
              }));
              const todaySec = timeLogs.filter(l=>new Date(l.startTime).toDateString()===new Date().toDateString()).reduce((a,l)=>a+l.durationSec,0);
              const streakDays = (()=>{
                const s = new Set(timeLogs.map(l=>new Date(l.startTime).toDateString()));
                let streak=0, d=new Date();
                while(s.has(d.toDateString())){ streak++; d.setDate(d.getDate()-1); }
                return streak;
              })();
              return (
              <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>

                {/* Summary cards */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
                  {[
                    {e:"⏱️",v:fmtDuration(totalSec),   l:"Toplam Odak",    c:T.lavender},
                    {e:"☀️",v:fmtDuration(todaySec),   l:"Bugün",          c:T.mint},
                    {e:"🔥",v:`${streakDays} gün`,     l:"Seri",           c:T.peach},
                    {e:"✅",v:completedLogs,            l:"Tamamlanan",     c:T.mint},
                  ].map(({e,v,l,c})=>(
                    <div key={l} style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:18,padding:"16px 18px"}}>
                      <div style={{fontSize:22,marginBottom:6}}>{e}</div>
                      <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
                      <div style={{fontSize:10,color:T.textMuted,marginTop:3,fontWeight:600}}>{l}</div>
                    </div>
                  ))}
                </div>

                {/* Weekly bar chart */}
                <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:20,padding:"18px 20px",marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.textSoft,marginBottom:14}}>📊 Son 7 Gün</div>
                  <WeeklyBarChart timeLogs={timeLogs} T={T}/>
                </div>

                {/* Heatmap */}
                <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:20,padding:"18px 20px",marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.textSoft,marginBottom:14}}>🗓️ Aktivite Haritası</div>
                  <ActivityHeatmap timeLogs={timeLogs} T={T} theme={theme}/>
                </div>

                {/* Donut charts row */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

                  {/* Mode donut */}
                  <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:20,padding:"18px 20px"}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.textSoft,marginBottom:14}}>⚡ Mod Dağılımı</div>
                    <div style={{display:"flex",alignItems:"center",gap:20}}>
                      <DonutChart data={modeDonutData} T={T} size={130}/>
                      <div style={{flex:1}}>
                        {modeDonutData.map(({label,value,color})=>(
                          <div key={label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
                            <span style={{flex:1,fontSize:11,fontWeight:600,color:T.textSoft}}>{label}</span>
                            <span style={{fontSize:11,fontWeight:700,color:T.textMuted}}>{fmtDuration(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Project donut */}
                  <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:20,padding:"18px 20px"}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.textSoft,marginBottom:14}}>📁 Proje Dağılımı</div>
                    <div style={{display:"flex",alignItems:"center",gap:20}}>
                      <DonutChart data={projDonutData} T={T} size={130}/>
                      <div style={{flex:1}}>
                        {projDonutData.map(({label,value,color})=>(
                          <div key={label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
                            <span style={{flex:1,fontSize:11,fontWeight:600,color:T.textSoft}}>{label}</span>
                            <span style={{fontSize:11,fontWeight:700,color:T.textMuted}}>{fmtDuration(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
              );
            })()}

            {/* ── GARDEN TAB (desktop) ── */}
            {tab==="garden" && (
              <GardenView plants={gardenPlants} projects={projects} T={T} theme={theme} big/>
            )}
          </div>

          {/* Kanban Board (desktop) */}
          {kanbanProjId && (() => {
            const kProj = projects.find(p => p.id === kanbanProjId);
            if (!kProj) return null;
            return (
              <KanbanBoard
                project={kProj}
                cards={kanbanCards[kanbanProjId] || []}
                onClose={() => setKanbanProjId(null)}
                onAddCard={(colId, title) => addKanbanCard(kanbanProjId, colId, title)}
                onDeleteCard={(cardId) => deleteKanbanCard(kanbanProjId, cardId)}
                onMoveCard={(cardId, targetCol) => moveKanbanCard(kanbanProjId, cardId, targetCol)}
                theme={theme}
              />
            );
          })()}

          {/* Plant Picker Modal (desktop) */}
          {showPlantPicker && pendingPlantInfo && (
            <PlantPickerModal
              onSelect={handlePlantSelect}
              defaultType={pendingPlantInfo.activityMode}
              theme={theme}
            />
          )}

          {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)}/>}

          {/* Project modal */}
          {showProjectModal && (
            <Modal title={editingProject?"Projeyi Düzenle":"Yeni Proje"} onClose={()=>{setShowProjectModal(false);setEditingProject(null);}}>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:700,color:T.textMuted,display:"block",marginBottom:6}}>Proje Adı</label>
                <input value={newProjName} onChange={e=>setNewProjName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveProject()} placeholder="ör: Kişisel, İş, Ders..." maxLength={30} style={{width:"100%",background:T.inputBg,border:`1px solid ${T.borderLight}`,borderRadius:12,padding:"10px 14px",color:T.text,fontSize:13}}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:T.textMuted,display:"block",marginBottom:8}}>Renk</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {PROJECT_COLORS.map(col=>(
                    <button key={col} onClick={()=>setNewProjColor(col)} style={{width:32,height:32,borderRadius:"50%",background:col,border:newProjColor===col?"3px solid white":"3px solid transparent",cursor:"pointer",boxShadow:newProjColor===col?`0 0 12px ${col}88`:"none",transition:"all 0.2s"}}/>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setShowProjectModal(false);setEditingProject(null);}} style={{flex:1,background:T.glass,border:`1px solid ${T.border}`,borderRadius:14,padding:"11px",fontSize:12,fontWeight:700,color:T.textMuted,cursor:"pointer"}}>İptal</button>
                <button onClick={saveProject} style={{flex:2,background:newProjColor,border:"none",borderRadius:14,padding:"11px",fontSize:12,fontWeight:700,color:"#1a1f2e",cursor:"pointer"}}>{editingProject?"Kaydet":"Oluştur"}</button>
              </div>
              {editingProject && <button onClick={()=>{setProjects(prev=>prev.filter(p=>p.id!==editingProject.id));setShowProjectModal(false);setEditingProject(null);if(activeProjectId===editingProject.id)setActiveProjectId(projects[0]?.id||"");}} style={{width:"100%",background:"rgba(255,80,80,0.1)",border:"1px solid rgba(255,80,80,0.3)",borderRadius:14,padding:"10px",fontSize:12,fontWeight:700,color:"#ff8080",cursor:"pointer",marginTop:8}}>Projeyi Sil</button>}
            </Modal>
          )}
          <Toast msg={toast.msg} show={toast.show}/>
        </div>
      )}

      {!isBrowserFS && (
      <div onClick={handleTap} style={{width:390,height:844,background:isFocus?T.focusBg:T.bg,borderRadius:54,boxShadow:"0 0 0 10px #0d0f18,0 0 0 12px #161926,0 50px 120px rgba(0,0,0,0.85)",overflow:"hidden",position:"relative",display:"flex",flexDirection:"column",fontFamily:"'Nunito',system-ui,sans-serif",cursor:isFocus?"pointer":"default",transition:"background 0.5s ease",userSelect:"none"}}>

        {/* ══ FOCUS FULLSCREEN ══ */}
        {isFocus && (
          <div style={{position:"absolute",inset:0,zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
            <Scene big T={T}/>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)"}}/>
            <div style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center",gap:14,marginBottom:80}}>
              <Ghost activityMode={actMode} running color={cfg.color} big/>
              <Ring progress={progress} remaining={remaining} color={cfg.color} big/>
              <Dots idx={sessionIdx} color={cfg.color}/>
              {activeTask && <div style={{background:T.glass,backdropFilter:"blur(12px)",border:`1px solid ${T.borderLight}`,borderRadius:20,padding:"7px 20px",fontSize:12,fontWeight:600,color:T.textSoft,maxWidth:260,textAlign:"center",animation:"fadeIn 0.6s"}}>{cfg.emoji} {activeTask.text}</div>}
            </div>
            {/* Controls overlay */}
            <div style={{position:"absolute",inset:0,zIndex:3,display:"flex",flexDirection:"column",justifyContent:"space-between",opacity:showControls?1:0,transition:"opacity 0.6s",pointerEvents:showControls?"auto":"none"}}>
              <div style={{padding:"56px 28px 16px",background:"linear-gradient(180deg,rgba(0,0,0,0.65) 0%,transparent 100%)",display:"flex",justifyContent:"space-between",alignItems:"center",animation:"slideD 0.4s"}}>
                <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.5)"}}>{clock}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{background:"rgba(255,255,255,0.1)",backdropFilter:"blur(10px)",border:`1px solid ${T.borderLight}`,borderRadius:14,padding:"6px 16px",fontSize:11,fontWeight:700,color:cfg.color,display:"flex",alignItems:"center",gap:7}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:cfg.color,display:"inline-block",animation:"glow 1.5s infinite"}}/>
                    {cfg.emoji} {cfg.label}
                  </div>
                  <button onClick={e=>{e.stopPropagation();toggleBrowserFS();}} title={isBrowserFS?"Tam ekrandan çık":"Tam ekran"} style={{width:32,height:32,borderRadius:12,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.1)",backdropFilter:"blur(10px)",color:"rgba(255,255,255,0.7)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {isBrowserFS
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
                    }
                  </button>
                </div>
              </div>
              <div style={{padding:"16px 36px 52px",background:"linear-gradient(0deg,rgba(0,0,0,0.75) 0%,transparent 100%)",display:"flex",flexDirection:"column",alignItems:"center",gap:14,animation:"slideU 0.4s"}}>
                {/* Project badge */}
                <ProjectBadge project={projects.find(p=>p.id===activeProjectId)}/>
                {/* Sound indicator + quick switcher */}
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {Object.entries(SOUNDS).map(([key,s])=>{
                    const isActive = asmr.active===key;
                    return (
                      <button key={key} onClick={e=>{e.stopPropagation();asmr.play(key);if(asmr.active!==key)setLastSound(key);}} style={{
                        width:isActive?52:38,height:38,borderRadius:14,border:"none",cursor:"pointer",
                        background:isActive?"rgba(196,181,247,0.2)":"rgba(255,255,255,0.07)",
                        outline:isActive?"1.5px solid rgba(196,181,247,0.5)":"1px solid rgba(255,255,255,0.1)",
                        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,
                        transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                      }}>
                        <span style={{fontSize:14}}>{s.emoji}</span>
                        {isActive && <div style={{display:"flex",gap:1,alignItems:"flex-end",height:6}}>
                          {[0,1,2].map(i=>(<div key={i} style={{width:2,borderRadius:1,background:"#c4b5f7",animation:`soundBar${i} ${0.5+i*0.15}s ease infinite alternate`}}/>))}
                        </div>}
                      </button>
                    );
                  })}
                  {/* Volume quick control */}
                  {asmr.active && (
                    <input type="range" min="0" max="1" step="0.05" value={asmr.volume}
                      onClick={e=>e.stopPropagation()}
                      onChange={e=>{e.stopPropagation();asmr.adjustVolume(parseFloat(e.target.value));}}
                      style={{width:70,height:4,accentColor:"#c4b5f7",cursor:"pointer"}}
                    />
                  )}
                </div>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.28)",fontWeight:600}}>Gizlemek için ekrana dokun</span>
                <div style={{display:"flex",alignItems:"center",gap:18}}>
                  <button onClick={e=>{e.stopPropagation();resetTimer();}} style={CTL_BTN}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                  <button onClick={e=>{e.stopPropagation();pauseTimer();}} style={{width:76,height:76,borderRadius:"50%",border:"none",cursor:"pointer",background:`radial-gradient(circle at 35% 35%, ${cfg.color}ee, ${cfg.color}99)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 36px ${cfg.color}66,0 4px 20px rgba(0,0,0,0.4)`}}>
                    <div style={{display:"flex",gap:5}}><div style={{width:5,height:22,borderRadius:3,background:"#fff"}}/><div style={{width:5,height:22,borderRadius:3,background:"#fff"}}/></div>
                  </button>
                  <button onClick={e=>{e.stopPropagation();skipTimer();}} style={CTL_BTN}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="5,4 15,12 5,20"/><line x1="19" y1="5" x2="19" y2="19"/></svg></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ NORMAL MODE ══ */}
        {!isFocus && <>
          {/* Dynamic Island */}
          <div style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",width:running?172:116,height:33,background:"#000",borderRadius:20,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",gap:7,transition:"width 0.45s cubic-bezier(0.34,1.56,0.64,1)",padding:"0 14px"}}>
            {running&&<><div style={{width:7,height:7,borderRadius:"50%",background:cfg.color,boxShadow:`0 0 8px ${cfg.color}`,animation:"glow 2s infinite"}}/><span style={{fontSize:11,fontWeight:700,color:"#fff"}}>{fmt(remaining)}</span></>}
          </div>
          <div style={{height:72,display:"flex",alignItems:"flex-end",justifyContent:"space-between",padding:"0 28px 10px",flexShrink:0,fontSize:13,fontWeight:700,color:T.textSoft,position:"relative",zIndex:2}}>
            <span>{clock}</span>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <button onClick={()=>setShowFeedback(true)} style={{background:"rgba(255,255,255,0.07)",border:`1px solid ${T.border}`,borderRadius:20,padding:"4px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"all 0.3s",color:T.textSoft,fontSize:11,fontWeight:700}}>
                <span style={{fontSize:14}}>💬</span>
              </button>
              <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{background:theme==="dark"?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.07)",border:`1px solid ${T.border}`,borderRadius:20,padding:"4px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"all 0.3s",color:T.textSoft,fontSize:11,fontWeight:700}}>
                <span style={{fontSize:14}}>{theme==="dark"?"🌙":"☀️"}</span>
                <span>{theme==="dark"?"Koyu":"Açık"}</span>
              </button>
              <button onClick={toggleBrowserFS} title={isBrowserFS?"Tam ekrandan çık":"Tam ekran"} style={{background:isBrowserFS?"rgba(196,181,247,0.15)":"rgba(255,255,255,0.07)",border:`1px solid ${isBrowserFS?T.lavender+"55":T.border}`,borderRadius:20,padding:"4px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"all 0.3s",color:isBrowserFS?T.lavender:T.textSoft,fontSize:11,fontWeight:700}}>
                {isBrowserFS
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
                }
                <span>{isBrowserFS?"Küçült":"⛶ Tam"}</span>
              </button>
            </div>
          </div>
          <Toast msg={toast.msg} show={toast.show}/>

          {/* ── TIMER TAB ── */}
          {tab==="timer" && (
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",animation:"fadeUp 0.35s ease",position:"relative"}}>
              {/* Mobile break overlay */}
              {isBreak && (
                <div style={{position:"absolute",inset:0,zIndex:30,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:24,background:theme==="dark"?"rgba(8,14,30,0.97)":"rgba(240,236,230,0.97)",animation:"fadeIn 0.4s ease"}}>
                  <div style={{fontSize:52}}>☕</div>
                  <div style={{fontSize:18,fontWeight:800,color:T.text}}>{pendingBreakIdxRef.current===0?"Uzun Mola 🌿":"Kısa Mola ✨"}</div>
                  <div style={{fontSize:52,fontWeight:900,color:T.mint,letterSpacing:-1}}>{fmt(breakRemaining)}</div>
                  <div style={{fontSize:12,color:T.textMuted,fontWeight:600,textAlign:"center",lineHeight:1.6}}>
                    {pendingBreakIdxRef.current===0?"4 pomodoro tamamladın!\n15 dakika gerçekten dinlen.":"Gözlerini dinlendir, su iç ✨"}
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:4,width:"100%",maxWidth:280}}>
                    <button onClick={skipBreak} style={{flex:1,background:T.glass,border:`1px solid ${T.border}`,borderRadius:14,padding:"11px",fontSize:12,fontWeight:700,color:T.textMuted,cursor:"pointer"}}>Atla</button>
                    <button onClick={()=>setBreakRunning(r=>!r)} style={{flex:1,background:T.mint+"22",border:`1px solid ${T.mint}44`,borderRadius:14,padding:"11px",fontSize:12,fontWeight:700,color:T.mint,cursor:"pointer"}}>
                      {breakRunning?"⏸ Durdur":"▶ Devam"}
                    </button>
                  </div>
                </div>
              )}
              <div style={{position:"relative",height:128,flexShrink:0,overflow:"hidden"}}><Scene big={false} T={T}/></div>
              <div style={{flex:1,overflowY:"auto",padding:"14px 18px 0"}}>

                {/* Active mode indicator (mod, göreve tıklayınca değişir) */}
                <div style={{display:"flex",alignItems:"center",gap:8,background:cfg.color+"18",border:`1px solid ${cfg.color}44`,borderRadius:16,padding:"8px 14px",marginBottom:12}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:cfg.color,display:"inline-block",animation:"glow 1.5s infinite"}}/>
                  <span style={{fontSize:12,fontWeight:700,color:cfg.color,flex:1}}>{cfg.emoji} {cfg.label}</span>
                  <span style={{fontSize:10,color:T.textMuted,fontWeight:600}}>Mod · göreve tıklayınca değişir</span>
                </div>



                {/* Ghost + Ring */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:12}}>
                  <Ghost activityMode={actMode} running={running} color={cfg.color} big={false}/>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                    <Ring progress={progress} remaining={remaining} color={cfg.color} big={false}/>
                    <Dots idx={sessionIdx} color={cfg.color}/>
                  </div>
                </div>

                {/* Controls */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:10}}>
                  <button onClick={resetTimer} style={{width:46,height:46,borderRadius:16,border:`1px solid ${T.border}`,background:T.glass,color:T.textMuted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </button>
                  <button onClick={()=>running?pauseTimer():setRunning(true)} style={{width:68,height:68,borderRadius:"50%",border:"none",cursor:"pointer",background:`radial-gradient(circle at 35% 35%, ${cfg.color}ee, ${cfg.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 24px ${cfg.color}55,0 4px 14px rgba(0,0,0,0.3)`,transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)"}}>
                    {running ? <div style={{display:"flex",gap:5}}><div style={{width:5,height:20,borderRadius:3,background:"#fff"}}/><div style={{width:5,height:20,borderRadius:3,background:"#fff"}}/></div> : <div style={{width:0,height:0,borderTop:"11px solid transparent",borderBottom:"11px solid transparent",borderLeft:"20px solid #fff",marginLeft:4}}/>}
                  </button>
                  <button onClick={skipTimer} style={{width:46,height:46,borderRadius:16,border:`1px solid ${T.border}`,background:T.glass,color:T.textMuted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="5,4 15,12 5,20"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                  </button>
                </div>

                {/* Force Complete + Seed (test — dev only) */}
                {import.meta.env.DEV && (
                  <div style={{display:"flex",gap:6,marginBottom:12}}>
                    <button onClick={forceComplete} style={{flex:1,background:"rgba(247,208,112,0.09)",border:`1px dashed ${T.yellow}44`,borderRadius:14,padding:"8px",fontSize:11,fontWeight:700,color:T.yellow,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all 0.2s"}}>
                      ⚡ Hızlı <span style={{fontSize:9,opacity:0.55}}>(test)</span>
                    </button>
                    <button onClick={seedDummyData} style={{flex:1,background:"rgba(147,197,253,0.09)",border:"1px dashed rgba(147,197,253,0.35)",borderRadius:14,padding:"8px",fontSize:11,fontWeight:700,color:"#93c5fd",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all 0.2s"}}>
                      🌱 Demo <span style={{fontSize:9,opacity:0.55}}>(test)</span>
                    </button>
                  </div>
                )}

                {/* ASMR Sound Panel */}
                <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:18,padding:"12px 14px",marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:11,fontWeight:700,color:T.textSoft}}>🎧 ASMR Sesleri</span>
                    {/* Auto toggle */}
                    <button onClick={()=>setAutoSoundEnabled(a=>!a)} style={{border:"none",cursor:"pointer",borderRadius:10,padding:"4px 8px",background:autoSoundEnabled?T.lavender+"18":T.glass,outline:`1px solid ${autoSoundEnabled?T.lavender+"44":T.border}`,color:autoSoundEnabled?T.lavender:T.textMuted,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",gap:5,transition:"all 0.2s"}}>
                      <span>{autoSoundEnabled?"🔔":"🔕"}</span>
                      Otomatik başlat
                      <span style={{width:22,height:12,borderRadius:6,background:autoSoundEnabled?T.lavender:T.border,display:"inline-flex",alignItems:"center",padding:"0 2px",transition:"all 0.2s",flexShrink:0}}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:"#fff",display:"block",marginLeft:autoSoundEnabled?"10px":"0",transition:"margin 0.2s"}}/>
                      </span>
                    </button>
                  </div>
                  {/* Sound buttons */}
                  <div style={{display:"flex",gap:7,marginBottom:asmr.active?10:0}}>
                    {Object.entries(SOUNDS).map(([key,s])=>{
                      const isActive = asmr.active===key;
                      return (
                        <button key={key} onClick={()=>{ asmr.play(key); if(!isActive){setLastSound(key);} }} style={{flex:1,border:"none",cursor:"pointer",borderRadius:14,padding:"8px 4px",background:isActive?"rgba(196,181,247,0.15)":T.glass,outline:`1.5px solid ${isActive?T.lavender+"55":T.border}`,transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",display:"flex",flexDirection:"column",alignItems:"center",gap:2,transform:isActive?"scale(1.05)":"scale(1)",boxShadow:isActive?`0 4px 14px rgba(196,181,247,0.25)`:"none"}}>
                          <span style={{fontSize:18}}>{s.emoji}</span>
                          <span style={{fontSize:8,fontWeight:700,color:isActive?T.lavender:T.textMuted}}>{s.label}</span>
                          {isActive && (
                            <div style={{display:"flex",gap:1.5,alignItems:"flex-end",height:10}}>
                              {[0,1,2,3,4].map(i=>(
                                <div key={i} style={{width:2,borderRadius:1,background:T.lavender,animation:`soundBar${i} ${0.6+i*0.1}s ease infinite alternate`,height:`${4+i*2}px`}}/>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Volume slider */}
                  {asmr.active && (
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:12,color:T.textMuted}}>🔈</span>
                      <input type="range" min="0" max="1" step="0.05" value={asmr.volume}
                        onChange={e=>asmr.adjustVolume(parseFloat(e.target.value))}
                        style={{flex:1,height:4,accentColor:T.lavender,cursor:"pointer"}}
                      />
                      <span style={{fontSize:12,color:T.textMuted}}>🔊</span>
                    </div>
                  )}
                </div>

                {/* Mini stats */}
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  {[{e:"✅",v:completedLogs,l:"Tamamlandı",c:T.mint},{e:"⚠️",v:incompleteLogs,l:"Eksik",c:T.yellow},{e:"⏱️",v:fmtDuration(totalSec),l:"Toplam",c:T.lavender}].map(({e,v,l,c})=>(
                    <div key={l} style={{flex:1,background:T.glass,border:`1px solid ${T.border}`,borderRadius:14,padding:"9px 6px",display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
                      <span style={{fontSize:14}}>{e}</span>
                      <span style={{fontSize:13,fontWeight:700,color:c}}>{v}</span>
                      <span style={{fontSize:9,color:T.textMuted,fontWeight:700}}>{l}</span>
                    </div>
                  ))}
                </div>

                {/* Tasks */}
                <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:20,padding:14,marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <span style={{fontSize:12,fontWeight:700,color:T.textSoft}}>📋 Görevler</span>
                    <button onClick={()=>{setInputOpen(o=>!o);setTimeout(()=>inputRef.current?.focus(),80);}} style={{width:28,height:28,borderRadius:10,border:"none",background:cfg.color+"22",color:cfg.color,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{inputOpen?"×":"+"}</button>
                  </div>
                  {inputOpen && (
                    <div style={{marginBottom:10}}>
                      <div style={{display:"flex",gap:8,marginBottom:8}}>
                        <input ref={inputRef} value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="Yeni görev..." maxLength={50} style={{flex:1,background:T.inputBg,border:`1px solid ${T.borderLight}`,borderRadius:12,padding:"9px 12px",color:T.text,fontSize:13}}/>
                        <button onClick={addTask} style={{background:cfg.color,color:"#1a1f2e",border:"none",borderRadius:12,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Ekle</button>
                      </div>
                      {/* Mode selector */}
                      <div style={{marginBottom:6}}>
                        <div style={{fontSize:9,fontWeight:700,color:T.textMuted,marginBottom:4}}>⚡ Mod</div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {Object.entries(ACTIVITY_MODES).map(([k,m])=>{
                            const mc=getModeColor(k,theme);
                            return (
                              <button key={k} onClick={()=>{ setTaskMode(k); setTaskDuration(Math.round(ACTIVITY_MODES[k].duration/60)); }} style={{border:"none",cursor:"pointer",background:taskMode===k?mc.color+"22":"transparent",borderRadius:8,padding:"3px 8px",fontSize:9,fontWeight:700,color:taskMode===k?mc.color:T.textMuted,outline:taskMode===k?`1px solid ${mc.color}55`:"none",transition:"all 0.2s",display:"flex",alignItems:"center",gap:3}}>
                                <span>{m.emoji}</span>{m.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* Duration picker */}
                      <div style={{marginBottom:6}}>
                        <div style={{fontSize:9,fontWeight:700,color:T.textMuted,marginBottom:4}}>⏱ Süre</div>
                        <DurationPicker value={taskDuration} onChange={setTaskDuration} color={getModeColor(taskMode,theme).color} T={T} disabled={false}/>
                      </div>
                      {/* Project selector */}
                      <div>
                        <div style={{fontSize:9,fontWeight:700,color:T.textMuted,marginBottom:4}}>📁 Proje</div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          <button onClick={()=>setTaskProjectId(null)} style={{border:"none",cursor:"pointer",background:taskProjectId===null?T.border:"transparent",borderRadius:8,padding:"3px 8px",fontSize:9,fontWeight:700,color:taskProjectId===null?T.textSoft:T.textMuted,outline:taskProjectId===null?`1px solid ${T.borderLight}`:"none",transition:"all 0.2s",display:"flex",alignItems:"center",gap:4}}>
                            — Projesiz
                          </button>
                          {projects.map(p=>(
                            <button key={p.id} onClick={()=>setTaskProjectId(p.id)} style={{border:"none",cursor:"pointer",background:taskProjectId===p.id?`${p.color}22`:"transparent",borderRadius:8,padding:"3px 8px",fontSize:9,fontWeight:700,color:taskProjectId===p.id?p.color:T.textMuted,outline:taskProjectId===p.id?`1px solid ${p.color}55`:"none",transition:"all 0.2s",display:"flex",alignItems:"center",gap:4}}>
                              <span style={{width:5,height:5,borderRadius:"50%",background:p.color,display:"inline-block"}}/>
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {tasks.map(t=>{
                      const proj = projects.find(p=>p.id===t.projectId);
                      return (
                        <div key={t.id} onClick={()=>{if(t.done)return;const willBeActive=!t.active;setTasks(p=>p.map(x=>({...x,active:x.id===t.id?willBeActive:false})));if(willBeActive){if(t.mode)switchActivity(t.mode);if(t.duration)setRemaining(t.duration*60);}}} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:t.active?cfg.color+"12":T.glass,borderRadius:14,cursor:"pointer",border:`1px solid ${t.active?cfg.color+"44":T.border}`,opacity:t.done?0.38:1,transition:"all 0.2s",position:"relative",overflow:"hidden",boxShadow:t.active&&running?`0 0 0 2px ${cfg.color}22`:"none"}}>
                          {t.active&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:cfg.color,borderRadius:"14px 0 0 14px"}}/>}
                          <div onClick={e=>{e.stopPropagation();const found=tasks.find(x=>x.id===t.id);if(found&&!found.done)showToast("✨ Görevi tamamladın!");setTasks(p=>p.map(x=>x.id===t.id?{...x,done:!x.done,active:false}:x));}} style={{width:20,height:20,borderRadius:7,flexShrink:0,cursor:"pointer",border:`1.5px solid ${t.done?T.mint:t.active?cfg.color:T.border}`,background:t.done?T.mint+"28":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",marginLeft:t.active?5:0}}>
                            {t.done&&<span style={{fontSize:11,color:T.mint,fontWeight:700}}>✓</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                              <span style={{fontSize:12,fontWeight:t.active?700:600,color:t.active?T.text:T.textSoft,textDecoration:t.done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.text}</span>
                              {t.active&&running&&<span style={{fontSize:8,fontWeight:800,color:cfg.color,background:cfg.color+"18",border:`1px solid ${cfg.color}44`,borderRadius:20,padding:"1px 6px",flexShrink:0,display:"flex",alignItems:"center",gap:2}}><span style={{width:4,height:4,borderRadius:"50%",background:cfg.color,display:"inline-block",animation:"glow 1.2s infinite"}}/>çalışıyor</span>}
                            </div>
                            <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                              {t.mode&&ACTIVITY_MODES[t.mode]&&(()=>{const mc=getModeColor(t.mode,theme);return(<span style={{fontSize:8,fontWeight:700,color:mc.color,background:mc.color+"18",border:`1px solid ${mc.color}33`,borderRadius:5,padding:"1px 5px"}}>{ACTIVITY_MODES[t.mode].emoji} {ACTIVITY_MODES[t.mode].label}</span>);})()}
                              {t.duration&&<span style={{fontSize:8,fontWeight:700,color:T.textMuted,background:T.glass,border:`1px solid ${T.border}`,borderRadius:5,padding:"1px 5px"}}>⏱ {t.duration}dk</span>}
                              <ProjectBadge project={proj} small/>
                            </div>
                          </div>
                          <span style={{fontSize:10,color:t.active?cfg.color:T.textMuted,background:t.active?cfg.color+"18":T.glass,padding:"2px 7px",borderRadius:8,flexShrink:0,fontWeight:t.active?700:400}}>🍅 {t.pomos}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PROJECTS TAB ── */}
          {tab==="projects" && (
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",animation:"fadeUp 0.35s ease"}}>
              <div style={{padding:"16px 18px 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
                <span style={{fontSize:18,fontWeight:800,color:T.text}}>📁 Projeler</span>
                <button onClick={openNewProject} style={{background:T.lavender+"22",border:`1px solid ${T.lavender}44`,borderRadius:12,padding:"7px 14px",fontSize:11,fontWeight:700,color:T.lavender,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:14}}>+</span> Yeni Proje
                </button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
                {projects.map(p=>(
                  <ProjectCard key={p.id} project={p} logs={timeLogs} onEdit={()=>openEditProject(p)}/>
                ))}
                {projects.length===0 && <div style={{textAlign:"center",padding:40,color:T.textMuted,fontSize:12}}>Henüz proje yok</div>}
              </div>
            </div>
          )}

          {/* ── LOGS TAB ── */}
          {tab==="logs" && (
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",animation:"fadeUp 0.35s ease"}}>
              <div style={{padding:"16px 18px 0",flexShrink:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontSize:18,fontWeight:800,color:T.text}}>🕐 Zaman Kayıtları</span>
                  <span style={{fontSize:11,fontWeight:600,color:T.textMuted}}>{timeLogs.length} kayıt</span>
                </div>
                {/* Summary pills */}
                <div style={{display:"flex",gap:8,marginBottom:4}}>
                  <div style={{flex:1,background:T.mint+"18",border:`1px solid ${T.mint}33`,borderRadius:14,padding:"8px 12px",display:"flex",flexDirection:"column",gap:2}}>
                    <span style={{fontSize:15,fontWeight:700,color:T.mint}}>{fmtDuration(totalSec)}</span>
                    <span style={{fontSize:9,color:T.textMuted,fontWeight:700}}>Toplam Çalışma</span>
                  </div>
                  <div style={{flex:1,background:T.mint+"18",border:`1px solid ${T.mint}33`,borderRadius:14,padding:"8px 12px",display:"flex",flexDirection:"column",gap:2}}>
                    <span style={{fontSize:15,fontWeight:700,color:T.mint}}>{completedLogs}</span>
                    <span style={{fontSize:9,color:T.textMuted,fontWeight:700}}>Tamamlanan 🍅</span>
                  </div>
                  <div style={{flex:1,background:T.yellow+"18",border:`1px solid ${T.yellow}33`,borderRadius:14,padding:"8px 12px",display:"flex",flexDirection:"column",gap:2}}>
                    <span style={{fontSize:15,fontWeight:700,color:T.yellow}}>{incompleteLogs}</span>
                    <span style={{fontSize:9,color:T.textMuted,fontWeight:700}}>Eksik ⚠️</span>
                  </div>
                </div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"8px 18px 20px"}}>
                {Object.keys(logsByDate).length===0 && (
                  <div style={{textAlign:"center",padding:60,color:T.textMuted,fontSize:12}}>
                    <div style={{fontSize:40,marginBottom:10}}>👻</div>
                    Henüz kayıt yok.<br/>Timer'ı başlat!
                  </div>
                )}
                {logsByDateAndTask.map(({date,daySec,taskGroups})=>(
                  <div key={date} style={{marginBottom:18}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,marginTop:4,paddingBottom:5,borderBottom:`1px solid ${T.border}`}}>
                      <span style={{fontSize:11,fontWeight:800,color:T.textMuted}}>{date}</span>
                      <span style={{fontSize:11,fontWeight:700,color:T.textSoft}}>{fmtDuration(daySec)}</span>
                    </div>
                    {taskGroups.map(({taskId,taskName,logs})=>(
                      <TaskLogGroup key={taskId||taskName} taskId={taskId} taskName={taskName} logs={logs} projects={projects} theme={theme}/>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STATS TAB ── */}
          {tab==="stats" && (()=>{
            const todaySec = timeLogs.filter(l=>new Date(l.startTime).toDateString()===new Date().toDateString()).reduce((a,l)=>a+l.durationSec,0);
            const streakDays = (()=>{
              const s = new Set(timeLogs.map(l=>new Date(l.startTime).toDateString()));
              let streak=0, d=new Date();
              while(s.has(d.toDateString())){ streak++; d.setDate(d.getDate()-1); }
              return streak;
            })();
            const modeDonutData = Object.entries(ACTIVITY_MODES).map(([k,m])=>({
              label:m.label, value:timeLogs.filter(l=>l.activityMode===k).reduce((a,l)=>a+l.durationSec,0), color:getModeColor(k,theme).color,
            }));
            const projDonutData = projects.map(p=>({
              label:p.name, value:timeLogs.filter(l=>l.projectId===p.id).reduce((a,l)=>a+l.durationSec,0), color:p.color,
            }));
            return (
            <div style={{flex:1,overflowY:"auto",padding:"16px 18px",animation:"fadeUp 0.4s ease"}}>
              <div style={{fontSize:18,fontWeight:800,color:T.text,marginBottom:14}}>📊 İstatistikler</div>

              {/* Summary cards */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                {[
                  {e:"⏱️",v:fmtDuration(totalSec),l:"Toplam Odak",c:T.lavender},
                  {e:"☀️",v:fmtDuration(todaySec),l:"Bugün",c:T.mint},
                  {e:"🔥",v:`${streakDays} gün`,l:"Seri",c:T.peach},
                  {e:"✅",v:completedLogs,l:"Tamamlanan",c:T.mint},
                ].map(({e,v,l,c})=>(
                  <div key={l} style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:18,padding:14}}>
                    <div style={{fontSize:20,marginBottom:5}}>{e}</div>
                    <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
                    <div style={{fontSize:10,color:T.textMuted,marginTop:2,fontWeight:600}}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Weekly bar chart */}
              <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:18,padding:"14px 16px",marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:T.textSoft,marginBottom:12}}>📊 Son 7 Gün</div>
                <WeeklyBarChart timeLogs={timeLogs} T={T}/>
              </div>

              {/* Heatmap */}
              <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:18,padding:"14px 16px",marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:T.textSoft,marginBottom:10}}>🗓️ Aktivite Haritası</div>
                <ActivityHeatmap timeLogs={timeLogs} T={T} theme={theme}/>
              </div>

              {/* Mode donut */}
              <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:18,padding:"14px 16px",marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:T.textSoft,marginBottom:12}}>⚡ Mod Dağılımı</div>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <DonutChart data={modeDonutData} T={T} size={110}/>
                  <div style={{flex:1}}>
                    {modeDonutData.map(({label,value,color})=>(
                      <div key={label} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:color,flexShrink:0}}/>
                        <span style={{flex:1,fontSize:11,fontWeight:600,color:T.textSoft}}>{label}</span>
                        <span style={{fontSize:10,fontWeight:700,color:T.textMuted}}>{fmtDuration(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Project donut */}
              <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:18,padding:"14px 16px",marginBottom:20}}>
                <div style={{fontSize:12,fontWeight:700,color:T.textSoft,marginBottom:12}}>📁 Proje Dağılımı</div>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <DonutChart data={projDonutData} T={T} size={110}/>
                  <div style={{flex:1}}>
                    {projDonutData.map(({label,value,color})=>(
                      <div key={label} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:color,flexShrink:0}}/>
                        <span style={{flex:1,fontSize:11,fontWeight:600,color:T.textSoft}}>{label}</span>
                        <span style={{fontSize:10,fontWeight:700,color:T.textMuted}}>{fmtDuration(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* ── GARDEN TAB (mobile) ── */}
          {tab==="garden" && (
            <GardenView plants={gardenPlants} projects={projects} T={T} theme={theme}/>
          )}

          {/* Bottom Nav */}
          <div style={{background:T.navBg,backdropFilter:"blur(20px)",borderTop:`1px solid ${T.border}`,display:"flex",padding:"10px 12px 20px",gap:2,flexShrink:0}}>
            {[
              {icon:"⏱️",label:"Timer",key:"timer"},
              {icon:"📁",label:"Projeler",key:"projects"},
              {icon:"🕐",label:"Kayıtlar",key:"logs"},
              {icon:"📊",label:"İstatistik",key:"stats"},
              {icon:"🌱",label:"Bahçe",key:"garden"},
            ].map(({icon,label,key})=>(
              <button key={key} onClick={()=>setTab(key)} style={{flex:1,border:"none",cursor:"pointer",borderRadius:16,background:tab===key?cfg.color+"18":"transparent",padding:"8px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,transition:"all 0.2s"}}>
                <span style={{fontSize:18}}>{icon}</span>
                <span style={{fontSize:9,fontWeight:700,color:tab===key?cfg.color:T.textMuted}}>{label}</span>
              </button>
            ))}
          </div>

          {/* ── PLANT PICKER MODAL (mobile) ── */}
          {showPlantPicker && pendingPlantInfo && (
            <PlantPickerModal
              onSelect={handlePlantSelect}
              defaultType={pendingPlantInfo.activityMode}
              theme={theme}
            />
          )}

          {/* ── FEEDBACK MODAL (mobile) ── */}
          {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)}/>}

          {/* ── PROJECT MODAL ── */}
          {showProjectModal && (
            <Modal title={editingProject?"Projeyi Düzenle":"Yeni Proje"} onClose={()=>{setShowProjectModal(false);setEditingProject(null);}}>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:700,color:T.textMuted,display:"block",marginBottom:6}}>Proje Adı</label>
                <input value={newProjName} onChange={e=>setNewProjName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveProject()} placeholder="ör: Kişisel, İş, Ders..." maxLength={30} style={{width:"100%",background:T.inputBg,border:`1px solid ${T.borderLight}`,borderRadius:12,padding:"10px 14px",color:T.text,fontSize:13}}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:T.textMuted,display:"block",marginBottom:8}}>Renk</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {PROJECT_COLORS.map(col=>(
                    <button key={col} onClick={()=>setNewProjColor(col)} style={{width:32,height:32,borderRadius:"50%",background:col,border:newProjColor===col?"3px solid white":"3px solid transparent",cursor:"pointer",boxShadow:newProjColor===col?`0 0 12px ${col}88`:"none",transition:"all 0.2s"}}/>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setShowProjectModal(false);setEditingProject(null);}} style={{flex:1,background:T.glass,border:`1px solid ${T.border}`,borderRadius:14,padding:"11px",fontSize:12,fontWeight:700,color:T.textMuted,cursor:"pointer"}}>İptal</button>
                <button onClick={saveProject} style={{flex:2,background:newProjColor,border:"none",borderRadius:14,padding:"11px",fontSize:12,fontWeight:700,color:"#1a1f2e",cursor:"pointer"}}>
                  {editingProject?"Kaydet":"Oluştur"}
                </button>
              </div>
              {editingProject && (
                <button onClick={()=>{setProjects(prev=>prev.filter(p=>p.id!==editingProject.id));setShowProjectModal(false);setEditingProject(null);if(activeProjectId===editingProject.id)setActiveProjectId(projects[0]?.id||"");}} style={{width:"100%",background:"rgba(255,80,80,0.1)",border:"1px solid rgba(255,80,80,0.3)",borderRadius:14,padding:"10px",fontSize:12,fontWeight:700,color:"#ff8080",cursor:"pointer",marginTop:8}}>Projeyi Sil</button>
              )}
            </Modal>
          )}
        </>}
      </div>
      )}
    </div>
  );
}
