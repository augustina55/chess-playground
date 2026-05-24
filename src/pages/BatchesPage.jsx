import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Users, ChevronLeft, Trash2, UserPlus } from "lucide-react";
import { cn } from "../lib/utils";

function useBatches() {
  const [batches, setBatches] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ca_batches") || "[]"); } catch { return []; }
  });
  function save(b) { setBatches(b); localStorage.setItem("ca_batches", JSON.stringify(b)); }
  return [batches, save];
}

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Open"];
const LEVEL_COLORS = {
  Beginner:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  Intermediate: "bg-brand-100  text-brand-700  dark:bg-brand-900/40  dark:text-brand-400",
  Advanced:     "bg-terra-100  text-terra-700  dark:bg-terra-900/40  dark:text-terra-500",
  Open:         "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
};

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-4 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-slate-50/80 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-sm transition-colors";

export default function BatchesPage({ search }) {
  const [batches, saveBatches] = useBatches();
  const [view, setView]        = useState("list");
  const [selected, setSelected] = useState(null);
  const [form, setForm]        = useState({ name: "", level: "Beginner", description: "" });
  const [studentInput, setStudentInput] = useState("");

  const filtered = batches.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.level.toLowerCase().includes(search.toLowerCase())
  );

  function createBatch(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    saveBatches([...batches, {
      id: `B-${String(batches.length + 1).padStart(3, "0")}`,
      name: form.name, level: form.level, description: form.description,
      students: [], createdAt: new Date().toLocaleDateString(),
    }]);
    setForm({ name: "", level: "Beginner", description: "" });
    setView("list");
  }

  function deleteBatch(id) {
    saveBatches(batches.filter(b => b.id !== id));
    if (selected?.id === id) { setSelected(null); setView("list"); }
  }

  function addStudent(e) {
    e.preventDefault();
    if (!studentInput.trim() || !selected) return;
    const updated = batches.map(b =>
      b.id === selected.id ? { ...b, students: [...(b.students || []), { id: Date.now(), name: studentInput.trim() }] } : b
    );
    saveBatches(updated);
    setSelected(updated.find(b => b.id === selected.id));
    setStudentInput("");
  }

  function removeStudent(sid) {
    const updated = batches.map(b =>
      b.id === selected.id ? { ...b, students: b.students.filter(s => s.id !== sid) } : b
    );
    saveBatches(updated);
    setSelected(updated.find(b => b.id === selected.id));
  }

  if (view === "create") return (
    <div className="p-6 md:p-8 page-enter max-w-lg">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => setView("list")} className="p-2.5 rounded-2xl hover:bg-white/80 dark:hover:bg-slate-800 text-slate-500 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Create Batch</h1>
      </div>
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={createBatch}
        className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] space-y-5"
      >
        <Field label="Batch Name">
          <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Beginners Batch A" autoFocus />
        </Field>
        <Field label="Level">
          <select className={inputCls} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Description (optional)">
          <textarea className={cn(inputCls, "resize-none")} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Notes about this batch…" />
        </Field>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => setView("list")} className="flex-1 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button type="submit" className="flex-1 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-sm">Create Batch</button>
        </div>
      </motion.form>
    </div>
  );

  if (view === "detail" && selected) return (
    <div className="p-6 md:p-8 page-enter">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => setView("list")} className="p-2.5 rounded-2xl hover:bg-white/80 dark:hover:bg-slate-800 text-slate-500 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white truncate tracking-tight">{selected.name}</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{selected.id} · {selected.createdAt}</p>
        </div>
        <span className={cn("px-3 py-1.5 text-xs font-bold rounded-full", LEVEL_COLORS[selected.level] || LEVEL_COLORS.Open)}>{selected.level}</span>
      </div>
      {selected.description && (
        <p className="text-[14px] text-slate-500 dark:text-slate-400 mb-8 px-1">{selected.description}</p>
      )}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b border-black/[0.06] dark:border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <Users size={15} className="text-slate-400" />
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-200">Students ({selected.students?.length || 0})</h2>
          </div>
          <form onSubmit={addStudent} className="flex gap-2">
            <input value={studentInput} onChange={e => setStudentInput(e.target.value)} placeholder="Student name" className="text-sm px-3.5 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 w-44" />
            <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold rounded-xl transition-colors">
              <UserPlus size={13} />Add
            </button>
          </form>
        </div>
        {!selected.students?.length ? (
          <div className="flex flex-col items-center py-14 text-slate-300 dark:text-slate-700">
            <Users size={28} className="mb-3" />
            <p className="text-[14px] font-medium text-slate-400">No students yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.03] dark:divide-white/[0.04]">
            {selected.students.map((s, i) => (
              <div key={s.id} className="flex items-center gap-4 px-7 py-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
                <span className="w-7 text-[12px] text-slate-400 font-mono">{i + 1}</span>
                <span className="flex-1 text-[14px] font-medium text-slate-700 dark:text-slate-200">{s.name}</span>
                <button onClick={() => removeStudent(s.id)} className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-terra-500 hover:bg-terra-50 dark:hover:bg-terra-900/30 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 page-enter">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Batches</h1>
          <p className="text-[14px] text-slate-400 mt-1">{batches.length} batch{batches.length !== 1 ? "es" : ""} total</p>
        </div>
        <button onClick={() => setView("create")} className="flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white text-[14px] font-semibold rounded-2xl shadow-sm transition-colors">
          <Plus size={16} />New Batch
        </button>
      </div>

      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center mb-5 shadow-[var(--shadow-card)]">
            <Users size={26} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="font-semibold text-slate-500 dark:text-slate-400 mb-1 text-[15px]">{search ? "No batches match your search" : "No batches yet"}</p>
          {!search && <button onClick={() => setView("create")} className="mt-3 text-[14px] text-brand-600 hover:underline font-semibold">Create your first batch →</button>}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => { setSelected(b); setView("detail"); }}
              className="card-hover bg-white dark:bg-slate-900 rounded-2xl p-6 border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] cursor-pointer relative group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{b.id}</span>
                <span className={cn("px-2.5 py-1 text-[10px] font-bold rounded-full", LEVEL_COLORS[b.level] || LEVEL_COLORS.Open)}>{b.level}</span>
              </div>
              <h3 className="font-bold text-[15px] text-slate-900 dark:text-white mb-2 leading-snug">{b.name}</h3>
              {b.description && <p className="text-[13px] text-slate-400 mb-4 line-clamp-2">{b.description}</p>}
              <p className="text-[12px] text-slate-400 dark:text-slate-500">{b.students?.length || 0} students · {b.createdAt}</p>
              <button
                onClick={e => { e.stopPropagation(); deleteBatch(b.id); }}
                className="absolute top-4 right-4 p-2 rounded-xl opacity-0 group-hover:opacity-100 text-terra-500 hover:bg-terra-50 dark:hover:bg-terra-900/30 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
