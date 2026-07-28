import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Pin,
  Link2,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Search,
  Calendar,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Loader2,
  Award,
  AlertTriangle,
  LayoutGrid,
  Table2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Camera,
  Repeat,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  MapPin,
  Compass,
  Timer,
  Pause,
  Play,
  Square,
  BarChart3,
  FileText,
  Heading1,
  CheckSquare,
  Minus,
  ImagePlus,
  GripVertical,
  Quote,
  Code2,
  Undo2,
  Download,
  Upload,
  Copy,
  LayoutTemplate,
} from "lucide-react";
import { storage, backendMode } from "../lib/storage.js";

// ---------- constants ----------
const CARD_W = 208;
const CARD_H = 148;
const BOARD_H = 620;
const COLD_DAYS = 4; // days untouched before a task "goes cold"

const PRIORITY = {
  urgent: { label: "URGENT", color: "#b91c1c" },
  active: { label: "ACTIVE", color: "#b45309" },
  cold: { label: "COLD CASE", color: "#1d4ed8" },
};

const PIN_COLORS = ["#dc2626", "#eab308", "#2563eb", "#16a34a"];

const THREAD_COLORS = {
  blocking: { hex: "#b91c1c", label: "Blocking" },
  related: { hex: "#2563eb", label: "Related" },
  waiting: { hex: "#ca8a04", label: "Waiting on someone" },
};
const THREAD_COLOR_ORDER = ["blocking", "related", "waiting"];

const RECURRENCE_LABEL = { none: "One-time", daily: "Daily", weekly: "Weekly" };

const RANKS = [
  { min: 0, label: "Rookie" },
  { min: 3, label: "Detective" },
  { min: 7, label: "Senior Detective" },
  { min: 15, label: "Chief Inspector" },
];

const MAP_W = 900;
const MAP_H = 520;
const FOCUS_PRESETS = [5, 15, 25, 45];

function formatClock(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// lightweight inline markdown: **bold**, *italic*, `code`, [label](url)
function renderInline(text) {
  if (!text) return null;
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2] !== undefined) parts.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3] !== undefined) parts.push(<em key={key++}>{match[3]}</em>);
    else if (match[4] !== undefined)
      parts.push(
        <code key={key++} className="px-1 rounded" style={{ background: "rgba(0,0,0,0.12)" }}>
          {match[4]}
        </code>
      );
    else if (match[5] !== undefined)
      parts.push(
        <a key={key++} href={match[6]} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#1d4ed8" }}>
          {match[5]}
        </a>
      );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

const BLOCK_TYPES = [
  { type: "heading", label: "Heading", icon: Heading1, hint: "Big section title" },
  { type: "text", label: "Text", icon: FileText, hint: "Plain paragraph — supports **bold**, *italic*, `code`, [link](url)" },
  { type: "todo", label: "To-do", icon: CheckSquare, hint: "A checkable line" },
  { type: "toggle", label: "Toggle", icon: ChevronRight, hint: "Collapsible section" },
  { type: "quote", label: "Quote", icon: Quote, hint: "A callout / quoted line" },
  { type: "code", label: "Code", icon: Code2, hint: "A monospace code block" },
  { type: "image", label: "Image", icon: ImagePlus, hint: "Attach a photo" },
  { type: "divider", label: "Divider", icon: Minus, hint: "A horizontal rule" },
];

function blocksToMarkdown(task) {
  let out = `# ${task.title}\n\n`;
  (task.blocks || []).forEach((b) => {
    if (b.type === "heading") out += `## ${b.text}\n\n`;
    else if (b.type === "text") out += `${b.text}\n\n`;
    else if (b.type === "todo") out += `- [${b.checked ? "x" : " "}] ${b.text}\n`;
    else if (b.type === "quote") out += `> ${b.text}\n\n`;
    else if (b.type === "code") out += "```\n" + b.text + "\n```\n\n";
    else if (b.type === "toggle") out += `**${b.text}**${b.detail ? `\n${b.detail}` : ""}\n\n`;
    else if (b.type === "divider") out += `---\n\n`;
    else if (b.type === "image") out += `![photo]${b.text ? ` (${b.text})` : ""}\n\n`;
  });
  return out;
}

const now = Date.now();

// a generated placeholder "mugshot" so the demo shows the photo feature immediately —
// not a real photo, just a simple vector silhouette encoded inline.
const PLACEHOLDER_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%233a342a'/><circle cx='50' cy='38' r='18' fill='%23a08a68'/><path d='M18 92 Q50 55 82 92 Z' fill='%23a08a68'/></svg>"
  );

const seedTasks = () => [
  { id: "t1", title: "Interview the intern about missing stapler", category: "OFFICE", priority: "cold", status: "open", x: 60, y: 60, rot: -4, pin: PIN_COLORS[2], dueDate: "", subtasks: [], updatedAt: now, images: [{ id: "p1", src: PLACEHOLDER_PHOTO, caption: "" }], recurrence: "none", location: null, createdAt: now - 5 * 86400000, closedAt: null, blocks: [] },
  { id: "t2", title: "Finish Q3 budget report", category: "WORK", priority: "urgent", status: "open", x: 340, y: 90, rot: 3, pin: PIN_COLORS[0], dueDate: "", subtasks: [{ id: "s1", text: "Pull last quarter numbers", done: true }, { id: "s2", text: "Draft summary", done: false }], updatedAt: now, images: [], recurrence: "none", location: { label: "Downtown Office, 5th Ave", x: 420, y: 150 }, createdAt: now - 3 * 86400000, closedAt: null,
    blocks: [
      { id: "b1", type: "heading", text: "Case Notes" },
      { id: "b2", type: "text", text: "Waiting on **finance** to send *last quarter's* actuals. Ping `#finance-team` if nothing by Friday." },
      { id: "b3", type: "divider" },
      { id: "b4", type: "todo", text: "Confirm numbers with finance", checked: false },
      { id: "b5", type: "todo", text: "Draft the exec summary", checked: false },
    ] },
  { id: "t3", title: "Call the dentist back", category: "PERSONAL", priority: "active", status: "open", x: 620, y: 55, rot: -2, pin: PIN_COLORS[1], dueDate: "", subtasks: [], updatedAt: now, images: [], recurrence: "none", location: { label: "City Dental, Main St", x: 210, y: 300 }, createdAt: now - 1 * 86400000, closedAt: null, blocks: [] },
  { id: "t4", title: "Water the office plant (again)", category: "OFFICE", priority: "cold", status: "closed", x: 190, y: 320, rot: 5, pin: PIN_COLORS[2], dueDate: "", subtasks: [], updatedAt: now, images: [], recurrence: "weekly", location: null, createdAt: now - 4 * 86400000, closedAt: now - 1 * 86400000, blocks: [] },
];

const seedConnections = () => [{ id: "c1", a: "t1", b: "t2", color: "blocking" }];

const seedTimeLogs = () => [
  { id: "log1", taskId: "t2", taskTitle: "Finish Q3 budget report", minutes: 25, date: new Date().toISOString().slice(0, 10) },
];

function randomId() {
  return Math.random().toString(36).slice(2, 9);
}

// reads a File, downsizes it on a canvas, and resolves to a compact JPEG data URL —
// keeps attached photos small enough to persist comfortably
function resizeImageFile(file, maxDim = 360, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Could not load image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

let sharedAudioCtx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new AC();
  return sharedAudioCtx;
}

// a short soft click — used for pin drags and typewriter keystrokes
function playClick(freq = 620, duration = 0.045, volume = 0.05) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // sound is decorative — fail silently
  }
}

// a soft burst of filtered noise — used for card drop / paper rustle
function playRustle(duration = 0.22, volume = 0.05) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    noise.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch (e) {
    // sound is decorative — fail silently
  }
}

