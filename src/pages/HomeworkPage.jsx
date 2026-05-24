import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, BookOpen, ChevronLeft, Trash2, Calendar, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

function useSaved(key, def = []) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; }
  });
  function save(v) { setVal(v); localStorage.setItem(key, JSON.stringify(v)); }
  return [val, save];
}

const inputCls = "w-full px-4 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-slate-50/80 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-sm transition-colors";

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

export default function HomeworkPage({ search }) {
  const { user } = useAuth();
  const [homework, saveHomework] = useSaved("ca_homework");
  const [batches]  = useSaved("ca_batches");
  const [pgns]     = useSaved("ca_pgns");
  const [view, setView] = useState("list");
  const [form, setForm] = useState({ title: "", batchId: "", pgnId: "", dueDate: "", notes: "" });

  const filtered = homework.filter(hw =>
    !search || hw.title.toLowerCase().includes(search.toLowerCase()) || hw.batchName?.toLowerCase().includes(search.toLowerCase())
  );

  function assign(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.batchId) return;
    const batch = batches.find(b => b.id === form.batchId);
    const pgn   = pgns.find(p => p.id === form.pgnId);
    saveHomework([...homework, {
      id: `HW-${String(homework.length + 1).padStart(3, "0")}`,
      title: form.title, batchId: form.batchId,
      batchName: batch?.name || "—",
      pgnId: form.pgnId, pgnName: pgn?.name || "—",
      dueDate: form.dueDate, notes: form.notes,
      assignedBy: user?.name, createdAt: new Date().toLocaleDateString(),
    }]);
    setForm({ title: "", batchId: "", pgnId: "", dueDate: "", notes: "" });
    setView("list");
  }

  if (view === "assign") return (
    <div className="p-6 md:p-8 page-enter max-w-lg">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => setView("list")} className="p-2.5 rounded-2xl hover:bg-white/80 dark:hover:bg-slate-800 text-slate-500 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Assign Homework</h1>
      </div>
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={assign}
        className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] space-y-5"
      >
        <Field label="Title">
          <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Opening Principles Week 1" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Batch">
            <select className={inputCls} value={form.batchId} onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))}>
              <option value="">Select batch…</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.id} — {b.name}</option>)}
            </select>
          </Field>
          <Field label="PGN (optional)">
            <select className={inputCls} value={form.pgnId} onChange={e => setForm(f => ({ ...f, pgnId: e.target.value }))}>
              <option value="">No PGN</option>
              {pgns.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Due Date">
          <input type="date" className={inputCls} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </Field>
        <Field label="Notes (optional)">
          <textarea className={cn(inputCls, "resize-none")} rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Instructions for students…" />
        </Field>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => setView("list")} className="flex-1 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button type="submit" className="flex-1 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-sm">Assign</button>
        </div>
      </motion.form>
    </div>
  );

  return (
    <div className="p-6 md:p-8 page-enter">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Homework</h1>
          <p className="text-[14px] text-slate-400 mt-1">{homework.length} assignment{homework.length !== 1 ? "s" : ""}</p>
        </div>
        {user?.role !== "student" && (
          <button onClick={() => setView("assign")} className="flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white text-[14px] font-semibold rounded-2xl shadow-sm transition-colors">
            <Plus size={16} />Assign
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center mb-5 shadow-[var(--shadow-card)]">
            <BookOpen size={26} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="font-semibold text-slate-500 dark:text-slate-400 text-[15px]">{search ? "No homework matches your search" : "No homework assigned yet"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...filtered].reverse().map((hw, i) => (
            <motion.div
              key={hw.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] overflow-hidden group"
            >
              <div className="flex gap-5 p-7">
                <div className="w-1.5 rounded-full bg-brand-500 shrink-0 self-stretch min-h-[3rem]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{hw.id}</span>
                      <h3 className="font-bold text-[16px] text-slate-900 dark:text-white leading-snug mt-0.5">{hw.title}</h3>
                    </div>
                    {hw.dueDate && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0 whitespace-nowrap">
                        <Calendar size={10} />Due {hw.dueDate}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-400 mb-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-brand-400 inline-block" />{hw.batchName}
                    </span>
                    {hw.pgnId && <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />{hw.pgnName}
                    </span>}
                    <span className="flex items-center gap-1.5"><User size={11} />{hw.assignedBy}</span>
                  </div>
                  {hw.notes && <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-2 line-clamp-2">{hw.notes}</p>}
                </div>
                {user?.role !== "student" && (
                  <button
                    onClick={() => saveHomework(homework.filter(h => h.id !== hw.id))}
                    className="opacity-0 group-hover:opacity-100 self-start p-2 rounded-xl text-terra-500 hover:bg-terra-50 dark:hover:bg-terra-900/30 transition-all shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
