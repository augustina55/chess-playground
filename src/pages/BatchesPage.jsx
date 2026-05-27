import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Users, ChevronLeft, Trash2, UserPlus, Sparkles, Layers3 } from "lucide-react";
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
  Beginner:     "bg-emerald-50 text-emerald-700",
  Intermediate: "bg-blue-50 text-blue-700",
  Advanced:     "bg-orange-50 text-orange-700",
  Open:         "bg-violet-50 text-violet-700",
};

const inputCls = "w-full h-14 rounded-2xl border border-gray-200 bg-white px-5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500";

function Field({ label, children }) {
  return (
    <div className="space-y-2.5">
      <label className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">{label}</label>
      {children}
    </div>
  );
}

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
    <div className="min-h-screen bg-[#f6f8fc] px-5 md:px-8 lg:px-10 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView("list")} className="w-12 h-12 rounded-2xl border border-gray-200 bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Create Batch</h1>
            <p className="text-sm text-gray-400 mt-1">Add a new training group</p>
          </div>
        </div>
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={createBatch}
          className="bg-white border border-gray-200 rounded-[32px] p-8 shadow-[0_10px_60px_rgba(0,0,0,0.06)] space-y-6"
        >
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="w-14 h-14 rounded-3xl bg-brand-500/10 flex items-center justify-center">
              <Layers3 size={22} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Batch Details</h2>
              <p className="text-sm text-gray-400 mt-0.5">Fill in the information below</p>
            </div>
          </div>
          <Field label="Batch Name">
            <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Beginners Batch A" autoFocus />
          </Field>
          <Field label="Level">
            <select className={inputCls} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
              {LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Description (optional)">
            <textarea className={cn(inputCls, "h-auto py-4 resize-none")} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Notes about this batch…" />
          </Field>
          <div className="flex gap-4 pt-2">
            <button type="button" onClick={() => setView("list")} className="flex-1 h-14 rounded-2xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 h-14 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-lg shadow-brand-500/20 transition-all">Create Batch</button>
          </div>
        </motion.form>
      </div>
    </div>
  );

  if (view === "detail" && selected) return (
    <div className="min-h-screen bg-[#f6f8fc] px-5 md:px-8 lg:px-10 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView("list")} className="w-12 h-12 rounded-2xl border border-gray-200 bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black tracking-tight text-gray-900 truncate">{selected.name}</h1>
            <p className="text-sm text-gray-400 mt-1">{selected.id} · Created {selected.createdAt}</p>
          </div>
          <span className={cn("px-3 py-1.5 rounded-full text-xs font-bold", LEVEL_COLORS[selected.level] || LEVEL_COLORS.Open)}>{selected.level}</span>
        </div>
        {selected.description && (
          <p className="text-[14px] text-gray-500 mb-6 px-1">{selected.description}</p>
        )}
        <div className="bg-white rounded-[28px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <Users size={16} className="text-gray-400" />
              <h2 className="text-[14px] font-bold text-gray-900">Students ({selected.students?.length || 0})</h2>
            </div>
            <form onSubmit={addStudent} className="flex gap-2">
              <input value={studentInput} onChange={e => setStudentInput(e.target.value)} placeholder="Student name"
                className="text-sm px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 w-44" />
              <button type="submit" className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold rounded-xl transition-colors">
                <UserPlus size={13} />Add
              </button>
            </form>
          </div>
          {!selected.students?.length ? (
            <div className="flex flex-col items-center py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Users size={22} className="text-gray-400" />
              </div>
              <p className="text-[14px] font-medium text-gray-500">No students yet. Add one above.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {selected.students.map((s, i) => (
                <div key={s.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 text-xs font-bold shrink-0">{i + 1}</div>
                  <span className="flex-1 text-[14px] font-medium text-gray-700">{s.name}</span>
                  <button onClick={() => removeStudent(s.id)} className="opacity-0 group-hover:opacity-100 w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-brand-600 via-brand-500 to-violet-600 p-8 md:p-10 shadow-[0_20px_80px_rgba(99,102,241,0.25)] mb-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-black/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white text-sm font-medium mb-5">
                <Layers3 size={15} />Batch Management
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">Training Batches</h1>
              <p className="text-white/70 text-base mt-4 max-w-xl">{batches.length} batch{batches.length !== 1 ? "es" : ""} · Organize students into groups</p>
            </div>
            <button onClick={() => setView("create")} className="h-14 px-7 rounded-2xl bg-white text-gray-900 font-bold text-sm shadow-2xl hover:scale-[1.02] transition-all flex items-center gap-3 shrink-0">
              <Plus size={18} />New Batch
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[32px] bg-white border border-gray-200 py-24 px-6 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-[30px] bg-brand-500/10 flex items-center justify-center mb-6">
              <Users size={40} className="text-brand-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{search ? "No batches match your search" : "No Batches Yet"}</h3>
            <p className="text-gray-400 mt-3 max-w-md">{search ? "Try a different search term." : "Create your first batch to start organizing students."}</p>
            {!search && (
              <button onClick={() => setView("create")} className="mt-6 h-12 px-6 rounded-xl bg-brand-600 text-white font-semibold text-[14px]">Create First Batch</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => { setSelected(b); setView("detail"); }}
                className="group relative overflow-hidden rounded-[28px] bg-white border border-gray-200 p-6 shadow-sm hover:shadow-[0_15px_50px_rgba(0,0,0,0.08)] transition-all cursor-pointer"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-violet-500" />
                <div className="flex justify-between items-start mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                    <Users size={20} className="text-brand-500" />
                  </div>
                  <span className={cn("px-2.5 py-1 text-[11px] font-bold rounded-full", LEVEL_COLORS[b.level] || LEVEL_COLORS.Open)}>{b.level}</span>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{b.id}</p>
                <h3 className="font-black text-[15px] text-gray-900 mb-2 leading-snug">{b.name}</h3>
                {b.description && <p className="text-[12.5px] text-gray-400 mb-4 line-clamp-2">{b.description}</p>}
                <p className="text-[12px] text-gray-400">{b.students?.length || 0} students · {b.createdAt}</p>
                <button
                  onClick={e => { e.stopPropagation(); deleteBatch(b.id); }}
                  className="absolute top-4 right-4 w-9 h-9 rounded-xl opacity-0 group-hover:opacity-100 bg-red-50 text-red-500 flex items-center justify-center transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
