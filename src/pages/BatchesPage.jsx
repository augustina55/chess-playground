import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import {
  Plus, Users, Trash2, X, Link2, CalendarDays,
  ChevronLeft, ChevronRight, Clock, Search,
  UserPlus, UserMinus, Check, FileText, Upload, Download,
  ChevronDown, MessageSquare, BookOpen, ExternalLink,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { BOARD_THEMES } from "../lib/boardThemes";
import {
  getBatches, getBatchesByAcademy, createBatch, deleteBatch,
  getBatchStudents, addStudentToBatch, removeStudentFromBatch, getBatchStudentCounts,
  getProfilesByAcademy, getProfiles, getAcademies, getBatchesForStudent,
  getAcademyInvitations, getCoachAcademies,
  upsertAttendance, getAttendanceByBatchDate,
  getClassSessionByBatchDate, getClassSessionsByAcademy, createClassSession, updateClassSession,
  getClassSessionsByBatch, getAttendanceByBatch,
  getPgns, createPgn, getPgnsByIds,
} from "../lib/db";

// ── constants ──────────────────────────────────────────────────────────────────

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Open"];

const DAYS = [
  { label: "M", value: "Mon", full: "Monday",    js: 1 },
  { label: "T", value: "Tue", full: "Tuesday",   js: 2 },
  { label: "W", value: "Wed", full: "Wednesday", js: 3 },
  { label: "T", value: "Thu", full: "Thursday",  js: 4 },
  { label: "F", value: "Fri", full: "Friday",    js: 5 },
  { label: "S", value: "Sat", full: "Saturday",  js: 6 },
  { label: "S", value: "Sun", full: "Sunday",    js: 0 },
];

const LEVEL_CHIP = {
  Beginner:     "bg-emerald-50 text-emerald-700 border-emerald-100",
  Intermediate: "bg-blue-50 text-blue-700 border-blue-100",
  Advanced:     "bg-orange-50 text-orange-700 border-orange-100",
  Open:         "bg-violet-50 text-violet-700 border-violet-100",
};

const LEVEL_CAL = {
  Beginner:     "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-blue-100 text-blue-700",
  Advanced:     "bg-orange-100 text-orange-700",
  Open:         "bg-violet-100 text-violet-700",
};

const LEVEL_BAR = {
  Beginner:     "bg-emerald-500",
  Intermediate: "bg-blue-500",
  Advanced:     "bg-orange-500",
  Open:         "bg-violet-500",
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const inputCls =
  "w-full h-12 rounded-2xl border border-gray-200 bg-white px-4 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function scheduleSummary(batch) {
  if (!batch.days?.length) return "";
  const labels = batch.days.map(v => DAYS.find(d => d.value === v)?.label || v).join(" ");
  if (batch.days.length === 1) {
    const t = batch.times?.[batch.days[0]];
    return t ? `${labels} · ${fmtTime(t)}` : labels;
  }
  return labels;
}

function batchesForDate(batches, date) {
  const jsDay = date.getDay();
  return batches.filter(b => b.isActive !== false && b.days?.some(v => {
    const d = DAYS.find(x => x.value === v);
    return d?.js === jsDay;
  }));
}

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getWeekGrid(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return x;
  });
}

// ── Field label ───────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">{label}</p>
      {children}
    </div>
  );
}

// ── AddBatchDrawer ────────────────────────────────────────────────────────────

