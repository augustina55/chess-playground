import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Users, Trash2, X, Link2, CalendarDays,
  ChevronLeft, ChevronRight, Clock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

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

function useBatches() {
  const [batches, setBatches] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ca_batches") || "[]"); } catch { return []; }
  });
  function save(b) { setBatches(b); localStorage.setItem("ca_batches", JSON.stringify(b)); }
  return [batches, save];
}

function genCode(n) {
  return "B-" + String(n + 1).padStart(3, "0");
}

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

function AddBatchDrawer({ open, onClose, onSave, defaultCoach }) {
  const blank = { name: "", coach: defaultCoach || "", level: "Beginner", days: [], times: {}, meetingLink: "", isActive: true };
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

                <Field label="Coach Name">
                  <input className={inputCls} value={form.coach}
                    onChange={e => setForm(f => ({ ...f, coach: e.target.value }))}
                    placeholder="Coach name" />
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

// ── BatchRow ──────────────────────────────────────────────────────────────────

function BatchRow({ batch, onDelete }) {
  const active = batch.isActive !== false;
  const sched  = scheduleSummary(batch);

  return (
    <div className="group flex items-start gap-4 px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
      {/* Left: code + name + level */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-black text-gray-400 tracking-wider">{batch.id}</span>
          <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full border", LEVEL_CHIP[batch.level] || LEVEL_CHIP.Open)}>
            {batch.level}
          </span>
        </div>
        <p className="text-[14px] font-bold text-gray-900 truncate leading-snug">{batch.name}</p>
        {/* Student count + schedule (secondary row) */}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[12px] text-gray-500">
            <Users size={12} className="shrink-0" />
            {batch.students?.length || 0}
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

      {/* Delete */}
      <button onClick={() => onDelete(batch.id)}
        className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-all shrink-0 mt-0.5">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── MyBatchesTab ──────────────────────────────────────────────────────────────

function MyBatchesTab({ batches, saveBatches, search, user }) {
  const [showAdd, setShowAdd] = useState(false);

  const filtered = batches.filter(b =>
    !search ||
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.coach?.toLowerCase().includes(search.toLowerCase()) ||
    b.level?.toLowerCase().includes(search.toLowerCase())
  );

  function handleSave(form) {
    saveBatches([...batches, {
      ...form,
      id: genCode(batches.length),
      students: [],
      createdAt: new Date().toLocaleDateString(),
    }]);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[20px] font-black text-gray-900">My Batches</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">{batches.length} batch{batches.length !== 1 ? "es" : ""}</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold shadow-lg shadow-brand-500/20 transition-all">
          <Plus size={15} />Add Batch
        </button>
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
          {/* Table header */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/80">
            <p className="flex-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Batch</p>
            <p className="hidden sm:block w-28 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Coach</p>
            <p className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</p>
            <span className="w-8 shrink-0" />
          </div>
          {filtered.map(b => (
            <BatchRow key={b.id} batch={b} onDelete={id => saveBatches(batches.filter(x => x.id !== id))} />
          ))}
        </div>
      )}

      <AddBatchDrawer
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleSave}
        defaultCoach={user?.name || ""}
      />
    </>
  );
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

function BatchChip({ batch, date }) {
  const jsDay = date.getDay();
  const dayVal = DAYS.find(d => d.js === jsDay)?.value;
  const time = batch.times?.[dayVal];
  return (
    <div title={`${batch.name}${time ? " · " + fmtTime(time) : ""}`}
      className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate leading-tight",
        LEVEL_CAL[batch.level] || "bg-brand-100 text-brand-700")}>
      {time && <span className="opacity-60 mr-0.5">{fmtTime(time)}</span>}
      {batch.name}
    </div>
  );
}

function MonthView({ cursor, batches }) {
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
                {items.slice(0, 2).map(b => <BatchChip key={b.id} batch={b} date={date} />)}
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

function WeekView({ cursor, batches }) {
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
                    <div key={b.id} className={cn("rounded-xl p-2", LEVEL_CAL[b.level] || "bg-brand-100 text-brand-700")}>
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

function DayView({ cursor, batches }) {
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
            return (
              <div key={b.id} className="flex items-center gap-4 px-6 py-5">
                <div className="w-20 shrink-0">
                  <p className="text-[14px] font-black text-gray-700">{time ? fmtTime(time) : "—"}</p>
                </div>
                <span className={cn("w-1 h-12 rounded-full shrink-0", LEVEL_BAR[b.level] || "bg-brand-500")} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-gray-900">{b.name}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">{b.coach || "—"} · {b.level}</p>
                </div>
                <span className="flex items-center gap-1.5 text-[13px] text-gray-500 shrink-0">
                  <Users size={13} />
                  {b.students?.length || 0}
                </span>
                {b.meetingLink && (
                  <a href={b.meetingLink} target="_blank" rel="noreferrer"
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

// ── CalendarTab ───────────────────────────────────────────────────────────────

function CalendarTab({ batches }) {
  const [viewMode, setViewMode] = useState("month");
  const [cursor, setCursor]     = useState(new Date());
  const [coachFilter, setCoach] = useState("all");

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
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        {/* Coach filter */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-gray-500 whitespace-nowrap">Coach:</span>
          <select value={coachFilter} onChange={e => setCoach(e.target.value)}
            className="h-9 px-3 pr-8 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-700 outline-none focus:border-brand-500">
            <option value="all">All Coaches</option>
            {coaches.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* View mode toggle */}
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

      {/* Navigation */}
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

      {viewMode === "month" && <MonthView cursor={cursor} batches={visible} />}
      {viewMode === "week"  && <WeekView  cursor={cursor} batches={visible} />}
      {viewMode === "day"   && <DayView   cursor={cursor} batches={visible} />}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BatchesPage({ search }) {
  const { user }             = useAuth();
  const [batches, saveBatches] = useBatches();
  const [tab, setTab]          = useState("batches");

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">

        {/* Tabs */}
        <div className="flex items-center border-b-2 border-gray-200 mb-7 gap-0">
          {[["batches", "My Batches"], ["calendar", "Calendar"]].map(([id, label]) => (
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
          <MyBatchesTab batches={batches} saveBatches={saveBatches} search={search} user={user} />
        )}
        {tab === "calendar" && (
          <CalendarTab batches={batches} />
        )}
      </div>
    </div>
  );
}
