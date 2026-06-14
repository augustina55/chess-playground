import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, NotebookPen, ChevronLeft, Trash2, Edit3, X,
  BookOpen, FileText, Calendar, Users, Check, Save,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import {
  getAcademies,
  getBatches, getBatchesByAcademy,
  getPgns,
  getClassSessionsByAcademy, getClassSessionsByBatch,
  createClassSession, updateClassSession, deleteClassSession,
} from "../lib/db";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ── Session form (add / edit) ─────────────────────────────────────────────────

function SessionForm({ batches, pgns, initial, onSave, onCancel, saving }) {
  const blank = { batchId: "", date: todayISO(), title: "", notes: "", pgnIds: [] };
  const [form, setForm] = useState(initial ? {
    batchId: initial.batchId || "",
    date:    initial.date    || todayISO(),
    title:   initial.title   || "",
    notes:   initial.notes   || "",
    pgnIds:  initial.pgnIds  || [],
  } : blank);

  function togglePgn(id) {
    setForm(f => ({
      ...f,
      pgnIds: f.pgnIds.includes(id) ? f.pgnIds.filter(p => p !== id) : [...f.pgnIds, id],
    }));
  }

  const canSave = form.batchId && form.date;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <h3 className="font-black text-[16px] text-gray-900">
          {initial ? "Edit Session" : "New Class Session"}
        </h3>
        <button onClick={onCancel} className="w-8 h-8 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Batch */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Batch</label>
          <select
            value={form.batchId}
            onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))}
            className="w-full h-11 rounded-2xl border border-gray-200 bg-white px-4 text-[13px] text-gray-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all">
            <option value="">Select batch…</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full h-11 rounded-2xl border border-gray-200 bg-white px-4 text-[13px] text-gray-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
          />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Session Title</label>
          <input
            type="text"
            placeholder="e.g. Endgame Techniques, Opening Principles…"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full h-11 rounded-2xl border border-gray-200 bg-white px-4 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Class Notes</label>
          <textarea
            rows={7}
            placeholder="What was covered today? Key ideas, mistakes, homework reminders…"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all resize-none"
          />
        </div>

        {/* PGNs */}
        {pgns.length > 0 && (
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Attach PGNs <span className="normal-case font-normal text-gray-400">({form.pgnIds.length} selected)</span>
            </label>
            <div className="space-y-2">
              {pgns.map(pgn => {
                const sel = form.pgnIds.includes(pgn.id);
                return (
                  <button key={pgn.id} type="button" onClick={() => togglePgn(pgn.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left",
                      sel ? "border-brand-500 bg-brand-50" : "border-gray-100 bg-white hover:border-gray-200"
                    )}>
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      sel ? "bg-brand-500" : "bg-gray-100")}>
                      <FileText size={13} className={sel ? "text-white" : "text-gray-400"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-800 truncate">{pgn.name}</p>
                      {pgn.puzzleCount > 0 && (
                        <p className="text-[11px] text-gray-400">{pgn.puzzleCount} puzzles</p>
                      )}
                    </div>
                    {sel && <Check size={14} className="text-brand-500 shrink-0" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
        <button onClick={onCancel}
          className="flex-1 h-11 rounded-2xl border border-gray-200 text-gray-600 text-[13px] font-semibold hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button onClick={() => onSave(form)} disabled={!canSave || saving}
          className="flex-1 h-11 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[13px] font-bold flex items-center justify-center gap-2 transition-colors">
          {saving
            ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            : <Save size={14} />}
          {saving ? "Saving…" : "Save Session"}
        </button>
      </div>
    </div>
  );
}

// ── Session detail panel ──────────────────────────────────────────────────────

function SessionDetail({ session, pgns, canEdit, onEdit, onDelete, onClose }) {
  const attachedPgns = pgns.filter(p => session.pgnIds.includes(p.id));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full">
              {session.batchName || session.batchId}
            </span>
            <span className="text-[11px] text-gray-400">{fmtDate(session.date)}</span>
          </div>
          <h2 className="text-[18px] font-black text-gray-900 leading-tight">
            {session.title || "Untitled Session"}
          </h2>
          {session.createdBy && (
            <p className="text-[11px] text-gray-400 mt-0.5">by {session.createdBy}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && (
            <>
              <button onClick={onEdit}
                className="w-8 h-8 rounded-xl text-gray-400 hover:text-brand-600 hover:bg-brand-50 flex items-center justify-center transition-colors">
                <Edit3 size={14} />
              </button>
              <button onClick={onDelete}
                className="w-8 h-8 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                <Trash2 size={14} />
              </button>
            </>
          )}
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Notes */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">Class Notes</p>
          {session.notes ? (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
              <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">{session.notes}</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <p className="text-[13px] text-gray-400">No notes recorded for this session.</p>
              {canEdit && (
                <button onClick={onEdit} className="mt-2 text-[12px] text-brand-600 font-semibold hover:underline">
                  Add notes →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Attached PGNs */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">
            Class PGNs {attachedPgns.length > 0 && `(${attachedPgns.length})`}
          </p>
          {attachedPgns.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-5 text-center">
              <p className="text-[12px] text-gray-400">No PGNs attached to this session.</p>
              {canEdit && (
                <button onClick={onEdit} className="mt-1 text-[12px] text-brand-600 font-semibold hover:underline">
                  Attach PGNs →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {attachedPgns.map(pgn => (
                <div key={pgn.id}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-800 truncate">{pgn.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {pgn.puzzleCount > 0 ? `${pgn.puzzleCount} puzzles` : pgn.type || "PGN file"}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full shrink-0">
                    {pgn.id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Session list card ─────────────────────────────────────────────────────────

function SessionCard({ session, selected, onClick }) {
  return (
    <button onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-2xl border-2 transition-all",
        selected
          ? "border-brand-500 bg-brand-50"
          : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
      )}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gray-100 shrink-0">
          <span className="text-[11px] font-black text-gray-500 uppercase leading-none">
            {new Date(session.date + "T00:00:00").toLocaleDateString("en", { month: "short" })}
          </span>
          <span className="text-[20px] font-black text-gray-900 leading-none">
            {new Date(session.date + "T00:00:00").getDate()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
              selected ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500")}>
              {session.batchName || session.batchId}
            </span>
            {session.pgnIds.length > 0 && (
              <span className="text-[10px] font-bold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-full">
                {session.pgnIds.length} PGN{session.pgnIds.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-[13px] font-bold text-gray-900 truncate">
            {session.title || "Untitled Session"}
          </p>
          {session.notes && (
            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2 leading-snug">
              {session.notes}
            </p>
          )}
        </div>
        <ChevronRight size={14} className={cn("shrink-0 mt-1", selected ? "text-brand-400" : "text-gray-200")} />
      </div>
    </button>
  );
}

// ── Main ClassNotesPage ───────────────────────────────────────────────────────

export default function ClassNotesPage() {
  const { user } = useAuth();
  const isCoach = user?.role === "admin" || user?.role === "coach";

  const [loading,    setLoading]    = useState(true);
  const [sessions,   setSessions]   = useState([]);
  const [batches,    setBatches]    = useState([]);
  const [pgns,       setPgns]       = useState([]);
  const [academyId,  setAcademyId]  = useState(null);

  const [selected,   setSelected]   = useState(null);   // session object
  const [mode,       setMode]       = useState("list"); // "list" | "detail" | "form"
  const [editing,    setEditing]    = useState(null);   // session to edit, or null for new
  const [saving,     setSaving]     = useState(false);

  const [batchFilter, setBatchFilter] = useState("all");
  const [search,      setSearch]      = useState("");

  useEffect(() => {
    async function load() {
      const academies = await getAcademies();
      let ac = null;
      if (user?.role === "coach")
        ac = academies.find(a => String(a.mainCoachId) === String(user?.id));
      else if (user?.role === "admin")
        ac = academies[0] || null;
      const id = ac?.id || null;
      setAcademyId(id);

      const [b, p, s] = await Promise.all([
        id ? getBatchesByAcademy(id) : getBatches(),
        getPgns(),
        id ? getClassSessionsByAcademy(id) : [],
      ]);
      setBatches(b);
      setPgns(p);
      setSessions(s);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered sessions
  const filtered = useMemo(() => {
    let list = sessions;
    if (batchFilter !== "all") list = list.filter(s => s.batchId === batchFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.title || "").toLowerCase().includes(q) ||
        (s.notes || "").toLowerCase().includes(q) ||
        (s.batchName || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [sessions, batchFilter, search]);

  // Unique batch options from loaded sessions
  const batchOptions = useMemo(() => {
    const seen = new Map();
    sessions.forEach(s => { if (s.batchId) seen.set(s.batchId, s.batchName || s.batchId); });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [sessions]);

  async function handleSave(form) {
    setSaving(true);
    try {
      const batch = batches.find(b => b.id === form.batchId);
      if (editing?.id) {
        const updated = await updateClassSession(editing.id, {
          date: form.date, title: form.title, notes: form.notes, pgnIds: form.pgnIds,
        });
        setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
        setSelected(updated);
      } else {
        const created = await createClassSession({
          batchId:   form.batchId,
          batchName: batch?.name || form.batchId,
          academyId,
          date:      form.date,
          title:     form.title,
          notes:     form.notes,
          pgnIds:    form.pgnIds,
          createdBy: user?.name,
        });
        setSessions(prev => [created, ...prev]);
        setSelected(created);
      }
      setMode("detail");
      setEditing(null);
    } catch (e) {
      console.error("[class_sessions] save failed:", e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(session) {
    if (!window.confirm(`Delete session "${session.title || fmtDate(session.date)}"?`)) return;
    try {
      await deleteClassSession(session.id);
      setSessions(prev => prev.filter(s => s.id !== session.id));
      setSelected(null);
      setMode("list");
    } catch (e) {
      console.error("[class_sessions] delete failed:", e);
    }
  }

  function openNew() {
    setEditing(null);
    setMode("form");
  }

  function openEdit(session) {
    setEditing(session);
    setMode("form");
  }

  function openDetail(session) {
    setSelected(session);
    setMode("detail");
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <span className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin" />
    </div>
  );

  return (
    <div className="h-[calc(100vh-70px)] flex flex-col bg-[#f5f6fa] overflow-hidden">

      {/* ── Page header ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
            <NotebookPen size={17} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-[17px] font-black text-gray-900 leading-tight">Class Notes</h1>
            <p className="text-[11px] text-gray-400">{sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded</p>
          </div>
        </div>
        {isCoach && (
          <button onClick={openNew}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-bold shadow-sm shadow-brand-500/20 transition-colors">
            <Plus size={14} />New Session
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: list panel ── */}
        <div className="w-[340px] shrink-0 flex flex-col border-r border-gray-200 bg-white overflow-hidden">

          {/* Search + batch filter */}
          <div className="px-4 py-3 border-b border-gray-100 space-y-2">
            <input
              type="text"
              placeholder="Search sessions…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 px-3 text-[12px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-brand-400 transition-colors"
            />
            {batchOptions.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setBatchFilter("all")}
                  className={cn("px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors",
                    batchFilter === "all" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                  All
                </button>
                {batchOptions.map(b => (
                  <button key={b.id} onClick={() => setBatchFilter(b.id)}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors",
                      batchFilter === b.id ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <NotebookPen size={28} className="text-gray-200 mb-3" />
                <p className="text-[13px] font-semibold text-gray-500">
                  {sessions.length === 0 ? "No sessions yet" : "No sessions match"}
                </p>
                {isCoach && sessions.length === 0 && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Click "New Session" to record your first class.
                  </p>
                )}
              </div>
            ) : (
              filtered.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  selected={selected?.id === s.id && mode !== "form"}
                  onClick={() => openDetail(s)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right: detail / form panel ── */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {mode === "list" && (
              <motion.div key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-20 h-20 rounded-[24px] bg-brand-50 flex items-center justify-center mb-5">
                  <NotebookPen size={34} className="text-brand-300" />
                </div>
                <p className="text-[16px] font-black text-gray-700">Select a session</p>
                <p className="text-[13px] text-gray-400 mt-1 max-w-xs">
                  Choose a session from the left to view notes and attached PGNs.
                </p>
                {isCoach && (
                  <button onClick={openNew}
                    className="mt-6 flex items-center gap-2 h-10 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-bold transition-colors">
                    <Plus size={14} />Add First Session
                  </button>
                )}
              </motion.div>
            )}

            {mode === "detail" && selected && (
              <motion.div key={`detail-${selected.id}`}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full">
                <SessionDetail
                  session={selected}
                  pgns={pgns}
                  canEdit={isCoach}
                  onEdit={() => openEdit(selected)}
                  onDelete={() => handleDelete(selected)}
                  onClose={() => { setMode("list"); setSelected(null); }}
                />
              </motion.div>
            )}

            {mode === "form" && (
              <motion.div key="form"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full">
                <SessionForm
                  batches={batches}
                  pgns={pgns}
                  initial={editing}
                  saving={saving}
                  onSave={handleSave}
                  onCancel={() => {
                    if (selected) { setMode("detail"); } else { setMode("list"); }
                    setEditing(null);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