function AddBatchDrawer({ open, onClose, onSave, defaultCoach, coaches = [] }) {
  const blank = { name: "", coach: defaultCoach || "", coachId: null, level: "Beginner", days: [], times: {}, meetingLink: "", isActive: true };
  const [form, setForm] = useState(blank);

  function toggleDay(val) {
    setForm(f => {
      const has = f.days.includes(val);
      const days = has ? f.days.filter(d => d !== val) : [...f.days, val];
      const times = { ...f.times };
      if (has) delete times[val];
      return { ...f, days, times };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form });
    setForm(blank);
    onClose();
  }

  const multi = form.days.length > 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end"
        >
          <motion.aside
            initial={{ x: 520 }} animate={{ x: 0 }} exit={{ x: 520 }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="w-full max-w-[480px] bg-[#f6f8fc] h-full flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-7 py-5 bg-white border-b border-gray-200 shrink-0">
              <h2 className="font-black text-[16px] text-gray-900">Add Batch</h2>
              <button onClick={onClose} className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

                <Field label="Batch Name">
                  <input className={inputCls} value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Beginners Batch A" autoFocus required />
                </Field>

                <Field label="Coach">
                  {coaches.length > 0 ? (
                    <select
                      className={cn(inputCls, "cursor-pointer")}
                      value={form.coachId ?? ""}
                      onChange={e => {
                        const c = coaches.find(x => String(x.id) === e.target.value);
                        setForm(f => ({ ...f, coachId: c ? c.id : null, coach: c ? c.name : "" }));
                      }}
                    >
                      <option value="">— Select coach —</option>
                      {coaches.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input className={inputCls} value={form.coach}
                      onChange={e => setForm(f => ({ ...f, coach: e.target.value }))}
                      placeholder="Coach name" />
                  )}
                </Field>

                <Field label="Level">
                  <div className="flex flex-wrap gap-2">
                    {LEVELS.map(l => (
                      <button key={l} type="button" onClick={() => setForm(f => ({ ...f, level: l }))}
                        className={cn("px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all",
                          form.level === l
                            ? "bg-brand-600 text-white border-brand-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                        {l}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Days">
                  <div className="flex gap-1.5">
                    {DAYS.map(d => (
                      <button key={d.value} type="button" onClick={() => toggleDay(d.value)} title={d.full}
                        className={cn(
                          "w-10 h-10 rounded-xl text-[13px] font-black border transition-all",
                          form.days.includes(d.value)
                            ? "bg-brand-600 text-white border-brand-600"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                        )}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </Field>

                {form.days.length > 0 && (
                  <Field label={multi ? "Time per Day" : "Time"}>
                    <div className="space-y-2">
                      {form.days.map(val => {
                        const d = DAYS.find(x => x.value === val);
                        return (
                          <div key={val} className="flex items-center gap-3">
                            {multi && (
                              <span className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-[12px] font-black text-brand-700 shrink-0">
                                {d?.label}
                              </span>
                            )}
                            <input type="time" value={form.times[val] || ""}
                              onChange={e => setForm(f => ({ ...f, times: { ...f.times, [val]: e.target.value } }))}
                              className={inputCls} />
                            {multi && (
                              <span className="text-[12px] text-gray-400 whitespace-nowrap shrink-0">{d?.full}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Field>
                )}

                <Field label="Meeting Link (optional)">
                  <div className="relative">
                    <Link2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input className={cn(inputCls, "pl-10")} value={form.meetingLink}
                      onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))}
                      placeholder="https://meet.google.com/…" />
                  </div>
                </Field>

                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-200">
                  <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    className={cn(
                      "w-11 h-6 rounded-full transition-all flex items-center px-0.5",
                      form.isActive ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
                    )}>
                    <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
                  </button>
                  <div>
                    <p className="text-[13px] font-bold text-gray-800">Active Batch</p>
                    <p className="text-[11px] text-gray-400">
                      {form.isActive ? "Visible and scheduled" : "Hidden from schedule"}
                    </p>
                  </div>
                </div>

              </div>

              <div className="px-6 py-5 bg-white border-t border-gray-200 shrink-0 flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors">
                  Create Batch
                </button>
              </div>
            </form>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── StudentManagementDrawer ───────────────────────────────────────────────────

function StudentManagementDrawer({ batch, open, onClose, academyStudents }) {
  const [enrolled,  setEnrolled]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(null); // studentId being saved
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    if (!batch || !open) return;
    setLoading(true);
    getBatchStudents(batch.id).then(s => { setEnrolled(s); setLoading(false); });
  }, [batch?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const enrolledIds = useMemo(() => new Set(enrolled.map(s => s.id)), [enrolled]);

  const available = useMemo(() =>
    academyStudents.filter(s =>
      s.role === "student" &&
      !enrolledIds.has(s.id) &&
      (!search ||
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.batchCode?.toLowerCase().includes(search.toLowerCase()))
    ),
    [academyStudents, enrolledIds, search]
  );

  async function handleAdd(student) {
    setSaving(student.id);
    try {
      await addStudentToBatch(batch.id, student.id);
      setEnrolled(prev => [...prev, student]);
    } finally { setSaving(null); }
  }

  async function handleRemove(student) {
    setSaving(student.id);
    try {
      await removeStudentFromBatch(batch.id, student.id);
      setEnrolled(prev => prev.filter(s => s.id !== student.id));
    } finally { setSaving(null); }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end"
        >
          <motion.aside
            initial={{ x: 520 }} animate={{ x: 0 }} exit={{ x: 520 }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="w-full max-w-[480px] bg-[#f6f8fc] h-full flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-gray-200 shrink-0">
              <div className="min-w-0">
                <h2 className="font-black text-[16px] text-gray-900 truncate">{batch?.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full border", LEVEL_CHIP[batch?.level] || LEVEL_CHIP.Open)}>
                    {batch?.level}
                  </span>
                  <span className="text-[12px] text-gray-400">{enrolled.length} student{enrolled.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0 ml-3">
                <X size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">

              {/* Enrolled students */}
              <div className="px-6 py-5">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">
                  Enrolled ({enrolled.length})
                </p>
                {loading ? (
                  <p className="text-[13px] text-gray-400 py-4 text-center">Loading…</p>
                ) : enrolled.length === 0 ? (
                  <div className="py-6 text-center rounded-2xl border border-dashed border-gray-200 bg-white">
                    <Users size={24} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-[13px] text-gray-400">No students yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {enrolled.map(s => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-200">
                        <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-[13px] font-black shrink-0">
                          {s.avatar || s.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-gray-800 truncate">{s.name}</p>
                          {s.batchCode && (
                            <p className="text-[11px] text-gray-400">{s.batchCode}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemove(s)}
                          disabled={saving === s.id}
                          className="w-8 h-8 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0 disabled:opacity-50">
                          {saving === s.id ? <span className="text-[10px]">…</span> : <UserMinus size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="mx-6 border-t border-gray-200" />

              {/* Add students */}
              <div className="px-6 py-5">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">
                  Add Students
                </p>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-[13px] outline-none focus:border-brand-500"
                    placeholder="Search by name or batch code…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {available.length === 0 ? (
                  <p className="text-[13px] text-gray-400 py-4 text-center">
                    {search ? "No matches found" : "All academy students are enrolled"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {available.map(s => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-200">
                        <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[13px] font-black shrink-0">
                          {s.avatar || s.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-gray-800 truncate">{s.name}</p>
                          {s.batchCode && (
                            <p className="text-[11px] text-gray-400">{s.batchCode}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleAdd(s)}
                          disabled={saving === s.id}
                          className="flex items-center gap-1 h-8 px-3 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 text-[12px] font-bold transition-colors shrink-0 disabled:opacity-50">
                          {saving === s.id ? "…" : <><UserPlus size={13} /><span>Add</span></>}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── BatchRow ──────────────────────────────────────────────────────────────────

function BatchRow({ batch, studentCount, onDelete, onClick, canManage }) {
  const active = batch.isActive !== false;
  const sched  = scheduleSummary(batch);

  return (
    <div
      onClick={onClick}
      className="group flex items-start gap-4 px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer"
    >
      {/* Left: code + name + level */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-black text-gray-400 tracking-wider">{batch.id}</span>
          <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full border", LEVEL_CHIP[batch.level] || LEVEL_CHIP.Open)}>
            {batch.level}
          </span>
        </div>
        <p className="text-[14px] font-bold text-gray-900 truncate leading-snug">{batch.name}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[12px] text-gray-500">
            <Users size={12} className="shrink-0" />
            {studentCount}
          </span>
          {sched && (
            <span className="flex items-center gap-1 text-[12px] text-gray-500">
              <Clock size={11} className="shrink-0" />
              {sched}
            </span>
          )}
          {batch.meetingLink && (
            <a href={batch.meetingLink} target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[12px] text-brand-600 hover:underline">
              <Link2 size={11} />Link
            </a>
          )}
        </div>
      </div>

      {/* Coach */}
      <div className="hidden sm:flex flex-col justify-center w-28 shrink-0 pt-0.5">
        <p className="text-[12px] font-medium text-gray-500 truncate">{batch.coach || "—"}</p>
      </div>

      {/* Active badge */}
      <div className="shrink-0 pt-0.5">
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap",
          active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", active ? "bg-emerald-500" : "bg-red-500")} />
          {active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Manage + Delete — coach/admin only */}
      {canManage && (
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <span className="opacity-0 group-hover:opacity-100 text-[11px] font-bold text-brand-600 px-2 py-1 rounded-lg bg-brand-50 transition-all whitespace-nowrap">
            Manage
          </span>
          <button onClick={e => { e.stopPropagation(); onDelete(batch.id); }}
            className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── MyBatchesTab ──────────────────────────────────────────────────────────────

function MyBatchesTab({ batches, studentCounts, onAdd, onDelete, search, user, academyStudents, academyCoaches = [] }) {
  const [showAdd, setShowAdd]   = useState(false);
  const [selected, setSelected] = useState(null);

  const filtered = batches.filter(b =>
    !search ||
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.coach?.toLowerCase().includes(search.toLowerCase()) ||
    b.level?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave(form) {
    await onAdd(form);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[20px] font-black text-gray-900">Batches</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">{batches.length} batch{batches.length !== 1 ? "es" : ""}</p>
        </div>
        {(user?.role === "admin" || user?.role === "coach") && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold shadow-lg shadow-brand-500/20 transition-all">
            <Plus size={15} />Add Batch
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[28px] bg-white border border-gray-200 py-20 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-[20px] bg-brand-50 flex items-center justify-center mb-4">
            <Users size={28} className="text-brand-400" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-800">{search ? "No matches" : "No batches yet"}</h3>
          <p className="text-[13px] text-gray-400 mt-1.5 max-w-xs">
            {search ? "Try a different search term." : "Create your first batch to start organising students."}
          </p>
          {!search && (
            <button onClick={() => setShowAdd(true)}
              className="mt-5 h-10 px-5 rounded-xl bg-brand-600 text-white text-[13px] font-semibold">
              Add Batch
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/80">
            <p className="flex-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Batch</p>
            <p className="hidden sm:block w-28 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Coach</p>
            <p className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</p>
            <span className="w-24 shrink-0" />
          </div>
          {filtered.map(b => (
            <BatchRow
              key={b.id}
              batch={b}
              studentCount={studentCounts[b.id] || 0}
              onDelete={onDelete}
              onClick={() => (user?.role === "admin" || user?.role === "coach") ? setSelected(b) : null}
              canManage={user?.role === "admin" || user?.role === "coach"}
            />
          ))}
        </div>
      )}

      <AddBatchDrawer
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleSave}
        defaultCoach={user?.name || ""}
        coaches={academyCoaches}
      />

      <StudentManagementDrawer
        batch={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        academyStudents={academyStudents}
      />
    </>
  );
}

// ── StudentToggle (for ClassSessionDrawer attendance) ─────────────────────────

function StudentToggle({ student, present, onChange }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all",
      present === true  ? "bg-emerald-50 border-emerald-200" :
      present === false ? "bg-red-50 border-red-200"         : "bg-white border-gray-200"
    )}>
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-black shrink-0 transition-colors",
        present === true  ? "bg-emerald-500 text-white" :
        present === false ? "bg-red-400 text-white"     : "bg-gray-200 text-gray-600"
      )}>
        {student.avatar || student.name?.[0]?.toUpperCase()}
      </div>
      <p className="flex-1 text-[13px] font-bold text-gray-900 truncate">{student.name}</p>
      <div className="flex items-center gap-1.5 shrink-0">
        <button type="button" onClick={() => onChange(student.id, true)}
          className={cn("w-8 h-8 rounded-xl border flex items-center justify-center transition-all",
            present === true ? "bg-emerald-500 text-white border-emerald-500"
              : "bg-white text-gray-400 border-gray-200 hover:border-emerald-400 hover:text-emerald-500")}>
          <Check size={13} />
        </button>
        <button type="button" onClick={() => onChange(student.id, false)}
          className={cn("w-8 h-8 rounded-xl border flex items-center justify-center transition-all",
            present === false ? "bg-red-400 text-white border-red-400"
              : "bg-white text-gray-400 border-gray-200 hover:border-red-300 hover:text-red-400")}>
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

// ── ClassSessionDrawer ────────────────────────────────────────────────────────

function ClassSessionDrawer({ open, batch, date, academyId, onClose, onSessionSaved }) {
  const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}` : null;
  const dateLabel = date ? date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";

  const [tab,            setTab]            = useState("attendance");
  const [students,       setStudents]       = useState([]);
  const [present,        setPresent]        = useState({});
  const [session,        setSession]        = useState(null);
  const [form,           setForm]           = useState({ title: "", notes: "", pgnIds: [], pdfAttachments: [] });
  const [pgns,           setPgns]           = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const pgnFileRef = useRef(null);
  const pdfFileRef = useRef(null);

  useEffect(() => {
    if (!open || !batch || !dateStr) return;
    setLoading(true);
    setSaved(false);
    setTab("attendance");
    Promise.all([
      getBatchStudents(batch.id),
      getAttendanceByBatchDate(batch.id, dateStr),
      getClassSessionByBatchDate(batch.id, dateStr),
      getPgns(),
    ]).then(([sts, att, sess, allPgns]) => {
      setStudents(sts);
      const map = {};
      att.forEach(a => { map[a.studentId] = a.present; });
      setPresent(map);
      setSession(sess);
      setForm({
        title:          sess?.title          || "",
        notes:          sess?.notes          || "",
        pgnIds:         sess?.pgnIds         || [],
        pdfAttachments: sess?.pdfAttachments || [],
      });
      setPgns(allPgns);
      setLoading(false);
    });
  }, [open, batch?.id, dateStr]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!batch || !dateStr) return;
    setSaving(true);
    try {
      const pCount = students.filter(s => present[s.id] === true).length;
      const tCount = students.length;

      if (tCount > 0) {
        const records = students.map(s => ({
          batch_id:   batch.id,
          student_id: s.id,
          date:       dateStr,
          present:    present[s.id] !== undefined ? present[s.id] : true,
          academy_id: academyId || null,
        }));
        await upsertAttendance(records);
      }

      const payload = {
        batchId: batch.id, batchName: batch.name, academyId, date: dateStr,
        ...form,
        presentCount: tCount > 0 ? pCount : null,
        totalCount:   tCount > 0 ? tCount : null,
      };

      let saved;
      if (session?.id) {
        saved = await updateClassSession(session.id, payload);
        setSession(saved);
      } else {
        saved = await createClassSession(payload);
        setSession(saved);
      }
      if (onSessionSaved) onSessionSaved(saved);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Save session failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handlePgnFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const content = ev.target.result;
      const name = file.name.replace(/\.pgn$/i, "");
      const id = `PGN-${Date.now()}`;
      try {
        const created = await createPgn({ id, name, type: "class", content }, []);
        setPgns(prev => [...prev, created]);
        setForm(f => ({ ...f, pgnIds: [...f.pgnIds, created.id] }));
      } catch (err) { console.error("PGN upload failed:", err); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handlePdfFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("PDF must be under 5 MB"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setForm(f => ({
        ...f,
        pdfAttachments: [...f.pdfAttachments, { name: file.name, data: ev.target.result, size: file.size }],
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const presentCount = students.filter(s => present[s.id] === true).length;
  const absentCount  = students.filter(s => present[s.id] === false).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end"
        >
          <motion.aside
            initial={{ x: 560 }} animate={{ x: 0 }} exit={{ x: 560 }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="w-full max-w-[520px] bg-[#f6f8fc] h-full flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="shrink-0 bg-white border-b border-gray-200 px-6 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-500 mb-0.5">{dateLabel}</p>
                  <h2 className="text-[17px] font-black text-gray-900 truncate">{batch?.name}</h2>
                  {(batch?.coach || batch?.level) && (
                    <p className="text-[12px] text-gray-400 mt-0.5">{[batch.coach, batch.level].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
                <button onClick={onClose}
                  className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0 mt-1">
                  <X size={17} />
                </button>
              </div>
              {/* Tabs */}
              <div className="flex gap-0 border-b -mb-[1px]">
                {[["attendance","Attendance"],["session","Notes & Files"]].map(([id, label]) => (
                  <button key={id} onClick={() => setTab(id)}
                    className={cn("relative px-4 py-2.5 text-[13px] font-bold transition-colors",
                      tab === id ? "text-brand-600" : "text-gray-400 hover:text-gray-600")}>
                    {label}
                    {tab === id && (
                      <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-brand-600 rounded-t-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="w-7 h-7 rounded-full border-2 border-brand-300 border-t-brand-600 animate-spin" />
              </div>
            ) : tab === "attendance" ? (
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-2.5">
                {students.length > 0 && (
                  <div className="flex items-center gap-4 mb-3 px-1">
                    <span className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-600">
                      <Check size={12} strokeWidth={3} />{presentCount} present
                    </span>
                    <span className="flex items-center gap-1.5 text-[12px] font-bold text-red-500">
                      <X size={12} strokeWidth={2.5} />{absentCount} absent
                    </span>
                    <button type="button" onClick={() => {
                        const m = {};
                        students.forEach(s => { m[s.id] = true; });
                        setPresent(m);
                      }}
                      className="ml-auto text-[11px] font-bold text-brand-600 hover:underline">
                      Mark all present
                    </button>
                  </div>
                )}
                {students.length === 0 ? (
                  <div className="py-14 flex flex-col items-center text-center">
                    <Users size={32} className="text-gray-200 mb-3" />
                    <p className="text-[14px] font-bold text-gray-400">No students in this batch</p>
                    <p className="text-[12px] text-gray-400 mt-1">Add students via Batch management.</p>
                  </div>
                ) : students.map(s => (
                  <StudentToggle key={s.id} student={s} present={present[s.id]} onChange={(id, val) => setPresent(prev => ({ ...prev, [id]: val }))} />
                ))}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
                {/* Session title + notes */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Session</p>
                  <input
                    className="w-full h-11 rounded-2xl border border-gray-200 bg-white px-4 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                    placeholder="Session title (e.g. Endgame Techniques)"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                  <textarea
                    rows={5}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all resize-none"
                    placeholder="Topics covered, key ideas, homework reminders…"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                {/* PGN files */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">PGN Files</p>
                    <button type="button" onClick={() => pgnFileRef.current?.click()}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-brand-600 hover:text-brand-700 transition-colors">
                      <Upload size={11} />Upload PGN
                    </button>
                    <input ref={pgnFileRef} type="file" accept=".pgn" className="hidden" onChange={handlePgnFile} />
                  </div>
                  {pgns.length === 0 ? (
                    <p className="text-[12px] text-gray-400 px-1">No PGNs yet — upload one above.</p>
                  ) : (
                    <div className="space-y-2">
                      {pgns.map(pgn => {
                        const sel = form.pgnIds.includes(pgn.id);
                        return (
                          <button key={pgn.id} type="button"
                            onClick={() => setForm(f => ({
                              ...f,
                              pgnIds: sel ? f.pgnIds.filter(p => p !== pgn.id) : [...f.pgnIds, pgn.id],
                            }))}
                            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left",
                              sel ? "border-brand-500 bg-brand-50" : "border-gray-100 bg-white hover:border-gray-200")}>
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                              sel ? "bg-brand-500" : "bg-gray-100")}>
                              <FileText size={13} className={sel ? "text-white" : "text-gray-400"} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-gray-800 truncate">{pgn.name}</p>
                              {pgn.puzzleCount > 0 && <p className="text-[10px] text-gray-400">{pgn.puzzleCount} puzzles</p>}
                            </div>
                            {sel && <Check size={13} className="text-brand-500 shrink-0" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PDF attachments */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">PDF Attachments</p>
                    <button type="button" onClick={() => pdfFileRef.current?.click()}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-brand-600 hover:text-brand-700 transition-colors">
                      <Upload size={11} />Attach PDF
                    </button>
                    <input ref={pdfFileRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfFile} />
                  </div>
                  {form.pdfAttachments.length === 0 ? (
                    <p className="text-[12px] text-gray-400 px-1">No PDFs attached.</p>
                  ) : (
                    <div className="space-y-2">
                      {form.pdfAttachments.map((pdf, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-gray-100">
                          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                            <FileText size={13} className="text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-gray-800 truncate">{pdf.name}</p>
                            <p className="text-[10px] text-gray-400">{(pdf.size / 1024).toFixed(0)} KB</p>
                          </div>
                          <a href={pdf.data} download={pdf.name}
                            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500 shrink-0"
                            title="Download">
                            <Download size={13} />
                          </a>
                          <button type="button"
                            onClick={() => setForm(f => ({ ...f, pdfAttachments: f.pdfAttachments.filter((_, j) => j !== i) }))}
                            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors text-gray-400 shrink-0">
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="shrink-0 px-5 py-5 bg-white border-t border-gray-200 flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors text-[13px]">
                Close
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className={cn("flex-[2] h-12 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all",
                  saved ? "bg-emerald-500 text-white" : "bg-[#1a140f] hover:bg-[#2a201a] text-white",
                  saving && "opacity-60 cursor-wait")}>
                {saving ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : saved ? (
                  <><Check size={14} strokeWidth={3} />Saved</>
                ) : "Save Session"}
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Calendar views ─────────────────────────────────────────────────────────────

function attendanceColor(session) {
  if (!session || session.totalCount == null || session.totalCount === 0) return null;
  return session.presentCount >= session.totalCount * 0.5
    ? "bg-emerald-100 text-emerald-700"
    : "bg-red-100 text-red-700";
}

function attendanceBarColor(session) {
  if (!session || session.totalCount == null || session.totalCount === 0) return null;
  return session.presentCount >= session.totalCount * 0.5 ? "bg-emerald-500" : "bg-red-500";
}

function BatchChip({ batch, date, onClick, session }) {
  const jsDay = date.getDay();
  const dayVal = DAYS.find(d => d.js === jsDay)?.value;
  const time = batch.times?.[dayVal];
  const color = attendanceColor(session) || LEVEL_CAL[batch.level] || "bg-brand-100 text-brand-700";
  return (
    <div title={`${batch.name}${time ? " · " + fmtTime(time) : ""}`}
      onClick={onClick}
      className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate leading-tight cursor-pointer hover:opacity-75 transition-opacity", color)}>
      {time && <span className="opacity-60 mr-0.5">{fmtTime(time)}</span>}
      {batch.name}
    </div>
  );
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function MonthView({ cursor, batches, onBatchClick, sessionMap }) {
  const today = new Date();
  const grid  = getMonthGrid(cursor.getFullYear(), cursor.getMonth());

  return (
    <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} className="py-3 text-center text-[11px] font-bold uppercase tracking-wide text-gray-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((date, i) => {
          const inMonth  = date.getMonth() === cursor.getMonth();
          const isToday  = date.toDateString() === today.toDateString();
          const items    = batchesForDate(batches, date);
          return (
            <div key={i} className={cn(
              "min-h-[88px] p-2 border-b border-r border-gray-100",
              !inMonth && "bg-gray-50/60",
              i >= 35 && "border-b-0",
              (i + 1) % 7 === 0 && "border-r-0",
            )}>
              <span className={cn(
                "inline-flex w-6 h-6 items-center justify-center rounded-full text-[12px] font-bold mb-1",
                isToday  ? "bg-brand-600 text-white" :
                inMonth  ? "text-gray-700"           : "text-gray-300"
              )}>
                {date.getDate()}
              </span>
              <div className="space-y-0.5">
                {items.slice(0, 2).map(b => <BatchChip key={b.id} batch={b} date={date} onClick={() => onBatchClick(b, date)} session={sessionMap?.[`${b.id}_${dateKey(date)}`]} />)}
                {items.length > 2 && (
                  <p className="text-[9px] text-gray-400 pl-0.5">+{items.length - 2} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ cursor, batches, onBatchClick, sessionMap }) {
  const today = new Date();
  const week  = getWeekGrid(cursor);
  const cols  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  return (
    <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-[300px]">
        {week.map((date, i) => {
          const isToday = date.toDateString() === today.toDateString();
          const items   = batchesForDate(batches, date);
          return (
            <div key={i} className={cn("p-2.5", isToday && "bg-brand-50/60")}>
              <div className="text-center mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{cols[i]}</p>
                <span className={cn(
                  "inline-flex w-7 h-7 items-center justify-center rounded-full text-[14px] font-black mt-1",
                  isToday ? "bg-brand-600 text-white" : "text-gray-700"
                )}>
                  {date.getDate()}
                </span>
              </div>
              <div className="space-y-1.5">
                {items.length === 0 ? (
                  <p className="text-[11px] text-gray-300 text-center">—</p>
                ) : items.map(b => {
                  const jsDay = date.getDay();
                  const dv    = DAYS.find(d => d.js === jsDay)?.value;
                  const time  = b.times?.[dv];
                  return (
                    <div key={b.id} onClick={() => onBatchClick(b, date)}
                      className={cn("rounded-xl p-2 cursor-pointer hover:opacity-80 transition-opacity",
                        attendanceColor(sessionMap?.[`${b.id}_${dateKey(date)}`]) || LEVEL_CAL[b.level] || "bg-brand-100 text-brand-700")}>
                      {time && <p className="text-[10px] font-bold opacity-70 mb-0.5">{fmtTime(time)}</p>}
                      <p className="text-[11px] font-bold truncate leading-tight">{b.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ cursor, batches, studentCounts, onBatchClick, sessionMap }) {
  const jsDay = cursor.getDay();
  const dv    = DAYS.find(d => d.js === jsDay)?.value;
  const items = batchesForDate(batches, cursor).sort((a, b) => {
    const at = a.times?.[dv] || "00:00";
    const bt = b.times?.[dv] || "00:00";
    return at.localeCompare(bt);
  });

  return (
    <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
      {items.length === 0 ? (
        <div className="py-16 flex flex-col items-center text-center">
          <CalendarDays size={32} className="text-gray-200 mb-3" />
          <p className="text-[14px] text-gray-400">No batches scheduled this day</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map(b => {
            const time = b.times?.[dv];
            const sess = sessionMap?.[`${b.id}_${dateKey(cursor)}`];
            const barColor = attendanceBarColor(sess) || LEVEL_BAR[b.level] || "bg-brand-500";
            return (
              <div key={b.id} onClick={() => onBatchClick(b, cursor)}
                className="flex items-center gap-4 px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="w-20 shrink-0">
                  <p className="text-[14px] font-black text-gray-700">{time ? fmtTime(time) : "—"}</p>
                </div>
                <span className={cn("w-1 h-12 rounded-full shrink-0", barColor)} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-gray-900">{b.name}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">{b.coach || "—"} · {b.level}</p>
                </div>
                <span className="flex items-center gap-1.5 text-[13px] text-gray-500 shrink-0">
                  <Users size={13} />{studentCounts[b.id] || 0}
                </span>
                {b.meetingLink && (
                  <a href={b.meetingLink} target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="shrink-0 w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center hover:bg-brand-100 transition-colors">
                    <Link2 size={13} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalendarTab({ batches, studentCounts, academyId }) {
  const [viewMode,       setViewMode]       = useState("month");
  const [cursor,         setCursor]         = useState(new Date());
  const [coachFilter,    setCoach]          = useState("all");
  const [sessionTarget,  setSessionTarget]  = useState(null);
  const [sessions,       setSessions]       = useState([]);

  useEffect(() => {
    if (!academyId) return;
    getClassSessionsByAcademy(academyId).then(setSessions).catch(() => {});
  }, [academyId]);

  const sessionMap = useMemo(() => {
    const map = {};
    sessions.forEach(s => { map[`${s.batchId}_${s.date}`] = s; });
    return map;
  }, [sessions]);

  function handleSessionSaved(session) {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === session.id);
      return idx >= 0 ? prev.map((s, i) => i === idx ? session : s) : [...prev, session];
    });
  }

  const coaches = useMemo(() => [...new Set(batches.map(b => b.coach).filter(Boolean))], [batches]);

  const visible = useMemo(() => {
    let list = batches.filter(b => b.isActive !== false && b.days?.length > 0);
    if (coachFilter !== "all") list = list.filter(b => b.coach === coachFilter);
    return list;
  }, [batches, coachFilter]);

  function navigate(dir) {
    setCursor(prev => {
      const d = new Date(prev);
      if (viewMode === "month") d.setMonth(d.getMonth() + dir);
      else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  }

  function title() {
    if (viewMode === "month") return `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (viewMode === "week") {
      const w = getWeekGrid(cursor);
      return `${w[0].getDate()} ${MONTH_NAMES[w[0].getMonth()]} – ${w[6].getDate()} ${MONTH_NAMES[w[6].getMonth()]} ${w[6].getFullYear()}`;
    }
    return `${cursor.getDate()} ${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-gray-500 whitespace-nowrap">Coach:</span>
          <select value={coachFilter} onChange={e => setCoach(e.target.value)}
            className="h-9 px-3 pr-8 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-700 outline-none focus:border-brand-500">
            <option value="all">All Coaches</option>
            {coaches.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          {["day","week","month"].map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className={cn("px-4 py-2 text-[12px] font-bold capitalize transition-colors",
                viewMode === v ? "bg-brand-600 text-white" : "text-gray-500 hover:bg-gray-50")}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <ChevronLeft size={16} />
        </button>
        <h3 className="flex-1 text-center font-black text-[17px] text-gray-900">{title()}</h3>
        <button onClick={() => navigate(1)}
          className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <ChevronRight size={16} />
        </button>
      </div>

      {viewMode === "month" && <MonthView cursor={cursor} batches={visible} onBatchClick={(b, d) => setSessionTarget({ batch: b, date: d })} sessionMap={sessionMap} />}
      {viewMode === "week"  && <WeekView  cursor={cursor} batches={visible} onBatchClick={(b, d) => setSessionTarget({ batch: b, date: d })} sessionMap={sessionMap} />}
      {viewMode === "day"   && <DayView   cursor={cursor} batches={visible} studentCounts={studentCounts} onBatchClick={(b, d) => setSessionTarget({ batch: b, date: d })} sessionMap={sessionMap} />}

      <ClassSessionDrawer
        open={!!sessionTarget}
        batch={sessionTarget?.batch}
        date={sessionTarget?.date}
        academyId={academyId}
        onClose={() => setSessionTarget(null)}
        onSessionSaved={handleSessionSaved}
      />
    </>
  );
}

// ── PGN parser helpers ────────────────────────────────────────────────────────

function splitPgnGames(content) {
  if (!content) return [];
  const chunks = content.trim().split(/\n\n(?=\[)/);
  return chunks.filter(c => c.trim().startsWith("[") || c.trim().match(/^\d+\./));
}

function parsePgnGame(rawPgn) {
  try {
    const chess = new Chess();
    chess.loadPgn(rawPgn);
    // Extract header for title
    const eventMatch = rawPgn.match(/\[Event\s+"([^"]+)"\]/);
    const whiteMatch = rawPgn.match(/\[White\s+"([^"]+)"\]/);
    const title = (eventMatch?.[1] && eventMatch[1] !== "?")
      ? eventMatch[1]
      : (whiteMatch?.[1] && whiteMatch[1] !== "?")
        ? whiteMatch[1]
        : "Game";

    // Build move list with FENs and comments
    const replay = new Chess();
    const history = chess.history({ verbose: true });
    const commentsMap = {};
    chess.getComments().forEach(({ fen, comment }) => { commentsMap[fen] = comment; });

    const moves = history.map(move => {
      replay.move(move);
      const fen = replay.fen();
      return { san: move.san, fen, comment: commentsMap[fen] || null };
    });

    return { title, moves, startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" };
  } catch {
    return null;
  }
}

// ── PdfViewer ─────────────────────────────────────────────────────────────────

function PdfViewer({ pdfs, initialIndex = 0, title, onClose }) {
  const [idx, setIdx] = useState(initialIndex);
  const pdf = pdfs[idx];

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black/90">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-[#1a140f] border-b border-white/10">
        <div className="flex items-center gap-3">
          <FileText size={16} className="text-[#f97316]" />
          <div>
            <span className="text-[14px] font-bold text-white truncate block max-w-[400px]">
              {title || pdf?.name || "PDF"}
            </span>
            {pdfs.length > 1 && (
              <span className="text-[11px] text-white/40">File {idx + 1} of {pdfs.length}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pdfs.length > 1 && (
            <>
              <button onClick={() => setIdx(i => Math.max(0, i - 1))}
                disabled={idx === 0}
                className="w-9 h-9 rounded-xl border border-white/20 text-white flex items-center justify-center disabled:opacity-30 hover:bg-white/10 transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setIdx(i => Math.min(pdfs.length - 1, i + 1))}
                disabled={idx === pdfs.length - 1}
                className="w-9 h-9 rounded-xl border border-white/20 text-white flex items-center justify-center disabled:opacity-30 hover:bg-white/10 transition-colors">
                <ChevronRight size={15} />
              </button>
            </>
          )}
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#f97316] text-white flex items-center justify-center hover:bg-[#ea6c00] transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {pdf?.data ? (
          <embed src={pdf.data} type="application/pdf" className="w-full h-full" />
        ) : (
          <div className="flex items-center justify-center h-full text-white/40 text-[14px]">No PDF data</div>
        )}
      </div>
    </div>
  );
}

// ── PgnViewer ─────────────────────────────────────────────────────────────────

function PgnViewer({ pgn, title, onClose }) {
  const { user }         = useAuth();
  const boardTheme       = BOARD_THEMES.find(t => t.id === (user?.settings?.boardTheme ?? "brown")) || BOARD_THEMES[0];
  const [chapters,       setChapters]   = useState([]);
  const [chapterIdx,     setChapterIdx] = useState(0);
  const [moveIdx,        setMoveIdx]    = useState(-1);
  const moveListRef                      = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const games  = splitPgnGames(pgn?.content || "");
    const parsed = games.map(parsePgnGame).filter(Boolean);
    setChapters(parsed.length
      ? parsed
      : [{ title: pgn?.name || "Game", moves: [], startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" }]
    );
    setChapterIdx(0);
    setMoveIdx(-1);
  }, [pgn]);

  const chapter       = chapters[chapterIdx];
  const totalMoves    = chapter?.moves.length ?? 0;
  const currentFen    = moveIdx < 0 ? chapter?.startFen : chapter?.moves[moveIdx]?.fen;
  const currentComment = moveIdx >= 0 ? chapter?.moves[moveIdx]?.comment : null;

  function goTo(i) {
    setMoveIdx(Math.max(-1, Math.min(totalMoves - 1, i)));
  }

  // Keyboard navigation
  useEffect(() => {
    function onKeyNav(e) {
      if (e.key === "ArrowLeft")  goTo(moveIdx - 1);
      if (e.key === "ArrowRight") goTo(moveIdx + 1);
    }
    window.addEventListener("keydown", onKeyNav);
    return () => window.removeEventListener("keydown", onKeyNav);
  }, [moveIdx, totalMoves]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll active move into view in move list
  useEffect(() => {
    if (!moveListRef.current) return;
    const active = moveListRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [moveIdx]);

  function movePairs(moves) {
    const pairs = [];
    for (let i = 0; i < moves.length; i += 2)
      pairs.push({ num: Math.floor(i / 2) + 1, w: moves[i], b: moves[i + 1] });
    return pairs;
  }

  const navBtnCls = "w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-600 flex items-center justify-center hover:border-[#f97316] hover:text-[#f97316] transition-colors disabled:opacity-30 disabled:pointer-events-none shadow-sm";

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-[#f6f8fc]">

      {/* Header — same dark bar as the app header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 bg-[#1a140f] border-b-2 border-[#1a140f]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center shrink-0">
            <BookOpen size={14} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-black text-white leading-tight">{title || pgn?.name || "PGN Viewer"}</p>
            {chapter && <p className="text-[11px] text-white/40">{chapter.title}</p>}
          </div>
        </div>
        <button onClick={onClose}
          className="h-9 px-4 rounded-xl bg-[#f97316] hover:bg-[#ea6c00] text-white text-[13px] font-bold flex items-center gap-1.5 transition-colors">
          <X size={13} />Close
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* ── Left: board + nav + move list ── */}
        <div className="flex flex-col min-h-0 flex-1 p-5 gap-4 overflow-y-auto">

          {/* Board */}
          <div className="flex justify-center">
            <div className="w-full max-w-[460px]">
              <div className="rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
                {currentFen && (
                  <Chessboard options={{
                    position:       currentFen,
                    allowDragging:  false,
                    darkSquareStyle:  { backgroundColor: boardTheme.dark },
                    lightSquareStyle: { backgroundColor: boardTheme.light },
                    boardStyle:       { borderRadius: 0 },
                  }} />
                )}
              </div>
            </div>
          </div>

          {/* Navigation controls */}
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => goTo(-1)} disabled={moveIdx < 0} className={navBtnCls} title="Start">
              <ChevronLeft size={13} /><ChevronLeft size={13} className="-ml-2" />
            </button>
            <button onClick={() => goTo(moveIdx - 1)} disabled={moveIdx < 0} className={navBtnCls} title="Previous">
              <ChevronLeft size={16} />
            </button>
            <div className="w-24 h-9 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
              <span className="text-[12px] font-bold text-gray-500">
                {moveIdx < 0 ? "Start" : `${moveIdx + 1} / ${totalMoves}`}
              </span>
            </div>
            <button onClick={() => goTo(moveIdx + 1)} disabled={moveIdx >= totalMoves - 1} className={navBtnCls} title="Next">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => goTo(totalMoves - 1)} disabled={moveIdx >= totalMoves - 1} className={navBtnCls} title="End">
              <ChevronRight size={13} /><ChevronRight size={13} className="-ml-2" />
            </button>
          </div>

          {/* Move list */}
          {chapter && totalMoves > 0 && (
            <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-3">Moves</p>
              <div ref={moveListRef} className="flex flex-wrap gap-x-0.5 gap-y-0.5 max-h-[180px] overflow-y-auto">
                {movePairs(chapter.moves).map(({ num, w, b }) => (
                  <span key={num} className="flex items-center">
                    <span className="text-[11px] text-gray-300 px-1 select-none font-mono">{num}.</span>
                    <button
                      data-active={moveIdx === (num - 1) * 2}
                      onClick={() => goTo((num - 1) * 2)}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[13px] font-mono font-semibold transition-colors",
                        moveIdx === (num - 1) * 2
                          ? "bg-[#f97316] text-white shadow-sm"
                          : "text-gray-700 hover:bg-orange-50 hover:text-[#f97316]"
                      )}>
                      {w.san}
                      {w.comment && <span className="ml-0.5 inline-block w-1.5 h-1.5 rounded-full bg-[#f97316] align-middle" />}
                    </button>
                    {b && (
                      <button
                        data-active={moveIdx === (num - 1) * 2 + 1}
                        onClick={() => goTo((num - 1) * 2 + 1)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[13px] font-mono font-semibold transition-colors",
                          moveIdx === (num - 1) * 2 + 1
                            ? "bg-[#f97316] text-white shadow-sm"
                            : "text-gray-700 hover:bg-orange-50 hover:text-[#f97316]"
                        )}>
                        {b.san}
                        {b.comment && <span className="ml-0.5 inline-block w-1.5 h-1.5 rounded-full bg-[#f97316] align-middle" />}
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: chapters + comment ── */}
        <div className="w-[280px] shrink-0 border-l-2 border-gray-200 flex flex-col min-h-0 bg-white">

          {/* Chapters */}
          <div className="shrink-0 border-b border-gray-100">
            <div className="px-4 py-3 flex items-center gap-2 bg-gray-50/80 border-b border-gray-100">
              <BookOpen size={13} className="text-[#f97316]" />
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-500">Chapters</span>
              <span className="ml-auto text-[11px] text-gray-400">{chapters.length}</span>
            </div>
            <div className="overflow-y-auto max-h-[220px]">
              {chapters.map((ch, i) => (
                <button key={i}
                  onClick={() => { setChapterIdx(i); setMoveIdx(-1); }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-[13px] transition-colors border-b border-gray-50 last:border-0 flex items-center gap-2",
                    i === chapterIdx
                      ? "bg-orange-50 text-[#f97316] font-bold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}>
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                    i === chapterIdx ? "bg-[#f97316] text-white" : "bg-gray-100 text-gray-400"
                  )}>{i + 1}</span>
                  <span className="truncate">{ch.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Comment — only current move's comment */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="px-4 py-3 flex items-center gap-2 bg-gray-50/80 border-b border-gray-100 shrink-0">
              <MessageSquare size={13} className="text-[#f97316]" />
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-500">Comment</span>
            </div>
            <div className="flex-1 p-4">
              <AnimatePresence mode="wait">
                {currentComment ? (
                  <motion.div key={`comment-${moveIdx}`}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}>
                    <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-[#f97316] flex items-center justify-center shrink-0">
                          <MessageSquare size={11} className="text-white" />
                        </div>
                        <span className="text-[11px] font-bold text-orange-600">
                          After {chapter?.moves[moveIdx]?.san}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-700 leading-relaxed">{currentComment}</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="no-comment"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full py-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <MessageSquare size={16} className="text-gray-300" />
                    </div>
                    <p className="text-[12px] text-gray-400">
                      {moveIdx < 0
                        ? "Navigate moves to see comments"
                        : "No comment on this move"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BatchHistoryDrawer ────────────────────────────────────────────────────────

function BatchHistoryDrawer({ batch, studentId, onClose }) {
  const [sessions,   setSessions]   = useState([]);
  const [attMap,     setAttMap]     = useState({});  // date → { present }
  const [loading,    setLoading]    = useState(true);
  const [pdfTarget,  setPdfTarget]  = useState(null); // { pdfs, idx }
  const [pgnTarget,  setPgnTarget]  = useState(null); // { pgn }

  useEffect(() => {
    if (!batch?.id) return;
    Promise.all([
      getClassSessionsByBatch(batch.id),
      getAttendanceByBatch(batch.id),
    ]).then(([sess, att]) => {
      setSessions(sess);
      const map = {};
      att.filter(a => String(a.studentId) === String(studentId))
         .forEach(a => { map[a.date] = a; });
      setAttMap(map);
      setLoading(false);
    });
  }, [batch?.id, studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function openNotes(session) {
    if (session.pgnIds?.length > 0) {
      const pgns = await getPgnsByIds(session.pgnIds);
      if (pgns.length > 0) {
        setPgnTarget({ pgn: pgns[0], title: session.title });
        return;
      }
    }
    if (session.pdfAttachments?.length > 0) {
      setPdfTarget({ pdfs: session.pdfAttachments, idx: 0, title: session.title });
    }
  }

  const hasNotes = (s) => (s.pgnIds?.length > 0) || (s.pdfAttachments?.length > 0) || s.notes;

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="bh-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-[150]"
          onClick={onClose}
        />
        <motion.aside
          key="bh-drawer"
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed right-0 top-0 bottom-0 w-full max-w-[640px] bg-white z-[160] flex flex-col shadow-2xl"
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-[17px] font-black text-gray-900">{batch?.name}</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">Session history & notes</p>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <span className="w-7 h-7 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                <CalendarDays size={36} className="text-gray-200 mb-3" />
                <p className="text-[15px] font-bold text-gray-500">No sessions yet</p>
                <p className="text-[13px] text-gray-400 mt-1">Sessions will appear here once your coach records them.</p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Topic</th>
                    <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Attended</th>
                    <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sessions.map(s => {
                    const att = attMap[s.date];
                    const attended = att ? att.present : null;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-3.5 text-gray-600 font-medium whitespace-nowrap">
                          {new Date(s.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3.5 text-gray-800 font-semibold max-w-[180px] truncate">
                          {s.title || <span className="text-gray-300 font-normal">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {attended === null ? (
                            <span className="text-gray-300 text-[11px]">—</span>
                          ) : attended ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                              <Check size={10} strokeWidth={3} />Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-bold">
                              <X size={10} strokeWidth={3} />No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {hasNotes(s) ? (
                            <div className="flex items-center justify-center gap-1.5">
                              {s.pgnIds?.length > 0 && (
                                <button
                                  onClick={() => openNotes(s)}
                                  className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 text-[11px] font-bold transition-colors">
                                  <BookOpen size={11} />PGN
                                </button>
                              )}
                              {s.pdfAttachments?.length > 0 && (
                                <button
                                  onClick={() => setPdfTarget({ pdfs: s.pdfAttachments, idx: 0 })}
                                  className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-bold transition-colors">
                                  <FileText size={11} />PDF
                                </button>
                              )}
                              {!s.pgnIds?.length && !s.pdfAttachments?.length && s.notes && (
                                <span className="text-[12px] text-gray-500 italic max-w-[160px] truncate">{s.notes}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.aside>
      </AnimatePresence>

      {pdfTarget && (
        <PdfViewer
          pdfs={pdfTarget.pdfs}
          initialIndex={pdfTarget.idx}
          title={pdfTarget.title}
          onClose={() => setPdfTarget(null)}
        />
      )}

      {pgnTarget && (
        <PgnViewer
          pgn={pgnTarget.pgn}
          title={pgnTarget.title}
          onClose={() => setPgnTarget(null)}
        />
      )}
    </>
  );
}

// ── Student: read-only enrolled batches view ──────────────────────────────────

function StudentBatchesView({ search }) {
  const { user }          = useAuth();
  const [batches,         setBatches]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [selectedBatch,   setSelectedBatch]   = useState(null);

  useEffect(() => {
    getBatchesForStudent(user?.id).then(b => { setBatches(b); setLoading(false); });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = batches.filter(b =>
    !search ||
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.level?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <span className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">
        <div className="mb-6">
          <h2 className="text-[20px] font-black text-gray-900">My Batches</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">Classes you&apos;re enrolled in</p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[28px] bg-white border border-gray-200 py-20 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-[20px] bg-brand-50 flex items-center justify-center mb-4">
              <Users size={28} className="text-brand-400" />
            </div>
            <h3 className="text-[16px] font-bold text-gray-800">Not enrolled yet</h3>
            <p className="text-[13px] text-gray-400 mt-1.5 max-w-xs">
              Your coach will add you to a batch. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(b => (
              <StudentBatchCard
                key={b.id}
                batch={b}
                onClick={() => setSelectedBatch(b)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedBatch && (
        <BatchHistoryDrawer
          batch={selectedBatch}
          studentId={user?.id}
          onClose={() => setSelectedBatch(null)}
        />
      )}
    </div>
  );
}

function StudentBatchCard({ batch, onClick }) {
  const sched = scheduleSummary(batch);
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-[20px] border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden">

      {/* Color bar */}
      <div className={cn("h-1.5 w-full", LEVEL_BAR[batch.level] || "bg-gray-300")} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full border", LEVEL_CHIP[batch.level] || LEVEL_CHIP.Open)}>
                {batch.level}
              </span>
            </div>
            <h3 className="text-[15px] font-black text-gray-900 leading-tight truncate">{batch.name}</h3>
          </div>
        </div>

        {batch.coach && (
          <p className="text-[12px] text-gray-500 mb-2">
            <span className="text-gray-400">Coach:</span> {batch.coach}
          </p>
        )}
        {sched && (
          <p className="flex items-center gap-1 text-[12px] text-gray-500 mb-4">
            <Clock size={11} className="shrink-0 text-gray-400" />{sched}
          </p>
        )}

        <div className="flex items-center gap-2 mt-auto pt-1">
          <button
            onClick={e => { e.stopPropagation(); onClick(); }}
            className="flex-1 h-8 rounded-xl bg-gray-50 border border-gray-200 text-[12px] font-bold text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1">
            <CalendarDays size={12} />View History
          </button>
          {batch.meetingLink && (
            <a
              href={batch.meetingLink}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex-1 h-8 rounded-xl bg-brand-500 text-white text-[12px] font-bold hover:bg-brand-600 transition-colors flex items-center justify-center gap-1">
              <ExternalLink size={12} />Join
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Coach/Admin batches view ──────────────────────────────────────────────────

function CoachAdminBatchesView({ search }) {
  const { user }         = useAuth();
  const [allAcademies,    setAllAcademies]    = useState([]);  // [{id, name, logo, isOwn}]
  const [selectedId,      setSelectedId]      = useState(null);
  const [academiesReady,  setAcademiesReady]  = useState(false);
  const [batches,         setBatches]         = useState([]);
  const [studentCounts,   setStudentCounts]   = useState({});
  const [academyStudents, setAcademyStudents] = useState([]);
  const [academyCoaches,  setAcademyCoaches]  = useState([]);
  const [tab,             setTab]             = useState("batches");

  // Phase 1 — discover which academies this coach belongs to
  useEffect(() => {
    if (!user?.id) return;
    if (user?.role !== "coach") {
      setAcademiesReady(true);  // admin: skip, load all batches
      return;
    }
    Promise.all([getAcademies(), getCoachAcademies(user.id)]).then(([allAc, invs]) => {
      const list = [];
      const own = allAc.find(a => String(a.mainCoachId) === String(user.id));
      if (own) list.push({ id: own.id, name: own.name, logo: own.logo, isOwn: true });
      invs.forEach(inv => {
        if (!list.find(a => String(a.id) === String(inv.academyId)))
          list.push({ id: inv.academyId, name: inv.academyName, logo: inv.academyLogo, isOwn: false });
      });
      setAllAcademies(list);
      const activeId = user?.settings?.activeAcademyId;
      const def = list.find(a => String(a.id) === String(activeId)) || list[0];
      setSelectedId(def?.id ?? null);
      setAcademiesReady(true);
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2 — load batches for selected academy (re-runs when academy selection changes)
  useEffect(() => {
    if (!academiesReady) return;
    const id = selectedId;
    const batchLoader   = id ? getBatchesByAcademy(id) : getBatches();
    const profileLoader = id ? getProfilesByAcademy(id) : getProfiles();
    Promise.all([batchLoader, profileLoader, getBatchStudentCounts()])
      .then(([b, profiles, counts]) => {
        setBatches(b);
        setAcademyStudents(profiles);
        setStudentCounts(counts);
      });
    if (id) {
      getAcademyInvitations(id).then(invs => {
        const coaches = invs
          .filter(i => i.status === "accepted")
          .map(i => ({ id: i.coachId, name: i.coachName }));
        if (user?.id && !coaches.find(c => String(c.id) === String(user.id)))
          coaches.unshift({ id: user.id, name: user.name });
        setAcademyCoaches(coaches);
      });
    } else if (user?.id) {
      setAcademyCoaches([{ id: user.id, name: user.name }]);
    }
  }, [academiesReady, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync when active academy is changed via ProfilePage
  useEffect(() => {
    function sync() {
      const activeId = JSON.parse(localStorage.getItem("caUser") || "{}").settings?.activeAcademyId;
      if (activeId) {
        const match = allAcademies.find(a => String(a.id) === String(activeId));
        if (match) setSelectedId(match.id);
      }
    }
    window.addEventListener("ca-logo-update", sync);
    return () => window.removeEventListener("ca-logo-update", sync);
  }, [allAcademies]);

  async function handleAddBatch(batch) {
    const id = `B-${Date.now()}`;
    const created = await createBatch({
      ...batch,
      id,
      students: [],
      academyId: selectedId || null,
      coachId:   batch.coachId || (user?.role === "coach" ? user?.id : null),
    });
    setBatches(prev => [...prev, created]);
  }

  async function handleDeleteBatch(id) {
    await deleteBatch(id);
    setBatches(prev => prev.filter(b => b.id !== id));
    setStudentCounts(prev => { const c = { ...prev }; delete c[id]; return c; });
  }

  const selectedAcademy = allAcademies.find(a => String(a.id) === String(selectedId));

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">

        {/* Academy selector — only shown when coach is in multiple academies */}
        {allAcademies.length > 1 && (
          <div className="mb-6">
            <div className="relative inline-flex items-center max-w-xs w-full">
              {selectedAcademy?.logo && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full overflow-hidden pointer-events-none shrink-0">
                  <img src={selectedAcademy.logo} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <select
                value={String(selectedId || "")}
                onChange={e => setSelectedId(Number(e.target.value) || e.target.value)}
                className={cn(
                  "w-full h-10 rounded-2xl border border-gray-200 bg-white pr-9 text-[13px] font-bold text-gray-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all appearance-none cursor-pointer shadow-sm",
                  selectedAcademy?.logo ? "pl-10" : "pl-4"
                )}
              >
                {allAcademies.map(a => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name}{a.isOwn ? " (Your academy)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="flex items-center border-b-2 border-gray-200 mb-7 gap-0">
          {[["batches", "Batches"], ["calendar", "Calendar"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                "relative px-5 py-3 text-[14px] font-bold transition-colors",
                tab === id ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
              )}>
              {label}
              {tab === id && (
                <motion.span
                  layoutId="batch-tab-line"
                  className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-brand-600 rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {tab === "batches" && (
          <MyBatchesTab
            batches={batches}
            studentCounts={studentCounts}
            onAdd={handleAddBatch}
            onDelete={handleDeleteBatch}
            search={search}
            user={user}
            academyStudents={academyStudents}
            academyCoaches={academyCoaches}
          />
        )}
        {tab === "calendar" && (
          <CalendarTab batches={batches} studentCounts={studentCounts} academyId={selectedId} />
        )}
      </div>
    </div>
  );
}

// ── Main page entry ───────────────────────────────────────────────────────────

export default function BatchesPage({ search }) {
  const { user } = useAuth();
  if (user?.role === "student") return <StudentBatchesView search={search} />;
  return <CoachAdminBatchesView search={search} />;
}