function caseNumber() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `NO. ${d.getFullYear()}-${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
}

function rankFor(closedCount) {
  let r = RANKS[0];
  for (const rank of RANKS) if (closedCount >= rank.min) r = rank;
  return r.label;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// builds a Google Calendar "add event" link — no auth needed, opens in a new tab
function gcalLink(task) {
  if (!task.dueDate) return null;
  const start = new Date(task.dueDate);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 30 * 60000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: task.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Case Board task — ${task.category} (${PRIORITY[task.priority].label})`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function CaseBoard({ storageKey = "caseboard-state-v1" }) {
  const [tasks, setTasks] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkFirst, setLinkFirst] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [showClosed, setShowClosed] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [caseNo] = useState(caseNumber);
  const [form, setForm] = useState({ title: "", category: "", priority: "active", dueDate: "", images: [], recurrence: "none" });
  const [expandedId, setExpandedId] = useState(null);
  const [subtaskDraft, setSubtaskDraft] = useState({});
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [view, setView] = useState("board"); // "board" | "list"
  const [sortKey, setSortKey] = useState("priority"); // priority | due | status | title
  const [sortDir, setSortDir] = useState("asc");
  const [priorityFilter, setPriorityFilter] = useState(new Set(["urgent", "active", "cold"]));
  const [overdueOnly, setOverdueOnly] = useState(false);
  // a thread currently being dragged off a pin — either a brand new one, or
  // one end of an existing connection being released/re-routed
  // { mode:'new', fromId, x, y, hoverId } | { mode:'reroute', connId, endKey:'a'|'b', anchorId, x, y, hoverId }
  const [draftString, setDraftString] = useState(null);
  const [nextThreadColor, setNextThreadColor] = useState("blocking");
  const [pendingImageTarget, setPendingImageTarget] = useState(null); // "form" | taskId
  const [lightboxTaskId, setLightboxTaskId] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [timeLogs, setTimeLogs] = useState([]);
  const [focusTimer, setFocusTimer] = useState(null); // { taskId, taskTitle, totalSec, remainingSec, running }
  const [placingTaskId, setPlacingTaskId] = useState(null); // map: task armed to be placed on next map click (fallback for taps)
  const [mapPopoverTaskId, setMapPopoverTaskId] = useState(null);
  const [mapDrag, setMapDrag] = useState(null); // { taskId, taskTitle, isNew, x, y, overMap } — pointer-based drag on the map
  const [editingLocationTaskId, setEditingLocationTaskId] = useState(null); // just-placed pin awaiting a label
  const [reviewRange, setReviewRange] = useState("week"); // "week" | "month"
  const [openTaskId, setOpenTaskId] = useState(null); // task whose block-based detail page is open
  const [templates, setTemplates] = useState([]);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [exportPanel, setExportPanel] = useState(null); // { title, text } — shown as a copyable textarea
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  const boardRef = useRef(null);
  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);
  const notifiedRef = useRef(new Set());
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const historyRef = useRef([]);
  const skipHistoryRef = useRef(false);

  // ---------- load from persistent storage ----------
  // Uses whichever backend src/lib/storage.js resolves to: localStorage by
  // default, or Supabase automatically if VITE_SUPABASE_URL /
  // VITE_SUPABASE_ANON_KEY are set in .env.
  useEffect(() => {
    (async () => {
      const parsed = await storage.load(storageKey);
      if (parsed && parsed.tasks?.length) {
        setTasks(parsed.tasks);
        setConnections(parsed.connections || []);
        setTimeLogs(parsed.timeLogs || []);
        setTemplates(parsed.templates || []);
      } else {
        setTasks(seedTasks());
        setConnections(seedConnections());
        setTimeLogs(seedTimeLogs());
        setTemplates([]);
      }
      setLoaded(true);
      setBriefingOpen(true);
    })();
  }, []);

  // ---------- save to persistent storage (debounced) ----------
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      storage.save(storageKey, { tasks, connections, timeLogs, templates });
    }, 400);
    return () => clearTimeout(t);
  }, [tasks, connections, timeLogs, templates, loaded]);

  // ---------- undo history (generic snapshot of tasks + connections) ----------
  useEffect(() => {
    if (!loaded) return;
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    historyRef.current.push({ tasks, connections });
    if (historyRef.current.length > 25) historyRef.current.shift();
  }, [tasks, connections, loaded]);

  const undo = () => {
    if (historyRef.current.length < 2) return;
    historyRef.current.pop(); // discard current state
    const prev = historyRef.current[historyRef.current.length - 1];
    skipHistoryRef.current = true;
    setTasks(prev.tasks);
    setConnections(prev.connections);
  };

  // ---------- global keyboard shortcuts ----------
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (isTyping) return;
      if (e.key === "n") {
        e.preventDefault();
        setFormOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        if (openTaskId) setOpenTaskId(null);
        else if (lightboxTaskId) setLightboxTaskId(null);
        else if (exportPanel) setExportPanel(null);
        else if (importOpen) setImportOpen(false);
        else if (formOpen) setFormOpen(false);
        else if (editingLocationTaskId) setEditingLocationTaskId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openTaskId, lightboxTaskId, exportPanel, importOpen, formOpen, editingLocationTaskId]);

  // ---------- export / import (JSON) and export to Markdown ----------
  const exportBoardJSON = () => {
    const payload = JSON.stringify({ tasks, connections, timeLogs, templates }, null, 2);
    try {
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "case-board-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      // download may be blocked in sandboxed environments — the copyable panel below covers that case
    }
    setExportPanel({ title: "Board export (JSON)", text: payload });
  };

  const exportTaskMarkdown = (task) => {
    setExportPanel({ title: `${task.title} — Markdown`, text: blocksToMarkdown(task) });
  };

  const importBoardJSON = () => {
    setImportError("");
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed.tasks)) throw new Error("Missing tasks array");
      setTasks(parsed.tasks);
      setConnections(parsed.connections || []);
      setTimeLogs(parsed.timeLogs || []);
      setTemplates(parsed.templates || []);
      setImportOpen(false);
      setImportText("");
    } catch (e) {
      setImportError("That doesn't look like a valid case-board export. Check the JSON and try again.");
    }
  };

  // ---------- case-file templates ----------
  const saveAsTemplate = (task) => {
    const name = saveTemplateName.trim();
    if (!name) return;
    setTemplates((prev) => [
      ...prev,
      {
        id: randomId(),
        name,
        category: task.category,
        priority: task.priority,
        recurrence: task.recurrence,
        subtasks: (task.subtasks || []).map((s) => ({ text: s.text })),
        blocks: (task.blocks || []).map((b) => ({ ...b, id: undefined })),
      },
    ]);
    setSaveTemplateOpen(false);
    setSaveTemplateName("");
  };

  const deleteTemplate = (id) => setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));

  // ---------- drag handling ----------
  const onPointerDownCard = (e, id) => {
    if (linkMode) return;
    const boardRect = boardRef.current.getBoundingClientRect();
    const t = tasks.find((tk) => tk.id === id);
    if (soundOn) playClick(520, 0.04, 0.04);
    setDragging({
      id,
      offsetX: e.clientX - boardRect.left - t.x,
      offsetY: e.clientY - boardRect.top - t.y,
    });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = useCallback(
    (e) => {
      if (!dragging || !boardRef.current) return;
      const boardRect = boardRef.current.getBoundingClientRect();
      let x = e.clientX - boardRect.left - dragging.offsetX;
      let y = e.clientY - boardRect.top - dragging.offsetY;
      x = Math.max(8, Math.min(boardRect.width - CARD_W - 8, x));
      y = Math.max(8, Math.min(BOARD_H - CARD_H - 8, y));
      setTasks((prev) => prev.map((t) => (t.id === dragging.id ? { ...t, x, y } : t)));
    },
    [dragging]
  );

  const onPointerUp = useCallback(() => {
    setDragging((d) => {
      if (d && soundOn) playRustle();
      return null;
    });
  }, [soundOn]);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragging, onPointerMove, onPointerUp]);

  // ---------- task actions ----------
  const addTask = () => {
    if (!form.title.trim()) return;
    const id = randomId();
    const x = 40 + Math.random() * 500;
    const y = 40 + Math.random() * (BOARD_H - CARD_H - 80);
    const rot = Math.random() * 10 - 5;
    const pin = PIN_COLORS[Math.floor(Math.random() * PIN_COLORS.length)];
    const template = templates.find((tpl) => tpl.id === selectedTemplateId);
    setTasks((prev) => [
      ...prev,
      {
        id,
        title: form.title.trim(),
        category: form.category.trim() || template?.category || "GENERAL",
        priority: form.priority,
        status: "open",
        x,
        y,
        rot,
        pin,
        dueDate: form.dueDate || "",
        subtasks: (template?.subtasks || []).map((s) => ({ id: randomId(), text: s.text, done: false })),
        updatedAt: Date.now(),
        images: form.images || [],
        recurrence: template?.recurrence || form.recurrence || "none",
        location: null,
        createdAt: Date.now(),
        closedAt: null,
        blocks: (template?.blocks || []).map((b) => ({ ...b, id: randomId() })),
      },
    ]);
    setForm({ title: "", category: "", priority: "active", dueDate: "", images: [], recurrence: "none" });
    setSelectedTemplateId("");
    setFormOpen(false);
  };

  const toggleStatus = (id) => {
    setTasks((prev) => {
      const t = prev.find((tk) => tk.id === id);
      if (!t) return prev;
      const closingNow = t.status === "open";
      const updated = prev.map((tk) =>
        tk.id === id
          ? { ...tk, status: closingNow ? "closed" : "open", updatedAt: Date.now(), closedAt: closingNow ? Date.now() : null }
          : tk
      );
      // closing a recurring task spawns its next occurrence as a fresh open lead
      if (closingNow && t.recurrence && t.recurrence !== "none") {
        const days = t.recurrence === "weekly" ? 7 : 1;
        const baseTime = t.dueDate ? new Date(t.dueDate).getTime() : Date.now();
        const nextDue = new Date(baseTime + days * 86400000);
        const clone = {
          ...t,
          id: randomId(),
          status: "open",
          dueDate: t.dueDate ? nextDue.toISOString().slice(0, 16) : "",
          subtasks: (t.subtasks || []).map((s) => ({ ...s, id: randomId(), done: false })),
          images: [],
          x: Math.min(900, t.x + 24),
          y: Math.min(BOARD_H - CARD_H - 8, t.y + 24),
          updatedAt: Date.now(),
          createdAt: Date.now(),
          closedAt: null,
        };
        return [...updated, clone];
      }
      return updated;
    });
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setConnections((prev) => prev.filter((c) => c.a !== id && c.b !== id));
    if (linkFirst === id) setLinkFirst(null);
    if (expandedId === id) setExpandedId(null);
  };

  const cardClick = (id) => {
    if (!linkMode) return;
    if (linkFirst === null) {
      setLinkFirst(id);
      return;
    }
    if (linkFirst === id) {
      setLinkFirst(null);
      return;
    }
    const exists = connections.some(
      (c) => (c.a === linkFirst && c.b === id) || (c.a === id && c.b === linkFirst)
    );
    if (!exists) setConnections((prev) => [...prev, { id: randomId(), a: linkFirst, b: id, color: nextThreadColor }]);
    setLinkFirst(null);
  };

  const removeConnection = (id) => setConnections((prev) => prev.filter((c) => c.id !== id));

  const cycleThreadColor = (id) => {
    setConnections((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const idx = THREAD_COLOR_ORDER.indexOf(c.color || "blocking");
        return { ...c, color: THREAD_COLOR_ORDER[(idx + 1) % THREAD_COLOR_ORDER.length] };
      })
    );
  };

  // ---------- drag-a-thread (create, re-route, or release a connection) ----------
  const findCardAt = (x, y, excludeIds = []) =>
    tasks.find((t) => !excludeIds.includes(t.id) && x >= t.x && x <= t.x + CARD_W && y >= t.y && y <= t.y + CARD_H);

  const beginNewString = (e, fromId) => {
    e.stopPropagation();
    if (soundOn) playClick(700, 0.04, 0.035);
    const rect = boardRef.current.getBoundingClientRect();
    setDraftString({ mode: "new", fromId, x: e.clientX - rect.left, y: e.clientY - rect.top, hoverId: null });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const beginReroute = (e, connId, endKey, anchorId) => {
    e.stopPropagation();
    const rect = boardRef.current.getBoundingClientRect();
    setDraftString({ mode: "reroute", connId, endKey, anchorId, x: e.clientX - rect.left, y: e.clientY - rect.top, hoverId: null });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onDraftPointerMove = (e) => {
    if (!draftString || !boardRef.current) return;
    e.stopPropagation();
    const rect = boardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const excludeIds = draftString.mode === "new" ? [draftString.fromId] : [draftString.anchorId];
    const hover = findCardAt(x, y, excludeIds);
    setDraftString((ds) => (ds ? { ...ds, x, y, hoverId: hover ? hover.id : null } : ds));
  };

  const onDraftPointerUp = (e) => {
    if (!draftString || !boardRef.current) return;
    e.stopPropagation();
    const rect = boardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draftString.mode === "new") {
      const target = findCardAt(x, y, [draftString.fromId]);
      if (target) {
        const exists = connections.some(
          (c) => (c.a === draftString.fromId && c.b === target.id) || (c.a === target.id && c.b === draftString.fromId)
        );
        if (!exists) {
          setConnections((prev) => [...prev, { id: randomId(), a: draftString.fromId, b: target.id, color: nextThreadColor }]);
          if (soundOn) playRustle(0.15, 0.04);
        }
      }
    } else if (draftString.mode === "reroute") {
      const target = findCardAt(x, y, [draftString.anchorId]);
      if (!target) {
        // dropped in empty space — the thread is released and removed
        setConnections((prev) => prev.filter((c) => c.id !== draftString.connId));
      } else {
        const dupExists = connections.some(
          (c) =>
            c.id !== draftString.connId &&
            ((c.a === draftString.anchorId && c.b === target.id) || (c.a === target.id && c.b === draftString.anchorId))
        );
        if (dupExists) {
          setConnections((prev) => prev.filter((c) => c.id !== draftString.connId));
        } else {
          setConnections((prev) =>
            prev.map((c) => (c.id === draftString.connId ? { ...c, [draftString.endKey]: target.id } : c))
          );
        }
      }
    }
    setDraftString(null);
  };

  const resetBoard = () => {
    setTasks(seedTasks());
    setConnections(seedConnections());
    setLinkMode(false);
    setLinkFirst(null);
    setExpandedId(null);
  };

  // ---------- subtasks ("clues") ----------
  const addSubtask = (taskId) => {
    const text = (subtaskDraft[taskId] || "").trim();
    if (!text) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: [...(t.subtasks || []), { id: randomId(), text, done: false }], updatedAt: Date.now() }
          : t
      )
    );
    setSubtaskDraft((d) => ({ ...d, [taskId]: "" }));
  };

  const toggleSubtask = (taskId, subId) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)), updatedAt: Date.now() }
          : t
      )
    );
  };

  const deleteSubtask = (taskId, subId) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subId), updatedAt: Date.now() } : t
      )
    );
  };

  // ---------- evidence photo ----------
  const triggerImageUpload = (target) => {
    setPendingImageTarget(target);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    const target = pendingImageTarget;
    e.target.value = ""; // allow re-selecting the same file later
    if (!file || !target) return;
    try {
      const dataUrl = await resizeImageFile(file);
      if (target === "form") {
        const entry = { id: randomId(), src: dataUrl, caption: "" };
        setForm((f) => ({ ...f, images: [...(f.images || []), entry] }));
      } else if (typeof target === "string" && target.startsWith("block:")) {
        const [, taskId, blockId] = target.split(":");
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, blocks: (t.blocks || []).map((b) => (b.id === blockId ? { ...b, src: dataUrl } : b)), updatedAt: Date.now() }
              : t
          )
        );
      } else {
        const entry = { id: randomId(), src: dataUrl, caption: "" };
        setTasks((prev) =>
          prev.map((t) => (t.id === target ? { ...t, images: [...(t.images || []), entry], updatedAt: Date.now() } : t))
        );
      }
    } catch (err) {
      // attaching a photo is optional — fail silently if the file can't be read
    }
    setPendingImageTarget(null);
  };

  // ---------- block-based case-file editor ----------
  const updateTaskField = (taskId, patch) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch, updatedAt: Date.now() } : t)));
  };

  const updateBlocks = (taskId, updater) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, blocks: updater(t.blocks || []), updatedAt: Date.now() } : t))
    );
  };

  const addBlock = (taskId, type, afterId) => {
    const newBlock = { id: randomId(), type, text: "", checked: false, src: "", collapsed: false, detail: "" };
    updateBlocks(taskId, (blocks) => {
      if (!afterId) return [...blocks, newBlock];
      const idx = blocks.findIndex((b) => b.id === afterId);
      const next = [...blocks];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    return newBlock.id;
  };

  const updateBlock = (taskId, blockId, patch) => {
    updateBlocks(taskId, (blocks) => blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));
  };

  const deleteBlock = (taskId, blockId) => {
    updateBlocks(taskId, (blocks) => blocks.filter((b) => b.id !== blockId));
  };

  const moveBlock = (taskId, blockId, dir) => {
    updateBlocks(taskId, (blocks) => {
      const idx = blocks.findIndex((b) => b.id === blockId);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= blocks.length) return blocks;
      const next = [...blocks];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  // adds a photo dropped directly onto a card (native HTML5 drag-and-drop from the OS)
  const handleCardDrop = async (e, taskId) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await resizeImageFile(file);
      const entry = { id: randomId(), src: dataUrl, caption: "" };
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, images: [...(t.images || []), entry], updatedAt: Date.now() } : t))
      );
    } catch (err) {
      // optional — fail silently
    }
  };

  const removeImage = (taskId, imageId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, images: (t.images || []).filter((im) => im.id !== imageId), updatedAt: Date.now() } : t))
    );
  };

  const updateImageCaption = (taskId, imageId, caption) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, images: (t.images || []).map((im) => (im.id === imageId ? { ...im, caption } : im)) }
          : t
      )
    );
  };

  // ---------- browser notifications for overdue / due-soon leads ----------
  const enableNotifications = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      setNotifyEnabled(true);
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") setNotifyEnabled(true);
    } catch (e) {
      // notifications unsupported in this environment — ignore
    }
  };

  useEffect(() => {
    if (!notifyEnabled || typeof Notification === "undefined") return;
    const check = () => {
      const nowMs = Date.now();
      tasks.forEach((t) => {
        if (t.status !== "open" || !t.dueDate) return;
        const due = new Date(t.dueDate).getTime();
        const diff = due - nowMs;
        const key = `${t.id}:${t.dueDate}`;
        if ((diff <= 0 || diff <= 3600000) && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          try {
            new Notification(diff <= 0 ? "Case overdue" : "Case due within the hour", { body: t.title, tag: t.id });
          } catch (e) {
            // ignore — best effort only
          }
        }
      });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [tasks, notifyEnabled]);

  // ---------- map view: placing/moving/removing location pins ----------
  // Uses pointer events (not native HTML5 drag-and-drop) because DnD is
  // unreliable inside sandboxed iframes — same class of issue as
  // window.prompt/confirm being blocked there.
  const setTaskLocation = (taskId, x, y, openLabelEditor) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, location: { label: t.location?.label || "", x, y }, updatedAt: Date.now() }
          : t
      )
    );
    if (openLabelEditor) setEditingLocationTaskId(taskId);
  };

  const beginCarryTask = (e, taskId, taskTitle, isNew) => {
    e.stopPropagation();
    setMapDrag({ taskId, taskTitle, isNew, x: null, y: null, overMap: false });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onMapDragPointerMove = (e) => {
    if (!mapDrag || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const overMap = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
    setMapDrag((d) => (d ? { ...d, x, y, overMap } : d));
  };

  const onMapDragPointerUp = (e) => {
    if (!mapDrag) return;
    if (mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const overMap = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      if (overMap) {
        const clampedX = Math.max(16, Math.min(rect.width - 16, x));
        const clampedY = Math.max(16, Math.min(rect.height - 16, y));
        setTaskLocation(mapDrag.taskId, clampedX, clampedY, mapDrag.isNew);
        if (soundOn) playClick(650, 0.04, 0.035);
      }
    }
    setMapDrag(null);
  };

  // fallback for tap-only devices: tap a lead to arm it, then tap a spot on the map
  const handleMapClick = (e) => {
    if (!placingTaskId || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = Math.max(16, Math.min(rect.width - 16, e.clientX - rect.left));
    const y = Math.max(16, Math.min(rect.height - 16, e.clientY - rect.top));
    setTaskLocation(placingTaskId, x, y, true);
    setPlacingTaskId(null);
    if (soundOn) playClick(650, 0.04, 0.035);
  };

  const removeLocation = (taskId) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, location: null, updatedAt: Date.now() } : t)));
    setMapPopoverTaskId(null);
  };

  const updateLocationLabel = (taskId, label) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId && t.location ? { ...t, location: { ...t.location, label } } : t))
    );
  };

  // ---------- focus timer (Pomodoro-style, logged per task) ----------
  const logTime = (taskId, taskTitle, minutes) => {
    if (minutes <= 0) return;
    setTimeLogs((prev) => [
      ...prev,
      { id: randomId(), taskId, taskTitle, minutes, date: new Date().toISOString().slice(0, 10) },
    ]);
  };

  const stopAndLogTimer = () => {
    setFocusTimer((current) => {
      if (!current) return null;
      const elapsedMin = Math.round((current.totalSec - current.remainingSec) / 60);
      logTime(current.taskId, current.taskTitle, elapsedMin);
      return null;
    });
  };

  const cancelTimer = () => setFocusTimer(null);

  const startFocusTimer = (taskId, taskTitle, minutes = 25) => {
    setFocusTimer((current) => {
      if (current && current.running) {
        const elapsedMin = Math.round((current.totalSec - current.remainingSec) / 60);
        logTime(current.taskId, current.taskTitle, elapsedMin);
      }
      return { taskId, taskTitle, totalSec: minutes * 60, remainingSec: minutes * 60, running: true };
    });
  };

  useEffect(() => {
    if (!focusTimer || !focusTimer.running) return;
    const interval = setInterval(() => {
      setFocusTimer((current) => {
        if (!current || !current.running) return current;
        if (current.remainingSec <= 1) {
          logTime(current.taskId, current.taskTitle, Math.round(current.totalSec / 60));
          if (soundOn) {
            playClick(880, 0.08, 0.06);
            setTimeout(() => playClick(1100, 0.1, 0.06), 120);
          }
          if (notifyEnabled && typeof Notification !== "undefined") {
            try {
              new Notification("Focus session complete", { body: current.taskTitle });
            } catch (e) {}
          }
          return null;
        }
        return { ...current, remainingSec: current.remainingSec - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [focusTimer?.running, focusTimer?.taskId]);

  const pinPoint = (t) => ({ x: t.x + CARD_W / 2, y: t.y + 16 });

  const taskMatchesQuery = (t, q) => {
    const needle = q.toLowerCase();
    if (t.title.toLowerCase().includes(needle)) return true;
    if ((t.blocks || []).some((b) => (b.text && b.text.toLowerCase().includes(needle)) || (b.detail && b.detail.toLowerCase().includes(needle)))) return true;
    if ((t.images || []).some((im) => im.caption && im.caption.toLowerCase().includes(needle))) return true;
    if ((t.subtasks || []).some((s) => s.text && s.text.toLowerCase().includes(needle))) return true;
    return false;
  };

  const visibleTasks = tasks.filter((t) => {
    if (!showClosed && t.status === "closed") return false;
    if (query && !taskMatchesQuery(t, query)) return false;
    if (!priorityFilter.has(t.priority)) return false;
    if (overdueOnly && !(t.status === "open" && t.dueDate && new Date(t.dueDate) < new Date())) return false;
    return true;
  });
  const visibleIds = new Set(visibleTasks.map((t) => t.id));

  const PRIORITY_RANK = { urgent: 0, active: 1, cold: 2 };
  const sortedTasks = [...visibleTasks].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "priority") cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    else if (sortKey === "due") {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      cmp = ad - bd;
    } else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
    else if (sortKey === "title") cmp = a.title.localeCompare(b.title);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const togglePriorityFilter = (key) => {
    setPriorityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next.size === 0 ? new Set(["urgent", "active", "cold"]) : next;
    });
  };

  const SortIcon = ({ column }) =>
    sortKey !== column ? (
      <ArrowUpDown size={11} className="opacity-40" />
    ) : sortDir === "asc" ? (
      <ArrowUp size={11} />
    ) : (
      <ArrowDown size={11} />
    );

  const openCount = tasks.filter((t) => t.status === "open").length;
  const closedCount = tasks.filter((t) => t.status === "closed").length;
  const rank = rankFor(closedCount);
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;
  const allClosed = totalCount > 0 && openCount === 0;

  const today = new Date();
  const overdue = tasks.filter((t) => t.status === "open" && t.dueDate && new Date(t.dueDate) < today);
  const dueToday = tasks.filter(
    (t) => t.status === "open" && t.dueDate && isSameDay(new Date(t.dueDate), today)
  );

  // ---------- review screen metrics ----------
  const reviewDays = reviewRange === "week" ? 7 : 30;
  const rangeStartMs = Date.now() - reviewDays * 86400000;
  const rangeStartDateStr = new Date(rangeStartMs).toISOString().slice(0, 10);
  const closedInRange = tasks.filter((t) => t.status === "closed" && t.closedAt && t.closedAt >= rangeStartMs);
  const closeDurations = closedInRange.filter((t) => t.createdAt).map((t) => (t.closedAt - t.createdAt) / 86400000);
  const avgCloseDays = closeDurations.length ? closeDurations.reduce((a, b) => a + b, 0) / closeDurations.length : null;
  const categoryCounts = closedInRange.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});
  const categoryEntries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const busiestCategory = categoryEntries[0]?.[0] || null;
  const maxCategoryCount = categoryEntries[0]?.[1] || 1;
  const timeLogsInRange = timeLogs.filter((l) => l.date >= rangeStartDateStr);
  const totalMinutesInRange = timeLogsInRange.reduce((sum, l) => sum + l.minutes, 0);
  const tasksWithLocation = tasks.filter((t) => t.location);
  const tasksWithoutLocation = tasks.filter((t) => !t.location);

  if (!loaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#1c1712" }}>
        <div className="flex items-center gap-2 text-amber-200/70 mono text-sm">
          <Loader2 size={16} className="animate-spin" /> Pulling the case file...
        </div>
        <style>{`.mono { font-family: 'Courier New', monospace; }`}</style>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center py-8 px-4"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, #3a2f22 0%, #1c1712 55%, #100d0a 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Inter:wght@400;500;600;700;800&family=Courier+Prime:wght@400;700&display=swap');
        .typewriter { font-family: 'Special Elite', 'Courier New', monospace; }
        .mono { font-family: 'Courier Prime', 'Courier New', monospace; }
        @keyframes stampIn {
          0% { transform: scale(2.2) rotate(-14deg); opacity: 0; }
          60% { transform: scale(0.92) rotate(-14deg); opacity: 1; }
          100% { transform: scale(1) rotate(-14deg); opacity: 1; }
        }
        .stamp-anim { animation: stampIn 260ms ease-out; }
        .cork-texture {
          background-image:
            radial-gradient(circle at 15% 20%, rgba(0,0,0,0.18) 0, transparent 2px),
            radial-gradient(circle at 45% 60%, rgba(0,0,0,0.15) 0, transparent 2px),
            radial-gradient(circle at 75% 30%, rgba(0,0,0,0.18) 0, transparent 2px),
            radial-gradient(circle at 85% 80%, rgba(0,0,0,0.15) 0, transparent 2px),
            radial-gradient(circle at 30% 85%, rgba(0,0,0,0.15) 0, transparent 2px),
            radial-gradient(circle at 60% 10%, rgba(0,0,0,0.15) 0, transparent 2px);
          background-size: 140px 140px;
        }
      `}</style>

      {/* daily briefing modal */}
      {briefingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div
            className="max-w-sm w-full rounded-md p-5 border border-amber-200/20"
            style={{ background: "#241d15", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Pin size={16} className="text-red-500" />
              <h2 className="typewriter text-lg text-amber-50">CAPTAIN'S BRIEFING</h2>
            </div>
            <div className="mono text-sm text-amber-100/80 space-y-1.5">
              <p>
                <span className="text-red-400 font-bold">{overdue.length}</span> lead{overdue.length !== 1 ? "s" : ""} overdue.
              </p>
              <p>
                <span className="text-amber-400 font-bold">{dueToday.length}</span> due today.
              </p>
              <p>
                <span className="text-emerald-400 font-bold">{openCount}</span> open, <span className="text-amber-300 font-bold">{connections.length}</span> thread{connections.length !== 1 ? "s" : ""} on the board.
              </p>
              <p className="text-amber-200/50 pt-1">Rank: {rank}</p>
            </div>
            <button
              onClick={() => setBriefingOpen(false)}
              className="mt-4 w-full py-2 rounded text-sm font-bold text-amber-50 border border-red-400/40"
              style={{ background: "#b91c1c" }}
            >
              Begin the day
            </button>
          </div>
        </div>
      )}

      {/* hidden file input used for both the "new task" form and per-card photo attach */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />

      {/* export panel — shows JSON or Markdown as copyable text (works even where downloads are blocked) */}
      {exportPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={() => setExportPanel(null)}>
          <div className="max-w-lg w-full rounded-md p-5 border border-amber-200/20" style={{ background: "#241d15", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="typewriter text-lg text-amber-50 mb-1">{exportPanel.title}</h2>
            <p className="text-[11px] mono text-amber-200/50 mb-2">A download was attempted automatically — if it didn't start, copy the text below.</p>
            <textarea
              readOnly
              value={exportPanel.text}
              className="w-full h-56 text-[11px] mono p-2 rounded border border-amber-200/15 outline-none resize-none text-amber-100"
              style={{ background: "rgba(0,0,0,0.35)" }}
              onFocus={(e) => e.target.select()}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(exportPanel.text);
                  } catch (e) {}
                }}
                className="flex-1 py-2 rounded text-sm font-bold text-amber-50 border border-red-400/40 flex items-center justify-center gap-1.5 mono"
                style={{ background: "#b91c1c" }}
              >
                <Copy size={13} /> Copy to clipboard
              </button>
              <button onClick={() => setExportPanel(null)} className="px-4 py-2 rounded text-sm text-amber-100/70 border border-amber-200/20 mono">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* import panel */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={() => setImportOpen(false)}>
          <div className="max-w-lg w-full rounded-md p-5 border border-amber-200/20" style={{ background: "#241d15", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="typewriter text-lg text-amber-50 mb-1">IMPORT BOARD</h2>
            <p className="text-[11px] mono text-amber-200/50 mb-2">Paste a previously exported case-board JSON below. This replaces the current board's data.</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="paste JSON here..."
              className="w-full h-48 text-[11px] mono p-2 rounded border border-amber-200/15 outline-none resize-none text-amber-100"
              style={{ background: "rgba(0,0,0,0.35)" }}
            />
            {importError && <p className="text-[11px] mono text-red-400 mt-1">{importError}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={importBoardJSON} className="flex-1 py-2 rounded text-sm font-bold text-amber-50 border border-red-400/40 mono" style={{ background: "#b91c1c" }}>
                Import & replace
              </button>
              <button
                onClick={() => {
                  setImportOpen(false);
                  setImportText("");
                  setImportError("");
                }}
                className="px-4 py-2 rounded text-sm text-amber-100/70 border border-amber-200/20 mono"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* save-as-template modal */}
      {saveTemplateOpen &&
        (() => {
          const t = tasks.find((tk) => tk.id === openTaskId);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={() => setSaveTemplateOpen(false)}>
              <div className="max-w-xs w-full rounded-md p-5 border border-amber-200/20" style={{ background: "#241d15", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
                <h2 className="typewriter text-lg text-amber-50 mb-3">SAVE AS TEMPLATE</h2>
                <input
                  autoFocus
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && t && saveAsTemplate(t)}
                  placeholder="e.g. Client onboarding"
                  className="w-full px-2.5 py-1.5 rounded text-sm text-amber-50 placeholder-amber-200/30 outline-none border border-amber-200/15 focus:border-amber-400/40 mono"
                  style={{ background: "rgba(0,0,0,0.3)" }}
                />
                <p className="text-[10px] mono text-amber-200/40 mt-2">Saves this task's category, priority, recurrence, subtasks, and blocks as a reusable starting point.</p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => t && saveAsTemplate(t)}
                    className="flex-1 py-2 rounded text-sm font-bold text-amber-50 border border-red-400/40 mono"
                    style={{ background: "#b91c1c" }}
                  >
                    Save
                  </button>
                  <button onClick={() => setSaveTemplateOpen(false)} className="px-4 py-2 rounded text-sm text-amber-100/70 border border-amber-200/20 mono">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* evidence photo lightbox / gallery */}
      {lightboxTaskId &&
        (() => {
          const lt = tasks.find((t) => t.id === lightboxTaskId);
          const images = lt?.images || [];
          if (!lt || images.length === 0) return null;
          const idx = Math.min(lightboxIndex, images.length - 1);
          const img = images[idx];
          const go = (delta) => setLightboxIndex((i) => (i + delta + images.length) % images.length);
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              style={{ background: "rgba(0,0,0,0.8)" }}
              onClick={() => setLightboxTaskId(null)}
            >
              <div className="max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
                <div className="bg-white p-3 pb-3 rounded-sm" style={{ transform: "rotate(-1.5deg)", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
                  <div className="relative">
                    <img src={img.src} alt={lt.title} className="w-full rounded-[1px] object-cover" />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => go(-1)}
                          className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={() => go(1)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  <p className="typewriter text-center text-sm mt-3" style={{ color: "#2b2013" }}>
                    {lt.title}
                  </p>
                  <input
                    value={img.caption}
                    onChange={(e) => updateImageCaption(lt.id, img.id, e.target.value)}
                    placeholder="add a caption... (e.g. 'last seen Tuesday')"
                    className="w-full mt-2 text-xs mono px-2 py-1 rounded border border-black/10 outline-none"
                    style={{ color: "#2b2013", background: "rgba(0,0,0,0.04)" }}
                  />
                  {images.length > 1 && (
                    <p className="text-center text-[10px] mono mt-1" style={{ color: "#8a7350" }}>
                      photo {idx + 1} of {images.length}
                    </p>
                  )}
                </div>
                <div className="flex justify-center gap-3 mt-4">
                  <button
                    onClick={() => {
                      removeImage(lightboxTaskId, img.id);
                      setLightboxIndex(0);
                      if (images.length <= 1) setLightboxTaskId(null);
                    }}
                    className="px-3 py-1.5 rounded text-xs mono text-red-200 border border-red-400/40"
                    style={{ background: "rgba(127,29,29,0.4)" }}
                  >
                    Remove this photo
                  </button>
                  <button
                    onClick={() => triggerImageUpload(lightboxTaskId)}
                    className="px-3 py-1.5 rounded text-xs mono text-amber-50 border border-amber-200/30 flex items-center gap-1"
                    style={{ background: "rgba(0,0,0,0.4)" }}
                  >
                    <Camera size={12} /> Add another
                  </button>
                  <button
                    onClick={() => setLightboxTaskId(null)}
                    className="px-3 py-1.5 rounded text-xs mono text-amber-50 border border-amber-200/30"
                    style={{ background: "rgba(0,0,0,0.4)" }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* header */}
      <div className="w-full max-w-6xl mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-dashed pb-4" style={{ borderColor: "#5c4a34" }}>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#7f1d1d", boxShadow: "inset 0 0 0 2px #450a0a" }}>
                <Pin size={18} className="text-red-100" />
              </div>
              <h1 className="typewriter text-3xl sm:text-4xl tracking-wide text-amber-50">THE CASE BOARD</h1>
            </div>
            <p className="text-amber-200/60 text-sm mt-1 ml-1">
              Every task is a lead. Pin it, work it, close it — or string it together.
            </p>
          </div>
          <div className="text-right mono text-amber-200/70 text-xs sm:text-sm leading-relaxed">
            <div className="border border-amber-200/20 px-3 py-1.5 rounded" style={{ background: "rgba(0,0,0,0.25)" }}>
              <div className="text-amber-400/80 tracking-widest">CASE FILE</div>
              <div className="text-amber-50 text-sm">{caseNo}</div>
            </div>
            <div className="text-[9px] text-amber-200/30 mt-1 uppercase tracking-wider">
              synced via {backendMode}
            </div>
          </div>
        </div>

        {/* overall case progress */}
        {totalCount > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] mono text-amber-200/50 mb-1">
              <span>
                {closedCount} of {totalCount} leads closed
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden border border-amber-200/10" style={{ background: "rgba(0,0,0,0.3)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: "#b45309" }} />
            </div>
          </div>
        )}

        {/* stats + toolbar */}
        {/* stats strip */}
        <div className="flex flex-wrap gap-2 text-xs mono mt-4">
          <div className="px-3 py-1.5 rounded border border-amber-200/15 text-amber-100/80" style={{ background: "rgba(0,0,0,0.2)" }}>
            OPEN <span className="text-red-400 font-bold">{openCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded border border-amber-200/15 text-amber-100/80" style={{ background: "rgba(0,0,0,0.2)" }}>
            CLOSED <span className="text-emerald-400 font-bold">{closedCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded border border-amber-200/15 text-amber-100/80" style={{ background: "rgba(0,0,0,0.2)" }}>
            THREADS <span className="text-amber-300 font-bold">{connections.length}</span>
          </div>
          {overdue.length > 0 && (
            <div className="px-3 py-1.5 rounded border border-red-400/30 text-red-300 flex items-center gap-1" style={{ background: "rgba(127,29,29,0.25)" }}>
              <AlertTriangle size={12} /> {overdue.length} OVERDUE
            </div>
          )}
          <div className="px-3 py-1.5 rounded border border-amber-200/15 text-amber-100/80 flex items-center gap-1" style={{ background: "rgba(0,0,0,0.2)" }}>
            <Award size={12} className="text-amber-300" /> {rank}
          </div>
        </div>

        {/* action toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          {/* left cluster: utility icons + search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded border border-amber-200/15 overflow-hidden">
              <button
                onClick={() => setSoundOn((s) => !s)}
                title={soundOn ? "Mute sound effects" : "Enable sound effects"}
                className="p-1.5 text-amber-100/70 hover:text-amber-50 transition"
                style={{ background: "rgba(0,0,0,0.2)" }}
              >
                {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
              <button
                onClick={() => (notifyEnabled ? setNotifyEnabled(false) : enableNotifications())}
                title={notifyEnabled ? "Disable due-date alerts" : "Enable browser alerts for overdue/due-soon leads"}
                className="p-1.5 text-amber-100/70 hover:text-amber-50 transition border-l border-amber-200/15"
                style={{ background: notifyEnabled ? "rgba(185,28,28,0.25)" : "rgba(0,0,0,0.2)" }}
              >
                {notifyEnabled ? <Bell size={14} /> : <BellOff size={14} />}
              </button>
              <button
                onClick={resetBoard}
                title="Reset board"
                className="p-1.5 text-amber-100/70 hover:text-amber-50 transition border-l border-amber-200/15"
                style={{ background: "rgba(0,0,0,0.2)" }}
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={undo}
                title="Undo last change (Ctrl/Cmd+Z)"
                className="p-1.5 text-amber-100/70 hover:text-amber-50 transition border-l border-amber-200/15"
                style={{ background: "rgba(0,0,0,0.2)" }}
              >
                <Undo2 size={13} />
              </button>
              <button
                onClick={exportBoardJSON}
                title="Export board as JSON"
                className="p-1.5 text-amber-100/70 hover:text-amber-50 transition border-l border-amber-200/15"
                style={{ background: "rgba(0,0,0,0.2)" }}
              >
                <Download size={13} />
              </button>
              <button
                onClick={() => setImportOpen(true)}
                title="Import board from JSON"
                className="p-1.5 text-amber-100/70 hover:text-amber-50 transition border-l border-amber-200/15"
                style={{ background: "rgba(0,0,0,0.2)" }}
              >
                <Upload size={13} />
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-200/40" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search leads & notes... (/)"
                className="pl-8 pr-3 py-1.5 rounded text-xs mono text-amber-50 placeholder-amber-200/30 outline-none border border-amber-200/15 focus:border-amber-400/40 w-44"
                style={{ background: "rgba(0,0,0,0.25)" }}
              />
            </div>
          </div>

          {/* right cluster: view switcher · mode toggles · primary action */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded overflow-hidden border border-amber-200/15">
              <button
                onClick={() => setView("board")}
                title="Board view"
                className="px-2.5 py-1.5 flex items-center gap-1 text-xs mono transition"
                style={{
                  background: view === "board" ? "#b91c1c" : "rgba(0,0,0,0.2)",
                  color: view === "board" ? "#fff7ed" : "rgba(253,230,138,0.8)",
                }}
              >
                <LayoutGrid size={13} /> Board
              </button>
              <button
                onClick={() => setView("list")}
                title="List view"
                className="px-2.5 py-1.5 flex items-center gap-1 text-xs mono transition border-l border-amber-200/15"
                style={{
                  background: view === "list" ? "#b91c1c" : "rgba(0,0,0,0.2)",
                  color: view === "list" ? "#fff7ed" : "rgba(253,230,138,0.8)",
                }}
              >
                <Table2 size={13} /> List
              </button>
              <button
                onClick={() => setView("map")}
                title="Map view"
                className="px-2.5 py-1.5 flex items-center gap-1 text-xs mono transition border-l border-amber-200/15"
                style={{
                  background: view === "map" ? "#b91c1c" : "rgba(0,0,0,0.2)",
                  color: view === "map" ? "#fff7ed" : "rgba(253,230,138,0.8)",
                }}
              >
                <MapPin size={13} /> Map
              </button>
              <button
                onClick={() => setView("review")}
                title="Weekly / monthly review"
                className="px-2.5 py-1.5 flex items-center gap-1 text-xs mono transition border-l border-amber-200/15"
                style={{
                  background: view === "review" ? "#b91c1c" : "rgba(0,0,0,0.2)",
                  color: view === "review" ? "#fff7ed" : "rgba(253,230,138,0.8)",
                }}
              >
                <BarChart3 size={13} /> Review
              </button>
            </div>

            <span className="w-px h-6 bg-amber-200/10" />

            <button
              onClick={() => {
                setLinkMode((s) => !s);
                setLinkFirst(null);
              }}
              className={`px-3 py-1.5 rounded text-xs mono border flex items-center gap-1.5 transition ${
                linkMode ? "text-red-50 border-red-400/60" : "text-amber-100/80 border-amber-200/15 hover:text-amber-50"
              }`}
              style={{ background: linkMode ? "#7f1d1d" : "rgba(0,0,0,0.2)" }}
            >
              <Link2 size={13} />
              {linkMode ? (linkFirst ? "Pick lead #2" : "Link mode: pick lead #1") : "Connect leads"}
            </button>

            <span className="w-px h-6 bg-amber-200/10" />

            <button
              onClick={() => setFormOpen((s) => !s)}
              className="px-3 py-1.5 rounded text-xs mono font-bold flex items-center gap-1.5 text-amber-50 border border-red-400/40 hover:brightness-110 transition"
              style={{ background: "#b91c1c" }}
            >
              <Plus size={14} /> New evidence
            </button>
          </div>
        </div>

        {/* add form */}
        {formOpen && (
          <div className="mt-3 p-4 rounded-md border border-amber-200/15 flex flex-wrap gap-3 items-end" style={{ background: "rgba(0,0,0,0.3)" }}>
            {templates.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] mono text-amber-200/50 uppercase tracking-wider">Start from template</label>
                <div className="flex items-center gap-1">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="px-2.5 py-1.5 rounded text-sm text-amber-50 outline-none border border-amber-200/15 focus:border-amber-400/40"
                    style={{ background: "rgba(0,0,0,0.3)" }}
                  >
                    <option value="">None</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                  {selectedTemplateId && (
                    <button
                      onClick={() => {
                        deleteTemplate(selectedTemplateId);
                        setSelectedTemplateId("");
                      }}
                      title="Delete this template"
                      className="p-1.5 rounded border border-amber-200/15 text-red-400 hover:text-red-300"
                      style={{ background: "rgba(0,0,0,0.2)" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] mono text-amber-200/50 uppercase tracking-wider">Lead / task</label>
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                  else if (soundOn && e.key.length === 1) playClick(900 + Math.random() * 200, 0.02, 0.025);
                }}
                placeholder="e.g. Finish the Henderson file"
                className="px-2.5 py-1.5 rounded text-sm text-amber-50 placeholder-amber-200/30 outline-none border border-amber-200/15 focus:border-amber-400/40 w-64"
                style={{ background: "rgba(0,0,0,0.3)", caretColor: "#b91c1c" }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] mono text-amber-200/50 uppercase tracking-wider">Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="WORK"
                className="px-2.5 py-1.5 rounded text-sm text-amber-50 placeholder-amber-200/30 outline-none border border-amber-200/15 focus:border-amber-400/40 w-32"
                style={{ background: "rgba(0,0,0,0.3)" }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] mono text-amber-200/50 uppercase tracking-wider">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="px-2.5 py-1.5 rounded text-sm text-amber-50 outline-none border border-amber-200/15 focus:border-amber-400/40"
                style={{ background: "rgba(0,0,0,0.3)" }}
              >
                <option value="urgent">Urgent</option>
                <option value="active">Active</option>
                <option value="cold">Cold case</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] mono text-amber-200/50 uppercase tracking-wider">Due (optional)</label>
              <input
                type="datetime-local"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="px-2.5 py-1.5 rounded text-sm text-amber-50 outline-none border border-amber-200/15 focus:border-amber-400/40"
                style={{ background: "rgba(0,0,0,0.3)" }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] mono text-amber-200/50 uppercase tracking-wider">Repeats</label>
              <select
                value={form.recurrence}
                onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))}
                className="px-2.5 py-1.5 rounded text-sm text-amber-50 outline-none border border-amber-200/15 focus:border-amber-400/40"
                style={{ background: "rgba(0,0,0,0.3)" }}
              >
                <option value="none">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] mono text-amber-200/50 uppercase tracking-wider">Evidence photos (optional)</label>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => triggerImageUpload("form")}
                  className="px-2.5 py-1.5 rounded text-xs mono border border-amber-200/15 text-amber-100/80 hover:text-amber-50 transition flex items-center gap-1"
                  style={{ background: "rgba(0,0,0,0.3)" }}
                >
                  <Camera size={12} /> Attach
                </button>
                {(form.images || []).map((im) => (
                  <div key={im.id} className="relative">
                    <img src={im.src} alt="" className="w-8 h-8 object-cover rounded border border-amber-200/30" />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, images: f.images.filter((x) => x.id !== im.id) }))}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-700 text-white text-[8px] flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={addTask} className="px-4 py-1.5 rounded text-sm font-bold text-amber-50 border border-red-400/40" style={{ background: "#b91c1c" }}>
              Pin it
            </button>
          </div>
        )}
        {/* filters + thread-color panels */}
        <div className="flex flex-wrap gap-3 mt-3">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded border border-amber-200/10" style={{ background: "rgba(0,0,0,0.15)" }}>
            <span className="text-[9px] mono text-amber-200/40 uppercase tracking-wider">Filter</span>
            {Object.entries(PRIORITY).map(([key, p]) => {
              const active = priorityFilter.has(key);
              return (
                <button
                  key={key}
                  onClick={() => togglePriorityFilter(key)}
                  className="text-[10px] mono font-bold px-2 py-1 rounded transition"
                  style={{
                    background: active ? p.color : "rgba(0,0,0,0.2)",
                    color: active ? "#fff" : "rgba(253,230,138,0.4)",
                    border: `1px solid ${active ? p.color : "rgba(253,230,138,0.15)"}`,
                  }}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              onClick={() => setOverdueOnly((s) => !s)}
              className="text-[10px] mono font-bold px-2 py-1 rounded transition flex items-center gap-1"
              style={{
                background: overdueOnly ? "#7f1d1d" : "rgba(0,0,0,0.2)",
                color: overdueOnly ? "#fff" : "rgba(253,230,138,0.4)",
                border: `1px solid ${overdueOnly ? "#b91c1c" : "rgba(253,230,138,0.15)"}`,
              }}
            >
              <AlertTriangle size={10} /> OVERDUE ONLY
            </button>
            <span className="w-px h-4 bg-amber-200/10" />
            <button
              onClick={() => setShowClosed((s) => !s)}
              className="text-[10px] mono font-bold px-2 py-1 rounded transition"
              style={{
                background: showClosed ? "rgba(0,0,0,0.2)" : "rgba(185,28,28,0.2)",
                color: showClosed ? "rgba(253,230,138,0.4)" : "#fff",
                border: `1px solid ${showClosed ? "rgba(253,230,138,0.15)" : "#b91c1c"}`,
              }}
            >
              {showClosed ? "SHOWING CLOSED" : "CLOSED HIDDEN"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded border border-amber-200/10" style={{ background: "rgba(0,0,0,0.15)" }}>
            <span className="text-[9px] mono text-amber-200/40 uppercase tracking-wider">Next thread</span>
            {THREAD_COLOR_ORDER.map((key) => {
              const tc = THREAD_COLORS[key];
              const active = nextThreadColor === key;
              return (
                <button
                  key={key}
                  onClick={() => setNextThreadColor(key)}
                  title={tc.label}
                  className="text-[10px] mono px-2 py-1 rounded transition flex items-center gap-1"
                  style={{
                    background: active ? tc.hex : "rgba(0,0,0,0.2)",
                    color: active ? "#fff" : "rgba(253,230,138,0.5)",
                    border: `1px solid ${active ? tc.hex : "rgba(253,230,138,0.15)"}`,
                  }}
                >
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: active ? "#fff" : tc.hex }} />
                  {tc.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* list view */}
      {view === "list" && (
        <div
          className="w-full max-w-6xl rounded-md border border-amber-200/15 overflow-hidden mb-4"
          style={{ background: "rgba(0,0,0,0.25)" }}
        >
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-amber-200/15 text-[10px] mono uppercase tracking-wider text-amber-200/50">
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2 cursor-pointer select-none" onClick={() => toggleSort("title")}>
                  <span className="flex items-center gap-1">Lead <SortIcon column="title" /></span>
                </th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 cursor-pointer select-none" onClick={() => toggleSort("priority")}>
                  <span className="flex items-center gap-1">Priority <SortIcon column="priority" /></span>
                </th>
                <th className="px-3 py-2 cursor-pointer select-none" onClick={() => toggleSort("due")}>
                  <span className="flex items-center gap-1">Due <SortIcon column="due" /></span>
                </th>
                <th className="px-3 py-2">Clues</th>
                <th className="px-3 py-2 cursor-pointer select-none" onClick={() => toggleSort("status")}>
                  <span className="flex items-center gap-1">Status <SortIcon column="status" /></span>
                </th>
                <th className="px-3 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((t) => {
                const p = PRIORITY[t.priority];
                const closed = t.status === "closed";
                const isOverdue = !closed && t.dueDate && new Date(t.dueDate) < today;
                const subDone = (t.subtasks || []).filter((s) => s.done).length;
                const subTotal = (t.subtasks || []).length;
                return (
                  <tr key={t.id} className="border-b border-amber-200/10 hover:bg-white/5 transition">
                    <td className="px-3 py-2">
                      <button onClick={() => toggleStatus(t.id)} title={closed ? "Reopen" : "Close case"}>
                        <CheckCircle2 size={15} color={closed ? "#15803d" : "rgba(253,230,138,0.3)"} />
                      </button>
                    </td>
                    <td className="px-3 py-2 typewriter text-sm text-amber-50" style={{ textDecoration: closed ? "line-through" : "none", opacity: closed ? 0.5 : 1 }}>
                      <span className="flex items-center gap-2">
                        {t.images && t.images.length > 0 ? (
                          <img
                            src={t.images[0].src}
                            alt=""
                            onClick={() => {
                              setLightboxTaskId(t.id);
                              setLightboxIndex(0);
                            }}
                            className="w-6 h-6 object-cover rounded-sm border border-amber-200/30 cursor-pointer"
                          />
                        ) : (
                          <span className="w-6 h-6 rounded-sm border border-dashed border-amber-200/15 flex-shrink-0" />
                        )}
                        <span onClick={() => setOpenTaskId(t.id)} className="cursor-pointer hover:underline">
                          {t.title}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 mono text-[11px] text-amber-200/60">{t.category}</td>
                    <td className="px-3 py-2">
                      <span className="text-[9px] mono font-bold px-1.5 py-0.5 rounded" style={{ background: p.color, color: "#fff" }}>
                        {p.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 mono text-[11px]" style={{ color: isOverdue ? "#f87171" : "rgba(253,230,138,0.6)" }}>
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString([], { month: "short", day: "numeric" }) : "—"}
                      {isOverdue ? " ⚠" : ""}
                    </td>
                    <td className="px-3 py-2 mono text-[11px] text-amber-200/60">{subTotal ? `${subDone}/${subTotal}` : "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className="text-[9px] mono font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: closed ? "rgba(21,128,61,0.2)" : "rgba(185,28,28,0.2)",
                          color: closed ? "#4ade80" : "#f87171",
                        }}
                      >
                        {closed ? "CLOSED" : "OPEN"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => deleteTask(t.id)} title="Remove">
                        <Trash2 size={13} color="#b91c1c" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sortedTasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center typewriter text-amber-100/40 text-sm">
                    No leads match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* board */}
      {view === "board" && (
      <div
        ref={boardRef}
        className="cork-texture relative w-full max-w-6xl rounded-md border-4 overflow-hidden select-none"
        style={{
          height: BOARD_H,
          background: "#7a5c3a",
          borderColor: "#4a3620",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.5)",
          touchAction: "none",
        }}
      >
        {allClosed && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div
              className="stamp-anim typewriter font-bold"
              style={{
                color: "rgba(153,27,27,0.8)",
                border: "6px solid rgba(153,27,27,0.8)",
                borderRadius: 10,
                padding: "10px 32px",
                fontSize: "clamp(24px, 5vw, 48px)",
                transform: "rotate(-10deg)",
                letterSpacing: "6px",
              }}
            >
              CASE CLOSED
            </div>
          </div>
        )}

        {/* string svg overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
          {connections.map((c) => {
            const a = tasks.find((t) => t.id === c.a);
            const b = tasks.find((t) => t.id === c.b);
            if (!a || !b) return null;
            if (!visibleIds.has(a.id) || !visibleIds.has(b.id)) return null;
            // hide a connection's own strand while one of its ends is being dragged
            if (draftString?.mode === "reroute" && draftString.connId === c.id) return null;
            const p1 = pinPoint(a);
            const p2 = pinPoint(b);
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2 + Math.min(60, Math.abs(p1.x - p2.x) * 0.15 + 20);
            const d = `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`;
            const colorKey = c.color && THREAD_COLORS[c.color] ? c.color : "blocking";
            const hex = THREAD_COLORS[colorKey].hex;
            // point on the quadratic curve at t=0.5, for the color-cycle handle
            const curveX = 0.25 * p1.x + 0.5 * mx + 0.25 * p2.x;
            const curveY = 0.25 * p1.y + 0.5 * my + 0.25 * p2.y;
            return (
              <g key={c.id}>
                <path d={d} fill="none" stroke={hex} strokeWidth="6" opacity="0" style={{ pointerEvents: "stroke", cursor: "pointer" }} onClick={() => removeConnection(c.id)} />
                <path d={d} fill="none" stroke={hex} strokeWidth="2" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))", pointerEvents: "none" }} />
                {/* midpoint handle — click to cycle what this thread means */}
                <circle
                  cx={curveX}
                  cy={curveY}
                  r={4}
                  fill={hex}
                  stroke="#fff"
                  strokeWidth="1"
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleThreadColor(c.id);
                  }}
                >
                  <title>{THREAD_COLORS[colorKey].label} — click to change</title>
                </circle>
                {/* draggable end-handles: pull one off to release the thread, or drop it on another lead to re-route it */}
                <circle
                  cx={p1.x}
                  cy={p1.y}
                  r={5}
                  fill="#450a0a"
                  stroke="#fca5a5"
                  strokeWidth="1"
                  style={{ pointerEvents: "auto", cursor: "grab", touchAction: "none" }}
                  onPointerDown={(e) => beginReroute(e, c.id, "a", c.b)}
                  onPointerMove={onDraftPointerMove}
                  onPointerUp={onDraftPointerUp}
                  onClick={(e) => e.stopPropagation()}
                >
                  <title>Drag to release or re-pin this end of the thread</title>
                </circle>
                <circle
                  cx={p2.x}
                  cy={p2.y}
                  r={5}
                  fill="#450a0a"
                  stroke="#fca5a5"
                  strokeWidth="1"
                  style={{ pointerEvents: "auto", cursor: "grab", touchAction: "none" }}
                  onPointerDown={(e) => beginReroute(e, c.id, "b", c.a)}
                  onPointerMove={onDraftPointerMove}
                  onPointerUp={onDraftPointerUp}
                  onClick={(e) => e.stopPropagation()}
                >
                  <title>Drag to release or re-pin this end of the thread</title>
                </circle>
              </g>
            );
          })}

          {/* live thread following the cursor while dragging */}
          {draftString &&
            (() => {
              const anchorTask = tasks.find(
                (t) => t.id === (draftString.mode === "new" ? draftString.fromId : draftString.anchorId)
              );
              if (!anchorTask) return null;
              const p1 = pinPoint(anchorTask);
              const d = `M ${p1.x} ${p1.y} L ${draftString.x} ${draftString.y}`;
              return (
                <path
                  d={d}
                  fill="none"
                  stroke={draftString.hoverId ? "#22c55e" : "#fbbf24"}
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  style={{ pointerEvents: "none" }}
                />
              );
            })()}
        </svg>

        {draftString && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded text-xs mono text-amber-50 z-20" style={{ background: "rgba(0,0,0,0.75)" }}>
            {draftString.hoverId ? "Release to pin the thread here" : "Drop on empty board to release this thread"}
          </div>
        )}

        {linkMode && !draftString && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded text-xs mono text-amber-50 z-20" style={{ background: "rgba(127,29,29,0.85)" }}>
            Click two leads to string them together. Click a red thread to cut it.
          </div>
        )}

        {/* cards */}
        {visibleTasks.map((t) => {
          const p = PRIORITY[t.priority];
          const selected = linkFirst === t.id;
          const closed = t.status === "closed";
          const expanded = expandedId === t.id;
          const daysSince = (Date.now() - (t.updatedAt || Date.now())) / 86400000;
          const isCold = !closed && daysSince >= COLD_DAYS;
          const isOverdue = !closed && t.dueDate && new Date(t.dueDate) < today;
          const subDone = (t.subtasks || []).filter((s) => s.done).length;
          const subTotal = (t.subtasks || []).length;
          const gcal = gcalLink(t);

          return (
            <div
              key={t.id}
              onPointerDown={(e) => onPointerDownCard(e, t.id)}
              onClick={() => cardClick(t.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleCardDrop(e, t.id)}
              className="absolute rounded-sm shadow-lg"
              style={{
                left: t.x,
                top: t.y,
                width: CARD_W,
                minHeight: CARD_H,
                background: "#efe4c8",
                transform: `rotate(${t.rot}deg)`,
                filter: isCold ? "grayscale(0.5) brightness(0.9)" : "none",
                boxShadow: selected
                  ? "0 0 0 3px #fbbf24, 0 8px 16px rgba(0,0,0,0.45)"
                  : draftString && draftString.hoverId === t.id
                  ? "0 0 0 3px #22c55e, 0 8px 16px rgba(0,0,0,0.45)"
                  : "0 6px 14px rgba(0,0,0,0.4)",
                cursor: linkMode ? "pointer" : dragging?.id === t.id ? "grabbing" : "grab",
                zIndex: expanded ? 40 : dragging?.id === t.id ? 30 : 10,
                touchAction: "none",
              }}
            >
              <div
                onPointerDown={(e) => beginNewString(e, t.id)}
                onPointerMove={onDraftPointerMove}
                onPointerUp={onDraftPointerUp}
                onClick={(e) => e.stopPropagation()}
                title="Drag out a thread to connect this lead to another"
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full z-20 hover:scale-125 transition-transform"
                style={{
                  background: t.pin,
                  boxShadow: "0 2px 3px rgba(0,0,0,0.6), inset 0 -1px 2px rgba(0,0,0,0.3)",
                  cursor: "crosshair",
                  touchAction: "none",
                }}
              />

              {t.images && t.images.length > 0 && (
                <div className="absolute -top-3 -right-3 z-30" style={{ transform: "rotate(6deg)" }}>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxTaskId(t.id);
                      setLightboxIndex(0);
                    }}
                    title="View photos"
                    className="block p-1 bg-white rounded-sm relative"
                    style={{ boxShadow: "0 3px 6px rgba(0,0,0,0.45)" }}
                  >
                    <img src={t.images[0].src} alt="" className="w-9 h-9 object-cover rounded-[1px]" />
                    {t.images.length > 1 && (
                      <span
                        className="absolute -bottom-1 -right-1 text-[8px] mono font-bold text-white rounded-full w-4 h-4 flex items-center justify-center"
                        style={{ background: "#7f1d1d" }}
                      >
                        +{t.images.length - 1}
                      </span>
                    )}
                  </button>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(t.id, t.images[0].id);
                    }}
                    title="Remove cover photo"
                    className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-red-700 text-white text-[9px] flex items-center justify-center"
                    style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="p-3 pt-4 flex flex-col relative overflow-hidden" style={{ minHeight: CARD_H }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="mono text-[9px] tracking-widest px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.08)", color: "#57452c" }}>
                    {t.category}
                  </div>
                  {isCold && (
                    <div className="mono text-[8px] tracking-widest px-1.5 py-0.5 rounded" style={{ background: "rgba(29,78,216,0.15)", color: "#1d4ed8" }}>
                      DUSTY
                    </div>
                  )}
                  {t.recurrence && t.recurrence !== "none" && (
                    <div className="mono text-[8px] tracking-widest px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ background: "rgba(202,138,4,0.15)", color: "#ca8a04" }}>
                      <Repeat size={8} /> {t.recurrence.toUpperCase()}
                    </div>
                  )}
                </div>

                <p className="typewriter text-[13px] leading-snug" style={{ color: "#2b2013", textDecoration: closed ? "line-through" : "none", opacity: closed ? 0.55 : 1 }}>
                  {t.title}
                </p>

                {t.dueDate && (
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar size={10} color={isOverdue ? "#b91c1c" : "#57452c"} />
                    <span className="text-[9px] mono" style={{ color: isOverdue ? "#b91c1c" : "#57452c" }}>
                      {new Date(t.dueDate).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {isOverdue ? " · OVERDUE" : ""}
                    </span>
                  </div>
                )}

                {subTotal > 0 && (
                  <div className="mt-1.5">
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.12)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(subDone / subTotal) * 100}%`, background: "#b45309" }} />
                    </div>
                    <span className="text-[8px] mono" style={{ color: "#57452c" }}>
                      {subDone}/{subTotal} clues found
                    </span>
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-[9px] mono font-bold tracking-wider px-1.5 py-0.5 rounded" style={{ color: "#fff", background: p.color, opacity: closed ? 0.5 : 1 }}>
                    {p.label}
                  </span>

                  {!linkMode && (
                    <div className="flex items-center gap-1">
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTaskId(t.id);
                        }}
                        title="Open case file"
                        className="p-1 rounded hover:bg-black/10 transition"
                      >
                        <FileText size={13} color={t.blocks && t.blocks.length > 0 ? "#b91c1c" : "#57452c"} />
                      </button>
                      {!closed && (
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            startFocusTimer(t.id, t.title, 25);
                          }}
                          title="Start a focus timer for this lead"
                          className="p-1 rounded hover:bg-black/10 transition"
                        >
                          <Timer size={13} color={focusTimer?.taskId === t.id ? "#b91c1c" : "#57452c"} />
                        </button>
                      )}
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerImageUpload(t.id);
                        }}
                        title={t.images && t.images.length > 0 ? "Add another photo" : "Attach photo"}
                        className="p-1 rounded hover:bg-black/10 transition"
                      >
                        <Camera size={13} color="#57452c" />
                      </button>
                      {gcal && (
                        <a
                          href={gcal}
                          target="_blank"
                          rel="noopener noreferrer"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          title="Add to Google Calendar"
                          className="p-1 rounded hover:bg-black/10 transition"
                        >
                          <Calendar size={13} color="#57452c" />
                        </a>
                      )}
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(expanded ? null : t.id);
                        }}
                        title="Clues / subtasks"
                        className="p-1 rounded hover:bg-black/10 transition"
                      >
                        {expanded ? <ChevronUp size={13} color="#57452c" /> : <ListChecks size={13} color="#57452c" />}
                      </button>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatus(t.id);
                        }}
                        title={closed ? "Reopen" : "Close case"}
                        className="p-1 rounded hover:bg-black/10 transition"
                      >
                        <CheckCircle2 size={14} color={closed ? "#15803d" : "#57452c"} />
                      </button>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(t.id);
                        }}
                        title="Remove pin"
                        className="p-1 rounded hover:bg-black/10 transition"
                      >
                        <Trash2 size={13} color="#7f1d1d" />
                      </button>
                    </div>
                  )}
                </div>

                {expanded && (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 pt-2 border-t"
                    style={{ borderColor: "rgba(0,0,0,0.1)" }}
                  >
                    {(t.subtasks || []).map((s) => (
                      <div key={s.id} className="flex items-center gap-1.5 mb-1">
                        <input type="checkbox" checked={s.done} onChange={() => toggleSubtask(t.id, s.id)} className="w-3 h-3" />
                        <span className="text-[11px] flex-1" style={{ color: "#2b2013", textDecoration: s.done ? "line-through" : "none", opacity: s.done ? 0.5 : 1 }}>
                          {s.text}
                        </span>
                        <button onClick={() => deleteSubtask(t.id, s.id)} className="text-[10px]" style={{ color: "#7f1d1d" }}>
                          ×
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-1 mt-1">
                      <input
                        value={subtaskDraft[t.id] || ""}
                        onChange={(e) => setSubtaskDraft((d) => ({ ...d, [t.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addSubtask(t.id)}
                        placeholder="add a clue..."
                        className="flex-1 text-[11px] px-1.5 py-1 rounded outline-none"
                        style={{ background: "rgba(0,0,0,0.06)", color: "#2b2013" }}
                      />
                      <button onClick={() => addSubtask(t.id)} className="px-1.5 rounded text-[11px]" style={{ background: "rgba(0,0,0,0.1)", color: "#2b2013" }}>
                        +
                      </button>
                    </div>
                  </div>
                )}

                {closed && (
                  <div
                    className="stamp-anim absolute typewriter font-bold text-lg pointer-events-none"
                    style={{ color: "rgba(153,27,27,0.75)", border: "3px solid rgba(153,27,27,0.75)", borderRadius: 6, padding: "1px 10px", top: "38%", left: "12%", transform: "rotate(-14deg)", letterSpacing: "2px" }}
                  >
                    CLOSED
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {visibleTasks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="typewriter text-amber-100/50 text-sm">No leads on the board. Pin some evidence to get started.</p>
          </div>
        )}
      </div>
      )}

      {/* ---------- map view ---------- */}
      {view === "map" && (
        <div className="w-full max-w-6xl flex flex-col md:flex-row gap-4">
          <div className="md:w-56 flex-shrink-0">
            <h3 className="typewriter text-sm text-amber-50 mb-2">Unplaced leads</h3>
            <div className="flex flex-col gap-2">
              {tasksWithoutLocation.length === 0 && (
                <p className="text-amber-200/40 text-xs mono">Every lead has a location pinned.</p>
              )}
              {tasksWithoutLocation.map((t) => (
                <div
                  key={t.id}
                  onPointerDown={(e) => beginCarryTask(e, t.id, t.title, true)}
                  onPointerMove={onMapDragPointerMove}
                  onPointerUp={onMapDragPointerUp}
                  onClick={() => setPlacingTaskId(placingTaskId === t.id ? null : t.id)}
                  className="px-2.5 py-2 rounded text-xs mono cursor-grab border transition"
                  style={{
                    background: placingTaskId === t.id ? "rgba(185,28,28,0.25)" : "rgba(0,0,0,0.25)",
                    borderColor: placingTaskId === t.id ? "#b91c1c" : "rgba(253,230,138,0.15)",
                    color: "rgba(253,230,138,0.85)",
                    touchAction: "none",
                  }}
                  title="Drag onto the map, or tap then tap a spot on the map"
                >
                  {placingTaskId === t.id ? "Tap the map to place..." : t.title}
                </div>
              ))}
            </div>
            <p className="text-[10px] mono text-amber-200/30 mt-3">
              drag a lead onto the map, or tap one then tap a spot · drag a pin to move it · click a pin for details
            </p>
          </div>

          <div
            ref={mapRef}
            onClick={handleMapClick}
            className="relative flex-1 rounded-md border-4 overflow-hidden"
            style={{
              width: "100%",
              height: MAP_H,
              background:
                "repeating-linear-gradient(0deg, #d8c9a0 0, #d8c9a0 78px, #c7b78e 78px, #c7b78e 80px), repeating-linear-gradient(90deg, transparent 0, transparent 78px, rgba(0,0,0,0.06) 78px, rgba(0,0,0,0.06) 80px)",
              borderColor: "#4a3620",
              borderStyle: "dashed",
              cursor: placingTaskId ? "crosshair" : "default",
              boxShadow: "inset 0 0 60px rgba(0,0,0,0.25)",
              touchAction: "none",
            }}
          >
            <div className="absolute top-2 left-2 flex items-center gap-1 mono text-[10px] px-2 py-1 rounded" style={{ background: "rgba(0,0,0,0.5)", color: "#fde68a" }}>
              <Compass size={12} /> SURVEILLANCE AREA
            </div>

            {tasksWithLocation.map((t) => {
              const p = PRIORITY[t.priority];
              const isBeingCarried = mapDrag && mapDrag.taskId === t.id;
              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => beginCarryTask(e, t.id, t.title, false)}
                  onPointerMove={onMapDragPointerMove}
                  onPointerUp={onMapDragPointerUp}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!mapDrag) setMapPopoverTaskId(mapPopoverTaskId === t.id ? null : t.id);
                  }}
                  className="absolute cursor-grab"
                  style={{
                    left: t.location.x - 10,
                    top: t.location.y - 20,
                    zIndex: mapPopoverTaskId === t.id ? 30 : 10,
                    opacity: isBeingCarried ? 0.25 : 1,
                    touchAction: "none",
                  }}
                  title={t.location.label || t.title}
                >
                  <MapPin size={22} color={p.color} fill={p.color} strokeWidth={1.5} style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.5))" }} />
                </div>
              );
            })}

            {/* live ghost pin following the cursor/finger while carrying a lead */}
            {mapDrag && mapDrag.overMap && mapDrag.x !== null && (
              <div className="absolute pointer-events-none" style={{ left: mapDrag.x - 10, top: mapDrag.y - 20, zIndex: 50 }}>
                <MapPin size={24} color="#22c55e" fill="#22c55e" strokeWidth={1.5} style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.6))" }} />
                <div
                  className="mono text-[9px] px-1.5 py-0.5 rounded mt-1 whitespace-nowrap"
                  style={{ background: "rgba(0,0,0,0.75)", color: "#fde68a" }}
                >
                  {mapDrag.taskTitle}
                </div>
              </div>
            )}

            {mapPopoverTaskId &&
              (() => {
                const t = tasksWithLocation.find((tk) => tk.id === mapPopoverTaskId);
                if (!t) return null;
                return (
                  <div
                    className="absolute rounded-md p-3 w-56 z-40"
                    style={{
                      left: `min(calc(100% - 232px), ${Math.max(8, t.location.x - 100)}px)`,
                      top: `min(calc(100% - 172px), ${t.location.y + 16}px)`,
                      background: "#efe4c8",
                      boxShadow: "0 10px 24px rgba(0,0,0,0.5)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="typewriter text-xs" style={{ color: "#2b2013" }}>
                      {t.title}
                    </p>
                    <input
                      value={t.location.label}
                      onChange={(e) => updateLocationLabel(t.id, e.target.value)}
                      placeholder="location label..."
                      className="w-full mt-1.5 text-[11px] mono px-1.5 py-1 rounded border border-black/10 outline-none"
                      style={{ color: "#2b2013", background: "rgba(0,0,0,0.05)" }}
                    />
                    <div className="flex justify-between mt-2">
                      <button
                        onClick={() => removeLocation(t.id)}
                        className="text-[10px] mono text-red-800 hover:underline"
                      >
                        Remove pin
                      </button>
                      <button
                        onClick={() => setMapPopoverTaskId(null)}
                        className="text-[10px] mono"
                        style={{ color: "#57452c" }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      )}

      {/* ---------- review view ---------- */}
      {view === "review" && (
        <div className="w-full max-w-6xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="typewriter text-xl text-amber-50">CASE REVIEW</h2>
            <div className="flex rounded overflow-hidden border border-amber-200/15">
              <button
                onClick={() => setReviewRange("week")}
                className="px-3 py-1.5 text-xs mono transition"
                style={{ background: reviewRange === "week" ? "#b91c1c" : "rgba(0,0,0,0.2)", color: reviewRange === "week" ? "#fff7ed" : "rgba(253,230,138,0.8)" }}
              >
                Last 7 days
              </button>
              <button
                onClick={() => setReviewRange("month")}
                className="px-3 py-1.5 text-xs mono transition"
                style={{ background: reviewRange === "month" ? "#b91c1c" : "rgba(0,0,0,0.2)", color: reviewRange === "month" ? "#fff7ed" : "rgba(253,230,138,0.8)" }}
              >
                Last 30 days
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="p-3 rounded border border-amber-200/15" style={{ background: "rgba(0,0,0,0.25)" }}>
              <div className="text-[10px] mono text-amber-200/50 uppercase">Cases closed</div>
              <div className="typewriter text-2xl text-amber-50 mt-1">{closedInRange.length}</div>
            </div>
            <div className="p-3 rounded border border-amber-200/15" style={{ background: "rgba(0,0,0,0.25)" }}>
              <div className="text-[10px] mono text-amber-200/50 uppercase">Avg. time to close</div>
              <div className="typewriter text-2xl text-amber-50 mt-1">{avgCloseDays !== null ? `${avgCloseDays.toFixed(1)}d` : "—"}</div>
            </div>
            <div className="p-3 rounded border border-amber-200/15" style={{ background: "rgba(0,0,0,0.25)" }}>
              <div className="text-[10px] mono text-amber-200/50 uppercase">Busiest category</div>
              <div className="typewriter text-lg text-amber-50 mt-1">{busiestCategory || "—"}</div>
            </div>
            <div className="p-3 rounded border border-amber-200/15" style={{ background: "rgba(0,0,0,0.25)" }}>
              <div className="text-[10px] mono text-amber-200/50 uppercase">Focus time logged</div>
              <div className="typewriter text-2xl text-amber-50 mt-1">
                {Math.floor(totalMinutesInRange / 60)}h {totalMinutesInRange % 60}m
              </div>
            </div>
          </div>

          {categoryEntries.length > 0 && (
            <div className="mb-6">
              <h3 className="typewriter text-sm text-amber-50 mb-2">Closed by category</h3>
              <div className="flex flex-col gap-1.5">
                {categoryEntries.map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="w-24 text-[10px] mono text-amber-200/60 truncate">{cat}</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(count / maxCategoryCount) * 100}%`, background: "#b45309" }} />
                    </div>
                    <span className="w-6 text-[10px] mono text-amber-100/70 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="typewriter text-sm text-amber-50 mb-2">Closed leads this period</h3>
            {closedInRange.length === 0 ? (
              <p className="text-amber-200/40 text-xs mono">No cases closed in this period yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {closedInRange
                  .sort((a, b) => b.closedAt - a.closedAt)
                  .map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded border border-amber-200/10" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <span className="typewriter text-xs text-amber-50">{t.title}</span>
                      <span className="text-[10px] mono text-amber-200/40">{new Date(t.closedAt).toLocaleDateString()}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* floating focus timer widget */}
      {focusTimer && (
        <div
          className="fixed bottom-4 right-4 z-50 w-56 rounded-md p-3 border border-amber-200/20"
          style={{ background: "#241d15", boxShadow: "0 15px 35px rgba(0,0,0,0.6)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] mono text-amber-200/50 uppercase tracking-wider flex items-center gap-1">
              <Timer size={11} /> Focus session
            </span>
            <button onClick={cancelTimer} className="text-amber-200/40 hover:text-red-400 text-xs">
              ×
            </button>
          </div>
          <p className="typewriter text-xs text-amber-50 truncate mb-1">{focusTimer.taskTitle}</p>
          <div className="typewriter text-3xl text-center text-amber-50 my-2">{formatClock(focusTimer.remainingSec)}</div>
          <div className="flex gap-1.5 mb-2">
            {FOCUS_PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => startFocusTimer(focusTimer.taskId, focusTimer.taskTitle, m)}
                className="flex-1 text-[10px] mono py-1 rounded border border-amber-200/15 text-amber-100/70 hover:text-amber-50"
                style={{ background: "rgba(0,0,0,0.25)" }}
              >
                {m}m
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setFocusTimer((c) => (c ? { ...c, running: !c.running } : c))}
              className="flex-1 flex items-center justify-center gap-1 text-xs mono py-1.5 rounded text-amber-50 border border-amber-200/20"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              {focusTimer.running ? <Pause size={12} /> : <Play size={12} />} {focusTimer.running ? "Pause" : "Resume"}
            </button>
            <button
              onClick={stopAndLogTimer}
              className="flex items-center justify-center gap-1 text-xs mono py-1.5 px-2.5 rounded text-amber-50 border border-red-400/40"
              style={{ background: "#b91c1c" }}
            >
              <Square size={11} /> Log
            </button>
          </div>
        </div>
      )}

      {/* location label prompt for a just-placed pin */}
      {editingLocationTaskId &&
        (() => {
          const t = tasks.find((tk) => tk.id === editingLocationTaskId);
          if (!t || !t.location) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={() => setEditingLocationTaskId(null)}>
              <div className="max-w-xs w-full rounded-md p-5 border border-amber-200/20" style={{ background: "#241d15", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
                <h2 className="typewriter text-lg text-amber-50 mb-3">NAME THIS LOCATION</h2>
                <input
                  autoFocus
                  value={t.location.label}
                  onChange={(e) => updateLocationLabel(t.id, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingLocationTaskId(null)}
                  placeholder="e.g. Dentist office, Main St"
                  className="w-full px-2.5 py-1.5 rounded text-sm text-amber-50 placeholder-amber-200/30 outline-none border border-amber-200/15 focus:border-amber-400/40 mono"
                  style={{ background: "rgba(0,0,0,0.3)" }}
                />
                <button
                  onClick={() => setEditingLocationTaskId(null)}
                  className="w-full mt-4 py-2 rounded text-sm font-bold text-amber-50 border border-red-400/40 mono"
                  style={{ background: "#b91c1c" }}
                >
                  Done
                </button>
              </div>
            </div>
          );
        })()}

      <p className="text-amber-200/30 text-[11px] mono mt-4">
        drag a card to reposition · drag from a pin to string it to another lead · drag a thread's end off a card to re-pin or release it · click a thread's middle dot to change its meaning, or its line to cut it · camera icon or drag-and-drop attaches evidence photos · clues icon adds a checklist · calendar icon adds the task to Google Calendar · closing a repeating lead spawns its next occurrence · the file icon opens a task's full case-file page · press "n" for a new lead, "/" to search, Esc to close, Ctrl/Cmd+Z to undo
      </p>

      {/* block-based case file detail page */}
      {openTaskId &&
        (() => {
          const t = tasks.find((tk) => tk.id === openTaskId);
          if (!t) return null;
          return (
            <TaskDetailPage
              task={t}
              onClose={() => setOpenTaskId(null)}
              onUpdateField={(patch) => updateTaskField(t.id, patch)}
              onAddBlock={(type, afterId) => addBlock(t.id, type, afterId)}
              onUpdateBlock={(blockId, patch) => updateBlock(t.id, blockId, patch)}
              onDeleteBlock={(blockId) => deleteBlock(t.id, blockId)}
              onMoveBlock={(blockId, dir) => moveBlock(t.id, blockId, dir)}
              onTriggerImageUpload={(blockId) => triggerImageUpload(`block:${t.id}:${blockId}`)}
              onExportMarkdown={() => exportTaskMarkdown(t)}
              onSaveAsTemplate={() => setSaveTemplateOpen(true)}
            />
          );
        })()}
    </div>
  );
}

// ---------- slash-command menu ----------
function SlashMenu({ onSelect }) {
  return (
    <div
      className="absolute z-20 mt-1 top-full left-0 w-60 rounded-md border p-1"
      style={{ background: "#fff", borderColor: "rgba(0,0,0,0.15)", boxShadow: "0 10px 24px rgba(0,0,0,0.3)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {BLOCK_TYPES.map((bt) => {
        const Icon = bt.icon;
        return (
          <button
            key={bt.type}
            onClick={() => onSelect(bt.type)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-black/5 transition"
          >
            <Icon size={14} style={{ color: "#57452c" }} />
            <span className="flex flex-col">
              <span className="text-xs font-medium" style={{ color: "#2b2013" }}>
                {bt.label}
              </span>
              <span className="text-[10px]" style={{ color: "#8a7350" }}>
                {bt.hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- block-based task detail page ("case file") ----------
function TaskDetailPage({ task, onClose, onUpdateField, onAddBlock, onUpdateBlock, onDeleteBlock, onMoveBlock, onTriggerImageUpload, onExportMarkdown, onSaveAsTemplate }) {
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [editingDetailId, setEditingDetailId] = useState(null);
  const [slashMenuBlockId, setSlashMenuBlockId] = useState(null);
  const blocks = task.blocks || [];

  const handleBlockChange = (block, value) => {
    onUpdateBlock(block.id, { text: value });
    if (value === "/") setSlashMenuBlockId(block.id);
    else if (slashMenuBlockId === block.id) setSlashMenuBlockId(null);
  };

  const handleBlockKeyDown = (e, block) => {
    if (slashMenuBlockId === block.id && e.key === "Enter") {
      e.preventDefault();
      return;
    }
    if (block.type === "code") {
      if (e.key === "Escape") setEditingBlockId(null);
      return; // let Enter insert a real newline for code
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const newId = onAddBlock("text", block.id);
      setEditingBlockId(newId);
    } else if (e.key === "Escape") {
      setEditingBlockId(null);
      setSlashMenuBlockId(null);
    } else if (e.key === "Backspace" && block.text === "" && blocks.length > 1) {
      e.preventDefault();
      onDeleteBlock(block.id);
      setEditingBlockId(null);
    }
  };

  const handleSlashSelect = (blockId, type) => {
    setSlashMenuBlockId(null);
    if (type === "divider") {
      onUpdateBlock(blockId, { type: "divider", text: "" });
      const newId = onAddBlock("text", blockId);
      setEditingBlockId(newId);
    } else if (type === "image") {
      onUpdateBlock(blockId, { type: "image", text: "" });
      setEditingBlockId(null);
      onTriggerImageUpload(blockId);
    } else if (type === "toggle") {
      onUpdateBlock(blockId, { type: "toggle", text: "", collapsed: false, detail: "" });
      setEditingBlockId(blockId);
    } else {
      onUpdateBlock(blockId, { type, text: "" });
      setEditingBlockId(blockId);
    }
  };

  const handleAddBlockButton = () => {
    const id = onAddBlock("text");
    setEditingBlockId(id);
  };

  const BlockControls = ({ block, idx }) => (
    <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
      <button onClick={() => onMoveBlock(block.id, -1)} disabled={idx === 0} className="p-0.5 disabled:opacity-20" style={{ color: "#8a7350" }} title="Move up">
        <ChevronUp size={12} />
      </button>
      <button onClick={() => onMoveBlock(block.id, 1)} disabled={idx === blocks.length - 1} className="p-0.5 disabled:opacity-20" style={{ color: "#8a7350" }} title="Move down">
        <ChevronDown size={12} />
      </button>
      <button onClick={() => onDeleteBlock(block.id)} className="p-0.5" style={{ color: "#b91c1c" }} title="Delete block">
        <Trash2 size={12} />
      </button>
    </div>
  );

  const renderBlock = (block, idx) => {
    const isEditing = editingBlockId === block.id;

    if (block.type === "divider") {
      return (
        <div key={block.id} className="flex items-center py-2">
          <hr className="flex-1 border-t" style={{ borderColor: "rgba(0,0,0,0.15)" }} />
          <BlockControls block={block} idx={idx} />
        </div>
      );
    }

    if (block.type === "quote") {
      return (
        <div key={block.id} className="relative flex items-start gap-2 py-1">
          <div className="w-1 self-stretch rounded flex-shrink-0" style={{ background: "#b45309" }} />
          {isEditing ? (
            <textarea
              autoFocus
              value={block.text}
              onChange={(e) => handleBlockChange(block, e.target.value)}
              onKeyDown={(e) => handleBlockKeyDown(e, block)}
              onBlur={() => setEditingBlockId(null)}
              rows={Math.max(1, (block.text.match(/\n/g) || []).length + 1)}
              className="flex-1 text-sm italic outline-none bg-transparent resize-none pl-2"
              style={{ color: "#57452c" }}
              placeholder="Quote..."
            />
          ) : (
            <p onClick={() => setEditingBlockId(block.id)} className="flex-1 text-sm italic cursor-text pl-2 whitespace-pre-wrap" style={{ color: "#57452c" }}>
              {block.text ? renderInline(block.text) : <span style={{ opacity: 0.4 }}>Quote...</span>}
            </p>
          )}
          <BlockControls block={block} idx={idx} />
          {isEditing && slashMenuBlockId === block.id && <SlashMenu onSelect={(type) => handleSlashSelect(block.id, type)} />}
        </div>
      );
    }

    if (block.type === "code") {
      return (
        <div key={block.id} className="relative flex items-start gap-2 py-1">
          {isEditing ? (
            <textarea
              autoFocus
              value={block.text}
              onChange={(e) => handleBlockChange(block, e.target.value)}
              onKeyDown={(e) => handleBlockKeyDown(e, block)}
              onBlur={() => setEditingBlockId(null)}
              rows={Math.max(2, (block.text.match(/\n/g) || []).length + 1)}
              spellCheck={false}
              className="flex-1 text-xs font-mono outline-none resize-none p-2 rounded"
              style={{ color: "#e5e7eb", background: "#1c1712" }}
              placeholder="code..."
            />
          ) : (
            <pre onClick={() => setEditingBlockId(block.id)} className="flex-1 text-xs font-mono cursor-text p-2 rounded whitespace-pre-wrap" style={{ color: "#e5e7eb", background: "#1c1712" }}>
              {block.text || <span style={{ opacity: 0.5 }}>code...</span>}
            </pre>
          )}
          <BlockControls block={block} idx={idx} />
          {isEditing && slashMenuBlockId === block.id && <SlashMenu onSelect={(type) => handleSlashSelect(block.id, type)} />}
        </div>
      );
    }

    if (block.type === "toggle") {
      const detailEditing = editingDetailId === block.id;
      return (
        <div key={block.id} className="relative py-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateBlock(block.id, { collapsed: !block.collapsed })}
              className="p-0.5 flex-shrink-0"
              style={{ color: "#57452c" }}
              title={block.collapsed ? "Expand" : "Collapse"}
            >
              {block.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
            {isEditing ? (
              <input
                autoFocus
                value={block.text}
                onChange={(e) => handleBlockChange(block, e.target.value)}
                onKeyDown={(e) => handleBlockKeyDown(e, block)}
                onBlur={() => setEditingBlockId(null)}
                placeholder="Toggle title"
                className="flex-1 text-sm font-semibold outline-none bg-transparent"
                style={{ color: "#2b2013" }}
              />
            ) : (
              <span onClick={() => setEditingBlockId(block.id)} className="flex-1 text-sm font-semibold cursor-text" style={{ color: "#2b2013" }}>
                {block.text ? renderInline(block.text) : <span style={{ opacity: 0.4 }}>Toggle title</span>}
              </span>
            )}
            <BlockControls block={block} idx={idx} />
          </div>
          {!block.collapsed &&
            (detailEditing ? (
              <textarea
                autoFocus
                value={block.detail || ""}
                onChange={(e) => onUpdateBlock(block.id, { detail: e.target.value })}
                onBlur={() => setEditingDetailId(null)}
                rows={3}
                className="w-full text-sm mt-1 ml-6 outline-none bg-transparent resize-none"
                style={{ color: "#2b2013" }}
                placeholder="Details..."
              />
            ) : (
              <p onClick={() => setEditingDetailId(block.id)} className="text-sm mt-1 ml-6 cursor-text whitespace-pre-wrap" style={{ color: "#2b2013" }}>
                {block.detail ? renderInline(block.detail) : <span style={{ opacity: 0.4 }}>Click to add details...</span>}
              </p>
            ))}
          {isEditing && slashMenuBlockId === block.id && <SlashMenu onSelect={(type) => handleSlashSelect(block.id, type)} />}
        </div>
      );
    }

    if (block.type === "image") {
      return (
        <div key={block.id} className="py-2">
          <div className="flex items-start justify-between">
            {block.src ? (
              <img src={block.src} alt="" className="max-w-full rounded border" style={{ borderColor: "rgba(0,0,0,0.1)", maxHeight: 260 }} />
            ) : (
              <button
                onClick={() => onTriggerImageUpload(block.id)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded border border-dashed"
                style={{ borderColor: "rgba(0,0,0,0.25)", color: "#57452c" }}
              >
                <ImagePlus size={13} /> Click to add an image
              </button>
            )}
            <BlockControls block={block} idx={idx} />
          </div>
          {block.src &&
            (isEditing ? (
              <input
                autoFocus
                value={block.text}
                onChange={(e) => handleBlockChange(block, e.target.value)}
                onBlur={() => setEditingBlockId(null)}
                onKeyDown={(e) => e.key === "Enter" && setEditingBlockId(null)}
                placeholder="caption..."
                className="mt-1 text-xs w-full outline-none border-b bg-transparent"
                style={{ color: "#57452c", borderColor: "rgba(0,0,0,0.15)" }}
              />
            ) : (
              <p onClick={() => setEditingBlockId(block.id)} className="mt-1 text-xs cursor-text" style={{ color: "#8a7350" }}>
                {block.text ? renderInline(block.text) : "add a caption..."}
              </p>
            ))}
        </div>
      );
    }

    if (block.type === "todo") {
      return (
        <div key={block.id} className="relative flex items-center gap-2 py-1">
          <input
            type="checkbox"
            checked={!!block.checked}
            onChange={(e) => onUpdateBlock(block.id, { checked: e.target.checked })}
            className="w-3.5 h-3.5 flex-shrink-0"
          />
          {isEditing ? (
            <input
              autoFocus
              value={block.text}
              onChange={(e) => handleBlockChange(block, e.target.value)}
              onKeyDown={(e) => handleBlockKeyDown(e, block)}
              onBlur={() => setEditingBlockId(null)}
              placeholder="To-do... (type / for commands)"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: "#2b2013" }}
            />
          ) : (
            <span
              onClick={() => setEditingBlockId(block.id)}
              className="flex-1 text-sm cursor-text"
              style={{ color: "#2b2013", textDecoration: block.checked ? "line-through" : "none", opacity: block.checked ? 0.5 : 1 }}
            >
              {block.text ? renderInline(block.text) : <span style={{ opacity: 0.4 }}>To-do...</span>}
            </span>
          )}
          <BlockControls block={block} idx={idx} />
          {isEditing && slashMenuBlockId === block.id && <SlashMenu onSelect={(type) => handleSlashSelect(block.id, type)} />}
        </div>
      );
    }

    if (block.type === "heading") {
      return (
        <div key={block.id} className="relative flex items-center gap-2 py-1">
          {isEditing ? (
            <input
              autoFocus
              value={block.text}
              onChange={(e) => handleBlockChange(block, e.target.value)}
              onKeyDown={(e) => handleBlockKeyDown(e, block)}
              onBlur={() => setEditingBlockId(null)}
              placeholder="Heading (type / for commands)"
              className="flex-1 text-lg font-bold outline-none bg-transparent typewriter"
              style={{ color: "#2b2013" }}
            />
          ) : (
            <h3 onClick={() => setEditingBlockId(block.id)} className="flex-1 text-lg font-bold cursor-text typewriter" style={{ color: "#2b2013" }}>
              {block.text ? renderInline(block.text) : <span style={{ opacity: 0.4 }}>Heading</span>}
            </h3>
          )}
          <BlockControls block={block} idx={idx} />
          {isEditing && slashMenuBlockId === block.id && <SlashMenu onSelect={(type) => handleSlashSelect(block.id, type)} />}
        </div>
      );
    }

    // text
    return (
      <div key={block.id} className="relative flex items-start gap-2 py-1">
        {isEditing ? (
          <textarea
            autoFocus
            value={block.text}
            onChange={(e) => handleBlockChange(block, e.target.value)}
            onKeyDown={(e) => handleBlockKeyDown(e, block)}
            onBlur={() => setEditingBlockId(null)}
            rows={Math.max(1, (block.text.match(/\n/g) || []).length + 1)}
            className="flex-1 text-sm outline-none bg-transparent resize-none"
            style={{ color: "#2b2013" }}
            placeholder="Type '/' for commands — or **bold**, *italic*, `code`, [link](url)"
          />
        ) : (
          <p onClick={() => setEditingBlockId(block.id)} className="flex-1 text-sm cursor-text whitespace-pre-wrap" style={{ color: "#2b2013" }}>
            {block.text ? renderInline(block.text) : <span style={{ opacity: 0.4 }}>Type '/' for commands...</span>}
          </p>
        )}
        <BlockControls block={block} idx={idx} />
        {isEditing && slashMenuBlockId === block.id && <SlashMenu onSelect={(type) => handleSlashSelect(block.id, type)} />}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-md mb-8"
        style={{ background: "#efe4c8", boxShadow: "0 30px 60px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="text-[10px] mono uppercase tracking-widest flex items-center gap-1" style={{ color: "#8a7350" }}>
            <FileText size={11} /> Case File
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onSaveAsTemplate}
              title="Save this task's structure as a reusable template"
              className="p-1 rounded hover:bg-black/5"
              style={{ color: "#57452c" }}
            >
              <LayoutTemplate size={14} />
            </button>
            <button onClick={onExportMarkdown} title="Export to Markdown" className="p-1 rounded hover:bg-black/5" style={{ color: "#57452c" }}>
              <Download size={14} />
            </button>
            <button onClick={onClose} className="text-xl leading-none px-1" style={{ color: "#57452c" }}>
              ×
            </button>
          </div>
        </div>

        <div className="px-5 pt-2 pb-4 border-b" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
          <input
            value={task.title}
            onChange={(e) => onUpdateField({ title: e.target.value })}
            className="w-full text-2xl font-bold outline-none bg-transparent typewriter"
            style={{ color: "#2b2013" }}
          />
          <div className="flex flex-wrap gap-2 mt-3">
            <input
              value={task.category}
              onChange={(e) => onUpdateField({ category: e.target.value })}
              className="text-xs px-2 py-1 rounded border outline-none"
              style={{ background: "rgba(0,0,0,0.05)", borderColor: "rgba(0,0,0,0.12)", color: "#57452c" }}
              placeholder="Category"
            />
            <select
              value={task.priority}
              onChange={(e) => onUpdateField({ priority: e.target.value })}
              className="text-xs px-2 py-1 rounded border outline-none"
              style={{ background: "rgba(0,0,0,0.05)", borderColor: "rgba(0,0,0,0.12)", color: "#57452c" }}
            >
              <option value="urgent">Urgent</option>
              <option value="active">Active</option>
              <option value="cold">Cold case</option>
            </select>
            <input
              type="datetime-local"
              value={task.dueDate}
              onChange={(e) => onUpdateField({ dueDate: e.target.value })}
              className="text-xs px-2 py-1 rounded border outline-none"
              style={{ background: "rgba(0,0,0,0.05)", borderColor: "rgba(0,0,0,0.12)", color: "#57452c" }}
            />
          </div>
        </div>

        <div className="px-5 py-4 max-h-[50vh] overflow-y-auto">
          {blocks.length === 0 && (
            <p className="text-xs italic mb-2" style={{ color: "#8a7350" }}>
              No notes yet. Click "+ Add block" below, or type "/" inside any block for commands.
            </p>
          )}
          {blocks.map((b, i) => renderBlock(b, i))}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={handleAddBlockButton}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-dashed transition hover:bg-black/5"
            style={{ borderColor: "rgba(0,0,0,0.25)", color: "#57452c" }}
          >
            <Plus size={13} /> Add block
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- multiple case files (board tabs) ----------
// Each tab is a fully independent <CaseBoard> mounted with its own storage
// key, so switching tabs just remounts a fresh board rather than sharing
// state — simple and safe.
const BOARD_LIST_KEY = "caseboard-board-list-v1";

function BoardTabs() {
  const [boards, setBoards] = useState([{ id: "board-1", name: "Main Case" }]);
  const [activeId, setActiveId] = useState("board-1");
  const [loaded, setLoaded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("New Case");
  const [renameTarget, setRenameTarget] = useState(null); // { id, name }
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }

  useEffect(() => {
    (async () => {
      const parsed = await storage.load(BOARD_LIST_KEY);
      if (parsed?.boards?.length) {
        setBoards(parsed.boards);
        setActiveId(parsed.activeId && parsed.boards.some((b) => b.id === parsed.activeId) ? parsed.activeId : parsed.boards[0].id);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    storage.save(BOARD_LIST_KEY, { boards, activeId });
  }, [boards, activeId, loaded]);

  const confirmAddBoard = () => {
    const name = addName.trim();
    if (!name) return;
    const id = randomId();
    setBoards((prev) => [...prev, { id, name }]);
    setActiveId(id);
    setAddOpen(false);
    setAddName("New Case");
  };

  const confirmRename = () => {
    const name = renameValue.trim();
    if (!name || !renameTarget) return;
    setBoards((prev) => prev.map((b) => (b.id === renameTarget.id ? { ...b, name } : b)));
    setRenameTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget || boards.length <= 1) {
      setDeleteTarget(null);
      return;
    }
    const remaining = boards.filter((b) => b.id !== deleteTarget.id);
    setBoards(remaining);
    if (activeId === deleteTarget.id) setActiveId(remaining[0].id);
    setDeleteTarget(null);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#1c1712" }}>
        <div className="flex items-center gap-2 text-amber-200/70 text-sm" style={{ fontFamily: "'Courier New', monospace" }}>
          <Loader2 size={16} className="animate-spin" /> Opening the filing cabinet...
        </div>
      </div>
    );
  }

  const modalShellStyle = { background: "rgba(0,0,0,0.65)" };
  const modalCardStyle = { background: "#241d15", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" };
  const modalFont = { fontFamily: "'Courier Prime', 'Courier New', monospace" };

  return (
    <div>
      {/* new case file modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={modalShellStyle} onClick={() => setAddOpen(false)}>
          <div className="max-w-xs w-full rounded-md p-5 border border-amber-200/20" style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg text-amber-50 mb-3" style={{ fontFamily: "'Special Elite', 'Courier New', monospace" }}>
              NEW CASE FILE
            </h2>
            <input
              autoFocus
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmAddBoard()}
              placeholder="e.g. Personal"
              className="w-full px-2.5 py-1.5 rounded text-sm text-amber-50 placeholder-amber-200/30 outline-none border border-amber-200/15 focus:border-amber-400/40"
              style={{ background: "rgba(0,0,0,0.3)", ...modalFont }}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={confirmAddBoard} className="flex-1 py-2 rounded text-sm font-bold text-amber-50 border border-red-400/40" style={{ background: "#b91c1c", ...modalFont }}>
                Create
              </button>
              <button onClick={() => setAddOpen(false)} className="px-4 py-2 rounded text-sm text-amber-100/70 border border-amber-200/20" style={modalFont}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* rename case file modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={modalShellStyle} onClick={() => setRenameTarget(null)}>
          <div className="max-w-xs w-full rounded-md p-5 border border-amber-200/20" style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg text-amber-50 mb-3" style={{ fontFamily: "'Special Elite', 'Courier New', monospace" }}>
              RENAME CASE FILE
            </h2>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmRename()}
              className="w-full px-2.5 py-1.5 rounded text-sm text-amber-50 outline-none border border-amber-200/15 focus:border-amber-400/40"
              style={{ background: "rgba(0,0,0,0.3)", ...modalFont }}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={confirmRename} className="flex-1 py-2 rounded text-sm font-bold text-amber-50 border border-red-400/40" style={{ background: "#b91c1c", ...modalFont }}>
                Save
              </button>
              <button onClick={() => setRenameTarget(null)} className="px-4 py-2 rounded text-sm text-amber-100/70 border border-amber-200/20" style={modalFont}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* close case file confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={modalShellStyle} onClick={() => setDeleteTarget(null)}>
          <div className="max-w-xs w-full rounded-md p-5 border border-amber-200/20" style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg text-amber-50 mb-2" style={{ fontFamily: "'Special Elite', 'Courier New', monospace" }}>
              CLOSE CASE FILE?
            </h2>
            <p className="text-sm text-amber-100/70 mb-4" style={modalFont}>
              "{deleteTarget.name}" will be removed from the tab bar. Its saved board data stays in storage in case you want it back later.
            </p>
            <div className="flex gap-2">
              <button onClick={confirmDelete} className="flex-1 py-2 rounded text-sm font-bold text-amber-50 border border-red-400/40" style={{ background: "#b91c1c", ...modalFont }}>
                Close it
              </button>
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded text-sm text-amber-100/70 border border-amber-200/20" style={modalFont}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center pt-3 px-4" style={{ background: "#100d0a" }}>
        <div className="w-full max-w-6xl flex items-end gap-1 flex-wrap">
          {boards.map((b) => (
            <div key={b.id} className="flex items-center">
              <button
                onClick={() => setActiveId(b.id)}
                onDoubleClick={() => {
                  setRenameTarget({ id: b.id, name: b.name });
                  setRenameValue(b.name);
                }}
                title="Double-click to rename"
                className="text-xs px-3 py-1.5 rounded-t border-x border-t transition"
                style={{
                  fontFamily: "'Special Elite', 'Courier New', monospace",
                  background: activeId === b.id ? "#7a5c3a" : "rgba(255,255,255,0.05)",
                  color: activeId === b.id ? "#fff7ed" : "rgba(253,230,138,0.55)",
                  borderColor: "#4a3620",
                }}
              >
                {b.name}
              </button>
              {boards.length > 1 && (
                <button
                  onClick={() => setDeleteTarget({ id: b.id, name: b.name })}
                  title="Close this case file tab"
                  className="text-amber-200/25 hover:text-red-400 px-1 text-xs transition"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              setAddName("New Case");
              setAddOpen(true);
            }}
            title="Start a new case file"
            className="text-xs px-2.5 py-1.5 text-amber-200/50 hover:text-amber-100 flex items-center gap-1 transition"
            style={{ fontFamily: "'Courier Prime', 'Courier New', monospace" }}
          >
            <FolderPlus size={13} /> New case file
          </button>
        </div>
      </div>
      <CaseBoard key={activeId} storageKey={`caseboard-state-${activeId}`} />
    </div>
  );
}

export default BoardTabs;
